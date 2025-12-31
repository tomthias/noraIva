/**
 * Calcolo CORRETTO del saldo reale basato sui movimenti bancari
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const USER_ID = process.env.SUPABASE_USER_ID;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function calcoloSaldoReale() {
  console.log('🏦 CALCOLO SALDO REALE CONTO BANCARIO\n');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // ENTRATE (movimenti bancari in entrata)
  const { data: entrate } = await supabase
    .from('entrate')
    .select('*')
    .eq('user_id', USER_ID)
    .order('data', { ascending: true });

  // USCITE (tutte le uscite operative)
  const { data: uscite } = await supabase
    .from('uscite')
    .select('*')
    .eq('user_id', USER_ID)
    .order('data', { ascending: true });

  // PRELIEVI (stipendi)
  const { data: prelievi } = await supabase
    .from('prelievi')
    .select('*')
    .eq('user_id', USER_ID)
    .order('data', { ascending: true });

  // FATTURE (per calcolo tasse teoriche)
  const { data: fatture } = await supabase
    .from('fatture')
    .select('*')
    .eq('user_id', USER_ID)
    .order('data', { ascending: true });

  console.log('📊 ANALISI ENTRATE:\n');

  // Raggruppa entrate per categoria
  const entratePerCat = {};
  entrate.forEach(e => {
    const cat = e.categoria || 'NULL';
    if (!entratePerCat[cat]) {
      entratePerCat[cat] = { count: 0, totale: 0, items: [] };
    }
    entratePerCat[cat].count++;
    entratePerCat[cat].totale += e.importo;
    entratePerCat[cat].items.push(e);
  });

  Object.entries(entratePerCat).sort((a, b) => b[1].totale - a[1].totale).forEach(([cat, data]) => {
    console.log(`  ${cat}: ${data.count} movimenti = €${data.totale.toFixed(2)}`);
    if (cat === 'ALTRO' && data.items.length <= 10) {
      data.items.forEach(e => {
        console.log(`    - ${e.data}: €${e.importo.toFixed(2)} | ${e.descrizione}`);
      });
    }
  });

  const totaleEntrate = entrate.reduce((sum, e) => sum + e.importo, 0);
  console.log(`\n  TOTALE ENTRATE: €${totaleEntrate.toFixed(2)}\n`);

  console.log('📊 ANALISI USCITE:\n');

  const totaleUscite = uscite.reduce((sum, u) => sum + u.importo, 0);
  const tassePagate = uscite.filter(u => u.categoria === 'TASSE').reduce((sum, u) => sum + u.importo, 0);

  console.log(`  TOTALE USCITE: €${totaleUscite.toFixed(2)}`);
  console.log(`  Di cui TASSE: €${tassePagate.toFixed(2)}\n`);

  console.log('📊 PRELIEVI (STIPENDI):\n');
  const totalePrelievi = prelievi.reduce((sum, p) => sum + p.importo, 0);
  console.log(`  TOTALE PRELIEVI: €${totalePrelievi.toFixed(2)}\n`);

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('💰 SALDO REALE CONTO BANCARIO\n');

  const saldoBanca = totaleEntrate - totaleUscite - totalePrelievi;

  console.log(`  Entrate totali:     +€${totaleEntrate.toFixed(2)}`);
  console.log(`  Uscite operative:   -€${totaleUscite.toFixed(2)}`);
  console.log(`  Prelievi stipendi:  -€${totalePrelievi.toFixed(2)}`);
  console.log(`  ─────────────────────────────────`);
  console.log(`  SALDO BANCA:        €${saldoBanca.toFixed(2)}\n`);

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📊 CALCOLO TASSE DA ACCANTONARE\n');

  // Calcolo tasse teoriche da fatture (regime forfettario 78% → 26.07% INPS → 5% imposta)
  const totaleFatturato = fatture.reduce((sum, f) => sum + f.importo_lordo, 0);
  const redditoImponibile = totaleFatturato * 0.78;
  const inps = redditoImponibile * 0.2607;
  const imponibileNetto = redditoImponibile - inps;
  const imposta = imponibileNetto * 0.05;
  const tasseTeoricheTotali = inps + imposta;

  console.log(`  Fatturato totale:        €${totaleFatturato.toFixed(2)}`);
  console.log(`  Reddito imponibile (78%): €${redditoImponibile.toFixed(2)}`);
  console.log(`  INPS (26.07%):           €${inps.toFixed(2)}`);
  console.log(`  Imposta sostitutiva (5%): €${imposta.toFixed(2)}`);
  console.log(`  ─────────────────────────────────`);
  console.log(`  TASSE TEORICHE:          €${tasseTeoricheTotali.toFixed(2)}`);
  console.log(`  TASSE GIÀ PAGATE:        €${tassePagate.toFixed(2)}`);
  console.log(`  ─────────────────────────────────`);

  const tasseDaAccantonare = Math.max(0, tasseTeoricheTotali - tassePagate);
  console.log(`  DA ACCANTONARE:          €${tasseDaAccantonare.toFixed(2)}\n`);

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('✅ NETTO DISPONIBILE REALE\n');

  const nettoDisponibile = saldoBanca - tasseDaAccantonare;

  console.log(`  Saldo banca:             €${saldoBanca.toFixed(2)}`);
  console.log(`  Tasse da accantonare:    -€${tasseDaAccantonare.toFixed(2)}`);
  console.log(`  ─────────────────────────────────`);
  console.log(`  PUOI PRELEVARE:          €${nettoDisponibile.toFixed(2)}\n`);
}

calcoloSaldoReale().catch(err => {
  console.error('❌ Errore:', err);
  process.exit(1);
});
