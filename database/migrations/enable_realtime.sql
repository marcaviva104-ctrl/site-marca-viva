-- Habilita REPLICA IDENTITY FULL para permitir que o Realtime receba os dados antigos e novos em updates/deletes
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.order_items REPLICA IDENTITY FULL;
ALTER TABLE public.financial_records REPLICA IDENTITY FULL;
ALTER TABLE public.products REPLICA IDENTITY FULL;
ALTER TABLE public.inventory_items REPLICA IDENTITY FULL;
ALTER TABLE public.inventory_movements REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;

-- Adiciona as tabelas à publicação 'supabase_realtime' (padrão do Supabase)
-- Caso já estejam, isso não gera erro ou apenas garante.
begin;
  -- Remove tables needed just in case to avoid duplicates if specific implementation differs, 
  -- but usually 'alter publication ... add table' is safe if not present.
  -- Simpler approach: Re-add them.
  drop publication if exists supabase_realtime;
  create publication supabase_realtime for all tables;
commit;
