/**
 * Script per resettare e reimportare movimenti
 * Elimina tutti i prelievi ed entrate esistenti e li reimporta
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

// ===== ENTRATE EXTRA (Interessi + Bonus) =====
const entrate = [
  // Interessi 2024
  { data: '2024-02-02', descrizione: 'Liquidazione interessi BBVA', categoria: 'Interessi', importo: 24.98 },
  { data: '2024-03-04', descrizione: 'Liquidazione interessi BBVA', categoria: 'Interessi', importo: 56.82 },
  { data: '2024-04-02', descrizione: 'Liquidazione interessi BBVA', categoria: 'Interessi', importo: 63.79 },
  { data: '2024-05-03', descrizione: 'Liquidazione interessi BBVA', categoria: 'Interessi', importo: 63.80 },
  { data: '2024-06-04', descrizione: 'Liquidazione interessi BBVA', categoria: 'Interessi', importo: 72.96 },
  { data: '2024-07-02', descrizione: 'Liquidazione interessi BBVA', categoria: 'Interessi', importo: 72.54 },
  { data: '2024-08-02', descrizione: 'Liquidazione interessi BBVA', categoria: 'Interessi', importo: 61.92 },
  { data: '2024-09-03', descrizione: 'Liquidazione interessi BBVA', categoria: 'Interessi', importo: 47.82 },
  { data: '2024-10-02', descrizione: 'Liquidazione interessi BBVA', categoria: 'Interessi', importo: 47.59 },
  { data: '2024-11-05', descrizione: 'Liquidazione interessi BBVA', categoria: 'Interessi', importo: 57.06 },
  { data: '2024-12-03', descrizione: 'Liquidazione interessi BBVA', categoria: 'Interessi', importo: 48.38 },

  // Interessi 2025
  { data: '2025-01-03', descrizione: 'Liquidazione interessi BBVA', categoria: 'Interessi', importo: 41.89 },
  { data: '2025-02-04', descrizione: 'Liquidazione interessi BBVA', categoria: 'Interessi', importo: 36.70 },
  { data: '2025-03-04', descrizione: 'Liquidazione interessi BBVA', categoria: 'Interessi', importo: 23.31 },
  { data: '2025-03-05', descrizione: 'Liquidazione interessi BBVA', categoria: 'Interessi', importo: 2.33 },
  { data: '2025-04-02', descrizione: 'Liquidazione interessi BBVA', categoria: 'Interessi', importo: 31.12 },
  { data: '2025-05-05', descrizione: 'Liquidazione interessi BBVA', categoria: 'Interessi', importo: 30.87 },
  { data: '2025-06-03', descrizione: 'Liquidazione interessi BBVA', categoria: 'Interessi', importo: 33.67 },
  { data: '2025-07-02', descrizione: 'Liquidazione interessi BBVA', categoria: 'Interessi', importo: 36.92 },
  { data: '2025-08-04', descrizione: 'Liquidazione interessi BBVA', categoria: 'Interessi', importo: 20.87 },
  { data: '2025-09-02', descrizione: 'Liquidazione interessi BBVA', categoria: 'Interessi', importo: 21.44 },
  { data: '2025-10-02', descrizione: 'Liquidazione interessi BBVA', categoria: 'Interessi', importo: 23.92 },
  { data: '2025-11-04', descrizione: 'Liquidazione interessi BBVA', categoria: 'Interessi', importo: 25.60 },
  { data: '2025-12-02', descrizione: 'Liquidazione interessi BBVA', categoria: 'Interessi', importo: 1.99 },
  { data: '2025-12-02', descrizione: 'Liquidazione interessi BBVA', categoria: 'Interessi', importo: 26.41 },

  // Bonus BBVA 2024
  { data: '2024-01-26', descrizione: 'Bonus passaparola BBVA', categoria: 'Bonus', importo: 20.00 },
  { data: '2024-02-22', descrizione: 'Bonus passaparola BBVA', categoria: 'Bonus', importo: 20.00 },
  { data: '2024-03-15', descrizione: 'Bonus codice invito BBVA', categoria: 'Bonus', importo: 10.00 },
  { data: '2024-03-18', descrizione: 'Bonus passaparola BBVA', categoria: 'Bonus', importo: 20.00 },
  { data: '2024-04-16', descrizione: 'Cashback BBVA', categoria: 'Bonus', importo: 42.80 },
  { data: '2024-04-24', descrizione: 'Bonus passaparola BBVA', categoria: 'Bonus', importo: 20.00 },
];

// ===== PRELIEVI (Stipendi) =====
const prelievi = [
  // 2024
  { data: '2024-02-16', descrizione: 'Stipendio febbraio', importo: 1000.00 },
  { data: '2024-02-23', descrizione: 'Stipendio febbraio (parziale)', importo: 150.00 },
  { data: '2024-03-05', descrizione: 'Stipendio marzo', importo: 150.00 },
  { data: '2024-03-08', descrizione: 'Stipendio marzo (parziale)', importo: 800.00 },
  { data: '2024-03-21', descrizione: 'Stipendio marzo (parziale)', importo: 800.00 },
  { data: '2024-04-02', descrizione: 'Stipendio aprile', importo: 1000.00 },
  { data: '2024-05-06', descrizione: 'Stipendio maggio', importo: 300.00 },
  { data: '2024-05-20', descrizione: 'Stipendio maggio', importo: 1000.00 },
  { data: '2024-07-01', descrizione: 'Stipendio luglio', importo: 1000.00 },
  { data: '2024-07-22', descrizione: 'Stipendio luglio (parziale)', importo: 1000.00 },
  { data: '2024-08-12', descrizione: 'Stipendio agosto', importo: 1000.00 },
  { data: '2024-09-02', descrizione: 'Stipendio settembre', importo: 1000.00 },
  { data: '2024-09-23', descrizione: 'Stipendio settembre', importo: 1000.00 },
  { data: '2024-10-24', descrizione: 'Stipendio ottobre', importo: 850.00 },
  { data: '2024-11-05', descrizione: 'Stipendio novembre', importo: 1000.00 },
  { data: '2024-11-05', descrizione: 'Stipendio novembre (2)', importo: 1000.00 },
  { data: '2024-12-10', descrizione: 'Stipendio dicembre', importo: 1000.00 },
  { data: '2024-12-23', descrizione: 'Stipendio dicembre', importo: 1000.00 },
  { data: '2024-12-23', descrizione: 'Stipendio dicembre (parziale)', importo: 500.00 },

  // 2025
  { data: '2025-01-14', descrizione: 'Stipendio gennaio', importo: 1000.00 },
  { data: '2025-01-14', descrizione: 'Stipendio gennaio (parziale)', importo: 400.00 },
  { data: '2025-02-10', descrizione: 'Stipendio febbraio', importo: 1000.00 },
  { data: '2025-02-10', descrizione: 'Stipendio febbraio (parziale)', importo: 800.00 },
  { data: '2025-03-03', descrizione: 'Stipendio marzo', importo: 1000.00 },
  { data: '2025-03-28', descrizione: 'Stipendio marzo', importo: 1000.00 },
  { data: '2025-04-07', descrizione: 'Stipendio aprile', importo: 1000.00 },
  { data: '2025-04-11', descrizione: 'Stipendio aprile', importo: 1000.00 },
  { data: '2025-04-28', descrizione: 'Stipendio aprile', importo: 1000.00 },
  { data: '2025-05-05', descrizione: 'Stipendio maggio (parziale)', importo: 20.00 },
  { data: '2025-05-15', descrizione: 'Stipendio maggio', importo: 700.00 },
  { data: '2025-06-05', descrizione: 'Stipendio giugno', importo: 1000.00 },
  { data: '2025-07-03', descrizione: 'Stipendio luglio', importo: 1000.00 },
  { data: '2025-07-03', descrizione: 'Stipendio luglio (parziale)', importo: 400.00 },
  { data: '2025-07-31', descrizione: 'Stipendio luglio', importo: 1000.00 },
  { data: '2025-07-31', descrizione: 'Stipendio luglio (parziale)', importo: 400.00 },
  { data: '2025-09-01', descrizione: 'Stipendio settembre', importo: 1000.00 },
  { data: '2025-09-18', descrizione: 'Stipendio settembre (parziale)', importo: 500.00 },
  { data: '2025-10-02', descrizione: 'Stipendio ottobre', importo: 1000.00 },
  { data: '2025-10-02', descrizione: 'Stipendio ottobre (saldo)', importo: 250.00 },
  { data: '2025-11-17', descrizione: 'Stipendio novembre', importo: 1000.00 },
  { data: '2025-12-01', descrizione: 'Stipendio novembre', importo: 1000.00 },
  { data: '2025-12-23', descrizione: 'Stipendio novembre', importo: 1000.00 },
  { data: '2025-12-23', descrizione: 'Stipendio gennaio 2026', importo: 500.00 },
];

async function resetAndImport() {
  console.log('🗑️  Eliminazione dati esistenti...\n');

  // Elimina tutti i prelievi
  const { error: deletePrelievi } = await supabase
    .from('prelievi')
    .delete()
    .eq('user_id', USER_ID);

  if (deletePrelievi) {
    console.error('❌ Errore eliminazione prelievi:', deletePrelievi.message);
  } else {
    console.log('✅ Prelievi eliminati');
  }

  // Elimina tutte le entrate
  const { error: deleteEntrate } = await supabase
    .from('entrate')
    .delete()
    .eq('user_id', USER_ID);

  if (deleteEntrate) {
    console.error('❌ Errore eliminazione entrate:', deleteEntrate.message);
  } else {
    console.log('✅ Entrate eliminate');
  }

  console.log('\n📥 Importazione nuovi dati...\n');

  // Import Entrate
  console.log('=== ENTRATE ===');
  const entrateData = entrate.map(e => ({
    user_id: USER_ID,
    data: e.data,
    descrizione: e.descrizione,
    categoria: e.categoria,
    importo: e.importo,
    note: 'Importato da estratto conto BBVA',
  }));

  const { error: insertEntrate } = await supabase
    .from('entrate')
    .insert(entrateData);

  if (insertEntrate) {
    console.error('❌ Errore inserimento entrate:', insertEntrate.message);
  } else {
    console.log(`✅ ${entrate.length} entrate importate`);
  }

  // Import Prelievi
  console.log('\n=== PRELIEVI ===');
  const prelieviData = prelievi.map(p => ({
    user_id: USER_ID,
    data: p.data,
    descrizione: p.descrizione,
    importo: p.importo,
    note: 'Importato da estratto conto BBVA',
  }));

  const { error: insertPrelievi } = await supabase
    .from('prelievi')
    .insert(prelieviData);

  if (insertPrelievi) {
    console.error('❌ Errore inserimento prelievi:', insertPrelievi.message);
  } else {
    console.log(`✅ ${prelievi.length} prelievi importati`);
  }

  // Riepilogo
  const totaleEntrate = entrate.reduce((sum, e) => sum + e.importo, 0);
  const totalePrelievi = prelievi.reduce((sum, p) => sum + p.importo, 0);

  console.log('\n========== RIEPILOGO ==========');
  console.log(`Entrate:  ${entrate.length} record - €${totaleEntrate.toFixed(2)}`);
  console.log(`Prelievi: ${prelievi.length} record - €${totalePrelievi.toFixed(2)}`);
}

resetAndImport();
