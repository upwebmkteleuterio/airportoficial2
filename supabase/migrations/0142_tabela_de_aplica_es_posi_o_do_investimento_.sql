CREATE TABLE IF NOT EXISTS public.aplicacoes (
  id text PRIMARY KEY,
  banco_id text NOT NULL REFERENCES public.bancos(id) ON DELETE RESTRICT,
  nome text NOT NULL,
  tipo text NOT NULL,
  data_aplicacao date NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  observacoes text NOT NULL DEFAULT '',
  created_by text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT aplicacoes_nome_check CHECK (btrim(nome) <> ''),
  CONSTRAINT aplicacoes_tipo_check CHECK (tipo = ANY (ARRAY['CDB','POUPANCA','FUNDO','TESOURO','ACOES','OUTRO']))
)