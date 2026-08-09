/**
 * Backup completo delle tabelle prima di qualsiasi migrazione.
 *
 *   node --env-file=.env scripts/backup-database.mjs
 *
 * Salva un file per tabella in `scripts/backup/` (gitignorato). Dumpa TUTTI
 * gli utenti, non solo il proprio: le migrazioni toccano l'intera tabella e un
 * backup parziale non permetterebbe di ripristinarla.
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const TABELLE = [
  'fatture',
  'prelievi',
  'uscite',
  'entrate',
  // Presenti solo dopo la migrazione della Fase 1: se mancano si salta.
  'movimenti',
  'rettifiche_incassi',
  'stime_fiscozen',
  'regole_categorie',
  'import_estratti',
  'preferenze',
];

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Servono VITE_SUPABASE_URL e SUPABASE_SERVICE_KEY (usa --env-file=.env)');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
const dir = path.join('scripts', 'backup', timestamp);

async function backupDatabase() {
  console.log(`💾 BACKUP DATABASE → ${dir}\n`);
  fs.mkdirSync(dir, { recursive: true });

  let totale = 0;
  for (const tabella of TABELLE) {
    const { data, error } = await supabase.from(tabella).select('*');

    if (error) {
      // Tabella non ancora creata: non è un errore, la si salta.
      // 42P01 = Postgres "relation does not exist"; PGRST205 = PostgREST non la
      // trova nella schema cache (stesso caso, visto dal lato REST).
      if (error.code === '42P01' || error.code === 'PGRST205') {
        console.log(`⏭️  ${tabella}: non esiste ancora, salto`);
        continue;
      }
      throw new Error(`${tabella}: ${error.message}`);
    }

    fs.writeFileSync(path.join(dir, `${tabella}.json`), JSON.stringify(data, null, 2));
    totale += data.length;
    console.log(`✅ ${tabella}: ${data.length} record`);
  }

  console.log(`\n✅ BACKUP COMPLETATO — ${totale} record in ${dir}\n`);
}

backupDatabase().catch((err) => {
  console.error('❌ Errore:', err.message);
  process.exit(1);
});
