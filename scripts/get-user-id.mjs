import { createClient } from '@supabase/supabase-js';

// Usa service role key per accesso admin
const supabase = createClient(
  'https://mrrzgtdsaezvuugmemxd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ycnpndGRzYWV6dnV1Z21lbXhkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjYxMzI2MiwiZXhwIjoyMDgyMTg5MjYyfQ.9aH7y09yevOiQGvDWkjTGNdRUu6Le4nXnImuxm6ropI'
);

// Lista tutti gli utenti
const { data: { users }, error } = await supabase.auth.admin.listUsers();

if (error) {
  console.error('Errore:', error.message);
  process.exit(1);
}

if (users && users.length > 0) {
  console.log('\n📋 Utenti trovati:');
  users.forEach((user, index) => {
    console.log(`\n${index + 1}. Email: ${user.email}`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Creato: ${new Date(user.created_at).toLocaleString()}`);
  });

  console.log('\n✅ Usa questo USER_ID per l\'import:');
  console.log(users[0].id);
} else {
  console.error('Nessun utente trovato nel database');
  process.exit(1);
}
