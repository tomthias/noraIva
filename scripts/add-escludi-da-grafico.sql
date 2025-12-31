-- ====================================================================
-- SQL per aggiungere campo escludi_da_grafico alle tabelle entrate e uscite
-- ====================================================================
--
-- ISTRUZIONI:
-- 1. Aprire Supabase Dashboard → SQL Editor
-- 2. Copiare e incollare questo script
-- 3. Eseguire lo script
-- 4. Verificare con le query di test in fondo
--
-- ====================================================================

-- Aggiungere campo escludi_da_grafico alla tabella entrate
ALTER TABLE public.entrate
ADD COLUMN IF NOT EXISTS escludi_da_grafico BOOLEAN DEFAULT FALSE;

-- Aggiungere campo escludi_da_grafico alla tabella uscite
ALTER TABLE public.uscite
ADD COLUMN IF NOT EXISTS escludi_da_grafico BOOLEAN DEFAULT FALSE;

-- Aggiungere indici per performance (query più veloci)
CREATE INDEX IF NOT EXISTS idx_entrate_escludi
ON public.entrate(escludi_da_grafico)
WHERE escludi_da_grafico = TRUE;

CREATE INDEX IF NOT EXISTS idx_uscite_escludi
ON public.uscite(escludi_da_grafico)
WHERE escludi_da_grafico = TRUE;

-- ====================================================================
-- QUERY DI VERIFICA
-- ====================================================================

-- Verifica che la colonna sia stata aggiunta correttamente
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'entrate'
  AND column_name = 'escludi_da_grafico';

SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'uscite'
  AND column_name = 'escludi_da_grafico';

-- Verifica che gli indici siano stati creati
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename IN ('entrate', 'uscite')
  AND indexname LIKE '%escludi%';

-- ====================================================================
-- COMANDI PER ROLLBACK (se necessario)
-- ====================================================================

-- DROP INDEX IF EXISTS idx_entrate_escludi;
-- DROP INDEX IF EXISTS idx_uscite_escludi;
-- ALTER TABLE public.entrate DROP COLUMN IF EXISTS escludi_da_grafico;
-- ALTER TABLE public.uscite DROP COLUMN IF EXISTS escludi_da_grafico;
