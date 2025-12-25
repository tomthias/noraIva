import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mrrzgtdsaezvuugmemxd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ycnpndGRzYWV6dnV1Z21lbXhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2MTMyNjIsImV4cCI6MjA4MjE4OTI2Mn0.YrA1ZLZWRuPyzstRe9w0bfi5u4obyv5NhA_yeuQ0XK8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Transazioni estratte dall'Excel - solo 2024 e 2025
// Filtreremo per tipo: prelievi (stipendi) vs uscite (spese professionali)

// PRELIEVI (stipendi personali - bonifici a te stesso)
const prelievi = [
  // 2025
  { data: '2025-12-23', descrizione: 'Stipendio gennaio 2026', importo: 500 },
  { data: '2025-12-23', descrizione: 'Stipendio novembre', importo: 1000 },
  { data: '2025-11-30', descrizione: 'Stipendio novembre', importo: 1000 },
  { data: '2025-11-15', descrizione: 'Stipendio novembre', importo: 1000 },
  { data: '2025-10-02', descrizione: 'Stipendio ottobre', importo: 1000 },
  { data: '2025-10-02', descrizione: 'Saldo stipendio ottobre', importo: 250 },
  { data: '2025-09-18', descrizione: 'Stipendio settembre', importo: 500 },
  { data: '2025-09-01', descrizione: 'Stipendio settembre', importo: 1000 },
  { data: '2025-07-31', descrizione: 'Stipendio luglio', importo: 1000 },
  { data: '2025-07-31', descrizione: 'Stipendio luglio', importo: 400 },
  { data: '2025-07-03', descrizione: 'Stipendio luglio', importo: 400 },
  { data: '2025-07-03', descrizione: 'Stipendio luglio', importo: 1000 },
  { data: '2025-06-05', descrizione: 'Stipendio giugno', importo: 1000 },
  { data: '2025-05-15', descrizione: 'Stipendio maggio', importo: 700 },
  { data: '2025-04-28', descrizione: 'Stipendio aprile', importo: 1000 },
  { data: '2025-04-11', descrizione: 'Stipendio aprile', importo: 1000 },
  { data: '2025-04-05', descrizione: 'Stipendio aprile', importo: 1000 },
  { data: '2025-03-28', descrizione: 'Stipendio marzo', importo: 1000 },
  { data: '2025-03-01', descrizione: 'Stipendio marzo', importo: 1000 },
  { data: '2025-02-10', descrizione: 'Stipendio febbraio', importo: 800 },
  { data: '2025-02-10', descrizione: 'Stipendio febbraio', importo: 1000 },
  { data: '2025-01-14', descrizione: 'Stipendio gennaio', importo: 400 },
  { data: '2025-01-14', descrizione: 'Stipendio gennaio', importo: 1000 },
  // 2024
  { data: '2024-12-23', descrizione: 'Stipendio dicembre', importo: 1000 },
  { data: '2024-12-21', descrizione: 'Stipendio dicembre', importo: 500 },
  { data: '2024-12-10', descrizione: 'Stipendio dicembre', importo: 1000 },
  { data: '2024-11-05', descrizione: 'Stipendio novembre', importo: 1000 },
  { data: '2024-11-05', descrizione: 'Stipendio novembre', importo: 1000 },
  { data: '2024-10-24', descrizione: 'Stipendio ottobre', importo: 850 },
  { data: '2024-09-21', descrizione: 'Stipendio settembre', importo: 1000 },
  { data: '2024-09-02', descrizione: 'Stipendio settembre', importo: 1000 },
  { data: '2024-08-10', descrizione: 'Stipendio agosto', importo: 1000 },
  { data: '2024-07-20', descrizione: 'Stipendio luglio', importo: 1000 },
];

// USCITE PROFESSIONALI (spese deducibili o legate all'attività)
const uscite = [
  // 2025 - Spese professionali
  { data: '2025-12-10', descrizione: 'Affitto coworking DoveVivo', importo: 565, categoria: 'Affitto' },
  { data: '2025-12-04', descrizione: 'Impact Hub coworking', importo: 158.60, categoria: 'Affitto' },
  { data: '2025-11-05', descrizione: 'Affitto coworking DoveVivo', importo: 565, categoria: 'Affitto' },
  { data: '2025-11-03', descrizione: 'Claude Code - AI subscription', importo: 120, categoria: 'Software' },
  { data: '2025-10-05', descrizione: 'Affitto coworking DoveVivo', importo: 565, categoria: 'Affitto' },
  { data: '2025-10-07', descrizione: 'Investimenti pensione', importo: 400, categoria: 'Investimenti' },
  { data: '2025-09-05', descrizione: 'Affitto coworking DoveVivo', importo: 565, categoria: 'Affitto' },
  { data: '2025-08-05', descrizione: 'Affitto coworking DoveVivo', importo: 565, categoria: 'Affitto' },
  { data: '2025-07-10', descrizione: 'Tasse F24', importo: 6357.54, categoria: 'Tasse' },
  { data: '2025-07-07', descrizione: 'Investimenti Moneyfarm', importo: 400, categoria: 'Investimenti' },
  { data: '2025-07-07', descrizione: 'Investimenti', importo: 400, categoria: 'Investimenti' },
  { data: '2025-07-05', descrizione: 'Affitto coworking DoveVivo', importo: 565, categoria: 'Affitto' },
  { data: '2025-06-23', descrizione: 'Fiscozen abbonamento commercialista', importo: 499, categoria: 'Commercialista' },
  { data: '2025-06-05', descrizione: 'Investimenti', importo: 400, categoria: 'Investimenti' },
  { data: '2025-06-04', descrizione: 'Assicurazione auto Prima', importo: 386.69, categoria: 'Assicurazione' },
  { data: '2025-06-03', descrizione: 'Affitto coworking DoveVivo', importo: 565, categoria: 'Affitto' },
  { data: '2025-05-05', descrizione: 'Investimenti', importo: 400, categoria: 'Investimenti' },
  { data: '2025-04-28', descrizione: 'Affitto Joivy', importo: 565, categoria: 'Affitto' },
  { data: '2025-04-09', descrizione: 'Affitto coworking DoveVivo', importo: 565, categoria: 'Affitto' },
  { data: '2025-04-07', descrizione: 'Investimenti', importo: 400, categoria: 'Investimenti' },
  { data: '2025-04-06', descrizione: 'Risparmi e investimenti', importo: 500, categoria: 'Investimenti' },
  { data: '2025-03-05', descrizione: 'Investimenti', importo: 400, categoria: 'Investimenti' },
  { data: '2025-03-01', descrizione: 'Affitto coworking DoveVivo', importo: 565, categoria: 'Affitto' },
  { data: '2025-01-30', descrizione: 'Affitto coworking DoveVivo', importo: 516.77, categoria: 'Affitto' },
  { data: '2025-01-15', descrizione: 'Investimenti Moneyfarm', importo: 400, categoria: 'Investimenti' },
  { data: '2025-01-07', descrizione: 'Tasse F24', importo: 803.50, categoria: 'Tasse' },
  { data: '2025-01-02', descrizione: 'Software services', importo: 420, categoria: 'Software' },
  { data: '2025-12-01', descrizione: 'Tasse F24', importo: 4794.54, categoria: 'Tasse' },
  { data: '2025-11-15', descrizione: 'Investimenti Moneyfarm', importo: 250, categoria: 'Investimenti' },
  // 2024
  { data: '2024-12-30', descrizione: 'Caparra ski touring Georgia', importo: 700, categoria: 'Viaggi' },
  { data: '2024-12-10', descrizione: 'Affitto DoveVivo', importo: 1420, categoria: 'Affitto' },
  { data: '2024-12-02', descrizione: 'Tasse', importo: 1000, categoria: 'Tasse' },
  { data: '2024-12-02', descrizione: 'Tasse', importo: 1000, categoria: 'Tasse' },
  { data: '2024-12-02', descrizione: 'Tasse', importo: 1000, categoria: 'Tasse' },
  { data: '2024-11-29', descrizione: 'Software services', importo: 420, categoria: 'Software' },
  { data: '2024-11-05', descrizione: 'Spese di casa', importo: 2100, categoria: 'Casa' },
  { data: '2024-11-04', descrizione: 'Commercialista', importo: 2705, categoria: 'Commercialista' },
  { data: '2024-10-28', descrizione: 'Software services', importo: 419, categoria: 'Software' },
  { data: '2024-10-24', descrizione: 'Risparmi ed investimenti', importo: 100, categoria: 'Investimenti' },
  { data: '2024-09-30', descrizione: 'Software services', importo: 420, categoria: 'Software' },
  { data: '2024-09-02', descrizione: 'Affitto DoveVivo', importo: 500, categoria: 'Affitto' },
  { data: '2024-08-05', descrizione: 'Software services', importo: 1260, categoria: 'Software' },
];

async function importTransazioni() {
  console.log('Login in corso...');

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'mattia.marinangeli@gmail.com',
    password: 'Ver0n1ca'
  });

  if (authError) {
    console.error('Errore login:', authError.message);
    return;
  }

  const userId = authData.user.id;
  console.log('Login riuscito! User ID:', userId);

  // Import prelievi
  const prelieviToInsert = prelievi.map(p => ({
    user_id: userId,
    data: p.data,
    descrizione: p.descrizione,
    importo: p.importo,
    note: null
  }));

  console.log(`\nInserimento di ${prelieviToInsert.length} prelievi...`);

  const { data: insertedPrelievi, error: prelieviError } = await supabase
    .from('prelievi')
    .insert(prelieviToInsert)
    .select();

  if (prelieviError) {
    console.error('Errore inserimento prelievi:', prelieviError.message);
  } else {
    console.log(`Inseriti ${insertedPrelievi.length} prelievi!`);
    const totalePrelievi = prelievi.reduce((acc, p) => acc + p.importo, 0);
    console.log(`Totale prelievi: €${totalePrelievi.toFixed(2)}`);
  }

  // Import uscite
  const usciteToInsert = uscite.map(u => ({
    user_id: userId,
    data: u.data,
    descrizione: u.descrizione,
    categoria: u.categoria,
    importo: u.importo,
    note: null
  }));

  console.log(`\nInserimento di ${usciteToInsert.length} uscite...`);

  const { data: insertedUscite, error: usciteError } = await supabase
    .from('uscite')
    .insert(usciteToInsert)
    .select();

  if (usciteError) {
    console.error('Errore inserimento uscite:', usciteError.message);
  } else {
    console.log(`Inserite ${insertedUscite.length} uscite!`);
    const totaleUscite = uscite.reduce((acc, u) => acc + u.importo, 0);
    console.log(`Totale uscite: €${totaleUscite.toFixed(2)}`);
  }

  console.log('\n--- RIEPILOGO ---');
  const totalePrelievi = prelievi.reduce((acc, p) => acc + p.importo, 0);
  const totaleUscite = uscite.reduce((acc, u) => acc + u.importo, 0);
  console.log(`Totale prelievi (stipendi): €${totalePrelievi.toFixed(2)}`);
  console.log(`Totale uscite professionali: €${totaleUscite.toFixed(2)}`);
}

importTransazioni();
