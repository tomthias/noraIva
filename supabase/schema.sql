-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Create users table extension (if needed for profiles)
-- Note: auth.users is managed by Supabase Auth

-- Create fatture table
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

-- Create prelievi table
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

-- Create uscite table
CREATE TABLE IF NOT EXISTS public.uscite (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  data DATE NOT NULL,
  descrizione TEXT NOT NULL,
  categoria TEXT,
  importo DECIMAL(10, 2) NOT NULL,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.fatture ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prelievi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uscite ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for fatture
CREATE POLICY "Users can view their own fatture"
  ON public.fatture
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own fatture"
  ON public.fatture
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own fatture"
  ON public.fatture
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own fatture"
  ON public.fatture
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create RLS policies for prelievi
CREATE POLICY "Users can view their own prelievi"
  ON public.prelievi
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own prelievi"
  ON public.prelievi
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own prelievi"
  ON public.prelievi
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own prelievi"
  ON public.prelievi
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create RLS policies for uscite
CREATE POLICY "Users can view their own uscite"
  ON public.uscite
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own uscite"
  ON public.uscite
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own uscite"
  ON public.uscite
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own uscite"
  ON public.uscite
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_fatture_user_id ON public.fatture(user_id);
CREATE INDEX idx_fatture_data ON public.fatture(data);
CREATE INDEX idx_prelievi_user_id ON public.prelievi(user_id);
CREATE INDEX idx_prelievi_data ON public.prelievi(data);
CREATE INDEX idx_uscite_user_id ON public.uscite(user_id);
CREATE INDEX idx_uscite_data ON public.uscite(data);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_fatture_updated_at
  BEFORE UPDATE ON public.fatture
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prelievi_updated_at
  BEFORE UPDATE ON public.prelievi
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_uscite_updated_at
  BEFORE UPDATE ON public.uscite
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
