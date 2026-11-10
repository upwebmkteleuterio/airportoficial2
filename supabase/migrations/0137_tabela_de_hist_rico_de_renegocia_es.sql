CREATE TABLE IF NOT EXISTS public.venda_renegociacoes (
  id text PRIMARY KEY,
  venda_id text NOT NULL REFERENCES public.vendas(id) ON DELETE CASCADE,
  observacao text NOT NULL DEFAULT '',
  resumo jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
)