/**
 * Script per creare backup delle tabelle prima del re-import
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const USER_ID = process.env.SUPABASE_USER_ID;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function backupDatabase() {
  console.log('💾 BACKUP DATABASE\n');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);

  // Backup entrate
  const { data: entrate } = await supabase
    .from('entrate')
    .select('*')
    .eq('user_id', USER_ID)
    .order('data', { ascending: true });

  fs.writeFileSync(
    `scripts/backup-entrate-${timestamp}.json`,
    JSON.stringify(entrate, null, 2)
  );
  console.log(`✅ Backup entrate: ${entrate.length} record → backup-entrate-${timestamp}.json`);

  // Backup uscite
  const { data: uscite } = await supabase
    .from('uscite')
    .select('*')
    .eq('user_id', USER_ID)
    .order('data', { ascending: true });

  fs.writeFileSync(
    `scripts/backup-uscite-${timestamp}.json`,
    JSON.stringify(uscite, null, 2)
  );
  console.log(`✅ Backup uscite: ${uscite.length} record → backup-uscite-${timestamp}.json`);

  // Backup prelievi
  const { data: prelievi } = await supabase
    .from('prelievi')
    .select('*')
    .eq('user_id', USER_ID)
    .order('data', { ascending: true });

  fs.writeFileSync(
    `scripts/backup-prelievi-${timestamp}.json`,
    JSON.stringify(prelievi, null, 2)
  );
  console.log(`✅ Backup prelievi: ${prelievi.length} record → backup-prelievi-${timestamp}.json`);

  console.log('\n✅ BACKUP COMPLETATO!\n');
}

backupDatabase().catch(err => {
  console.error('❌ Errore:', err);
  process.exit(1);
});
