-- ============================================================
--  CUPONS DE DESCONTO
--  Gerado em 14/08/2026
-- ============================================================
--
--  O codigo de cupom ja existe e ja esta carregado no checkout
--  (scripts/services/coupon-service.js), mas as tabelas nunca
--  foram criadas. Hoje o cliente digita um cupom e da erro.
--
--  Este arquivo cria: coupons, coupon_usage e as duas funcoes
--  que o site chama.
--
--  Ja nasce com loja_id, pronto para o multi-loja.
--
--  COMO USAR: SQL Editor do Supabase -> New query -> colar -> RUN
--  E SEGURO: usa IF NOT EXISTS. Pode rodar duas vezes.
-- ============================================================


-- ------------------------------------------------------------
-- 1) Tabela de cupons
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.coupons (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    loja_id               uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    code                  text NOT NULL,
    description           text,

    -- percentage = % off | fixed = R$ off | free_shipping = frete gratis
    discount_type         text NOT NULL DEFAULT 'percentage'
                          CHECK (discount_type IN ('percentage', 'fixed', 'free_shipping')),
    discount_value        numeric(10,2) NOT NULL DEFAULT 0,

    min_order_value       numeric(10,2) NOT NULL DEFAULT 0,  -- pedido minimo
    max_discount          numeric(10,2),                     -- teto do desconto (opcional)

    usage_limit           integer,     -- quantas vezes no total (null = sem limite)
    usage_limit_per_user  integer,     -- quantas vezes por cliente (null = sem limite)
    usage_count           integer NOT NULL DEFAULT 0,

    starts_at             timestamptz,
    expires_at            timestamptz,
    active                boolean NOT NULL DEFAULT true,
    created_at            timestamptz NOT NULL DEFAULT now()
);

-- Mesmo codigo nao pode repetir dentro da mesma loja (ignora maiuscula/minuscula)
CREATE UNIQUE INDEX IF NOT EXISTS coupons_loja_code_unique
    ON public.coupons (loja_id, upper(btrim(code)));

COMMENT ON TABLE public.coupons IS 'Cupons de desconto por loja.';


-- ------------------------------------------------------------
-- 2) Registro de uso (quem usou, em qual pedido, quanto abateu)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.coupon_usage (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_id       uuid NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
    user_id         uuid,
    -- protocols.id e texto (ex.: '#REQ-0001'), por isso text e nao uuid
    order_id        text,
    discount_amount numeric(10,2) NOT NULL DEFAULT 0,
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coupon_usage_coupon ON public.coupon_usage (coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_user   ON public.coupon_usage (user_id);


-- ------------------------------------------------------------
-- 3) validate_coupon() - o site chama esta funcao no checkout
--    Devolve: { valid, message, coupon }
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_coupon(
    p_code        text,
    p_user_id     uuid,
    p_order_value numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_cupom public.coupons%ROWTYPE;
    v_usos_do_cliente integer;
BEGIN
    SELECT * INTO v_cupom
    FROM public.coupons
    WHERE upper(btrim(code)) = upper(btrim(p_code))
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('valid', false, 'message', 'Cupom nao encontrado.');
    END IF;

    IF NOT v_cupom.active THEN
        RETURN jsonb_build_object('valid', false, 'message', 'Este cupom nao esta mais ativo.');
    END IF;

    IF v_cupom.starts_at IS NOT NULL AND now() < v_cupom.starts_at THEN
        RETURN jsonb_build_object('valid', false, 'message', 'Este cupom ainda nao comecou a valer.');
    END IF;

    IF v_cupom.expires_at IS NOT NULL AND now() > v_cupom.expires_at THEN
        RETURN jsonb_build_object('valid', false, 'message', 'Este cupom expirou.');
    END IF;

    IF p_order_value < v_cupom.min_order_value THEN
        RETURN jsonb_build_object(
            'valid', false,
            'message', 'Pedido minimo de R$ ' || to_char(v_cupom.min_order_value, 'FM999999990.00') || ' para usar este cupom.'
        );
    END IF;

    IF v_cupom.usage_limit IS NOT NULL AND v_cupom.usage_count >= v_cupom.usage_limit THEN
        RETURN jsonb_build_object('valid', false, 'message', 'Este cupom atingiu o limite de uso.');
    END IF;

    IF v_cupom.usage_limit_per_user IS NOT NULL AND p_user_id IS NOT NULL THEN
        SELECT count(*) INTO v_usos_do_cliente
        FROM public.coupon_usage
        WHERE coupon_id = v_cupom.id AND user_id = p_user_id;

        IF v_usos_do_cliente >= v_cupom.usage_limit_per_user THEN
            RETURN jsonb_build_object('valid', false, 'message', 'Voce ja usou este cupom.');
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'valid', true,
        'message', 'Cupom valido.',
        'coupon', to_jsonb(v_cupom)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_coupon(text, uuid, numeric) TO anon, authenticated;


-- ------------------------------------------------------------
-- 4) register_coupon_usage() - grava o uso E incrementa o contador
--    numa operacao so (o JS nao consegue fazer "usage_count + 1")
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.register_coupon_usage(
    p_coupon_id       uuid,
    p_user_id         uuid,
    p_order_id        text,
    p_discount_amount numeric
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.coupon_usage (coupon_id, user_id, order_id, discount_amount)
    VALUES (p_coupon_id, p_user_id, p_order_id, COALESCE(p_discount_amount, 0));

    UPDATE public.coupons
    SET usage_count = usage_count + 1
    WHERE id = p_coupon_id;

    RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_coupon_usage(uuid, uuid, text, numeric) TO anon, authenticated;


-- ------------------------------------------------------------
-- 5) Seguranca: so admin/funcionario mexe nos cupons pelo site.
--    O cliente nunca le a tabela direto - ele passa pelas funcoes
--    acima, que rodam com permissao de dono.
-- ------------------------------------------------------------
ALTER TABLE public.coupons      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS coupons_admin_all ON public.coupons;
CREATE POLICY coupons_admin_all ON public.coupons
    FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role IN ('admin', 'employee')
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role IN ('admin', 'employee')
    ));

DROP POLICY IF EXISTS coupon_usage_admin_read ON public.coupon_usage;
CREATE POLICY coupon_usage_admin_read ON public.coupon_usage
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role IN ('admin', 'employee')
    ));


-- ------------------------------------------------------------
-- 6) Um cupom de exemplo para voce testar (10% off, pedido min R$ 50)
--    Pode apagar depois: DELETE FROM public.coupons WHERE code = 'BEMVINDO10';
-- ------------------------------------------------------------
INSERT INTO public.coupons (code, description, discount_type, discount_value, min_order_value, active)
SELECT 'BEMVINDO10', 'Cupom de teste - 10% de desconto', 'percentage', 10, 50, true
WHERE NOT EXISTS (
    SELECT 1 FROM public.coupons WHERE upper(btrim(code)) = 'BEMVINDO10'
);


-- ============================================================
--  FIM. Esperado: "Success. No rows returned".
--
--  TESTE RAPIDO (cole numa query nova):
--    SELECT public.validate_coupon('BEMVINDO10', NULL, 100);
--  Deve devolver "valid": true.
--
--    SELECT public.validate_coupon('BEMVINDO10', NULL, 10);
--  Deve devolver "valid": false com aviso de pedido minimo.
-- ============================================================
