import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mrrzgtdsaezvuugmemxd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ycnpndGRzYWV6dnV1Z21lbXhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2MTMyNjIsImV4cCI6MjA4MjE4OTI2Mn0.YrA1ZLZWRuPyzstRe9w0bfi5u4obyv5NhA_yeuQ0XK8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Fatture 2024 estratte dai PDF
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
  // Fatture 11-19 da aggiungere (le leggeremo)
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

async function importFatture2024() {
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

  // Prepara i dati per l'inserimento
  const fattureToInsert = fatture2024.map(f => ({
    user_id: userId,
    data: f.data,
    cliente: f.cliente,
    descrizione: f.descrizione,
    importo_lordo: f.importo_lordo,
    note: null
  }));

  console.log(`Inserimento di ${fattureToInsert.length} fatture 2024...`);

  const { data: insertedData, error: insertError } = await supabase
    .from('fatture')
    .insert(fattureToInsert)
    .select();

  if (insertError) {
    console.error('Errore inserimento:', insertError.message);
    return;
  }

  console.log(`Inserite ${insertedData.length} fatture 2024 con successo!`);

  const totale = fatture2024.reduce((acc, f) => acc + f.importo_lordo, 0);
  console.log(`Totale fatturato 2024: €${totale.toFixed(2)}`);
}

importFatture2024();
