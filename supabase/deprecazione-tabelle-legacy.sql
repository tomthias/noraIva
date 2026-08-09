-- Fase 5 — deprecazione delle tabelle sostituite da `movimenti`.
--
-- NON è in `supabase/migrations/` DI PROPOSITO: non deve partire da sola con
-- un `supabase db push`. Va lanciata a mano, dall'SQL editor di Supabase o con
-- psql, e solo dopo aver verificato che tutto funzioni sulla tabella unica.
--
-- Prima di eseguirla, in quest'ordine:
--
--   1. node --env-file=.env scripts/backup-database.mjs
--   2. node --env-file=.env scripts/verifica-fase1.mjs     ← deve dire VERIFICA SUPERATA
--   3. usare l'app per qualche giorno: dashboard, movimenti, analisi, import
--
-- Le tabelle vengono RINOMINATE, non eliminate: `prelievi_legacy`,
-- `uscite_legacy`, `entrate_legacy`. I dati restano lì, leggibili, e tornare
-- indietro è un rename al contrario (in fondo al file).

BEGIN;

ALTER TABLE IF EXISTS public.prelievi RENAME TO prelievi_legacy;
ALTER TABLE IF EXISTS public.uscite   RENAME TO uscite_legacy;
ALTER TABLE IF EXISTS public.entrate  RENAME TO entrate_legacy;

-- Un commento sulla tabella dice a chi la trova fra un anno cos'è e perché.
COMMENT ON TABLE public.prelievi_legacy IS
  'Sostituita da public.movimenti (Fase 1, agosto 2026). Sola lettura: i prelievi sono i movimenti con importo < 0 e categoria Stipendi.';
COMMENT ON TABLE public.uscite_legacy IS
  'Sostituita da public.movimenti (Fase 1, agosto 2026). Sola lettura: le uscite sono i movimenti con importo < 0.';
COMMENT ON TABLE public.entrate_legacy IS
  'Sostituita da public.movimenti (Fase 1, agosto 2026). Sola lettura: le entrate sono i movimenti con importo >= 0.';

COMMIT;

-- ---------------------------------------------------------------------------
-- Per tornare indietro:
--
--   BEGIN;
--   ALTER TABLE public.prelievi_legacy RENAME TO prelievi;
--   ALTER TABLE public.uscite_legacy   RENAME TO uscite;
--   ALTER TABLE public.entrate_legacy  RENAME TO entrate;
--   COMMIT;
--
-- Nota: dopo il rename, `scripts/verifica-fase1.mjs` non trova più le tabelle
-- di origine e fallisce. È atteso — a quel punto non c'è più niente da
-- verificare, la copia è la sola fonte.
-- ---------------------------------------------------------------------------
