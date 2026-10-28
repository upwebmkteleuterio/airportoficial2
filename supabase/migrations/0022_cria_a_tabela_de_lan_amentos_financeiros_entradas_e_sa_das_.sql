CREATE TABLE public.lancamentos_financeiros (
  id text NOT NULL,
  tipo text NOT NULL,
  valor numeric(14,2) NOT NULL,
  data_competencia date NOT NULL,
  data_efetivacao date NOT NULL DEFAULT CURRENT_DATE,
  categoria_id text NOT NULL,
  banco_id text NOT NULL,
  descricao text NOT NULL DEFAULT '',
  forma_pagamento text,
  numero_documento text,
  observacoes text NOT NULL DEFAULT '',
  participante_tipo text,
  pessoa_id text,
  empresa_id text,
  fornecedor_id text,
  participante_nome text,
  participante_documento text,
  turma_id text,
  matricula_id text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lancamentos_financeiros_pkey PRIMARY KEY (id),
  CONSTRAINT lancamentos_financeiros_tipo_check CHECK (tipo IN ('ENTRADA','SAIDA')),
  CONSTRAINT lancamentos_financeiros_valor_check CHECK (valor > 0),
  CONSTRAINT lancamentos_financeiros_forma_pagamento_check CHECK (
    forma_pagamento IS NULL OR forma_pagamento IN ('PIX','DINHEIRO','BOLETO','TRANSFERENCIA','CARTAO','CHEQUE','OUTRO')
  ),
  CONSTRAINT lancamentos_financeiros_participante_tipo_check CHECK (
    participante_tipo IS NULL OR participante_tipo IN ('ALUNO','INSTRUTOR','COORDENADOR','EMPRESA','FORNECEDOR')
  ),
  CONSTRAINT lancamentos_financeiros_participante_check CHECK (
    (participante_tipo IS NULL AND pessoa_id IS NULL AND empresa_id IS NULL AND fornecedor_id IS NULL)
    OR (participante_tipo IN ('ALUNO','INSTRUTOR','COORDENADOR') AND pessoa_id IS NOT NULL AND empresa_id IS NULL AND fornecedor_id IS NULL)
    OR (participante_tipo = 'EMPRESA' AND empresa_id IS NOT NULL AND pessoa_id IS NULL AND fornecedor_id IS NULL)
    OR (participante_tipo = 'FORNECEDOR' AND fornecedor_id IS NOT NULL AND pessoa_id IS NULL AND empresa_id IS NULL)
  ),
  CONSTRAINT lancamentos_financeiros_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.categorias_financeiras(id) ON DELETE RESTRICT,
  CONSTRAINT lancamentos_financeiros_banco_id_fkey FOREIGN KEY (banco_id) REFERENCES public.bancos(id) ON DELETE RESTRICT,
  CONSTRAINT lancamentos_financeiros_pessoa_id_fkey FOREIGN KEY (pessoa_id) REFERENCES public.pessoas(id) ON DELETE RESTRICT,
  CONSTRAINT lancamentos_financeiros_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE RESTRICT,
  CONSTRAINT lancamentos_financeiros_fornecedor_id_fkey FOREIGN KEY (fornecedor_id) REFERENCES public.fornecedores(id) ON DELETE RESTRICT,
  CONSTRAINT lancamentos_financeiros_turma_id_fkey FOREIGN KEY (turma_id) REFERENCES public.turmas(id) ON DELETE SET NULL,
  CONSTRAINT lancamentos_financeiros_matricula_id_fkey FOREIGN KEY (matricula_id) REFERENCES public.matriculas(id) ON DELETE SET NULL
)