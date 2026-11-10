CREATE TABLE IF NOT EXISTS public.aplicacao_movimentos (
  id text PRIMARY KEY,
  aplicacao_id text NOT NULL REFERENCES public.aplicacoes(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  valor numeric(14,2) NOT NULL,
  data date NOT NULL,
  percentual numeric(9,4),
  observacoes text NOT NULL DEFAULT '',
  lancamento_id text REFERENCES public.lancamentos_financeiros(id) ON DELETE SET NULL,
  created_by text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT aplicacao_movimentos_tipo_check CHECK (tipo = ANY (ARRAY['APORTE','RENDIMENTO','RESGATE'])),
  CONSTRAINT aplicacao_movimentos_valor_check CHECK (valor > 0)
)