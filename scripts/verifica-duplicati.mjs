/**
 * Script per verificare duplicati in tutte le tabelle
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const USER_ID = process.env.SUPABASE_USER_ID;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Trova duplicati per data + importo + descrizione
 */
function trovaDuplicati(items, tipo) {
  const map = new Map();
  const duplicati = [];

  items.forEach((item) => {
    // Chiave univoca: data + importo + prime 30 char descrizione
    const key = `${item.data}|${item.importo}|${(item.descrizione || item.cliente || '').substring(0, 30)}`;

    if (map.has(key)) {
      const existing = map.get(key);
      duplicati.push({
        tipo,
        chiave: key,
        items: [existing, item],
        data: item.data,
        importo: item.importo,
        descrizione: item.descrizione || item.cliente,
      });
    } else {
      map.set(key, item);
    }
  });

  return duplicati;
}

/**
 * Trova duplicati esatti (stessa data, stesso importo, descrizione molto simile)
 */
function trovaDuplicatiEsatti(items, tipo) {
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
      duplicati.push({
        tipo,
        chiave: key,
        count: group.length,
        items: group,
        data: group[0].data,
        importo: group[0].importo,
      });
    }
  }

  return duplicati;
}

async function verificaTutteLeTabelle() {
  console.log('🔍 VERIFICA DUPLICATI IN TUTTE LE TABELLE\n');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const report = {
    fatture: { totali: 0, duplicati: [] },
    uscite: { totali: 0, duplicati: [] },
    entrate: { totali: 0, duplicati: [] },
    prelievi: { totali: 0, duplicati: [] },
  };

  // ═══════════════════════════════════════════════════════════════
  // FATTURE
  // ═══════════════════════════════════════════════════════════════
  console.log('📋 1. VERIFICA FATTURE\n');
  const { data: fatture, error: errFatture } = await supabase
    .from('fatture')
    .select('id, data, cliente, importo_lordo, descrizione')
    .eq('user_id', USER_ID)
    .order('data', { ascending: true });

  if (errFatture) {
    console.error('❌ Errore caricamento fatture:', errFatture);
  } else {
    report.fatture.totali = fatture.length;
    console.log(`   Totale fatture: ${fatture.length}`);

    // Trasforma per compatibilità con funzione duplicati
    const fattureNormalizzate = fatture.map(f => ({
      ...f,
      importo: f.importo_lordo,
      descrizione: f.cliente,
    }));

    const duplicatiFatture = trovaDuplicatiEsatti(fattureNormalizzate, 'FATTURE');
    report.fatture.duplicati = duplicatiFatture;

    if (duplicatiFatture.length > 0) {
      console.log(`   ⚠️  Trovati ${duplicatiFatture.length} gruppi di fatture duplicate:\n`);
      duplicatiFatture.forEach((dup, idx) => {
        console.log(`   Gruppo ${idx + 1}: ${dup.count} fatture con stessa data e importo`);
        console.log(`     Data: ${dup.data} | Importo: €${dup.importo.toFixed(2)}`);
        dup.items.forEach((item, i) => {
          console.log(`       ${i + 1}. ID: ${item.id} | Cliente: ${item.cliente} | Desc: ${item.descrizione || 'N/A'}`);
        });
        console.log('');
      });
    } else {
      console.log('   ✅ Nessun duplicato trovato\n');
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // USCITE
  // ═══════════════════════════════════════════════════════════════
  console.log('💸 2. VERIFICA USCITE\n');
  const { data: uscite, error: errUscite } = await supabase
    .from('uscite')
    .select('id, data, descrizione, importo, categoria, escludi_da_grafico')
    .eq('user_id', USER_ID)
    .order('data', { ascending: true });

  if (errUscite) {
    console.error('❌ Errore caricamento uscite:', errUscite);
  } else {
    report.uscite.totali = uscite.length;
    console.log(`   Totale uscite: ${uscite.length}`);

    const duplicatiUscite = trovaDuplicatiEsatti(uscite, 'USCITE');
    report.uscite.duplicati = duplicatiUscite;

    if (duplicatiUscite.length > 0) {
      console.log(`   ⚠️  Trovati ${duplicatiUscite.length} gruppi di uscite duplicate:\n`);
      duplicatiUscite.forEach((dup, idx) => {
        console.log(`   Gruppo ${idx + 1}: ${dup.count} uscite con stessa data e importo`);
        console.log(`     Data: ${dup.data} | Importo: €${dup.importo.toFixed(2)}`);
        dup.items.forEach((item, i) => {
          const escl = item.escludi_da_grafico ? ' [ESCLUSA]' : '';
          console.log(`       ${i + 1}. ID: ${item.id} | ${item.descrizione} | ${item.categoria || 'N/A'}${escl}`);
        });
        console.log('');
      });
    } else {
      console.log('   ✅ Nessun duplicato trovato\n');
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // ENTRATE
  // ═══════════════════════════════════════════════════════════════
  console.log('💰 3. VERIFICA ENTRATE\n');
  const { data: entrate, error: errEntrate } = await supabase
    .from('entrate')
    .select('id, data, descrizione, importo, categoria, escludi_da_grafico')
    .eq('user_id', USER_ID)
    .order('data', { ascending: true });

  if (errEntrate) {
    console.error('❌ Errore caricamento entrate:', errEntrate);
  } else {
    report.entrate.totali = entrate.length;
    console.log(`   Totale entrate: ${entrate.length}`);

    const duplicatiEntrate = trovaDuplicatiEsatti(entrate, 'ENTRATE');
    report.entrate.duplicati = duplicatiEntrate;

    if (duplicatiEntrate.length > 0) {
      console.log(`   ⚠️  Trovati ${duplicatiEntrate.length} gruppi di entrate duplicate:\n`);
      duplicatiEntrate.forEach((dup, idx) => {
        console.log(`   Gruppo ${idx + 1}: ${dup.count} entrate con stessa data e importo`);
        console.log(`     Data: ${dup.data} | Importo: €${dup.importo.toFixed(2)}`);
        dup.items.forEach((item, i) => {
          const escl = item.escludi_da_grafico ? ' [ESCLUSA]' : '';
          console.log(`       ${i + 1}. ID: ${item.id} | ${item.descrizione} | ${item.categoria || 'N/A'}${escl}`);
        });
        console.log('');
      });
    } else {
      console.log('   ✅ Nessun duplicato trovato\n');
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // PRELIEVI
  // ═══════════════════════════════════════════════════════════════
  console.log('🏦 4. VERIFICA PRELIEVI (STIPENDI)\n');
  const { data: prelievi, error: errPrelievi } = await supabase
    .from('prelievi')
    .select('id, data, descrizione, importo')
    .eq('user_id', USER_ID)
    .order('data', { ascending: true });

  if (errPrelievi) {
    console.error('❌ Errore caricamento prelievi:', errPrelievi);
  } else {
    report.prelievi.totali = prelievi.length;
    console.log(`   Totale prelievi: ${prelievi.length}`);

    const duplicatiPrelievi = trovaDuplicatiEsatti(prelievi, 'PRELIEVI');
    report.prelievi.duplicati = duplicatiPrelievi;

    if (duplicatiPrelievi.length > 0) {
      console.log(`   ⚠️  Trovati ${duplicatiPrelievi.length} gruppi di prelievi duplicati:\n`);
      duplicatiPrelievi.forEach((dup, idx) => {
        console.log(`   Gruppo ${idx + 1}: ${dup.count} prelievi con stessa data e importo`);
        console.log(`     Data: ${dup.data} | Importo: €${dup.importo.toFixed(2)}`);
        dup.items.forEach((item, i) => {
          console.log(`       ${i + 1}. ID: ${item.id} | ${item.descrizione}`);
        });
        console.log('');
      });
    } else {
      console.log('   ✅ Nessun duplicato trovato\n');
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // RIEPILOGO FINALE
  // ═══════════════════════════════════════════════════════════════
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📊 RIEPILOGO FINALE\n');

  const totDuplicati =
    report.fatture.duplicati.length +
    report.uscite.duplicati.length +
    report.entrate.duplicati.length +
    report.prelievi.duplicati.length;

  console.log(`Fatture:  ${report.fatture.totali} totali | ${report.fatture.duplicati.length} gruppi duplicati`);
  console.log(`Uscite:   ${report.uscite.totali} totali | ${report.uscite.duplicati.length} gruppi duplicati`);
  console.log(`Entrate:  ${report.entrate.totali} totali | ${report.entrate.duplicati.length} gruppi duplicati`);
  console.log(`Prelievi: ${report.prelievi.totali} totali | ${report.prelievi.duplicati.length} gruppi duplicati`);
  console.log('');

  if (totDuplicati > 0) {
    console.log(`⚠️  TOTALE: ${totDuplicati} gruppi di duplicati da rimuovere\n`);
    console.log('💡 Per rimuovere i duplicati, esegui:');
    console.log('   node scripts/rimuovi-duplicati.mjs\n');
  } else {
    console.log('✅ Nessun duplicato trovato in nessuna tabella!\n');
  }

  return report;
}

verificaTutteLeTabelle().catch(err => {
  console.error('❌ Errore:', err);
  process.exit(1);
});
