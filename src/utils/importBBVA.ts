/**
 * Lettura dell'export Excel di BBVA.
 *
 * Il file ha un solo foglio, un'intestazione decorativa in cima e i dati sotto.
 * L'intestazione NON viene cercata a una riga fissa: BBVA può aggiungere una
 * riga di titolo e spostare tutto di uno. Si cerca la riga che contiene la
 * cella "Data valuta" e da lì si mappano le colonne per nome.
 *
 * Colonne dell'export reale (08/2026):
 *
 *   B Data valuta   → la data che conta: è quella per cassa
 *   C Data          → data contabile, può essere futura; solo informativa
 *   D Parola chiave → tipo operazione BBVA ("Bonifico ricevuto", …)
 *   E Movimento     → descrizione libera, può essere vuota
 *   F Importo       → con segno
 *   G Valuta        → sempre EUR
 *   H Disponibile   → saldo del conto DOPO il movimento: l'ancora del cash
 *   I Valuta        → EUR
 *   J Osservazioni  → descrizione estesa
 *
 * Le righe arrivano dalla più recente alla più vecchia.
 */

import * as XLSX from "xlsx";

export interface RigaEstratto {
  /** Data valuta, ISO YYYY-MM-DD. */
  dataValuta: string;
  /** Data contabile, ISO YYYY-MM-DD. Assente se la colonna manca o è vuota. */
  dataContabile?: string;
  /** Tipo operazione secondo BBVA ("Bonifico ricevuto", "Pagamento imposte", …). */
  parolaChiave?: string;
  /** Descrizione: "Movimento", o "Osservazioni" se la prima è vuota. */
  descrizione: string;
  /** Con segno: entrate > 0, uscite < 0. */
  importo: number;
  /** Colonna "Disponibile": saldo dopo il movimento. */
  disponibile?: number;
  osservazioni?: string;
  /** Numero di riga nel foglio (1-based), per i messaggi d'errore. */
  riga: number;
}

export interface EstrattoLetto {
  righe: RigaEstratto[];
  /** Nome del foglio, per il report. */
  foglio: string;
  /**
   * Saldo del conto alla data più recente del file: il `Disponibile` della
   * riga con la data valuta più alta. È l'ancora del cash (piano §3.6).
   */
  saldoFinale?: { data: string; saldo: number };
  /** Righe scartate perché prive di data o importo, con il motivo. */
  scartate: { riga: number; motivo: string }[];
}

/** Intestazioni riconosciute, normalizzate (minuscole, senza accenti doppi). */
const COLONNE = {
  dataValuta: ["data valuta", "fecha valor"],
  dataContabile: ["data", "fecha"],
  parolaChiave: ["parola chiave", "concepto"],
  movimento: ["movimento", "movimiento"],
  importo: ["importo", "importe"],
  disponibile: ["disponibile", "disponible", "saldo"],
  osservazioni: ["osservazioni", "observaciones", "note"],
} as const;

const normalizza = (v: unknown): string =>
  String(v ?? "").trim().toLowerCase().replace(/\s+/g, " ");

/**
 * Excel conta i giorni dal 30/12/1899 (con il famoso bug dell'anno bisestile
 * 1900 già incorporato in quell'epoca).
 */
const EPOCA_EXCEL = Date.UTC(1899, 11, 30);

const aISO = (d: Date): string => d.toISOString().substring(0, 10);

/** Da cella a data ISO. Accetta Date, seriale Excel e "dd/mm/yyyy". */
export function leggiData(valore: unknown): string | undefined {
  if (valore instanceof Date && !Number.isNaN(valore.getTime())) {
    // Le date di SheetJS sono in UTC a mezzanotte: prendere i campi UTC evita
    // che un fuso negativo faccia scivolare il giorno indietro.
    return aISO(valore);
  }

  if (typeof valore === "number" && Number.isFinite(valore)) {
    return aISO(new Date(EPOCA_EXCEL + Math.round(valore) * 86_400_000));
  }

  const testo = String(valore ?? "").trim();
  if (!testo) return undefined;

  const separato = testo.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (separato) {
    const [, g, m, a] = separato;
    const anno = a.length === 2 ? 2000 + Number(a) : Number(a);
    return aISO(new Date(Date.UTC(anno, Number(m) - 1, Number(g))));
  }

  const iso = testo.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[0];

  return undefined;
}

/**
 * Da cella a numero. Tollera il formato italiano ("1.234,56"), il simbolo
 * dell'euro e gli spazi non separabili che BBVA infila nei numeri.
 */
export function leggiNumero(valore: unknown): number | undefined {
  if (typeof valore === "number") return Number.isFinite(valore) ? valore : undefined;

  // \u00A0 è lo spazio non separabile che BBVA infila fra numero e valuta.
  let testo = String(valore ?? "")
    .replace(/[\s\u00A0€]/g, "")
    .trim();
  if (!testo) return undefined;

  const negativo = /^\(.*\)$/.test(testo);
  if (negativo) testo = testo.slice(1, -1);

  const haVirgola = testo.includes(",");
  const haPunto = testo.includes(".");

  if (haVirgola && haPunto) {
    // "1.234,56" → il punto separa le migliaia
    testo = testo.replace(/\./g, "").replace(",", ".");
  } else if (haVirgola) {
    testo = testo.replace(",", ".");
  } else if (haPunto && /^-?\d{1,3}(\.\d{3})+$/.test(testo)) {
    // "1.234" senza decimali: punto di migliaia, non decimale
    testo = testo.replace(/\./g, "");
  }

  const n = Number(testo);
  if (!Number.isFinite(n)) return undefined;
  return negativo ? -n : n;
}

/**
 * Indici di colonna, cercati per nome sulla riga di intestazione.
 *
 * Due passate: prima i match esatti, poi quelli parziali sulle colonne rimaste
 * libere. L'ordine conta — "Data valuta" comincia per "data", e una passata
 * sola gliela farebbe rubare dalla colonna "Data".
 */
function mappaColonne(intestazione: unknown[]): Record<keyof typeof COLONNE, number> {
  const nomi = intestazione.map(normalizza);
  const campi = Object.entries(COLONNE) as [keyof typeof COLONNE, readonly string[]][];
  const indici = {} as Record<keyof typeof COLONNE, number>;
  const presi = new Set<number>();

  for (const [campo, alias] of campi) {
    const i = nomi.findIndex((n, k) => !presi.has(k) && alias.includes(n));
    indici[campo] = i;
    if (i >= 0) presi.add(i);
  }

  for (const [campo, alias] of campi) {
    if (indici[campo] >= 0) continue;
    const i = nomi.findIndex((n, k) => !presi.has(k) && n !== "" && alias.some((a) => n.startsWith(a)));
    indici[campo] = i;
    if (i >= 0) presi.add(i);
  }

  return indici;
}

export class ErroreEstratto extends Error {}

/**
 * Legge un export BBVA. Non scarta in silenzio: ogni riga ignorata finisce in
 * `scartate` con il motivo, così l'anteprima può dirlo invece di far sparire
 * dei movimenti.
 */
export function leggiEstrattoBBVA(contenuto: ArrayBuffer | Uint8Array): EstrattoLetto {
  const workbook = XLSX.read(contenuto, { cellDates: true });
  const foglio = workbook.SheetNames[0];
  if (!foglio) throw new ErroreEstratto("Il file non contiene nessun foglio");

  // `blankrows: true` di proposito: saltare le righe vuote farebbe scalare gli
  // indici e i numeri di riga nei messaggi d'errore non corrisponderebbero più
  // a quelli che l'utente vede aprendo il file.
  const celle = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[foglio], {
    header: 1,
    blankrows: true,
    defval: null,
  });

  const alias: readonly string[] = COLONNE.dataValuta;
  const rigaIntestazione = celle.findIndex((riga) =>
    riga.some((cella) => alias.includes(normalizza(cella)))
  );
  if (rigaIntestazione === -1) {
    throw new ErroreEstratto(
      'Non trovo la colonna "Data valuta": questo non sembra un estratto conto BBVA'
    );
  }

  const colonne = mappaColonne(celle[rigaIntestazione]);
  const righe: RigaEstratto[] = [];
  const scartate: EstrattoLetto["scartate"] = [];

  for (let i = rigaIntestazione + 1; i < celle.length; i++) {
    const riga = celle[i] ?? [];
    const numeroRiga = i + 1;
    if (riga.every((c) => c === null || c === undefined || String(c).trim() === "")) continue;
    const cella = (indice: number) => (indice >= 0 ? riga[indice] : undefined);

    const dataValuta = leggiData(cella(colonne.dataValuta));
    const importo = leggiNumero(cella(colonne.importo));

    // Le righe di totale in fondo al file hanno un importo ma non una data.
    if (!dataValuta && importo === undefined) continue;
    if (!dataValuta) {
      scartate.push({ riga: numeroRiga, motivo: "data valuta mancante o illeggibile" });
      continue;
    }
    if (importo === undefined) {
      scartate.push({ riga: numeroRiga, motivo: "importo mancante o illeggibile" });
      continue;
    }

    const movimento = String(cella(colonne.movimento) ?? "").trim();
    const osservazioni = String(cella(colonne.osservazioni) ?? "").trim();
    const parolaChiave = String(cella(colonne.parolaChiave) ?? "").trim();

    righe.push({
      dataValuta,
      dataContabile: leggiData(cella(colonne.dataContabile)),
      parolaChiave: parolaChiave || undefined,
      descrizione: movimento || osservazioni || parolaChiave || "Movimento senza descrizione",
      importo,
      disponibile: leggiNumero(cella(colonne.disponibile)),
      osservazioni: osservazioni || undefined,
      riga: numeroRiga,
    });
  }

  return { righe, foglio, saldoFinale: saldoPiuRecente(righe), scartate };
}

/**
 * Il saldo alla data più recente del file.
 *
 * Non si prende "la prima riga" fidandosi dell'ordine: si cerca la data più
 * alta, e a parità di data si tiene la riga che compare prima (l'export elenca
 * dal più recente al più vecchio, quindi è l'ultima avvenuta).
 */
export function saldoPiuRecente(righe: RigaEstratto[]): EstrattoLetto["saldoFinale"] {
  let migliore: RigaEstratto | undefined;
  for (const r of righe) {
    if (r.disponibile === undefined) continue;
    if (!migliore || r.dataValuta > migliore.dataValuta) migliore = r;
  }
  return migliore ? { data: migliore.dataValuta, saldo: migliore.disponibile! } : undefined;
}

/**
 * Impronta di un movimento importato, per non reimportarlo il mese dopo.
 *
 * Comprende il `disponibile` proprio perché due movimenti identici nello
 * stesso giorno (due caffè da 1,50 €) hanno saldi progressivi diversi: senza,
 * il secondo verrebbe scambiato per un duplicato del primo e scartato.
 */
export async function calcolaImportHash(riga: RigaEstratto): Promise<string> {
  const chiave = [
    riga.dataValuta,
    riga.importo.toFixed(2),
    riga.disponibile === undefined ? "" : riga.disponibile.toFixed(2),
    (riga.osservazioni ?? riga.descrizione).trim().toLowerCase(),
  ].join("|");

  const bytes = new TextEncoder().encode(chiave);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
