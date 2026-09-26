-- Archivio delle tabelle che la logica di settembre 2026 non legge più.
--
-- NON è in `supabase/migrations/` di proposito: si lancia a mano dall'SQL
-- editor, dopo aver verificato l'app sui dati ricostruiti. Le tabelle vengono
-- RINOMINATE, non eliminate; tornare indietro è il rename al contrario.
--
--   rettifiche_incassi → sostituite da fatture.data (data di incasso reale)
--   stime_fiscozen     → sostituite dallo scadenzario F24 (importi reali)

BEGIN;
ALTER TABLE IF EXISTS public.rettifiche_incassi RENAME TO rettifiche_incassi_legacy;
ALTER TABLE IF EXISTS public.stime_fiscozen RENAME TO stime_fiscozen_legacy;
COMMENT ON TABLE public.rettifiche_incassi_legacy IS
  'Non più usata da settembre 2026: gli incassi vengono da fatture.data.';
COMMENT ON TABLE public.stime_fiscozen_legacy IS
  'Non più usata da settembre 2026: le tasse vengono dallo scadenzario F24.';
COMMIT;

-- Per tornare indietro:
-- ALTER TABLE public.rettifiche_incassi_legacy RENAME TO rettifiche_incassi;
-- ALTER TABLE public.stime_fiscozen_legacy RENAME TO stime_fiscozen;
