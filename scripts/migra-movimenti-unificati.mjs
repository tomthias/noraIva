/**
 * Fase 1 — copia entrate/uscite/prelievi nella tabella unificata `movimenti`.
 *
 *   node --env-file=.env scripts/migra-movimenti-unificati.mjs --dry-run
 *   node --env-file=.env scripts/migra-movimenti-unificati.mjs
 *
 * Regole della copia:
 *   entrate  → importo POSITIVO, categoria invariata
 *   uscite   → importo NEGATIVO, categoria invariata
 *   prelievi → importo NEGATIVO, categoria 'Stipendio' (la tabella non ne aveva)
 *
 * La copia è FEDELE: nessuna normalizzazione, nessuna correzione. L'id della
 * riga originale diventa l'id del movimento, così la migrazione è idempotente
 * (rieseguirla aggiorna le stesse righe invece di duplicarle) e ogni movimento
 * resta risalibile alla riga di partenza.
 *
 * Le tabelle vecchie NON vengono toccate: restano la fonte finché la verifica
 * della Fase 1 non è completata.
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const DRY_RUN = process.argv.includes('--dry-run');

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Servono VITE_SUPABASE_URL e SUPABASE_SERVICE_KEY (usa --env-file=.env)');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/** Categoria che identifica i vecchi `prelievi` dentro la tabella unica. */
const CATEGORIA_STIPENDIO = 'Stipendio';

/** Tolleranza della verifica: mezzo centesimo, cioè "nessuna differenza". */
const TOLLERANZA = 0.005;

const arrotonda = (n) => Math.round(n * 100) / 100;

async function leggiTutto(tabella) {
  const { data, error } = await supabase.from(tabella).select('*').order('data');
  if (error) throw new Error(`Lettura di ${tabella} fallita: ${error.message}`);
  return data;
}

/**
 * Le righe candidate per `movimenti`, nell'ordine in cui verranno scritte.
 * Gli importi delle tabelle vecchie sono sempre positivi: il segno lo dava la
 * tabella di appartenenza, qui lo diamo noi.
 */
function costruisciMovimenti({ entrate, uscite, prelievi }) {
  const daEntrata = (r) => ({
    id: r.id,
    user_id: r.user_id,
    data: r.data,
    descrizione: r.descrizione,
    categoria: r.categoria,
    importo: arrotonda(Math.abs(Number(r.importo))),
    fonte: 'migrazione',
    escludi_da_grafico: r.escludi_da_grafico ?? false,
    note: r.note,
    created_at: r.created_at,
  });

  const daUscita = (r) => ({
    ...daEntrata(r),
    importo: -arrotonda(Math.abs(Number(r.importo))),
  });

  const daPrelievo = (r) => ({
    ...daUscita(r),
    categoria: CATEGORIA_STIPENDIO,
    escludi_da_grafico: false,
  });

  return [
    ...entrate.map(daEntrata),
    ...uscite.map(daUscita),
    ...prelievi.map(daPrelievo),
  ];
}

/** Somma per chiave, arrotondata: usata per confrontare vecchio e nuovo. */
function aggrega(righe, chiave) {
  const out = {};
  for (const r of righe) {
    const k = chiave(r);
    out[k] = arrotonda((out[k] ?? 0) + Number(r.importo));
  }
  return out;
}

const anno = (r) => r.data.substring(0, 4);
const categoria = (r) => r.categoria ?? '(nessuna)';

/**
 * Confronta due aggregati e stampa le righe. Restituisce l'elenco delle chiavi
 * che divergono oltre la tolleranza.
 */
function confronta(titolo, atteso, ottenuto) {
  const chiavi = [...new Set([...Object.keys(atteso), ...Object.keys(ottenuto)])].sort();
  const divergenti = [];

  console.log(`\n── ${titolo}`);
  for (const k of chiavi) {
    const a = atteso[k] ?? 0;
    const b = ottenuto[k] ?? 0;
    const delta = arrotonda(b - a);
    const ok = Math.abs(delta) <= TOLLERANZA;
    if (!ok) divergenti.push({ chiave: k, atteso: a, ottenuto: b, delta });
    console.log(
      `${ok ? '✅' : '❌'} ${k.padEnd(34)} atteso ${a.toFixed(2).padStart(12)}   ottenuto ${b.toFixed(2).padStart(12)}`
    );
  }
  return divergenti;
}

async function migra() {
  console.log(`🔀 MIGRAZIONE → movimenti${DRY_RUN ? ' (DRY RUN)' : ''}\n`);

  const [entrate, uscite, prelievi] = await Promise.all([
    leggiTutto('entrate'),
    leggiTutto('uscite'),
    leggiTutto('prelievi'),
  ]);
  console.log(
    `Origine: ${entrate.length} entrate, ${uscite.length} uscite, ${prelievi.length} prelievi ` +
    `(${entrate.length + uscite.length + prelievi.length} righe)`
  );

  const movimenti = costruisciMovimenti({ entrate, uscite, prelievi });

  if (!DRY_RUN) {
    // Upsert sull'id: rieseguire lo script aggiorna, non duplica.
    for (let i = 0; i < movimenti.length; i += 200) {
      const blocco = movimenti.slice(i, i + 200);
      const { error } = await supabase.from('movimenti').upsert(blocco, { onConflict: 'id' });
      if (error) throw new Error(`Scrittura movimenti fallita: ${error.message}`);
    }
    console.log(`\n✅ Scritti ${movimenti.length} movimenti`);
  }

  // ===== VERIFICA =====
  // Si confronta ciò che è FINITO nel database (non l'array in memoria):
  // è l'unica verifica che dimostra qualcosa.
  const scritti = DRY_RUN ? movimenti : await leggiTutto('movimenti');

  const attesoPerAnno = {
    ...aggrega(entrate, (r) => `${anno(r)} entrate`),
    ...aggrega(uscite, (r) => `${anno(r)} uscite`),
    ...aggrega(prelievi, (r) => `${anno(r)} prelievi`),
  };
  const ottenutoPerAnno = aggrega(scritti, (r) => {
    if (Number(r.importo) > 0) return `${anno(r)} entrate`;
    return r.categoria === CATEGORIA_STIPENDIO ? `${anno(r)} prelievi` : `${anno(r)} uscite`;
  });
  // Le uscite/prelievi sono negativi in `movimenti`: confronto i valori assoluti.
  for (const k of Object.keys(ottenutoPerAnno)) {
    ottenutoPerAnno[k] = Math.abs(ottenutoPerAnno[k]);
  }

  const attesoPerCategoria = {
    ...aggrega(uscite, (r) => `uscita/${categoria(r)}`),
    ...aggrega(entrate, (r) => `entrata/${categoria(r)}`),
    ...aggrega(prelievi, () => `uscita/${CATEGORIA_STIPENDIO}`),
  };
  const ottenutoPerCategoria = aggrega(scritti, (r) =>
    `${Number(r.importo) > 0 ? 'entrata' : 'uscita'}/${categoria(r)}`
  );
  for (const k of Object.keys(ottenutoPerCategoria)) {
    ottenutoPerCategoria[k] = Math.abs(ottenutoPerCategoria[k]);
  }

  const divergenti = [
    ...confronta('Totali per anno e tipo', attesoPerAnno, ottenutoPerAnno),
    ...confronta('Totali per categoria', attesoPerCategoria, ottenutoPerCategoria),
  ];

  const atteseRighe = entrate.length + uscite.length + prelievi.length;
  console.log(`\n── Conteggio righe: attese ${atteseRighe}, in movimenti ${scritti.length}`);

  if (divergenti.length > 0 || scritti.length !== atteseRighe) {
    console.error(`\n❌ MIGRAZIONE NON VERIFICATA — ${divergenti.length} scostamenti`);
    for (const d of divergenti) {
      console.error(`   ${d.chiave}: delta ${d.delta.toFixed(2)}`);
    }
    console.error('   Le tabelle vecchie sono intatte: nessun dato perso.');
    process.exit(1);
  }

  console.log(`\n✅ VERIFICA SUPERATA — ogni totale coincide al centesimo${DRY_RUN ? ' (dry run)' : ''}\n`);
}

migra().catch((err) => {
  console.error('❌ Errore:', err.message || err);
  process.exit(1);
});
