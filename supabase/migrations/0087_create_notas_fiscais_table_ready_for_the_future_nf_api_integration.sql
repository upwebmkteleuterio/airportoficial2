CREATE TABLE public.notas_fiscais (
  id text NOT NULL DEFAULT ('nota-' || gen_random_uuid()::text),
  venda_id text NOT NULL,
  tipo_documento text NOT NULL DEFAULT 'NFS_E',
  ambiente text NOT NULL DEFAULT 'HOMOLOGACAO',
  situacao text NOT NULL DEFAULT 'PENDENTE',
  tomador_tipo text NOT NULL,
  tomador_nome text NOT NULL,
  tomador_documento text NOT NULL,
  tomador_email text,
  tomador_inscricao_municipal text,
  tomador_logradouro text,
  tomador_numero text,
  tomador_complemento text,
  tomador_bairro text,
  tomador_cidade text,
  tomador_uf text,
  tomador_cep text,
  tomador_codigo_municipio_ibge text,
  servico_descricao text NOT NULL,
  servico_codigo text,
  item_lista_servico text,
  municipio_prestacao text,
  codigo_municipio_prestacao text,
  valor_servicos numeric(14,2) NOT NULL DEFAULT 0,
  valor_deducoes numeric(14,2) NOT NULL DEFAULT 0,
  valor_desconto numeric(14,2) NOT NULL DEFAULT 0,
  base_calculo numeric(14,2) NOT NULL DEFAULT 0,
  aliquota_iss numeric(5,2),
  valor_iss numeric(14,2) NOT NULL DEFAULT 0,
  iss_retido boolean NOT NULL DEFAULT false,
  valor_liquido numeric(14,2) NOT NULL DEFAULT 0,
  numero text,
  serie text,
  chave_acesso text,
  data_emissao timestamp with time zone,
  competencia date,
  provedor text,
  provedor_id text,
  mensagem_retorno text,
  pdf_url text,
  xml_url text,
  created_by text DEFAULT public.current_user_legacy_id(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT notas_fiscais_pkey PRIMARY KEY (id),
  CONSTRAINT notas_fiscais_venda_id_fkey FOREIGN KEY (venda_id) REFERENCES public.vendas(id) ON DELETE RESTRICT,
  CONSTRAINT notas_fiscais_tipo_documento_check CHECK (tipo_documento IN ('NFS_E','NF_E')),
  CONSTRAINT notas_fiscais_ambiente_check CHECK (ambiente IN ('HOMOLOGACAO','PRODUCAO')),
  CONSTRAINT notas_fiscais_situacao_check CHECK (situacao IN ('PENDENTE','PROCESSANDO','EMITIDA','CANCELADA','ERRO')),
  CONSTRAINT notas_fiscais_tomador_tipo_check CHECK (tomador_tipo IN ('ALUNO','EMPRESA')),
  CONSTRAINT notas_fiscais_chave_acesso_check CHECK (chave_acesso IS NULL OR chave_acesso ~ '^[0-9]{44}$')
);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.notas_fiscais TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.notas_fiscais TO authenticated;

ALTER TABLE public.notas_fiscais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notas_fiscais_gestor_policy" ON public.notas_fiscais AS PERMISSIVE FOR ALL TO authenticated USING (can_manage_financeiro()) WITH CHECK (can_manage_financeiro());

CREATE INDEX notas_fiscais_venda_id_idx ON public.notas_fiscais (venda_id);

CREATE UNIQUE INDEX notas_fiscais_chave_acesso_key ON public.notas_fiscais (chave_acesso) WHERE chave_acesso IS NOT NULL