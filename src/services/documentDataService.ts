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
  hint?: string;
  /** Identificador curto do registro (ex.: ID interno da turma), usado em nomes de arquivo. */
  code?: string;
}

export interface DocumentSubjectPage {
  items: DocumentSubjectOption[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
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

const formatCurrency = (value: number): string =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const normalizeSearchTerm = (search?: string): string =>
  (search ?? '').replace(/[^0-9A-Za-zÀ-ÿ .@/-]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100);

const onlyDigits = (value: unknown): string => text(value).replace(/\D+/g, '');

/** CPF no padrão 000.000.000-00. Valores fora do padrão são mantidos como estão. */
const formatCpf = (value: unknown): string => {
  const digits = onlyDigits(value);
  return digits.length === 11
    ? `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
    : text(value);
};

/** CNPJ no padrão 00.000.000/0000-00. Valores fora do padrão são mantidos como estão. */
const formatCnpj = (value: unknown): string => {
  const digits = onlyDigits(value);
  return digits.length === 14
    ? `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`
    : text(value);
};

/** CEP no padrão 00000-000. Valores fora do padrão são mantidos como estão. */
const formatCep = (value: unknown): string => {
  const digits = onlyDigits(value);
  return digits.length === 8 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : text(value);
};

/** Telefone com DDD: (00) 0000-0000 ou (00) 00000-0000. Valores fora do padrão são mantidos como estão. */
const formatPhone = (value: unknown): string => {
  const digits = onlyDigits(value);
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return text(value);
};

async function fetchBy(table: string, column: string, value: string): Promise<Row | null> {
  const { data, error } = await supabase.from(table).select('*').eq(column, value).maybeSingle();
  if (error) throw serviceError('Não foi possível carregar dados para o documento', error);
  return (data as Row | null) ?? null;
}

async function fetchAllBy(table: string, column: string, value: string): Promise<Row[]> {
  const rows: Row[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.from(table).select('*').eq(column, value).range(offset, offset + 999);
    if (error) throw serviceError('Não foi possível carregar dados para o documento', error);
    const page = (data as Row[] | null) ?? [];
    rows.push(...page);
    if (page.length < 1000) return rows;
  }
}

function fillAlunoProfile(data: Record<string, string>, profile: Row | null) {
  if (!profile) return;
  data['aluno.rg'] = text(profile.rg);
  data['aluno.orgao_expedicao_rg'] = text(profile.orgao_expedicao_rg);
  data['aluno.data_nascimento'] = formatDate(profile.data_nascimento);
  data['aluno.nome_mae'] = text(profile.nome_mae);
  data['aluno.nome_pai'] = text(profile.nome_pai);
  data['aluno.email'] = text(profile.email);
  data['aluno.telefone'] = formatPhone(profile.telefone);
  data['aluno.cep'] = formatCep(profile.cep);
  data['aluno.endereco'] = text(profile.endereco);
  data['aluno.numero'] = text(profile.numero);
  data['aluno.bairro'] = text(profile.bairro);
  data['aluno.cidade'] = text(profile.cidade);
  data['aluno.estado'] = text(profile.estado);
  data['aluno.grau_ensino'] = text(profile.grau_ensino);
}

function fillInstrutorProfile(data: Record<string, string>, profile: Row | null) {
  if (!profile) return;
  data['instrutor.rg'] = text(profile.rg);
  data['instrutor.data_nascimento'] = formatDate(profile.data_nascimento);
  data['instrutor.email'] = text(profile.email);
  data['instrutor.telefone'] = formatPhone(profile.telefone);
}

function fillCoordenadorProfile(data: Record<string, string>, profile: Row | null) {
  if (!profile) return;
  data['coordenador.nome'] = text(profile.nome_completo);
  data['coordenador.cpf'] = formatCpf(profile.cpf);
  data['coordenador.email'] = text(profile.email);
  data['coordenador.telefone'] = formatPhone(profile.telefone);
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
  data['empresa.cnpj'] = formatCnpj(empresa.cnpj);
  data['empresa.responsavel'] = text(empresa.responsavel);
  data['empresa.telefone'] = formatPhone(empresa.telefone);
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
  if (turma?.curso_id) fillCurso(data, await fetchBy('cursos', 'id', String(turma.curso_id)));
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
    const pessoa = await fetchBy('pessoas', 'id', subjectId);
    data['aluno.nome'] = text(pessoa?.nome);
    data['aluno.cpf'] = formatCpf(pessoa?.cpf);
    for (const field of ['rg', 'orgao_expedicao_rg', 'data_nascimento', 'nome_mae', 'nome_pai', 'email', 'telefone', 'cep', 'endereco', 'numero', 'bairro', 'cidade', 'estado', 'grau_ensino']) {
      data[`aluno.${field}`] = '';
    }
    const profile = pessoa?.profile_legacy_id
      ? await fetchBy('profiles', 'legacy_id', String(pessoa.profile_legacy_id))
      : null;
    fillAlunoProfile(data, profile);

    let matricula: Row | null = null;
    let contextoTurmaId = turmaId ?? null;
    if (turmaId) {
      const matriculas = await fetchAllBy('matriculas', 'aluno_id', subjectId);
      matricula = matriculas.find((row) => text(row.turma_id) === turmaId) ?? null;
    } else {
      const { data: rows, error } = await supabase.from('matriculas').select('*')
        .eq('aluno_id', subjectId).order('created_at', { ascending: false })
        .order('codigo_re', { ascending: false }).limit(1);
      if (error) throw serviceError('Não foi possível carregar dados para o documento', error);
      matricula = ((rows as Row[] | null) ?? [])[0] ?? null;
      contextoTurmaId = matricula?.turma_id ? String(matricula.turma_id) : null;
    }
    fillMatricula(data, matricula);
    if (contextoTurmaId) await loadTurmaContext(data, contextoTurmaId);
    const empresaId = matricula?.empresa_b2b_id ?? profile?.empresa_id;
    if (empresaId) fillEmpresa(data, await fetchBy('empresas', 'id', String(empresaId)));
    return data;
  }

  if (entity === 'INSTRUTOR') {
    const pessoa = await fetchBy('pessoas', 'id', subjectId);
    data['instrutor.nome'] = text(pessoa?.nome);
    data['instrutor.cpf'] = formatCpf(pessoa?.cpf);
    data['instrutor.rg'] = '';
    data['instrutor.data_nascimento'] = '';
    data['instrutor.email'] = '';
    data['instrutor.telefone'] = '';
    const profile = pessoa?.profile_legacy_id
      ? await fetchBy('profiles', 'legacy_id', String(pessoa.profile_legacy_id))
      : null;
    fillInstrutorProfile(data, profile);

    if (turmaId) {
      await loadTurmaContext(data, turmaId);
      const vinculos = await fetchAllBy('turma_instrutores', 'instrutor_id', subjectId);
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

  if (entity === 'VENDA') {
    const venda = await fetchBy('vendas', 'id', subjectId);
    for (const key of [
      'venda.data_venda', 'venda.condicao', 'venda.parcelas_quantidade', 'venda.valor_total',
      'venda.valor_recebido', 'venda.valor_a_receber', 'venda.forma_pagamento',
      'venda.referencia_transacao', 'venda.primeiro_vencimento', 'venda.ultimo_vencimento',
      'venda.observacoes', 'participante.nome', 'participante.documento', 'participante.tipo',
      'participante.email',
    ]) data[key] = '';
    if (!venda) return data;

    data['venda.data_venda'] = formatDate(venda.created_at);
    data['venda.condicao'] = venda.condicao === 'A_VISTA' ? 'À vista' : 'Parcelado';
    data['venda.parcelas_quantidade'] = formatDecimal(venda.parcelas_quantidade);
    data['venda.forma_pagamento'] = ({
      PIX: 'Pix', DINHEIRO: 'Dinheiro', BOLETO: 'Boleto', TRANSFERENCIA: 'Transferência',
      CARTAO: 'Cartão', CHEQUE: 'Cheque', OUTRO: 'Outro',
    } as Record<string, string>)[text(venda.forma_pagamento)] ?? '';
    data['venda.referencia_transacao'] = text(venda.referencia_transacao);
    data['venda.observacoes'] = text(venda.observacoes);
    data['participante.nome'] = text(venda.participante_nome);
    data['participante.documento'] = text(venda.participante_documento);
    data['participante.tipo'] = venda.participante_tipo === 'EMPRESA' ? 'Pessoa jurídica' : 'Pessoa física';

    const installments = await fetchAllBy('lancamentos_financeiros', 'venda_id', subjectId);
    const sum = (rows: Row[]) => rows.reduce((total, row) => total + (Number(row.valor) || 0), 0);
    data['venda.valor_total'] = formatCurrency(sum(installments));
    data['venda.valor_recebido'] = formatCurrency(sum(installments.filter((row) => row.status === 'EFETIVADO')));
    data['venda.valor_a_receber'] = formatCurrency(sum(installments.filter((row) => row.status === 'PREVISTO')));
    const dueDates = installments.map((row) => text(row.data_competencia)).filter(Boolean).sort();
    data['venda.primeiro_vencimento'] = formatDate(dueDates[0]);
    data['venda.ultimo_vencimento'] = formatDate(dueDates[dueDates.length - 1]);

    if (venda.participante_tipo === 'EMPRESA' && venda.empresa_id) {
      const empresa = await fetchBy('empresas', 'id', String(venda.empresa_id));
      data['participante.email'] = text(empresa?.email_corporativo);
    } else if (venda.pessoa_id) {
      const pessoa = await fetchBy('pessoas', 'id', String(venda.pessoa_id));
      const profile = pessoa?.profile_legacy_id
        ? await fetchBy('profiles', 'legacy_id', String(pessoa.profile_legacy_id))
        : null;
      data['participante.email'] = text(profile?.email);
    }

    if (venda.curso_id) fillCurso(data, await fetchBy('cursos', 'id', String(venda.curso_id)));
    if (venda.turma_id) {
      await loadTurmaContext(data, String(venda.turma_id));
      if (venda.curso_id) fillCurso(data, await fetchBy('cursos', 'id', String(venda.curso_id)));
    }
    return data;
  }

  fillEmpresa(data, await fetchBy('empresas', 'id', subjectId));
  return data;
}

function emptySubjectPage(offset: number, limit: number): DocumentSubjectPage {
  return { items: [], total: 0, offset, limit, hasMore: false };
}

function option(id: unknown, label: unknown, hint?: unknown): DocumentSubjectOption {
  const result: DocumentSubjectOption = { id: text(id), label: text(label) };
  if (hint !== null && hint !== undefined && text(hint)) result.hint = text(hint);
  return result;
}

async function loadCursoNames(): Promise<Map<string, string>> {
  const { data, error } = await supabase.from('cursos').select('id, nome_curso');
  if (error) throw serviceError('Não foi possível carregar os cursos', error);
  return new Map((data ?? []).map((row) => [text(row.id), text(row.nome_curso)]));
}

/** Turmas são identificadas pelo ID interno da escola e exibidas com o nome do curso. */
function turmaOption(row: Row, cursoNames: Map<string, string>): DocumentSubjectOption {
  const internal = text(row.id_interno_escola);
  return {
    id: text(row.id),
    label: `${internal} — ${cursoNames.get(text(row.curso_id)) ?? 'Curso não informado'}`,
    code: internal,
  };
}

/** Quantidade máxima de dígitos considerada para o ID interno da escola. */
const MAX_INTERNAL_ID_DIGITS = 6;

/**
 * Faixas numéricas equivalentes ao prefixo digitado (ex.: "102" cobre 102, 1020-1029, 10200-10299...).
 * Assim a busca por prefixo continua usando o índice do ID interno, sem conversão para texto.
 */
function internalIdPrefixFilter(term: string): string | null {
  const digits = onlyDigits(term);
  if (digits.length < 2 || digits.length > MAX_INTERNAL_ID_DIGITS) return null;

  const base = Number(digits);
  if (!Number.isSafeInteger(base)) return null;

  const ranges: string[] = [];
  for (let extra = 0; extra <= MAX_INTERNAL_ID_DIGITS - digits.length; extra += 1) {
    const factor = 10 ** extra;
    const start = base * factor;
    ranges.push(`and(id_interno_escola.gte.${start},id_interno_escola.lte.${start + factor - 1})`);
  }
  return ranges.join(',');
}

/** Busca turmas pelo prefixo numérico do ID interno da escola. */
async function turmasPage(term: string, offset: number, limit: number): Promise<DocumentSubjectPage> {
  const prefix = internalIdPrefixFilter(term);
  if (!prefix) return emptySubjectPage(offset, limit);

  const { data, error, count } = await supabase
    .from('turmas')
    .select('id, id_interno_escola, curso_id', { count: 'exact' })
    .or(prefix)
    .order('id_interno_escola', { ascending: true })
    .range(offset, offset + limit - 1);
  if (error) throw serviceError('Não foi possível carregar as turmas', error);

  const cursoNames = await loadCursoNames();
  const rows = (data as Row[] | null) ?? [];
  const items = rows.map((row) => turmaOption(row, cursoNames));
  const total = count ?? 0;
  return { items, total, offset, limit, hasMore: offset + items.length < total };
}

export async function getVendaDocumentSubject(subjectId: string): Promise<DocumentSubjectOption | null> {
  const venda = await fetchBy('vendas', 'id', subjectId);
  if (!venda) return null;
  const reference = text(venda.referencia_transacao);
  const label = `${text(venda.participante_nome)} — ${reference || formatDate(venda.created_at)}`;
  const result: DocumentSubjectOption = { id: text(venda.id), label };
  if (reference) result.code = reference;
  if (venda.participante_documento) result.hint = text(venda.participante_documento);
  return result;
}

export async function searchDocumentSubjects(params: {
  entity: DocumentTemplateEntity;
  search?: string;
  turmaId?: string | null;
  offset?: number;
  limit?: number;
}): Promise<DocumentSubjectPage> {
  const offset = Math.max(0, Math.floor(params.offset ?? 0));
  const limit = Math.min(1000, Math.max(1, Math.floor(params.limit ?? 1000)));
  const term = normalizeSearchTerm(params.search);
  if (params.entity === 'TURMA') return turmasPage(term, offset, limit);
  if (params.entity === 'VENDA') {
    if (term.length < 3) return emptySubjectPage(offset, limit);
    try {
      let query = supabase.from('vendas').select(
        'id, participante_nome, participante_documento, referencia_transacao, created_at',
        { count: 'exact' },
      );
      if (/^\d+$/.test(term)) {
        const formattedDocument = term.length === 11 ? formatCpf(term) : term.length === 14 ? formatCnpj(term) : term;
        query = formattedDocument === term
          ? query.ilike('participante_documento', `%${term}%`)
          : query.or(`participante_documento.ilike.%${term}%,participante_documento.ilike.%${formattedDocument}%`);
      } else {
        query = query.or(`participante_nome.ilike.%${term}%,referencia_transacao.ilike.%${term}%`);
      }
      const { data, error, count } = await query.order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      if (error) throw error;
      const rows = (data as Row[] | null) ?? [];
      const items = rows.map((row) => {
        const reference = text(row.referencia_transacao);
        const result: DocumentSubjectOption = {
          id: text(row.id),
          label: `${text(row.participante_nome)} — ${reference || formatDate(row.created_at)}`,
        };
        if (reference) result.code = reference;
        if (row.participante_documento) result.hint = text(row.participante_documento);
        return result;
      });
      const total = count ?? 0;
      return { items, total, offset, limit, hasMore: offset + items.length < total };
    } catch (error) {
      throw serviceError('Não foi possível carregar as vendas', error);
    }
  }

  const turmaApplies = Boolean(params.turmaId) && ['ALUNO', 'INSTRUTOR', 'COORDENADOR'].includes(params.entity);
  const digitsOnly = /^\d+$/.test(term);
  if (term.length < 3 && !turmaApplies) return emptySubjectPage(offset, limit);

  try {
    let query: any;
    let idColumn = 'id';
    let labelColumn = 'nome';
    let hintColumn: string | null = 'cpf';
    let formatHint = formatCpf;

    if (params.entity === 'ALUNO' || params.entity === 'INSTRUTOR') {
      query = supabase.from('pessoas').select('id, nome, cpf', { count: 'exact' });
      if (params.entity === 'ALUNO') {
        query = query.or('papel.is.null,papel.eq.ALUNO').eq('ativo', true).eq('visivel_diretorio', true);
      } else {
        query = query.eq('papel', 'INSTRUTOR').eq('ativo', true);
      }
      if (term) query = digitsOnly ? query.ilike('cpf', `%${term}%`) : query.ilike('nome', `%${term}%`);
      if (turmaApplies && params.turmaId) {
        const relation = params.entity === 'ALUNO' ? 'matriculas' : 'turma_instrutores';
        const relationId = params.entity === 'ALUNO' ? 'aluno_id' : 'instrutor_id';
        const relations = await fetchAllBy(relation, 'turma_id', params.turmaId);
        const ids = Array.from(new Set(relations.map((row) => text(row[relationId])).filter(Boolean)));
        if (!ids.length) return emptySubjectPage(offset, limit);
        query = query.in('id', ids);
      }
    } else if (params.entity === 'COORDENADOR') {
      query = supabase.from('profiles').select('legacy_id, nome_completo, cpf', { count: 'exact' })
        .eq('role', 'COORDENADOR').not('legacy_id', 'is', null);
      idColumn = 'legacy_id';
      labelColumn = 'nome_completo';
      if (term) query = digitsOnly ? query.ilike('cpf', `%${term}%`) : query.ilike('nome_completo', `%${term}%`);
      if (turmaApplies && params.turmaId) {
        const turma = await fetchBy('turmas', 'id', params.turmaId);
        const ids = [turma?.coordenador_ioad_id, turma?.coordenador_iscr_id, turma?.coordenador_icar_id]
          .map(text).filter(Boolean);
        if (!ids.length) return emptySubjectPage(offset, limit);
        query = query.in('legacy_id', ids);
      }
    } else {
      query = supabase.from('empresas').select('id, nome_fantasia, cnpj', { count: 'exact' });
      labelColumn = 'nome_fantasia';
      hintColumn = 'cnpj';
      formatHint = formatCnpj;
      if (term) {
        if (digitsOnly) {
          const cnpjTerm = term.length === 14
            ? `${term.slice(0, 2)}.${term.slice(2, 5)}.${term.slice(5, 8)}/${term.slice(8, 12)}-${term.slice(12)}`
            : term;
          query = query.or(`cnpj.ilike.%${cnpjTerm}%,nome_fantasia.ilike.%${term}%`);
        } else {
          query = query.ilike('nome_fantasia', `%${term}%`);
        }
      }
    }

    const orderColumn = params.entity === 'EMPRESA' ? 'nome_fantasia' : labelColumn;
    const { data, error, count } = await query.order(orderColumn, { ascending: true }).range(offset, offset + limit - 1);
    if (error) throw error;
    const rows = (data as Row[] | null) ?? [];
    const items = rows.map((row) => option(
      row[idColumn],
      row[labelColumn],
      hintColumn ? formatHint(row[hintColumn]) : '',
    ));
    const total = count ?? 0;
    return { items, total, offset, limit, hasMore: offset + items.length < total };
  } catch (error) {
    throw serviceError('Não foi possível carregar os registros', error);
  }
}

async function peopleOptionsFromIds(ids: string[]): Promise<DocumentSubjectOption[]> {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (unique.length === 0) return [];
  const { data, error } = await supabase.from('pessoas').select('id, nome').in('id', unique);
  if (error) throw serviceError('Não foi possível carregar a lista de pessoas', error);
  const names = new Map((data ?? []).map((row) => [text(row.id), text(row.nome)]));
  return unique.map((id) => ({ id, label: names.get(id) || id }));
}

async function allEntityOptions(table: 'turmas' | 'empresas'): Promise<DocumentSubjectOption[]> {
  const options: DocumentSubjectOption[] = [];
  const cursoNames = table === 'turmas' ? await loadCursoNames() : new Map<string, string>();
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = table === 'turmas'
      ? await supabase.from('turmas').select('id, id_interno_escola, curso_id').order('id_interno_escola', { ascending: true }).range(offset, offset + 999)
      : await supabase.from('empresas').select('id, nome_fantasia').order('nome_fantasia', { ascending: true }).range(offset, offset + 999);
    if (error) throw serviceError('Não foi possível carregar a lista de registros', error);
    const rows = (data ?? []) as Row[];
    options.push(...rows.map((row) => (table === 'turmas'
      ? turmaOption(row, cursoNames)
      : { id: text(row.id), label: text(row.nome_fantasia) })));
    if (rows.length < 1000) return options;
  }
}

/** Lista os registros para geração em massa. */
export async function listBulkTargets(entity: DocumentTemplateEntity, turmaId?: string | null): Promise<DocumentSubjectOption[]> {
  if (entity === 'TURMA') return allEntityOptions('turmas');
  if (entity === 'EMPRESA') return allEntityOptions('empresas');
  if (entity === 'VENDA' || !turmaId) return [];

  if (entity === 'ALUNO') {
    const matriculas = await fetchAllBy('matriculas', 'turma_id', turmaId);
    return peopleOptionsFromIds(matriculas.map((row) => text(row.aluno_id)));
  }

  if (entity === 'INSTRUTOR') {
    const vinculos = await fetchAllBy('turma_instrutores', 'turma_id', turmaId);
    return peopleOptionsFromIds(vinculos.map((row) => text(row.instrutor_id)));
  }

  const turma = await fetchBy('turmas', 'id', turmaId);
  if (!turma) return [];
  return peopleOptionsFromIds([
    text(turma.coordenador_ioad_id),
    text(turma.coordenador_iscr_id),
    text(turma.coordenador_icar_id),
  ]);
}

export default { buildDocumentData, listBulkTargets, searchDocumentSubjects };
