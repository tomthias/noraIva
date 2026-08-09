/**
 * Backup completo delle tabelle dati prima di ogni migrazione.
 *
 *   node --env-file=.env scripts/backup-database.mjs
 *
 * Salva un file JSON per tabella in BACKUP_DIR (default `backups/`), con
 * timestamp nel nome. Copia TUTTE le righe di TUTTI gli utenti: un backup che
 * filtra per utente non è un backup.
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const BACKUP_DIR = process.env.BACKUP_DIR || 'backups';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Servono VITE_SUPABASE_URL e SUPABASE_SERVICE_KEY (usa --env-file=.env)');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/** Tabelle da salvare, con la colonna di ordinamento. */
const TABELLE = {
  fatture: 'data',
  prelievi: 'data',
  uscite: 'data',
  entrate: 'data',
  movimenti: 'data',
  rettifiche_incassi: 'anno',
};

/** Non esistono prima della Fase 1: la loro assenza non è un errore. */
const OPZIONALI = new Set(['movimenti', 'rettifiche_incassi']);

async function backupDatabase() {
  console.log('💾 BACKUP DATABASE\n');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  let totale = 0;

  for (const [tabella, colonnaOrdine] of Object.entries(TABELLE)) {
    const { data, error } = await supabase
      .from(tabella)
      .select('*')
      .order(colonnaOrdine, { ascending: true });

    if (error) {
      if (OPZIONALI.has(tabella)) {
        console.log(`⏭️  ${tabella}: non presente (ok, verrà creata dalla migrazione)`);
        continue;
      }
      throw new Error(`Backup di ${tabella} fallito: ${error.message}`);
    }

    const file = path.join(BACKUP_DIR, `backup-${tabella}-${timestamp}.json`);
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
    totale += data.length;
    console.log(`✅ ${tabella}: ${data.length} record → ${file}`);
  }

  console.log(`\n✅ BACKUP COMPLETATO — ${totale} record totali in ${BACKUP_DIR}/\n`);
}

backupDatabase().catch(err => {
  console.error('❌ Errore:', err.message || err);
  process.exit(1);
});
