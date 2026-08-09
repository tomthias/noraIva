/**
 * Fase 1 — porta su Supabase i valori che finora vivevano nel codice o in
 * localStorage: la rettifica incassi 2026 e le stime Fiscozen di oggi.
 *
 *   node --env-file=.env scripts/seed-rettifiche-e-stime.mjs --dry-run
 *   node --env-file=.env scripts/seed-rettifiche-e-stime.mjs [--user <uuid>]
 *
 * È un SEED, non un override: scrive solo le righe che non esistono già, così
 * rieseguirlo non cancella una correzione fatta dall'app.
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const DRY_RUN = process.argv.includes('--dry-run');
const USER_ARG = process.argv[process.argv.indexOf('--user') + 1];
const USER_ID = process.argv.includes('--user') ? USER_ARG : process.env.SUPABASE_USER_ID;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Servono VITE_SUPABASE_URL e SUPABASE_SERVICE_KEY (usa --env-file=.env)');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/** Da `RETTIFICHE_INCASSI_INIZIALI` in constants/fiscali.ts. */
const RETTIFICHE = [
  { anno: 2026, importo: 8460 },
];

/**
 * Stime Fiscozen di oggi (08/2026). `anno_pagamento` è l'anno in cui si paga,
 * non l'anno d'imposta: "nel 2026 pagherai fra 4.600 e 5.200".
 */
const STIME = [
  {
    anno_pagamento: 2026,
    tasse_min: 4600,
    tasse_max: 5200,
    incassato_dichiarato: 52924,
    aggiornato_il: '2026-08-08',
  },
  {
    anno_pagamento: 2027,
    tasse_min: 12600,
    tasse_max: 14000,
    incassato_dichiarato: null,
    aggiornato_il: '2026-08-08',
  },
];

/** L'utente con più fatture: è quello vero, gli altri sono account di prova. */
async function utentePrincipale() {
  if (USER_ID) return USER_ID;

  const { data, error } = await supabase.from('fatture').select('user_id');
  if (error) throw new Error(`Lettura fatture fallita: ${error.message}`);

  const conteggio = {};
  for (const r of data) conteggio[r.user_id] = (conteggio[r.user_id] ?? 0) + 1;

  const ordinati = Object.entries(conteggio).sort((a, b) => b[1] - a[1]);
  if (ordinati.length === 0) throw new Error('Nessun utente con fatture: passa --user <uuid>');

  const [id, n] = ordinati[0];
  console.log(`👤 Utente scelto: ${id} (${n} fatture)`);
  if (ordinati.length > 1) {
    console.log(`   Altri utenti ignorati: ${ordinati.slice(1).map(([u, c]) => `${u} (${c})`).join(', ')}`);
  }
  return id;
}

async function seedTabella(tabella, chiave, righe, userId) {
  const { data: esistenti, error } = await supabase
    .from(tabella)
    .select(chiave)
    .eq('user_id', userId);

  if (error) throw new Error(`Lettura di ${tabella} fallita: ${error.message}`);

  const gia = new Set(esistenti.map((r) => String(r[chiave])));
  const nuove = righe.filter((r) => !gia.has(String(r[chiave])));

  if (nuove.length === 0) {
    console.log(`⏭️  ${tabella}: già presenti (${[...gia].join(', ') || 'nessuna'}), niente da fare`);
    return;
  }

  console.log(`➕ ${tabella}: ${nuove.map((r) => r[chiave]).join(', ')}`);
  if (DRY_RUN) return;

  const { error: insertError } = await supabase
    .from(tabella)
    .insert(nuove.map((r) => ({ ...r, user_id: userId })));

  if (insertError) throw new Error(`Scrittura in ${tabella} fallita: ${insertError.message}`);
}

async function seed() {
  console.log(`🌱 SEED rettifiche e stime${DRY_RUN ? ' (DRY RUN)' : ''}\n`);

  const userId = await utentePrincipale();

  await seedTabella('rettifiche_incassi', 'anno', RETTIFICHE, userId);
  await seedTabella('stime_fiscozen', 'anno_pagamento', STIME, userId);

  console.log('\n✅ Seed completato\n');
}

seed().catch((err) => {
  console.error('❌ Errore:', err.message || err);
  process.exit(1);
});
