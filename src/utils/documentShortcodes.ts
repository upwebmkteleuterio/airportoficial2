/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { DocumentTemplateEntity } from '../types/documentTemplates';

export interface ShortcodeField {
  /** Chave usada no shortcode, ex.: `aluno.nome` -> `{{aluno.nome}}`. */
  key: string;
  label: string;
  /** Valor de exemplo usado na pré-visualização. */
  sample: string;
}

export interface ShortcodeGroup {
  id: string;
  label: string;
  hint?: string;
  fields: ShortcodeField[];
}

export interface ShortcodeEntityDefinition {
  entity: DocumentTemplateEntity;
  label: string;
  groups: ShortcodeGroup[];
}

const field = (key: string, label: string, sample: string): ShortcodeField => ({ key, label, sample });

const turmaFields: ShortcodeField[] = [
  field('turma.id_anac', 'ID ANAC', '79010'),
  field('turma.id_interno_escola', 'ID interno da escola', '102'),
  field('turma.data_inicio', 'Data de início', '05/01/2026'),
  field('turma.data_termino', 'Data de término', '20/02/2026'),
  field('turma.horario_aulas', 'Horário das aulas', '08:00 às 11:50'),
  field('turma.turno', 'Turno', 'MANHÃ'),
  field('turma.cidade', 'Cidade', 'Rio de Janeiro'),
  field('turma.uf', 'UF', 'RJ'),
  field('turma.endereco_realizacao', 'Endereço de realização', 'Av. Aeroporto, 1000'),
  field('turma.carga_horaria', 'Carga horária', '80'),
];

const cursoFields: ShortcodeField[] = [
  field('curso.nome_curso', 'Nome do curso', 'Formação em Básico AVSEC'),
  field('curso.carga_horaria_total', 'Carga horária total', '80'),
];

const empresaFields: ShortcodeField[] = [
  field('empresa.nome_fantasia', 'Nome fantasia', 'Aero Segurança Ltda'),
  field('empresa.razao_social', 'Razão social', 'Aero Segurança Ltda ME'),
  field('empresa.cnpj', 'CNPJ', '12.345.678/0001-90'),
  field('empresa.responsavel', 'Responsável', 'Maria Souza'),
  field('empresa.telefone', 'Telefone', '(21) 3000-0000'),
  field('empresa.email_corporativo', 'E-mail corporativo', 'contato@empresa.com'),
];

const alunoFields: ShortcodeField[] = [
  field('aluno.nome', 'Nome completo', 'João da Silva'),
  field('aluno.cpf', 'CPF', '123.456.789-00'),
  field('aluno.rg', 'RG', '25.581.239-8'),
  field('aluno.orgao_expedicao_rg', 'Órgão expedidor (RG)', 'DICRJ'),
  field('aluno.data_nascimento', 'Data de nascimento', '02/02/1993'),
  field('aluno.nome_mae', 'Nome da mãe', 'Mônica Silva'),
  field('aluno.nome_pai', 'Nome do pai', 'Adelido da Silva'),
  field('aluno.email', 'E-mail', 'joao@email.com'),
  field('aluno.telefone', 'Telefone', '(21) 99885-1346'),
  field('aluno.cep', 'CEP', '27900-001'),
  field('aluno.endereco', 'Endereço', 'Rua B 00000'),
  field('aluno.numero', 'Número', '120'),
  field('aluno.bairro', 'Bairro', 'Barra de Macaé'),
  field('aluno.cidade', 'Cidade', 'Macaé'),
  field('aluno.estado', 'Estado', 'RJ'),
  field('aluno.grau_ensino', 'Grau de ensino', 'Ensino médio completo'),
];

const matriculaFields: ShortcodeField[] = [
  field('matricula.codigo_re', 'Código RE', '1001'),
  field('matricula.anac_codigo', 'Código ANAC', '1458 6461 0388'),
  field('matricula.tuf', 'TUF', 'RJ'),
  field('matricula.percentual_presenca', 'Percentual de presença', '100'),
  field('matricula.nota_1_chamada', 'Nota 1ª chamada', '8,5'),
  field('matricula.nota_2_chamada', 'Nota 2ª chamada', '—'),
  field('matricula.resultado_final', 'Resultado final', '8,5'),
  field('matricula.status_matricula', 'Status da matrícula', 'Ativo'),
];

const instrutorFields: ShortcodeField[] = [
  field('instrutor.nome', 'Nome completo', 'Carlos Pereira'),
  field('instrutor.cpf', 'CPF', '987.654.321-00'),
  field('instrutor.rg', 'RG', '11.222.333-4'),
  field('instrutor.data_nascimento', 'Data de nascimento', '10/05/1980'),
  field('instrutor.email', 'E-mail', 'carlos@airport.com'),
  field('instrutor.telefone', 'Telefone', '(21) 98888-7777'),
  field('instrutor.funcao', 'Função na turma', 'Instrutor_Tutor'),
];

const coordenadorFields: ShortcodeField[] = [
  field('coordenador.nome', 'Nome completo', 'Ana Coordenadora'),
  field('coordenador.cpf', 'CPF', '111.222.333-44'),
  field('coordenador.email', 'E-mail', 'ana@airport.com'),
  field('coordenador.telefone', 'Telefone', '(21) 97777-6666'),
];

const enderecoFields: ShortcodeField[] = [
  field('endereco.logradouro', 'Logradouro', 'Av. Aeroporto, 1000'),
  field('endereco.cidade', 'Cidade', 'Rio de Janeiro'),
  field('endereco.estado', 'Estado', 'RJ'),
];

const concessionariaFields: ShortcodeField[] = [
  field('concessionaria.nome_concessionaria', 'Nome da concessionária', 'RIOgaleão'),
  field('concessionaria.emails_representantes', 'E-mails dos representantes', 'representantes@riogaleao.com.br'),
  field('concessionaria.telefone_representantes', 'Telefone dos representantes', '(21) 3398-5000'),
];

export const SHORTCODE_ENTITIES: Record<DocumentTemplateEntity, ShortcodeEntityDefinition> = {
  ALUNO: {
    entity: 'ALUNO',
    label: 'Aluno',
    groups: [
      { id: 'aluno', label: 'Aluno', fields: alunoFields },
      { id: 'matricula', label: 'Matrícula', hint: 'Vínculo do aluno com a turma selecionada.', fields: matriculaFields },
      { id: 'turma', label: 'Turma', hint: 'Turma de contexto escolhida na geração.', fields: turmaFields },
      { id: 'curso', label: 'Curso', hint: 'Curso da turma de contexto.', fields: cursoFields },
      { id: 'empresa', label: 'Empresa', hint: 'Empresa B2B do aluno.', fields: empresaFields },
    ],
  },
  INSTRUTOR: {
    entity: 'INSTRUTOR',
    label: 'Instrutor',
    groups: [
      { id: 'instrutor', label: 'Instrutor', fields: instrutorFields },
      { id: 'turma', label: 'Turma', hint: 'Turma de contexto escolhida na geração.', fields: turmaFields },
      { id: 'curso', label: 'Curso', hint: 'Curso da turma de contexto.', fields: cursoFields },
    ],
  },
  COORDENADOR: {
    entity: 'COORDENADOR',
    label: 'Coordenador',
    groups: [
      { id: 'coordenador', label: 'Coordenador', fields: coordenadorFields },
      { id: 'turma', label: 'Turma', hint: 'Turma de contexto escolhida na geração.', fields: turmaFields },
      { id: 'curso', label: 'Curso', hint: 'Curso da turma de contexto.', fields: cursoFields },
    ],
  },
  TURMA: {
    entity: 'TURMA',
    label: 'Turma',
    groups: [
      { id: 'turma', label: 'Turma', fields: turmaFields },
      { id: 'curso', label: 'Curso', fields: cursoFields },
      { id: 'endereco', label: 'Endereço', fields: enderecoFields },
      { id: 'concessionaria', label: 'Concessionária da visita', fields: concessionariaFields },
    ],
  },
  EMPRESA: {
    entity: 'EMPRESA',
    label: 'Empresa',
    groups: [{ id: 'empresa', label: 'Empresa', fields: empresaFields }],
  },
};

export const DOCUMENT_TEMPLATE_ENTITIES: { value: DocumentTemplateEntity; label: string }[] = [
  { value: 'ALUNO', label: 'Aluno' },
  { value: 'INSTRUTOR', label: 'Instrutor' },
  { value: 'COORDENADOR', label: 'Coordenador' },
  { value: 'TURMA', label: 'Turma' },
  { value: 'EMPRESA', label: 'Empresa' },
];

export function getShortcodeGroups(entity: DocumentTemplateEntity): ShortcodeGroup[] {
  return SHORTCODE_ENTITIES[entity]?.groups ?? [];
}

export function getEntityLabel(entity: DocumentTemplateEntity): string {
  return SHORTCODE_ENTITIES[entity]?.label ?? entity;
}

export function shortcodeToken(key: string): string {
  return `{{${key}}}`;
}

/** Monta um conjunto de dados de exemplo para a pré-visualização do modelo. */
export function buildSampleData(entity: DocumentTemplateEntity): Record<string, string> {
  const data: Record<string, string> = {};
  getShortcodeGroups(entity).forEach((group) => {
    group.fields.forEach((item) => {
      data[item.key] = item.sample;
    });
  });
  return data;
}

const SHORTCODE_REGEX = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Substitui os shortcodes do HTML pelos valores informados.
 * Shortcodes sem valor correspondente são mantidos como estão.
 */
export function resolveShortcodes(html: string, data: Record<string, string>): string {
  return html.replace(SHORTCODE_REGEX, (match, key: string) => {
    const value = data[key];
    if (value === undefined || value === null || value === '') return match;
    return escapeHtml(value);
  });
}

/** Lista todas as chaves de shortcode de uma entidade (incluindo relacionadas). */
export function listShortcodeKeys(entity: DocumentTemplateEntity): string[] {
  return getShortcodeGroups(entity).flatMap((group) => group.fields.map((item) => item.key));
}
