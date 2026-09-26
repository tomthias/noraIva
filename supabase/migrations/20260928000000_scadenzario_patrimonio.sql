-- Ricostruzione della logica di calcolo (settembre 2026).
--
-- Additiva e rieseguibile: aggiunge colonne e tabelle, non cancella niente.
-- Le tabelle che la nuova logica non legge più (rettifiche_incassi,
-- stime_fiscozen, import_estratti) restano dove sono finché non vengono
-- archiviate a mano, dopo la verifica.
--
-- Il modello nuovo ha tre fonti:
--   * movimenti          → la cassa (apertura + somma dei movimenti)
--   * fatture.data       → gli incassi, quindi le tasse
--   * scadenze_fiscali   → gli F24, una riga per tributo/tipo/anno

-- ---------------------------------------------------------------------------
-- fatture: numero, emissione, e "non ancora incassata"
-- ---------------------------------------------------------------------------
ALTER TABLE public.fatture
  ADD COLUMN IF NOT EXISTS numero TEXT,
  ADD COLUMN IF NOT EXISTS data_emissione DATE;

-- `data` resta la data di INCASSO. NULL = fattura emessa ma non ancora pagata:
-- non conta per le tasse né per il limite degli 85.000 €.
ALTER TABLE public.fatture ALTER COLUMN data DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_fatture_numero
  ON public.fatture(user_id, numero)
  WHERE numero IS NOT NULL;

-- ---------------------------------------------------------------------------
-- strumenti_patrimonio / valori_patrimonio — monitorati, mai prelevabili
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.strumenti_patrimonio (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT strumenti_tipo_valido CHECK (tipo IN ('pensione', 'investimento', 'moneyfarm'))
);

-- Il controvalore di uno strumento a una data, inserito a mano.
CREATE TABLE IF NOT EXISTS public.valori_patrimonio (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  strumento_id UUID REFERENCES public.strumenti_patrimonio(id) ON DELETE CASCADE NOT NULL,
  data DATE NOT NULL,
  valore DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_valori_patrimonio_strumento
  ON public.valori_patrimonio(strumento_id, data DESC);

-- Un versamento dal conto verso uno strumento.
ALTER TABLE public.movimenti
  ADD COLUMN IF NOT EXISTS strumento_id UUID
    REFERENCES public.strumenti_patrimonio(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- scadenze_fiscali — lo scadenzario F24
-- ---------------------------------------------------------------------------
-- Un F24 reale è fatto di più righe: tenerle separate per tributo serve a
-- sapere quanto INPS è stato versato in ogni anno, che è la base della
-- deduzione dall'imposta sostitutiva. Importo NEGATIVO = credito compensato.
--
-- Qui vanno solo le righe REALI (emesse da Fiscozen o pagate). Quelle ancora
-- da stimare le calcola l'app ogni volta dagli incassi: una riga salvata
-- prevale sempre sul calcolo.
CREATE TABLE IF NOT EXISTS public.scadenze_fiscali (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  anno_imposta INT NOT NULL,
  tributo TEXT NOT NULL,
  tipo TEXT NOT NULL,
  data_scadenza DATE NOT NULL,
  importo DECIMAL(12, 2) NOT NULL,
  pagata_il DATE,
  -- Il movimento di conto che ha pagato l'F24 (un F24 = un movimento).
  movimento_id UUID REFERENCES public.movimenti(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT scadenze_tributo_valido CHECK (tributo IN ('inps', 'imposta', 'bollo', 'altro')),
  CONSTRAINT scadenze_tipo_valido CHECK (tipo IN ('saldo', 'acconto1', 'acconto2', 'bollo'))
);

-- Una sola riga per anno/tributo/tipo, tranne il bollo (una per trimestre o
-- gruppo di trimestri) e le voci "altro".
CREATE UNIQUE INDEX IF NOT EXISTS idx_scadenze_fiscali_unica
  ON public.scadenze_fiscali(user_id, anno_imposta, tributo, tipo)
  WHERE tributo IN ('inps', 'imposta');

CREATE INDEX IF NOT EXISTS idx_scadenze_fiscali_data
  ON public.scadenze_fiscali(user_id, data_scadenza);

-- ---------------------------------------------------------------------------
-- RLS — ognuno vede solo le proprie righe
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['scadenze_fiscali', 'strumenti_patrimonio', 'valori_patrimonio'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format($f$
      DROP POLICY IF EXISTS "Users can view their own %1$s" ON public.%1$I;
      CREATE POLICY "Users can view their own %1$s" ON public.%1$I
        FOR SELECT USING (auth.uid() = user_id)
    $f$, t);
    EXECUTE format($f$
      DROP POLICY IF EXISTS "Users can insert their own %1$s" ON public.%1$I;
      CREATE POLICY "Users can insert their own %1$s" ON public.%1$I
        FOR INSERT WITH CHECK (auth.uid() = user_id)
    $f$, t);
    EXECUTE format($f$
      DROP POLICY IF EXISTS "Users can update their own %1$s" ON public.%1$I;
      CREATE POLICY "Users can update their own %1$s" ON public.%1$I
        FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)
    $f$, t);
    EXECUTE format($f$
      DROP POLICY IF EXISTS "Users can delete their own %1$s" ON public.%1$I;
      CREATE POLICY "Users can delete their own %1$s" ON public.%1$I
        FOR DELETE USING (auth.uid() = user_id)
    $f$, t);
    EXECUTE format($f$
      DROP TRIGGER IF EXISTS update_%1$s_updated_at ON public.%1$I;
      CREATE TRIGGER update_%1$s_updated_at
        BEFORE UPDATE ON public.%1$I
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    $f$, t);
  END LOOP;
END $$;
