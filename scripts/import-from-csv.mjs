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
  if (match) env[match[1].trim()] = match[2].trim();
});

const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_KEY;
const USER_ID = '580d9a54-9a65-4b36-a2a5-480908b1ee38';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Mancano variabili SUPABASE');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// IMPORTI FATTURE (per riconoscerle nelle entrate)
const importiFatture = new Set([
  4000.00, 3962.50, 218.40, 3900.00, 1443.00, 145.60, 52.00, 72.80,
  4056.16, 3650.00, 4039.00, 74.88, 4297.67, 4293.00, 4268.70, 2082.08,
  4240.00, 4305.67, 50.00, 3744.00, 603.20, 520.00, 3000.00, 4485.00,
  676.00, 400.00, 5200.00, 1260.00, 2000.00, 540.80, 1500.00
]);

// Leggi CSV
const csvContent = readFileSync('/Users/mattia/Downloads/movimenti.csv', 'utf-8');
const lines = csvContent.split('\n').slice(1);

console.log('📊 IMPORT SEMPLICE DA CSV');
console.log('='.repeat(60));

const entrate = [];
const uscite = [];
const prelievi = [];

for (const line of lines) {
  if (!line.trim()) continue;

  const parts = line.split(',');
  if (parts.length < 5) continue;

  const data = parts[1]?.replace(/"/g, '').trim();
  const movimento = parts[3]?.replace(/"/g, '').trim();
  const concetto = parts[2]?.replace(/"/g, '').trim();
  const importo = parseFloat(parts[4]?.replace(/"/g, '').trim());

  if (!data || isNaN(importo) || importo === 0) continue;

  const [day, month, year] = data.split('/');
  const dataISO = `${year}-${month}-${day}`;
  const descrizione = movimento || concetto;

  if (importo > 0) {
    // ENTRATA
    let categoria = 'Altro';

    // Se importo corrisponde a una fattura, marca come "Fattura"
    if (importiFatture.has(importo)) {
      categoria = 'Fattura';
    } else if (descrizione.includes('interessi') || descrizione.includes('ACCREDITO')) {
      categoria = 'Interessi';
    } else if (descrizione.includes('Bonus') || descrizione.includes('Cashback')) {
      categoria = 'Bonus';
    } else if (descrizione.includes('Rimborso')) {
      categoria = 'Rimborso';
    }

    entrate.push({ data: dataISO, descrizione, categoria, importo });
  } else {
    // USCITA (negativa)
    const importoAbs = Math.abs(importo);

    // PRELIEVI = Stipendi personali
    if (descrizione.includes('Stipendio') || descrizione.includes('stipendio') ||
        descrizione.includes('Mattia marinangeli') || descrizione.includes('MATTIA MARINANGELI')) {
      prelievi.push({ data: dataISO, descrizione, importo: importoAbs });
    } else {
      // Tutte le altre uscite
      let categoria = 'Altro';
      if (descrizione.includes('Tasse') || descrizione.includes('TASSE') ||
          descrizione.includes('Imposta di bollo')) {
        categoria = 'Tasse';
      } else if (descrizione.includes('Fiscozen') || descrizione.includes('Software')) {
        categoria = 'Servizi';
      } else if (descrizione.includes('Dovevivo') || descrizione.includes('DOVEVIVO')) {
        categoria = 'Affitto';
      }

      uscite.push({ data: dataISO, descrizione, categoria, importo: importoAbs });
    }
  }
}

console.log('\n📋 RIEPILOGO:');
console.log(`Entrate (non-fatture): ${entrate.length} → €${entrate.reduce((s, e) => s + e.importo, 0).toFixed(2)}`);
console.log(`Uscite:                ${uscite.length} → €${uscite.reduce((s, u) => s + u.importo, 0).toFixed(2)}`);
console.log(`Prelievi:              ${prelievi.length} → €${prelievi.reduce((s, p) => s + p.importo, 0).toFixed(2)}`);

// IMPORT
console.log('\n🚀 IMPORTAZIONE...\n');

for (const entrata of entrate) {
  await supabase.from('entrate').insert({
    user_id: USER_ID,
    data: entrata.data,
    descrizione: entrata.descrizione,
    categoria: entrata.categoria,
    importo: entrata.importo,
  });
}
console.log(`✅ ${entrate.length} entrate`);

for (const uscita of uscite) {
  await supabase.from('uscite').insert({
    user_id: USER_ID,
    data: uscita.data,
    descrizione: uscita.descrizione,
    categoria: uscita.categoria,
    importo: uscita.importo,
  });
}
console.log(`✅ ${uscite.length} uscite`);

for (const prelievo of prelievi) {
  await supabase.from('prelievi').insert({
    user_id: USER_ID,
    data: prelievo.data,
    descrizione: prelievo.descrizione,
    importo: prelievo.importo,
  });
}
console.log(`✅ ${prelievi.length} prelievi`);

console.log('\n✅ COMPLETATO!');
