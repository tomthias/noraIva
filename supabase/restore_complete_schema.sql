-- ====================================================================
-- RISTORAZIONE SCHEMA COMPLETO (PartitaIva)
-- ====================================================================
-- Questo script ricrea tutte le tabelle necessarie se non esistono.
-- Include: fatture, entrate, uscite, prelievi.

-- 1. Tabella FATTURE
CREATE TABLE IF NOT EXISTS public.fatture (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  data DATE NOT NULL,
  descrizione TEXT NOT NULL,
  cliente TEXT NOT NULL,
  importo_lordo DECIMAL(10, 2) NOT NULL,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabella ENTRATE (Mancante nel vecchio schema)
CREATE TABLE IF NOT EXISTS public.entrate (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    data DATE NOT NULL,
    descrizione TEXT NOT NULL,
    categoria TEXT,
    importo DECIMAL(10, 2) NOT NULL,
    note TEXT,
    escludi_da_grafico BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabella USCITE
CREATE TABLE IF NOT EXISTS public.uscite (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  data DATE NOT NULL,
  descrizione TEXT NOT NULL,
  categoria TEXT,
  importo DECIMAL(10, 2) NOT NULL,
  note TEXT,
  escludi_da_grafico BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabella PRELIEVI
CREATE TABLE IF NOT EXISTS public.prelievi (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  data DATE NOT NULL,
  descrizione TEXT NOT NULL,
  importo DECIMAL(10, 2) NOT NULL,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ====================================================================
-- SICUREZZA (Row Level Security)
-- ====================================================================

ALTER TABLE public.fatture ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entrate ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uscite ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prelievi ENABLE ROW LEVEL SECURITY;

-- Policy per FATTURE
CREATE POLICY "Users can view their own fatture" ON public.fatture FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own fatture" ON public.fatture FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own fatture" ON public.fatture FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own fatture" ON public.fatture FOR DELETE USING (auth.uid() = user_id);

-- Policy per ENTRATE
CREATE POLICY "Users can view their own entrate" ON public.entrate FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own entrate" ON public.entrate FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own entrate" ON public.entrate FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own entrate" ON public.entrate FOR DELETE USING (auth.uid() = user_id);

-- Policy per USCITE
CREATE POLICY "Users can view their own uscite" ON public.uscite FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own uscite" ON public.uscite FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own uscite" ON public.uscite FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own uscite" ON public.uscite FOR DELETE USING (auth.uid() = user_id);

-- Policy per PRELIEVI
CREATE POLICY "Users can view their own prelievi" ON public.prelievi FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own prelievi" ON public.prelievi FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own prelievi" ON public.prelievi FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own prelievi" ON public.prelievi FOR DELETE USING (auth.uid() = user_id);

-- ====================================================================
-- INDICI E TRIGGER
-- ====================================================================

-- Indici
CREATE INDEX IF NOT EXISTS idx_fatture_user_id ON public.fatture(user_id);
CREATE INDEX IF NOT EXISTS idx_fatture_data ON public.fatture(data);

CREATE INDEX IF NOT EXISTS idx_entrate_user_id ON public.entrate(user_id);
CREATE INDEX IF NOT EXISTS idx_entrate_data ON public.entrate(data);
CREATE INDEX IF NOT EXISTS idx_entrate_escludi ON public.entrate(escludi_da_grafico) WHERE escludi_da_grafico = TRUE;

CREATE INDEX IF NOT EXISTS idx_uscite_user_id ON public.uscite(user_id);
CREATE INDEX IF NOT EXISTS idx_uscite_data ON public.uscite(data);
CREATE INDEX IF NOT EXISTS idx_uscite_escludi ON public.uscite(escludi_da_grafico) WHERE escludi_da_grafico = TRUE;

CREATE INDEX IF NOT EXISTS idx_prelievi_user_id ON public.prelievi(user_id);
CREATE INDEX IF NOT EXISTS idx_prelievi_data ON public.prelievi(data);

-- Funzione per updated_at (se non esiste già)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
DROP TRIGGER IF EXISTS update_fatture_updated_at ON public.fatture;
CREATE TRIGGER update_fatture_updated_at BEFORE UPDATE ON public.fatture FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_entrate_updated_at ON public.entrate;
CREATE TRIGGER update_entrate_updated_at BEFORE UPDATE ON public.entrate FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_uscite_updated_at ON public.uscite;
CREATE TRIGGER update_uscite_updated_at BEFORE UPDATE ON public.uscite FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_prelievi_updated_at ON public.prelievi;
CREATE TRIGGER update_prelievi_updated_at BEFORE UPDATE ON public.prelievi FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
