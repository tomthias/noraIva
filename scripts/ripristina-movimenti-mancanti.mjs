/**
 * Rimette in `movimenti` le righe delle vecchie tabelle che oggi non ci sono
 * più — cancellate per sbaglio, o perse per strada.
 *
 *   node --env-file=.env scripts/ripristina-movimenti-mancanti.mjs
 *   node --env-file=.env scripts/ripristina-movimenti-mancanti.mjs --conferma
 *
 * Ripristina SOLO le righe assenti, confrontando per id. Quelle già presenti
 * non vengono toccate: se nel frattempo hai corretto una categoria o una data,
 * la tua correzione resta. È la differenza fra un ripristino e un rollback
 * completo, e qui serve il primo.
 *
 * Funziona finché `prelievi`, `uscite` ed `entrate` esistono: sono la copia
 * originale, ed è esattamente il motivo per cui la Fase 1 non le ha eliminate.
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const CONFERMA = process.argv.includes('--conferma');

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Servono VITE_SUPABASE_URL e SUPABASE_SERVICE_KEY (usa --env-file=.env)');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const CATEGORIA_STIPENDIO = 'Stipendio';

async function leggi(tabella) {
  const { data, error } = await supabase.from(tabella).select('*');
  if (error) throw new Error(`Lettura di ${tabella}: ${error.message}`);
  return data;
}

async function ripristina() {
  console.log(`🔧 RIPRISTINO MOVIMENTI MANCANTI${CONFERMA ? '' : ' — anteprima, non scrive niente'}\n`);

  const [entrate, uscite, prelievi, movimenti] = await Promise.all([
    leggi('entrate'),
    leggi('uscite'),
    leggi('prelievi'),
    leggi('movimenti'),
  ]);

  const presenti = new Set(movimenti.map((m) => m.id));
  const arrotonda = (n) => Math.round(Math.abs(Number(n)) * 100) / 100;

  const candidati = [
    ...entrate.map((r) => ({ r, tabella: 'entrate', importo: arrotonda(r.importo), categoria: r.categoria })),
    ...uscite.map((r) => ({ r, tabella: 'uscite', importo: -arrotonda(r.importo), categoria: r.categoria })),
    ...prelievi.map((r) => ({ r, tabella: 'prelievi', importo: -arrotonda(r.importo), categoria: CATEGORIA_STIPENDIO })),
  ];

  const mancanti = candidati.filter((c) => !presenti.has(c.r.id));

  console.log(`Righe originali: ${candidati.length}`);
  console.log(`Già in movimenti: ${candidati.length - mancanti.length}`);
  console.log(`Da ripristinare: ${mancanti.length}\n`);

  for (const c of mancanti) {
    console.log(`  ${c.r.data}  ${String(c.importo.toFixed(2)).padStart(10)}  ${c.r.descrizione}  [${c.tabella}]`);
  }

  if (mancanti.length === 0) {
    console.log('\n✅ Non manca niente.');
    return;
  }

  if (!CONFERMA) {
    console.log('\nPer eseguire davvero: aggiungi --conferma');
    return;
  }

  const righe = mancanti.map((c) => ({
    id: c.r.id,
    user_id: c.r.user_id,
    data: c.r.data,
    descrizione: c.r.descrizione,
    categoria: c.categoria,
    importo: c.importo,
    fonte: 'migrazione',
    escludi_da_grafico: c.r.escludi_da_grafico ?? false,
    note: c.r.note,
    created_at: c.r.created_at,
  }));

  const { error } = await supabase.from('movimenti').insert(righe);
  if (error) throw new Error(`Scrittura: ${error.message}`);

  const { count } = await supabase.from('movimenti').select('*', { count: 'exact', head: true });
  console.log(`\n✅ Ripristinate ${righe.length} righe. Movimenti totali: ${count}`);
}

ripristina().catch((err) => {
  console.error('❌ Errore:', err.message || err);
  process.exit(1);
});
