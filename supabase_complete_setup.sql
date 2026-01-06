-- =================================================================
-- MARCA VIVA - CONFIGURAÇÃO COMPLETA DO SUPABASE
-- Execute este script no SQL Editor para configurar todo o banco de dados.
-- Inclui: Tabelas, Segurança (RLS), Gatilhos e Dados Iniciais.
-- =================================================================

-- 1. Habilitar Extensões
create extension if not exists "uuid-ossp";

-- =================================================================
-- 2. TABELAS
-- =================================================================

-- 2.1 Perfis de Usuário
create table if not exists public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  role text default 'customer', -- 'admin' ou 'customer'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2.2 Produtos
create table if not exists public.products (
  id text primary key,
  name text not null,
  category text,
  price numeric,
  cost numeric default 0,
  image text,
  description text,
  min_qty integer default 1,
  status text default 'active',
  stock integer default 0,
  recipe jsonb default '[]', -- Receita (BOM)
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2.3 Pedidos
create table if not exists public.orders (
  id text primary key,
  user_id uuid references auth.users,
  customer_data jsonb,
  total numeric,
  status text default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2.4 Itens do Pedido
create table if not exists public.order_items (
  id uuid default uuid_generate_v4() primary key,
  order_id text references public.orders(id),
  product_id text references public.products(id),
  quantity integer,
  price_at_time numeric,
  created_at timestamp with time zone default timezone('utc'::text, now()) default now()
);

-- 2.5 Insumos (Estoque)
create table if not exists public.inventory_items (
  id text primary key,
  name text not null,
  supplier text,
  cost numeric default 0,
  unit text default 'un',
  stock numeric default 0,
  min_stock numeric default 10,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2.6 Movimentações de Estoque
create table if not exists public.inventory_movements (
  id uuid default uuid_generate_v4() primary key,
  item_id text references public.inventory_items(id),
  type text not null, -- 'entrada', 'venda', 'perda', 'uso_interno', 'manual'
  quantity numeric not null,
  reason text,
  user_email text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- =================================================================
-- 3. SEGURANÇA (RLS)
-- =================================================================

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.inventory_items enable row level security;
alter table public.inventory_movements enable row level security;

-- Políticas Simplificadas (Ajustar conforme necessidade de produção)

-- Profiles
create policy "Users view own profile" on profiles for select using ( auth.uid() = id );
create policy "Users update own profile" on profiles for update using ( auth.uid() = id );
create policy "Admins view all profiles" on profiles for select using ( 
  exists (select 1 from profiles where id = auth.uid() and role = 'admin') 
);

-- Products (Público pode ler ativos)
create policy "Public view active products" on products for select using ( status = 'active' );
create policy "Admins manage products" on products for all using ( 
  exists (select 1 from profiles where id = auth.uid() and role = 'admin') 
);

-- Orders
create policy "Users view own orders" on orders for select using ( auth.uid() = user_id );
create policy "Users create orders" on orders for insert with check ( auth.uid() = user_id );
create policy "Admins manage orders" on orders for all using ( 
  exists (select 1 from profiles where id = auth.uid() and role = 'admin') 
);

-- Order Items
create policy "Users view own order items" on order_items for select using ( 
  exists (select 1 from orders where orders.id = order_items.order_id and orders.user_id = auth.uid()) 
);
create policy "Users create order items" on order_items for insert with check ( true ); -- Simplificado para permitir checkout

-- Inventory (Admins only, mas autenticado pode ver para debug)
create policy "Authenticated view inventory" on inventory_items for select using ( auth.role() = 'authenticated' );
create policy "Authenticated manage inventory" on inventory_items for all using ( auth.role() = 'authenticated' );

create policy "Authenticated view movements" on inventory_movements for select using ( auth.role() = 'authenticated' );
create policy "Authenticated manage movements" on inventory_movements for all using ( auth.role() = 'authenticated' );

-- =================================================================
-- 4. GATILHOS (TRIGGERS)
-- =================================================================

-- Criar perfil automaticamente ao cadastrar usuário
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', 
    'customer' 
  );
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if exists to avoid error on rerun
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =================================================================
-- 5. DADOS DE EXEMPLO (SEED DATA)
-- Só insere se não existir (para evitar duplicatas)
-- =================================================================

-- Produtos
INSERT INTO public.products (id, name, category, price, cost, image, description, min_qty, status, stock)
VALUES 
('MV-CAD001', 'Caderno Corporativo A5 Premium', 'Escritório', 24.90, 15.00, 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=500&q=80', 'Capa dura soft-touch. Ideal para kit boas-vindas.', 20, 'active', 0),
('MV-GAR001', 'Garrafa Térmica Inox 500ml', 'Bebidas', 45.90, 25.00, 'https://images.unsplash.com/photo-1602143407151-01114192003b?w=500&q=80', 'Mantém temperatura por 12h. Gravação a laser incluída.', 15, 'active', 0),
('MV-BON001', 'Boné Trucker Personalizado', 'Vestuário', 29.90, 12.00, 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=500&q=80', 'Estilo americano com tela. Várias cores disponíveis.', 30, 'active', 0),
('MV-CAN002', 'Caneta Metálica Luxo', 'Escritório', 8.50, 3.50, 'https://images.unsplash.com/photo-1585336261022-680e295ce3fe?w=500&q=80', 'Escrita suave, corpo em alumínio fosco.', 100, 'active', 0),
('MV-TEC001', 'Power Bank 10.000mAh', 'Tecnologia', 89.90, 50.00, 'https://images.unsplash.com/photo-1609592425062-849c95d97cc9?w=500&q=80', 'Carregamento rápido. Compatível com todos celulares.', 10, 'active', 0),
('MV-KIT001', 'Kit Boas Vindas Premium', 'Kits', 149.90, 85.00, 'https://images.unsplash.com/photo-1595079676614-88bcc54b5df7?w=500&q=80', 'Contém: Caderno, Caneta, Garrafa e Mochila Saco. Caixa personalizada.', 10, 'active', 0)
ON CONFLICT (id) DO NOTHING;

-- Insumos (Inventory)
INSERT INTO public.inventory_items (id, name, supplier, cost, unit, stock, min_stock)
VALUES 
('INS-PAP001', 'Papel Pólen 80g (Resma)', 'Kalunga', 25.00, 'un', 50, 10),
('INS-CAP002', 'Capa Dura A5 (Papelão Holler)', 'Supplies Co', 2.50, 'un', 200, 50),
('INS-TIN001', 'Tinta UV Preta (Litro)', 'Epson Pro', 150.00, 'l', 5, 1),
('INS-CAN001', 'Corpo Caneta Alumínio Nu', 'Import China', 1.20, 'un', 1000, 200),
('INS-CX001', 'Caixa Kraft Personalizável', 'Embalagens BR', 3.00, 'un', 300, 50)
ON CONFLICT (id) DO NOTHING;
