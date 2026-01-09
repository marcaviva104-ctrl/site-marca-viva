-- MARCA VIVA: Admin Elite Migration Script
-- Run this in Supabase SQL Editor to enable persistent Admin features

-- 1. Inventory Items (Insumos)
create table if not exists public.inventory_items (
  id text primary key, -- keeping text ID like 'INS-123' for compatibility
  name text not null,
  supplier text,
  cost numeric default 0,
  unit text default 'un',
  stock numeric default 0,
  min_stock numeric default 10,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. Inventory Movements (Histórico)
create table if not exists public.inventory_movements (
  id uuid default uuid_generate_v4() primary key,
  item_id text references public.inventory_items(id) on delete set null,
  type text not null, -- 'entrada', 'venda', 'perda', 'uso_interno'
  quantity numeric not null,
  reason text,
  user_email text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3. Financial Records (Manual Debts / "Lançamentos")
create table if not exists public.financial_records (
  id text primary key, -- 'M-123456'
  customer_name text not null,
  description text,
  total numeric not null,
  status text default 'pending', -- 'pending', 'paid'
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 4. Order Payments (Pagamentos Parciais)
create table if not exists public.order_payments (
  id uuid default uuid_generate_v4() primary key,
  order_id text not null, -- Can reference 'orders.id' or 'financial_records.id'
  amount numeric not null,
  date timestamp with time zone default timezone('utc'::text, now())
);

-- 5. Support Chats (Conversas)
create table if not exists public.support_chats (
  user_email text primary key,
  user_name text,
  last_message text,
  unread_count integer default 0,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 6. Support Messages (Mensagens)
create table if not exists public.support_messages (
  id uuid default uuid_generate_v4() primary key,
  chat_id text references public.support_chats(user_email), -- email is the ID
  sender text not null, -- 'user' or 'admin'
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- RLS Policies (Simplified for ease of use)
alter table public.inventory_items enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.financial_records enable row level security;
alter table public.order_payments enable row level security;
alter table public.support_chats enable row level security;
alter table public.support_messages enable row level security;

-- Allow public read/write for now (or restrict to admin later)
create policy "Enable all access for all users" on public.inventory_items for all using (true);
create policy "Enable all access for all users" on public.inventory_movements for all using (true);
create policy "Enable all access for all users" on public.financial_records for all using (true);
create policy "Enable all access for all users" on public.order_payments for all using (true);
create policy "Enable all access for all users" on public.support_chats for all using (true);
create policy "Enable all access for all users" on public.support_messages for all using (true);

-- Enable Realtime for Chat
alter publication supabase_realtime add table public.support_chats;
alter publication supabase_realtime add table public.support_messages;
