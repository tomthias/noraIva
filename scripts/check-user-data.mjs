import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mrrzgtdsaezvuugmemxd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ycnpndGRzYWV6dnV1Z21lbXhkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjYxMzI2MiwiZXhwIjoyMDgyMTg5MjYyfQ.9aH7y09yevOiQGvDWkjTGNdRUu6Le4nXnImuxm6ropI'
);

const MADDALENA_ID = 'b4c54e06-c808-462e-92fd-c07d5eecf130';
const MATTIA_ID = '580d9a54-9a65-4b36-a2a5-480908b1ee38';

async function checkUserData(userId, userName) {
  console.log(`\n📊 Controllo dati per: ${userName} (${userId})`);
  console.log('='.repeat(60));

  // Check fatture
  const { data: fatture, error: fattureError } = await supabase
    .from('fatture')
    .select('id')
    .eq('user_id', userId);

  if (fattureError) {
    console.error('❌ Errore fatture:', fattureError.message);
  } else {
    console.log(`Fatture: ${fatture.length}`);
  }

  // Check prelievi
  const { data: prelievi, error: prelieviError } = await supabase
    .from('prelievi')
    .select('id')
    .eq('user_id', userId);

  if (prelieviError) {
    console.error('❌ Errore prelievi:', prelieviError.message);
  } else {
    console.log(`Prelievi: ${prelievi.length}`);
  }

  // Check uscite
  const { data: uscite, error: usciteError } = await supabase
    .from('uscite')
    .select('id')
    .eq('user_id', userId);

  if (usciteError) {
    console.error('❌ Errore uscite:', usciteError.message);
  } else {
    console.log(`Uscite: ${uscite.length}`);
  }

  // Check entrate
  const { data: entrate, error: entrateError } = await supabase
    .from('entrate')
    .select('id')
    .eq('user_id', userId);

  if (entrateError) {
    console.error('❌ Errore entrate:', entrateError.message);
  } else {
    console.log(`Entrate: ${entrate.length}`);
  }

  const total = (fatture?.length || 0) + (prelievi?.length || 0) + (uscite?.length || 0) + (entrate?.length || 0);
  console.log(`\n✅ TOTALE RECORD: ${total}`);

  return total;
}

console.log('\n🔍 VERIFICA DATI UTENTI NEL DATABASE\n');

const maddalenaTotal = await checkUserData(MADDALENA_ID, 'Maddalena');
const mattiaTotal = await checkUserData(MATTIA_ID, 'Mattia');

console.log('\n' + '='.repeat(60));
console.log('📋 RIEPILOGO');
console.log('='.repeat(60));
console.log(`Maddalena: ${maddalenaTotal} record totali`);
console.log(`Mattia: ${mattiaTotal} record totali`);
console.log('='.repeat(60) + '\n');

if (maddalenaTotal === 0) {
  console.log('✅ Confermato: l\'account di Maddalena è VUOTO\n');
} else {
  console.log('⚠️  ATTENZIONE: Maddalena ha dei dati nel database!\n');
}
