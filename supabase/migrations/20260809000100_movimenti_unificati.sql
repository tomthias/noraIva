-- Fase 1 del piano di semplificazione: fondamenta dati.
--
-- Additiva: NON tocca `prelievi`, `uscite`, `entrate`, che restano finché la
-- verifica non è completata (Fase 5 le rinomina in *_legacy).
--
-- Convenzioni:
-- * `movimenti.importo` ha SEGNO: entrate > 0, uscite < 0. Le tre tabelle
--   vecchie tenevano tutte importi positivi e il segno era implicito nella
--   tabella; con una tabella sola il segno deve stare nel dato.
-- * `movimenti.data` è la data VALUTA (per l'import BBVA, colonna B), coerente
--   con il principio di cassa già usato da `fatture.data`.

-- ---------------------------------------------------------------------------
-- movimenti — sostituisce prelievi + uscite + entrate
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.movimenti (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  data DATE NOT NULL,
  descrizione TEXT NOT NULL,
  categoria TEXT,
  importo DECIMAL(12, 2) NOT NULL,
  fonte TEXT NOT NULL DEFAULT 'manuale',
  -- Chiave di dedup degli import (sha256 di data|importo|saldo|osservazioni).
  import_hash TEXT,
  -- Colonna "Disponibile" dell'estratto: saldo del conto dopo il movimento.
  saldo_dopo DECIMAL(12, 2),
  -- Data contabile dell'estratto (colonna C). Può essere futura rispetto alla
  -- data valuta; serve solo a ricostruire l'ordine reale dei movimenti.
  data_contabile DATE,
  escludi_da_grafico BOOLEAN NOT NULL DEFAULT false,
  note TEXT,
  -- Collega un incasso a una fattura registrata (Fase 2, §3.5).
  fattura_id UUID REFERENCES public.fatture(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT movimenti_fonte_valida CHECK (fonte IN ('manuale', 'import_bbva', 'migrazione'))
);

-- Un movimento già importato non entra due volte. NULL non collide con NULL in
-- un indice unique, quindi i movimenti manuali (import_hash NULL) sono liberi.
CREATE UNIQUE INDEX IF NOT EXISTS idx_movimenti_import_hash
  ON public.movimenti(user_id, import_hash)
  WHERE import_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_movimenti_user_data ON public.movimenti(user_id, data DESC);

-- ---------------------------------------------------------------------------
-- rettifiche_incassi — escono da localStorage, si sincronizzano fra dispositivi
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rettifiche_incassi (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  anno INT NOT NULL,
  -- Incassato che le fatture registrate NON rappresentano. Si SOMMA.
  importo DECIMAL(12, 2) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, anno)
);

-- ---------------------------------------------------------------------------
-- stime_fiscozen — check di coerenza, non fonte di calcolo (Fase 3)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stime_fiscozen (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  -- Anno in cui si PAGA ("nel 2026 pagherai fra X e Y"), non l'anno d'imposta.
  anno_pagamento INT NOT NULL,
  tasse_min DECIMAL(12, 2),
  tasse_max DECIMAL(12, 2),
  -- "I tuoi incassi" secondo Fiscozen, per l'anno d'imposta corrispondente.
  incassato_dichiarato DECIMAL(12, 2),
  aggiornato_il DATE,
  PRIMARY KEY (user_id, anno_pagamento)
);

-- ---------------------------------------------------------------------------
-- regole_categorie — categorizzazione appresa dall'import (Fase 2)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.regole_categorie (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  -- Match case-insensitive su "Parola chiave" + descrizione + osservazioni.
  pattern TEXT NOT NULL,
  categoria TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, pattern)
);

-- ---------------------------------------------------------------------------
-- import_estratti — storico degli import e ANCORA del saldo (Fase 2, §3.6)
-- ---------------------------------------------------------------------------
-- Il saldo di banca non si deduce riordinando i movimenti: lo si registra qui
-- al momento dell'import, letto dalla riga più recente del file. Così l'ancora
-- resta esatta anche se due movimenti condividono la stessa data.
CREATE TABLE IF NOT EXISTS public.import_estratti (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nome_file TEXT,
  -- Data valuta del movimento più recente del file: da qui in poi contano i
  -- movimenti manuali aggiunti a mano.
  data_saldo DATE NOT NULL,
  saldo DECIMAL(12, 2) NOT NULL,
  movimenti_nuovi INT NOT NULL DEFAULT 0,
  movimenti_saltati INT NOT NULL DEFAULT 0,
  importato_il TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_import_estratti_user_data
  ON public.import_estratti(user_id, data_saldo DESC);

-- ---------------------------------------------------------------------------
-- preferenze — un valore per chiave, sincronizzato (cuscinetto, ecc.)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.preferenze (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  chiave TEXT NOT NULL,
  valore JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, chiave)
);

-- ---------------------------------------------------------------------------
-- RLS — identiche alle tabelle esistenti: ognuno vede solo le proprie righe
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'movimenti', 'rettifiche_incassi', 'stime_fiscozen',
    'regole_categorie', 'import_estratti', 'preferenze'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    EXECUTE format($f$
      CREATE POLICY "Users can view their own %1$s" ON public.%1$I
        FOR SELECT USING (auth.uid() = user_id)
    $f$, t);
    EXECUTE format($f$
      CREATE POLICY "Users can insert their own %1$s" ON public.%1$I
        FOR INSERT WITH CHECK (auth.uid() = user_id)
    $f$, t);
    EXECUTE format($f$
      CREATE POLICY "Users can update their own %1$s" ON public.%1$I
        FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)
    $f$, t);
    EXECUTE format($f$
      CREATE POLICY "Users can delete their own %1$s" ON public.%1$I
        FOR DELETE USING (auth.uid() = user_id)
    $f$, t);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Trigger updated_at (la funzione esiste già da schema.sql)
-- ---------------------------------------------------------------------------
CREATE TRIGGER update_movimenti_updated_at
  BEFORE UPDATE ON public.movimenti
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rettifiche_incassi_updated_at
  BEFORE UPDATE ON public.rettifiche_incassi
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_preferenze_updated_at
  BEFORE UPDATE ON public.preferenze
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
