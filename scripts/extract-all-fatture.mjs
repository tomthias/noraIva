/**
 * Script per estrarre dati da TUTTE le 46 fatture PDF
 * Legge i PDF e estrae: numero, data, cliente, descrizione, importo
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');
const pdfParse = PDFParse;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FATTURE_DIR = '/Users/mattia/Desktop/noraiva conti/Fatture-Mattia Marinangeli';

// Funzione per estrarre dati da una singola fattura
function extractFatturaData(text, filename) {
  // Estrai numero fattura dal filename (es: "Fattura-1-2024.pdf" → numero: 1, anno: 2024)
  const match = filename.match(/Fattura-(\d+)-(\d{4})\.pdf/);
  if (!match) return null;

  const numero = parseInt(match[1]);
  const anno = parseInt(match[2]);

  // Estrai data (formato: "# 1/2024  26/01/2024" oppure "Fattura 1/2024 26/01/2024")
  const dataMatch = text.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!dataMatch) {
    console.warn(`⚠️  Data non trovata in ${filename}`);
    return null;
  }

  const data = `${dataMatch[3]}-${dataMatch[2]}-${dataMatch[1]}`; // Converti in YYYY-MM-DD

  // Estrai destinatario/cliente (cerchiamo "BELKA S.R.L." o altri clienti)
  let cliente = 'Cliente non specificato';
  if (text.includes('BELKA S.R.L.')) {
    cliente = 'BELKA S.R.L.';
  } else if (text.includes('Elisa Cravero')) {
    cliente = 'Elisa Cravero';
  } else if (text.includes('BILLDING')) {
    cliente = 'BILLDING S.R.L.';
  } else if (text.includes('Plannix')) {
    cliente = 'Plannix Inc';
  } else if (text.includes('Calisti Gianni')) {
    cliente = 'Calisti Gianni';
  } else if (text.includes('IUBENDA')) {
    cliente = 'IUBENDA S.R.L.';
  } else if (text.includes('MARKETING ARENA')) {
    cliente = 'MARKETING ARENA S.P.A.';
  } else if (text.includes('Bitcomet')) {
    cliente = 'Bitcomet';
  } else if (text.includes('Valentina Beauty')) {
    cliente = 'Valentina Beauty Specialist';
  }

  // Estrai descrizione (linea prima del totale)
  let descrizione = 'Consulenza';
  const descMatch = text.match(/Descrizione\s+Importo\s+([^\n]+)/);
  if (descMatch) {
    descrizione = descMatch[1].trim().replace(/\s*[\d,.]+\s*€.*$/, '').trim();
  }

  // Estrai importo totale (cerchiamo "Totale: X,XX €")
  const totaleMatch = text.match(/Totale:\s*([\d.,]+)\s*€/);
  if (!totaleMatch) {
    console.warn(`⚠️  Importo non trovato in ${filename}`);
    return null;
  }

  const importoStr = totaleMatch[1].replace(/\./g, '').replace(',', '.');
  const importo = parseFloat(importoStr);

  return {
    numero: `${numero}/${anno}`,
    data,
    cliente,
    descrizione,
    importo_lordo: importo
  };
}

async function extractAllFatture() {
  console.log('\n📄 ESTRAZIONE DATI DA 46 FATTURE PDF');
  console.log('=====================================\n');

  const files = fs.readdirSync(FATTURE_DIR)
    .filter(f => f.endsWith('.pdf'))
    .sort((a, b) => {
      const [, numA, yearA] = a.match(/Fattura-(\d+)-(\d{4})\.pdf/) || [];
      const [, numB, yearB] = b.match(/Fattura-(\d+)-(\d{4})\.pdf/) || [];
      if (yearA !== yearB) return parseInt(yearA) - parseInt(yearB);
      return parseInt(numA) - parseInt(numB);
    });

  console.log(`Trovati ${files.length} file PDF\n`);

  const fatture2024 = [];
  const fatture2025 = [];
  let successi = 0;
  let errori = 0;

  for (const file of files) {
    const filePath = path.join(FATTURE_DIR, file);

    try {
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdfParse(dataBuffer);
      const text = pdfData.text;

      const fattura = extractFatturaData(text, file);

      if (fattura) {
        if (file.includes('2024')) {
          fatture2024.push(fattura);
        } else {
          fatture2025.push(fattura);
        }
        console.log(`✅ ${file}: ${fattura.data} - ${fattura.cliente} - €${fattura.importo_lordo.toFixed(2)}`);
        successi++;
      } else {
        console.error(`❌ ${file}: Dati non estratti`);
        errori++;
      }
    } catch (error) {
      console.error(`❌ ${file}: ${error.message}`);
      errori++;
    }
  }

  console.log('\n=====================================');
  console.log(`✅ Successi: ${successi}`);
  console.log(`❌ Errori: ${errori}`);
  console.log(`\nFatture 2024: ${fatture2024.length}`);
  console.log(`Fatture 2025: ${fatture2025.length}`);

  const totale2024 = fatture2024.reduce((sum, f) => sum + f.importo_lordo, 0);
  const totale2025 = fatture2025.reduce((sum, f) => sum + f.importo_lordo, 0);

  console.log(`\nTotale fatturato 2024: €${totale2024.toFixed(2)}`);
  console.log(`Totale fatturato 2025: €${totale2025.toFixed(2)}`);
  console.log(`Totale complessivo: €${(totale2024 + totale2025).toFixed(2)}\n`);

  // Salva i dati in un file JSON
  const output = {
    fatture2024,
    fatture2025,
    totale2024,
    totale2025,
    dataEstrazione: new Date().toISOString()
  };

  const outputPath = path.join(__dirname, 'fatture-extracted.json');
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`💾 Dati salvati in: ${outputPath}\n`);

  return output;
}

extractAllFatture();
