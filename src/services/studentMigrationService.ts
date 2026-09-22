import * as XLSX from 'xlsx';
import { supabase } from '../integrations/supabase/client';
import { UserRole } from '../types';
import { companyService } from './companyService';
import { newServiceId } from './supabaseErrors';

export const STUDENT_MIGRATION_COLUMNS = [
  'REF', 'TURMA', 'ANAC', 'NOMES', 'CPF', 'Software', 'Empresa', '%', '1º CH', '2º CH',
  'RESULTADO', 'RES FINAL', 'CURSO', 'TURNO', 'INÍCIO', 'TÉMINO', 'LOCAL', 'MAT.',
] as const;

export type StudentMigrationColumn = typeof STUDENT_MIGRATION_COLUMNS[number];
export const STUDENT_MIGRATION_IGNORED: readonly StudentMigrationColumn[] = ['REF', 'Software', 'CURSO', 'TURNO', 'INÍCIO', 'TÉMINO', 'LOCAL', 'MAT.'];
export const STUDENT_MIGRATION_DESTINATIONS: Record<StudentMigrationColumn, string> = {
  REF: 'ignorada', TURMA: 'conciliação com turmas.id_interno_escola', ANAC: 'conciliação com turmas.id_anac',
  NOMES: 'pessoas.nome', CPF: 'pessoas.cpf', Software: 'ignorado', Empresa: 'matriculas.empresa_b2b_id',
  '%': 'matriculas.percentual_presenca', '1º CH': 'matriculas.nota_1_chamada', '2º CH': 'matriculas.nota_2_chamada',
  RESULTADO: 'matriculas.status_resultado', 'RES FINAL': 'matriculas.status_resultado_final', CURSO: 'ignorada',
  TURNO: 'ignorada', 'INÍCIO': 'ignorada', 'TÉMINO': 'ignorada', LOCAL: 'ignorada', 'MAT.': 'ignorada (contagem derivada)',
};

export type StudentMigrationProgress = {
  stage: 'validação' | 'conciliação' | 'pessoa' | 'matrícula' | 'concluído' | 'erro';
  current: number;
  total: number;
  percent: number;
  message: string;
};

export type StudentMigrationRow = {
  line: number;
  values: Record<StudentMigrationColumn, string>;
  normalized: {
    turma: string;
    anac: string;
    nome: string;
    cpf: string;
    percentualPresenca: number | null;
    nota1Chamada: number | null;
    nota2Chamada: number | null;
    statusResultado: StudentStatus | null;
    statusResultadoFinal: StudentStatus | null;
  };
  problems: string[];
  warnings: string[];
  valid: boolean;
};

export type StudentStatus = 'Aprovado' | 'Reprovado' | 'Falta';

export type StudentMigrationParseResult = {
  headers: string[];
  recognized: StudentMigrationColumn[];
  missing: StudentMigrationColumn[];
  unknown: string[];
  ignored: StudentMigrationColumn[];
  duplicateHeaders: string[];
  rows: StudentMigrationRow[];
  validRows: StudentMigrationRow[];
  discardedRows: StudentMigrationRow[];
};

export type StudentMigrationRowResult = {
  line: number;
  status: 'sucesso' | 'erro';
  message: string;
  turma?: string;
  turmaId?: string;
  idInternoEscola?: number;
  anac?: string;
  cpf?: string;
  warnings?: string[];
};

export type StudentMigrationSuccessfulClass = {
  turmaId: string;
  idInternoEscola: number;
  idAnac: string;
  alunosImportados: number;
};

export type StudentMigrationRunResult = {
  results: StudentMigrationRowResult[];
  successfulClasses: StudentMigrationSuccessfulClass[];
  successCount: number;
  errorCount: number;
};

export type StudentMigrationPreviewResult = {
  rows: StudentMigrationRow[];
  blockingCount: number;
  warningCount: number;
  missingCompanies: string[];
};

type StudentTurma = { id: string; id_interno_escola: number; id_anac: string; data_termino: string | null };
type StudentPerson = { id: string; nome: string; cpf: string | null; papel: string | null; ativo: boolean };
type StudentCompany = { id: string; nome_fantasia: string; razao_social: string | null };
type ExistingMatricula = { id: string; aluno_id: string; turma_id: string };

function normalizeHeader(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function clean(value: unknown): string {
  return String(value ?? '').replace(/\u00a0/g, ' ').trim();
}

export function normalizeStudentComparison(value: string): string {
  return clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleUpperCase('pt-BR').replace(/[^A-Z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}

export function normalizeStudentCpf(value: unknown): string {
  return clean(value).replace(/\D/g, '');
}

export function isValidStudentCpf(value: unknown): boolean {
  const source = clean(value);
  if (/[^0-9.\s-]/.test(source)) return false;
  const cpf = normalizeStudentCpf(source);
  if (cpf.length !== 11 || /^([0-9])\1{10}$/.test(cpf)) return false;
  let sum = 0;
  for (let index = 0; index < 9; index += 1) sum += Number(cpf[index]) * (10 - index);
  let digit = (sum * 10) % 11;
  if (digit === 10) digit = 0;
  if (digit !== Number(cpf[9])) return false;
  sum = 0;
  for (let index = 0; index < 10; index += 1) sum += Number(cpf[index]) * (11 - index);
  digit = (sum * 10) % 11;
  if (digit === 10) digit = 0;
  return digit === Number(cpf[10]);
}

function emptyValues(): Record<StudentMigrationColumn, string> {
  return STUDENT_MIGRATION_COLUMNS.reduce((values, column) => {
    values[column] = '';
    return values;
  }, {} as Record<StudentMigrationColumn, string>);
}

function displayCell(value: unknown): string {
  if (value instanceof Date) return value.toLocaleDateString('pt-BR');
  return clean(value);
}

const aliases: Record<string, StudentMigrationColumn> = {
  REF: 'REF', TURMA: 'TURMA', ANAC: 'ANAC', NOMES: 'NOMES', NOME: 'NOMES', CPF: 'CPF',
  SOFTWARE: 'Software', EMPRESA: 'Empresa', PERCENTUAL: '%', PERCENTUALPRESENCA: '%',
  '1CH': '1º CH', '2CH': '2º CH', RESULTADO: 'RESULTADO', RESFINAL: 'RES FINAL',
  CURSO: 'CURSO', TURNO: 'TURNO', INICIO: 'INÍCIO', TERMINO: 'TÉMINO', TEMINO: 'TÉMINO', LOCAL: 'LOCAL', MAT: 'MAT.',
};

function sourceColumn(header: string): StudentMigrationColumn | undefined {
  const normalized = normalizeHeader(header);
  if (header.trim() === '%') return '%';
  return aliases[normalized];
}

function parseNumber(value: string): number | null {
  const text = clean(value).replace(/%/g, '').replace(/\s/g, '').replace(',', '.');
  if (!text) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function parsePercentage(value: string): { value: number | null; problem?: string } {
  const parsed = parseNumber(value);
  if (parsed === null) return { value: null };
  if (parsed < 0 || parsed > 100) return { value: null, problem: 'Percentual de presença deve estar entre 0 e 100.' };
  return { value: parsed };
}

function parseGrade(value: string, label: string): { value: number | null; problem?: string } {
  const parsed = parseNumber(value);
  if (parsed === null) return { value: null };
  const normalized = parsed > 10 ? parsed / 10 : parsed;
  if (normalized < 0 || normalized > 10) return { value: null, problem: `${label} deve estar entre 0 e 10.` };
  return { value: normalized };
}

function parseStatus(value: string, label: string): { value: StudentStatus | null; problem?: string } {
  const source = normalizeStudentComparison(value);
  if (!source) return { value: null };
  const statuses: Record<string, StudentStatus> = { APROVADO: 'Aprovado', REPROVADO: 'Reprovado', FALTA: 'Falta' };
  if (!statuses[source]) return { value: null, problem: `${label} deve ser APROVADO, REPROVADO ou FALTA.` };
  return { value: statuses[source] };
}

function rowValues(row: unknown[], headerMap: Map<StudentMigrationColumn, number>): Record<StudentMigrationColumn, string> {
  const values = emptyValues();
  headerMap.forEach((index, column) => { values[column] = displayCell(row[index]); });
  return values;
}

function hasStudentIdentifier(values: Record<StudentMigrationColumn, string>): boolean {
  return Boolean(clean(values.NOMES) || clean(values.CPF));
}

function hasStudentAcademicData(values: Record<StudentMigrationColumn, string>): boolean {
  return Boolean(clean(values['%']) || clean(values['1º CH']) || clean(values['2º CH']));
}

function isIgnoredStudentMigrationName(value: string): boolean {
  const normalized = normalizeStudentComparison(value);
  return normalized === 'CANCELADO' || normalized === 'CALCELADO' || normalized === 'Z';
}

function validateRow(values: Record<StudentMigrationColumn, string>) {
  const problems: string[] = [];
  const turma = clean(values.TURMA);
  const anac = clean(values.ANAC);
  const nome = clean(values.NOMES);
  const cpf = normalizeStudentCpf(values.CPF);
  if (!turma) problems.push('TURMA obrigatória.');
  else if (!/^\d+$/.test(turma) || Number(turma) <= 0) problems.push('TURMA deve ser um identificador inteiro maior que zero.');
  if (!anac) problems.push('ANAC obrigatório.');
  else if (/^0+$/.test(anac)) problems.push('ANAC não pode ser 0.');
  if (!nome) problems.push('NOMES obrigatório.');
  if (!clean(values.CPF)) problems.push('CPF obrigatório.');
  const percentage = parsePercentage(values['%']);
  if (percentage.problem) problems.push(percentage.problem);
  const grade1 = parseGrade(values['1º CH'], '1º CH');
  if (grade1.problem) problems.push(grade1.problem);
  const grade2 = parseGrade(values['2º CH'], '2º CH');
  if (grade2.problem) problems.push(grade2.problem);
  const result = parseStatus(values.RESULTADO, 'RESULTADO');
  if (result.problem) problems.push(result.problem);
  const finalResult = parseStatus(values['RES FINAL'], 'RES FINAL');
  if (finalResult.problem) problems.push(finalResult.problem);
  return {
    problems,
    normalized: {
      turma, anac, nome, cpf,
      percentualPresenca: percentage.value,
      nota1Chamada: grade1.value,
      nota2Chamada: grade2.value,
      statusResultado: result.value,
      statusResultadoFinal: finalResult.value,
    },
  };
}

export async function parseStudentMigrationFile(file: File): Promise<StudentMigrationParseResult> {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
  const firstSheet = workbook.SheetNames[0];
  if (!firstSheet) throw new Error('O arquivo não contém uma planilha.');
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[firstSheet], { header: 1, defval: '', raw: false });
  const headers = (matrix[0] ?? []).map(displayCell);
  if (headers.every((header) => !header)) throw new Error('A primeira linha precisa conter os nomes das colunas.');
  const recognized: StudentMigrationColumn[] = [];
  const unknown: string[] = [];
  const duplicateHeaders: string[] = [];
  const headerMap = new Map<StudentMigrationColumn, number>();
  headers.forEach((header, index) => {
    const column = sourceColumn(header);
    if (!column) { if (header) unknown.push(header); return; }
    if (headerMap.has(column)) { duplicateHeaders.push(header || column); return; }
    headerMap.set(column, index);
    recognized.push(column);
  });
  const missing = STUDENT_MIGRATION_COLUMNS.filter((column) => !headerMap.has(column) && !STUDENT_MIGRATION_IGNORED.includes(column));
  const rows: StudentMigrationRow[] = matrix.slice(1).map((row, index) => {
    const values = rowValues(row, headerMap);
    if (isIgnoredStudentMigrationName(values.NOMES) || !hasStudentAcademicData(values)) return null;
    const validation = validateRow(values);
    const hasIdentifier = hasStudentIdentifier(values);
    return {
      line: index + 2,
      values,
      normalized: validation.normalized,
      problems: hasIdentifier ? validation.problems : ['Linha vazia.'],
      warnings: clean(values.Empresa) ? [`Empresa "${clean(values.Empresa)}" informada; a correspondência será verificada na execução. Se não for encontrada, o cadastro manual ficará pendente.`] : [],
      valid: hasIdentifier && validation.problems.length === 0,
    };
  }).filter((row): row is StudentMigrationRow => row !== null && hasStudentIdentifier(row.values));

  const cpfLines = new Map<string, number>();
  rows.forEach((row) => {
    if (!row.normalized.cpf) return;
    const previous = cpfLines.get(row.normalized.cpf);
    if (previous) row.warnings.push(`CPF repetido no arquivo (também aparece na linha ${previous}); será conciliado com a mesma pessoa.`);
    else cpfLines.set(row.normalized.cpf, row.line);
  });
  const validRows = rows.filter((row) => row.valid);
  return {
    headers, recognized, missing, unknown, duplicateHeaders,
    ignored: STUDENT_MIGRATION_IGNORED.filter((column) => headerMap.has(column)),
    rows, validRows, discardedRows: rows.filter((row) => !row.valid),
  };
}

function safeError(message: string): Error { return new Error(message.slice(0, 300)); }

const STUDENT_PEOPLE_PAGE_SIZE = 1000;

async function loadAllStudentPeople(): Promise<StudentPerson[]> {
  const people: StudentPerson[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('pessoas')
      .select('id,nome,cpf,papel,ativo')
      .order('id', { ascending: true })
      .range(offset, offset + STUDENT_PEOPLE_PAGE_SIZE - 1);
    if (error) throw safeError('Não foi possível carregar as pessoas da migração.');

    const page = (data ?? []) as StudentPerson[];
    people.push(...page);
    hasMore = page.length === STUDENT_PEOPLE_PAGE_SIZE;
    if (hasMore) offset += page.length;
  }

  return people;
}

function isUniqueConflict(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { code?: unknown; status?: unknown; statusCode?: unknown };
  return candidate.code === '23505' || candidate.status === 409 || candidate.statusCode === 409;
}

async function findStudentPersonByCpf(cpf: string): Promise<{ person: StudentPerson | null; duplicate: boolean }> {
  const people = await loadAllStudentPeople();
  const matches = people.filter((candidate) => normalizeStudentCpf(candidate.cpf) === cpf);
  return { person: matches[0] ?? null, duplicate: matches.length > 1 };
}

function assertUsableStudentPerson(person: StudentPerson, duplicate: boolean): void {
  if (duplicate) throw safeError('CPF corresponde a mais de uma pessoa; revisão manual necessária.');
  if (person.papel && person.papel !== UserRole.ALUNO) throw safeError('CPF já pertence a uma pessoa com outro papel; revisão manual necessária.');
  if (!person.ativo) throw safeError('A pessoa encontrada pelo CPF está inativa.');
}

async function assertStudentMigrationAccess(): Promise<void> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw safeError('Sessão não autenticada.');
  const role = data.user.app_metadata?.role ?? data.user.user_metadata?.role;
  if (role !== UserRole.GESTOR && role !== UserRole.EQUIPE) throw safeError('A migração de alunos está disponível somente para Gestor e Equipe.');
}

function uniqueBy<T>(values: T[], key: (value: T) => string): T[] {
  return values.filter((value, index) => values.findIndex((candidate) => key(candidate) === key(value)) === index);
}

function companyMatches(companies: StudentCompany[], name: string): { company: StudentCompany | null; ambiguous: boolean } {
  const normalized = normalizeStudentComparison(name);
  const matches = companies.filter((company) => normalizeStudentComparison(company.nome_fantasia) === normalized || normalizeStudentComparison(company.razao_social ?? '') === normalized);
  return { company: matches.length === 1 ? matches[0] : null, ambiguous: matches.length > 1 };
}

function classForRow(row: StudentMigrationRow, byInternal: Map<number, StudentTurma>, byAnac: Map<string, StudentTurma>): StudentTurma {
  const internal = Number(row.normalized.turma);
  const internalClass = byInternal.get(internal);
  const anacClass = byAnac.get(normalizeStudentComparison(row.normalized.anac));
  if (!internalClass || !anacClass) throw safeError('A combinação TURMA + ANAC não foi encontrada nas turmas existentes.');
  if (internalClass.id !== anacClass.id) throw safeError('TURMA e ANAC apontam para turmas diferentes.');
  return internalClass;
}

export async function previewStudentMigrationBatch(rows: StudentMigrationRow[]): Promise<StudentMigrationPreviewResult> {
  await assertStudentMigrationAccess();
  const selectedRows = rows.filter((row) => row.valid);
  if (!selectedRows.length) return { rows: [], blockingCount: 0, warningCount: 0, missingCompanies: [] };
  const internals = uniqueBy(selectedRows.map((row) => Number(row.normalized.turma)), String);
  const anacs = uniqueBy(selectedRows.map((row) => row.normalized.anac), (value) => normalizeStudentComparison(value));
  const [internalQuery, anacQuery, people, companiesQuery] = await Promise.all([
    supabase.from('turmas').select('id,id_interno_escola,id_anac,data_termino').in('id_interno_escola', internals),
    supabase.from('turmas').select('id,id_interno_escola,id_anac,data_termino').in('id_anac', anacs),
    loadAllStudentPeople(),
    supabase.from('empresas').select('id,nome_fantasia,razao_social'),
  ]);
  if (internalQuery.error || anacQuery.error || companiesQuery.error) throw safeError('Não foi possível validar as referências da migração.');
  const byInternal = new Map(((internalQuery.data ?? []) as StudentTurma[]).map((turma) => [turma.id_interno_escola, turma]));
  const byAnac = new Map(((anacQuery.data ?? []) as StudentTurma[]).map((turma) => [normalizeStudentComparison(turma.id_anac), turma]));
  const peopleByCpf = new Map<string, StudentPerson>();
  const duplicatePeopleCpfs = new Set<string>();
  people.forEach((person) => {
    const cpf = normalizeStudentCpf(person.cpf);
    if (!cpf) return;
    if (peopleByCpf.has(cpf)) duplicatePeopleCpfs.add(cpf);
    peopleByCpf.set(cpf, person);
  });
  const companies = (companiesQuery.data ?? []) as StudentCompany[];
  const previewRows = selectedRows.map((row) => {
    const previewRow: StudentMigrationRow = { ...row, problems: [...row.problems], warnings: [...row.warnings] };
    try {
      classForRow(previewRow, byInternal, byAnac);
    } catch (error) {
      previewRow.problems.push(error instanceof Error ? error.message : 'Turma não conciliada.');
    }
    if (duplicatePeopleCpfs.has(previewRow.normalized.cpf)) previewRow.problems.push('CPF corresponde a mais de uma pessoa; revisão manual necessária.');
    const person = peopleByCpf.get(previewRow.normalized.cpf);
    if (person?.papel && person.papel !== UserRole.ALUNO) previewRow.problems.push('CPF já pertence a uma pessoa com outro papel; revisão manual necessária.');
    if (person && !person.ativo) previewRow.problems.push('A pessoa encontrada pelo CPF está inativa.');
    if (person && !person.papel) previewRow.warnings.push('Pessoa histórica sem papel; será classificada como ALUNO antes da matrícula.');
    if (person && normalizeStudentComparison(person.nome) !== normalizeStudentComparison(previewRow.normalized.nome)) {
      previewRow.warnings.push(`Nome da planilha "${previewRow.normalized.nome}" diverge do nome canônico cadastrado para o CPF ("${person.nome}").`);
    }
    const companyName = clean(previewRow.values.Empresa);
    if (companyName) {
      const match = companyMatches(companies, companyName);
      const warning = match.company
        ? `Empresa "${companyName}" encontrada e poderá ser vinculada à matrícula.`
        : match.ambiguous
          ? `Empresa "${companyName}" corresponde a mais de um cadastro; cadastro manual pendente.`
          : `Empresa "${companyName}" não encontrada; cadastre-a antes de refazer a prévia para vinculá-la.`;
      if (!previewRow.warnings.includes(warning)) previewRow.warnings.push(warning);
    }
    previewRow.valid = previewRow.problems.length === 0;
    return previewRow;
  });
  return {
    rows: previewRows,
    blockingCount: previewRows.reduce((total, row) => total + row.problems.length, 0),
    warningCount: previewRows.reduce((total, row) => total + row.warnings.length, 0),
    missingCompanies: uniqueBy(
      previewRows
        .map((row) => clean(row.values.Empresa))
        .filter((name) => name && !companyMatches(companies, name).company && !companyMatches(companies, name).ambiguous),
      (name) => normalizeStudentComparison(name),
    ),
  };
}

export async function createStudentMigrationCompany(company: { nome_fantasia: string; razao_social: string; cnpj: string }): Promise<void> {
  await assertStudentMigrationAccess();
  if (!company.nome_fantasia.trim() || !company.razao_social.trim() || !company.cnpj.trim()) {
    throw safeError('Nome fantasia, razão social e CNPJ são obrigatórios para cadastrar a empresa.');
  }
  await companyService.createMigrationCompany({
    nome_fantasia: company.nome_fantasia.trim(),
    razao_social: company.razao_social.trim(),
    cnpj: company.cnpj.trim(),
  });
}

function statusForClass(turma: StudentTurma): 'Ativo' | 'Concluido' {
  if (!turma.data_termino) return 'Ativo';
  return turma.data_termino < new Date().toISOString().slice(0, 10) ? 'Concluido' : 'Ativo';
}

function resultMessage(row: StudentMigrationRow, turma: StudentTurma, details: string): StudentMigrationRowResult {
  return {
    line: row.line,
    status: 'sucesso',
    turma: row.normalized.turma,
    turmaId: turma.id,
    idInternoEscola: turma.id_interno_escola,
    anac: turma.id_anac,
    cpf: row.normalized.cpf,
    warnings: row.warnings,
    message: details,
  };
}

export async function runStudentMigrationBatch(rows: StudentMigrationRow[], onProgress?: (progress: StudentMigrationProgress) => void): Promise<StudentMigrationRunResult> {
  await assertStudentMigrationAccess();
  const selectedRows = rows.filter((row) => row.valid);
  const total = selectedRows.length;
  const results: StudentMigrationRowResult[] = [];
  const progress = (stage: StudentMigrationProgress['stage'], current: number, message: string) => onProgress?.({ stage, current, total, percent: total ? Math.round(current / total * 100) : 100, message });
  if (!total) return { results: [], successfulClasses: [], successCount: 0, errorCount: 0 };
  progress('validação', 0, 'Validando as linhas selecionadas.');

  const internals = uniqueBy(selectedRows.map((row) => Number(row.normalized.turma)), String);
  const anacs = uniqueBy(selectedRows.map((row) => row.normalized.anac), (value) => normalizeStudentComparison(value));
  const [internalQuery, anacQuery, people, companiesQuery] = await Promise.all([
    supabase.from('turmas').select('id,id_interno_escola,id_anac,data_termino').in('id_interno_escola', internals),
    supabase.from('turmas').select('id,id_interno_escola,id_anac,data_termino').in('id_anac', anacs),
    // O CPF legado pode estar pontuado; a normalização acontece abaixo, após a leitura autorizada.
    loadAllStudentPeople(),
    supabase.from('empresas').select('id,nome_fantasia,razao_social'),
  ]);
  if (internalQuery.error || anacQuery.error || companiesQuery.error) throw safeError('Não foi possível carregar as referências da migração.');
  const internalClasses = (internalQuery.data ?? []) as StudentTurma[];
  const anacClasses = (anacQuery.data ?? []) as StudentTurma[];
  const byInternal = new Map(internalClasses.map((turma) => [turma.id_interno_escola, turma]));
  const byAnac = new Map(anacClasses.map((turma) => [normalizeStudentComparison(turma.id_anac), turma]));
  const peopleByCpf = new Map<string, StudentPerson>();
  const duplicatePeopleCpfs = new Set<string>();
  people.forEach((person) => {
    const cpf = normalizeStudentCpf(person.cpf);
    if (!cpf) return;
    if (peopleByCpf.has(cpf)) duplicatePeopleCpfs.add(cpf);
    peopleByCpf.set(cpf, person);
  });
  const companies = (companiesQuery.data ?? []) as StudentCompany[];
  const classIds = uniqueBy([...internalClasses, ...anacClasses], (turma) => turma.id).map((turma) => turma.id);
  const { data: existingRows, error: existingError } = classIds.length
    ? await supabase.from('matriculas').select('id,aluno_id,turma_id').in('turma_id', classIds)
    : { data: [], error: null };
  if (existingError) throw safeError('Não foi possível consultar as matrículas existentes.');
  const matriculasByKey = new Map<string, ExistingMatricula>();
  ((existingRows ?? []) as ExistingMatricula[]).forEach((matricula) => matriculasByKey.set(`${matricula.aluno_id}|${matricula.turma_id}`, matricula));

  for (let index = 0; index < selectedRows.length; index += 1) {
    const row = selectedRows[index];
    const current = index + 1;
    const subject = `Linha ${row.line} · TURMA ${row.normalized.turma} · ANAC ${row.normalized.anac}`;
    try {
      progress('validação', current, `Validando ${subject}.`);
      const turma = classForRow(row, byInternal, byAnac);
      progress('conciliação', current, `${subject}: turma conciliada.`);
      let person = peopleByCpf.get(row.normalized.cpf);
      let personStatus: 'criada' | 'reutilizada' | 'reutilizada após conflito' = person ? 'reutilizada' : 'criada';
      let duplicatePerson = duplicatePeopleCpfs.has(row.normalized.cpf);
      if (!person) {
        const { data, error } = await supabase.from('pessoas').insert({ id: newServiceId('pessoa'), nome: row.normalized.nome, cpf: row.normalized.cpf, papel: UserRole.ALUNO, ativo: true, visivel_diretorio: true }).select('id,nome,cpf,papel,ativo').single();
        if (error) {
          if (!isUniqueConflict(error)) throw safeError('Não foi possível criar o cadastro do aluno.');
          const existingPerson = await findStudentPersonByCpf(row.normalized.cpf);
          if (!existingPerson.person || existingPerson.duplicate) throw safeError('Não foi possível localizar uma pessoa única pelo CPF.');
          person = existingPerson.person;
          personStatus = 'reutilizada após conflito';
          duplicatePerson = existingPerson.duplicate;
        } else if (!data) {
          throw safeError('Não foi possível criar o cadastro do aluno.');
        } else {
          person = data as StudentPerson;
        }
        peopleByCpf.set(row.normalized.cpf, person);
      }
      assertUsableStudentPerson(person, duplicatePerson);
      if (normalizeStudentComparison(person.nome) !== normalizeStudentComparison(row.normalized.nome)) {
        const warning = `Nome da planilha "${row.normalized.nome}" diverge do nome canônico cadastrado para o CPF ("${person.nome}").`;
        if (!row.warnings.includes(warning)) row.warnings = [...row.warnings, warning];
      }
      if (!person.papel) {
        const { data, error } = await supabase.from('pessoas').update({ papel: UserRole.ALUNO }).eq('id', person.id).select('id,nome,cpf,papel,ativo').single();
        if (error || !data || data.id !== person.id || data.papel !== UserRole.ALUNO) throw safeError('Não foi possível classificar a pessoa histórica como aluno.');
        person = { ...person, papel: data.papel };
        peopleByCpf.set(row.normalized.cpf, person);
      }
      const personMessage = personStatus === 'criada'
        ? 'Pessoa criada.'
        : personStatus === 'reutilizada após conflito'
          ? 'Pessoa reutilizada após conflito de CPF.'
          : 'Pessoa reutilizada por CPF.';
      progress('pessoa', current, `${subject}: ${personMessage}`);

      const companyName = clean(row.values.Empresa);
      let companyId: string | null = null;
      if (companyName) {
        const match = companyMatches(companies, companyName);
        if (match.company) {
          companyId = match.company.id;
          const warning = `Empresa "${companyName}" encontrada e vinculada à matrícula.`;
          if (!row.warnings.includes(warning)) row.warnings = [...row.warnings, warning];
        } else {
          const warning = match.ambiguous
            ? `Empresa "${companyName}" corresponde a mais de um cadastro; cadastro manual pendente. Matrícula importada sem vínculo.`
            : `Empresa "${companyName}" não encontrada — cadastro manual pendente. Matrícula importada sem vínculo.`;
          if (!row.warnings.includes(warning)) row.warnings = [...row.warnings, warning];
        }
      }
      const key = `${person.id}|${turma.id}`;
      const academic = {
        percentual_presenca: row.normalized.percentualPresenca ?? 0,
        nota_1_chamada: row.normalized.nota1Chamada,
        nota_2_chamada: row.normalized.nota2Chamada,
        status_resultado: row.normalized.statusResultado,
        status_resultado_final: row.normalized.statusResultadoFinal,
        status_matricula: statusForClass(turma),
      };
      const existing = matriculasByKey.get(key);
      progress('matrícula', current, `${subject}: ${existing ? 'atualizando matrícula existente' : 'criando matrícula histórica'}.`);
      if (existing) {
        const updatePayload = companyName ? { ...academic, empresa_b2b_id: companyId } : academic;
        const { error } = await supabase.from('matriculas').update(updatePayload).eq('id', existing.id);
        if (error) throw safeError('Não foi possível atualizar a matrícula histórica.');
        results.push(resultMessage(row, turma, `${personMessage} Matrícula reutilizada e dados acadêmicos atualizados. Não foi criado diário de classe.${row.warnings.length ? ` ${row.warnings.join(' ')}` : ''}`));
      } else {
        const { data, error } = await supabase.rpc('create_matricula', {
          p_aluno_id: person.id,
          p_turma_id: turma.id,
          p_empresa_b2b_id: companyId,
          p_software_utilizado: null,
          p_percentual_presenca: academic.percentual_presenca,
          p_nota_1_chamada: academic.nota_1_chamada,
          p_nota_2_chamada: academic.nota_2_chamada,
          p_resultado_final: null,
          p_status_resultado: academic.status_resultado,
          p_status_resultado_final: academic.status_resultado_final,
          p_status_matricula: academic.status_matricula,
          p_criar_diario: false,
        });
        if (error || !data) throw safeError('Não foi possível criar a matrícula histórica.');
        matriculasByKey.set(key, data as ExistingMatricula);
        results.push(resultMessage(row, turma, `${personMessage} Vínculo de matrícula criado com sucesso. Não foi criado diário de classe.${row.warnings.length ? ` ${row.warnings.join(' ')}` : ''}`));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível concluir a linha.';
      results.push({ line: row.line, status: 'erro', turma: row.normalized.turma, anac: row.normalized.anac, cpf: row.normalized.cpf, warnings: row.warnings, message: message.slice(0, 300) });
      progress('erro', current, `Erro seguro na linha ${row.line}.`);
    }
  }
  progress(results.some((result) => result.status === 'erro') ? 'erro' : 'concluído', total, 'Lote finalizado.');
  const successfulClasses = Array.from(results.reduce((classes, result) => {
    if (result.status !== 'sucesso' || !result.turmaId || result.idInternoEscola === undefined || !result.anac) return classes;
    const current = classes.get(result.turmaId) ?? {
      turmaId: result.turmaId,
      idInternoEscola: result.idInternoEscola,
      idAnac: result.anac,
      alunosImportados: 0,
    };
    current.alunosImportados += 1;
    classes.set(result.turmaId, current);
    return classes;
  }, new Map<string, StudentMigrationSuccessfulClass>()).values());
  return {
    results,
    successfulClasses,
    successCount: results.filter((result) => result.status === 'sucesso').length,
    errorCount: results.filter((result) => result.status === 'erro').length,
  };
}

function resultLine(result: StudentMigrationRowResult): string {
  return `[${result.status.toUpperCase()}] Linha ${result.line} · TURMA ${result.turma ?? '—'} · ANAC ${result.anac ?? '—'} · CPF ${result.cpf ?? '—'}: ${result.message}`;
}

export function studentMigrationLogText(result: StudentMigrationRunResult): string { return result.results.map(resultLine).join('\n'); }
export function studentMigrationIssuesLogText(result: StudentMigrationRunResult): string { return result.results.filter((item) => item.status === 'erro').map(resultLine).join('\n'); }
