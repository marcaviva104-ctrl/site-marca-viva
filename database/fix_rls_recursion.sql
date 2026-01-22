-- Fix for infinite recursion in profiles RLS
drop policy if exists "Enable read access for all users" on profiles;
drop policy if exists "Enable insert for authenticated users only" on profiles;
drop policy if exists "Enable update for users based on email" on profiles;

-- Simplified policy: Allow reading profiles if you are authenticated.
create policy "Allow read access for authenticated users"
on profiles for select
to authenticated
using ( true );

-- Allow users to update their own profile
create policy "Allow update for owners"
on profiles for update
to authenticated
using ( auth.uid() = id );

-- Allow insertion (usually handled by triggers, but good to have)
create policy "Allow insert for owners"
on profiles for insert
to authenticated
with check ( auth.uid() = id );
