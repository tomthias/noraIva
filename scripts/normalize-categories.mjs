/**
 * Script per normalizzare categorie entrate/uscite nel database
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const USER_ID = process.env.SUPABASE_USER_ID;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function normalizeCategories() {
  console.log('🔄 Normalizzazione categorie in corso...\n');

  // Step 1: Normalizza ENTRATE (UPPER + TRIM)
  console.log('📊 Step 1: Normalizzazione ENTRATE...');
  const { data: entrate } = await supabase.from('entrate').select('*').eq('user_id', USER_ID);

  let updated = 0;
  for (const e of entrate || []) {
    if (!e.categoria) continue;
    const normalized = e.categoria.trim().toUpperCase();

    if (normalized !== e.categoria) {
      await supabase.from('entrate').update({ categoria: normalized }).eq('id', e.id);
      updated++;
    }
  }
  console.log(`  ✅ Normalizzate ${updated} entrate\n`);

  // Step 2: Mappature speciali ENTRATE (Fattura → FATTURE, Rimborso → RIMBORSI)
  console.log('📊 Step 2: Mappature speciali ENTRATE...');

  const { data: entrateToFix } = await supabase.from('entrate').select('*').eq('user_id', USER_ID);
  let fixed = 0;

  for (const e of entrateToFix || []) {
    if (!e.categoria) continue;
    const upper = e.categoria.toUpperCase();

    let newCat = null;
    if (upper === 'FATTURA') newCat = 'FATTURE';
    if (upper === 'RIMBORSO') newCat = 'RIMBORSI';
    if (upper === 'INTERESSI' || upper === 'INTERESSE') newCat = 'INTERESSI';

    if (newCat && newCat !== e.categoria) {
      await supabase.from('entrate').update({ categoria: newCat }).eq('id', e.id);
      fixed++;
    }
  }
  console.log(`  ✅ Corrette ${fixed} mappature\n`);

  // Step 3: Normalizza USCITE
  console.log('📊 Step 3: Normalizzazione USCITE...');
  const { data: uscite } = await supabase.from('uscite').select('*').eq('user_id', USER_ID);

  updated = 0;
  for (const u of uscite || []) {
    if (!u.categoria) continue;
    const normalized = u.categoria.trim().toUpperCase();

    if (normalized !== u.categoria) {
      await supabase.from('uscite').update({ categoria: normalized }).eq('id', u.id);
      updated++;
    }
  }
  console.log(`  ✅ Normalizzate ${updated} uscite\n`);

  console.log('✅ Normalizzazione completata!\n');

  // Verifica risultato
  console.log('📊 CATEGORIE DOPO NORMALIZZAZIONE:\n');
  const { data: newEntrate } = await supabase.from('entrate').select('categoria').eq('user_id', USER_ID);
  const { data: newUscite } = await supabase.from('uscite').select('categoria').eq('user_id', USER_ID);

  const catE = {};
  const catU = {};

  newEntrate?.forEach(e => {
    const cat = e.categoria || 'null';
    catE[cat] = (catE[cat] || 0) + 1;
  });

  newUscite?.forEach(u => {
    const cat = u.categoria || 'null';
    catU[cat] = (catU[cat] || 0) + 1;
  });

  console.log('ENTRATE:');
  Object.entries(catE).sort().forEach(([cat, count]) => {
    console.log(`  ${cat}: ${count}`);
  });

  console.log('\nUSCITE:');
  Object.entries(catU).sort().forEach(([cat, count]) => {
    console.log(`  ${cat}: ${count}`);
  });
}

normalizeCategories().catch(err => {
  console.error('❌ Errore:', err);
  process.exit(1);
});
