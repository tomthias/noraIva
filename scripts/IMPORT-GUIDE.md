# Guida Import Movimenti Bancari

Questa guida spiega come importare i movimenti bancari dal CSV nel database Supabase.

## Prerequisiti

Prima di iniziare, assicurati di avere:

1. ✅ File CSV bancario (`movimenti.csv`) con le colonne:
   - `Data_valuta`, `Data`, `Concetto`, `Movimento`, `Importo`, `Valuta`, `Disponibile`, `Valuta_disponibile`, `Osservazioni`

2. ✅ File fatture (`fatture.csv`) con le colonne:
   - `Numero`, `Data`, `Cliente`, `Importo Lordo`, `IVA Status`, `Descrizione`

3. ✅ Accesso a Supabase Dashboard per recuperare le chiavi API

## Step 1: Aggiornare lo Schema Database

Esegui lo script SQL per aggiungere il campo `escludi_da_grafico` alle tabelle `entrate` e `uscite`.

1. Apri **Supabase Dashboard** → **SQL Editor**
2. Copia il contenuto del file [`scripts/add-escludi-da-grafico.sql`](./add-escludi-da-grafico.sql)
3. Incollalo nell'editor SQL e clicca **Run**
4. Verifica che non ci siano errori (dovresti vedere "Success. No rows returned")

## Step 2: Recuperare le Chiavi API

### Service Role Key (OBBLIGATORIA)

La **Service Role Key** è necessaria per bypassare le Row Level Security (RLS) policies durante l'import.

1. Vai su **Supabase Dashboard** → **Settings** → **API**
2. Nella sezione **Project API keys**, copia la chiave `service_role` (NON la `anon` key!)
3. Salva questa chiave in un posto sicuro (NON committarla mai nel repository)

### User ID

1. Vai su **Supabase Dashboard** → **Authentication** → **Users**
2. Clicca sul tuo utente e copia l'**UUID** (es. `a1b2c3d4-e5f6-7890-abcd-ef1234567890`)

## Step 3: Trasformare il CSV Bancario

Il CSV bancario ha un formato diverso da quello atteso dallo script di import. Usa lo script di trasformazione:

```bash
# Trasforma il CSV bancario nel formato corretto
node scripts/transform-movimenti-csv.mjs
```

Questo script:
- Legge il CSV bancario da `/Users/mattia/Desktop/noraiva conti/nuovo/movimenti.csv`
- Categorizza automaticamente i movimenti (entrate, uscite, prelievi)
- Genera `movimenti-trasformati.csv` nella root del progetto

### Verificare il CSV Trasformato

Dopo l'esecuzione, controlla il file `movimenti-trasformati.csv`:

```bash
head -n 10 movimenti-trasformati.csv
```

Dovresti vedere un output simile a:

```csv
DATA,DESCRIZIONE,IMPORTO,TIPO,CATEGORIA
2024-01-14,"Bonifico ricevuto - Fattura FT123",1500.00,ENTRATA,FATTURE
2024-01-15,"Bonifico eseguito - Stipendio Mattia Marinangeli",2000.00,USCITA,STIPENDI
2024-01-20,"Pagamento carta - Dovevivo affitto",800.00,USCITA,AFFITTO
```

## Step 4: Eseguire l'Import (Dry-Run)

Prima di importare realmente, esegui un **dry-run** per verificare che tutto sia corretto:

```bash
# Imposta le variabili d'ambiente
export SUPABASE_SERVICE_KEY="eyJ..."  # La tua Service Role Key
export SUPABASE_USER_ID="a1b2c3d4-e5f6-7890-abcd-ef1234567890"  # Il tuo User ID

# Esegui dry-run
node scripts/import-csv-data.mjs --dry-run
```

Lo script mostrerà cosa verrebbe importato **senza scrivere nel database**. Esempio output:

```
🚀 Avvio import dati da CSV a Supabase
User ID: a1b2c3d4-e5f6-7890-abcd-ef1234567890
Dry Run: SÌ

📄 Importando fatture...
[DRY-RUN] Importerei fattura: 2024-01-14 - Cliente ABC - €1500
[DRY-RUN] Importerei fattura: 2024-02-10 - Cliente XYZ - €2000
...

💸 Importando movimenti...
[DRY-RUN] Importerei entrate: 2024-01-20 - Rimborso - €100
[DRY-RUN] Importerei uscite: 2024-01-21 - Affitto - €800
[DRY-RUN] Importerei prelievi: 2024-01-22 - Stipendio - €2000
...

📊 RIEPILOGO IMPORT
Fatture:
  ✅ Importate: 12
  ⏭️  Saltate (duplicati): 0
  ❌ Errori: 0

Entrate:
  ✅ Importate: 5
  ⏭️  Saltate (duplicati): 0
  ❌ Errori: 0

Uscite:
  ✅ Importate: 78
  ⏭️  Saltate (duplicati): 0
  ❌ Errori: 0

Prelievi:
  ✅ Importati: 24
  ⏭️  Saltati (duplicati): 0
  ❌ Errori: 0
```

### Verificare l'Output del Dry-Run

Controlla:
- ✅ Nessun errore RLS (se vedi errori "new row violates row-level security", la Service Role Key è sbagliata)
- ✅ Le categorie assegnate sono corrette
- ✅ I totali corrispondono ai movimenti reali

## Step 5: Eseguire l'Import Reale

Se il dry-run è andato a buon fine, esegui l'import reale:

```bash
# IMPORTANTE: Assicurati che le variabili siano ancora impostate
export SUPABASE_SERVICE_KEY="eyJ..."
export SUPABASE_USER_ID="a1b2c3d4-e5f6-7890-abcd-ef1234567890"

# Esegui import REALE (senza --dry-run)
node scripts/import-csv-data.mjs
```

Lo script importerà tutti i dati nel database. L'output sarà simile al dry-run ma con modifiche reali al database.

## Step 6: Verificare i Dati Importati

### Verifica con SQL

Apri **Supabase Dashboard** → **SQL Editor** ed esegui:

```sql
-- Contare movimenti importati
SELECT
  'entrate' as tabella, COUNT(*) as totale
FROM entrate WHERE user_id = 'TUO_USER_ID'
UNION ALL
SELECT 'uscite', COUNT(*) FROM uscite WHERE user_id = 'TUO_USER_ID'
UNION ALL
SELECT 'prelievi', COUNT(*) FROM prelievi WHERE user_id = 'TUO_USER_ID'
UNION ALL
SELECT 'fatture', COUNT(*) FROM fatture WHERE user_id = 'TUO_USER_ID';

-- Verificare che escludi_da_grafico sia impostato correttamente
SELECT COUNT(*) as totale_esclusi
FROM entrate
WHERE escludi_da_grafico = TRUE
  AND user_id = 'TUO_USER_ID';

-- Verificare totali
SELECT
  (SELECT COALESCE(SUM(importo), 0) FROM entrate WHERE user_id = 'TUO_USER_ID') as totale_entrate,
  (SELECT COALESCE(SUM(importo), 0) FROM uscite WHERE user_id = 'TUO_USER_ID') as totale_uscite,
  (SELECT COALESCE(SUM(importo), 0) FROM prelievi WHERE user_id = 'TUO_USER_ID') as totale_prelievi,
  (SELECT COALESCE(SUM(importo_lordo), 0) FROM fatture WHERE user_id = 'TUO_USER_ID') as totale_fatture;
```

### Verifica sul Dashboard

1. Apri l'applicazione web
2. Vai alla sezione **Analisi** o **Cash Flow**
3. Verifica che:
   - ✅ Il saldo corrisponde ai movimenti reali
   - ✅ I grafici mostrano i dati corretti
   - ✅ I calcoli delle tasse sono basati sui dati reali (non stime)

## Troubleshooting

### Errore: "new row violates row-level security policy"

**Causa**: Stai usando la chiave `anon` invece della `service_role` key.

**Soluzione**:
1. Verifica di aver impostato `SUPABASE_SERVICE_KEY` con la **service_role** key (non la anon key)
2. La service_role key inizia con `eyJ` ed è molto lunga (circa 200+ caratteri)
3. Controlla con: `echo $SUPABASE_SERVICE_KEY` (dovresti vedere la chiave)

### Errore: "column escludi_da_grafico does not exist"

**Causa**: Non hai eseguito lo script SQL per aggiungere il campo al database.

**Soluzione**: Torna allo **Step 1** ed esegui lo script SQL.

### Movimenti categorizzati male

**Causa**: La logica di categorizzazione automatica non riconosce alcune descrizioni.

**Soluzione**:
1. Modifica la funzione `categorizzaMovimento` in [`scripts/transform-movimenti-csv.mjs`](./transform-movimenti-csv.mjs)
2. Aggiungi nuove parole chiave per le tue categorie
3. Riesegui lo script di trasformazione
4. Riesegui l'import (lo script salta automaticamente i duplicati)

### Import duplicati

**Causa**: Lo script controlla duplicati basandosi su `(data, descrizione, importo)`.

**Soluzione**: Lo script salta automaticamente i duplicati. Se vuoi reimportare tutto:
1. Cancella i dati esistenti dal database (Supabase Dashboard → Table Editor)
2. Riesegui l'import

## Note Importanti

- ⚠️ **NON committare** la Service Role Key nel repository (è un segreto!)
- ⚠️ Il campo `escludi_da_grafico` è impostato a `false` per tutti i movimenti importati
- ⚠️ Le fatture con categoria `FATTURE` vengono skippate dall'import movimenti (già importate da `fatture.csv`)
- ⚠️ I movimenti con categoria `STIPENDI` vengono importati nella tabella `prelievi` (non `uscite`)

## File Coinvolti

- [`scripts/add-escludi-da-grafico.sql`](./add-escludi-da-grafico.sql) - SQL per aggiungere campo al database
- [`scripts/transform-movimenti-csv.mjs`](./transform-movimenti-csv.mjs) - Trasforma CSV bancario
- [`scripts/import-csv-data.mjs`](./import-csv-data.mjs) - Import dati in Supabase
- [`src/types/database.ts`](../src/types/database.ts) - Types TypeScript aggiornati
- [`src/hooks/useSupabaseCashFlow.ts`](../src/hooks/useSupabaseCashFlow.ts) - Hook aggiornato con mapping

## Supporto

Se riscontri problemi, verifica:
1. ✅ Hai eseguito lo script SQL correttamente
2. ✅ Stai usando la **service_role** key (non anon)
3. ✅ Il file CSV trasformato è corretto
4. ✅ Il dry-run funziona senza errori

Per altri problemi, controlla i log di errore in [`scripts/import-errors.log`](./import-errors.log) (generato automaticamente in caso di errori).
