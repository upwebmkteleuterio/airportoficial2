CREATE TABLE public.document_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  entidade_principal text NOT NULL,
  conteudo_html text NOT NULL DEFAULT '',
  criado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT document_templates_nome_check CHECK (btrim(nome) <> ''),
  CONSTRAINT document_templates_entidade_check CHECK (entidade_principal IN ('ALUNO','INSTRUTOR','COORDENADOR','TURMA','EMPRESA'))
);