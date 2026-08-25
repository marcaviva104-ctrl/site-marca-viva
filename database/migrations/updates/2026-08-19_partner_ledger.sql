-- Conta corrente por cliente/parceiro: permite lançar em Nova Despesa que uma
-- compra foi "adiantada" por um lado (empresa ou o cliente) e ver o saldo
-- líquido acumulado entre a empresa e cada cliente (quem deve quanto a quem).
--
-- Convenção de sinal: paid_by='empresa' -> empresa adiantou (cliente fica
-- devendo); paid_by='parceiro' -> cliente adiantou (empresa fica devendo).
-- Saldo do cliente = soma(paid_by='empresa') - soma(paid_by='parceiro').
--
-- paid_by='parceiro' NÃO é saída de caixa real da empresa -- precisa ser
-- excluído dos totais de despesa (feito no código, admin.js/financial-aggregator.js).

ALTER TABLE public.financial_records ADD COLUMN IF NOT EXISTS partner_client_id UUID REFERENCES auth.users(id);
ALTER TABLE public.financial_records ADD COLUMN IF NOT EXISTS paid_by TEXT CHECK (paid_by IN ('empresa', 'parceiro'));
