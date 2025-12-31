/**
 * Script per importare fatture.csv e movimenti.csv in Supabase
 *
 * Usage:
 *   VITE_SUPABASE_URL=xxx SUPABASE_SERVICE_KEY=xxx SUPABASE_USER_ID=xxx node scripts/import-from-csv.mjs
 *   Aggiungi --dry-run per testare senza scrivere
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
const DRY_RUN = process.argv.includes('--dry-run');

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !USER_ID) {
  console.error('❌ Errore: Variabili d\'ambiente mancanti');
  console.error('   Richieste: VITE_SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_USER_ID');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// File CSV (nella root del progetto)
const ROOT_DIR = dirname(__dirname);
const FATTURE_CSV = join(ROOT_DIR, 'fatture.csv');
const MOVIMENTI_CSV = join(ROOT_DIR, 'movimenti.csv');

const stats = {
  fatture: { imported: 0, skipped: 0, errors: 0 },
  entrate: { imported: 0, skipped: 0, errors: 0 },
  uscite: { imported: 0, skipped: 0, errors: 0 },
  prelievi: { imported: 0, skipped: 0, errors: 0 },
};

/**
 * Parse CSV line handling quoted fields
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
        i++;
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
 * Parse importo from Italian format (1.234,56 or 1234,56)
 */
function parseImporto(importoStr) {
  if (!importoStr) return 0;
  // Rimuovi caratteri non numerici tranne punto, virgola e segno
  let cleaned = importoStr.replace(/[€\s]/g, '');
  // Gestisci formato italiano: 1.234,56 → 1234.56
  // Se c'è sia punto che virgola, il punto è separatore migliaia
  if (cleaned.includes('.') && cleaned.includes(',')) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else {
    // Solo virgola = decimale
    cleaned = cleaned.replace(',', '.');
  }
  return parseFloat(cleaned) || 0;
}

/**
 * Converti data da DD/MM/YYYY a YYYY-MM-DD
 */
function parseData(dataStr) {
  if (!dataStr) return null;
  const parts = dataStr.split('/');
  if (parts.length !== 3) return null;
  const [giorno, mese, anno] = parts;
  return `${anno}-${mese.padStart(2, '0')}-${giorno.padStart(2, '0')}`;
}

/**
 * Determina la categoria per un movimento
 */
function getCategoria(concetto, movimento, descrizione) {
  const text = `${concetto} ${movimento} ${descrizione}`.toLowerCase();

  // TASSE - F24, imposte, contributi INPS, etc.
  if (text.includes('tasse') || text.includes('tass') ||
      text.includes('f24') || text.includes('irpef') ||
      text.includes('inps') || text.includes('contribut') ||
      text.includes('imposta') || text.includes('pagamento imposte')) {
    return 'TASSE';
  }

  // PSICOLOGA
  if (text.includes('psicologo') || text.includes('psicologa') ||
      text.includes('consulenza psicologica') || text.includes('psico')) {
    return 'PSICOLOGA';
  }

  // AFFITTO
  if (text.includes('dovevivo') || text.includes('affitto') || text.includes('canone locazione')) {
    return 'AFFITTO';
  }

  // VIAGGI
  if (text.includes('viaggio') || text.includes('volo') || text.includes('skitour') ||
      text.includes('albania') || text.includes('georgia') || text.includes('norvegia') ||
      text.includes('flydubai') || text.includes('ryanair') || text.includes('booking')) {
    return 'VIAGGI';
  }

  // SHOPPING
  if (text.includes('vinted') || text.includes('north face') || text.includes('northface') ||
      text.includes('maxi sport') || text.includes('smartwool')) {
    return 'SHOPPING';
  }

  // ABBONAMENTI/SERVIZI
  if (text.includes('preply') || text.includes('claude code') || text.includes('moneyfarm') ||
      text.includes('ticketmaster') || text.includes('impact hub')) {
    return 'ABBONAMENTI';
  }

  // INTERESSI
  if (text.includes('liquidazione interessi') || text.includes('interessi-commissioni')) {
    return 'INTERESSI';
  }

  // RIMBORSI
  if (text.includes('rimborso')) {
    return 'RIMBORSI';
  }

  // FATTURE
  if (text.includes('fattur') || text.includes('saldo fat') || text.includes('pagamento fattura')) {
    return 'FATTURE';
  }

  // BENZINA/AUTO
  if (text.includes('q8') || text.includes('benzina') || text.includes('carburante') ||
      text.includes('autostrad') || text.includes('pedaggio') || text.includes('petrolvilla')) {
    return 'AUTO';
  }

  // PRELIEVI CONTANTI
  if (text.includes('rit. contanti') || text.includes('prelievo contanti') ||
      text.includes('comm. rit. cont')) {
    return 'CONTANTI';
  }

  return 'ALTRO';
}

/**
 * Determina se un movimento positivo deve essere ESCLUSO dalle entrate
 * (giroconti, trasferimenti interni, etc.)
 */
function shouldSkipEntrata(concetto, movimento, descrizione) {
  const text = `${concetto} ${movimento} ${descrizione}`.toLowerCase();

  // Giroconti e trasferimenti interni (ma NON quelli relativi a tasse - quelli sono uscite legittime)
  if ((text.includes('giroconto') || text.includes('bonifico giroconto')) &&
      !text.includes('tasse') && !text.includes('tass')) {
    return true;
  }

  // Trasferimenti da altri conti personali
  if (text.includes('inviato da n26') || text.includes('inviato da revolut')) {
    return true;
  }

  // Accrediti con carta generici (spesso sono rimborsi interni o storno)
  if (concetto.toLowerCase() === 'accredito con carta' && movimento.toLowerCase() === 'altro') {
    return true;
  }

  // Prelievi contanti (non sono entrate reali, sono movimenti di cassa)
  if (text.includes('rit. contanti') || text.includes('prelievo contanti')) {
    return true;
  }

  return false;
}

/**
 * Determina se un'uscita deve essere ESCLUSA (trasferimenti interni non fiscali)
 */
function shouldSkipUscita(concetto, movimento, descrizione) {
  const text = `${concetto} ${movimento} ${descrizione}`.toLowerCase();

  // Giroconti interni che NON sono per tasse (solo spostamenti tra conti)
  if ((text.includes('giroconto') && !text.includes('tasse') && !text.includes('tass'))) {
    // Se è un giroconto generico senza scopo fiscale, potrebbe essere skip
    // Ma per ora li teniamo tutti per sicurezza
    return false;
  }

  return false;
}

/**
 * Determina se è un prelievo personale
 */
function isPrelievo(concetto, movimento, descrizione) {
  const text = `${concetto} ${movimento} ${descrizione}`.toLowerCase();
  return text.includes('mattia marinangeli') ||
         text.includes('stipendio') ||
         (text.includes('bonifico eseguito') && text.includes('mattia'));
}

/**
 * Import fatture da fatture.csv
 */
async function importFatture() {
  console.log('\n📄 IMPORTANDO FATTURE...');

  if (!fs.existsSync(FATTURE_CSV)) {
    console.log(`⚠️  File non trovato: ${FATTURE_CSV}`);
    return;
  }

  const content = fs.readFileSync(FATTURE_CSV, 'utf-8');
  const lines = content.split(/\r?\n/).filter(line => line.trim());

  console.log(`   Trovate ${lines.length - 1} fatture`);

  // Skip header: Numero Fattura,Data,Anno,Cliente,Descrizione,Importo Netto (€),Importo Totale (€)
  for (let i = 1; i < lines.length; i++) {
    const [numeroFattura, data, anno, cliente, descrizione, importoNetto, importoTotale] = parseCSVLine(lines[i]);

    if (!data || !cliente) {
      console.log(`⚠️  Riga ${i + 1} malformata, skip`);
      stats.fatture.errors++;
      continue;
    }

    const dataISO = parseData(data);
    const importo = parseImporto(importoTotale);

    if (!dataISO || importo === 0) {
      console.log(`⚠️  Riga ${i + 1} dati invalidi, skip`);
      stats.fatture.errors++;
      continue;
    }

    const record = {
      user_id: USER_ID,
      data: dataISO,
      cliente: cliente,
      descrizione: descrizione || `Fattura ${numeroFattura}`,
      importo_lordo: importo,
      note: null,
    };

    if (DRY_RUN) {
      console.log(`   [DRY-RUN] Fattura: ${dataISO} - ${cliente} - €${importo}`);
      stats.fatture.imported++;
    } else {
      const { error } = await supabase.from('fatture').insert(record);
      if (error) {
        console.error(`   ❌ Errore fattura ${numeroFattura}:`, error.message);
        stats.fatture.errors++;
      } else {
        console.log(`   ✅ ${dataISO} - ${cliente} - €${importo}`);
        stats.fatture.imported++;
      }
    }
  }
}

/**
 * Import movimenti da movimenti.csv
 */
async function importMovimenti() {
  console.log('\n💸 IMPORTANDO MOVIMENTI...');

  if (!fs.existsSync(MOVIMENTI_CSV)) {
    console.log(`⚠️  File non trovato: ${MOVIMENTI_CSV}`);
    return;
  }

  const content = fs.readFileSync(MOVIMENTI_CSV, 'utf-8');
  const lines = content.split(/\r?\n/).filter(line => line.trim());

  console.log(`   Trovati ${lines.length - 1} movimenti`);

  // Header: Data_valuta,Data,Concetto,Movimento,Importo,Valuta,Disponibile,Valuta_disponibile,Osservazioni
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    const [dataValuta, data, concetto, movimento, importoStr, valuta, disponibile, valutaDisp, osservazioni] = fields;

    if (!data || importoStr === undefined) {
      continue;
    }

    const dataISO = parseData(data);
    const importo = parseImporto(importoStr);

    if (!dataISO || importo === 0) {
      continue;
    }

    const descrizione = movimento || concetto || osservazioni || 'Movimento';
    const categoria = getCategoria(concetto, movimento, osservazioni);
    const importoAbs = Math.abs(importo);

    // Determina tabella di destinazione
    let table, statsKey, record;

    if (importo > 0) {
      // ENTRATA - ma prima verifica se deve essere esclusa

      // Skip giroconti e trasferimenti interni
      if (shouldSkipEntrata(concetto, movimento, osservazioni)) {
        console.log(`   ⏭️  Skip (trasferimento interno): ${dataISO} - ${descrizione} - €${importoAbs}`);
        stats.entrate.skipped++;
        continue;
      }

      // Skip entrate che sono pagamenti fatture (già contate nella tabella fatture)
      if (categoria === 'FATTURE') {
        console.log(`   ⏭️  Skip (già in fatture): ${dataISO} - ${descrizione} - €${importoAbs}`);
        stats.entrate.skipped++;
        continue;
      }

      table = 'entrate';
      statsKey = 'entrate';
      record = {
        user_id: USER_ID,
        data: dataISO,
        descrizione: descrizione,
        categoria: categoria,
        importo: importoAbs,
        note: osservazioni !== descrizione ? osservazioni : null,
        escludi_da_grafico: false,
      };
    } else if (isPrelievo(concetto, movimento, osservazioni)) {
      // PRELIEVO PERSONALE
      table = 'prelievi';
      statsKey = 'prelievi';
      record = {
        user_id: USER_ID,
        data: dataISO,
        descrizione: descrizione,
        importo: importoAbs,
        note: null,
      };
    } else {
      // USCITA
      table = 'uscite';
      statsKey = 'uscite';
      record = {
        user_id: USER_ID,
        data: dataISO,
        descrizione: descrizione,
        categoria: categoria,
        importo: importoAbs,
        note: osservazioni !== descrizione ? osservazioni : null,
        escludi_da_grafico: false,
      };
    }

    if (DRY_RUN) {
      console.log(`   [DRY-RUN] ${table}: ${dataISO} - ${descrizione} - €${importoAbs}`);
      stats[statsKey].imported++;
    } else {
      const { error } = await supabase.from(table).insert(record);
      if (error) {
        console.error(`   ❌ Errore ${table}:`, error.message);
        stats[statsKey].errors++;
      } else {
        stats[statsKey].imported++;
      }
    }
  }

  console.log(`   ✅ Entrate: ${stats.entrate.imported}`);
  console.log(`   ✅ Uscite: ${stats.uscite.imported}`);
  console.log(`   ✅ Prelievi: ${stats.prelievi.imported}`);
}

/**
 * Print summary
 */
function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 RIEPILOGO IMPORT');
  console.log('='.repeat(60));

  if (DRY_RUN) {
    console.log('⚠️  MODALITÀ DRY-RUN - Nessun dato scritto\n');
  }

  console.log(`Fatture:   ✅ ${stats.fatture.imported}  ⏭️ ${stats.fatture.skipped}  ❌ ${stats.fatture.errors}`);
  console.log(`Entrate:   ✅ ${stats.entrate.imported}  ⏭️ ${stats.entrate.skipped}  ❌ ${stats.entrate.errors}`);
  console.log(`Uscite:    ✅ ${stats.uscite.imported}  ⏭️ ${stats.uscite.skipped}  ❌ ${stats.uscite.errors}`);
  console.log(`Prelievi:  ✅ ${stats.prelievi.imported}  ⏭️ ${stats.prelievi.skipped}  ❌ ${stats.prelievi.errors}`);

  const total = stats.fatture.imported + stats.entrate.imported + stats.uscite.imported + stats.prelievi.imported;
  const errors = stats.fatture.errors + stats.entrate.errors + stats.uscite.errors + stats.prelievi.errors;

  console.log('\n' + '-'.repeat(60));
  console.log(`TOTALE: ${total} importati, ${errors} errori`);
  console.log('='.repeat(60) + '\n');
}

/**
 * Main
 */
async function main() {
  console.log('🚀 IMPORT DATI DA CSV\n');
  console.log(`User ID: ${USER_ID}`);
  console.log(`Dry Run: ${DRY_RUN ? 'SÌ' : 'NO'}`);

  await importFatture();
  await importMovimenti();
  printSummary();

  if (DRY_RUN) {
    console.log('💡 Rimuovi --dry-run per eseguire l\'import reale\n');
  }
}

main().catch(err => {
  console.error('❌ Errore fatale:', err);
  process.exit(1);
});
