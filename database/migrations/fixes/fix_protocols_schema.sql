-- Migration to fix missing columns in protocols table
-- Specifically 'status' which caused schema cache error

do $$ 
begin

  -- 1. Check if 'status' column exists, if not add it
  if not exists (select 1 from information_schema.columns where table_name = 'protocols' and column_name = 'status') then
    alter table protocols add column status text default 'inquiry'; -- inquiry, awaiting_payment, production, shipping, completed
  end if;

  -- 2. Check if 'payment_status' column exists, if not add it (just in case)
  if not exists (select 1 from information_schema.columns where table_name = 'protocols' and column_name = 'payment_status') then
    alter table protocols add column payment_status text default 'pending';
  end if;

  -- 3. Check if 'column_id' column exists (Kanban relation)
  if not exists (select 1 from information_schema.columns where table_name = 'protocols' and column_name = 'column_id') then
    alter table protocols add column column_id bigint default 1;
  end if;

end $$;
