/**
 * Ricostruzione dei dati dalle fonti reali (settembre 2026).
 *
 *   npx tsx --env-file=.env scripts/ricostruzione-dati.mts \
 *     --utente <uuid> --estratto <pdf BBVA> --fatture <cartella PDF fatture> [--scrivi]
 *
 * Senza `--scrivi` NON tocca il database: stampa cosa farebbe e i numeri che
 * ne risultano. Prima di `--scrivi`:
 *   1. applicare supabase/migrations/20260928000000_scadenzario_patrimonio.sql
 *   2. node --env-file=.env scripts/backup-database.mjs
 *
 * Cosa fa:
 *   - movimenti dal 02/12/2024: sostituiti dai movimenti dell'estratto BBVA
 *     (categorie dell'utente mantenute dove un vecchio movimento combacia)
 *   - fatture dal 2025: ricostruite dai PDF Fiscozen, con la data di incasso
 *     presa dal bonifico che le salda
 *   - scadenzario: gli F24 reali 2024–2026, riga per tributo
 *   - patrimonio: i tre strumenti, con i versamenti riconoscibili collegati
 *   - preferenze: apertura del conto, cuscinetto, mesi di riserva
 *
 * Richiede `pdftotext` (poppler) per leggere i PDF.
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import {
  calcolaImportHash,
  catenaSaldi,
  leggiEstrattoPdf,
  type RigaEstratto,
} from "../src/utils/importBBVA";
import { abbinaFatture, proponiCategoria, testoRiga } from "../src/utils/categorizzazione";
import { normalizzaCategoria } from "../src/utils/analisiCalcoli";
import {
  CATEGORIA_INCASSO_FATTURA,
  CATEGORIE_STRUTTURALI,
  eTassa,
} from "../src/constants/fiscali";
import { situazione, incassiAnno } from "../src/utils/fisco";
import type { Fattura, Movimento, ScadenzaFiscale } from "../src/types/fattura";

// ---------------------------------------------------------------------------
// argomenti
// ---------------------------------------------------------------------------
const arg = (nome: string) => {
  const i = process.argv.indexOf(`--${nome}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const UTENTE = arg("utente");
const ESTRATTO = arg("estratto");
const CARTELLA_FATTURE = arg("fatture");
const SCRIVI = process.argv.includes("--scrivi");
if (!UTENTE || !ESTRATTO || !CARTELLA_FATTURE) {
  console.error("Uso: --utente <uuid> --estratto <pdf> --fatture <cartella> [--scrivi]");
  process.exit(1);
}

const sb = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
const pdf = (file: string) => execFileSync("pdftotext", ["-layout", file, "-"]).toString();
const euro = (n: number) =>
  n.toLocaleString("it-IT", { style: "currency", currency: "EUR" }).padStart(13);

// Dati confermati dall'utente. L'apertura è il saldo PRIMA del primo
// movimento dell'estratto: la data è il giorno prima della prima data valuta,
// che può precedere la data contabile (30/11 per un pagamento del 02/12).
const SALDO_APERTURA = 22_393.75;
const FATTURE_ANNULLATE = new Set(["6/2026"]);
const CUSCINETTO = 3000;
const MESI_RISERVA = 3;

/** F24 reali (Fiscozen), una riga per tributo/tipo. Negativo = credito. */
const F24: Omit<ScadenzaFiscale, "calcolata" | "pagataIl">[] = (
  [
    [2023, "inps", "saldo", "2024-07-31", 6946.0],
    [2023, "imposta", "saldo", "2024-07-31", 743.0],
    [2024, "inps", "acconto1", "2024-07-31", 4202.8],
    [2024, "imposta", "acconto1", "2024-07-31", 803.5],
    [2024, "inps", "acconto2", "2024-12-02", 4202.8],
    [2024, "imposta", "acconto2", "2025-01-16", 803.5],
    [2024, "inps", "saldo", "2025-07-21", 1988.0],
    [2024, "imposta", "saldo", "2025-07-21", -381.0],
    [2025, "inps", "acconto1", "2025-07-21", 4157.54],
    [2025, "imposta", "acconto1", "2025-07-21", 613.0],
    [2025, "inps", "acconto2", "2025-12-01", 4157.54],
    [2025, "imposta", "acconto2", "2025-12-01", 613.0],
    [2025, "bollo", "bollo", "2025-12-01", 24.0],
    [2025, "bollo", "bollo", "2026-03-02", 14.0],
    [2025, "inps", "saldo", "2026-07-20", 1921.0],
    [2025, "imposta", "saldo", "2026-07-20", 222.0],
    [2026, "inps", "acconto1", "2026-07-20", 4094.24],
    [2026, "imposta", "acconto1", "2026-07-20", 724.0],
    [2026, "inps", "acconto2", "2026-11-30", 4094.24],
    [2026, "imposta", "acconto2", "2026-11-30", 724.0],
  ] as const
).map(([annoImposta, tributo, tipo, dataScadenza, importo]) => ({
  annoImposta,
  tributo,
  tipo,
  dataScadenza,
  importo,
}));

/** Movimento BBVA che ha pagato ciascun F24 (data F24 → importo del bonifico). */
const PAGAMENTI_F24: Record<string, number> = {
  "2025-01-16": -803.5,
  "2025-07-21": -6357.54,
  "2025-12-01": -4794.54,
  "2026-03-02": -14,
  "2026-07-20": -6961.24,
};

// ---------------------------------------------------------------------------
// 1. estratto BBVA
// ---------------------------------------------------------------------------
const estratto = leggiEstrattoPdf(pdf(ESTRATTO).split("\n"));
const primaValuta = estratto.righe.map((r) => r.dataValuta).sort()[0];
const APERTURA = {
  data: new Date(Date.parse(primaValuta) - 86_400_000).toISOString().slice(0, 10),
  saldo: SALDO_APERTURA,
};
const catena = catenaSaldi(estratto.righe);
if (catena.rotture > 0) throw new Error(`Estratto incompleto: ${catena.rotture} rotture nella catena dei saldi`);
if (Math.abs((catena.saldoIniziale ?? 0) - APERTURA.saldo) > 0.005)
  throw new Error(`Saldo di partenza ${catena.saldoIniziale} ≠ apertura ${APERTURA.saldo}`);
const righe = [...estratto.righe].reverse(); // dal più vecchio

// ---------------------------------------------------------------------------
// 2. fatture PDF
// ---------------------------------------------------------------------------
interface FatturaPdf {
  numero: string;
  dataEmissione: string;
  cliente: string;
  descrizione: string;
  importo: number;
}

const leggiNum = (s: string) => Number(s.replace(/\./g, "").replace(",", "."));
const isoDa = (s: string) => s.split("/").reverse().join("-");

function leggiFattura(file: string): FatturaPdf {
  const linee = pdf(file).split("\n");
  const testa = linee[0].match(/Fattura\s+(\d+\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})/);
  if (!testa) throw new Error(`Intestazione illeggibile: ${file}`);
  const iDest = linee.findIndex((l) => l.includes("Destinatario:"));
  const cliente = linee
    .slice(iDest + 1)
    .find((l) => l.trim())!
    .trim()
    .split(/\s{2,}/)
    .at(-1)!;
  const iDescr = linee.findIndex((l) => /^\s*Descrizione\s+Importo/.test(l));
  const descrizione = linee
    .slice(iDescr + 1)
    .find((l) => l.trim())!
    .trim()
    .split(/\s{2,}/)[0];
  const totale = linee.join("\n").match(/Totale:\s*([\d.]+,\d{2})\s*€/);
  if (!totale) throw new Error(`Totale illeggibile: ${file}`);
  return {
    numero: testa[1],
    dataEmissione: isoDa(testa[2]),
    cliente,
    descrizione,
    importo: leggiNum(totale[1]),
  };
}

const fatturePdf = fs
  .readdirSync(CARTELLA_FATTURE)
  .filter((f) => f.toLowerCase().endsWith(".pdf"))
  .map((f) => leggiFattura(path.join(CARTELLA_FATTURE, f)))
  .filter((f) => !FATTURE_ANNULLATE.has(f.numero))
  .sort((a, b) => a.dataEmissione.localeCompare(b.dataEmissione));

// ---------------------------------------------------------------------------
// 3. dati attuali
// ---------------------------------------------------------------------------
const [{ data: fattureDb }, { data: movimentiDb }] = await Promise.all([
  sb.from("fatture").select("*").eq("user_id", UTENTE),
  sb.from("movimenti").select("*").eq("user_id", UTENTE),
]);
if (!fattureDb || !movimentiDb) throw new Error("Lettura del database fallita");

// ---------------------------------------------------------------------------
// 4. abbinamento incassi → fatture
// ---------------------------------------------------------------------------
const nuoveFatture: (Fattura & { dbId?: string })[] = fatturePdf.map((f) => ({
  id: f.numero,
  numero: f.numero,
  dataEmissione: f.dataEmissione,
  data: null,
  cliente: f.cliente,
  descrizione: f.descrizione,
  importoLordo: f.importo,
}));

// Fatture fino al 2024: restano, cambia al massimo la data di incasso.
// Si considerano "aperte" solo quelle emesse a ridosso dell'inizio
// dell'estratto: le precedenti erano già incassate e restano come sono.
const fattureStoriche: (Fattura & { dbId: string })[] = fattureDb
  .filter((f) => f.data && f.data < "2025-01-01" && f.data >= "2024-11-01")
  .map((f) => ({
    id: f.id,
    dbId: f.id,
    data: null,
    dataEmissione: f.data,
    cliente: f.cliente,
    descrizione: f.descrizione,
    importoLordo: Number(f.importo_lordo),
  }));

const incassoDi = new Map<RigaEstratto, Fattura[]>();
for (const r of righe) {
  if (r.importo <= 0) continue;
  const aperte = [...nuoveFatture, ...fattureStoriche].filter((f) => !f.data);
  const abbinate = abbinaFatture({ testo: testoRiga(r), importo: r.importo, dataValuta: r.dataValuta }, aperte);
  if (abbinate.length === 0) continue;
  for (const f of abbinate) f.data = r.dataValuta;
  incassoDi.set(r, abbinate);
}

// Le fatture PDF riusano la riga del database con stesso importo e cliente
// (tiene id, note e descrizione scritti a mano); le altre dal 2025 spariscono.
const somiglia = (a: string, b: string) =>
  a.toLowerCase().split(/\W+/)[0] === b.toLowerCase().split(/\W+/)[0];
const daRiusare = fattureDb.filter((f) => !f.data || f.data >= "2025-01-01");
for (const f of nuoveFatture) {
  const candidata = daRiusare
    .filter((d) => Math.abs(Number(d.importo_lordo) - f.importoLordo) < 0.01 && somiglia(d.cliente, f.cliente))
    .sort(
      (x, y) =>
        Math.abs(Date.parse(x.data ?? "") - Date.parse(f.data ?? f.dataEmissione!)) -
        Math.abs(Date.parse(y.data ?? "") - Date.parse(f.data ?? f.dataEmissione!))
    )[0];
  if (candidata) {
    f.dbId = candidata.id;
    f.descrizione = candidata.descrizione || f.descrizione;
    daRiusare.splice(daRiusare.indexOf(candidata), 1);
  }
}
const fattureDaEliminare = daRiusare;

// ---------------------------------------------------------------------------
// 5. movimenti: categorie
// ---------------------------------------------------------------------------
const vecchi = movimentiDb.filter((m) => m.data > APERTURA.data);
const usati = new Set<string>();
const giorni = (a: string, b: string) => Math.abs(Date.parse(a) - Date.parse(b)) / 86_400_000;
const strutturali = new Set(CATEGORIE_STRUTTURALI.map((c) => c.toLowerCase()));

const nuoviMovimenti = await Promise.all(
  righe.map(async (r) => {
    const proposta = proponiCategoria(r);
    const vecchio = vecchi.find(
      (m) => !usati.has(m.id) && Math.abs(Number(m.importo) - r.importo) < 0.01 && giorni(m.data, r.dataValuta) <= 3
    );
    if (vecchio) usati.add(vecchio.id);

    // Le categorie strutturali vengono dalle regole (tasse, stipendi,
    // investimenti, lavoro, incassi); le altre sono scelte dell'utente.
    const categoriaVecchia = vecchio?.categoria ? normalizzaCategoria(vecchio.categoria) : undefined;
    let categoria = proposta.categoria;
    if (
      categoriaVecchia &&
      !strutturali.has(proposta.categoria.toLowerCase()) &&
      !eTassa(categoriaVecchia) &&
      !/^saldo iniziale|^fatture?$|^incasso fattura/i.test(categoriaVecchia)
    ) {
      categoria = categoriaVecchia;
    }

    const fatture = incassoDi.get(r);
    if (categoria === CATEGORIA_INCASSO_FATTURA && !fatture) categoria = "Entrate";

    return {
      riga: r,
      categoria: normalizzaCategoria(categoria),
      fatture,
      descrizione: vecchio?.descrizione?.trim() || r.osservazioni || r.descrizione,
      importHash: await calcolaImportHash(r),
    };
  })
);

// ---------------------------------------------------------------------------
// 6. report
// ---------------------------------------------------------------------------
const oggi = righe.at(-1)!.dataValuta;
const fattureFinali: Fattura[] = [
  ...fattureStoriche.map((f) => ({ ...f, data: f.data ?? f.dataEmissione! })),
  ...fattureDb
    .filter((f) => !f.data || f.data < "2025-01-01")
    .filter((f) => !fattureStoriche.some((s) => s.dbId === f.id))
    .map((f) => ({ id: f.id, data: f.data, descrizione: f.descrizione, cliente: f.cliente, importoLordo: Number(f.importo_lordo) })),
  ...nuoveFatture,
];
const movimentiFinali: Movimento[] = nuoviMovimenti.map((m, i) => ({
  id: String(i),
  data: m.riga.dataValuta,
  descrizione: m.descrizione,
  categoria: m.categoria,
  importo: m.riga.importo,
  fonte: "import_bbva",
  fatturaId: m.fatture?.[0]?.id,
}));
const scadenze: ScadenzaFiscale[] = F24.map((s) => ({
  ...s,
  calcolata: false,
  pagataIl: s.dataScadenza <= oggi ? s.dataScadenza : undefined,
}));

const s = situazione({
  fatture: fattureFinali,
  movimenti: movimentiFinali,
  scadenzeSalvate: scadenze,
  apertura: APERTURA,
  cuscinetto: CUSCINETTO,
  mesiRiserva: MESI_RISERVA,
  oggi,
});

console.log(`\nESTRATTO  ${righe.length} movimenti ${righe[0].dataValuta} → ${oggi}, catena saldi OK`);
console.log(`FATTURE   ${fatturePdf.length} dai PDF (${FATTURE_ANNULLATE.size} annullata esclusa)`);
console.log(`          riusate ${nuoveFatture.filter((f) => f.dbId).length}, nuove ${nuoveFatture.filter((f) => !f.dbId).length}, da eliminare ${fattureDaEliminare.length}`);
for (const f of fattureDaEliminare)
  console.log(`            elimina: ${f.data} ${euro(Number(f.importo_lordo))} ${f.cliente} — ${f.descrizione}`);
const nonIncassate = [...nuoveFatture, ...fattureStoriche].filter((f) => !f.data);
console.log(`          senza bonifico: ${nonIncassate.map((f) => `${f.numero ?? f.dataEmissione} ${f.cliente} ${f.importoLordo}`).join(" · ") || "nessuna"}`);
for (const f of fattureStoriche.filter((f) => f.data))
  console.log(`          storica ${f.dataEmissione} ${euro(f.importoLordo)} ${f.cliente} → incassata ${f.data}`);
for (const anno of [2024, 2025, 2026])
  console.log(`INCASSI ${anno} ${euro(incassiAnno(fattureFinali, anno))}`);

const perCategoria: Record<string, number> = {};
for (const m of movimentiFinali) perCategoria[m.categoria!] = (perCategoria[m.categoria!] ?? 0) + m.importo;
console.log("\nMOVIMENTI per categoria (dal 02/12/2024):");
for (const [c, v] of Object.entries(perCategoria).sort((a, b) => a[1] - b[1])) console.log(`  ${c.padEnd(22)}${euro(v)}`);
console.log(`  vecchi movimenti sostituiti: ${vecchi.length} (categoria ripresa per ${usati.size})`);

console.log("\nSITUAZIONE al", oggi);
console.log(`  cassa              ${euro(s.cassa)}`);
for (const a of s.aperte)
  console.log(`   ${a.dataScadenza} ${a.tributo.padEnd(8)}${a.tipo.padEnd(9)}${a.annoImposta} ${euro(a.importo)}${a.calcolata ? "  (stima)" : ""}`);
console.log(`  da tenere          ${euro(s.daTenere)}`);
console.log(`  libero da tasse    ${euro(s.liberoDaTasse)}`);
console.log(`  cuscinetto         ${euro(-s.cuscinetto)}`);
console.log(`  NETTO PRELEVABILE  ${euro(s.netto)}`);
console.log(`  costo di vita/mese ${euro(s.costoVita)}  × ${MESI_RISERVA} = ${euro(s.riservaVita)}`);
console.log(`  fondo investimenti ${euro(s.fondoInvestimenti)}`);

if (!SCRIVI) {
  console.log("\n(prova a secco: niente è stato scritto. Rilancia con --scrivi)");
  process.exit(0);
}

// ---------------------------------------------------------------------------
// 7. scrittura
// ---------------------------------------------------------------------------
const controlla = <T extends { error: unknown }>(r: T, cosa: string) => {
  if (r.error) throw new Error(`${cosa}: ${JSON.stringify(r.error)}`);
  return r;
};

// Fatture: prima si eliminano gli incassi collegati, poi le fatture
controlla(await sb.from("movimenti").delete().eq("user_id", UTENTE).gt("data", APERTURA.data), "delete movimenti");
if (fattureDaEliminare.length)
  controlla(await sb.from("fatture").delete().in("id", fattureDaEliminare.map((f) => f.id)), "delete fatture");

const idFattura = new Map<string, string>();
for (const f of nuoveFatture) {
  const riga = {
    user_id: UTENTE,
    numero: f.numero,
    data_emissione: f.dataEmissione,
    data: f.data,
    cliente: f.cliente,
    descrizione: f.descrizione,
    importo_lordo: f.importoLordo,
  };
  const r = f.dbId
    ? await sb.from("fatture").update(riga).eq("id", f.dbId).select("id").single()
    : await sb.from("fatture").insert(riga).select("id").single();
  controlla(r, `fattura ${f.numero}`);
  idFattura.set(f.id, r.data!.id);
}
for (const f of fattureStoriche) {
  idFattura.set(f.id, f.dbId);
  if (f.data) controlla(await sb.from("fatture").update({ data: f.data, data_emissione: f.dataEmissione }).eq("id", f.dbId), "fattura storica");
}

// Patrimonio
const strumenti = controlla(
  await sb
    .from("strumenti_patrimonio")
    .insert([
      { user_id: UTENTE, nome: "Moneyfarm", tipo: "moneyfarm" },
      { user_id: UTENTE, nome: "Investimenti", tipo: "investimento" },
      { user_id: UTENTE, nome: "Pensione privata", tipo: "pensione" },
    ])
    .select(),
  "strumenti"
).data!;
const moneyfarm = strumenti.find((x) => x.tipo === "moneyfarm")!.id;

// Movimenti
const inseriti = controlla(
  await sb
    .from("movimenti")
    .insert(
      nuoviMovimenti.map((m) => ({
        user_id: UTENTE,
        data: m.riga.dataValuta,
        data_contabile: m.riga.dataContabile ?? null,
        descrizione: m.descrizione,
        categoria: m.categoria,
        importo: m.riga.importo,
        fonte: "import_bbva",
        import_hash: m.importHash,
        saldo_dopo: m.riga.disponibile ?? null,
        fattura_id: m.fatture ? idFattura.get(m.fatture[0].id) : null,
        strumento_id: /moneyfarm|mm288318/i.test(testoRiga(m.riga)) ? moneyfarm : null,
      }))
    )
    .select("id, data, importo"),
  "insert movimenti"
).data!;

// Scadenzario, collegato ai bonifici "Tasse"
const movimentoF24 = (dataF24: string) => {
  const importo = PAGAMENTI_F24[dataF24];
  if (importo === undefined) return null;
  return (
    inseriti
      .filter((m) => Math.abs(Number(m.importo) - importo) < 0.01 && giorni(m.data, dataF24) <= 15)
      .map((m) => m.id)[0] ?? null
  );
};
controlla(
  await sb.from("scadenze_fiscali").insert(
    scadenze.map((x) => ({
      user_id: UTENTE,
      anno_imposta: x.annoImposta,
      tributo: x.tributo,
      tipo: x.tipo,
      data_scadenza: x.dataScadenza,
      importo: x.importo,
      pagata_il: x.pagataIl ?? null,
      movimento_id: x.pagataIl ? movimentoF24(x.dataScadenza) : null,
    }))
  ),
  "scadenze"
);

// Preferenze
controlla(
  await sb.from("preferenze").upsert(
    [
      { user_id: UTENTE, chiave: "apertura_conto", valore: APERTURA },
      { user_id: UTENTE, chiave: "cuscinetto", valore: CUSCINETTO },
      { user_id: UTENTE, chiave: "mesi_riserva_vita", valore: MESI_RISERVA },
    ],
    { onConflict: "user_id,chiave" }
  ),
  "preferenze"
);

console.log("\n✅ Scritto.");
