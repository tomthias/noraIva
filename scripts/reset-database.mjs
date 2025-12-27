/**
 * Script per azzerare COMPLETAMENTE il database
 * Elimina: fatture, prelievi, uscite, entrate
 *
 * ATTENZIONE: Questa operazione è IRREVERSIBILE!
 *
 * Esegui con: node scripts/reset-database.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env');
const envContent = readFileSync(envPath, 'utf-8');

const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim();
  }
});

const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Serve SUPABASE_SERVICE_KEY nel .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const USER_ID = '580d9a54-9a65-4b36-a2a5-480908b1ee38';

async function resetDatabase() {
  console.log('\n🗑️  AZZERAMENTO COMPLETO DATABASE');
  console.log('=====================================\n');
  console.log(`User ID: ${USER_ID}\n`);

  let totalDeleted = 0;

  // 1. Elimina tutte le FATTURE
  console.log('🔄 Eliminazione fatture...');
  const { data: fattureData, error: deleteFatture } = await supabase
    .from('fatture')
    .delete()
    .eq('user_id', USER_ID)
    .select();

  if (deleteFatture) {
    console.error('❌ Errore eliminazione fatture:', deleteFatture.message);
  } else {
    const count = fattureData?.length || 0;
    console.log(`✅ ${count} fatture eliminate`);
    totalDeleted += count;
  }

  // 2. Elimina tutti i PRELIEVI
  console.log('🔄 Eliminazione prelievi...');
  const { data: prelieviData, error: deletePrelievi } = await supabase
    .from('prelievi')
    .delete()
    .eq('user_id', USER_ID)
    .select();

  if (deletePrelievi) {
    console.error('❌ Errore eliminazione prelievi:', deletePrelievi.message);
  } else {
    const count = prelieviData?.length || 0;
    console.log(`✅ ${count} prelievi eliminati`);
    totalDeleted += count;
  }

  // 3. Elimina tutte le USCITE
  console.log('🔄 Eliminazione uscite...');
  const { data: usciteData, error: deleteUscite } = await supabase
    .from('uscite')
    .delete()
    .eq('user_id', USER_ID)
    .select();

  if (deleteUscite) {
    console.error('❌ Errore eliminazione uscite:', deleteUscite.message);
  } else {
    const count = usciteData?.length || 0;
    console.log(`✅ ${count} uscite eliminate`);
    totalDeleted += count;
  }

  // 4. Elimina tutte le ENTRATE
  console.log('🔄 Eliminazione entrate...');
  const { data: entrateData, error: deleteEntrate } = await supabase
    .from('entrate')
    .delete()
    .eq('user_id', USER_ID)
    .select();

  if (deleteEntrate) {
    console.error('❌ Errore eliminazione entrate:', deleteEntrate.message);
  } else {
    const count = entrateData?.length || 0;
    console.log(`✅ ${count} entrate eliminate`);
    totalDeleted += count;
  }

  console.log('\n=====================================');
  console.log(`✅ TOTALE RECORD ELIMINATI: ${totalDeleted}`);
  console.log('✅ Database completamente azzerato!\n');
}

resetDatabase();
