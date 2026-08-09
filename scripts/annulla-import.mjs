/**
 * Annulla un import BBVA: rimuove i movimenti che ha creato e la sua riga in
 * `import_estratti`.
 *
 *   node --env-file=.env scripts/annulla-import.mjs            ← mostra cosa farebbe
 *   node --env-file=.env scripts/annulla-import.mjs --conferma ← esegue
 *
 * Tocca SOLO le righe con `fonte = 'import_bbva'`: i movimenti inseriti a mano
 * e quelli arrivati dalla migrazione non vengono sfiorati. È l'unico motivo
 * per cui `fonte` esiste — poter tornare indietro da un import senza dover
 * indovinare quali righe fossero sue.
 *
 * Di default annulla l'ULTIMO import. Con `--tutti` rimuove ogni movimento
 * importato, qualunque sia l'estratto di provenienza.
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const CONFERMA = process.argv.includes('--conferma');
const TUTTI = process.argv.includes('--tutti');

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Servono VITE_SUPABASE_URL e SUPABASE_SERVICE_KEY (usa --env-file=.env)');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function annulla() {
  console.log(`↩️  ANNULLA IMPORT${CONFERMA ? '' : ' — anteprima, non scrive niente'}\n`);

  const { data: estratti, error: erroreEstratti } = await supabase
    .from('import_estratti')
    .select('*')
    .order('importato_il', { ascending: false });
  if (erroreEstratti) throw new Error(`Lettura import_estratti: ${erroreEstratti.message}`);

  if (estratti.length === 0) {
    console.log('Nessun import registrato: niente da annullare.');
    return;
  }

  const daAnnullare = TUTTI ? estratti : estratti.slice(0, 1);
  for (const e of daAnnullare) {
    console.log(`Import del ${e.importato_il?.substring(0, 10)} — ${e.nome_file ?? 'senza nome'}`);
    console.log(`  saldo dichiarato ${e.saldo} al ${e.data_saldo}, ${e.movimenti_nuovi} movimenti scritti`);
  }

  const { data: importati, error: erroreMovimenti } = await supabase
    .from('movimenti')
    .select('id, data, descrizione, importo')
    .eq('fonte', 'import_bbva')
    .order('data');
  if (erroreMovimenti) throw new Error(`Lettura movimenti: ${erroreMovimenti.message}`);

  const somma = importati.reduce((t, m) => t + Number(m.importo), 0);
  console.log(`\nMovimenti con fonte 'import_bbva': ${importati.length} (somma ${somma.toFixed(2)})`);
  console.log(`Periodo: ${importati[0]?.data ?? '—'} → ${importati[importati.length - 1]?.data ?? '—'}`);

  if (!CONFERMA) {
    console.log('\nPer eseguire davvero: aggiungi --conferma');
    return;
  }

  const { error: erroreDelete } = await supabase
    .from('movimenti')
    .delete()
    .eq('fonte', 'import_bbva');
  if (erroreDelete) throw new Error(`Cancellazione movimenti: ${erroreDelete.message}`);

  for (const e of daAnnullare) {
    const { error } = await supabase.from('import_estratti').delete().eq('id', e.id);
    if (error) throw new Error(`Cancellazione import_estratti: ${error.message}`);
  }

  const { count } = await supabase.from('movimenti').select('*', { count: 'exact', head: true });
  console.log(`\n✅ Annullato. Movimenti rimasti: ${count}`);
  console.log('   Senza estratti registrati il cash torna a essere ricostruito dal basso.');
}

annulla().catch((err) => {
  console.error('❌ Errore:', err.message || err);
  process.exit(1);
});
