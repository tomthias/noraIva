/**
 * Script per eliminare le entrate con categoria FATTURE (duplicate)
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const USER_ID = process.env.SUPABASE_USER_ID;
const DRY_RUN = process.argv.includes('--dry-run');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function eliminaEntrateFatture() {
  console.log('🗑️  ELIMINAZIONE ENTRATE CATEGORIA "FATTURE"\n');

  if (DRY_RUN) {
    console.log('⚠️  MODALITÀ DRY-RUN: nessuna modifica sarà effettuata\n');
  } else {
    console.log('⚠️  ATTENZIONE: Le modifiche saranno permanenti!\n');
  }

  // Trova tutte le entrate con categoria FATTURE
  const { data: entrateFatture, error: selectError } = await supabase
    .from('entrate')
    .select('*')
    .eq('user_id', USER_ID)
    .eq('categoria', 'FATTURE');

  if (selectError) {
    console.error('❌ Errore caricamento entrate:', selectError);
    process.exit(1);
  }

  console.log(`📊 Trovate ${entrateFatture.length} entrate con categoria "FATTURE"\n`);

  if (entrateFatture.length === 0) {
    console.log('✅ Nessuna entrata da eliminare!\n');
    return;
  }

  const totaleDaEliminare = entrateFatture.reduce((sum, e) => sum + e.importo, 0);

  console.log(`💰 Totale importo da rimuovere: €${totaleDaEliminare.toFixed(2)}\n`);
  console.log('📋 Prime 10 entrate da eliminare:\n');

  entrateFatture.slice(0, 10).forEach((e, i) => {
    console.log(`   ${i + 1}. ${e.data} | €${e.importo.toFixed(2)} | ${e.descrizione}`);
  });

  if (entrateFatture.length > 10) {
    console.log(`   ... e altre ${entrateFatture.length - 10} entrate\n`);
  }

  if (DRY_RUN) {
    console.log(`\n[DRY-RUN] Eliminerei ${entrateFatture.length} entrate con categoria "FATTURE"`);
    console.log(`[DRY-RUN] Totale importo: €${totaleDaEliminare.toFixed(2)}\n`);
    console.log('💡 Per eseguire realmente l\'eliminazione, esegui senza --dry-run\n');
  } else {
    const ids = entrateFatture.map(e => e.id);

    const { error: deleteError } = await supabase
      .from('entrate')
      .delete()
      .in('id', ids);

    if (deleteError) {
      console.error('❌ Errore eliminazione:', deleteError);
      process.exit(1);
    }

    console.log(`\n✅ Eliminate ${entrateFatture.length} entrate con categoria "FATTURE"`);
    console.log(`✅ Rimossi €${totaleDaEliminare.toFixed(2)} di duplicati\n`);
  }
}

eliminaEntrateFatture().catch(err => {
  console.error('❌ Errore:', err);
  process.exit(1);
});
