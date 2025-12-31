/**
 * Script per rimuovere duplicati automaticamente
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const USER_ID = process.env.SUPABASE_USER_ID;
const DRY_RUN = process.argv.includes('--dry-run');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Trova duplicati esatti (stessa data, stesso importo)
 */
function trovaDuplicatiEsatti(items) {
  const groups = new Map();

  items.forEach((item) => {
    const key = `${item.data}|${item.importo.toFixed(2)}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(item);
  });

  const duplicati = [];
  for (const [key, group] of groups.entries()) {
    if (group.length > 1) {
      // Ordina per created_at (se disponibile) o per id
      group.sort((a, b) => {
        if (a.created_at && b.created_at) {
          return new Date(a.created_at) - new Date(b.created_at);
        }
        return a.id.localeCompare(b.id);
      });

      duplicati.push({
        chiave: key,
        daMantenere: group[0],
        daEliminare: group.slice(1),
      });
    }
  }

  return duplicati;
}

async function rimuoviDuplicati() {
  console.log('🗑️  RIMOZIONE DUPLICATI\n');

  if (DRY_RUN) {
    console.log('⚠️  MODALITÀ DRY-RUN: nessuna modifica sarà effettuata\n');
  } else {
    console.log('⚠️  ATTENZIONE: Le modifiche saranno permanenti!\n');
  }

  console.log('═══════════════════════════════════════════════════════════════\n');

  const stats = {
    fatture: { duplicati: 0, eliminati: 0 },
    uscite: { duplicati: 0, eliminati: 0 },
    entrate: { duplicati: 0, eliminati: 0 },
    prelievi: { duplicati: 0, eliminati: 0 },
  };

  // ═══════════════════════════════════════════════════════════════
  // FATTURE
  // ═══════════════════════════════════════════════════════════════
  console.log('📋 1. PULIZIA FATTURE\n');
  const { data: fatture } = await supabase
    .from('fatture')
    .select('id, data, cliente, importo_lordo, created_at')
    .eq('user_id', USER_ID)
    .order('data', { ascending: true });

  const fattureNormalizzate = fatture.map(f => ({
    ...f,
    importo: f.importo_lordo,
  }));

  const duplicatiFatture = trovaDuplicatiEsatti(fattureNormalizzate);
  stats.fatture.duplicati = duplicatiFatture.length;

  if (duplicatiFatture.length > 0) {
    console.log(`   Trovati ${duplicatiFatture.length} gruppi di fatture duplicate\n`);

    for (const dup of duplicatiFatture) {
      const ids = dup.daEliminare.map(f => f.id);

      if (DRY_RUN) {
        console.log(`   [DRY-RUN] Eliminerei ${ids.length} fatture duplicate:`);
        console.log(`     Mantengo: ${dup.daMantenere.id} | ${dup.daMantenere.data} | €${dup.daMantenere.importo.toFixed(2)}`);
        ids.forEach(id => console.log(`     Elimino:  ${id}`));
      } else {
        const { error } = await supabase
          .from('fatture')
          .delete()
          .in('id', ids);

        if (error) {
          console.error(`   ❌ Errore eliminando fatture:`, error.message);
        } else {
          stats.fatture.eliminati += ids.length;
          console.log(`   ✅ Eliminati ${ids.length} duplicati per ${dup.daMantenere.data}`);
        }
      }
    }
  } else {
    console.log('   ✅ Nessun duplicato\n');
  }

  // ═══════════════════════════════════════════════════════════════
  // USCITE
  // ═══════════════════════════════════════════════════════════════
  console.log('\n💸 2. PULIZIA USCITE\n');
  const { data: uscite } = await supabase
    .from('uscite')
    .select('id, data, descrizione, importo, categoria, created_at')
    .eq('user_id', USER_ID)
    .order('data', { ascending: true });

  const duplicatiUscite = trovaDuplicatiEsatti(uscite);
  stats.uscite.duplicati = duplicatiUscite.length;

  if (duplicatiUscite.length > 0) {
    console.log(`   Trovati ${duplicatiUscite.length} gruppi di uscite duplicate\n`);

    for (const dup of duplicatiUscite) {
      const ids = dup.daEliminare.map(u => u.id);

      if (DRY_RUN) {
        console.log(`   [DRY-RUN] Eliminerei ${ids.length} uscite duplicate:`);
        console.log(`     Mantengo: ${dup.daMantenere.id} | ${dup.daMantenere.data} | €${dup.daMantenere.importo.toFixed(2)} | ${dup.daMantenere.descrizione}`);
        dup.daEliminare.forEach(u => console.log(`     Elimino:  ${u.id} | ${u.descrizione}`));
      } else {
        const { error } = await supabase
          .from('uscite')
          .delete()
          .in('id', ids);

        if (error) {
          console.error(`   ❌ Errore eliminando uscite:`, error.message);
        } else {
          stats.uscite.eliminati += ids.length;
          console.log(`   ✅ Eliminati ${ids.length} duplicati per ${dup.daMantenere.data}`);
        }
      }
    }
  } else {
    console.log('   ✅ Nessun duplicato\n');
  }

  // ═══════════════════════════════════════════════════════════════
  // ENTRATE
  // ═══════════════════════════════════════════════════════════════
  console.log('\n💰 3. PULIZIA ENTRATE\n');
  const { data: entrate } = await supabase
    .from('entrate')
    .select('id, data, descrizione, importo, categoria, created_at')
    .eq('user_id', USER_ID)
    .order('data', { ascending: true });

  const duplicatiEntrate = trovaDuplicatiEsatti(entrate);
  stats.entrate.duplicati = duplicatiEntrate.length;

  if (duplicatiEntrate.length > 0) {
    console.log(`   Trovati ${duplicatiEntrate.length} gruppi di entrate duplicate\n`);

    for (const dup of duplicatiEntrate) {
      const ids = dup.daEliminare.map(e => e.id);

      if (DRY_RUN) {
        console.log(`   [DRY-RUN] Eliminerei ${ids.length} entrate duplicate:`);
        console.log(`     Mantengo: ${dup.daMantenere.id} | ${dup.daMantenere.data} | €${dup.daMantenere.importo.toFixed(2)}`);
      } else {
        const { error } = await supabase
          .from('entrate')
          .delete()
          .in('id', ids);

        if (error) {
          console.error(`   ❌ Errore eliminando entrate:`, error.message);
        } else {
          stats.entrate.eliminati += ids.length;
          console.log(`   ✅ Eliminati ${ids.length} duplicati per ${dup.daMantenere.data}`);
        }
      }
    }
  } else {
    console.log('   ✅ Nessun duplicato\n');
  }

  // ═══════════════════════════════════════════════════════════════
  // PRELIEVI
  // ═══════════════════════════════════════════════════════════════
  console.log('\n🏦 4. PULIZIA PRELIEVI\n');
  const { data: prelievi } = await supabase
    .from('prelievi')
    .select('id, data, descrizione, importo, created_at')
    .eq('user_id', USER_ID)
    .order('data', { ascending: true });

  const duplicatiPrelievi = trovaDuplicatiEsatti(prelievi);
  stats.prelievi.duplicati = duplicatiPrelievi.length;

  if (duplicatiPrelievi.length > 0) {
    console.log(`   Trovati ${duplicatiPrelievi.length} gruppi di prelievi duplicati\n`);

    for (const dup of duplicatiPrelievi) {
      const ids = dup.daEliminare.map(p => p.id);

      if (DRY_RUN) {
        console.log(`   [DRY-RUN] Eliminerei ${ids.length} prelievi duplicati:`);
        console.log(`     Mantengo: ${dup.daMantenere.id} | ${dup.daMantenere.data} | €${dup.daMantenere.importo.toFixed(2)}`);
      } else {
        const { error } = await supabase
          .from('prelievi')
          .delete()
          .in('id', ids);

        if (error) {
          console.error(`   ❌ Errore eliminando prelievi:`, error.message);
        } else {
          stats.prelievi.eliminati += ids.length;
          console.log(`   ✅ Eliminati ${ids.length} duplicati per ${dup.daMantenere.data}`);
        }
      }
    }
  } else {
    console.log('   ✅ Nessun duplicato\n');
  }

  // ═══════════════════════════════════════════════════════════════
  // RIEPILOGO
  // ═══════════════════════════════════════════════════════════════
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📊 RIEPILOGO\n');

  const totEliminati = stats.fatture.eliminati + stats.uscite.eliminati + stats.entrate.eliminati + stats.prelievi.eliminati;

  console.log(`Fatture:  ${stats.fatture.duplicati} gruppi | ${stats.fatture.eliminati} eliminati`);
  console.log(`Uscite:   ${stats.uscite.duplicati} gruppi | ${stats.uscite.eliminati} eliminati`);
  console.log(`Entrate:  ${stats.entrate.duplicati} gruppi | ${stats.entrate.eliminati} eliminati`);
  console.log(`Prelievi: ${stats.prelievi.duplicati} gruppi | ${stats.prelievi.eliminati} eliminati`);
  console.log('');

  if (DRY_RUN) {
    console.log(`⚠️  DRY-RUN: ${totEliminati} record sarebbero stati eliminati`);
    console.log('\n💡 Per eseguire realmente la pulizia, esegui senza --dry-run:');
    console.log('   VITE_SUPABASE_URL=... SUPABASE_SERVICE_KEY=... SUPABASE_USER_ID=... node scripts/rimuovi-duplicati.mjs\n');
  } else {
    console.log(`✅ Eliminati ${totEliminati} record duplicati!\n`);
  }
}

rimuoviDuplicati().catch(err => {
  console.error('❌ Errore:', err);
  process.exit(1);
});
