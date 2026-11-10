ALTER TABLE public.vendas
  ADD COLUMN IF NOT EXISTS cancelada boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cancelada_motivo text,
  ADD COLUMN IF NOT EXISTS renegociada boolean NOT NULL DEFAULT false