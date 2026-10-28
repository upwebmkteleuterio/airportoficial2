CREATE TABLE public.bancos (
  id text NOT NULL,
  nome text NOT NULL,
  tipo text NOT NULL DEFAULT 'BANCO',
  logo_url text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bancos_pkey PRIMARY KEY (id),
  CONSTRAINT bancos_nome_check CHECK (btrim(nome) <> ''),
  CONSTRAINT bancos_tipo_check CHECK (tipo IN ('BANCO','COFRE_LOCAL'))
)