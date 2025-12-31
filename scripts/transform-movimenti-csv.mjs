/**
 * Script per trasformare il CSV bancario nel formato atteso da import-csv-data.mjs
 *
 * Input: movimenti.csv (formato bancario con colonne: Data_valuta, Data, Concetto, Movimento, Importo, ecc.)
 * Output: movimenti-trasformati.csv (formato import con colonne: DATA, DESCRIZIONE, IMPORTO, TIPO, CATEGORIA)
 *
 * Usage:
 *   node scripts/transform-movimenti-csv.mjs
 *   node scripts/transform-movimenti-csv.mjs --input=/path/to/movimenti.csv --output=/path/to/output.csv
 */

import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configurazione default
const DEFAULT_INPUT = '/Users/mattia/Desktop/noraiva conti/nuovo/movimenti_puliti.csv';
const DEFAULT_OUTPUT = join(dirname(__dirname), 'movimenti-trasformati.csv');

// Parse argomenti
const args = process.argv.slice(2);
let inputPath = DEFAULT_INPUT;
let outputPath = DEFAULT_OUTPUT;

args.forEach(arg => {
  if (arg.startsWith('--input=')) {
    inputPath = arg.split('=')[1];
  } else if (arg.startsWith('--output=')) {
    outputPath = arg.split('=')[1];
  }
});

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
 * Categorizza un movimento basandosi su descrizione e importo
 */
function categorizzaMovimento(movimento, osservazioni, importo) {
  const desc = `${movimento} ${osservazioni}`.toLowerCase();

  // ENTRATE (importo positivo)
  if (importo > 0) {
    if (desc.includes('fattura') || desc.includes('ft.') || desc.includes('saldo fat')) {
      return 'FATTURE'; // Verrà skippato dall'import (già in fatture.csv)
    }
    if (desc.includes('rimborso') || desc.includes('mentoring')) {
      return 'RIMBORSI';
    }
    if (desc.includes('liquidazione interessi') || desc.includes('accredito interessi') || desc.includes('interessi attivi')) {
      return 'INTERESSI';
    }
    return 'ALTRO';
  }

  // USCITE (importo negativo)
  if (desc.includes('stipendio') || desc.includes('mattia marinangeli')) {
    return 'STIPENDI'; // → tabella prelievi
  }
  if (desc.includes('tasse') || desc.includes('imposta di bollo') || desc.includes('f24') || desc.includes('agenzia entrate')) {
    return 'TASSE';
  }
  if (desc.includes('moneyfarm') || desc.includes('investimenti') || desc.includes('trading')) {
    return 'INVESTIMENTI';
  }
  if (desc.includes('consulenza') || desc.includes('psicolog') || desc.includes('commercialista')) {
    return 'SERVIZI';
  }
  if (desc.includes('dovevivo') || desc.includes('affitto') || desc.includes('canone locazione')) {
    return 'AFFITTO';
  }
  if (desc.includes('autostrada') || desc.includes('telepass')) {
    return 'AUTOSTRADA';
  }
  if (desc.includes('eni') || desc.includes('q8') || desc.includes('petrolvilla') || desc.includes('carburante') || desc.includes('benzina')) {
    return 'TRASPORTO';
  }

  return 'VARIO';
}

/**
 * Converte data da DD/MM/YYYY a YYYY-MM-DD
 */
function convertiData(dataStr) {
  if (!dataStr) return '';
  const parts = dataStr.split('/');
  if (parts.length !== 3) return dataStr;

  const [giorno, mese, anno] = parts;
  return `${anno}-${mese.padStart(2, '0')}-${giorno.padStart(2, '0')}`;
}

/**
 * Parse importo (rimuove caratteri non numerici, converte virgola in punto)
 */
function parseImporto(importoStr) {
  if (!importoStr) return 0;

  // Rimuovi caratteri non numerici tranne punto, virgola e segno meno
  let cleaned = importoStr.replace(/[^\d.,-]/g, '');

  // Gestisci il carattere speciale "−" (U+2212) vs "-" normale
  cleaned = cleaned.replace(/−/g, '-');

  // Rimuovi il segno + se presente
  cleaned = cleaned.replace(/\+/g, '');

  // Converti virgola in punto (formato europeo)
  cleaned = cleaned.replace(',', '.');

  return parseFloat(cleaned) || 0;
}

/**
 * Trasforma CSV bancario in formato import
 */
function trasformaCSV() {
  console.log('🔄 Trasformazione CSV bancario in formato import\n');
  console.log(`Input:  ${inputPath}`);
  console.log(`Output: ${outputPath}\n`);

  // Verifica esistenza file input
  if (!fs.existsSync(inputPath)) {
    console.error(`❌ File non trovato: ${inputPath}`);
    process.exit(1);
  }

  // Leggi CSV
  const content = fs.readFileSync(inputPath, 'utf-8');
  const lines = content.split(/\r?\n/).filter(line => line.trim());

  if (lines.length === 0) {
    console.error('❌ File CSV vuoto');
    process.exit(1);
  }

  // Parse header (assumiamo prima riga)
  const header = parseCSVLine(lines[0]);
  console.log(`📋 Colonne rilevate: ${header.join(', ')}\n`);

  // Trova indici colonne
  const colIndices = {
    data: header.findIndex(h => h.toLowerCase().includes('data') && !h.toLowerCase().includes('valuta')),
    concetto: header.findIndex(h => h.toLowerCase() === 'concetto'),
    movimento: header.findIndex(h => h.toLowerCase() === 'movimento'),
    importo: header.findIndex(h => h.toLowerCase() === 'importo' && !h.toLowerCase().includes('disponibile')),
    osservazioni: header.findIndex(h => h.toLowerCase() === 'osservazioni'),
  };

  console.log('📊 Mapping colonne:');
  console.log(`  Data: colonna ${colIndices.data} (${header[colIndices.data]})`);
  console.log(`  Movimento: colonna ${colIndices.movimento} (${header[colIndices.movimento]})`);
  console.log(`  Importo: colonna ${colIndices.importo} (${header[colIndices.importo]})`);
  console.log(`  Osservazioni: colonna ${colIndices.osservazioni} (${header[colIndices.osservazioni]})\n`);

  // Prepara output CSV
  const outputLines = ['DATA,DESCRIZIONE,IMPORTO,TIPO,CATEGORIA'];

  const stats = {
    totale: 0,
    entrate: 0,
    uscite: 0,
    prelievi: 0,
    skipped: 0,
  };

  // Processa ogni riga
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);

    const data = cols[colIndices.data];
    const movimento = cols[colIndices.movimento] || '';
    const importoStr = cols[colIndices.importo];
    const osservazioni = cols[colIndices.osservazioni] || '';

    if (!data || !importoStr) {
      console.log(`⚠️  Riga ${i + 1} malformata (data o importo mancante), skip`);
      stats.skipped++;
      continue;
    }

    const importo = parseImporto(importoStr);
    const tipo = importo >= 0 ? 'ENTRATA' : 'USCITA';
    const categoria = categorizzaMovimento(movimento, osservazioni, importo);
    const descrizione = (osservazioni || movimento || 'Movimento bancario').replace(/,/g, ';'); // Escape virgole
    const dataISO = convertiData(data);

    // Crea riga CSV output (importo con virgola decimale, ma tutto il campo quotato)
    const importoAbs = Math.abs(importo).toFixed(2).replace('.', ',');
    outputLines.push(`${dataISO},"${descrizione}","${importoAbs}",${tipo},${categoria}`);

    stats.totale++;
    if (tipo === 'ENTRATA') {
      stats.entrate++;
    } else if (categoria === 'STIPENDI') {
      stats.prelievi++;
    } else {
      stats.uscite++;
    }
  }

  // Scrivi file output
  fs.writeFileSync(outputPath, outputLines.join('\n'), 'utf-8');

  console.log('✅ Trasformazione completata!\n');
  console.log('📊 STATISTICHE:');
  console.log(`  Totale movimenti: ${stats.totale}`);
  console.log(`  Entrate: ${stats.entrate}`);
  console.log(`  Uscite: ${stats.uscite}`);
  console.log(`  Prelievi (STIPENDI): ${stats.prelievi}`);
  console.log(`  Righe saltate: ${stats.skipped}\n`);

  console.log(`📁 File salvato in: ${outputPath}\n`);
  console.log('💡 Prossimi passi:');
  console.log('   1. Verifica il file trasformato');
  console.log('   2. Esegui: export SUPABASE_SERVICE_KEY=<tua-chiave>');
  console.log('   3. Esegui: export SUPABASE_USER_ID=<tuo-user-id>');
  console.log('   4. Test: node scripts/import-csv-data.mjs --dry-run');
  console.log('   5. Import reale: node scripts/import-csv-data.mjs\n');
}

// Esegui trasformazione
trasformaCSV();
