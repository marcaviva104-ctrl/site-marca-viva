-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create Profiles table (extends Auth)
create table public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  role text default 'customer', -- 'admin' or 'customer'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create Products table
create table public.products (
  id text primary key, -- Keeping text ID (e.g., MV-CAD001) for compatibility
  name text not null,
  category text,
  price numeric,
  cost numeric,
  image text,
  description text,
  min_qty integer,
  status text default 'active',
  stock integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create Orders table
create table public.orders (
  id text primary key, -- e.g. #1001
  user_id uuid references auth.users, -- Optional, for guest checkout support could be null or handle differently
  customer_data jsonb, -- Store snapshot of customer info
  total numeric,
  status text default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create Order Items table
create table public.order_items (
  id uuid default uuid_generate_v4() primary key,
  order_id text references public.orders(id),
  product_id text references public.products(id),
  quantity integer,
  price_at_time numeric
);

-- Enable Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Policies

-- Products: Everyone can view active products
create policy "Public products are viewable by everyone"
  on products for select
  using ( status = 'active' );

-- Products: Admins can do everything (Need to manually set an admin in profiles first)
-- For now, allow public read, and auth-only modify to simplify, or check profile role
-- Simple policy for now:
create policy "Admins can insert/update/delete products"
  on products for all
  using ( 
    auth.uid() in (select id from public.profiles where role = 'admin') 
  );

-- Profiles: Users can view/edit their own profile
create policy "Users can view own profile"
  on profiles for select
  using ( auth.uid() = id );

create policy "Users can update own profile"
  on profiles for update
  using ( auth.uid() = id );

-- Orders: Users can view their own orders
create policy "Users can view own orders"
  on orders for select
  using ( auth.uid() = user_id );

-- Orders: Admins can view all orders
create policy "Admins can view all orders"
  on orders for select
  using ( 
    auth.uid() in (select id from public.profiles where role = 'admin') 
  );

-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', 'customer');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- SEED DATA (Optional - Initial Products)
INSERT INTO public.products (id, name, category, price, cost, image, description, min_qty, status, stock)
VALUES 
('MV-CAD001', 'Caderno Corporativo A5 Premium', 'Escritório', 24.90, 15.50, 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=500&q=80', 'Capa dura soft-touch. Ideal para cultura da empresa.', 20, 'active', 100),
('MV-GAR001', 'Garrafa Térmica Inox 500ml', 'Bebidas', 45.90, 25.00, 'https://images.unsplash.com/photo-1602143407151-01114192003b?w=500&q=80', 'Mantém quente por 12h e frio por 24h. Gravação a laser.', 15, 'active', 200),
('MV-BON001', 'Boné Trucker Personalizado', 'Vestuário', 29.90, 12.00, 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=500&q=80', 'Boné estilo americano com tela e fecho ajustável.', 30, 'active', 50),
('MV-CAN002', 'Caneta Metálica Luxo', 'Escritório', 8.50, 3.50, 'https://images.unsplash.com/photo-1585336261022-680e295ce3fe?w=500&q=80', 'Escrita suave, corpo em alumínio fosco.', 100, 'active', 500);
