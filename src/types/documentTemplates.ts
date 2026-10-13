/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Entidades que podem servir de "sujeito" principal de um modelo de documento.
 * Cada entidade determina quais grupos de shortcodes ficam disponíveis no editor.
 */
export type DocumentTemplateEntity = 'ALUNO' | 'INSTRUTOR' | 'COORDENADOR' | 'TURMA' | 'EMPRESA';

export type DocumentPageFormat = 'A4';

export interface DocumentPageMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface DocumentPageConfig {
  formato: DocumentPageFormat;
  margens: DocumentPageMargins;
}

export interface DocumentTemplate {
  id: string;
  nome: string;
  descricao?: string | null;
  entidade_principal: DocumentTemplateEntity;
  conteudo_html: string;
  configuracao?: Partial<DocumentPageConfig> | null;
  criado_por?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentTemplateInput {
  nome: string;
  descricao?: string | null;
  entidade_principal: DocumentTemplateEntity;
  conteudo_html: string;
  configuracao?: DocumentPageConfig;
}
