/**
 * Copia `entrate` + `uscite` + `prelievi` nella tabella unificata `movimenti`.
 *
 *   node --env-file=.env scripts/backup-database.mjs      # obbligatorio prima
 *   node --env-file=.env scripts/migra-movimenti-unificati.mjs --dry-run
 *   node --env-file=.env scripts/migra-movimenti-unificati.mjs
 *
 * È ADDITIVA: le tabelle vecchie non vengono toccate. Se `movimenti` contiene
 * già righe di fonte 'migrazione' lo script si ferma, per non duplicare.
 *
 * Regole di conversione:
 * - entrate  → importo POSITIVO, categoria invariata
 * - uscite   → importo NEGATIVO, categoria invariata
 * - prelievi → importo NEGATIVO, categoria 'Stipendio' (non ce l'avevano:
 *              nelle vecchie tabelle il tipo stava nel nome della tabella)
 *
 * Verifica finale obbligatoria: totali per anno e per categoria confrontati fra
 * vecchio e nuovo. Se divergono di più di un centesimo lo script esce con
 * errore e stampa le righe che non tornano.
 */
import { createClient } from '@supabase/supabase-js';

const DRY_RUN = process.argv.includes('--dry-run');
/** Deve restare allineata a CATEGORIA_STIPENDIO di src/constants/fiscali.ts. */
const CATEGORIA_STIPENDIO = 'Stipendi';
/** Sotto questa soglia due totali sono considerati uguali (arrotondamenti). */
const TOLLERANZA = 0.005;

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Servono VITE_SUPABASE_URL e SUPABASE_SERVICE_KEY (usa --env-file=.env)');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const leggi = async (tabella) => {
  const { data, error } = await supabase.from(tabella).select('*').order('data');
  if (error) throw new Error(`Lettura ${tabella}: ${error.message}`);
  return data;
};

/** Chiave di raggruppamento per la verifica: utente + anno + categoria. */
const chiave = (userId, data, categoria) =>
  `${userId}|${String(data).substring(0, 4)}|${categoria ?? '(nessuna)'}`;

const sommaPerChiave = (righe, segnoDi, categoriaDi) => {
  const totali = new Map();
  for (const r of righe) {
    const k = chiave(r.user_id, r.data, categoriaDi(r));
    const importo = Number(r.importo) * segnoDi(r);
    totali.set(k, (totali.get(k) ?? 0) + importo);
  }
  return totali;
};

async function migra() {
  console.log(`🔀 MIGRAZIONE → movimenti${DRY_RUN ? ' (DRY RUN)' : ''}\n`);

  const { data: giaMigrati, error: erroreCheck } = await supabase
    .from('movimenti')
    .select('id')
    .eq('fonte', 'migrazione')
    .limit(1);

  if (erroreCheck) {
    if (erroreCheck.code === '42P01' || erroreCheck.code === 'PGRST205') {
      throw new Error(
        'La tabella `movimenti` non esiste. Applica prima la migrazione SQL:\n' +
          '   supabase db push'
      );
    }
    throw new Error(erroreCheck.message);
  }

  if (giaMigrati.length > 0) {
    throw new Error(
      'In `movimenti` ci sono già righe di fonte "migrazione". Lo script è ' +
        'già stato eseguito: cancellale prima di rilanciarlo.'
    );
  }

  const [entrate, uscite, prelievi] = await Promise.all([
    leggi('entrate'),
    leggi('uscite'),
    leggi('prelievi'),
  ]);
  console.log(
    `📖 Letti: ${entrate.length} entrate, ${uscite.length} uscite, ${prelievi.length} prelievi`
  );

  const daInserire = [
    ...entrate.map((e) => ({
      user_id: e.user_id,
      data: e.data,
      descrizione: e.descrizione,
      categoria: e.categoria,
      importo: Number(e.importo),
      escludi_da_grafico: e.escludi_da_grafico ?? false,
      note: e.note,
      fonte: 'migrazione',
      created_at: e.created_at,
    })),
    ...uscite.map((u) => ({
      user_id: u.user_id,
      data: u.data,
      descrizione: u.descrizione,
      categoria: u.categoria,
      importo: -Number(u.importo),
      escludi_da_grafico: u.escludi_da_grafico ?? false,
      note: u.note,
      fonte: 'migrazione',
      created_at: u.created_at,
    })),
    ...prelievi.map((p) => ({
      user_id: p.user_id,
      data: p.data,
      descrizione: p.descrizione,
      categoria: CATEGORIA_STIPENDIO,
      importo: -Number(p.importo),
      escludi_da_grafico: false,
      note: p.note,
      fonte: 'migrazione',
      created_at: p.created_at,
    })),
  ];

  console.log(`📝 Da inserire: ${daInserire.length} movimenti`);

  if (DRY_RUN) {
    console.log('\n🔎 Dry run: nessuna scrittura. Anteprima dei primi 3:');
    console.log(JSON.stringify(daInserire.slice(0, 3), null, 2));
    return;
  }

  // Insert a blocchi: PostgREST fatica con payload molto grandi.
  const BLOCCO = 200;
  for (let i = 0; i < daInserire.length; i += BLOCCO) {
    const blocco = daInserire.slice(i, i + BLOCCO);
    const { error } = await supabase.from('movimenti').insert(blocco);
    if (error) throw new Error(`Insert blocco ${i / BLOCCO + 1}: ${error.message}`);
    console.log(`   ✅ inseriti ${Math.min(i + BLOCCO, daInserire.length)}/${daInserire.length}`);
  }

  await verifica({ entrate, uscite, prelievi });
}

/**
 * Confronta i totali per (utente, anno, categoria) fra tabelle vecchie e nuova.
 * Un solo centesimo di differenza fa fallire la migrazione.
 */
async function verifica({ entrate, uscite, prelievi }) {
  console.log('\n🔍 VERIFICA totali per anno e categoria\n');

  const attesi = new Map();
  const somma = (m) => {
    for (const [k, v] of m) attesi.set(k, (attesi.get(k) ?? 0) + v);
  };
  somma(sommaPerChiave(entrate, () => 1, (r) => r.categoria));
  somma(sommaPerChiave(uscite, () => -1, (r) => r.categoria));
  somma(sommaPerChiave(prelievi, () => -1, () => CATEGORIA_STIPENDIO));

  const { data: nuovi, error } = await supabase
    .from('movimenti')
    .select('*')
    .eq('fonte', 'migrazione');
  if (error) throw new Error(`Rilettura movimenti: ${error.message}`);

  const ottenuti = sommaPerChiave(nuovi, () => 1, (r) => r.categoria);

  const chiavi = [...new Set([...attesi.keys(), ...ottenuti.keys()])].sort();
  const divergenti = [];

  for (const k of chiavi) {
    const a = attesi.get(k) ?? 0;
    const o = ottenuti.get(k) ?? 0;
    const ok = Math.abs(a - o) < TOLLERANZA;
    if (!ok) divergenti.push({ k, a, o });
    console.log(
      `${ok ? '✅' : '❌'} ${k.padEnd(70)} vecchio ${a.toFixed(2).padStart(12)}  nuovo ${o.toFixed(2).padStart(12)}`
    );
  }

  const totVecchio = [...attesi.values()].reduce((s, v) => s + v, 0);
  const totNuovo = [...ottenuti.values()].reduce((s, v) => s + v, 0);
  console.log(
    `\n   TOTALE  vecchio ${totVecchio.toFixed(2)}   nuovo ${totNuovo.toFixed(2)}   ` +
      `righe ${entrate.length + uscite.length + prelievi.length} → ${nuovi.length}`
  );

  if (divergenti.length > 0 || nuovi.length !== entrate.length + uscite.length + prelievi.length) {
    throw new Error(
      `VERIFICA FALLITA: ${divergenti.length} gruppi divergenti. ` +
        'I dati vecchi sono intatti: cancella le righe fonte="migrazione" e indaga.'
    );
  }

  console.log('\n✅ MIGRAZIONE VERIFICATA — nessuna differenza\n');
}

migra().catch((err) => {
  console.error('\n❌', err.message);
  process.exit(1);
});
