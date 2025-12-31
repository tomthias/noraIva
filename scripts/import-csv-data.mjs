/**
 * Script per importare dati da CSV in Supabase
 *
 * Usage:
 *   SUPABASE_USER_ID=xxx node scripts/import-csv-data.mjs
 *   SUPABASE_USER_ID=xxx node scripts/import-csv-data.mjs --dry-run
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configurazione
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const USER_ID = process.env.SUPABASE_USER_ID;
const DRY_RUN = process.argv.includes('--dry-run');

const CSV_PATH = '/Users/mattia/Desktop/noraiva conti/nuovo';
const FATTURE_CSV = join(CSV_PATH, 'fatture.csv');
const MOVIMENTI_CSV = join(CSV_PATH, 'movimenti.csv');

// Validazione configurazione
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Errore: VITE_SUPABASE_URL e SUPABASE_SERVICE_KEY devono essere definite nel .env');
  process.exit(1);
}

if (!USER_ID) {
  console.error('❌ Errore: SUPABASE_USER_ID deve essere passato come variabile d\'ambiente');
  console.log('\nUsage: SUPABASE_USER_ID=xxx node scripts/import-csv-data.mjs');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Statistiche
const stats = {
  fatture: { imported: 0, skipped: 0, errors: 0 },
  entrate: { imported: 0, skipped: 0, errors: 0 },
  uscite: { imported: 0, skipped: 0, errors: 0 },
  prelievi: { imported: 0, skipped: 0, errors: 0 },
};

const errors = [];

/**
 * Parse CSV in modo semplice (supporta virgole in campi quotati)
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Pulisce importo (rimuove +, −, €, spazi)
 */
function parseImporto(importoStr) {
  // Rimuovi caratteri non numerici tranne punto, virgola e segno meno
  let cleaned = importoStr.replace(/[^\d.,-]/g, '');

  // Gestisci il carattere speciale "−" (U+2212) vs "-" normale
  cleaned = cleaned.replace(/−/g, '-');

  // Rimuovi il segno + se presente
  cleaned = cleaned.replace(/\+/g, '');

  // Converti virgola in punto (formato europeo)
  cleaned = cleaned.replace(',', '.');

  return Math.abs(parseFloat(cleaned) || 0);
}

/**
 * Verifica se un record esiste già nel database
 */
async function checkDuplicate(table, data, importo) {
  const { data: existing } = await supabase
    .from(table)
    .select('id')
    .eq('user_id', USER_ID)
    .eq('data', data)
    .eq('descrizione', importo.toString())
    .limit(1);

  return existing && existing.length > 0;
}

/**
 * Importa fatture da fatture.csv
 */
async function importFatture() {
  console.log('\n📄 Importando fatture...');

  if (!fs.existsSync(FATTURE_CSV)) {
    console.log(`⚠️  File non trovato: ${FATTURE_CSV}`);
    return;
  }

  const content = fs.readFileSync(FATTURE_CSV, 'utf-8');
  const lines = content.split(/\r?\n/).filter(line => line.trim());

  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const [numero, data, cliente, importoLordo, ivaStatus, descrizione] = parseCSVLine(line);

    if (!data || !cliente || !importoLordo) {
      console.log(`⚠️  Riga ${i + 1} malformata, skip`);
      stats.fatture.errors++;
      continue;
    }

    try {
      const importo = parseImporto(importoLordo);

      // Check duplicati
      const { data: existing } = await supabase
        .from('fatture')
        .select('id')
        .eq('user_id', USER_ID)
        .eq('data', data)
        .eq('cliente', cliente)
        .eq('importo_lordo', importo)
        .limit(1);

      if (existing && existing.length > 0) {
        console.log(`⏭️  Skip fattura duplicata: ${data} - ${cliente} - €${importo}`);
        stats.fatture.skipped++;
        continue;
      }

      if (DRY_RUN) {
        console.log(`[DRY-RUN] Importerei fattura: ${data} - ${cliente} - €${importo}`);
        stats.fatture.imported++;
      } else {
        const { error } = await supabase.from('fatture').insert({
          user_id: USER_ID,
          data,
          cliente,
          importo_lordo: importo,
          descrizione: descrizione || `Fattura ${numero}`,
          note: ivaStatus || null,
        });

        if (error) {
          console.error(`❌ Errore importando fattura ${numero}:`, error.message);
          errors.push({ tipo: 'fattura', riga: i + 1, error: error.message });
          stats.fatture.errors++;
        } else {
          console.log(`✅ Importata fattura: ${data} - ${cliente} - €${importo}`);
          stats.fatture.imported++;
        }
      }
    } catch (err) {
      console.error(`❌ Errore parsing fattura riga ${i + 1}:`, err.message);
      errors.push({ tipo: 'fattura', riga: i + 1, error: err.message });
      stats.fatture.errors++;
    }
  }
}

/**
 * Importa movimenti da movimenti.csv
 * Routing:
 * - TIPO=ENTRATA, CATEGORIA≠FATTURE → tabella entrate
 * - TIPO=USCITA, CATEGORIA=STIPENDI → tabella prelievi
 * - TIPO=USCITA, CATEGORIA≠STIPENDI → tabella uscite
 * - TIPO=ENTRATA, CATEGORIA=FATTURE → skip (già in fatture.csv)
 */
async function importMovimenti() {
  console.log('\n💸 Importando movimenti...');

  if (!fs.existsSync(MOVIMENTI_CSV)) {
    console.log(`⚠️  File non trovato: ${MOVIMENTI_CSV}`);
    return;
  }

  const content = fs.readFileSync(MOVIMENTI_CSV, 'utf-8');
  const lines = content.split(/\r?\n/).filter(line => line.trim());

  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const [data, descrizione, importoStr, tipo, categoria] = parseCSVLine(line);

    if (!data || !descrizione || !importoStr || !tipo) {
      console.log(`⚠️  Riga ${i + 1} malformata, skip`);
      continue;
    }

    try {
      const importo = parseImporto(importoStr);

      // Skip fatture (già importate da fatture.csv)
      if (tipo === 'ENTRATA' && categoria === 'FATTURE') {
        console.log(`⏭️  Skip movimento FATTURE: ${data} - ${descrizione}`);
        continue;
      }

      // Determina tabella di destinazione
      let table;
      let statsKey;

      if (tipo === 'ENTRATA') {
        table = 'entrate';
        statsKey = 'entrate';
      } else if (tipo === 'USCITA' && categoria === 'STIPENDI') {
        table = 'prelievi';
        statsKey = 'prelievi';
      } else if (tipo === 'USCITA') {
        table = 'uscite';
        statsKey = 'uscite';
      } else {
        console.log(`⚠️  Tipo movimento non riconosciuto: ${tipo} / ${categoria}`);
        continue;
      }

      // Check duplicati
      const { data: existing } = await supabase
        .from(table)
        .select('id')
        .eq('user_id', USER_ID)
        .eq('data', data)
        .eq('descrizione', descrizione)
        .eq('importo', importo)
        .limit(1);

      if (existing && existing.length > 0) {
        console.log(`⏭️  Skip ${table} duplicato: ${data} - ${descrizione}`);
        stats[statsKey].skipped++;
        continue;
      }

      // Prepara dati per insert
      const insertData = {
        user_id: USER_ID,
        data,
        descrizione,
        importo,
      };

      // Aggiungi categoria se non è prelievo
      if (table !== 'prelievi') {
        insertData.categoria = categoria || null;
      }

      if (DRY_RUN) {
        console.log(`[DRY-RUN] Importerei ${table}: ${data} - ${descrizione} - €${importo}`);
        stats[statsKey].imported++;
      } else {
        const { error } = await supabase.from(table).insert(insertData);

        if (error) {
          console.error(`❌ Errore importando ${table}:`, error.message);
          errors.push({ tipo: table, riga: i + 1, error: error.message });
          stats[statsKey].errors++;
        } else {
          console.log(`✅ Importato ${table}: ${data} - ${descrizione} - €${importo}`);
          stats[statsKey].imported++;
        }
      }
    } catch (err) {
      console.error(`❌ Errore parsing movimento riga ${i + 1}:`, err.message);
      errors.push({ tipo: 'movimento', riga: i + 1, error: err.message });
    }
  }
}

/**
 * Stampa summary finale
 */
function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 RIEPILOGO IMPORT');
  console.log('='.repeat(60));

  if (DRY_RUN) {
    console.log('⚠️  MODALITÀ DRY-RUN - Nessun dato scritto nel database\n');
  }

  console.log('Fatture:');
  console.log(`  ✅ Importate: ${stats.fatture.imported}`);
  console.log(`  ⏭️  Saltate (duplicati): ${stats.fatture.skipped}`);
  console.log(`  ❌ Errori: ${stats.fatture.errors}`);

  console.log('\nEntrate:');
  console.log(`  ✅ Importate: ${stats.entrate.imported}`);
  console.log(`  ⏭️  Saltate (duplicati): ${stats.entrate.skipped}`);
  console.log(`  ❌ Errori: ${stats.entrate.errors}`);

  console.log('\nUscite:');
  console.log(`  ✅ Importate: ${stats.uscite.imported}`);
  console.log(`  ⏭️  Saltate (duplicati): ${stats.uscite.skipped}`);
  console.log(`  ❌ Errori: ${stats.uscite.errors}`);

  console.log('\nPrelievi:');
  console.log(`  ✅ Importati: ${stats.prelievi.imported}`);
  console.log(`  ⏭️  Saltati (duplicati): ${stats.prelievi.skipped}`);
  console.log(`  ❌ Errori: ${stats.prelievi.errors}`);

  const totalImported = stats.fatture.imported + stats.entrate.imported + stats.uscite.imported + stats.prelievi.imported;
  const totalErrors = stats.fatture.errors + stats.entrate.errors + stats.uscite.errors + stats.prelievi.errors;

  console.log('\n' + '-'.repeat(60));
  console.log(`TOTALE IMPORTATI: ${totalImported}`);
  console.log(`TOTALE ERRORI: ${totalErrors}`);
  console.log('='.repeat(60) + '\n');

  if (errors.length > 0) {
    console.log('⚠️  Errori dettagliati:');
    errors.forEach(({ tipo, riga, error }) => {
      console.log(`  - ${tipo} (riga ${riga}): ${error}`);
    });

    // Salva errori su file
    const errorLog = join(__dirname, 'import-errors.log');
    fs.writeFileSync(errorLog, JSON.stringify(errors, null, 2));
    console.log(`\n📝 Errori salvati in: ${errorLog}\n`);
  }
}

/**
 * Main
 */
async function main() {
  console.log('🚀 Avvio import dati da CSV a Supabase');
  console.log(`User ID: ${USER_ID}`);
  console.log(`Dry Run: ${DRY_RUN ? 'SÌ' : 'NO'}\n`);

  await importFatture();
  await importMovimenti();

  printSummary();

  if (DRY_RUN) {
    console.log('💡 Per eseguire l\'import reale, rimuovi il flag --dry-run\n');
  } else {
    console.log('✅ Import completato!\n');
  }
}

main().catch(err => {
  console.error('❌ Errore fatale:', err);
  process.exit(1);
});
