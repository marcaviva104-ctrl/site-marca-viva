# Migrations arquivadas

Arquivos movidos para cá porque criavam definições **conflitantes** de tabelas que já
existem em produção, causando schema drift. Não rode estes arquivos de novo — eles
ficam aqui só como histórico. As migrations de `../fixes/` são a fonte da verdade atual
para essas tabelas.

## Financeiro (2026-08-17)

- `create_financial_goals.sql` — definia `financial_goals.retention_rate`
- `advanced_financial.sql` — definia `financial_goals.allocation_percentage` (conflito com o acima) + colunas que já existem em outras migrations ativas (`type`/`category` em `update_financial_schema.sql`, parcelamento em `advanced_features.sql`). As duas colunas que só existiam aqui (`products.recipe`, `financial_records.customer_rating`) foram extraídas para `../updates/add_recipe_and_customer_rating.sql` antes do arquivamento.
- `step2_financial_history.sql` — definia `financial_history` com policy RLS pública
- `create_financial_history.sql` — definia `financial_history` com policy RLS restrita a `role='admin'` e `changed_by UUID REFERENCES auth.users(id)` (conflito de policy **e** de tipo de coluna — o código grava e-mail em texto em `changed_by`, não UUID)

Correção consolidada e idempotente: `../fixes/20260817_fix_financial_goals_schema.sql` e
`../fixes/20260817_fix_financial_history_rls.sql`.
