/**
 * Script per verificare i totali reali nel database
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const USER_ID = process.env.SUPABASE_USER_ID;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function verificaTotali() {
  console.log('🔍 VERIFICA TOTALI DATABASE\n');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // FATTURE
  const { data: fatture } = await supabase
    .from('fatture')
    .select('data, importo_lordo')
    .eq('user_id', USER_ID)
    .order('data', { ascending: true });

  const fatture2024 = fatture.filter(f => f.data.startsWith('2024'));
  const fatture2025 = fatture.filter(f => f.data.startsWith('2025'));
  const totaleFatture2024 = fatture2024.reduce((sum, f) => sum + f.importo_lordo, 0);
  const totaleFatture2025 = fatture2025.reduce((sum, f) => sum + f.importo_lordo, 0);
  const totaleFatture = fatture.reduce((sum, f) => sum + f.importo_lordo, 0);

  console.log('📋 FATTURE:');
  console.log(`   2024: ${fatture2024.length} fatture = €${totaleFatture2024.toFixed(2)}`);
  console.log(`   2025: ${fatture2025.length} fatture = €${totaleFatture2025.toFixed(2)}`);
  console.log(`   TOTALE: ${fatture.length} fatture = €${totaleFatture.toFixed(2)}\n`);

  // PRELIEVI
  const { data: prelievi } = await supabase
    .from('prelievi')
    .select('data, importo')
    .eq('user_id', USER_ID)
    .order('data', { ascending: true });

  const prelievi2024 = prelievi.filter(p => p.data.startsWith('2024'));
  const prelievi2025 = prelievi.filter(p => p.data.startsWith('2025'));
  const totalePrelievi2024 = prelievi2024.reduce((sum, p) => sum + p.importo, 0);
  const totalePrelievi2025 = prelievi2025.reduce((sum, p) => sum + p.importo, 0);
  const totalePrelievi = prelievi.reduce((sum, p) => sum + p.importo, 0);

  console.log('🏦 PRELIEVI (STIPENDI):');
  console.log(`   2024: ${prelievi2024.length} prelievi = €${totalePrelievi2024.toFixed(2)}`);
  console.log(`   2025: ${prelievi2025.length} prelievi = €${totalePrelievi2025.toFixed(2)}`);
  console.log(`   TOTALE: ${prelievi.length} prelievi = €${totalePrelievi.toFixed(2)}\n`);

  // USCITE
  const { data: uscite } = await supabase
    .from('uscite')
    .select('data, importo, categoria')
    .eq('user_id', USER_ID)
    .order('data', { ascending: true });

  const uscite2024 = uscite.filter(u => u.data.startsWith('2024'));
  const uscite2025 = uscite.filter(u => u.data.startsWith('2025'));
  const totaleUscite2024 = uscite2024.reduce((sum, u) => sum + u.importo, 0);
  const totaleUscite2025 = uscite2025.reduce((sum, u) => sum + u.importo, 0);
  const totaleUscite = uscite.reduce((sum, u) => sum + u.importo, 0);

  const tasse2024 = uscite2024.filter(u => u.categoria === 'TASSE');
  const tasse2025 = uscite2025.filter(u => u.categoria === 'TASSE');
  const totaleTasse2024 = tasse2024.reduce((sum, u) => sum + u.importo, 0);
  const totaleTasse2025 = tasse2025.reduce((sum, u) => sum + u.importo, 0);
  const totaleTasse = uscite.filter(u => u.categoria === 'TASSE').reduce((sum, u) => sum + u.importo, 0);

  console.log('💸 USCITE:');
  console.log(`   2024: ${uscite2024.length} uscite = €${totaleUscite2024.toFixed(2)} (di cui tasse: €${totaleTasse2024.toFixed(2)})`);
  console.log(`   2025: ${uscite2025.length} uscite = €${totaleUscite2025.toFixed(2)} (di cui tasse: €${totaleTasse2025.toFixed(2)})`);
  console.log(`   TOTALE: ${uscite.length} uscite = €${totaleUscite.toFixed(2)} (di cui tasse: €${totaleTasse.toFixed(2)})\n`);

  // ENTRATE
  const { data: entrate } = await supabase
    .from('entrate')
    .select('data, importo')
    .eq('user_id', USER_ID)
    .order('data', { ascending: true });

  const entrate2024 = entrate.filter(e => e.data.startsWith('2024'));
  const entrate2025 = entrate.filter(e => e.data.startsWith('2025'));
  const totaleEntrate2024 = entrate2024.reduce((sum, e) => sum + e.importo, 0);
  const totaleEntrate2025 = entrate2025.reduce((sum, e) => sum + e.importo, 0);
  const totaleEntrate = entrate.reduce((sum, e) => sum + e.importo, 0);

  console.log('💰 ENTRATE EXTRA:');
  console.log(`   2024: ${entrate2024.length} entrate = €${totaleEntrate2024.toFixed(2)}`);
  console.log(`   2025: ${entrate2025.length} entrate = €${totaleEntrate2025.toFixed(2)}`);
  console.log(`   TOTALE: ${entrate.length} entrate = €${totaleEntrate.toFixed(2)}\n`);

  // CALCOLO SALDO
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📊 SALDO CONTO (CUMULATIVO 2024+2025)\n');

  const saldoConto = totaleFatture + totaleEntrate - totalePrelievi - totaleUscite;

  console.log(`   Fatturato:  +€${totaleFatture.toFixed(2)}`);
  console.log(`   Entrate:    +€${totaleEntrate.toFixed(2)}`);
  console.log(`   Prelievi:   -€${totalePrelievi.toFixed(2)}`);
  console.log(`   Uscite:     -€${totaleUscite.toFixed(2)}`);
  console.log(`   ─────────────────────────────────`);
  console.log(`   SALDO:      €${saldoConto.toFixed(2)}\n`);

  console.log('📊 SALDO SOLO 2025\n');
  const saldoConto2025 = totaleFatture2025 + totaleEntrate2025 - totalePrelievi2025 - totaleUscite2025;

  console.log(`   Fatturato:  +€${totaleFatture2025.toFixed(2)}`);
  console.log(`   Entrate:    +€${totaleEntrate2025.toFixed(2)}`);
  console.log(`   Prelievi:   -€${totalePrelievi2025.toFixed(2)}`);
  console.log(`   Uscite:     -€${totaleUscite2025.toFixed(2)}`);
  console.log(`   ─────────────────────────────────`);
  console.log(`   SALDO 2025: €${saldoConto2025.toFixed(2)}\n`);
}

verificaTotali().catch(err => {
  console.error('❌ Errore:', err);
  process.exit(1);
});
