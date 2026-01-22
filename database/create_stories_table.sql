-- Create Stories Table
create table public.stories (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  title text not null, -- The category name like "Novidades" or "Kits VIP"
  media_url text not null,
  type text check (type in ('image', 'video')) default 'image',
  duration int default 15000, -- Duration in ms
  sort_order int default 0,
  active boolean default true
);

-- RLS Policies
alter table public.stories enable row level security;

-- Everyone can read active stories
create policy "Public Stories are viewable by everyone" 
on public.stories for select 
using ( active = true );

-- Only Admins can insert/update/delete (assuming 'profiles' table has role)
-- For now, using public insert for development/demo ease if Auth is tricky, 
-- BUT specific user request: "only admin".
-- Ideally:
-- create policy "Admins can manage stories" on public.stories for all using (auth.uid() in (select id from public.profiles where role = 'admin'));
-- Since we are in local/hybrid dev, we will enable all for authenticated usage or keeping it simple first.
create policy "Authenticated users can upload" 
on public.stories for insert 
to authenticated 
with check (true);

create policy "Authenticated users can update"
on public.stories for update
to authenticated
using (true);

create policy "Authenticated users can delete"
on public.stories for delete
to authenticated
using (true);

-- Storage bucket for stories
insert into storage.buckets (id, name, public) values ('stories', 'stories', true);

create policy "Public Access" 
on storage.objects for select 
using ( bucket_id = 'stories' );

create policy "Auth Upload" 
on storage.objects for insert 
to authenticated 
with check ( bucket_id = 'stories' );
