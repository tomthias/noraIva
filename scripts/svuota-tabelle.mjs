/**
 * Script per svuotare le tabelle movimenti prima del re-import
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const USER_ID = process.env.SUPABASE_USER_ID;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function svuotaTabelle() {
  console.log('🗑️  SVUOTAMENTO TUTTE LE TABELLE\n');
  console.log('⚠️  ATTENZIONE: Questa operazione eliminerà TUTTI i dati!\n');

  // Delete fatture
  const { error: e0 } = await supabase
    .from('fatture')
    .delete()
    .eq('user_id', USER_ID);

  if (e0) {
    console.error('❌ Errore eliminazione fatture:', e0);
    process.exit(1);
  }
  console.log('✅ Tabella fatture svuotata');

  // Delete entrate
  const { error: e1 } = await supabase
    .from('entrate')
    .delete()
    .eq('user_id', USER_ID);

  if (e1) {
    console.error('❌ Errore eliminazione entrate:', e1);
    process.exit(1);
  }
  console.log('✅ Tabella entrate svuotata');

  // Delete uscite
  const { error: e2 } = await supabase
    .from('uscite')
    .delete()
    .eq('user_id', USER_ID);

  if (e2) {
    console.error('❌ Errore eliminazione uscite:', e2);
    process.exit(1);
  }
  console.log('✅ Tabella uscite svuotata');

  // Delete prelievi
  const { error: e3 } = await supabase
    .from('prelievi')
    .delete()
    .eq('user_id', USER_ID);

  if (e3) {
    console.error('❌ Errore eliminazione prelievi:', e3);
    process.exit(1);
  }
  console.log('✅ Tabella prelievi svuotata');

  console.log('\n✅ SVUOTAMENTO COMPLETATO!\n');
}

svuotaTabelle().catch(err => {
  console.error('❌ Errore:', err);
  process.exit(1);
});
