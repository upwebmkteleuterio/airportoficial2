CREATE TABLE public.resumo_financeiro_mensal (
  banco_id text NOT NULL,
  ano integer NOT NULL,
  mes integer NOT NULL,
  total_entradas numeric(14,2) NOT NULL DEFAULT 0,
  total_saidas numeric(14,2) NOT NULL DEFAULT 0,
  saldo_periodo numeric(14,2) GENERATED ALWAYS AS (total_entradas - total_saidas) STORED,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT resumo_financeiro_mensal_pkey PRIMARY KEY (banco_id, ano, mes),
  CONSTRAINT resumo_financeiro_mensal_banco_id_fkey FOREIGN KEY (banco_id) REFERENCES public.bancos(id) ON DELETE CASCADE,
  CONSTRAINT resumo_financeiro_mensal_mes_check CHECK (mes BETWEEN 1 AND 12),
  CONSTRAINT resumo_financeiro_mensal_ano_check CHECK (ano BETWEEN 2000 AND 2200)
)