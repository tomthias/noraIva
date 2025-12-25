import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mrrzgtdsaezvuugmemxd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ycnpndGRzYWV6dnV1Z21lbXhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2MTMyNjIsImV4cCI6MjA4MjE4OTI2Mn0.YrA1ZLZWRuPyzstRe9w0bfi5u4obyv5NhA_yeuQ0XK8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Dati estratti dalle 27 fatture 2025
const fatture = [
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

async function importFatture() {
  console.log('Login in corso...');

  // Login con le credenziali
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

  // Verifica se ci sono già fatture
  const { data: existingFatture, error: fetchError } = await supabase
    .from('fatture')
    .select('id')
    .eq('user_id', userId);

  if (fetchError) {
    console.error('Errore fetch fatture esistenti:', fetchError.message);
    return;
  }

  if (existingFatture && existingFatture.length > 0) {
    console.log(`Ci sono già ${existingFatture.length} fatture nel database. Vuoi continuare? (le nuove verranno aggiunte)`);
  }

  // Prepara i dati per l'inserimento
  const fattureToInsert = fatture.map(f => ({
    user_id: userId,
    data: f.data,
    cliente: f.cliente,
    descrizione: f.descrizione,
    importo_lordo: f.importo_lordo,
    note: null
  }));

  console.log(`Inserimento di ${fattureToInsert.length} fatture...`);

  // Inserisci le fatture
  const { data: insertedData, error: insertError } = await supabase
    .from('fatture')
    .insert(fattureToInsert)
    .select();

  if (insertError) {
    console.error('Errore inserimento:', insertError.message);
    return;
  }

  console.log(`Inserite ${insertedData.length} fatture con successo!`);

  // Calcola il totale
  const totale = fatture.reduce((acc, f) => acc + f.importo_lordo, 0);
  console.log(`Totale fatturato 2025: €${totale.toFixed(2)}`);
}

importFatture();
