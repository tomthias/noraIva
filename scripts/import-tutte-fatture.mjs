/**
 * Script per importare TUTTE le 46 fatture reali
 * Dati estratti manualmente dai PDF con precisione contabile
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

// FATTURE 2024 - Estratte manualmente dai PDF (19 fatture)
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
  { data: '2024-06-28', cliente: 'BELKA S.R.L.', descrizione: 'Workshop Poli Design + Spese', importo_lordo: 4056.16 },
  { data: '2024-07-31', cliente: 'BELKA S.R.L.', descrizione: 'Design System Banca Sella', importo_lordo: 4000.00 },
  { data: '2024-09-02', cliente: 'BELKA S.R.L.', descrizione: 'Consulenza Design System NeN', importo_lordo: 4000.00 },
  { data: '2024-09-18', cliente: 'Atelier_1 Associazione Culturale', descrizione: 'Progettazione Brand Identity e Sito Web', importo_lordo: 1500.00 },
  { data: '2024-09-30', cliente: 'BELKA S.R.L.', descrizione: 'Consulenza Design System NeN', importo_lordo: 3650.00 },
  { data: '2024-10-24', cliente: 'BELKA S.R.L.', descrizione: 'Consulenza Design System NeN', importo_lordo: 4000.00 },
  { data: '2024-11-28', cliente: 'BELKA S.R.L.', descrizione: 'Consulenza Design System NeN + Rimborsi', importo_lordo: 4039.00 },
  { data: '2024-12-08', cliente: 'Valentina Beauty Specialist', descrizione: 'Grafica per Natale 2024', importo_lordo: 74.88 },
  { data: '2024-12-19', cliente: 'BELKA S.R.L.', descrizione: 'Consulenza Design System NeN', importo_lordo: 4000.00 }
];

// FATTURE 2025 - Estratte manualmente dai PDF (27 fatture)
const fatture2025 = [
  { data: '2025-01-20', cliente: 'BELKA S.R.L.', descrizione: 'Design System NeN, Formazione a Clienti + Rimborso Spese trasferta Milano', importo_lordo: 4297.67 },
  { data: '2025-02-28', cliente: 'BELKA S.R.L.', descrizione: 'Consulenza Design System NeN + Rimborsi', importo_lordo: 4293.00 },
  { data: '2025-03-28', cliente: 'BELKA S.R.L.', descrizione: 'Consulenza Design System NeN + Rimborsi', importo_lordo: 4268.70 },
  { data: '2025-04-19', cliente: 'Calisti Gianni', descrizione: 'Progettazione logo e brand identity', importo_lordo: 2082.08 },
  { data: '2025-04-22', cliente: 'BELKA S.R.L.', descrizione: 'Consulenza Design System NeN', importo_lordo: 4240.00 },
  { data: '2025-05-19', cliente: 'BELKA S.R.L.', descrizione: 'Consulenza Design System NeN + Rimborsi', importo_lordo: 4305.67 },
  { data: '2025-06-25', cliente: 'BELKA S.R.L.', descrizione: 'Consulenza Design System NeN', importo_lordo: 4240.00 },
  { data: '2025-07-24', cliente: 'Elisa Cravero', descrizione: 'Mentoring Design', importo_lordo: 50.00 },
  { data: '2025-07-28', cliente: 'BELKA S.R.L.', descrizione: 'Consulenza Design System NeN', importo_lordo: 4240.00 },
  { data: '2025-07-31', cliente: 'Elisa Cravero', descrizione: 'Mentoring Design', importo_lordo: 50.00 },
  { data: '2025-08-07', cliente: 'Elisa Cravero', descrizione: 'Mentoring Design', importo_lordo: 50.00 },
  { data: '2025-08-12', cliente: 'Elisa Cravero', descrizione: 'Mentoring Design', importo_lordo: 50.00 },
  { data: '2025-08-29', cliente: 'BELKA S.R.L.', descrizione: 'Consulenza Design System NeN', importo_lordo: 3744.00 },
  { data: '2025-09-01', cliente: 'MARKETING ARENA S.P.A.', descrizione: 'Consulenza Brand Identity e Visual Identity', importo_lordo: 603.20 },
  { data: '2025-09-22', cliente: 'IUBENDA S.R.L.', descrizione: 'Consulenza UX/UI Design', importo_lordo: 520.00 },
  { data: '2025-09-26', cliente: 'BELKA S.R.L.', descrizione: 'Design System NeN', importo_lordo: 3000.00 },
  { data: '2025-10-02', cliente: 'Elisa Cravero', descrizione: 'Mentoring Design', importo_lordo: 50.00 },
  { data: '2025-10-16', cliente: 'Elisa Cravero', descrizione: 'Mentoring Design', importo_lordo: 50.00 },
  { data: '2025-10-20', cliente: 'BELKA S.R.L.', descrizione: 'Pagamento anticipato 20% Refactor Foundation Mooney', importo_lordo: 4485.00 },
  { data: '2025-10-29', cliente: 'Bitcomet', descrizione: 'Consulenza Strategica Prodotto Digitale', importo_lordo: 676.00 },
  { data: '2025-10-29', cliente: 'BELKA S.R.L.', descrizione: 'Refactor Foundation Mooney acconto', importo_lordo: 400.00 },
  { data: '2025-11-13', cliente: 'Elisa Cravero', descrizione: 'Mentoring Design', importo_lordo: 50.00 },
  { data: '2025-11-24', cliente: 'BELKA S.R.L.', descrizione: 'Contratto di Collaborazione Mooney (3.200 + 2.000)', importo_lordo: 5200.00 },
  { data: '2025-11-27', cliente: 'BELKA S.R.L.', descrizione: 'Acconto componenti NeN', importo_lordo: 1260.00 },
  { data: '2025-12-11', cliente: 'Elisa Cravero', descrizione: 'Mentoring Design', importo_lordo: 50.00 },
  { data: '2025-12-17', cliente: 'BELKA S.R.L.', descrizione: 'Contratto di Collaborazione Mooney: Servizi professionali Dicembre 2025', importo_lordo: 2000.00 },
  { data: '2025-12-17', cliente: 'Bitcomet', descrizione: 'Consulenza Strategica Prodotto Digitale', importo_lordo: 540.80 }
];

async function importFatture() {
  console.log('\n💼 IMPORT FATTURE REALI');
  console.log('=====================================\n');
  console.log(`User ID: ${USER_ID}\n`);

  // Import Fatture 2024
  console.log('=== FATTURE 2024 ===');
  const fatture2024Data = fatture2024.map(f => ({
    user_id: USER_ID,
    data: f.data,
    cliente: f.cliente,
    descrizione: f.descrizione,
    importo_lordo: f.importo_lordo,
    note: 'Importata da PDF reale'
  }));

  const { error: error2024 } = await supabase
    .from('fatture')
    .insert(fatture2024Data);

  if (error2024) {
    console.error('❌ Errore import 2024:', error2024.message);
  } else {
    const totale2024 = fatture2024.reduce((sum, f) => sum + f.importo_lordo, 0);
    console.log(`✅ ${fatture2024.length} fatture 2024 importate`);
    console.log(`   Totale: €${totale2024.toFixed(2)}`);
  }

  // Import Fatture 2025
  console.log('\n=== FATTURE 2025 ===');
  const fatture2025Data = fatture2025.map(f => ({
    user_id: USER_ID,
    data: f.data,
    cliente: f.cliente,
    descrizione: f.descrizione,
    importo_lordo: f.importo_lordo,
    note: 'Importata da PDF reale'
  }));

  const { error: error2025 } = await supabase
    .from('fatture')
    .insert(fatture2025Data);

  if (error2025) {
    console.error('❌ Errore import 2025:', error2025.message);
  } else {
    const totale2025 = fatture2025.reduce((sum, f) => sum + f.importo_lordo, 0);
    console.log(`✅ ${fatture2025.length} fatture 2025 importate`);
    console.log(`   Totale: €${totale2025.toFixed(2)}`);
  }

  const totaleComplessivo = [...fatture2024, ...fatture2025].reduce((sum, f) => sum + f.importo_lordo, 0);
  console.log('\n=====================================');
  console.log(`✅ TOTALE FATTURE: ${fatture2024.length + fatture2025.length}`);
  console.log(`✅ FATTURATO TOTALE: €${totaleComplessivo.toFixed(2)}\n`);
}

importFatture();
