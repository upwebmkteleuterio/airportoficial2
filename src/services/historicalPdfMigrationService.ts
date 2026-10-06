import { supabase } from '../integrations/supabase/client';
import { DocumentStatus, type Documento, type Pessoa, type Turma } from '../types';
import { documentService } from './documentService';
import { serviceError } from './supabaseErrors';

export const UNIFIED_DOCUMENT_TYPE = 'Documento unificado';

export type HistoricalPdfRosterPerson = Pick<Pessoa, 'id' | 'nome'>;
export type HistoricalPdfClass = Pick<Turma, 'id' | 'id_anac' | 'id_interno_escola'>;

async function assertCanMigrateHistoricalPdfs() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('Sessão não autenticada. Faça login novamente.');
  const { data: isPrivileged, error: privilegeError } = await supabase.rpc('is_privileged_user');
  if (privilegeError) throw serviceError('Não foi possível validar a permissão de migração', privilegeError);
  if (isPrivileged !== true) throw new Error('A migração de PDFs está disponível somente para Gestor ou Equipe.');
}

export function normalizePdfStudentName(value: string) {
  return value
    .replace(/\.[^.]+$/, '')
    .replace(/[\s_-]*\d+\s*$/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9]/g, '');
}

export function matchPdfName(fileName: string, roster: HistoricalPdfRosterPerson[]) {
  const normalizedFileName = normalizePdfStudentName(fileName);
  if (!normalizedFileName) return { kind: 'none' as const, candidates: [] as HistoricalPdfRosterPerson[] };
  const normalizedRoster = roster.map((person) => ({ person, name: normalizePdfStudentName(person.nome) }));
  const exact = normalizedRoster.filter((entry) => entry.name === normalizedFileName).map((entry) => entry.person);
  if (exact.length === 1) return { kind: 'exact' as const, candidates: exact };
  if (exact.length > 1) return { kind: 'ambiguous' as const, candidates: exact };
  const partial = normalizedRoster
    .filter((entry) => normalizedFileName.length >= 3 && entry.name.startsWith(normalizedFileName))
    .map((entry) => entry.person);
  if (partial.length === 1) return { kind: 'partial' as const, candidates: partial };
  if (partial.length > 1) return { kind: 'ambiguous' as const, candidates: partial };
  return { kind: 'none' as const, candidates: [] as HistoricalPdfRosterPerson[] };
}

export async function hashHistoricalPdf(file: File) {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function assertPeopleBelongToClass(turmaId: string, personIds: string[]) {
  if (personIds.length === 0) return;
  const { data, error } = await supabase
    .from('matriculas')
    .select('aluno_id')
    .eq('turma_id', turmaId)
    .in('aluno_id', personIds);
  if (error) throw serviceError('Não foi possível validar o escopo da turma selecionada', error);
  const enrolledIds = new Set((data ?? []).map((row) => row.aluno_id as string));
  if (personIds.some((personId) => !enrolledIds.has(personId))) {
    throw new Error('A pessoa escolhida não pertence à turma selecionada. Atualize o roster e tente novamente.');
  }
}

export const historicalPdfMigrationService = {
  searchClasses: async (query: string): Promise<HistoricalPdfClass[]> => {
    await assertCanMigrateHistoricalPdfs();
    const numericQuery = query.replace(/\D/g, '').slice(0, 32);
    if (!numericQuery) return [];

    const internalId = Number(numericQuery);
    let classQuery = supabase
      .from('turmas')
      .select('id, id_anac, id_interno_escola')
      .ilike('id_anac', `%${numericQuery}%`);
    if (Number.isSafeInteger(internalId)) {
      classQuery = supabase
        .from('turmas')
        .select('id, id_anac, id_interno_escola')
        .or(`id_anac.ilike.%${numericQuery}%,id_interno_escola.eq.${internalId}`);
    }
    const { data, error } = await classQuery.order('id_interno_escola', { ascending: false }).limit(15);
    if (error) throw serviceError('Não foi possível buscar as turmas', error);
    return (data ?? []) as HistoricalPdfClass[];
  },

  getRoster: async (turmaId: string): Promise<HistoricalPdfRosterPerson[]> => {
    await assertCanMigrateHistoricalPdfs();
    const { data: classRow, error: classError } = await supabase.from('turmas').select('id').eq('id', turmaId).maybeSingle();
    if (classError) throw serviceError('Não foi possível validar a turma selecionada', classError);
    if (!classRow) throw new Error('A turma selecionada não está disponível. Escolha uma turma válida.');
    const { data: enrollments, error: enrollmentError } = await supabase
      .from('matriculas')
      .select('aluno_id')
      .eq('turma_id', turmaId);
    if (enrollmentError) throw serviceError('Não foi possível carregar as matrículas da turma', enrollmentError);
    const personIds = [...new Set((enrollments ?? []).map((row) => row.aluno_id as string))];
    if (personIds.length === 0) return [];
    const { data: people, error: peopleError } = await supabase
      .from('pessoas')
      .select('id, nome')
      .in('id', personIds);
    if (peopleError) throw serviceError('Não foi possível carregar o roster da turma', peopleError);
    return (people ?? []) as HistoricalPdfRosterPerson[];
  },

  getUnifiedDocuments: async (turmaId: string, personIds: string[]): Promise<Documento[]> => {
    await assertCanMigrateHistoricalPdfs();
    await assertPeopleBelongToClass(turmaId, personIds);
    if (personIds.length === 0) return [];
    const { data, error } = await supabase
      .from('documentos')
      .select('*')
      .in('pessoa_id', personIds)
      .eq('tipo_documento', UNIFIED_DOCUMENT_TYPE);
    if (error) throw serviceError('Não foi possível verificar documentos unificados já registrados', error);
    return (data ?? []) as Documento[];
  },

  importOne: async (turmaId: string, file: File, person: HistoricalPdfRosterPerson): Promise<'importado' | 'ja_importado' | 'conflito'> => {
    await assertCanMigrateHistoricalPdfs();
    await assertPeopleBelongToClass(turmaId, [person.id]);
    const hash = await hashHistoricalPdf(file);
    const existing = await historicalPdfMigrationService.getUnifiedDocuments(turmaId, [person.id]);
    if (existing.some((document) => document.hash_sha256 === hash)) return 'ja_importado';
    if (existing.length > 0) return 'conflito';

    await documentService.uploadFile({
      file,
      pessoa_id: person.id,
      usuario_id: null,
      tipo_documento: UNIFIED_DOCUMENT_TYPE,
      status: DocumentStatus.APROVADO,
      origem_cadastro: 'migracao',
      metodo_verificacao: 'nao_aplicavel',
      storage_area: 'oficiais',
      grupo_documento_id: `${person.id}:${UNIFIED_DOCUMENT_TYPE}`,
      versao: 1,
      esta_atual: true,
    });
    return 'importado';
  },
};
