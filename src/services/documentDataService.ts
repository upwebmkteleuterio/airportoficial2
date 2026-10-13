/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../integrations/supabase/client';
import { serviceError } from './supabaseErrors';
import type { DocumentTemplateEntity } from '../types/documentTemplates';

export interface DocumentSubjectOption {
  id: string;
  label: string;
}

type Row = Record<string, unknown>;

const text = (value: unknown): string => (value === null || value === undefined ? '' : String(value));

const formatDate = (value: unknown): string => {
  if (!value) return '';
  const raw = String(value).slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : String(value);
};

const formatDecimal = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '';
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? numeric.toLocaleString('pt-BR') : String(value);
};

async function fetchBy(table: string, column: string, value: string): Promise<Row | null> {
  const { data, error } = await supabase.from(table).select('*').eq(column, value).maybeSingle();
  if (error) throw serviceError('Não foi possível carregar dados para o documento', error);
  return (data as Row | null) ?? null;
}

async function fetchManyBy(table: string, column: string, value: string): Promise<Row[]> {
  const { data, error } = await supabase.from(table).select('*').eq(column, value);
  if (error) throw serviceError('Não foi possível carregar dados para o documento', error);
  return (data as Row[] | null) ?? [];
}

function fillAlunoProfile(data: Record<string, string>, profile: Row | null) {
  if (!profile) return;
  data['aluno.nome'] = text(profile.nome_completo);
  data['aluno.cpf'] = text(profile.cpf);
  data['aluno.rg'] = text(profile.rg);
  data['aluno.orgao_expedicao_rg'] = text(profile.orgao_expedicao_rg);
  data['aluno.data_nascimento'] = formatDate(profile.data_nascimento);
  data['aluno.nome_mae'] = text(profile.nome_mae);
  data['aluno.nome_pai'] = text(profile.nome_pai);
  data['aluno.email'] = text(profile.email);
  data['aluno.telefone'] = text(profile.telefone);
  data['aluno.cep'] = text(profile.cep);
  data['aluno.endereco'] = text(profile.endereco);
  data['aluno.numero'] = text(profile.numero);
  data['aluno.bairro'] = text(profile.bairro);
  data['aluno.cidade'] = text(profile.cidade);
  data['aluno.estado'] = text(profile.estado);
  data['aluno.grau_ensino'] = text(profile.grau_ensino);
}

function fillInstrutorProfile(data: Record<string, string>, profile: Row | null) {
  if (!profile) return;
  data['instrutor.nome'] = text(profile.nome_completo);
  data['instrutor.cpf'] = text(profile.cpf);
  data['instrutor.rg'] = text(profile.rg);
  data['instrutor.data_nascimento'] = formatDate(profile.data_nascimento);
  data['instrutor.email'] = text(profile.email);
  data['instrutor.telefone'] = text(profile.telefone);
}

function fillCoordenadorProfile(data: Record<string, string>, profile: Row | null) {
  if (!profile) return;
  data['coordenador.nome'] = text(profile.nome_completo);
  data['coordenador.cpf'] = text(profile.cpf);
  data['coordenador.email'] = text(profile.email);
  data['coordenador.telefone'] = text(profile.telefone);
}

function fillMatricula(data: Record<string, string>, matricula: Row | null) {
  if (!matricula) return;
  data['matricula.codigo_re'] = text(matricula.codigo_re);
  data['matricula.anac_codigo'] = text(matricula.anac_codigo);
  data['matricula.tuf'] = text(matricula.tuf);
  data['matricula.percentual_presenca'] = formatDecimal(matricula.percentual_presenca);
  data['matricula.nota_1_chamada'] = formatDecimal(matricula.nota_1_chamada);
  data['matricula.nota_2_chamada'] = formatDecimal(matricula.nota_2_chamada);
  data['matricula.resultado_final'] = formatDecimal(matricula.resultado_final);
  data['matricula.status_matricula'] = text(matricula.status_matricula);
}

function fillTurma(data: Record<string, string>, turma: Row | null) {
  if (!turma) return;
  data['turma.id_anac'] = text(turma.id_anac);
  data['turma.id_interno_escola'] = text(turma.id_interno_escola);
  data['turma.data_inicio'] = formatDate(turma.data_inicio);
  data['turma.data_termino'] = formatDate(turma.data_termino);
  data['turma.horario_aulas'] = text(turma.horario_aulas);
  data['turma.turno'] = text(turma.turno);
  data['turma.cidade'] = text(turma.cidade);
  data['turma.uf'] = text(turma.uf);
  data['turma.endereco_realizacao'] = text(turma.endereco_realizacao);
  data['turma.carga_horaria'] = formatDecimal(turma.carga_horaria);
}

function fillCurso(data: Record<string, string>, curso: Row | null) {
  if (!curso) return;
  data['curso.nome_curso'] = text(curso.nome_curso);
  data['curso.carga_horaria_total'] = formatDecimal(curso.carga_horaria_total);
}

function fillEmpresa(data: Record<string, string>, empresa: Row | null) {
  if (!empresa) return;
  data['empresa.nome_fantasia'] = text(empresa.nome_fantasia);
  data['empresa.razao_social'] = text(empresa.razao_social);
  data['empresa.cnpj'] = text(empresa.cnpj);
  data['empresa.responsavel'] = text(empresa.responsavel);
  data['empresa.telefone'] = text(empresa.telefone);
  data['empresa.email_corporativo'] = text(empresa.email_corporativo);
}

function fillEndereco(data: Record<string, string>, endereco: Row | null) {
  if (!endereco) return;
  data['endereco.logradouro'] = text(endereco.logradouro);
  data['endereco.cidade'] = text(endereco.cidade);
  data['endereco.estado'] = text(endereco.estado);
}

function fillConcessionaria(data: Record<string, string>, concessionaria: Row | null) {
  if (!concessionaria) return;
  data['concessionaria.nome_concessionaria'] = text(concessionaria.nome_concessionaria);
  data['concessionaria.emails_representantes'] = text(concessionaria.emails_representantes);
  data['concessionaria.telefone_representantes'] = text(concessionaria.telefone_representantes);
}

async function loadTurmaContext(data: Record<string, string>, turmaId: string) {
  const turma = await fetchBy('turmas', 'id', turmaId);
  fillTurma(data, turma);
  if (turma?.curso_id) {
    fillCurso(data, await fetchBy('cursos', 'id', String(turma.curso_id)));
  }
  return turma;
}

export interface BuildDocumentDataParams {
  entity: DocumentTemplateEntity;
  subjectId: string;
  turmaId?: string | null;
}

/** Monta o conjunto de valores reais que substitui os shortcodes de um modelo. */
export async function buildDocumentData({ entity, subjectId, turmaId }: BuildDocumentDataParams): Promise<Record<string, string>> {
  const data: Record<string, string> = {};

  if (entity === 'ALUNO') {
    const profile = await fetchBy('profiles', 'legacy_id', subjectId);
    fillAlunoProfile(data, profile);

    let empresaId = profile?.empresa_id ? String(profile.empresa_id) : null;

    if (turmaId) {
      const matriculas = await fetchManyBy('matriculas', 'aluno_id', subjectId);
      const matriculaTurma = matriculas.find((row) => text(row.turma_id) === turmaId) ?? null;
      fillMatricula(data, matriculaTurma);
      await loadTurmaContext(data, turmaId);
      if (matriculaTurma?.empresa_b2b_id) empresaId = String(matriculaTurma.empresa_b2b_id);
    }

    if (empresaId) fillEmpresa(data, await fetchBy('empresas', 'id', empresaId));
    return data;
  }

  if (entity === 'INSTRUTOR') {
    const profile = await fetchBy('profiles', 'legacy_id', subjectId);
    fillInstrutorProfile(data, profile);

    if (turmaId) {
      await loadTurmaContext(data, turmaId);
      const vinculos = await fetchManyBy('turma_instrutores', 'instrutor_id', subjectId);
      const vinculo = vinculos.find((row) => text(row.turma_id) === turmaId);
      data['instrutor.funcao'] = text(vinculo?.funcao);
    }
    return data;
  }

  if (entity === 'COORDENADOR') {
    const profile = await fetchBy('profiles', 'legacy_id', subjectId);
    fillCoordenadorProfile(data, profile);
    if (turmaId) await loadTurmaContext(data, turmaId);
    return data;
  }

  if (entity === 'TURMA') {
    const turma = await loadTurmaContext(data, subjectId);
    if (turma?.endereco_id) fillEndereco(data, await fetchBy('enderecos', 'id', String(turma.endereco_id)));
    if (turma?.concessionaria_visita_id) {
      fillConcessionaria(data, await fetchBy('concessionarias', 'id', String(turma.concessionaria_visita_id)));
    }
    return data;
  }

  fillEmpresa(data, await fetchBy('empresas', 'id', subjectId));
  return data;
}

async function listProfilesByRole(role: string): Promise<DocumentSubjectOption[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('legacy_id, nome_completo')
    .eq('role', role)
    .eq('status', 'ativo')
    .not('legacy_id', 'is', null)
    .order('nome_completo', { ascending: true });

  if (error) throw serviceError('Não foi possível carregar a lista de pessoas', error);

  return (data ?? [])
    .map((row) => ({ id: text(row.legacy_id), label: text(row.nome_completo) || text(row.legacy_id) }))
    .filter((option) => option.id);
}

/** Lista os registros que podem ser o "sujeito" de um documento, por entidade. */
export async function listDocumentSubjects(entity: DocumentTemplateEntity): Promise<DocumentSubjectOption[]> {
  if (entity === 'ALUNO') return listProfilesByRole('ALUNO');
  if (entity === 'INSTRUTOR') return listProfilesByRole('INSTRUTOR');
  if (entity === 'COORDENADOR') return listProfilesByRole('COORDENADOR');

  if (entity === 'TURMA') {
    const { data, error } = await supabase
      .from('turmas')
      .select('id, id_anac, cidade, uf')
      .order('id_anac', { ascending: true });
    if (error) throw serviceError('Não foi possível carregar a lista de turmas', error);
    return (data ?? []).map((row) => ({
      id: text(row.id),
      label: `${text(row.id_anac)} — ${text(row.cidade)}/${text(row.uf)}`.trim(),
    }));
  }

  const { data, error } = await supabase
    .from('empresas')
    .select('id, nome_fantasia')
    .order('nome_fantasia', { ascending: true });
  if (error) throw serviceError('Não foi possível carregar a lista de empresas', error);
  return (data ?? []).map((row) => ({ id: text(row.id), label: text(row.nome_fantasia) }));
}

async function peopleOptionsFromIds(ids: string[]): Promise<DocumentSubjectOption[]> {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (unique.length === 0) return [];
  const { data, error } = await supabase.from('pessoas').select('id, nome').in('id', unique);
  if (error) throw serviceError('Não foi possível carregar a lista de pessoas', error);
  const names = new Map((data ?? []).map((row) => [text(row.id), text(row.nome)]));
  return unique.map((id) => ({ id, label: names.get(id) || id }));
}

/**
 * Lista os registros para geração em massa.
 * Para ALUNO/INSTRUTOR/COORDENADOR, usa a turma informada; para TURMA/EMPRESA, lista todos.
 */
export async function listBulkTargets(entity: DocumentTemplateEntity, turmaId?: string | null): Promise<DocumentSubjectOption[]> {
  if (entity === 'TURMA') return listDocumentSubjects('TURMA');
  if (entity === 'EMPRESA') return listDocumentSubjects('EMPRESA');
  if (!turmaId) return [];

  if (entity === 'ALUNO') {
    const matriculas = await fetchManyBy('matriculas', 'turma_id', turmaId);
    return peopleOptionsFromIds(matriculas.map((row) => text(row.aluno_id)));
  }

  if (entity === 'INSTRUTOR') {
    const vinculos = await fetchManyBy('turma_instrutores', 'turma_id', turmaId);
    return peopleOptionsFromIds(vinculos.map((row) => text(row.instrutor_id)));
  }

  // COORDENADOR: coordenadores vinculados à turma.
  const turma = await fetchBy('turmas', 'id', turmaId);
  if (!turma) return [];
  return peopleOptionsFromIds([
    text(turma.coordenador_ioad_id),
    text(turma.coordenador_iscr_id),
    text(turma.coordenador_icar_id),
  ]);
}

export default { buildDocumentData, listDocumentSubjects, listBulkTargets };
