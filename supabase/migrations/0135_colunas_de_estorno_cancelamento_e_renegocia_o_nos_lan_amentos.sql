ALTER TABLE public.lancamentos_financeiros
  ADD COLUMN IF NOT EXISTS estornado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS estorno_de text,
  ADD COLUMN IF NOT EXISTS estorno_motivo text,
  ADD COLUMN IF NOT EXISTS cancelado_motivo text,
  ADD COLUMN IF NOT EXISTS renegociada boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS nova_parcela boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS valor_original numeric(14,2),
  ADD COLUMN IF NOT EXISTS data_original date,
  ADD COLUMN IF NOT EXISTS parcela_original integer