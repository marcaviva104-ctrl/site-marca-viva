-- 1. Tabela de Insumos (Inventory Items)
create table public.inventory_items (
  id text primary key, -- ex: 'INS-12345'
  name text not null,
  supplier text,
  cost numeric default 0,
  unit text default 'un', -- 'kg', 'm', 'un'
  stock numeric default 0,
  min_stock numeric default 10,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Tabela de Histórico de Movimentações (Inventory History)
create table public.inventory_movements (
  id uuid default uuid_generate_v4() primary key,
  item_id text references public.inventory_items(id),
  type text not null, -- 'entrada', 'venda', 'perda', 'uso_interno', 'manual'
  quantity numeric not null,
  reason text,
  user_email text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Segurança (RLS)
alter table public.inventory_items enable row level security;
alter table public.inventory_movements enable row level security;

-- Políticas (Permitir tudo para autenticados por enquanto, ou restringir a admins se preferir)
-- Para simplificar, vou liberar leitura para todos autenticados e escrita também
create policy "Authenticated can view inventory" on inventory_items for select using ( auth.role() = 'authenticated' );
create policy "Authenticated can update inventory" on inventory_items for all using ( auth.role() = 'authenticated' );

create policy "Authenticated can view movements" on inventory_movements for select using ( auth.role() = 'authenticated' );
create policy "Authenticated can insert movements" on inventory_movements for insert with check ( auth.role() = 'authenticated' );

-- 4. Dados de Exemplo (Opcional)
INSERT INTO public.inventory_items (id, name, supplier, cost, unit, stock, min_stock)
VALUES 
('INS-1001', 'Papel A5 90g', 'Kalunga', 0.15, 'un', 500, 100),
('INS-1002', 'Capa Dura A5', 'Fornecedor X', 5.50, 'un', 50, 20),
('INS-1003', 'Tinta Preta Premium', 'Epson', 80.00, 'un', 5, 2);
