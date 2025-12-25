# Setup Supabase - Guida Completa

Questa guida ti aiuterà a configurare completamente Supabase per l'applicazione di gestione fatture.

## Step 1: Esegui lo Schema SQL

1. Vai al tuo progetto Supabase: https://app.supabase.com/project/mrrzgtdsaezvuugmemxd
2. Nel menu laterale sinistro, clicca su **SQL Editor**
3. Clicca su **New Query**
4. Apri il file `supabase/schema.sql` e copia tutto il contenuto
5. Incolla il contenuto nell'editor SQL di Supabase
6. Clicca su **Run** (o premi Ctrl/Cmd + Enter)

Dovresti vedere un messaggio di successo. Lo schema avrà creato:
- ✅ Tabella `fatture` con campi: id, user_id, data, descrizione, cliente, importo_lordo, note
- ✅ Tabella `prelievi` con campi: id, user_id, data, descrizione, importo, note
- ✅ Tabella `uscite` con campi: id, user_id, data, descrizione, categoria, importo, note
- ✅ Row Level Security (RLS) abilitato su tutte le tabelle
- ✅ Policies per proteggere i dati (ogni utente vede solo i propri dati)
- ✅ Indici per performance ottimali
- ✅ Triggers per aggiornamento automatico di `updated_at`

## Step 2: Verifica le Tabelle

1. Nel menu laterale, clicca su **Table Editor**
2. Dovresti vedere le tre tabelle:
   - `fatture`
   - `prelievi`
   - `uscite`
3. Clicca su ciascuna tabella per verificare la struttura

## Step 3: Configura l'Autenticazione Email

1. Nel menu laterale, clicca su **Authentication** > **Providers**
2. Verifica che **Email** sia abilitato (di default lo è)
3. Opzionale: Configura altri provider (Google, GitHub, etc.)

### Importante: Configurazione Email

Per l'ambiente di sviluppo, Supabase usa email di test. Per produzione:

1. Vai su **Authentication** > **Email Templates**
2. Personalizza i template di:
   - Conferma registrazione
   - Reset password
   - Magic link

3. Configura SMTP (opzionale per produzione):
   - Vai su **Settings** > **Auth** > **SMTP Settings**
   - Configura il tuo server SMTP

## Step 4: Verifica le Environment Variables

Assicurati che il file `.env` contenga:

```
VITE_SUPABASE_URL=https://mrrzgtdsaezvuugmemxd.supabase.co
VITE_SUPABASE_ANON_KEY=<tua-anon-key>
```

## Step 5: Testa l'Applicazione

1. Avvia l'app in locale: `npm run dev`
2. Dovresti vedere la schermata di login/registrazione
3. Crea un nuovo account con email e password
4. Controlla la tua email per il link di conferma (in dev mode puoi trovarlo nei log di Supabase)
5. Una volta confermato, accedi all'app

## Come Funziona la Sicurezza (Row Level Security)

Ogni tabella ha policies RLS che garantiscono:

- **SELECT**: Un utente vede solo le righe dove `user_id` = suo ID
- **INSERT**: Un utente può inserire solo righe con il proprio `user_id`
- **UPDATE**: Un utente può modificare solo le righe con il proprio `user_id`
- **DELETE**: Un utente può eliminare solo le righe con il proprio `user_id`

Questo significa che anche se qualcuno ottenesse la ANON KEY, non potrebbe vedere o modificare i dati di altri utenti.

## Verifica RLS (Opzionale)

Per testare che le policies funzionino correttamente:

1. Crea 2 account diversi
2. Inserisci fatture da entrambi gli account
3. Verifica che ogni utente veda solo le proprie fatture

## Troubleshooting

### Email di conferma non arriva

In development, Supabase usa email di test. Puoi:
- Controllare i log in **Authentication** > **Users** > clicca sull'utente > vedi link di conferma
- Oppure disabilita la conferma email: **Authentication** > **Settings** > disabilita "Enable email confirmations"

### Errore "row level security policy violation"

Le policies RLS stanno funzionando! Assicurati di essere autenticato e che il `user_id` nelle queries sia corretto.

### Dati non si caricano

1. Verifica di essere loggato
2. Apri Console → Network → controlla le chiamate API a Supabase
3. Verifica che le tabelle esistano in **Table Editor**

## Migrazione da localStorage

Se hai dati in localStorage da una versione precedente, questi NON saranno automaticamente migrati. Dovrai:
1. Esportare i dati dal localStorage (puoi usare la console del browser)
2. Crearli manualmente attraverso l'interfaccia

## Backup Automatici

Supabase fa backup automatici del database. Puoi trovarli in:
- **Settings** > **Database** > **Backups**

## Prossimi Passi

- [ ] Eseguire schema SQL
- [ ] Verificare tabelle create
- [ ] Testare registrazione nuovo utente
- [ ] Testare login
- [ ] Creare alcune fatture di test
- [ ] Verificare che i dati vengano salvati correttamente
- [ ] Testare prelievi e uscite
- [ ] Fare deploy su produzione
