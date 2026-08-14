-- ============================================================
--  MARCA VIVA - TUDO QUE ESTA PENDENTE NO BANCO
--  Gerado em 14/08/2026
-- ============================================================
--
--  COMO USAR:
--    1. Abra https://supabase.com/dashboard/project/qnudbyhnqtsxlqwgkmal
--    2. Menu da esquerda: SQL Editor  ->  New query
--    3. Selecione TUDO deste arquivo (Ctrl+A), copie (Ctrl+C) e cole la
--    4. Clique em RUN
--
--  ESPERADO: "Success. No rows returned"
--
--  E SEGURO: tudo usa IF NOT EXISTS / CREATE OR REPLACE.
--  Pode rodar duas vezes sem estragar nada e sem apagar dado nenhum.
--
--  Sao 5 blocos. Ja conferi que todas as tabelas citadas existem
--  no seu banco, entao nenhum deles deve dar erro.
-- ============================================================


-- ============================================================
-- BLOCO 1 de 5 - Deixa a lista de pedidos do admin abrir rapido
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_protocols_created_at_desc
  ON public.protocols (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_protocols_status_created_at_desc
  ON public.protocols (status, created_at DESC);


-- ============================================================
-- BLOCO 2 de 5 - Deixa a aba Financeiro abrir rapido
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_order_payments_order_id
  ON public.order_payments (order_id);

CREATE INDEX IF NOT EXISTS idx_financial_records_created_at
  ON public.financial_records (created_at DESC);


-- ============================================================
-- BLOCO 3 de 5 - Permite cadastrar variacao (cor / tamanho)
--                com estoque separado por variacao
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'variations'
    ) THEN
        ALTER TABLE public.products ADD COLUMN variations jsonb NOT NULL DEFAULT '[]'::jsonb;
        COMMENT ON COLUMN public.products.variations IS 'Lista de variacoes: [{ "name": "Azul P", "stock": 10 }, ...]';
    END IF;
END $$;


-- ============================================================
-- BLOCO 4 de 5 - Codigo interno opcional por insumo
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'inventory_items' AND column_name = 'internal_code'
    ) THEN
        ALTER TABLE public.inventory_items ADD COLUMN internal_code text;
        COMMENT ON COLUMN public.inventory_items.internal_code IS 'Referencia interna opcional (SKU do insumo); unica quando preenchida.';
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS inventory_items_internal_code_unique
    ON public.inventory_items (upper(btrim(internal_code)))
    WHERE internal_code IS NOT NULL AND btrim(internal_code) <> '';


-- ============================================================
-- BLOCO 5 de 5 - Numero de pedido sequencial (nunca repete)
--
--   Hoje o numero e sorteado entre 1000 e 9999. Por volta do
--   112o pedido, a chance de repetir passa de 50% - e quando
--   repetir, o pedido do cliente falha na hora.
--
--   Este bloco faz o banco gerar #REQ-0001, 0002, 0003...
--   Ja nasce preparado para varias lojas: cada uma tem a sua
--   propria contagem.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.protocol_counters (
    loja_id     uuid    NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    prefix      text    NOT NULL DEFAULT 'REQ',
    last_number bigint  NOT NULL DEFAULT 0,
    updated_at  timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (loja_id, prefix)
);

COMMENT ON TABLE public.protocol_counters IS
    'Contador sequencial de pedidos por loja. Uma linha por (loja, prefixo).';

CREATE OR REPLACE FUNCTION public.next_protocol_id(
    p_prefix  text DEFAULT 'REQ',
    p_loja_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_num        bigint;
    v_candidate  text;
    v_tentativas int := 0;
BEGIN
    LOOP
        -- Incrementa o contador e ja devolve o valor novo (operacao atomica:
        -- dois clientes clicando no mesmo instante recebem numeros diferentes)
        INSERT INTO public.protocol_counters AS c (loja_id, prefix, last_number)
        VALUES (p_loja_id, p_prefix, 1)
        ON CONFLICT (loja_id, prefix)
        DO UPDATE SET last_number = c.last_number + 1,
                      updated_at  = now()
        RETURNING c.last_number INTO v_num;

        v_candidate := '#' || p_prefix || '-' || lpad(v_num::text, 4, '0');

        -- Protecao: os pedidos antigos usavam numero sorteado. Se por acaso
        -- o sequencial bater num deles, pula para o proximo.
        EXIT WHEN NOT EXISTS (SELECT 1 FROM public.protocols WHERE id = v_candidate);

        v_tentativas := v_tentativas + 1;
        IF v_tentativas > 50 THEN
            RAISE EXCEPTION 'next_protocol_id: nao foi possivel gerar numero livre apos 50 tentativas';
        END IF;
    END LOOP;

    RETURN v_candidate;
END;
$$;

COMMENT ON FUNCTION public.next_protocol_id(text, uuid) IS
    'Devolve o proximo numero de pedido da loja (ex.: #REQ-0001). Nunca repete.';

-- O site precisa poder chamar a funcao
GRANT EXECUTE ON FUNCTION public.next_protocol_id(text, uuid) TO anon, authenticated;

-- Trava a tabela de contadores: ninguem le nem escreve nela direto pelo site.
-- So a funcao acima mexe (ela roda com permissao de dono).
ALTER TABLE public.protocol_counters ENABLE ROW LEVEL SECURITY;


-- ============================================================
--  FIM. Deve aparecer "Success. No rows returned".
-- ============================================================
--
--  QUER CONFERIR SE DEU CERTO?
--  Abra uma nova query, cole as 3 linhas abaixo e rode.
--  Elas nao alteram nada - so mostram o resultado.
--
--    SELECT indexname FROM pg_indexes WHERE tablename IN ('protocols','order_payments','financial_records','inventory_items');
--    SELECT column_name FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'variations';
--    SELECT public.next_protocol_id('TESTE');
--
--  A ultima linha devolve algo como "#TESTE-0001".
--  Pode rodar sem medo: usa o prefixo TESTE, nao gasta numero dos pedidos reais.
-- ============================================================
