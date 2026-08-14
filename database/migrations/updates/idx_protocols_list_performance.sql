-- Melhora listagem do admin (order by created_at + filtro por status).
-- Execute no SQL Editor do Supabase (projeto: public.protocols).

CREATE INDEX IF NOT EXISTS idx_protocols_created_at_desc
  ON public.protocols (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_protocols_status_created_at_desc
  ON public.protocols (status, created_at DESC);
