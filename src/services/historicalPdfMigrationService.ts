import { supabase } from '../integrations/supabase/client';
import { DocumentStatus, type Documento, type Pessoa, type Turma } from '../types';
import { documentService } from './documentService';
import { serviceError } from './supabaseErrors';

export const UNIFIED_DOCUMENT_TYPE = 'Documento unificado';

export type HistoricalPdfRosterPerson = Pick<Pessoa, 'id' | 'nome'>;
export type HistoricalPdfClass = Pick<Turma, 'id' | 'id_interno_escola'>;
export type HistoricalPdfImportEntry = { key: string; file: File; person: HistoricalPdfRosterPerson; relativePath: string };
export type HistoricalPdfImportResult = { key: string; fileName: string; studentName: string; status: 'Importado' | 'Já importado' | 'Conflito' | 'Erro'; message: string };

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

function significantNameTokens(value: string, stripExtension = false) {
  const name = stripExtension ? value.replace(/\.[^.]+$/, '') : value;
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((token) => token.length >= 3);
}

function matchPdfNameByFirstTwoTokens(candidateName: string, roster: HistoricalPdfRosterPerson[], stripExtension = false) {
  const tokens = significantNameTokens(candidateName, stripExtension);
  if (tokens.length < 2) return null;
  const matches = roster.filter((person) => {
    const personTokens = significantNameTokens(person.nome);
    return personTokens.length >= 2 && personTokens[0] === tokens[0] && personTokens[1] === tokens[1];
  });
  if (matches.length === 1) return { kind: 'first-two' as const, candidates: matches, basis: 'first-two' as const };
  if (matches.length > 1) return { kind: 'ambiguous' as const, candidates: matches, basis: 'first-two' as const };
  return null;
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
  const firstTwo = matchPdfNameByFirstTwoTokens(fileName, roster, true);
  if (firstTwo) return firstTwo;
  return { kind: 'none' as const, candidates: [] as HistoricalPdfRosterPerson[] };
}

function isPendingPdfFolder(folderName: string) {
  const normalizedFolder = folderName
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
    .toLocaleLowerCase('pt-BR');
  return /^pendencia(?:[\s_-]*\d+)?$/.test(normalizedFolder);
}

export function matchPdfPath(relativePath: string, roster: HistoricalPdfRosterPerson[], selectedRootName?: string) {
  const segments = relativePath.split('/').filter(Boolean);
  if (selectedRootName && isPendingPdfFolder(selectedRootName)) {
    return { ...matchPdfName('', roster), source: 'pending' as const, pending: true };
  }
  const nestedFolder = segments.length > 1 ? segments[0] : null;
  if (nestedFolder) {
    if (isPendingPdfFolder(nestedFolder)) {
      return { ...matchPdfName('', roster), source: 'pending' as const, pending: true };
    }
    const folderName = normalizePdfStudentName(nestedFolder);
    const candidates = roster.filter((person) => normalizePdfStudentName(person.nome) === folderName);
    if (candidates.length === 1) return { kind: 'exact' as const, candidates, source: 'folder' as const, pending: false };
    if (candidates.length > 1) return { kind: 'ambiguous' as const, candidates, source: 'folder' as const, pending: false };
    const firstTwo = matchPdfNameByFirstTwoTokens(nestedFolder, roster);
    if (firstTwo) return { ...firstTwo, source: 'folder' as const, pending: false };
    return { kind: 'none' as const, candidates: [] as HistoricalPdfRosterPerson[], source: 'folder' as const, pending: false };
  }
  return { ...matchPdfName(segments[0] ?? '', roster), source: 'filename' as const, pending: false };
}

async function hashHistoricalPdf(file: File) {
  if (file.size === 0) throw new Error('O arquivo está vazio.');
  let bytes: ArrayBuffer;
  try {
    bytes = await file.arrayBuffer();
  } catch (cause) {
    if (cause instanceof Error && cause.name === 'NotReadableError') {
      throw new Error('Não foi possível ler este arquivo. Verifique se ele continua disponível e tente selecioná-lo novamente.');
    }
    throw new Error('Não foi possível ler este arquivo. Tente selecioná-lo novamente.');
  }
  const signature = new Uint8Array(bytes, 0, Math.min(bytes.byteLength, 5));
  if (new TextDecoder().decode(signature) !== '%PDF-') throw new Error('O arquivo não contém uma assinatura PDF válida.');
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function historicalPdfDocumentGroupId(personId: string, relativePath: string) {
  const normalizedPath = relativePath.normalize('NFC').replace(/\\/g, '/').toLocaleLowerCase('pt-BR');
  return `historico-pdf:${personId}:${encodeURIComponent(normalizedPath)}`;
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

async function getUnifiedDocumentsForValidatedPeople(personIds: string[]): Promise<Documento[]> {
  if (personIds.length === 0) return [];
  const { data, error } = await supabase
    .from('documentos')
    .select('*')
    .in('pessoa_id', personIds)
    .eq('tipo_documento', UNIFIED_DOCUMENT_TYPE);
  if (error) throw serviceError('Não foi possível verificar documentos unificados já registrados', error);
  return (data ?? []) as Documento[];
}

export const historicalPdfMigrationService = {
  searchClasses: async (query: string): Promise<HistoricalPdfClass[]> => {
    await assertCanMigrateHistoricalPdfs();
    const numericQuery = query.replace(/\D/g, '');
    if (!numericQuery || (numericQuery.length > 1 && numericQuery.startsWith('0')) || numericQuery.length > 10) return [];

    const prefix = Number(numericQuery);
    const maxInternalId = 2147483647;
    if (!Number.isSafeInteger(prefix) || prefix > maxInternalId) return [];

    const ranges: Array<{ min: number; max: number }> = [];
    const maxSuffixLength = numericQuery === '0' ? 0 : 10 - numericQuery.length;
    for (let suffixLength = 0; suffixLength <= maxSuffixLength; suffixLength += 1) {
      const min = prefix * 10 ** suffixLength;
      if (min > maxInternalId) break;
      ranges.push({ min, max: Math.min(min + 10 ** suffixLength - 1, maxInternalId) });
    }
    if (ranges.length === 0) return [];

    const rangeFilters = ranges
      .map(({ min, max }) => `and(id_interno_escola.gte.${min},id_interno_escola.lte.${max})`)
      .join(',');
    const { data, error } = await supabase
      .from('turmas')
      .select('id, id_interno_escola')
      .or(rangeFilters)
      .order('id_interno_escola', { ascending: true })
      .limit(15);
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
    return ((people ?? []) as HistoricalPdfRosterPerson[]).sort((first, second) => first.nome.localeCompare(second.nome, 'pt-BR'));
  },

  importBatch: async (
    turmaId: string,
    entries: HistoricalPdfImportEntry[],
    onProgress?: (entry: HistoricalPdfImportEntry, index: number, total: number, stage: 'checking' | 'uploading', percent: number | null) => void,
  ): Promise<HistoricalPdfImportResult[]> => {
    await assertCanMigrateHistoricalPdfs();
    const selectedPersonIds = [...new Set(entries.map((entry) => entry.person.id))];
    await assertPeopleBelongToClass(turmaId, selectedPersonIds);
    const documents = await getUnifiedDocumentsForValidatedPeople(selectedPersonIds);
    const documentIndex = new Map<string, Array<Pick<Documento, 'hash_sha256' | 'grupo_documento_id'>>>();
    documents.forEach((document) => {
      const existing = documentIndex.get(document.pessoa_id) ?? [];
      existing.push(document);
      documentIndex.set(document.pessoa_id, existing);
    });

    const results: HistoricalPdfImportResult[] = [];
    for (const [index, entry] of entries.entries()) {
      onProgress?.(entry, index + 1, entries.length, 'checking', null);
      try {
        const hash = await hashHistoricalPdf(entry.file);
        const personDocuments = documentIndex.get(entry.person.id) ?? [];
        if (personDocuments.some((document) => document.hash_sha256 === hash)) {
          results.push({ key: entry.key, fileName: entry.relativePath, studentName: entry.person.nome, status: 'Já importado', message: 'O mesmo hash já está registrado para este aluno; o arquivo foi ignorado.' });
          continue;
        }
        const groupId = historicalPdfDocumentGroupId(entry.person.id, entry.relativePath);
        if (personDocuments.some((document) => document.grupo_documento_id === groupId)) {
          results.push({ key: entry.key, fileName: entry.relativePath, studentName: entry.person.nome, status: 'Conflito', message: 'Este subcaminho já possui um documento diferente. O arquivo não foi sobrescrito nem versionado.' });
          continue;
        }
        onProgress?.(entry, index + 1, entries.length, 'uploading', null);
        await documentService.uploadFile({
          file: entry.file,
          hash_sha256: hash,
          pessoa_id: entry.person.id,
          onProgress: (percent) => onProgress?.(entry, index + 1, entries.length, 'uploading', percent),
          usuario_id: null,
          tipo_documento: UNIFIED_DOCUMENT_TYPE,
          status: DocumentStatus.APROVADO,
          origem_cadastro: 'migracao',
          metodo_verificacao: 'nao_aplicavel',
          storage_area: 'oficiais',
          grupo_documento_id: groupId,
          versao: 1,
          esta_atual: true,
        });
        personDocuments.push({ hash_sha256: hash, grupo_documento_id: groupId });
        documentIndex.set(entry.person.id, personDocuments);
        results.push({ key: entry.key, fileName: entry.relativePath, studentName: entry.person.nome, status: 'Importado', message: 'Documento unificado enviado e registrado.' });
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : '';
        const knownPdfError = message.startsWith('O arquivo está vazio.') || message.startsWith('Não foi possível ler este arquivo.') || message.startsWith('O arquivo não contém uma assinatura PDF válida.');
        results.push({ key: entry.key, fileName: entry.relativePath, studentName: entry.person.nome, status: 'Erro', message: knownPdfError ? message : 'Não foi possível enviar ou registrar este arquivo. Verifique a conexão e tente novamente.' });
      }
    }
    return results;
  },
};
