-- 1. Create Highlights Table (The "Folders")
CREATE TABLE IF NOT EXISTS public.highlights (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    title TEXT NOT NULL,
    cover_url TEXT, -- Icon or image for the circle
    active BOOLEAN DEFAULT true
);

-- 2. Link Stories to Highlights
ALTER TABLE public.stories 
ADD COLUMN IF NOT EXISTS highlight_id UUID REFERENCES public.highlights(id) ON DELETE CASCADE;

-- 3. RLS for Highlights (Permissive for now based on previous fixes)
ALTER TABLE public.highlights ENABLE ROW LEVEL SECURITY;

-- Allow everyone to view active highlights
CREATE POLICY "Public highlights view" ON public.highlights
    FOR SELECT USING (true);

-- Allow authenticated (admins) to do everything
CREATE POLICY "Admin highlights all" ON public.highlights
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- 4. Simple Seed (Optional: Create a default 'Geral' highlight if none exists)
-- DO $$
-- BEGIN
--     IF NOT EXISTS (SELECT 1 FROM public.highlights) THEN
--         INSERT INTO public.highlights (title, cover_url) VALUES ('Novidades', 'https://via.placeholder.com/150/FF0000/FFFFFF?text=New');
--     END IF;
-- END $$;
