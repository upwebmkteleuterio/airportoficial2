CREATE TABLE public.saldos_contas (
  banco_id text NOT NULL,
  saldo_inicial numeric(14,2) NOT NULL DEFAULT 0,
  data_saldo_inicial date NOT NULL DEFAULT CURRENT_DATE,
  total_entradas numeric(14,2) NOT NULL DEFAULT 0,
  total_saidas numeric(14,2) NOT NULL DEFAULT 0,
  saldo_atual numeric(14,2) GENERATED ALWAYS AS (saldo_inicial + total_entradas - total_saidas) STORED,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT saldos_contas_pkey PRIMARY KEY (banco_id),
  CONSTRAINT saldos_contas_banco_id_fkey FOREIGN KEY (banco_id) REFERENCES public.bancos(id) ON DELETE CASCADE
)