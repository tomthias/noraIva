# Password Accesso Temporanea

**ATTENZIONE:** Questo è un sistema di autenticazione temporaneo per proteggere i dati sensibili fino all'implementazione di Supabase.

## Credenziali

**Password:** `ForfettarioIVA2025!@#$`

## Funzionamento

- La password è hardcoded in `src/hooks/useAuth.ts`
- L'autenticazione è salvata in `sessionStorage` (si cancella chiudendo il browser)
- Il componente `Login` (`src/components/Login.tsx`) gestisce la schermata di accesso
- Il bottone "Esci" nell'header permette il logout

## Rimozione

Quando si implementa Supabase:
1. Eliminare `src/hooks/useAuth.ts`
2. Eliminare `src/components/Login.tsx`
3. Rimuovere import e logica di auth da `src/App.tsx`
4. Implementare auth di Supabase
5. Eliminare questo file

## Sicurezza

⚠️ **IMPORTANTE**: Questo sistema NON è sicuro per produzione. È solo una protezione temporanea a livello frontend. La password è visibile nel codice sorgente. Da usare solo fino all'implementazione di un sistema di autenticazione reale con Supabase.
