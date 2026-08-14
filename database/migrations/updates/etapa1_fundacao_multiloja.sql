-- ============================================================
--  ETAPA 1 - FUNDACAO MULTI-LOJA (METADE 1 de 2)
--  Gerado em 14/08/2026
-- ============================================================
--
--  O QUE ESTE ARQUIVO FAZ:
--    1. Cria a tabela de lojas
--    2. Cadastra a Marca Viva como loja numero 1
--    3. Cria a tabela de membros (quem trabalha em qual loja)
--    4. Poe uma etiqueta 'loja_id' em 22 tabelas
--    5. Marca TODO o dado que ja existe como sendo da Marca Viva
--
--  O QUE ELE **NAO** FAZ (de proposito):
--    NAO liga a trava que impede uma loja de ver a outra.
--    Isso e a Metade 2, e so faz sentido quando existir uma
--    segunda loja de verdade. Ligar antes so aumenta o risco
--    sem nenhum ganho.
--
--  POR ISSO ESTE ARQUIVO E SEGURO:
--    A etiqueta entra com valor padrao "Marca Viva". Todo dado
--    existente ja fica etiquetado. Todo dado novo tambem.
--    Nenhuma consulta do site precisa mudar. Nada quebra hoje.
--
--  COMO USAR: SQL Editor do Supabase -> New query -> colar -> RUN
--  E SEGURO RODAR DUAS VEZES.
-- ============================================================


-- ------------------------------------------------------------
-- 1) As lojas (cada gráfica que usar o sistema vira uma linha)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lojas (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nome          text NOT NULL,
    slug          text NOT NULL,          -- vira o subdominio: slug.seusistema.com.br
    cnpj          text,
    email_contato text,
    telefone      text,

    -- visual proprio de cada loja
    logo_url      text,
    cor_primaria  text DEFAULT '#ea580c',

    -- controle do seu negocio
    plano         text NOT NULL DEFAULT 'gratis'
                  CHECK (plano IN ('gratis', 'basico', 'pro')),
    ativa         boolean NOT NULL DEFAULT true,

    criada_em     timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS lojas_slug_unico
    ON public.lojas (lower(btrim(slug)));

COMMENT ON TABLE public.lojas IS 'Cada grafica que usa o sistema. A Marca Viva e a numero 1.';


-- ------------------------------------------------------------
-- 2) A Marca Viva entra como loja numero 1
--    O id fixo abaixo e o mesmo que ja esta como padrao nas
--    tabelas criadas hoje (cupons, chat, contadores).
-- ------------------------------------------------------------
INSERT INTO public.lojas (id, nome, slug, cnpj, plano, ativa)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Marca Viva',
    'marcaviva',
    '63.751.909/0001-00',
    'pro',
    true
)
ON CONFLICT (id) DO NOTHING;


-- ------------------------------------------------------------
-- 3) Quem trabalha em qual loja
--    (o cliente NAO entra aqui - so dono e funcionario)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.loja_membros (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    loja_id    uuid NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
    user_id    uuid NOT NULL,
    papel      text NOT NULL DEFAULT 'employee'
               CHECK (papel IN ('owner', 'admin', 'employee')),
    criado_em  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS loja_membros_unico
    ON public.loja_membros (loja_id, user_id);

COMMENT ON TABLE public.loja_membros IS 'Equipe de cada loja. Um usuario pode servir mais de uma loja.';

-- Quem ja e admin/funcionario hoje vira membro da Marca Viva
INSERT INTO public.loja_membros (loja_id, user_id, papel)
SELECT '00000000-0000-0000-0000-000000000001', p.id,
       CASE WHEN p.role = 'admin' THEN 'admin' ELSE 'employee' END
FROM public.profiles p
WHERE p.role IN ('admin', 'employee')
ON CONFLICT (loja_id, user_id) DO NOTHING;


-- ------------------------------------------------------------
-- 4) A etiqueta nas 22 tabelas
--
--    Faz uma por uma, checando antes se ja tem. Por isso pode
--    rodar de novo sem estragar nada.
-- ------------------------------------------------------------
DO $$
DECLARE
    t         text;
    loja_padrao constant text := '00000000-0000-0000-0000-000000000001';
    tabelas   text[] := ARRAY[
        'products', 'product_tiers', 'categories',
        'protocols', 'protocol_items', 'protocol_history',
        'profiles', 'kanban_columns', 'site_settings',
        'financial_records', 'financial_goals', 'financial_history',
        'order_payments',
        'inventory_items', 'inventory_movements',
        'admin_audit_logs', 'app_sync_logs',
        'newsletter_subscribers', 'product_reviews', 'user_favorites',
        'notifications'
    ];
BEGIN
    FOREACH t IN ARRAY tabelas LOOP

        -- pula tabela que nao existe (ex.: se algum SQL anterior nao foi rodado)
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = t
        ) THEN
            RAISE NOTICE 'pulando % (tabela nao existe)', t;
            CONTINUE;
        END IF;

        -- pula se ja tem a etiqueta
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = t AND column_name = 'loja_id'
        ) THEN
            RAISE NOTICE 'pulando % (ja tem loja_id)', t;
            CONTINUE;
        END IF;

        -- adiciona a coluna ja com o valor padrao.
        -- o Postgres preenche TODAS as linhas existentes automaticamente.
        EXECUTE format(
            'ALTER TABLE public.%I ADD COLUMN loja_id uuid NOT NULL DEFAULT %L',
            t, loja_padrao
        );

        -- liga com a tabela de lojas (impede loja_id apontando para o nada)
        EXECUTE format(
            'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (loja_id) REFERENCES public.lojas(id)',
            t, t || '_loja_fk'
        );

        -- indice: toda consulta do sistema vai filtrar por loja
        EXECUTE format(
            'CREATE INDEX IF NOT EXISTS %I ON public.%I (loja_id)',
            'idx_' || t || '_loja', t
        );

        RAISE NOTICE 'etiquetada: %', t;
    END LOOP;
END $$;


-- ------------------------------------------------------------
-- 5) Seguranca das tabelas novas
--    (as duas so serao lidas pela equipe)
-- ------------------------------------------------------------
ALTER TABLE public.lojas        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loja_membros ENABLE ROW LEVEL SECURITY;

-- Qualquer visitante precisa poder ler os dados publicos da loja
-- (nome, logo, cor) para o site montar a vitrine.
DROP POLICY IF EXISTS lojas_leitura_publica ON public.lojas;
CREATE POLICY lojas_leitura_publica ON public.lojas
    FOR SELECT TO anon, authenticated
    USING (ativa = true);

-- Alterar a loja: so quem e dono ou admin dela
DROP POLICY IF EXISTS lojas_escrita_equipe ON public.lojas;
CREATE POLICY lojas_escrita_equipe ON public.lojas
    FOR UPDATE TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.loja_membros m
        WHERE m.loja_id = lojas.id AND m.user_id = auth.uid()
          AND m.papel IN ('owner', 'admin')
    ));

-- A lista de membros: so a propria equipe enxerga
DROP POLICY IF EXISTS loja_membros_equipe ON public.loja_membros;
CREATE POLICY loja_membros_equipe ON public.loja_membros
    FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.loja_membros m2
        WHERE m2.loja_id = loja_membros.loja_id AND m2.user_id = auth.uid()
          AND m2.papel IN ('owner', 'admin')
    ));


-- ============================================================
--  FIM. Esperado: "Success. No rows returned".
--  (Pode aparecer varias linhas de NOTICE dizendo o que foi
--   etiquetado - isso e normal e bom sinal.)
--
--  CONFERINDO (cole numa query nova):
--
--    -- a loja existe?
--    SELECT nome, slug, plano FROM public.lojas;
--
--    -- quantas tabelas ganharam a etiqueta?
--    SELECT count(*) FROM information_schema.columns
--    WHERE table_schema='public' AND column_name='loja_id';
--
--    -- todo pedido antigo ficou como Marca Viva?
--    SELECT loja_id, count(*) FROM public.protocols GROUP BY loja_id;
-- ============================================================
