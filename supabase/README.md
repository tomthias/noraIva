# Supabase Database Setup

## Step 1: Esegui lo Schema SQL

1. Vai al tuo progetto Supabase: https://app.supabase.com/project/mrrzgtdsaezvuugmemxd
2. Nel menu laterale, clicca su **SQL Editor**
3. Clicca su **New Query**
4. Copia tutto il contenuto di `schema.sql` e incollalo nell'editor
5. Clicca su **Run** (o premi Ctrl/Cmd + Enter)

Lo schema creerà:
- Tabella `fatture` con tutti i campi necessari
- Tabella `prelievi` per i prelievi/stipendi
- Tabella `uscite` per le spese
- Row Level Security (RLS) policies per proteggere i dati per utente
- Indici per performance
- Triggers per aggiornamento automatico di `updated_at`

## Step 2: Configura l'Autenticazione

1. Nel menu laterale, clicca su **Authentication** > **Providers**
2. Abilita **Email** provider (già dovrebbe essere abilitato di default)
3. Opzionale: Configura altri provider (Google, GitHub, etc.)

## Step 3: Verifica le Tabelle

1. Nel menu laterale, clicca su **Table Editor**
2. Dovresti vedere le tabelle:
   - `fatture`
   - `prelievi`
   - `uscite`

## Step 4: Testa le Policies RLS

Le policies garantiscono che ogni utente possa vedere solo i propri dati:
- SELECT: visualizza solo le proprie righe
- INSERT: può inserire solo con il proprio user_id
- UPDATE: può modificare solo le proprie righe
- DELETE: può eliminare solo le proprie righe

## Note Importanti

- **Row Level Security** è abilitato su tutte le tabelle
- Ogni tabella ha `user_id` che referenzia `auth.users(id)`
- I dati sono automaticamente filtrati per l'utente corrente
- `created_at` e `updated_at` sono gestiti automaticamente
