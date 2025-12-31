/**
 * Script per ripristinare i dati dal backup JSON in Supabase
 *
 * Usage:
 *   VITE_SUPABASE_URL=xxx SUPABASE_SERVICE_KEY=xxx SUPABASE_USER_ID=xxx node scripts/restore-database.mjs
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configurazione
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const USER_ID = process.env.SUPABASE_USER_ID;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !USER_ID) {
  console.error('❌ Errore: Variabili d\'ambiente mancanti');
  console.error('   Richieste: VITE_SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_USER_ID');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// File di backup
const BACKUP_ENTRATE = join(__dirname, 'backup-entrate-2025-12-31T16-57-46.json');
const BACKUP_USCITE = join(__dirname, 'backup-uscite-2025-12-31T16-57-46.json');
const BACKUP_PRELIEVI = join(__dirname, 'backup-prelievi-2025-12-31T16-57-46.json');

const stats = {
  entrate: { imported: 0, errors: 0 },
  uscite: { imported: 0, errors: 0 },
  prelievi: { imported: 0, errors: 0 },
};

/**
 * Importa dati in una tabella
 */
async function importTable(tableName, backupFile, statsKey) {
  console.log(`\n📥 Importando ${tableName}...`);

  if (!fs.existsSync(backupFile)) {
    console.log(`⚠️  File non trovato: ${backupFile}`);
    return;
  }

  const data = JSON.parse(fs.readFileSync(backupFile, 'utf-8'));
  console.log(`   Trovati ${data.length} record`);

  // Prepara i dati rimuovendo id, created_at, updated_at (Supabase li genera)
  const cleanedData = data.map(record => {
    const { id, created_at, updated_at, ...rest } = record;
    return rest;
  });

  // Insert in batch
  const BATCH_SIZE = 50;
  for (let i = 0; i < cleanedData.length; i += BATCH_SIZE) {
    const batch = cleanedData.slice(i, i + BATCH_SIZE);

    const { error } = await supabase.from(tableName).insert(batch);

    if (error) {
      console.error(`❌ Errore batch ${i}-${i + batch.length}:`, error.message);
      stats[statsKey].errors += batch.length;
    } else {
      stats[statsKey].imported += batch.length;
      console.log(`   ✅ Importati record ${i + 1}-${i + batch.length}`);
    }
  }
}

/**
 * Stampa riepilogo
 */
function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 RIEPILOGO RESTORE');
  console.log('='.repeat(60));

  console.log('\nEntrate:');
  console.log(`  ✅ Importate: ${stats.entrate.imported}`);
  console.log(`  ❌ Errori: ${stats.entrate.errors}`);

  console.log('\nUscite:');
  console.log(`  ✅ Importate: ${stats.uscite.imported}`);
  console.log(`  ❌ Errori: ${stats.uscite.errors}`);

  console.log('\nPrelievi:');
  console.log(`  ✅ Importati: ${stats.prelievi.imported}`);
  console.log(`  ❌ Errori: ${stats.prelievi.errors}`);

  const totalImported = stats.entrate.imported + stats.uscite.imported + stats.prelievi.imported;
  const totalErrors = stats.entrate.errors + stats.uscite.errors + stats.prelievi.errors;

  console.log('\n' + '-'.repeat(60));
  console.log(`TOTALE IMPORTATI: ${totalImported}`);
  console.log(`TOTALE ERRORI: ${totalErrors}`);
  console.log('='.repeat(60) + '\n');
}

/**
 * Main
 */
async function main() {
  console.log('🔄 RIPRISTINO DATABASE DA BACKUP\n');
  console.log(`User ID: ${USER_ID}`);

  await importTable('entrate', BACKUP_ENTRATE, 'entrate');
  await importTable('uscite', BACKUP_USCITE, 'uscite');
  await importTable('prelievi', BACKUP_PRELIEVI, 'prelievi');

  printSummary();

  console.log('✅ Restore completato!\n');
}

main().catch(err => {
  console.error('❌ Errore fatale:', err);
  process.exit(1);
});
