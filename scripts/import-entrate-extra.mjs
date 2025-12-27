/**
 * Script per importare entrate extra-fattura nel database Supabase
 *
 * Legge il file Excel, identifica le entrate che NON sono fatture
 * (escludendo quelle già matchate con fatture esistenti)
 * e le inserisce nella tabella `entrate` di Supabase
 */

import XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Carica .env
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

// ===== DATI FATTURE (per matching) =====

const fatture2024 = [
  { data: '2024-01-26', cliente: 'BELKA S.R.L.', descrizione: 'Consulenza progettazione Design System', importo_lordo: 4000.00 },
  { data: '2024-02-26', cliente: 'BELKA S.R.L.', descrizione: 'Design System Bonus x', importo_lordo: 3962.50 },
  { data: '2024-03-13', cliente: 'Plannix Inc', descrizione: 'Consulenza e tutoring', importo_lordo: 218.40 },
  { data: '2024-03-26', cliente: 'BELKA S.R.L.', descrizione: 'Consulenza Soundtrap e BonusX', importo_lordo: 3900.00 },
  { data: '2024-03-26', cliente: 'BILLDING S.R.L.', descrizione: 'Consulenza - Riunioni programmate e Design Operativo', importo_lordo: 1443.00 },
  { data: '2024-04-29', cliente: 'BELKA S.R.L.', descrizione: 'Consulenza per la progettazione di design system', importo_lordo: 4000.00 },
  { data: '2024-04-29', cliente: 'BILLDING S.R.L.', descrizione: 'Consulenza Design', importo_lordo: 145.60 },
  { data: '2024-05-16', cliente: 'Valentina Beauty Specialist', descrizione: 'Grafica biglietti da visita', importo_lordo: 52.00 },
  { data: '2024-05-25', cliente: 'BILLDING S.R.L.', descrizione: 'Consulenza design', importo_lordo: 72.80 },
  { data: '2024-05-31', cliente: 'BELKA S.R.L.', descrizione: 'Design System Docsity', importo_lordo: 4000.00 },
  { data: '2024-06-28', cliente: 'BELKA S.R.L.', descrizione: 'Design System NeN', importo_lordo: 4240.00 },
  { data: '2024-07-29', cliente: 'BELKA S.R.L.', descrizione: 'Consulenza Design System NeN', importo_lordo: 4240.00 },
  { data: '2024-08-28', cliente: 'BELKA S.R.L.', descrizione: 'Consulenza Design System', importo_lordo: 4240.00 },
  { data: '2024-09-27', cliente: 'BELKA S.R.L.', descrizione: 'Consulenza Design System NeN', importo_lordo: 4240.00 },
  { data: '2024-10-28', cliente: 'BELKA S.R.L.', descrizione: 'Consulenza Design System NeN', importo_lordo: 4240.00 },
  { data: '2024-11-28', cliente: 'BELKA S.R.L.', descrizione: 'Consulenza Design System NeN', importo_lordo: 4240.00 },
  { data: '2024-12-02', cliente: 'BELKA S.R.L.', descrizione: 'Consulenza Design System NeN + Rimborso', importo_lordo: 4297.67 },
  { data: '2024-12-16', cliente: 'BELKA S.R.L.', descrizione: 'Consulenza Design System NeN', importo_lordo: 4240.00 },
  { data: '2024-12-23', cliente: 'BELKA S.R.L.', descrizione: 'Consulenza Design System NeN - Dicembre', importo_lordo: 4240.00 },
];

const fatture2025 = [
  { data: '2025-01-20', cliente: 'BELKA S.R.L.', descrizione: 'Design System NeN, Formazione a Clienti + Rimborso Spese trasferta Milano', importo_lordo: 4297.67 },
  { data: '2025-02-28', cliente: 'BELKA S.R.L.', descrizione: 'Design System NeN, Formazione a Clienti, Formazione Poli Design + Rimborso Spese', importo_lordo: 4293.00 },
  { data: '2025-03-28', cliente: 'BELKA S.R.L.', descrizione: 'Design System NeN, Formazione a Clienti + Rimborso trasporti', importo_lordo: 4268.70 },
  { data: '2025-04-19', cliente: 'Calisti Gianni', descrizione: 'Consulenza progettazione Design pratiche sisma', importo_lordo: 2082.08 },
  { data: '2025-04-22', cliente: 'BELKA S.R.L.', descrizione: 'Consulenza Design System NeN, Segugio', importo_lordo: 4240.00 },
  { data: '2025-05-19', cliente: 'BELKA S.R.L.', descrizione: 'Consulenza Banca Sella, Design System NeN + Rimborso trasferte + Corso formazione media engine', importo_lordo: 4305.67 },
  { data: '2025-06-25', cliente: 'BELKA S.R.L.', descrizione: 'NeN Design System - Consulenza Banca Sella', importo_lordo: 4240.00 },
  { data: '2025-07-24', cliente: 'Elisa Cravero', descrizione: 'Mentoring Design', importo_lordo: 50.00 },
  { data: '2025-07-28', cliente: 'BELKA S.R.L.', descrizione: 'NeN - Progettazione Componenti e Documentazione', importo_lordo: 4240.00 },
  { data: '2025-07-31', cliente: 'Elisa Cravero', descrizione: 'Mentoring Design', importo_lordo: 50.00 },
  { data: '2025-08-07', cliente: 'Elisa Cravero', descrizione: 'Mentoring Design', importo_lordo: 50.00 },
  { data: '2025-08-12', cliente: 'Elisa Cravero', descrizione: 'Mentoring Design', importo_lordo: 50.00 },
  { data: '2025-08-29', cliente: 'BELKA S.R.L.', descrizione: 'Consulenza Design System', importo_lordo: 3744.00 },
  { data: '2025-09-01', cliente: 'MARKETING ARENA S.P.A.', descrizione: 'Consulenza oraria Design System e libreria componenti (10h)', importo_lordo: 603.20 },
  { data: '2025-09-22', cliente: 'IUBENDA S.R.L.', descrizione: 'Mockup User Interface: Footer e Widget .Hub', importo_lordo: 520.00 },
  { data: '2025-09-26', cliente: 'BELKA S.R.L.', descrizione: 'Documentazione NeN', importo_lordo: 3000.00 },
  { data: '2025-10-02', cliente: 'Elisa Cravero', descrizione: 'Mentoring Design', importo_lordo: 50.00 },
  { data: '2025-10-16', cliente: 'Elisa Cravero', descrizione: 'Mentoring Design', importo_lordo: 50.00 },
  { data: '2025-10-20', cliente: 'BELKA S.R.L.', descrizione: 'Pagamento anticipato 20% Refactor Foundation Mooney', importo_lordo: 4485.00 },
  { data: '2025-10-29', cliente: 'Bitcomet', descrizione: 'Consulenza Strategica Prodotto Digitale', importo_lordo: 676.00 },
  { data: '2025-10-29', cliente: 'BELKA S.R.L.', descrizione: 'Refactor Foundation Mooney - Acconto avvio progetto', importo_lordo: 400.00 },
  { data: '2025-11-13', cliente: 'Elisa Cravero', descrizione: 'Mentoring Design', importo_lordo: 50.00 },
  { data: '2025-11-24', cliente: 'BELKA S.R.L.', descrizione: 'Contratto Mooney: Servizi Novembre + Workshop Design System', importo_lordo: 5200.00 },
  { data: '2025-11-27', cliente: 'BELKA S.R.L.', descrizione: 'Acconto fornitura e documentazione 20 componenti NeN', importo_lordo: 1260.00 },
  { data: '2025-12-11', cliente: 'Elisa Cravero', descrizione: 'Mentoring Design', importo_lordo: 50.00 },
  { data: '2025-12-17', cliente: 'BELKA S.R.L.', descrizione: 'Contratto Mooney: Servizi Dicembre 2025', importo_lordo: 2000.00 },
  { data: '2025-12-17', cliente: 'Bitcomet', descrizione: 'Consulenza Strategica Prodotto Digitale', importo_lordo: 540.80 },
];

const TUTTE_FATTURE = [...fatture2024, ...fatture2025];

// ===== UTILITÀ =====

function convertDate(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;
  return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
}

function categorizzaEntrata(concetto, movimento, importo) {
  const desc = (concetto + ' ' + movimento).toLowerCase();

  // Interessi bancari
  if (desc.includes('liquidazione interessi') || desc.includes('interessi bbva')) {
    return 'Interessi';
  }

  // Bonus
  if (desc.includes('bonus') || desc.includes('cashback') || desc.includes('passaparola')) {
    return 'Bonus';
  }

  // Vendite personali (Vinted, privati)
  if (desc.includes('vinted') || desc.includes('vendita') || desc.includes('liska') || desc.includes('felpa')) {
    return 'Vendita';
  }

  // Rimborsi
  if (desc.includes('rimborso') || desc.includes('restituzione')) {
    return 'Rimborso';
  }

  // Giroconti
  if (desc.includes('giroconto')) {
    return 'Giroconto';
  }

  return 'Altro';
}

function isFattura(importo) {
  const tolleranza = 0.02;
  return TUTTE_FATTURE.some(f => Math.abs(f.importo_lordo - importo) < tolleranza);
}

// ===== MAIN =====

async function importEntrateExtra() {
  console.log('📥 IMPORT ENTRATE EXTRA-FATTURA IN SUPABASE\n');
  console.log('=' .repeat(80));

  // USER_ID (hardcoded come negli altri script)
  const USER_ID = '580d9a54-9a65-4b36-a2a5-480908b1ee38';

  // Carica Excel
  const excelPath = '/Users/mattia/Desktop/2025Y-12M-26D-19_28_54-Ultime transazioni.xlsx';
  console.log(`\n📂 Caricamento file: ${excelPath}`);

  const workbook = XLSX.readFile(excelPath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  console.log(`✅ File caricato: ${data.length} righe totali`);

  // Filtra transazioni valide
  const transazioni = data.slice(5).filter(row => row[1] && row[4]);
  const entratePositive = transazioni.filter(row => row[4] > 0);

  console.log(`✅ Transazioni valide: ${transazioni.length}`);
  console.log(`✅ Entrate positive: ${entratePositive.length}`);

  // Identifica entrate extra-fattura
  const entrateExtraFattura = [];

  for (const row of entratePositive) {
    const data = convertDate(row[1]);
    const concetto = row[2] || '';
    const movimento = row[3] || '';
    const importo = row[4];

    if (!isFattura(importo)) {
      const categoria = categorizzaEntrata(concetto, movimento, importo);
      entrateExtraFattura.push({
        data,
        descrizione: movimento || concetto,
        importo,
        categoria,
        concetto
      });
    }
  }

  console.log(`\n✅ Entrate extra-fattura identificate: ${entrateExtraFattura.length}`);

  // Conferma prima di procedere
  console.log('\n⚠️  Questo script:');
  console.log('   1. Eliminerà tutte le entrate esistenti per l\'utente');
  console.log(`   2. Inserirà ${entrateExtraFattura.length} nuove entrate extra-fattura`);
  console.log(`\n   User ID: ${USER_ID}\n`);

  // Elimina entrate esistenti
  console.log('🗑️  Eliminazione entrate esistenti...');
  const { error: deleteError } = await supabase
    .from('entrate')
    .delete()
    .eq('user_id', USER_ID);

  if (deleteError) {
    console.error('❌ Errore eliminazione:', deleteError.message);
    process.exit(1);
  }
  console.log('✅ Entrate esistenti eliminate');

  // Prepara dati per insert
  const entrateData = entrateExtraFattura.map(e => ({
    user_id: USER_ID,
    data: e.data,
    descrizione: e.descrizione,
    categoria: e.categoria,
    importo: e.importo,
    note: `Importato da Excel - ${e.concetto.substring(0, 100)}`,
  }));

  // Insert in batch (Supabase supporta max ~1000 record per volta)
  console.log(`\n📥 Inserimento ${entrateData.length} entrate...`);

  const { data: insertedData, error: insertError } = await supabase
    .from('entrate')
    .insert(entrateData)
    .select();

  if (insertError) {
    console.error('❌ Errore inserimento:', insertError.message);
    process.exit(1);
  }

  console.log(`✅ Inserite ${insertedData.length} entrate con successo!`);

  // Riepilogo per categoria
  console.log('\n📊 RIEPILOGO PER CATEGORIA\n');
  const perCategoria = {};
  for (const e of entrateExtraFattura) {
    perCategoria[e.categoria] = (perCategoria[e.categoria] || 0) + e.importo;
  }

  for (const [cat, tot] of Object.entries(perCategoria).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cat.padEnd(20)}: €${tot.toFixed(2)}`);
  }

  const totaleEntrate = entrateExtraFattura.reduce((sum, e) => sum + e.importo, 0);
  console.log(`\n  ${'TOTALE'.padEnd(20)}: €${totaleEntrate.toFixed(2)}`);

  console.log('\n' + '='.repeat(80));
  console.log('✅ Import completato!\n');
  console.log('🌐 Ora puoi visualizzare le entrate nella webapp (sezione Movimenti)\n');
}

// Esegui
importEntrateExtra().catch(err => {
  console.error('❌ Errore:', err.message);
  process.exit(1);
});
