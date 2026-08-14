-- Numero de pedido sequencial, gerado pelo banco (nunca repete).
-- Substitui o sorteio de 4 digitos (#REQ-1234), que colide por volta do 112o pedido.
--
-- Ja nasce preparado para multi-loja: cada loja tem a propria contagem.
-- Enquanto so existe a Marca Viva, todas usam a loja padrao.
--
-- Execute no SQL Editor do Supabase. Pode rodar duas vezes sem problema.

-- 1) Contador por loja e por prefixo (REQ = solicitacao, MV = protocolo aprovado)
CREATE TABLE IF NOT EXISTS public.protocol_counters (
    loja_id     uuid    NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    prefix      text    NOT NULL DEFAULT 'REQ',
    last_number bigint  NOT NULL DEFAULT 0,
    updated_at  timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (loja_id, prefix)
);

COMMENT ON TABLE public.protocol_counters IS
    'Contador sequencial de pedidos por loja. Uma linha por (loja, prefixo).';

-- 2) Funcao que devolve o proximo numero, de forma atomica.
--    Dois clientes clicando ao mesmo tempo recebem numeros diferentes.
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
    v_num       bigint;
    v_candidate text;
    v_tentativas int := 0;
BEGIN
    LOOP
        -- Incrementa o contador e ja devolve o valor novo (operacao atomica)
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

-- 3) Permitir que o site (usuario logado) chame a funcao
GRANT EXECUTE ON FUNCTION public.next_protocol_id(text, uuid) TO anon, authenticated;

-- 4) Trava a tabela de contadores: ninguem le nem escreve direto pelo site.
--    So a funcao acima (SECURITY DEFINER) mexe nela.
ALTER TABLE public.protocol_counters ENABLE ROW LEVEL SECURITY;

-- 5) Conferencia (opcional): rode para ver o proximo numero sem gastar
-- SELECT last_number FROM public.protocol_counters;
