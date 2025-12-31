import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const USER_ID = process.env.SUPABASE_USER_ID;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkDicembre() {
  console.log('🔍 Verifica uscite dicembre 2025\n');

  const { data: uscite, error } = await supabase
    .from('uscite')
    .select('*')
    .eq('user_id', USER_ID)
    .gte('data', '2025-12-01')
    .lte('data', '2025-12-31')
    .order('data', { ascending: true });

  if (error) {
    console.error('❌ Errore:', error);
    return;
  }

  console.log('📊 Trovate ' + uscite.length + ' uscite in dicembre 2025\n');

  let totale = 0;
  uscite.forEach((u, idx) => {
    totale += u.importo;
    const num = idx + 1;
    const escl = u.escludi_da_grafico ? '(ESCLUSA DA GRAFICI)' : '';
    console.log(num + '. ' + u.data + ' - ' + u.descrizione + ' - €' + u.importo.toFixed(2) + ' - ' + (u.categoria || 'N/A') + ' ' + escl);
  });

  console.log('\n💰 TOTALE: €' + totale.toFixed(2));

  const escluse = uscite.filter(u => u.escludi_da_grafico);
  const incluse = uscite.filter(u => !u.escludi_da_grafico);

  console.log('\n📊 Breakdown:');
  console.log('   Uscite incluse nei grafici: ' + incluse.length + ' (€' + incluse.reduce((sum, u) => sum + u.importo, 0).toFixed(2) + ')');
  console.log('   Uscite escluse dai grafici: ' + escluse.length + ' (€' + escluse.reduce((sum, u) => sum + u.importo, 0).toFixed(2) + ')');
}

checkDicembre().catch(err => {
  console.error('❌ Errore:', err);
  process.exit(1);
});
