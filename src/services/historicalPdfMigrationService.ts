import { supabase } from '../integrations/supabase/client';
import { DocumentStatus, type Documento, type Pessoa, type Turma } from '../types';
import { documentService } from './documentService';
import { serviceError } from './supabaseErrors';

export const UNIFIED_DOCUMENT_TYPE = 'Documento unificado';
export const MAX_HISTORICAL_FILE_BYTES = 20 * 1024 * 1024;

const historicalFileKinds = {
  pdf: { mimeType: 'application/pdf', extension: 'pdf' },
  jpeg: { mimeType: 'image/jpeg', extension: 'jpg' },
  png: { mimeType: 'image/png', extension: 'png' },
  webp: { mimeType: 'image/webp', extension: 'webp' },
} as const;

const officeFileKinds: Record<string, { mimeType: string }> = {
  doc: { mimeType: 'application/msword' },
  docx: { mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  xls: { mimeType: 'application/vnd.ms-excel' },
  xlsx: { mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
};

export type HistoricalPdfRosterPerson = Pick<Pessoa, 'id' | 'nome'>;
export type HistoricalPdfClass = Pick<Turma, 'id' | 'id_interno_escola'>;
export type HistoricalPdfImportEntry = { key: string; file: File; person: HistoricalPdfRosterPerson; relativePath: string };
export type HistoricalPdfImportResult = { key: string; fileName: string; studentName: string; status: 'Importado' | 'Já importado' | 'Conflito' | 'Erro'; message: string };

async function assertCanMigrateHistoricalPdfs() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('Sessão não autenticada. Faça login novamente.');
  const { data: isPrivileged, error: privilegeError } = await supabase.rpc('is_privileged_user');
  if (privilegeError) throw serviceError('Não foi possível validar a permissão de migração', privilegeError);
  if (isPrivileged !== true) throw new Error('A migração histórica de documentos é restrita a usuários autenticados com perfil Gestor ou Equipe.');
}

export type HistoricalNameMatchKind = 'exact' | 'partial' | 'scored' | 'ambiguous' | 'none';
export type HistoricalNameMatch = {
  kind: HistoricalNameMatchKind;
  /** Vencedor único quando a correspondência é conclusiva; candidatos prováveis quando é ambígua. */
  candidates: HistoricalPdfRosterPerson[];
  source: 'folder' | 'filename';
  /** Quantos nomes do caminho encontraram correspondente no melhor candidato. */
  score: number;
  /** Todo o roster da turma ordenado por pontuação, para orientar a escolha manual. */
  ranked: HistoricalPdfRosterPerson[];
};

const nameConnectives = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);

function nameTokens(value: string, stripExtension: boolean) {
  const name = stripExtension ? value.replace(/\.[^.]+$/, '') : value;
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/([a-z])(\d)/g, '$1 $2')
    .replace(/(\d)([a-z])/g, '$1 $2')
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3 && !/^\d+$/.test(token) && !nameConnectives.has(token));
}

function editDistance(first: string, second: string) {
  let previousRow = Array.from({ length: second.length + 1 }, (_, index) => index);
  for (let firstIndex = 1; firstIndex <= first.length; firstIndex += 1) {
    const currentRow = [firstIndex];
    for (let secondIndex = 1; secondIndex <= second.length; secondIndex += 1) {
      const substitutionCost = first[firstIndex - 1] === second[secondIndex - 1] ? 0 : 1;
      currentRow[secondIndex] = Math.min(
        (previousRow[secondIndex] ?? 0) + 1,
        (currentRow[secondIndex - 1] ?? 0) + 1,
        (previousRow[secondIndex - 1] ?? 0) + substitutionCost,
      );
    }
    previousRow = currentRow;
  }
  return previousRow[second.length] ?? 0;
}

/** Considera o mesmo nome quando difere em até uma letra (duas letras em nomes com 9+ caracteres). */
function tokenMatchesName(first: string, second: string) {
  if (first === second) return true;
  const shortest = Math.min(first.length, second.length);
  if (shortest < 5) return false;
  const tolerance = shortest >= 9 ? 2 : 1;
  if (Math.abs(first.length - second.length) > tolerance) return false;
  return editDistance(first, second) <= tolerance;
}

type NameCandidate = { person: HistoricalPdfRosterPerson; score: number; exactCount: number; allPresent: boolean; nameTokenCount: number };

function rankNameCandidates(name: string, roster: HistoricalPdfRosterPerson[], stripExtension: boolean): NameCandidate[] {
  const tokens = nameTokens(name, stripExtension);
  return roster.map((person) => {
    const personTokens = nameTokens(person.nome, false);
    let score = 0;
    let exactCount = 0;
    tokens.forEach((token) => {
      if (personTokens.includes(token)) {
        score += 1;
        exactCount += 1;
      } else if (personTokens.some((personToken) => tokenMatchesName(token, personToken))) {
        score += 1;
      }
    });
    return {
      person,
      score,
      exactCount,
      allPresent: tokens.length > 0 && score === tokens.length,
      nameTokenCount: tokens.length,
    };
  });
}

function orderCandidates(candidates: NameCandidate[]) {
  return candidates
    .slice()
    .sort((first, second) => second.score - first.score
      || second.exactCount - first.exactCount
      || first.person.nome.localeCompare(second.person.nome, 'pt-BR'));
}

function matchName(name: string, roster: HistoricalPdfRosterPerson[], stripExtension: boolean): Omit<HistoricalNameMatch, 'source'> {
  const candidates = rankNameCandidates(name, roster, stripExtension);
  const ranked = orderCandidates(candidates).map((candidate) => candidate.person);
  const complete = candidates.filter((candidate) => candidate.allPresent);
  if (complete.length === 1) {
    const [winner] = complete;
    const rosterTokenCount = nameTokens(winner.person.nome, false).length;
    return {
      kind: winner.nameTokenCount === rosterTokenCount ? 'exact' : 'partial',
      candidates: [winner.person],
      score: winner.score,
      ranked,
    };
  }
  if (complete.length > 1) {
    const ordered = orderCandidates(complete);
    return { kind: 'ambiguous', candidates: ordered.map((candidate) => candidate.person), score: ordered[0].score, ranked };
  }
  const topScore = candidates.reduce((highest, candidate) => Math.max(highest, candidate.score), 0);
  const best = candidates.filter((candidate) => candidate.score === topScore && topScore >= 2 && candidate.exactCount >= 1);
  if (best.length === 1) return { kind: 'scored', candidates: [best[0].person], score: topScore, ranked };
  if (best.length > 1) {
    const ordered = orderCandidates(best);
    return { kind: 'ambiguous', candidates: ordered.map((candidate) => candidate.person), score: topScore, ranked };
  }
  return { kind: 'none', candidates: [], score: topScore, ranked };
}

export function suggestedPersonForMatch(match: HistoricalNameMatch): HistoricalPdfRosterPerson | null {
  return match.kind === 'ambiguous' || match.kind === 'none' ? null : match.candidates[0] ?? null;
}

export function isPendingFolderName(folderName: string): boolean {
  const normalizedFolder = folderName
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
    .toLocaleLowerCase('pt-BR');
  return /^pendencia(?:s)?(?:\d+|[\s_-].*)?$/.test(normalizedFolder);
}

export function turmaNumberFromFolderName(folderName: string): number | null {
  const normalizedFolder = folderName
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase('pt-BR')
    .trim();
  const numericName = normalizedFolder.match(/^(\d{1,6})$/);
  if (numericName) return Number(numericName[1]);
  const turmaNumber = normalizedFolder.match(/turma\D{0,3}(\d{1,6})/);
  return turmaNumber ? Number(turmaNumber[1]) : null;
}

export function isEnrollmentFolderName(folderName: string): boolean {
  const normalizedFolder = folderName
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase('pt-BR');
  return normalizedFolder.includes('matricula');
}

export function matchPdfPath(relativePath: string, roster: HistoricalPdfRosterPerson[]): HistoricalNameMatch {
  const segments = relativePath.split('/').filter(Boolean);
  if (segments.length === 0) return { kind: 'none', candidates: [], source: 'filename', score: 0, ranked: roster };
  // A pasta do aluno tem prioridade; quando ela não corresponde a ninguém, o nome do arquivo decide.
  for (const segment of segments.slice(0, -1)) {
    const folderMatch = matchName(segment, roster, false);
    if (folderMatch.kind !== 'none') return { ...folderMatch, source: 'folder' };
  }
  return { ...matchName(segments[segments.length - 1] ?? '', roster, true), source: 'filename' };
}

async function detectHistoricalFile(file: File) {
  if (file.size === 0) throw new Error('O arquivo está vazio.');
  if (file.size > MAX_HISTORICAL_FILE_BYTES) throw new Error('O arquivo excede o limite de 20 MB.');
  let bytes: ArrayBuffer;
  try {
    bytes = await file.arrayBuffer();
  } catch (cause) {
    if (cause instanceof Error && cause.name === 'NotReadableError') {
      throw new Error('Não foi possível ler este arquivo. Verifique se ele continua disponível e tente selecioná-lo novamente.');
    }
    throw new Error('Não foi possível ler este arquivo. Tente selecioná-lo novamente.');
  }
  const content = new Uint8Array(bytes);
  const startsWith = (signature: number[], offset = 0) => signature.every((byte, index) => content[offset + index] === byte);
  const isPdf = new TextDecoder().decode(content.subarray(0, 5)) === '%PDF-';
  const kind = isPdf ? 'pdf'
    : startsWith([0xff, 0xd8, 0xff]) ? 'jpeg'
      : startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) ? 'png'
        : startsWith([0x52, 0x49, 0x46, 0x46]) && new TextDecoder().decode(content.subarray(8, 12)) === 'WEBP' ? 'webp'
          : null;
  const originalName = file.name;
  const extensionIndex = originalName.lastIndexOf('.');
  const baseName = extensionIndex > 0 ? originalName.slice(0, extensionIndex) : originalName;
  const currentExtension = extensionIndex > 0 ? originalName.slice(extensionIndex + 1).toLocaleLowerCase('pt-BR') : '';
  let mimeType: string;
  let fileName: string;
  if (kind) {
    const detected = historicalFileKinds[kind];
    const extensionMatches = kind === 'jpeg' ? currentExtension === 'jpg' || currentExtension === 'jpeg' : currentExtension === detected.extension;
    fileName = extensionMatches && baseName ? originalName : `${baseName || 'documento'}.${detected.extension}`;
    mimeType = detected.mimeType;
  } else {
    const isOle2 = startsWith([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
    const isZip = startsWith([0x50, 0x4b, 0x03, 0x04]);
    const officeKind = officeFileKinds[currentExtension];
    if ((!isOle2 && !isZip) || !officeKind) {
      throw new Error('O arquivo não contém uma assinatura válida de PDF, JPG, JPEG, PNG, WEBP, DOC, DOCX, XLS ou XLSX.');
    }
    mimeType = officeKind.mimeType;
    fileName = originalName;
  }
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  return { hash, mimeType, fileName };
}

export function historicalPdfDocumentGroupId(turmaId: string, personId: string, relativePath: string) {
  const normalizedPath = relativePath.normalize('NFC').replace(/\\/g, '/').toLocaleLowerCase('pt-BR');
  return `historico-pdf:${turmaId}:${personId}:${encodeURIComponent(normalizedPath)}`;
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

async function getUnifiedDocumentsForValidatedPeople(personIds: string[], turmaId: string): Promise<Documento[]> {
  if (personIds.length === 0) return [];
  const { data, error } = await supabase
    .from('documentos')
    .select('*')
    .in('pessoa_id', personIds)
    .eq('tipo_documento', UNIFIED_DOCUMENT_TYPE)
    .eq('turma_id', turmaId);
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

  getClassByInternalId: async (internalId: number): Promise<HistoricalPdfClass | null> => {
    await assertCanMigrateHistoricalPdfs();
    if (!Number.isSafeInteger(internalId) || internalId <= 0) return null;
    const { data, error } = await supabase
      .from('turmas')
      .select('id, id_interno_escola')
      .eq('id_interno_escola', internalId)
      .maybeSingle();
    if (error) throw serviceError('Não foi possível localizar a turma pelo ID interno', error);
    return (data ?? null) as HistoricalPdfClass | null;
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
    const documents = await getUnifiedDocumentsForValidatedPeople(selectedPersonIds, turmaId);
    const { data: documentsAcrossClasses, error: reuseQueryError } = await supabase
      .from('documentos')
      .select('pessoa_id, hash_sha256, url_armazenamento, storage_area')
      .in('pessoa_id', selectedPersonIds)
      .eq('tipo_documento', UNIFIED_DOCUMENT_TYPE)
      .not('turma_id', 'is', null)
      .not('url_armazenamento', 'is', null)
      .not('storage_area', 'is', null);
    if (reuseQueryError) throw serviceError('Não foi possível localizar arquivos armazenados em outras turmas', reuseQueryError);

    const documentIndex = new Map<string, Array<Pick<Documento, 'hash_sha256' | 'grupo_documento_id'>>>();
    documents.forEach((document) => {
      const existing = documentIndex.get(document.pessoa_id) ?? [];
      existing.push(document);
      documentIndex.set(document.pessoa_id, existing);
    });
    const reusableStorage = new Map<string, { url_armazenamento: string; storage_area: 'temporarios' | 'oficiais' }>();
    (documentsAcrossClasses ?? []).forEach((document) => {
      if (!document.pessoa_id || !document.hash_sha256 || !document.url_armazenamento) return;
      if (document.storage_area !== 'temporarios' && document.storage_area !== 'oficiais') return;
      const key = `${document.pessoa_id}:${document.hash_sha256}`;
      if (!reusableStorage.has(key)) {
        reusableStorage.set(key, {
          url_armazenamento: document.url_armazenamento,
          storage_area: document.storage_area,
        });
      }
    });

    const results: HistoricalPdfImportResult[] = [];
    for (const [index, entry] of entries.entries()) {
      onProgress?.(entry, index + 1, entries.length, 'checking', null);
      try {
        const detected = await detectHistoricalFile(entry.file);
        const { hash } = detected;
        const personDocuments = documentIndex.get(entry.person.id) ?? [];
        if (personDocuments.some((document) => document.hash_sha256 === hash)) {
          results.push({ key: entry.key, fileName: entry.relativePath, studentName: entry.person.nome, status: 'Já importado', message: 'O mesmo arquivo já está registrado para este aluno nesta turma; o registro foi ignorado.' });
          continue;
        }
        const groupId = historicalPdfDocumentGroupId(turmaId, entry.person.id, entry.relativePath);
        if (personDocuments.some((document) => document.grupo_documento_id === groupId)) {
          results.push({ key: entry.key, fileName: entry.relativePath, studentName: entry.person.nome, status: 'Conflito', message: 'Este subcaminho já possui um documento diferente. O arquivo não foi sobrescrito nem versionado.' });
          continue;
        }
        onProgress?.(entry, index + 1, entries.length, 'uploading', null);
        const sharedMetadata = {
          pessoa_id: entry.person.id,
          usuario_id: null,
          turma_id: turmaId,
          tipo_documento: UNIFIED_DOCUMENT_TYPE,
          hash_sha256: hash,
          arquivo_nome: detected.fileName,
          status: DocumentStatus.APROVADO,
          origem_cadastro: 'migracao' as const,
          metodo_verificacao: 'nao_aplicavel' as const,
          grupo_documento_id: groupId,
          versao: 1,
          esta_atual: true,
        };
        const reusable = reusableStorage.get(`${entry.person.id}:${hash}`);
        const createdDocument = reusable
          ? await documentService.create({
            ...sharedMetadata,
            url_armazenamento: reusable.url_armazenamento,
            storage_area: reusable.storage_area,
          })
          : await documentService.uploadFile({
            file: new File([entry.file], detected.fileName, { type: detected.mimeType }),
            ...sharedMetadata,
            onProgress: (percent) => onProgress?.(entry, index + 1, entries.length, 'uploading', percent),
            storage_area: 'oficiais',
          });
        personDocuments.push({ hash_sha256: hash, grupo_documento_id: groupId });
        documentIndex.set(entry.person.id, personDocuments);
        if (createdDocument.url_armazenamento && (createdDocument.storage_area === 'temporarios' || createdDocument.storage_area === 'oficiais')) {
          reusableStorage.set(`${entry.person.id}:${hash}`, {
            url_armazenamento: createdDocument.url_armazenamento,
            storage_area: createdDocument.storage_area,
          });
        }
        results.push({ key: entry.key, fileName: entry.relativePath, studentName: entry.person.nome, status: 'Importado', message: 'Documento unificado enviado e registrado.' });
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : '';
        const knownPdfError = message.startsWith('O arquivo está vazio.') || message.startsWith('O arquivo excede o limite de ') || message.startsWith('Não foi possível ler este arquivo.') || message.startsWith('O arquivo não contém uma assinatura válida');
        results.push({ key: entry.key, fileName: entry.relativePath, studentName: entry.person.nome, status: 'Erro', message: knownPdfError ? message : 'Não foi possível enviar ou registrar este arquivo. Verifique a conexão e tente novamente.' });
      }
    }
    return results;
  },
};
