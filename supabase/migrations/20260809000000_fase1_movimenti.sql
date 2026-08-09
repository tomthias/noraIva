-- Fase 1 del piano di semplificazione: fondamenta dati.
--
-- Additiva per costruzione: crea la tabella unificata `movimenti` e le tabelle
-- di supporto, senza toccare `prelievi`/`uscite`/`entrate`, che restano la
-- fonte finché la verifica della migrazione non è completata.

-- ===== MOVIMENTI (sostituisce prelievi + uscite + entrate) =====
--
-- Un movimento è una riga del conto. Il segno dell'importo distingue entrate e
-- uscite (prima lo faceva la tabella di appartenenza, obbligando a spostare le
-- righe fra tabelle per cambiare tipo). La categoria distingue lo stipendio
-- dalle altre uscite:
--
--   prelievo (stipendio) → importo < 0 AND categoria = 'Stipendio'
--   uscita               → importo < 0 AND categoria <> 'Stipendio'
--   entrata              → importo > 0
CREATE TABLE IF NOT EXISTS public.movimenti (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  -- Data valuta: per i movimenti importati è la colonna "Data valuta"
  -- dell'export BBVA, non la data contabile (che può essere futura).
  data DATE NOT NULL,
  descrizione TEXT NOT NULL,
  -- es. 'Stipendio', 'Tasse - Acconto', 'Interessi BBVA', 'Incasso fattura'
  categoria TEXT,
  -- CON SEGNO: entrate > 0, uscite < 0.
  importo DECIMAL(12, 2) NOT NULL,
  -- 'manuale' | 'import_bbva' | 'migrazione'
  fonte TEXT NOT NULL DEFAULT 'manuale',
  -- Impronta del movimento importato, per saltare i duplicati fra export
  -- mensili sovrapposti (Fase 2). NULL per i movimenti inseriti a mano.
  import_hash TEXT,
  -- Colonna "Disponibile" dell'export BBVA: il saldo del conto DOPO questo
  -- movimento. È l'ancora del cash reale (Fase 2).
  saldo_dopo DECIMAL(12, 2),
  escludi_da_grafico BOOLEAN DEFAULT false,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Il dedup vale per utente. L'indice è parziale: i movimenti manuali non hanno
-- hash e devono poter essere infiniti.
CREATE UNIQUE INDEX IF NOT EXISTS idx_movimenti_import_hash
  ON public.movimenti(user_id, import_hash)
  WHERE import_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_movimenti_user_data ON public.movimenti(user_id, data);
CREATE INDEX IF NOT EXISTS idx_movimenti_categoria ON public.movimenti(user_id, categoria);

-- ===== RETTIFICHE INCASSI =====
--
-- Escono da localStorage (legate a un solo browser) e diventano sincronizzate.
-- Si SOMMANO alle fatture dell'anno: incassi = somma fatture + rettifica.
CREATE TABLE IF NOT EXISTS public.rettifiche_incassi (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  anno INT NOT NULL,
  importo DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, anno)
);

-- ===== STIME FISCOZEN (spie di coerenza, Fase 3) =====
CREATE TABLE IF NOT EXISTS public.stime_fiscozen (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  -- Anno in cui si PAGA ("nel 2026 pagherai fra X e Y"), non anno d'imposta.
  anno_pagamento INT NOT NULL,
  tasse_min DECIMAL(12, 2),
  tasse_max DECIMAL(12, 2),
  -- "I tuoi incassi" secondo Fiscozen, per il confronto con gli incassi dell'app.
  incassato_dichiarato DECIMAL(12, 2),
  aggiornato_il DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, anno_pagamento)
);

-- ===== REGOLE DI CATEGORIZZAZIONE (apprese dall'import, Fase 2) =====
CREATE TABLE IF NOT EXISTS public.regole_categorie (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  -- Match case-insensitive su "Parola chiave", descrizione o osservazioni.
  pattern TEXT NOT NULL,
  categoria TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, pattern)
);

-- ===== RLS =====
ALTER TABLE public.movimenti ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rettifiche_incassi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stime_fiscozen ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regole_categorie ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  tabella TEXT;
BEGIN
  FOREACH tabella IN ARRAY ARRAY['movimenti', 'rettifiche_incassi', 'stime_fiscozen', 'regole_categorie']
  LOOP
    -- DROP prima di CREATE: CREATE POLICY non ha IF NOT EXISTS e la migrazione
    -- deve poter essere rieseguita senza esplodere.
    EXECUTE format($f$
      DROP POLICY IF EXISTS "Users can view their own %1$s" ON public.%1$I;
      CREATE POLICY "Users can view their own %1$s"
        ON public.%1$I FOR SELECT USING (auth.uid() = user_id);
      DROP POLICY IF EXISTS "Users can insert their own %1$s" ON public.%1$I;
      CREATE POLICY "Users can insert their own %1$s"
        ON public.%1$I FOR INSERT WITH CHECK (auth.uid() = user_id);
      DROP POLICY IF EXISTS "Users can update their own %1$s" ON public.%1$I;
      CREATE POLICY "Users can update their own %1$s"
        ON public.%1$I FOR UPDATE USING (auth.uid() = user_id);
      DROP POLICY IF EXISTS "Users can delete their own %1$s" ON public.%1$I;
      CREATE POLICY "Users can delete their own %1$s"
        ON public.%1$I FOR DELETE USING (auth.uid() = user_id);
    $f$, tabella);
  END LOOP;
END $$;

-- ===== TRIGGER updated_at =====
-- La funzione update_updated_at_column() esiste già (supabase/schema.sql).
DROP TRIGGER IF EXISTS update_movimenti_updated_at ON public.movimenti;
CREATE TRIGGER update_movimenti_updated_at
  BEFORE UPDATE ON public.movimenti
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_rettifiche_incassi_updated_at ON public.rettifiche_incassi;
CREATE TRIGGER update_rettifiche_incassi_updated_at
  BEFORE UPDATE ON public.rettifiche_incassi
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_stime_fiscozen_updated_at ON public.stime_fiscozen;
CREATE TRIGGER update_stime_fiscozen_updated_at
  BEFORE UPDATE ON public.stime_fiscozen
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_regole_categorie_updated_at ON public.regole_categorie;
CREATE TRIGGER update_regole_categorie_updated_at
  BEFORE UPDATE ON public.regole_categorie
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
