import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mrrzgtdsaezvuugmemxd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ycnpndGRzYWV6dnV1Z21lbXhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2MTMyNjIsImV4cCI6MjA4MjE4OTI2Mn0.YrA1ZLZWRuPyzstRe9w0bfi5u4obyv5NhA_yeuQ0XK8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Tasse corrette da Fiscozen (screenshot)
const tasseCorrette = [
  { data: '2025-12-01', descrizione: 'Imposta di bollo fatture elettroniche Q1-Q3 2025', importo: 24.00, categoria: 'Tasse' },
  { data: '2025-12-01', descrizione: 'Acconto seconda rata imposta sostitutiva + INPS', importo: 4770.54, categoria: 'Tasse' },
  { data: '2025-07-21', descrizione: 'Acconto prima rata + Saldo imposta sostitutiva + INPS + IRPEF', importo: 6357.54, categoria: 'Tasse' },
  { data: '2025-01-16', descrizione: 'Acconto seconda rata imposta sostitutiva 2024', importo: 803.50, categoria: 'Tasse' },
  { data: '2024-12-02', descrizione: 'Acconto seconda rata contributi INPS', importo: 4202.80, categoria: 'Tasse' },
  { data: '2024-07-31', descrizione: 'Acconto INPS + Imposta sostitutiva + Addizionali IRPEF', importo: 12668.30, categoria: 'Tasse' },
  { data: '2024-06-17', descrizione: 'IVA mensile Maggio 2024', importo: 92.40, categoria: 'Tasse' },
  { data: '2024-01-16', descrizione: 'Acconto seconda rata imposta sostitutiva', importo: 432.00, categoria: 'Tasse' },
];

async function fixTasse() {
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

  // Prima elimino le tasse vecchie (quelle con categoria 'Tasse')
  console.log('\nEliminazione tasse vecchie...');
  const { error: deleteError } = await supabase
    .from('uscite')
    .delete()
    .eq('user_id', userId)
    .eq('categoria', 'Tasse');

  if (deleteError) {
    console.error('Errore eliminazione:', deleteError.message);
  } else {
    console.log('Tasse vecchie eliminate');
  }

  // Inserisco le tasse corrette da Fiscozen
  const tasseToInsert = tasseCorrette.map(t => ({
    user_id: userId,
    data: t.data,
    descrizione: t.descrizione,
    categoria: t.categoria,
    importo: t.importo,
    note: 'Da Fiscozen'
  }));

  console.log(`\nInserimento di ${tasseToInsert.length} tasse corrette...`);

  const { data: insertedTasse, error: insertError } = await supabase
    .from('uscite')
    .insert(tasseToInsert)
    .select();

  if (insertError) {
    console.error('Errore inserimento:', insertError.message);
  } else {
    console.log(`Inserite ${insertedTasse.length} tasse!`);
    const totaleTasse = tasseCorrette.reduce((acc, t) => acc + t.importo, 0);
    console.log(`Totale tasse pagate: €${totaleTasse.toFixed(2)}`);
  }
}

fixTasse();
