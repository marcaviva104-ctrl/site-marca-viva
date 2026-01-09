-- =================================================================
-- CORREÇÃO: TABELAS FINANCEIRAS FALTANTES
-- Execute este script no Supabase SQL Editor para corrigir o "sumiço" de dados.
-- =================================================================

-- 1. Tabela de Registros Financeiros (Lançamentos Manuais)
create table if not exists public.financial_records (
  id text primary key,
  customer_name text,
  description text,
  total numeric default 0,
  status text default 'pending', -- 'pending', 'paid'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. Tabela de Pagamentos (Parciais ou Totais)
create table if not exists public.order_payments (
  id uuid default uuid_generate_v4() primary key,
  order_id text not null, -- Pode ser ID de 'orders' ou 'financial_records'
  amount numeric not null,
  payment_method text default 'account', -- 'account', 'cash'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Habilitar Segurança (RLS)
alter table public.financial_records enable row level security;
alter table public.order_payments enable row level security;

-- 4. Criar Políticas de Acesso (Permitir TUDO para usuários logados/admin)
-- Como é um painel administrativo, vamos simplificar para 'authenticated'

-- Policies for financial_records
drop policy if exists "Enable all for authenticated" on public.financial_records;
create policy "Enable all for authenticated"
on public.financial_records
for all
to authenticated
using (true)
with check (true);

-- Policies for order_payments
drop policy if exists "Enable all for authenticated" on public.order_payments;
create policy "Enable all for authenticated"
on public.order_payments
for all
to authenticated
using (true)
with check (true);

-- 5. Opcional: Indexação
create index if not exists idx_financial_created on public.financial_records(created_at);
create index if not exists idx_payments_order on public.order_payments(order_id);
