-- 📸 CRIAÇÃO DA TABELA DE STORIES

-- 1. Criar a tabela
CREATE TABLE IF NOT EXISTS public.stories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    media_url TEXT NOT NULL,
    media_type TEXT CHECK (media_type IN ('image', 'video')) NOT NULL,
    thumbnail_url TEXT, -- Para capa de vídeo
    duration INTEGER DEFAULT 5, -- Em segundos
    active BOOLEAN DEFAULT true, -- Se está visível
    display_order INTEGER DEFAULT 0, -- Para ordenar a fila
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Habilitar Segurança (RLS)
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

-- 3. Criar Políticas de Acesso

-- POLÍTICA 1: LEITURA PÚBLICA (Todos podem ver os stories)
CREATE POLICY "Stories são públicos" 
ON public.stories FOR SELECT 
USING (true);

-- POLÍTICA 2: ADMINISTRAÇÃO TOTAL (Admins podem criar, editar, apagar)
-- Assume que existe uma role 'admin' ou verifica metadata
CREATE POLICY "Admins gerenciam stories" 
ON public.stories FOR ALL 
USING (
    auth.role() = 'service_role' OR 
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' OR
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'admin'
    )
);

-- 4. Criar Bucket de Storage (Se não existir)
-- Nota: Geralmente buckets são criados via UI, mas vamos tentar via SQL
INSERT INTO storage.buckets (id, name, public) 
VALUES ('stories-media', 'stories-media', true)
ON CONFLICT (id) DO NOTHING;

-- Política de Storage: Leitura Pública
CREATE POLICY "Leitura pública do bucket stories"
ON storage.objects FOR SELECT
USING ( bucket_id = 'stories-media' );

-- Política de Storage: Upload de Admin
CREATE POLICY "Upload admin no bucket stories"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'stories-media' AND (
        auth.role() = 'service_role' OR 
        exists (
            select 1 from profiles
            where id = auth.uid() and role = 'admin'
        )
    )
);

-- Política de Storage: Delete de Admin
CREATE POLICY "Delete admin no bucket stories"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'stories-media' AND (
        auth.role() = 'service_role' OR 
        exists (
            select 1 from profiles
            where id = auth.uid() and role = 'admin'
        )
    )
);

-- FIM
