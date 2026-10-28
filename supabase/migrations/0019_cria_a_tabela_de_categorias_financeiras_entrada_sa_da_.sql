CREATE TABLE public.categorias_financeiras (
  id text NOT NULL,
  nome text NOT NULL,
  tipo text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT categorias_financeiras_pkey PRIMARY KEY (id),
  CONSTRAINT categorias_financeiras_nome_check CHECK (btrim(nome) <> ''),
  CONSTRAINT categorias_financeiras_tipo_check CHECK (tipo IN ('ENTRADA','SAIDA'))
)