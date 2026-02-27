-- FIX: Adiciona colunas client_name e client_email à tabela protocols
-- Contexto: Essas colunas são usadas no checkout, orders e admin para identificar
--           o cliente que fez o pedido, mas não existiam no schema original.

ALTER TABLE protocols
  ADD COLUMN IF NOT EXISTS client_name text,
  ADD COLUMN IF NOT EXISTS client_email text,
  ADD COLUMN IF NOT EXISTS client_phone text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'inquiry'; -- 'inquiry', 'awaiting_payment', 'in_production', 'done'

-- Índice para busca rápida por email (usado no orders.js e profile.js)
CREATE INDEX IF NOT EXISTS protocols_client_email_idx ON protocols (client_email);

-- Notificar o PostgREST para recarregar o schema cache
NOTIFY pgrst, 'reload schema';

