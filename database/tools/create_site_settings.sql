-- Create the site_settings table
CREATE TABLE IF NOT EXISTS public.site_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Allow public read access (everyone needs to see settings)
CREATE POLICY "Enable read access for all users" ON public.site_settings
    FOR SELECT USING (true);

-- Allow authenticated admins to insert/update
CREATE POLICY "Enable insert for authenticated users only" ON public.site_settings
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users only" ON public.site_settings
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Insert default settings row if it doesn't exist
INSERT INTO public.site_settings (key, value)
VALUES (
    'global_settings',
    '{
        "storeName": "Marca Viva",
        "primaryColor": "#4f46e5",
        "logoUrl": "",
        "bannerUrl": "",
        "whatsapp": "",
        "storeOpen": true,
        "closedMsg": "Estamos em pausa operacional. Voltamos em breve!"
    }'::jsonb
)
ON CONFLICT (key) DO NOTHING;
