-- Migration: Add Production Fields to Protocols Table
-- Description: Adds checks, deadlines, and priorities for the new Command Center.

-- 1. Add 'due_date' (Prazo de Entrega)
ALTER TABLE protocols 
ADD COLUMN IF NOT EXISTS due_date TIMESTAMP WITH TIME ZONE;

-- 2. Add 'priority' (Prioridade: 'normal', 'high', 'urgent')
ALTER TABLE protocols 
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal';

-- 3. Add 'production_steps' (Checklist JSON)
-- Stores structure like: [{"name": "Corte", "status": "pending"}, {"name": "Costura", "status": "done"}]
ALTER TABLE protocols 
ADD COLUMN IF NOT EXISTS production_steps JSONB DEFAULT '[]'::jsonb;

-- 4. Add 'assigned_to' (Responsável)
ALTER TABLE protocols 
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id);

-- 5. Add 'production_notes' (Observações Internas da Fábrica)
ALTER TABLE protocols 
ADD COLUMN IF NOT EXISTS production_notes TEXT;

-- 6. Index for faster filtering by due_date
CREATE INDEX IF NOT EXISTS idx_protocols_due_date ON protocols(due_date);
