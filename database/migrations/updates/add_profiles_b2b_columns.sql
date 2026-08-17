-- =====================================================================
-- profiles: registrar as colunas reais + habilitar cadastro B2B (CNPJ)
-- =====================================================================
-- Contexto: o supabase_schema.sql original cria "profiles" com apenas
-- 5 colunas (id, email, full_name, role, created_at). Todas as demais
-- foram adicionadas direto no painel do Supabase ao longo do tempo e
-- nunca voltaram para o repositório. Este arquivo fecha essa lacuna,
-- para que um ambiente novo consiga rodar o site.
--
-- Seguro rodar em banco existente: tudo usa IF NOT EXISTS e não
-- sobrescreve dado nenhum.
--
-- Como rodar: Supabase → SQL Editor → cole e execute.
-- =====================================================================

-- 1. Identificação do cliente (PF e PJ) -------------------------------
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cpf TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cnpj TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS person_type TEXT DEFAULT 'pf';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS inscricao_estadual TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;

-- 2. Liberação de acesso ---------------------------------------------
-- approved = false deixa o cadastro na fila, aguardando liberação
-- manual no painel (Admin → Clientes).
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS approved BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- 3. Dados complementares --------------------------------------------
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address JSONB DEFAULT '{}'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS birthdate DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- 4. Proteger quem já é cliente ---------------------------------------
-- Antes de ligar o bloqueio por aprovação, ninguém que já usa o site
-- pode ficar de fora. Cadastros antigos com approved NULL viram true.
UPDATE profiles SET approved = true WHERE approved IS NULL;

-- 5. Recuperar CNPJ gravado na coluna errada --------------------------
-- O cadastro em pages/login.html gravava o CNPJ dentro de "cpf" quando
-- a pessoa escolhia PJ. Move esses valores para a coluna certa.
-- Identifica pelo formato do CNPJ (00.000.000/0000-00) para não
-- encostar em nenhum CPF legítimo.
UPDATE profiles
   SET cnpj = cpf,
       cpf  = NULL
 WHERE person_type = 'pj'
   AND cpf IS NOT NULL
   AND cpf <> ''
   AND (cnpj IS NULL OR cnpj = '')
   AND cpf ~ '^[0-9]{2}\.?[0-9]{3}\.?[0-9]{3}/?[0-9]{4}-?[0-9]{2}$';

-- 6. Busca rápida na fila de aprovação --------------------------------
CREATE INDEX IF NOT EXISTS idx_profiles_approved ON profiles(approved)
    WHERE approved = false;

-- 7. Conferência (opcional) -------------------------------------------
-- Rode para ver como ficou a base:
--   SELECT person_type, approved, COUNT(*)
--     FROM profiles GROUP BY person_type, approved;
