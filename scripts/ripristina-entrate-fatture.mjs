/**
 * Script per ripristinare le entrate con categoria FATTURE eliminate per errore
 *
 * Queste entrate rappresentano i PAGAMENTI REALI ricevuti dai clienti,
 * non sono duplicati delle fatture! Erano state eliminate pensando fossero duplicate.
 *
 * Usage:
 *   node scripts/ripristina-entrate-fatture.mjs
 *   node scripts/ripristina-entrate-fatture.mjs --dry-run
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const USER_ID = process.env.SUPABASE_USER_ID;
const DRY_RUN = process.argv.includes('--dry-run');

const CSV_PATH = join(dirname(__dirname), 'movimenti-trasformati.csv');

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !USER_ID) {
  console.error('❌ Errore: variabili d\'ambiente mancanti');
  console.error('   VITE_SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_USER_ID');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Parse CSV line handling quoted fields with commas
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
 * Parse importo (rimuove caratteri non numerici, gestisce virgola europea)
 */
function parseImporto(importoStr) {
  let cleaned = importoStr.replace(/[^\d.,-]/g, '');
  cleaned = cleaned.replace(/−/g, '-');
  cleaned = cleaned.replace(/\+/g, '');
  cleaned = cleaned.replace(',', '.');
  return Math.abs(parseFloat(cleaned) || 0);
}

async function ripristinaEntrateFatture() {
  console.log('🔄 RIPRISTINO ENTRATE CATEGORIA "FATTURE"\n');
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (DRY_RUN) {
    console.log('⚠️  MODALITÀ DRY-RUN: nessuna modifica sarà effettuata\n');
  }

  // Verifica situazione attuale database
  const { data: existingEntrate } = await supabase
    .from('entrate')
    .select('*')
    .eq('user_id', USER_ID)
    .eq('categoria', 'FATTURE');

  console.log(`📊 Stato ATTUALE database:`);
  console.log(`   Entrate categoria FATTURE: ${existingEntrate?.length || 0} record\n`);

  if (existingEntrate && existingEntrate.length > 0) {
    const totale = existingEntrate.reduce((sum, e) => sum + e.importo, 0);
    console.log(`   Totale esistente: €${totale.toFixed(2)}`);
    console.log(`   ⚠️  Attenzione: ci sono già entrate FATTURE nel database!\n`);
  }

  // Leggi CSV
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`❌ File non trovato: ${CSV_PATH}`);
    process.exit(1);
  }

  const content = fs.readFileSync(CSV_PATH, 'utf-8');
  const lines = content.split(/\r?\n/).filter(line => line.trim());

  console.log(`📄 Analizzando ${CSV_PATH}...\n`);

  // Skip header (DATA,DESCRIZIONE,IMPORTO,TIPO,CATEGORIA)
  const entrateFatture = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const [data, descrizione, importoStr, tipo, categoria] = parseCSVLine(line);

    // Filtra solo ENTRATA con categoria FATTURE
    if (tipo === 'ENTRATA' && categoria === 'FATTURE') {
      const importo = parseImporto(importoStr);
      entrateFatture.push({
        data,
        descrizione,
        importo,
        categoria,
      });
    }
  }

  console.log(`📋 Trovate ${entrateFatture.length} entrate FATTURE nel CSV\n`);

  if (entrateFatture.length === 0) {
    console.log('⚠️  Nessuna entrata FATTURE trovata nel CSV!\n');
    return;
  }

  const totaleDaInserire = entrateFatture.reduce((sum, e) => sum + e.importo, 0);
  console.log(`💰 Totale importo: €${totaleDaInserire.toFixed(2)}\n`);

  console.log('📋 Prime 10 entrate da ripristinare:\n');
  entrateFatture.slice(0, 10).forEach((e, i) => {
    console.log(`   ${i + 1}. ${e.data} | €${e.importo.toFixed(2)} | ${e.descrizione.substring(0, 50)}`);
  });

  if (entrateFatture.length > 10) {
    console.log(`   ... e altre ${entrateFatture.length - 10} entrate\n`);
  }

  // Filtra solo quelle che NON esistono già
  console.log('\n🔍 Verificando quali entrate mancano nel database...\n');

  const daInserire = [];
  const giàEsistenti = [];

  for (const entrata of entrateFatture) {
    const { data: existing } = await supabase
      .from('entrate')
      .select('id')
      .eq('user_id', USER_ID)
      .eq('data', entrata.data)
      .eq('descrizione', entrata.descrizione)
      .eq('importo', entrata.importo)
      .limit(1);

    if (existing && existing.length > 0) {
      giàEsistenti.push(entrata);
    } else {
      daInserire.push(entrata);
    }
  }

  console.log(`✅ Già esistenti: ${giàEsistenti.length}`);
  console.log(`➕ Da inserire: ${daInserire.length}\n`);

  if (daInserire.length === 0) {
    console.log('✅ Tutte le entrate FATTURE sono già nel database!\n');
    return;
  }

  // Inserisci le entrate mancanti
  const totaleDaInserireFinale = daInserire.reduce((sum, e) => sum + e.importo, 0);
  console.log(`💰 Totale da ripristinare: €${totaleDaInserireFinale.toFixed(2)}\n`);

  if (DRY_RUN) {
    console.log(`[DRY-RUN] Inserirei ${daInserire.length} entrate FATTURE`);
    console.log(`[DRY-RUN] Totale importo: €${totaleDaInserireFinale.toFixed(2)}\n`);
    console.log('💡 Per eseguire realmente il ripristino, rimuovi --dry-run\n');
  } else {
    console.log('⏳ Inserimento in corso...\n');

    let inserted = 0;
    let errors = 0;

    for (const entrata of daInserire) {
      const { error } = await supabase.from('entrate').insert({
        user_id: USER_ID,
        data: entrata.data,
        descrizione: entrata.descrizione,
        importo: entrata.importo,
        categoria: 'FATTURE',
        escludi_da_grafico: false,
      });

      if (error) {
        console.error(`❌ Errore inserendo ${entrata.data} - ${entrata.descrizione}:`, error.message);
        errors++;
      } else {
        inserted++;
        if (inserted % 10 === 0) {
          console.log(`   ✅ Inserite ${inserted}/${daInserire.length}...`);
        }
      }
    }

    console.log(`\n✅ RIPRISTINO COMPLETATO!`);
    console.log(`   Inserite: ${inserted}`);
    console.log(`   Errori: ${errors}\n`);

    // Verifica finale
    const { data: finalEntrate } = await supabase
      .from('entrate')
      .select('*')
      .eq('user_id', USER_ID)
      .eq('categoria', 'FATTURE');

    const totaleFinale = finalEntrate.reduce((sum, e) => sum + e.importo, 0);

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📊 STATO FINALE DATABASE\n');
    console.log(`   Entrate categoria FATTURE: ${finalEntrate.length} record`);
    console.log(`   Totale importo: €${totaleFinale.toFixed(2)}\n`);
    console.log('═══════════════════════════════════════════════════════════════\n');
  }
}

ripristinaEntrateFatture().catch(err => {
  console.error('❌ Errore:', err);
  process.exit(1);
});
