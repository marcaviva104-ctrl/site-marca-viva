-- =================================================================
-- FIX DE VISIBILIDADE DOS PRODUTOS
-- Execute este script para garantir que o Cliente consiga ver os produtos.
-- =================================================================

-- 1. Garantir que todos os produtos estejam ATIVOS
UPDATE public.products SET status = 'active' WHERE status IS NULL;

-- 2. Garantir que a Política de Segurança (RLS) permita leitura Pública
-- Primeiro, removemos a política antiga para evitar erros de duplicata
DROP POLICY IF EXISTS "Public view active products" ON public.products;
DROP POLICY IF EXISTS "Anyone can read products" ON public.products;

-- Criamos uma política permissiva para leitura
CREATE POLICY "Anyone can read products"
ON public.products FOR SELECT
USING (true); -- Permite ver TUDO (Simplificado para evitar erros)

-- 3. Garantir permissões no Schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.products TO anon, authenticated;
GRANT SELECT ON public.inventory_items TO anon, authenticated; -- Opcional, se precisar mostrar estoque

-- 4. Verificação (Opcional - vai aparecer no resultado)
SELECT count(*) as "Total Produtos Ativos" FROM public.products;
