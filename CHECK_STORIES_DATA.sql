-- Check if there are any stories in the table
SELECT count(*) as total_stories FROM public.stories;

-- Select the most recent stories to see their status
SELECT id, created_at, media_type, active, media_url 
FROM public.stories 
ORDER BY created_at DESC 
LIMIT 5;

-- Check if RLS is enabled on the table (postgres specific system catalog query, might be too complex for simple dashboard, but good for SQL editor)
SELECT relname, relrowsecurity 
FROM pg_class 
WHERE oid = 'public.stories'::regclass;
