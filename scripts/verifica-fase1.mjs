/**
 * Fase 1 — verifica che la tabella `movimenti` sia una copia fedele delle tre
 * tabelle di partenza, campo per campo e non solo nei totali.
 *
 *   node --env-file=.env scripts/verifica-fase1.mjs
 *
 * Confronta ogni riga con il movimento che ha lo stesso id e ricostruisce le
 * tre viste (prelievi / uscite / entrate) con la stessa regola dell'app:
 *
 *     importo < 0 e categoria Stipendio → prelievo
 *     importo < 0                       → uscita
 *     importo >= 0                      → entrata
 *
 * Se questa verifica passa, ogni numero calcolato a valle — cash disponibile,
 * accantonamento, grafici — non può che essere identico: gli ingressi sono gli
 * stessi. Exit code 1 al primo scostamento.
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Servono VITE_SUPABASE_URL e SUPABASE_SERVICE_KEY (usa --env-file=.env)');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const CATEGORIA_STIPENDIO = 'Stipendio';
const isStipendio = (c) => !!c && /^stipendi[oi]?$/i.test(c.trim());
const arrotonda = (n) => Math.round(n * 100) / 100;

async function leggiTutto(tabella) {
  const { data, error } = await supabase.from(tabella).select('*');
  if (error) throw new Error(`Lettura di ${tabella} fallita: ${error.message}`);
  return data;
}

function tipoDi(m) {
  if (Number(m.importo) >= 0) return 'entrata';
  return isStipendio(m.categoria) ? 'prelievo' : 'uscita';
}

const problemi = [];
const segnala = (msg) => problemi.push(msg);

/** Confronta una riga di origine con il movimento che ne è nato. */
function confrontaRiga(origine, tabella, movimento, tipoAtteso) {
  if (!movimento) {
    segnala(`${tabella}/${origine.id}: nessun movimento con questo id`);
    return;
  }

  const campi = [
    ['data', origine.data, movimento.data],
    ['descrizione', origine.descrizione, movimento.descrizione],
    ['note', origine.note ?? null, movimento.note ?? null],
    ['importo', arrotonda(Math.abs(Number(origine.importo))), arrotonda(Math.abs(Number(movimento.importo)))],
  ];

  // I prelievi non avevano categoria né escludi_da_grafico: acquistano
  // 'Stipendio' e false per costruzione, non c'è niente da confrontare.
  if (tabella !== 'prelievi') {
    campi.push(['categoria', origine.categoria ?? null, movimento.categoria ?? null]);
    campi.push([
      'escludi_da_grafico',
      origine.escludi_da_grafico ?? false,
      movimento.escludi_da_grafico ?? false,
    ]);
  } else if (movimento.categoria !== CATEGORIA_STIPENDIO) {
    segnala(`prelievi/${origine.id}: categoria "${movimento.categoria}" invece di "${CATEGORIA_STIPENDIO}"`);
  }

  for (const [nome, atteso, ottenuto] of campi) {
    if (atteso !== ottenuto) {
      segnala(`${tabella}/${origine.id}: ${nome} "${atteso}" → "${ottenuto}"`);
    }
  }

  const tipoOttenuto = tipoDi(movimento);
  if (tipoOttenuto !== tipoAtteso) {
    segnala(`${tabella}/${origine.id}: sarebbe letto come ${tipoOttenuto}, non ${tipoAtteso}`);
  }
}

async function verifica() {
  console.log('🔎 VERIFICA FASE 1 — movimenti vs tabelle di origine\n');

  const [entrate, uscite, prelievi, movimenti] = await Promise.all([
    leggiTutto('entrate'),
    leggiTutto('uscite'),
    leggiTutto('prelievi'),
    leggiTutto('movimenti'),
  ]);

  const perId = new Map(movimenti.map((m) => [m.id, m]));

  for (const r of entrate) confrontaRiga(r, 'entrate', perId.get(r.id), 'entrata');
  for (const r of uscite) confrontaRiga(r, 'uscite', perId.get(r.id), 'uscita');
  for (const r of prelievi) confrontaRiga(r, 'prelievi', perId.get(r.id), 'prelievo');

  const attesi = entrate.length + uscite.length + prelievi.length;
  const idOrigine = new Set([...entrate, ...uscite, ...prelievi].map((r) => r.id));
  const orfani = movimenti.filter((m) => !idOrigine.has(m.id));

  console.log(`Righe di origine: ${attesi} (${entrate.length} entrate, ${uscite.length} uscite, ${prelievi.length} prelievi)`);
  console.log(`Movimenti in tabella: ${movimenti.length}`);

  // I movimenti creati dopo la migrazione (a mano o da import) sono legittimi:
  // vanno elencati, non contati come errore.
  if (orfani.length > 0) {
    console.log(`\nℹ️  ${orfani.length} movimenti senza riga di origine (creati dopo la migrazione):`);
    for (const m of orfani.slice(0, 10)) {
      console.log(`   ${m.data}  ${String(m.importo).padStart(10)}  ${m.descrizione} [${m.fonte}]`);
    }
    if (orfani.length > 10) console.log(`   … e altri ${orfani.length - 10}`);
  }

  const conteggi = movimenti.reduce((acc, m) => {
    const t = tipoDi(m);
    acc[t] = (acc[t] ?? 0) + 1;
    return acc;
  }, {});
  console.log(
    `\nViste ricostruite: ${conteggi.prelievo ?? 0} prelievi, ` +
    `${conteggi.uscita ?? 0} uscite, ${conteggi.entrata ?? 0} entrate`
  );

  if (problemi.length > 0) {
    console.error(`\n❌ ${problemi.length} scostamenti:`);
    for (const p of problemi.slice(0, 50)) console.error(`   ${p}`);
    if (problemi.length > 50) console.error(`   … e altri ${problemi.length - 50}`);
    console.error('\n   Le tabelle vecchie sono intatte: nessun dato perso.');
    process.exit(1);
  }

  console.log('\n✅ VERIFICA SUPERATA — ogni riga di origine ha il suo movimento, identico campo per campo\n');
}

verifica().catch((err) => {
  console.error('❌ Errore:', err.message || err);
  process.exit(1);
});
