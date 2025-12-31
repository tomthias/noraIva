/**
 * Script per separare il SALDO INIZIALE dalla categoria ALTRO
 *
 * I bonifici giroconto del 16-18 gennaio 2024 (~€19.000) sono trasferimenti
 * dal vecchio conto BBVA al nuovo conto. Non sono entrate operative ma
 * capitale iniziale che va escluso dai calcoli.
 *
 * Usage:
 *   node scripts/separa-saldo-iniziale.mjs
 *   node scripts/separa-saldo-iniziale.mjs --dry-run
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const USER_ID = process.env.SUPABASE_USER_ID;
const DRY_RUN = process.argv.includes('--dry-run');

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !USER_ID) {
  console.error('❌ Errore: variabili d\'ambiente mancanti');
  console.error('   VITE_SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_USER_ID');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function separaSaldoIniziale() {
  console.log('🔄 SEPARAZIONE SALDO INIZIALE DA CATEGORIA "ALTRO"\n');
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (DRY_RUN) {
    console.log('⚠️  MODALITÀ DRY-RUN: nessuna modifica sarà effettuata\n');
  }

  // Trova entrate ALTRO con giroconti/bonifici a gennaio 2024
  const { data: entrate } = await supabase
    .from('entrate')
    .select('*')
    .eq('user_id', USER_ID)
    .eq('categoria', 'ALTRO')
    .gte('data', '2024-01-01')
    .lte('data', '2024-01-31')
    .order('data', { ascending: true });

  console.log(`📊 Trovate ${entrate.length} entrate ALTRO a gennaio 2024\n`);

  if (entrate.length === 0) {
    console.log('✅ Nessuna entrata ALTRO trovata a gennaio 2024!\n');
    return;
  }

  // Filtra quelle che sembrano giroconti (bonifico, giroconto, trasferimento)
  const giroconti = entrate.filter(e => {
    const desc = e.descrizione.toLowerCase();
    return desc.includes('giroconto') ||
           desc.includes('bonifico') ||
           desc.includes('trasferimento') ||
           desc.includes('trasf.') ||
           desc.includes('trasf ');
  });

  console.log(`🔍 Identificati ${giroconti.length} possibili GIROCONTI (saldo iniziale):\n`);

  if (giroconti.length === 0) {
    console.log('⚠️  Nessun giroconto trovato! Ecco tutte le entrate ALTRO di gennaio 2024:\n');
    entrate.forEach((e, i) => {
      console.log(`   ${i + 1}. ${e.data} | €${e.importo.toFixed(2)} | ${e.descrizione}`);
    });
    console.log('\n💡 Verifica manualmente quali sono i saldi iniziali!\n');
    return;
  }

  const totaleGiroconti = giroconti.reduce((sum, e) => sum + e.importo, 0);

  giroconti.forEach((e, i) => {
    console.log(`   ${i + 1}. ${e.data} | €${e.importo.toFixed(2)} | ${e.descrizione}`);
  });

  console.log(`\n💰 Totale giroconti: €${totaleGiroconti.toFixed(2)}\n`);

  // Chiedi conferma (in dry-run mostra solo info)
  if (DRY_RUN) {
    console.log('[DRY-RUN] Aggiornerei questi record:');
    console.log(`[DRY-RUN]   - Categoria: ALTRO → SALDO_INIZIALE`);
    console.log(`[DRY-RUN]   - escludi_da_grafico: false → true`);
    console.log(`[DRY-RUN] Totale record: ${giroconti.length}`);
    console.log(`[DRY-RUN] Totale importo: €${totaleGiroconti.toFixed(2)}\n`);
    console.log('💡 Per eseguire realmente l\'aggiornamento, rimuovi --dry-run\n');
  } else {
    console.log('⏳ Aggiornamento in corso...\n');

    let updated = 0;
    let errors = 0;

    for (const e of giroconti) {
      const { error } = await supabase
        .from('entrate')
        .update({
          categoria: 'SALDO_INIZIALE',
          escludi_da_grafico: true,
        })
        .eq('id', e.id);

      if (error) {
        console.error(`❌ Errore aggiornando ${e.data} - ${e.descrizione}:`, error.message);
        errors++;
      } else {
        updated++;
      }
    }

    console.log(`✅ AGGIORNAMENTO COMPLETATO!`);
    console.log(`   Aggiornati: ${updated}`);
    console.log(`   Errori: ${errors}\n`);

    // Verifica finale
    const { data: saldoIniziale } = await supabase
      .from('entrate')
      .select('*')
      .eq('user_id', USER_ID)
      .eq('categoria', 'SALDO_INIZIALE');

    const totaleFinale = saldoIniziale.reduce((sum, e) => sum + e.importo, 0);

    const { data: altroRimanente } = await supabase
      .from('entrate')
      .select('*')
      .eq('user_id', USER_ID)
      .eq('categoria', 'ALTRO');

    const totaleAltro = altroRimanente.reduce((sum, e) => sum + e.importo, 0);

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📊 STATO FINALE DATABASE\n');
    console.log(`   SALDO_INIZIALE: ${saldoIniziale.length} record = €${totaleFinale.toFixed(2)} (esclusi da grafici)`);
    console.log(`   ALTRO rimanente: ${altroRimanente.length} record = €${totaleAltro.toFixed(2)}\n`);
    console.log('═══════════════════════════════════════════════════════════════\n');
  }
}

separaSaldoIniziale().catch(err => {
  console.error('❌ Errore:', err);
  process.exit(1);
});
