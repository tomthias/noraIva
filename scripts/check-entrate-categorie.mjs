import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const USER_ID = process.env.SUPABASE_USER_ID;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const { data: entrate } = await supabase
  .from('entrate')
  .select('*')
  .eq('user_id', USER_ID);

const perCategoria = {};
entrate.forEach(e => {
  const cat = e.categoria || 'NULL';
  if (!perCategoria[cat]) {
    perCategoria[cat] = { count: 0, totale: 0 };
  }
  perCategoria[cat].count++;
  perCategoria[cat].totale += e.importo;
});

console.log('📊 ENTRATE PER CATEGORIA:\n');
Object.entries(perCategoria).sort((a, b) => b[1].totale - a[1].totale).forEach(([cat, data]) => {
  console.log(`  ${cat}: ${data.count} entrate = €${data.totale.toFixed(2)}`);
});

console.log(`\nTOTALE ENTRATE: ${entrate.length} = €${entrate.reduce((sum, e) => sum + e.importo, 0).toFixed(2)}`);
