import * as XLSX from 'xlsx';
import { supabase } from '../integrations/supabase/client';
import { InstructorFuncao, UserRole } from '../types';
import { newServiceId } from './supabaseErrors';

export const MIGRATION_COLUMNS = [
  'TURMA', 'ANAC', 'Curso', 'TURNO', 'HORÁRIO', 'INÍCIO', 'TÉRMINO', '1ª CH', '2ª CH',
  'CIDADE', 'UF', 'Endereço', 'INSTRUTOR', 'CONVIDADO', 'APLICADOR PR', 'PASTA', 'Status',
  'Prazo', 'S/N', 'MAT', 'SOFTWARE', 'v.t', 'obs.:', 'CÓPIA TURMA', 'H/a', 'referência',
] as const;

export type MigrationColumn = typeof MIGRATION_COLUMNS[number];

export const MIGRATION_DESTINATIONS: Record<MigrationColumn, string> = {
  TURMA: 'turmas.id_interno_escola', ANAC: 'turmas.id_anac', Curso: 'cursos → turmas.curso_id', TURNO: 'turmas.turno',
  'HORÁRIO': 'turmas.horario_aulas', 'INÍCIO': 'turmas.data_inicio', 'TÉRMINO': 'turmas.data_termino',
  '1ª CH': 'turmas.horario_prova_1_chamada', '2ª CH': 'turmas.horario_prova_2_chamada', CIDADE: 'turmas.cidade', UF: 'turmas.uf',
  Endereço: 'enderecos → turmas.endereco_id', INSTRUTOR: 'turma_instrutores (Instrutor_Tutor)', CONVIDADO: 'turma_instrutores (Convidado)',
  'APLICADOR PR': 'turmas.aplicador_id + turma_instrutores', PASTA: 'ignorada', Status: 'turmas.status_historico', Prazo: 'turmas.status_prazo_notas',
  'S/N': 'turmas.status_operacional_sn', MAT: 'contagem derivada (ignorada)', SOFTWARE: 'turmas.software_utilizado', 'v.t': 'turmas.numero_vt',
  'obs.:': 'turmas.anotacoes_turma', 'CÓPIA TURMA': 'ignorada', 'H/a': 'turmas.carga_horaria', referência: 'ignorada',
};
export type MigrationStage = 'validação' | 'entidades' | 'turma' | 'vínculos' | 'concluído' | 'erro';

export type MigrationProgress = {
  stage: MigrationStage;
  current: number;
  total: number;
  percent: number;
  message: string;
};

export type MigrationParsedRow = {
  line: number;
  values: Record<MigrationColumn, string>;
  problems: string[];
};

export type MigrationParseResult = {
  headers: string[];
  recognized: MigrationColumn[];
  missing: MigrationColumn[];
  unknown: string[];
  ignored: MigrationColumn[];
  duplicateHeaders: string[];
  rows: MigrationParsedRow[];
};

export type MigrationRowResult = {
  line: number;
  status: 'sucesso' | 'erro';
  message: string;
};

export type MigrationRunResult = {
  results: MigrationRowResult[];
  successCount: number;
  errorCount: number;
};

const ignoredColumns = new Set<MigrationColumn>(['PASTA', 'CÓPIA TURMA', 'referência']);
const columnAliases: Record<string, MigrationColumn> = {
  TURMA: 'TURMA', ANAC: 'ANAC', CURSO: 'Curso', TURNO: 'TURNO', HORARIO: 'HORÁRIO',
  INICIO: 'INÍCIO', TERMINO: 'TÉRMINO', '1CH': '1ª CH', '2CH': '2ª CH', CIDADE: 'CIDADE', UF: 'UF',
  ENDERECO: 'Endereço', INSTRUTOR: 'INSTRUTOR', CONVIDADO: 'CONVIDADO', APLICADORPR: 'APLICADOR PR',
  PASTA: 'PASTA', STATUS: 'Status', PRAZO: 'Prazo', SN: 'S/N', MAT: 'MAT', SOFTWARE: 'SOFTWARE',
  VT: 'v.t', OBS: 'obs.:', COPIATURMA: 'CÓPIA TURMA', HA: 'H/a', REFERENCIA: 'referência',
};

function normalizeHeader(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function normalizeMigrationValue(value: unknown): string {
  return String(value ?? '').replace(/\u00a0/g, ' ').trim();
}

export function normalizeComparison(value: string): string {
  return normalizeMigrationValue(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleUpperCase('pt-BR')
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function emptyValues(): Record<MigrationColumn, string> {
  return MIGRATION_COLUMNS.reduce((result, column) => {
    result[column] = '';
    return result;
  }, {} as Record<MigrationColumn, string>);
}

function displayCell(value: unknown): string {
  if (value instanceof Date) return value.toLocaleDateString('pt-BR');
  return normalizeMigrationValue(value);
}

export async function parseMigrationFile(file: File): Promise<MigrationParseResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const firstSheet = workbook.SheetNames[0];
  if (!firstSheet) throw new Error('O arquivo não contém uma planilha.');
  const sheet = workbook.Sheets[firstSheet];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '', raw: true });
  const headerRow = matrix[0] ?? [];
  const headers = headerRow.map((value) => displayCell(value));
  if (headers.every((header) => !header)) throw new Error('A primeira linha precisa conter os nomes das colunas.');

  const recognized: MigrationColumn[] = [];
  const unknown: string[] = [];
  const duplicateHeaders: string[] = [];
  const headerMap = new Map<MigrationColumn, number>();
  headers.forEach((header, index) => {
    const column = columnAliases[normalizeHeader(header)];
    if (!column) {
      if (header) unknown.push(header);
      return;
    }
    if (headerMap.has(column)) {
      duplicateHeaders.push(header || column);
      return;
    }
    headerMap.set(column, index);
    recognized.push(column);
  });

  const missing = MIGRATION_COLUMNS.filter((column) => !headerMap.has(column) && !ignoredColumns.has(column));
  const rows = matrix.slice(1).map((row, rowIndex) => {
    const values = emptyValues();
    headerMap.forEach((index, column) => {
      values[column] = displayCell(row[index]);
    });
    return { line: rowIndex + 2, values, problems: validateMigrationRow(values) };
  }).filter((row) => Object.values(row.values).some(Boolean));

  const keyLines = new Map<string, number>();
  rows.forEach((row) => {
    const anac = normalizeComparison(row.values.ANAC);
    const interno = normalizeComparison(row.values.TURMA);
    [anac ? `ANAC:${anac}` : '', interno ? `TURMA:${interno}` : ''].filter(Boolean).forEach((key) => {
      const previous = keyLines.get(key);
      if (previous) row.problems.push(`Identificador repetido no arquivo (também aparece na linha ${previous}).`);
      else keyLines.set(key, row.line);
    });
  });

  return {
    headers,
    recognized,
    missing,
    unknown,
    ignored: MIGRATION_COLUMNS.filter((column) => ignoredColumns.has(column)),
    duplicateHeaders,
    rows,
  };
}

function parseDate(value: string): string | null {
  const text = normalizeMigrationValue(value);
  if (!text) return null;
  const br = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (br) {
    const year = br[3].length === 2 ? Number(`20${br[3]}`) : Number(br[3]);
    const date = new Date(Date.UTC(year, Number(br[2]) - 1, Number(br[1])));
    if (date.getUTCFullYear() === year && date.getUTCMonth() === Number(br[2]) - 1 && date.getUTCDate() === Number(br[1])) {
      return `${year.toString().padStart(4, '0')}-${br[2].padStart(2, '0')}-${br[1].padStart(2, '0')}`;
    }
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const serial = Number(text);
  if (Number.isInteger(serial) && serial > 0) {
    const date = new Date(Date.UTC(1899, 11, 30) + serial * 86400000);
    if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10);
  }
  return null;
}

function parseNumber(value: string): number | null {
  const text = normalizeMigrationValue(value).replace(/\s/g, '').replace(',', '.');
  if (!text) return null;
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

function statusHistory(value: string): 'No prazo' | 'Cancelado' | 'Encerrado' | null {
  const normalized = normalizeComparison(value);
  if (normalized === 'NO PRAZO') return 'No prazo';
  if (normalized === 'CANCELADO') return 'Cancelado';
  if (normalized === 'ENCERRADO') return 'Encerrado';
  return null;
}

function prazoStatus(value: string): 'No prazo' | 'Nota Lançada' | 'Atrasado' | null {
  const normalized = normalizeComparison(value);
  if (normalized === 'NO PRAZO') return 'No prazo';
  if (normalized === 'NOTA LANCADA' || normalized === 'NOTA LANÇADA') return 'Nota Lançada';
  if (normalized === 'ATRASADO') return 'Atrasado';
  return null;
}

function validateMigrationRow(values: Record<MigrationColumn, string>): string[] {
  const problems: string[] = [];
  if (!normalizeMigrationValue(values.TURMA)) problems.push('TURMA ausente.');
  else if (!Number.isInteger(Number(normalizeMigrationValue(values.TURMA)))) problems.push('TURMA precisa ser um número inteiro.');
  if (!normalizeMigrationValue(values.ANAC)) problems.push('ANAC ausente.');
  if (!normalizeMigrationValue(values.Curso)) problems.push('Curso ausente ou não conciliável.');
  if (!normalizeMigrationValue(values['INÍCIO']) || !parseDate(values['INÍCIO'])) problems.push('INÍCIO ausente ou inválido.');
  if (!normalizeMigrationValue(values['TÉRMINO']) || !parseDate(values['TÉRMINO'])) problems.push('TÉRMINO ausente ou inválido.');
  if (!normalizeMigrationValue(values.CIDADE)) problems.push('CIDADE ausente.');
  if (!normalizeMigrationValue(values.UF)) problems.push('UF ausente.');
  const status = normalizeMigrationValue(values.Status);
  if (status && !statusHistory(status)) problems.push('Status deve ser No prazo, Cancelado ou Encerrado.');
  const prazo = normalizeMigrationValue(values.Prazo);
  if (prazo && !prazoStatus(prazo)) problems.push('Prazo não reconhecido; será necessário revisar a linha.');
  const sn = normalizeComparison(values['S/N']);
  if (sn && !['S', 'SIM', 'N', 'NAO', '1', '0'].includes(sn)) problems.push('S/N deve ser S, N, Sim ou Não.');
  const vt = normalizeMigrationValue(values['v.t']);
  if (vt && (!Number.isInteger(parseNumber(vt)) || Number(parseNumber(vt)) < 0)) problems.push('v.t. deve ser um número inteiro não negativo.');
  const carga = normalizeMigrationValue(values['H/a']);
  if (carga && (parseNumber(carga) === null || Number(parseNumber(carga)) < 0)) problems.push('H/a deve ser um número não negativo.');
  return problems;
}

function safeError(message: string): Error {
  return new Error(message.slice(0, 300));
}

async function assertMigrationAccess(): Promise<void> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw safeError('Sessão não autenticada.');
  const role = data.user.app_metadata?.role ?? data.user.user_metadata?.role;
  if (role !== UserRole.GESTOR && role !== UserRole.EQUIPE) throw safeError('A migração está disponível somente para Gestor e Equipe.');
}

function normalizeShift(value: string): string {
  const normalized = normalizeComparison(value);
  const known: Record<string, string> = {
    MANHA: 'MANHÃ', TARDE: 'TARDE', NOITE: 'NOITE',
    'MANHA TARDE': 'MANHÃ/TARDE', 'TARDE NOITE': 'TARDE/NOITE',
    'MANHA TARDE NOITE': 'MANHÃ/TARDE E NOITE',
  };
  return known[normalized] ?? normalizeMigrationValue(value);
}

function booleanValue(value: string): boolean {
  return ['S', 'SIM', '1', 'TRUE', 'VERDADEIRO'].includes(normalizeComparison(value));
}

function personNameValues(row: MigrationParsedRow): Array<{ name: string; funcao: InstructorFuncao }> {
  return [
    { name: row.values.INSTRUTOR, funcao: InstructorFuncao.INSTRUTOR_TUTOR },
    { name: row.values.CONVIDADO, funcao: InstructorFuncao.CONVIDADO },
    { name: row.values['APLICADOR PR'], funcao: InstructorFuncao.APLICADOR_PROVA },
  ].filter((item) => {
    const normalized = normalizeComparison(item.name);
    return Boolean(normalized) && normalized !== 'NAO APLICAVEL' && normalized !== 'N APLICAVEL';
  });
}

type ExistingCourse = { id: string; nome_curso: string; carga_horaria_total?: number };
type ExistingPerson = { id: string; nome: string };
type ExistingAddress = { id: string; logradouro: string; cidade: string; estado: string };

async function loadReferenceData() {
  const [courses, people, addresses] = await Promise.all([
    supabase.from('cursos').select('id,nome_curso,carga_horaria_total'),
    supabase.from('pessoas').select('id,nome'),
    supabase.from('enderecos').select('id,logradouro,cidade,estado'),
  ]);
  if (courses.error || people.error || addresses.error) throw safeError('Não foi possível carregar as entidades de conciliação.');
  return {
    courses: (courses.data ?? []) as ExistingCourse[],
    people: (people.data ?? []) as ExistingPerson[],
    addresses: (addresses.data ?? []) as ExistingAddress[],
  };
}

function findUnique<T>(items: T[], value: string, getValue: (item: T) => string): T | null {
  const matches = items.filter((item) => normalizeComparison(getValue(item)) === normalizeComparison(value));
  if (matches.length > 1) throw safeError(`A correspondência para "${normalizeMigrationValue(value)}" é ambígua.`);
  return matches[0] ?? null;
}

function addressKey(logradouro: string, cidade: string, uf: string): string {
  return [logradouro, cidade, uf].map(normalizeComparison).join('|');
}

async function createPerson(name: string): Promise<ExistingPerson> {
  const cleanName = normalizeMigrationValue(name);
  const { data, error } = await supabase.from('pessoas').insert({
    id: newServiceId('pessoa'), nome: cleanName, cpf: null, ativo: true, visivel_diretorio: true,
  }).select('id,nome').single();
  if (error || !data) throw safeError('Não foi possível criar o cadastro histórico da pessoa.');
  return data as ExistingPerson;
}

async function createCourse(name: string, cargaHoraria: string): Promise<ExistingCourse> {
  const cleanName = normalizeMigrationValue(name).replace(/\s+/g, ' ');
  const carga = parseNumber(cargaHoraria);
  const { data, error } = await supabase.from('cursos').insert({
    id: newServiceId('curso'), nome_curso: cleanName, carga_horaria_total: carga ?? 0,
  }).select('id,nome_curso,carga_horaria_total').single();
  if (error || !data) throw safeError('Não foi possível criar o curso histórico.');
  return data as ExistingCourse;
}

async function createAddress(logradouro: string, cidade: string, uf: string): Promise<ExistingAddress> {
  const { data, error } = await supabase.from('enderecos').insert({
    id: newServiceId('endereco'), logradouro: normalizeMigrationValue(logradouro), cidade: normalizeMigrationValue(cidade), estado: normalizeMigrationValue(uf).toUpperCase(), ativo: true,
  }).select('id,logradouro,cidade,estado').single();
  if (error || !data) throw safeError('Não foi possível criar o endereço histórico.');
  return data as ExistingAddress;
}

async function findExistingClass(row: MigrationParsedRow): Promise<boolean> {
  const anac = normalizeMigrationValue(row.values.ANAC);
  const interno = Number(normalizeMigrationValue(row.values.TURMA));
  const [byAnac, byInternal] = await Promise.all([
    supabase.from('turmas').select('id').eq('id_anac', anac).limit(1),
    supabase.from('turmas').select('id').eq('id_interno_escola', interno).limit(1),
  ]);
  if (byAnac.error || byInternal.error) throw safeError('Não foi possível validar a duplicidade da turma.');
  return (byAnac.data?.length ?? 0) > 0 || (byInternal.data?.length ?? 0) > 0;
}

function toClassPayload(row: MigrationParsedRow, course: ExistingCourse, addressId: string | null) {
  const historicalStatus = statusHistory(row.values.Status);
  const prazo = prazoStatus(row.values.Prazo);
  const interno = Number(normalizeMigrationValue(row.values.TURMA));
  const carga = parseNumber(row.values['H/a']);
  const vt = parseNumber(row.values['v.t']);
  const city = normalizeMigrationValue(row.values.CIDADE);
  const uf = normalizeMigrationValue(row.values.UF).toUpperCase();
  return {
    id: newServiceId('turma'), id_interno_escola: interno, id_anac: normalizeMigrationValue(row.values.ANAC), curso_id: course.id,
    turno: normalizeShift(row.values.TURNO), horario_aulas: normalizeMigrationValue(row.values['HORÁRIO']),
    data_inicio: parseDate(row.values['INÍCIO']), data_termino: parseDate(row.values['TÉRMINO']), endereco_id: addressId,
    endereco_realizacao: normalizeMigrationValue(row.values.Endereço), cidade: city, uf,
    qt_alunos_matriculados: 0, horario_prova_1_chamada: normalizeMigrationValue(row.values['1ª CH']) || null,
    horario_prova_2_chamada: normalizeMigrationValue(row.values['2ª CH']) || null, data_prova_1_chamada: null, data_prova_2_chamada: null,
    vigilante_sem_deslocamento: false, anotacoes_turma: normalizeMigrationValue(row.values['obs.:']), status_prazo_notas: prazo,
    status_operacional_sn: booleanValue(row.values['S/N']), status_turma: historicalStatus === 'Cancelado' ? 'Cancelada' : 'Ativa',
    status_historico: historicalStatus, numero_vt: vt === null ? null : Math.trunc(vt), carga_horaria: carga,
    software_utilizado: normalizeMigrationValue(row.values.SOFTWARE) || null, nota_lancada: prazo === 'Nota Lançada',
    data_lancamento_notas: null, data_lancada_real: null,
  };
}

export async function runMigrationBatch(rows: MigrationParsedRow[], onProgress?: (progress: MigrationProgress) => void): Promise<MigrationRunResult> {
  await assertMigrationAccess();
  const selectedRows = rows.slice();
  const total = selectedRows.length;
  const results: MigrationRowResult[] = [];
  const references = await loadReferenceData();
  const coursesByName = new Map<string, ExistingCourse>();
  const ambiguousCourseNames = new Set<string>();
  references.courses.forEach((course) => {
    const name = normalizeComparison(course.nome_curso);
    if (!name) return;
    if (coursesByName.has(name)) ambiguousCourseNames.add(name);
    else coursesByName.set(name, course);
  });
  const createdCourseNames = new Set<string>();
  const peopleByName = new Map(references.people.map((person) => [normalizeComparison(person.nome), person]));
  const ambiguousPeopleNames = new Set(
    references.people.map((person) => normalizeComparison(person.nome)).filter((name, index, names) => name && names.indexOf(name) !== index),
  );
  const createdPeopleNames = new Set<string>();
  const addressesByKey = new Map(references.addresses.map((address) => [addressKey(address.logradouro, address.cidade, address.estado), address]));
  const createdAddressKeys = new Set<string>();

  const progress = (stage: MigrationStage, current: number, message: string) => onProgress?.({
    stage, current, total, percent: total === 0 ? 100 : Math.round((current / total) * 100), message,
  });
  progress('validação', 0, 'Validando as linhas selecionadas.');

  for (let index = 0; index < selectedRows.length; index += 1) {
    const row = selectedRows[index];
    const current = index + 1;
    const subject = `Turma ${row.values.TURMA || '—'} · ANAC ${row.values.ANAC || '—'} · início ${row.values['INÍCIO'] || '—'}`;
    let entityActions: string[] = [];
    try {
      progress('validação', current, `Validando ${subject} (linha ${row.line}).`);
      const problems = validateMigrationRow(row.values);
      if (problems.length > 0) throw safeError(problems.join(' '));
      if (await findExistingClass(row)) throw safeError('A turma já existe por ID ANAC ou ID interno da escola.');

      const normalizedCourseName = normalizeComparison(row.values.Curso);
      if (ambiguousCourseNames.has(normalizedCourseName)) throw safeError(`O curso "${normalizeMigrationValue(row.values.Curso)}" é ambíguo.`);
      const personEntries = personNameValues(row);
      personEntries.forEach((entry) => {
        if (ambiguousPeopleNames.has(normalizeComparison(entry.name))) throw safeError(`A pessoa "${normalizeMigrationValue(entry.name)}" é ambígua.`);
      });
      let course = coursesByName.get(normalizedCourseName);
      entityActions = [];
      let courseAction: string;
      if (course) {
        courseAction = createdCourseNames.has(normalizedCourseName) ? 'reutilizado (criado neste lote)' : 'localizado';
      } else {
        course = await createCourse(row.values.Curso, row.values['H/a']);
        coursesByName.set(normalizedCourseName, course);
        createdCourseNames.add(normalizedCourseName);
        courseAction = 'criado';
      }
      entityActions.push(`Curso ${courseAction}: "${course.nome_curso}"`);

      let addressId: string | null = null;
      const addressText = normalizeMigrationValue(row.values.Endereço);
      if (addressText) {
        const key = addressKey(addressText, row.values.CIDADE, row.values.UF);
        let address = addressesByKey.get(key);
        const addressAction = address && createdAddressKeys.has(key) ? 'reutilizado (criado neste lote)' : address ? 'localizado' : 'criado';
        if (!address) {
          address = await createAddress(addressText, row.values.CIDADE, row.values.UF);
          addressesByKey.set(key, address);
          createdAddressKeys.add(key);
        }
        addressId = address.id;
        entityActions.push(`Endereço ${addressAction}`);
      } else {
        entityActions.push('Endereço não informado');
      }

      const resolvedPeople: Array<{ person: ExistingPerson; funcao: InstructorFuncao }> = [];
      for (const entry of personEntries) {
        const normalizedName = normalizeComparison(entry.name);
        let person = peopleByName.get(normalizedName);
        const personAction = person
          ? createdPeopleNames.has(normalizedName) ? 'reutilizada (criada neste lote)' : 'localizada'
          : 'criada';
        if (!person) {
          person = findUnique(references.people, entry.name, (item) => item.nome);
          if (!person) {
            person = await createPerson(entry.name);
            createdPeopleNames.add(normalizedName);
          }
          peopleByName.set(normalizedName, person);
        }
        entityActions.push(`Pessoa "${normalizeMigrationValue(entry.name)}" ${personAction}`);
        if (!resolvedPeople.some((resolved) => resolved.person.id === person?.id && resolved.funcao === entry.funcao)) {
          resolvedPeople.push({ person, funcao: entry.funcao });
        }
      }
      if (resolvedPeople.length === 0) entityActions.push('Pessoas não informadas');
      progress('entidades', current, `${subject}: ${entityActions.join('; ')}.`);

      progress('turma', current, `Gravando ${subject}.`);
      const payload = toClassPayload(row, course, addressId);
      const { data: turma, error: classError } = await supabase.from('turmas').insert(payload).select('id').single();
      if (classError || !turma) throw safeError('Não foi possível gravar a turma; a linha não foi concluída.');

      progress('vínculos', current, `Gravando vínculos de ${subject}.`);
      if (resolvedPeople.length > 0) {
        const relations = resolvedPeople.map(({ person, funcao }) => ({
          id: newServiceId('turma-instrutor'), turma_id: turma.id, instrutor_id: person.id, funcao,
        }));
        const { error: relationError } = await supabase.from('turma_instrutores').insert(relations);
        if (relationError) throw safeError('A turma foi gravada, mas os vínculos falharam.');
        const aplicador = resolvedPeople.find(({ funcao }) => funcao === InstructorFuncao.APLICADOR_PROVA);
        if (aplicador) {
          const { error: updateError } = await supabase.from('turmas').update({ aplicador_id: aplicador.person.id }).eq('id', turma.id);
          if (updateError) throw safeError('A turma e os vínculos foram gravados, mas o aplicador não pôde ser associado.');
        }
      }
      results.push({ line: row.line, status: 'sucesso', message: `Turma e vínculos gravados com sucesso. ${entityActions.join('; ')}.` });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível concluir a linha.';
      const entityDetails = entityActions.length > 0 ? `${entityActions.join('; ')}. ` : '';
      results.push({ line: row.line, status: 'erro', message: `${entityDetails}${message}`.slice(0, 300) });
      progress('erro', current, `Erro seguro na linha ${row.line}.`);
    }
  }

  progress(results.some((result) => result.status === 'erro') ? 'erro' : 'concluído', total, 'Lote finalizado.');
  return {
    results,
    successCount: results.filter((result) => result.status === 'sucesso').length,
    errorCount: results.filter((result) => result.status === 'erro').length,
  };
}

export function migrationLogText(result: MigrationRunResult): string {
  return result.results.map((item) => `[${item.status.toUpperCase()}] Linha ${item.line}: ${item.message}`).join('\n');
}

