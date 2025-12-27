/**
 * Script per importare movimenti dal PDF BBVA
 * - Entrate: Interessi BBVA + Bonus passaparola/cashback
 * - Prelievi: Stipendi (Mattia marinangeli)
 *
 * Esegui con: node scripts/import-movimenti.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Carica .env manualmente dalla root del progetto
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env');
const envContent = readFileSync(envPath, 'utf-8');

// Parse semplice del file .env
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim();
  }
});

const SUPABASE_URL = env.VITE_SUPABASE_URL;
// Per import bulk, usa SUPABASE_SERVICE_KEY (service role) da .env o passala come variabile
const SUPABASE_KEY = env.SUPABASE_SERVICE_KEY || env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Credenziali Supabase mancanti nel file .env');
  console.error('   Per import bulk, aggiungi SUPABASE_SERVICE_KEY al .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

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

// ===== USCITE (TASSE) =====
const uscite = [
  // TASSE PRINCIPALI
  { data: '2024-12-02', descrizione: 'Tasse dicembre 2024', categoria: 'Tasse', importo: 1000.00 },
  { data: '2024-12-02', descrizione: 'Tasse dicembre 2024 (2)', categoria: 'Tasse', importo: 1000.00 },
  { data: '2024-12-02', descrizione: 'Tasse dicembre 2024 (3)', categoria: 'Tasse', importo: 1000.00 },
  { data: '2025-01-07', descrizione: 'Tasse gennaio 2025', categoria: 'Tasse', importo: 803.50 },
  { data: '2025-07-10', descrizione: 'Tasse luglio 2025', categoria: 'Tasse', importo: 6357.54 },
  { data: '2025-12-01', descrizione: 'Tasse dicembre 2025', categoria: 'Tasse', importo: 4794.54 },

  // IMPOSTA DI BOLLO
  { data: '2024-03-28', descrizione: 'Imposta di bollo trim 01-01/31-03', categoria: 'Tasse', importo: 7.40 },
  { data: '2024-06-28', descrizione: 'Imposta di bollo trim 01-04/30-06', categoria: 'Tasse', importo: 8.55 },
  { data: '2024-09-30', descrizione: 'Imposta di bollo trim 01-07/30-09', categoria: 'Tasse', importo: 8.55 },
  { data: '2025-01-03', descrizione: 'Imposta di bollo trim 01-10/31-12', categoria: 'Tasse', importo: 8.55 },
  { data: '2025-04-03', descrizione: 'Imposta di bollo trim 01-01/31-03', categoria: 'Tasse', importo: 8.55 },
  { data: '2025-07-02', descrizione: 'Imposta di bollo trim 01-04/30-06', categoria: 'Tasse', importo: 8.55 },
  { data: '2025-10-02', descrizione: 'Imposta di bollo trim 01-07/30-09', categoria: 'Tasse', importo: 8.55 },
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

// Funzione principale
async function importMovimenti() {
  console.log('🔄 Connessione a Supabase...\n');

  // Devi inserire il tuo user_id qui (puoi prenderlo dalla tabella auth.users su Supabase)
  // oppure lo script lo chiederà
  const USER_ID = process.argv[2];

  if (!USER_ID) {
    console.log('❌ Uso: node scripts/import-movimenti.mjs <USER_ID>');
    console.log('\nPer trovare il tuo USER_ID:');
    console.log('1. Vai su Supabase Dashboard');
    console.log('2. Authentication > Users');
    console.log('3. Copia il UUID del tuo utente\n');

    // Mostra preview dei dati
    showPreview();
    return;
  }

  console.log(`📥 Importazione per utente: ${USER_ID}\n`);

  // Import Entrate
  console.log('=== ENTRATE ===');
  let entrateSuccessi = 0;
  let entrateErrori = 0;

  for (const entrata of entrate) {
    const { error } = await supabase
      .from('entrate')
      .insert({
        user_id: USER_ID,
        data: entrata.data,
        descrizione: entrata.descrizione,
        categoria: entrata.categoria,
        importo: entrata.importo,
        note: 'Importato da estratto conto BBVA',
      });

    if (error) {
      console.error(`❌ ${entrata.data} ${entrata.descrizione}: ${error.message}`);
      entrateErrori++;
    } else {
      console.log(`✅ ${entrata.data} ${entrata.descrizione} €${entrata.importo}`);
      entrateSuccessi++;
    }
  }

  // Import Uscite (Tasse)
  console.log('\n=== USCITE (TASSE) ===');
  let usciteSuccessi = 0;
  let usciteErrori = 0;

  for (const uscita of uscite) {
    const { error } = await supabase
      .from('uscite')
      .insert({
        user_id: USER_ID,
        data: uscita.data,
        descrizione: uscita.descrizione,
        categoria: uscita.categoria,
        importo: uscita.importo,
        note: 'Importato da estratto conto BBVA',
      });

    if (error) {
      console.error(`❌ ${uscita.data} ${uscita.descrizione}: ${error.message}`);
      usciteErrori++;
    } else {
      console.log(`✅ ${uscita.data} ${uscita.descrizione} €${uscita.importo}`);
      usciteSuccessi++;
    }
  }

  // Import Prelievi
  console.log('\n=== PRELIEVI ===');
  let prelieviSuccessi = 0;
  let prelieviErrori = 0;

  for (const prelievo of prelievi) {
    const { error } = await supabase
      .from('prelievi')
      .insert({
        user_id: USER_ID,
        data: prelievo.data,
        descrizione: prelievo.descrizione,
        importo: prelievo.importo,
        note: 'Importato da estratto conto BBVA',
      });

    if (error) {
      console.error(`❌ ${prelievo.data} ${prelievo.descrizione}: ${error.message}`);
      prelieviErrori++;
    } else {
      console.log(`✅ ${prelievo.data} ${prelievo.descrizione} €${prelievo.importo}`);
      prelieviSuccessi++;
    }
  }

  // Riepilogo
  console.log('\n========== RIEPILOGO ==========');
  console.log(`Entrate:  ${entrateSuccessi} importate, ${entrateErrori} errori`);
  console.log(`Uscite:   ${usciteSuccessi} importate, ${usciteErrori} errori`);
  console.log(`Prelievi: ${prelieviSuccessi} importati, ${prelieviErrori} errori`);

  const totaleEntrate = entrate.reduce((sum, e) => sum + e.importo, 0);
  const totaleUscite = uscite.reduce((sum, u) => sum + u.importo, 0);
  const totalePrelievi = prelievi.reduce((sum, p) => sum + p.importo, 0);
  console.log(`\nTotale entrate:  €${totaleEntrate.toFixed(2)}`);
  console.log(`Totale uscite:   €${totaleUscite.toFixed(2)}`);
  console.log(`Totale prelievi: €${totalePrelievi.toFixed(2)}`);
}

function showPreview() {
  console.log('========== PREVIEW DATI ==========\n');

  console.log('--- ENTRATE ---');
  let totaleEntrate = 0;
  const entratePerCategoria = {};
  entrate.forEach((e, i) => {
    console.log(`${String(i + 1).padStart(2)}. ${e.data} | ${e.descrizione.padEnd(30)} | €${e.importo.toFixed(2).padStart(6)} | ${e.categoria}`);
    totaleEntrate += e.importo;
    entratePerCategoria[e.categoria] = (entratePerCategoria[e.categoria] || 0) + e.importo;
  });
  console.log(`\nTotale: €${totaleEntrate.toFixed(2)}`);
  console.log('Per categoria:');
  Object.entries(entratePerCategoria).forEach(([cat, tot]) => {
    console.log(`  ${cat}: €${tot.toFixed(2)}`);
  });

  console.log('\n--- PRELIEVI ---');
  let totalePrelievi = 0;
  const prelieviPerAnno = { 2024: 0, 2025: 0 };
  prelievi.forEach((p, i) => {
    console.log(`${String(i + 1).padStart(2)}. ${p.data} | ${p.descrizione.padEnd(30)} | €${p.importo.toFixed(2).padStart(7)}`);
    totalePrelievi += p.importo;
    const anno = p.data.substring(0, 4);
    prelieviPerAnno[anno] = (prelieviPerAnno[anno] || 0) + p.importo;
  });
  console.log(`\nTotale: €${totalePrelievi.toFixed(2)}`);
  console.log('Per anno:');
  Object.entries(prelieviPerAnno).forEach(([anno, tot]) => {
    console.log(`  ${anno}: €${tot.toFixed(2)}`);
  });

  console.log('\n========== FINE PREVIEW ==========');
}

// Esegui
importMovimenti();
