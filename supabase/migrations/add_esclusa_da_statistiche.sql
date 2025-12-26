-- Migrazione: Aggiunge il campo esclusa_da_statistiche alla tabella uscite
-- Data: 2025-12-26
-- Descrizione: Permette di escludere specifiche uscite dai grafici mantenendole nei totali

-- Aggiungi colonna se non esiste
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'uscite'
    AND column_name = 'esclusa_da_statistiche'
  ) THEN
    ALTER TABLE public.uscite
    ADD COLUMN esclusa_da_statistiche BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Commento sulla colonna
COMMENT ON COLUMN public.uscite.esclusa_da_statistiche IS
'Se TRUE, l''uscita non compare nei grafici ma viene conteggiata nei totali delle uscite';
