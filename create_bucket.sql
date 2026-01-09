-- Create the 'products' bucket if it doesn't exist
insert into storage.buckets (id, name, public)
values ('products', 'products', true)
on conflict (id) do nothing;

-- Policy: Allow public read access to 'products'
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'products' );

-- Policy: Allow authenticated uploads (admin)
create policy "Admin Upload"
  on storage.objects for insert
  with check ( bucket_id = 'products' );

-- Policy: Allow admin delete
create policy "Admin Delete"
  on storage.objects for delete
  using ( bucket_id = 'products' );
