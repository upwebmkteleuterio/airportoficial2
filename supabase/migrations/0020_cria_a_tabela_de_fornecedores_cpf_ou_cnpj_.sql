CREATE TABLE public.fornecedores (
  id text NOT NULL,
  nome text NOT NULL,
  tipo_documento text NOT NULL,
  cpf_cnpj text NOT NULL,
  cep text,
  logradouro text,
  numero text,
  complemento text,
  bairro text,
  cidade text,
  estado text,
  telefone text,
  email text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fornecedores_pkey PRIMARY KEY (id),
  CONSTRAINT fornecedores_nome_check CHECK (btrim(nome) <> ''),
  CONSTRAINT fornecedores_tipo_documento_check CHECK (tipo_documento IN ('CPF','CNPJ')),
  CONSTRAINT fornecedores_documento_check CHECK (
    (tipo_documento = 'CPF' AND cpf_cnpj ~ '^[0-9]{11}$')
    OR (tipo_documento = 'CNPJ' AND cpf_cnpj ~ '^[0-9]{14}$')
  )
)