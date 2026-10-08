import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent, type KeyboardEvent, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, ChevronRight, FileText, LoaderCircle, RotateCcw, Search, UploadCloud, X } from 'lucide-react';
import { historicalPdfMigrationService, isEnrollmentFolderName, isPendingFolderName, matchPdfPath, MAX_HISTORICAL_FILE_BYTES, suggestedPersonForMatch, turmaNumberFromFolderName, type HistoricalPdfClass, type HistoricalPdfImportEntry, type HistoricalPdfRosterPerson } from '../services/historicalPdfMigrationService';
import type { UserRole } from '../types';
import { useUIStore } from '../store/uiStore';

type DraftFile = { key: string; file: File; path: string; excluded: boolean };
type PathMatch = ReturnType<typeof matchPdfPath>;
type PreviewData = {
  matches: Record<string, PathMatch>;
  automaticAssignments: Record<string, string | null>;
};
type FileResult = { key: string; fileName: string; studentName: string; status: string; message: string };
type ImportProgress = { classLabel: string; classIndex: number; classTotal: number; fileName: string; index: number; total: number; stage: 'checking' | 'uploading'; percent: number | null };
type ClassBatch = {
  turma: HistoricalPdfClass;
  roster: HistoricalPdfRosterPerson[];
  folderName: string;
  files: DraftFile[];
  validationStatus: string;
  validationErrors: string[];
  preview: PreviewData | null;
  previewStatus: string;
  previewError: string;
  manualAssignments: Record<string, string>;
  results: FileResult[] | null;
  importError: string;
};
type FileState = { label: string; message: string; person: HistoricalPdfRosterPerson | null; blocked: boolean };

const MAX_CLASSES = 20;

type DropOutcome = { folderName: string; status: 'adicionada' | 'ignorada' | 'erro'; message: string };

function readAllDirectoryEntries(entry: FileSystemDirectoryEntry): Promise<FileSystemEntry[]> {
  const reader = entry.createReader();
  const entries: FileSystemEntry[] = [];
  const readNextBatch = (): Promise<FileSystemEntry[]> => new Promise((resolve, reject) => {
    reader.readEntries((batch) => resolve(batch), reject);
  });
  return (async () => {
    while (true) {
      const batch = await readNextBatch();
      if (batch.length === 0) return entries;
      entries.push(...batch);
    }
  })();
}

function getFileFromEntry(entry: FileSystemFileEntry): Promise<File> {
  return new Promise((resolve, reject) => entry.file(resolve, reject));
}

async function findEnrollmentDirectory(entry: FileSystemDirectoryEntry, depth = 0): Promise<FileSystemDirectoryEntry | null> {
  if (depth >= 8) return null;
  const children = await readAllDirectoryEntries(entry);
  const directEnrollment = children.find((child): child is FileSystemDirectoryEntry => child.isDirectory && isEnrollmentFolderName(child.name));
  if (directEnrollment) return directEnrollment;
  for (const child of children) {
    if (!child.isDirectory) continue;
    const enrollment = await findEnrollmentDirectory(child as FileSystemDirectoryEntry, depth + 1);
    if (enrollment) return enrollment;
  }
  return null;
}

async function readDirectoryFiles(entry: FileSystemDirectoryEntry, prefix: string, unreadable: string[] = []): Promise<{ file: File; path: string }[]> {
  const collected: { file: File; path: string }[] = [];
  for (const child of await readAllDirectoryEntries(entry)) {
    const path = `${prefix}/${child.name}`;
    if (child.isFile) {
      try {
        collected.push({ file: await getFileFromEntry(child as FileSystemFileEntry), path });
      } catch {
        unreadable.push(path);
      }
    } else if (child.isDirectory) {
      collected.push(...await readDirectoryFiles(child as FileSystemDirectoryEntry, path, unreadable));
    }
  }
  return collected;
}

function classLabel(turma: HistoricalPdfClass) {
  return `Turma · ID interno ${turma.id_interno_escola}`;
}

function hasSupportedExtension(file: File) {
  return /\.(pdf|jpe?g|png|webp|docx?|xlsx?)$/i.test(file.name);
}

function describeMatch(match: PathMatch) {
  const scope = match.source === 'folder' ? 'Pasta' : 'Arquivo';
  if (match.kind === 'exact') return `${scope}: todos os nomes conferem`;
  if (match.kind === 'partial') return `${scope}: nomes conferem — o aluno tem nomes a mais`;
  if (match.kind === 'scored') return `${scope}: correspondência aproximada — ${match.score} nome(s) em comum`;
  if (match.kind === 'ambiguous') return 'Ambíguo — vários candidatos';
  return 'Sem correspondência';
}

function assignedPerson(batch: ClassBatch, draft: DraftFile) {
  if (Object.prototype.hasOwnProperty.call(batch.manualAssignments, draft.key)) return batch.manualAssignments[draft.key] || null;
  return batch.preview?.automaticAssignments[draft.key] ?? null;
}

function getFileState(batch: ClassBatch, draft: DraftFile): FileState {
  if (draft.excluded) return { label: 'Fora do lote', message: 'Excluído explicitamente pelo operador.', person: null, blocked: true };
  const personId = assignedPerson(batch, draft);
  const match = batch.preview?.matches[draft.key];
  if (!personId) {
    const ambiguity = match?.kind === 'ambiguous';
    return { label: ambiguity ? 'Correspondência ambígua' : 'Sem correspondência', message: ambiguity ? 'Escolha explicitamente um aluno desta turma ou exclua este arquivo.' : 'Selecione explicitamente um aluno desta turma ou exclua este arquivo.', person: null, blocked: true };
  }
  const person = batch.roster.find((candidate) => candidate.id === personId) ?? null;
  if (!person) return { label: 'Aluno inválido', message: 'O aluno escolhido não pertence ao roster desta turma.', person: null, blocked: true };
  return { label: 'Correspondência pronta', message: 'A associação foi revisada. A assinatura, o hash, as duplicidades e os conflitos serão verificados antes do envio após a confirmação.', person, blocked: false };
}

// O vínculo com o aluno é o que separa a conciliação em duas listas: arquivos
// com aluno vinculado (tudo certo) e arquivos sem vínculo (pendência que exige
// escolha manual). Marcar "Fora do lote" não muda a lista em que o arquivo está.
function linkedPersonFor(batch: ClassBatch, draft: DraftFile) {
  const personId = assignedPerson(batch, draft);
  if (!personId) return null;
  return batch.roster.find((candidate) => candidate.id === personId) ?? null;
}

function Accordion({ title, count, defaultOpen, children }: { title: string; count: number; defaultOpen?: boolean; children: ReactNode }) {
  return (
    <details open={defaultOpen} className="group mb-4 rounded-lg border border-slate-200 dark:border-slate-700">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg px-4 py-3 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 dark:text-slate-100 [&::-webkit-details-marker]:hidden">
        <ChevronRight className="h-4 w-4 shrink-0 transition-transform group-open:rotate-90" aria-hidden="true" />
        {title}
        <span className="font-normal text-slate-500 dark:text-slate-400">· {count}</span>
      </summary>
      <div className="px-4 pb-4">{children}</div>
    </details>
  );
}

function ConciliationTable({ batch, files, running, updateBatch }: {
  batch: ClassBatch;
  files: DraftFile[];
  running: boolean;
  updateBatch: (turmaId: string, change: (batch: ClassBatch) => ClassBatch) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
      <table className="min-w-[900px] text-left text-xs">
        <caption className="sr-only">Conciliação de documentos somente contra o roster de {classLabel(batch.turma)}</caption>
        <thead className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"><tr><th className="px-3 py-2">Arquivo (assinatura e hash na confirmação)</th><th className="px-3 py-2">Correspondência desta turma</th><th className="px-3 py-2">Associar ao aluno</th><th className="px-3 py-2">Resultado previsto</th><th className="px-3 py-2">Incluir</th></tr></thead>
        <tbody>{files.map((draft) => {
          const match = batch.preview!.matches[draft.key];
          const state = getFileState(batch, draft);
          const matchLabel = describeMatch(match);
          const assigned = assignedPerson(batch, draft) ?? '';
          return <tr key={draft.key} className="border-t border-slate-200 align-top dark:border-slate-800"><td className="max-w-xs break-all px-3 py-3"><strong className="flex items-center gap-1"><FileText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />{draft.path}</strong></td><td className="px-3 py-3"><strong>{matchLabel}</strong>{match.candidates.length > 0 && <ul className="mt-1 list-disc pl-4 text-slate-500">{match.candidates.map((person) => <li key={person.id}>{person.nome} · {person.id}</li>)}</ul>}</td><td className="px-3 py-3"><label className="sr-only" htmlFor={`student-${draft.key}`}>Associar {draft.path} ao aluno de {classLabel(batch.turma)}</label><select id={`student-${draft.key}`} value={assigned} onChange={(event) => updateBatch(batch.turma.id, (current) => ({ ...current, manualAssignments: { ...current.manualAssignments, [draft.key]: event.target.value } }))} disabled={draft.excluded || running} className="max-w-xs rounded border border-slate-300 bg-white px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950"><option value="">Não associar — selecionar aluno</option>{match.ranked.map((person) => <option key={person.id} value={person.id}>{person.nome} · {person.id}</option>)}</select></td><td className="max-w-xs px-3 py-3"><strong className={state.blocked ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'}>{state.label}</strong><p className="mt-1 whitespace-normal">{state.message}</p></td><td className="px-3 py-3"><label className="inline-flex items-center gap-2"><input type="checkbox" checked={!draft.excluded} onChange={(event) => updateBatch(batch.turma.id, (current) => ({ ...current, files: current.files.map((item) => item.key === draft.key ? { ...item, excluded: !event.target.checked } : item) }))} disabled={running} className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-500" /><span>{draft.excluded ? 'Fora' : 'Sim'}</span></label></td></tr>;
        })}</tbody>
      </table>
    </div>
  );
}

export default function HistoricalPdfMigrationPanel() {
  const user = useUIStore((state) => state.userLogged);
  const role = user?.role as UserRole | undefined;
  const authorized = role === 'GESTOR' || role === 'EQUIPE';
  const [classSearch, setClassSearch] = useState('');
  const [debouncedClassSearch, setDebouncedClassSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState<HistoricalPdfClass | null>(null);
  const [classPickerOpen, setClassPickerOpen] = useState(false);
  const [activeClassIndex, setActiveClassIndex] = useState(-1);
  const classSearchInputRef = useRef<HTMLInputElement>(null);
  const nextFileKeyRef = useRef(0);
  const [batches, setBatches] = useState<ClassBatch[]>([]);
  const [dropActive, setDropActive] = useState(false);
  const [dropping, setDropping] = useState(false);
  const [dropStatus, setDropStatus] = useState('');
  const [dropOutcomes, setDropOutcomes] = useState<DropOutcome[]>([]);
  const [addingClass, setAddingClass] = useState(false);
  const [validatingClassId, setValidatingClassId] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [running, setRunning] = useState(false);
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
  const [globalError, setGlobalError] = useState('');
  const [globalStatus, setGlobalStatus] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedClassSearch(classSearch), 300);
    return () => window.clearTimeout(timer);
  }, [classSearch]);

  const classesQuery = useQuery({
    queryKey: ['historical-pdf-migration', 'classes', debouncedClassSearch],
    queryFn: () => historicalPdfMigrationService.searchClasses(debouncedClassSearch),
    enabled: authorized && classPickerOpen && Boolean(debouncedClassSearch),
    retry: false,
  });
  const classOptions = classesQuery.data ?? [];
  const searchIsCurrent = classSearch === debouncedClassSearch && Boolean(classSearch);

  useEffect(() => {
    setActiveClassIndex(-1);
  }, [debouncedClassSearch, classesQuery.data]);

  const updateBatch = (turmaId: string, change: (batch: ClassBatch) => ClassBatch) => {
    setBatches((current) => current.map((batch) => batch.turma.id === turmaId ? change(batch) : batch));
  };

  const chooseClass = (turma: HistoricalPdfClass) => {
    setSelectedClass(turma);
    setClassSearch('');
    setClassPickerOpen(false);
    setActiveClassIndex(-1);
    classSearchInputRef.current?.blur();
  };

  const addSelectedClass = async () => {
    if (!selectedClass || addingClass || validatingClassId || batches.length >= MAX_CLASSES || batches.some((batch) => batch.turma.id === selectedClass.id)) return;
    setAddingClass(true);
    setGlobalError('');
    try {
      const roster = await historicalPdfMigrationService.getRoster(selectedClass.id);
      setBatches((current) => {
        if (current.length >= MAX_CLASSES || current.some((batch) => batch.turma.id === selectedClass.id)) return current;
        return [...current, {
          turma: selectedClass,
          roster,
          folderName: '',
          files: [],
          validationStatus: '',
          validationErrors: [],
          preview: null,
          previewStatus: '',
          previewError: '',
          manualAssignments: {},
          results: null,
          importError: '',
        }];
      });
      setSelectedClass(null);
    } catch (cause) {
      setGlobalError(cause instanceof Error ? cause.message : 'Não foi possível carregar o roster da turma.');
    } finally {
      setAddingClass(false);
    }
  };

  const handleClassPickerKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const currentOptions = searchIsCurrent ? classOptions : [];
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setClassPickerOpen(true);
      setActiveClassIndex((index) => Math.min(index + 1, currentOptions.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveClassIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter' && classPickerOpen && currentOptions[activeClassIndex]) {
      event.preventDefault();
      chooseClass(currentOptions[activeClassIndex]);
    } else if (event.key === 'Escape') {
      setClassPickerOpen(false);
      setActiveClassIndex(-1);
    }
  };

  const handleFolder = async (turmaId: string, event: ChangeEvent<HTMLInputElement>) => {
    const files: File[] = event.target.files ? Array.from(event.target.files) : [];
    event.target.value = '';
    if (files.length === 0 || validatingClassId || running || preparing) return;
    const folderName = (files[0] as File & { webkitRelativePath?: string }).webkitRelativePath?.split('/')[0] ?? 'Pasta selecionada';
    const pendingRoot = isPendingFolderName(folderName);
    setValidatingClassId(turmaId);
    updateBatch(turmaId, (batch) => ({ ...batch, folderName, files: [], validationStatus: `Verificando nome e tamanho de ${files.length} entrada(s)…`, validationErrors: [], preview: null, previewStatus: '', previewError: '', manualAssignments: {}, results: null, importError: '' }));
    const accepted: DraftFile[] = [];
    const errors: string[] = [];
    let pendingCount = 0;
    try {
      await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
      for (const [index, file] of files.entries()) {
        const selectedPath = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
        const path = selectedPath.includes('/') ? selectedPath.split('/').slice(1).join('/') : selectedPath;
        if (pendingRoot || path.split('/').some(isPendingFolderName)) {
          pendingCount += 1;
          continue;
        }
        if ((index + 1) % 100 === 0 || index + 1 === files.length) {
          updateBatch(turmaId, (batch) => ({ ...batch, validationStatus: `Verificando entrada ${index + 1} de ${files.length}: ${path}` }));
          await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
        }
        if (!hasSupportedExtension(file)) {
          errors.push(`Ignorado: “${path}” não possui extensão PDF, JPG, JPEG, PNG, WEBP, DOC, DOCX, XLS ou XLSX.`);
          continue;
        }
        if (file.size === 0) {
          errors.push(`Rejeitado: “${path}” está vazio.`);
          continue;
        }
        if (file.size > MAX_HISTORICAL_FILE_BYTES) {
          errors.push(`Rejeitado: “${path}” excede o limite de 20 MB.`);
          continue;
        }
        accepted.push({ key: `${turmaId}:${nextFileKeyRef.current++}`, file, path, excluded: false });
      }
      updateBatch(turmaId, (batch) => ({
        ...batch,
        files: accepted,
        validationErrors: errors,
        validationStatus: `Seleção concluída: ${accepted.length} arquivo(s) não vazio(s) de ${files.length} entrada(s).${pendingCount > 0 ? ` ${pendingCount} arquivo(s) de pasta(s) de pendências foram desconsiderados automaticamente.` : ''} A assinatura será verificada na confirmação.`,
      }));
    } finally {
      setValidatingClassId(null);
    }
  };

  const handleFolderDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDropActive(false);
    if (running || preparing || validatingClassId !== null || dropping || addingClass) return;
    const directories = Array.from(event.dataTransfer.items)
      .map((item) => (item as DataTransferItem & { webkitGetAsEntry?: () => FileSystemEntry | null }).webkitGetAsEntry?.() ?? null)
      .filter((entry): entry is FileSystemDirectoryEntry => Boolean(entry?.isDirectory));
    if (directories.length === 0) {
      setDropStatus('Solte pastas de turma, não arquivos individuais.');
      setDropOutcomes([]);
      return;
    }
    setDropping(true);
    setDropOutcomes([]);
    setDropStatus('Lendo as pastas selecionadas…');
    const existing = batches;
    const created: ClassBatch[] = [];
    const outcomes: DropOutcome[] = [];
    try {
      for (const [index, directory] of directories.entries()) {
        setDropStatus(`Lendo a pasta ${index + 1} de ${directories.length}: ${directory.name}…`);
        try {
          const turmaNumber = turmaNumberFromFolderName(directory.name);
          if (turmaNumber === null) {
            outcomes.push({ folderName: directory.name, status: 'erro', message: 'Não foi possível identificar o número da turma no nome da pasta. Solte a pasta da turma (ex.: “TURMA 78”), não a pasta-pai.' });
            continue;
          }
          if ([...existing, ...created].some((batch) => batch.turma.id_interno_escola === turmaNumber)) {
            outcomes.push({ folderName: directory.name, status: 'ignorada', message: `A turma ${turmaNumber} já está na fila desta migração.` });
            continue;
          }
          if (existing.length + created.length >= MAX_CLASSES) {
            outcomes.push({ folderName: directory.name, status: 'ignorada', message: `Limite de ${MAX_CLASSES} turmas por migração atingido.` });
            continue;
          }
          const enrollment = await findEnrollmentDirectory(directory);
          if (!enrollment) {
            outcomes.push({ folderName: directory.name, status: 'ignorada', message: 'Pasta de matrícula dos alunos não encontrada nesta pasta de turma; nenhum arquivo foi considerado.' });
            continue;
          }
          const unreadable: string[] = [];
          const files = await readDirectoryFiles(enrollment, enrollment.name, unreadable);
          const turma = await historicalPdfMigrationService.getClassByInternalId(turmaNumber);
          if (!turma) {
            outcomes.push({ folderName: directory.name, status: 'ignorada', message: `Turma ${turmaNumber} não encontrada no sistema; nenhum arquivo foi considerado.` });
            continue;
          }
          const roster = await historicalPdfMigrationService.getRoster(turma.id);
          const pendingRoot = isPendingFolderName(enrollment.name);
          const accepted: DraftFile[] = [];
          const errors: string[] = [];
          let pendingCount = 0;
          for (const { file, path: fullPath } of files) {
            const path = fullPath.split('/').slice(1).join('/');
            if (pendingRoot || fullPath.split('/').some(isPendingFolderName)) {
              pendingCount += 1;
              continue;
            }
            if (!hasSupportedExtension(file)) {
              errors.push(`Ignorado: “${path}” não possui extensão PDF, JPG, JPEG, PNG, WEBP, DOC, DOCX, XLS ou XLSX.`);
              continue;
            }
            if (file.size === 0) {
              errors.push(`Rejeitado: “${path}” está vazio.`);
              continue;
            }
            if (file.size > MAX_HISTORICAL_FILE_BYTES) {
              errors.push(`Rejeitado: “${path}” excede o limite de 20 MB.`);
              continue;
            }
            accepted.push({ key: `${turma.id}:${nextFileKeyRef.current++}`, file, path, excluded: false });
          }
          unreadable.forEach((unreadablePath) => {
            errors.push(`Não foi possível ler “${unreadablePath.split('/').slice(1).join('/')}”. O arquivo pode estar em uso, indisponível ou protegido; ele não foi considerado.`);
          });
          created.push({
            turma,
            roster,
            folderName: enrollment.name,
            files: accepted,
            validationStatus: `Pasta de matrícula “${enrollment.name}” localizada em ${directory.name}: ${accepted.length} arquivo(s) considerados de ${files.length + unreadable.length} encontrado(s).${unreadable.length > 0 ? ` ${unreadable.length} arquivo(s) não puderam ser lidos.` : ''}${pendingCount > 0 ? ` ${pendingCount} arquivo(s) de pasta(s) de pendências foram desconsiderados automaticamente.` : ''} A assinatura será verificada na confirmação.`,
            validationErrors: errors,
            preview: null,
            previewStatus: '',
            previewError: '',
            manualAssignments: {},
            results: null,
            importError: '',
          });
          outcomes.push({ folderName: directory.name, status: 'adicionada', message: `Turma ${turmaNumber} · ${accepted.length} arquivo(s) prontos para prévia.` });
        } catch (cause) {
          outcomes.push({ folderName: directory.name, status: 'erro', message: cause instanceof Error ? cause.message : 'Não foi possível processar esta pasta.' });
        }
      }
      setBatches((current) => [...current, ...created]);
      setDropOutcomes(outcomes);
      const added = outcomes.filter((outcome) => outcome.status === 'adicionada').length;
      const ignored = outcomes.filter((outcome) => outcome.status === 'ignorada').length;
      const failed = outcomes.filter((outcome) => outcome.status === 'erro').length;
      setDropStatus(`${added} turma(s) adicionada(s), ${ignored} ignorada(s) e ${failed} com erro. Confira os detalhes abaixo.`);
    } finally {
      setDropping(false);
    }
  };

  const prepareBatchPreview = async (batch: ClassBatch) => {
    if (batch.files.length === 0) return;
    updateBatch(batch.turma.id, (current) => ({ ...current, preview: null, previewError: '', results: null, importError: '' }));
    try {
      updateBatch(batch.turma.id, (current) => ({ ...current, previewStatus: 'Correspondendo nomes dos arquivos somente ao roster desta turma…' }));
      await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
      const matches = Object.fromEntries(batch.files.map((draft) => [draft.key, matchPdfPath(draft.path, batch.roster)])) as Record<string, PathMatch>;
      const automaticAssignments: Record<string, string | null> = {};
      batch.files.forEach((draft) => {
        automaticAssignments[draft.key] = suggestedPersonForMatch(matches[draft.key])?.id ?? null;
      });
      updateBatch(batch.turma.id, (current) => ({
        ...current,
        preview: { matches, automaticAssignments },
        previewStatus: 'Prévia concluída. Nenhum arquivo foi enviado.',
      }));
      return true;
    } catch (cause) {
      updateBatch(batch.turma.id, (current) => ({ ...current, previewStatus: 'A prévia não pôde ser concluída.', previewError: cause instanceof Error ? cause.message : 'Não foi possível gerar a prévia.' }));
      return false;
    }
  };

  const importableCount = (batch: ClassBatch) => {
    if (!batch.preview) return 0;
    return batch.files.filter((draft) => !getFileState(batch, draft).blocked).length;
  };
  const batchReady = (batch: ClassBatch) => Boolean(batch.preview && importableCount(batch) > 0 && !batch.results);

  const runOneBatch = async (batch: ClassBatch, classIndex: number, classTotal: number) => {
    const entries: HistoricalPdfImportEntry[] = [];
    const fileResults: FileResult[] = [];
    batch.files.forEach((draft) => {
      const state = getFileState(batch, draft);
      if (draft.excluded || state.blocked || !state.person) {
        fileResults.push({ key: draft.key, fileName: draft.path, studentName: state.person?.nome ?? 'Não associado', status: draft.excluded ? 'Ignorado' : state.label, message: state.message });
        return;
      }
      entries.push({ key: draft.key, file: draft.file, person: state.person, relativePath: draft.path });
    });
    updateBatch(batch.turma.id, (current) => ({ ...current, results: null, importError: '' }));
    const importedResults = await historicalPdfMigrationService.importBatch(batch.turma.id, entries, (entry, index, total, stage, percent) => {
      setImportProgress({ classLabel: classLabel(batch.turma), classIndex, classTotal, fileName: entry.relativePath, index, total, stage, percent });
    });
    fileResults.push(...importedResults);
    const resultByKey = new Map(fileResults.map((result) => [result.key, result]));
    const orderedResults = batch.files.map((draft) => resultByKey.get(draft.key)!).filter(Boolean);
    updateBatch(batch.turma.id, (current) => ({ ...current, results: orderedResults }));
    setImportProgress(null);
    return orderedResults;
  };

  const executeImport = async (targetBatches: ClassBatch[]) => {
    if (running || targetBatches.length === 0) return;
    setRunning(true);
    setGlobalError('');
    setGlobalStatus(`Iniciando importação sequencial de ${targetBatches.length} turma(s)…`);
    let importedCount = 0;
    let failedClasses = 0;
    let failedFiles = 0;
    try {
      for (const [index, batch] of targetBatches.entries()) {
        setGlobalStatus(`Turma ${index + 1} de ${targetBatches.length}: processando ${classLabel(batch.turma)}. Os arquivos são enviados sequencialmente.`);
        try {
          const results = await runOneBatch(batch, index + 1, targetBatches.length);
          importedCount += results.filter((result) => result.status === 'Importado').length;
          failedFiles += results.filter((result) => result.status === 'Erro').length;
        } catch (cause) {
          failedClasses += 1;
          updateBatch(batch.turma.id, (current) => ({ ...current, importError: cause instanceof Error ? cause.message : 'Não foi possível concluir a importação desta turma.' }));
        }
      }
      const failures = failedClasses + failedFiles;
      if (failures > 0 && importedCount > 0) {
        setGlobalStatus(`Importação parcial: ${importedCount} arquivo(s) importado(s), ${failedFiles} falha(s) em arquivo(s) e ${failedClasses} falha(s) de turma. Confira os resultados individuais.`);
      } else if (failures > 0) {
        setGlobalStatus(`Falha na importação: nenhum arquivo foi importado; ${failedFiles} falha(s) em arquivo(s) e ${failedClasses} falha(s) de turma. Confira os resultados individuais.`);
      } else {
        setGlobalStatus(`Importação concluída: ${importedCount} arquivo(s) importado(s). Confira os itens ignorados ou em conflito nos resultados individuais.`);
      }
    } finally {
      setRunning(false);
      setImportProgress(null);
    }
  };

  const generateAllPreviews = async () => {
    const eligible = batches.filter((batch) => batch.files.length > 0 && !batch.results);
    if (preparing || running || eligible.length === 0 || batches.some((batch) => batch.folderName === '')) return;
    setPreparing(true);
    setGlobalError('');
    setGlobalStatus(`Gerando prévias independentes para ${eligible.length} turma(s)…`);
    try {
      let failedPreviews = 0;
      for (const [index, batch] of eligible.entries()) {
        setGlobalStatus(`Prévia ${index + 1} de ${eligible.length}: ${classLabel(batch.turma)}. Correspondência somente por caminhos e roster.`);
        if (!await prepareBatchPreview(batch)) failedPreviews += 1;
      }
      setGlobalStatus(failedPreviews > 0
        ? `Prévia parcial: ${eligible.length - failedPreviews} turma(s) concluída(s) e ${failedPreviews} falha(s). Revise os erros por turma antes de continuar.`
        : 'Geração de prévias concluída. Revise cada turma antes de confirmar qualquer importação.');
    } finally {
      setPreparing(false);
    }
  };

  const readyBatches = useMemo(() => batches.filter(batchReady), [batches]);
  const batchesWithoutFolder = batches.filter((batch) => batch.folderName === '');
  const batchesWithoutDocuments = batches.filter((batch) => batch.folderName !== '' && batch.files.length === 0);
  const hasPreviewCandidates = batches.some((batch) => batch.files.length > 0 && !batch.results);
  const hasFinishedResults = batches.some((batch) => batch.results !== null);
  const hasPendingWork = batches.some((batch) => batch.results === null && batch.files.length > 0);
  const canStartNewMigration = batches.length > 0 && hasFinishedResults && !hasPendingWork && !running && !preparing;
  const totalImported = batches.reduce((sum, batch) => sum + (batch.results?.filter((result) => result.status === 'Importado').length ?? 0), 0);

  const startNewMigration = () => {
    setBatches([]);
    setDropOutcomes([]);
    setDropStatus('');
    setDropActive(false);
    setSelectedClass(null);
    setClassSearch('');
    setDebouncedClassSearch('');
    setClassPickerOpen(false);
    setActiveClassIndex(-1);
    setGlobalError('');
    setGlobalStatus('');
    setImportProgress(null);
    nextFileKeyRef.current = 0;
  };

  if (!authorized) return <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">A migração histórica de documentos é restrita a usuários autenticados com perfil Gestor ou Equipe.</p>;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-600 dark:text-teal-400">Importação documental controlada</p>
        <h1 className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-white">Migração histórica de documentos</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-400">Arraste várias pastas de turma para localizar automaticamente a pasta de matrícula dos alunos (ex.: “2 - MATRICULA DO ALUNOS”, “Arqv 1-DOCs MATRÍCULA”) ou adicione até dez turmas pela busca. São aceitos documentos PDF, JPG, JPEG, PNG, WEBP, DOC, DOCX, XLS e XLSX. Cada prévia é independente e somente leitura; os arquivos só são enviados após confirmação explícita. A assinatura, o hash e a verificação de duplicidade são feitos somente na confirmação, não ao selecionar a pasta.</p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h2 className="text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-slate-200">1. Turmas e pastas</h2><p role="status" className="text-sm font-semibold text-slate-600 dark:text-slate-300">{batches.length} de {MAX_CLASSES} turma(s)</p></div>
        <div
          role="region"
          aria-label="Área para arrastar pastas de turma"
          onDragOver={(event) => { event.preventDefault(); setDropActive(true); }}
          onDragLeave={() => setDropActive(false)}
          onDrop={(event) => void handleFolderDrop(event)}
          className={`mb-5 rounded-lg border-2 border-dashed p-5 text-center transition ${dropActive ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/30' : 'border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-950'} ${(running || preparing || validatingClassId !== null || dropping || addingClass) ? 'cursor-not-allowed opacity-60' : ''}`}
        >
          <UploadCloud className="mx-auto mb-2 h-7 w-7 text-teal-600 dark:text-teal-400" aria-hidden="true" />
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Arraste aqui as pastas das turmas (ex.: TURMA 78, TURMA 79, TURMA 80). O sistema identifica a turma pelo número no nome da pasta e localiza automaticamente a pasta de matrícula dos alunos (ex.: “2 - MATRICULA DO ALUNOS”, “Arqv 1-DOCs MATRÍCULA”). Pastas sem essa subpasta são ignoradas com aviso.</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Para adicionar turma por turma, use a busca abaixo.</p>
        </div>
        {dropStatus && <p role="status" aria-live="polite" className="mb-3 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">{dropping && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}{dropStatus}</p>}
        {dropOutcomes.length > 0 && <ul role="status" aria-live="polite" className="mb-4 space-y-2">{dropOutcomes.map((outcome, index) => {
          const outcomeStyle = outcome.status === 'adicionada' ? 'border-teal-200 bg-teal-50 text-teal-900 dark:border-teal-900 dark:bg-teal-950/30 dark:text-teal-100' : outcome.status === 'ignorada' ? 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100' : 'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-100';
          const outcomeLabel = outcome.status === 'adicionada' ? 'Turma adicionada' : outcome.status === 'ignorada' ? 'Ignorada' : 'Erro';
          return <li key={`${index}-${outcome.folderName}`} className={`rounded-md border p-3 text-sm ${outcomeStyle}`}><strong className="break-all">{outcome.folderName}</strong> · {outcomeLabel}<p className="mt-1">{outcome.message}</p></li>;
        })}</ul>}
        <div className="max-w-xl">
          <label htmlFor="historical-class-search" className="text-sm font-semibold text-slate-700 dark:text-slate-200">Buscar turma para adicionar</label>
          <div className="relative mt-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              ref={classSearchInputRef}
              id="historical-class-search"
              type="search"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={classPickerOpen}
              aria-controls="historical-class-options"
              aria-activedescendant={searchIsCurrent && activeClassIndex >= 0 && classOptions[activeClassIndex] ? `historical-class-option-${activeClassIndex}` : undefined}
              value={classPickerOpen ? classSearch : selectedClass ? classLabel(selectedClass) : classSearch}
              onFocus={() => { setClassPickerOpen(true); setClassSearch(''); }}
              onBlur={() => setClassPickerOpen(false)}
              onChange={(event) => { setClassSearch(event.target.value.replace(/\D/g, '')); setClassPickerOpen(true); }}
              onKeyDown={handleClassPickerKeyDown}
              disabled={running || preparing || addingClass || validatingClassId !== null || dropping || batches.length >= MAX_CLASSES}
              className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950"
              placeholder="Digite o ID interno da turma"
            />
            {classPickerOpen && <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
              <ul id="historical-class-options" role="listbox" aria-label="Turmas encontradas" className="py-1">
                {searchIsCurrent && classOptions.map((turma, index) => {
                  const alreadyAdded = batches.some((batch) => batch.turma.id === turma.id);
                  return <li
                    id={`historical-class-option-${index}`}
                    key={turma.id}
                    role="option"
                    aria-selected={turma.id === selectedClass?.id}
                    aria-disabled={alreadyAdded}
                    className={`px-3 py-2 text-sm ${alreadyAdded ? 'text-slate-400' : `cursor-pointer ${index === activeClassIndex ? 'bg-teal-50 dark:bg-teal-950' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}`}
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setActiveClassIndex(index)}
                    onClick={() => { if (!alreadyAdded) chooseClass(turma); }}
                  >
                    <span className="block font-semibold">ID interno: {turma.id_interno_escola}{alreadyAdded ? ' · já adicionada' : ''}</span>
                  </li>;
                })}
                {!classSearch && <li className="px-3 py-2 text-sm text-slate-500">Digite um número para buscar turmas.</li>}
              </ul>
              {classSearch && classSearch !== debouncedClassSearch && <p role="status" className="px-3 py-2 text-sm text-slate-500">Aguardando busca…</p>}
              {classSearch && classSearch === debouncedClassSearch && classesQuery.isFetching && <p role="status" className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-300"><LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> Buscando turmas…</p>}
              {classesQuery.isError && classSearch === debouncedClassSearch && <p role="alert" className="px-3 py-2 text-sm text-rose-700 dark:text-rose-300">{(classesQuery.error as Error)?.message || 'Não foi possível buscar as turmas.'}</p>}
              {searchIsCurrent && !classesQuery.isFetching && !classesQuery.isError && classOptions.length === 0 && <p role="status" className="px-3 py-2 text-sm text-slate-500">Nenhuma turma corresponde à busca.</p>}
            </div>}
          </div>
        </div>
        {selectedClass && <div className="mt-3 flex flex-wrap items-center gap-3"><p className="text-sm text-slate-700 dark:text-slate-200">Selecionada: <strong>{classLabel(selectedClass)}</strong></p><button type="button" onClick={() => void addSelectedClass()} disabled={addingClass || validatingClassId !== null || dropping || batches.length >= MAX_CLASSES || batches.some((batch) => batch.turma.id === selectedClass.id) || running || preparing} aria-busy={addingClass} className="inline-flex items-center gap-2 rounded-md bg-teal-700 px-3 py-2 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50">{addingClass && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}{addingClass ? 'Carregando roster…' : 'Adicionar turma'}</button></div>}
        {globalError && <p role="alert" className="mt-3 rounded-md bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">{globalError}</p>}
        {batches.length === 0 && <p className="mt-4 text-sm text-slate-500">Busque e adicione uma turma para começar.</p>}
        <div className="mt-4 space-y-4">
          {batches.map((batch, index) => <article key={batch.turma.id} className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold text-slate-900 dark:text-white">Turma {index + 1}: {classLabel(batch.turma)}</h3><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{batch.roster.length} aluno(s) no roster desta turma.</p></div><button type="button" aria-label={`Remover ${classLabel(batch.turma)} da fila`} onClick={() => setBatches((current) => current.filter((item) => item.turma.id !== batch.turma.id))} disabled={running || preparing || validatingClassId !== null || dropping} className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50 dark:border-slate-700"><X className="h-4 w-4" aria-hidden="true" />Remover</button></div>
            <label htmlFor={`folder-${batch.turma.id}`} className="mt-4 flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-4 text-center transition hover:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500 dark:border-slate-700 dark:bg-slate-950">
              <UploadCloud className="mb-2 h-6 w-6 text-teal-600" aria-hidden="true" />
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{batch.folderName ? `Selecionar novamente a pasta “${batch.folderName}”` : 'Selecionar pasta de documentos desta turma'}</span>
              <span className="mt-1 text-xs text-slate-500">A pasta será vinculada somente a esta turma; subpastas são incluídas quando o navegador oferece suporte. A assinatura do arquivo ainda não foi verificada.</span>
              <input id={`folder-${batch.turma.id}`} type="file" accept="application/pdf,image/jpeg,image/png,image/webp,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx" multiple {...({ webkitdirectory: '', directory: '' } as Record<string, string>)} className="sr-only" onChange={(event) => void handleFolder(batch.turma.id, event)} disabled={running || preparing || validatingClassId !== null || dropping} />
            </label>
            {batch.validationStatus && <p role="status" aria-live="polite" className="mt-3 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">{validatingClassId === batch.turma.id && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}{batch.validationStatus}</p>}
            {batch.validationErrors.length > 0 && <ul role="alert" className="mt-3 max-h-40 space-y-1 overflow-auto rounded-md bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">{batch.validationErrors.map((message, errorIndex) => <li key={`${errorIndex}-${message}`}>{message}</li>)}</ul>}
            {batch.files.length > 0 && <div className="mt-3"><p className="text-sm text-slate-600 dark:text-slate-300">{batch.files.length} arquivo(s) não vazio(s) selecionado(s) nesta turma. A assinatura e a duplicidade serão verificadas antes do envio:</p><ul aria-label={`Arquivos selecionados da ${classLabel(batch.turma)}`} className="mt-2 max-h-48 space-y-1 overflow-auto rounded-md bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-950 dark:text-slate-300">{batch.files.map((draft) => <li key={draft.key} className="break-all">{draft.path}</li>)}</ul></div>}
          </article>)}
        </div>
        {batchesWithoutFolder.length > 0 && <p role="status" className="mt-4 rounded-md bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">Selecione uma pasta com ao menos um documento (PDF, JPG, JPEG, PNG, WEBP, DOC, DOCX, XLS ou XLSX) não vazio para cada turma: {batchesWithoutFolder.map((batch) => classLabel(batch.turma)).join('; ')}.</p>}
        {batchesWithoutDocuments.length > 0 && <div role="status" className="mt-4 rounded-md bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          <p className="font-semibold">Turmas sem nenhum documento válido — elas ficam fora das prévias e da importação, sem travar as demais:</p>
          <ul className="mt-1 list-disc pl-5">
            {batchesWithoutDocuments.map((batch) => <li key={batch.turma.id}>{classLabel(batch.turma)}: a pasta de matrícula “{batch.folderName}” foi localizada, mas nenhum documento válido foi considerado. Veja o resumo e os avisos na ficha desta turma, acima.</li>)}
          </ul>
        </div>}
        {batches.length > 0 && <div className="mt-4 flex flex-wrap items-center gap-3"><button type="button" onClick={() => void generateAllPreviews()} disabled={preparing || running || validatingClassId !== null || dropping || batchesWithoutFolder.length > 0 || !hasPreviewCandidates} aria-busy={preparing} className="inline-flex items-center gap-2 rounded-md bg-slate-800 px-4 py-2 text-sm font-bold text-white hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-700">{preparing ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <FileText className="h-4 w-4" aria-hidden="true" />}{preparing ? 'Gerando prévias…' : 'Gerar prévias de todas as turmas'}</button><p className="text-xs text-slate-500 dark:text-slate-400">{batches.length} turma(s) na fila; cada turma terá sua própria conciliação independente.</p></div>}
      </section>

      {globalStatus && <p role="status" aria-live="polite" className={`rounded-lg border p-3 text-sm ${globalStatus.startsWith('Prévia parcial:') || globalStatus.startsWith('Falha na importação:') || globalStatus.startsWith('Importação parcial:') ? 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100' : 'border-teal-200 bg-teal-50 text-teal-900 dark:border-teal-900 dark:bg-teal-950/30 dark:text-teal-100'}`}>{globalStatus}</p>}

      {batches.filter((batch) => batch.preview || batch.previewError || batch.files.length > 0).map((batch) => {
        const coveredPeople = new Set(batch.files.filter((draft) => !draft.excluded).map((draft) => assignedPerson(batch, draft)).filter((id): id is string => Boolean(id)));
        const readyCount = importableCount(batch);
        let filesByPerson = new Map<string, DraftFile[]>();
        const unassignedFiles: DraftFile[] = [];
        batch.files.forEach((draft) => {
          const personId = draft.excluded ? null : assignedPerson(batch, draft);
          if (!personId) unassignedFiles.push(draft);
          else filesByPerson.set(personId, [...(filesByPerson.get(personId) ?? []), draft]);
        });
        filesByPerson = new Map(batch.roster.flatMap((person) => {
          const files = filesByPerson.get(person.id);
          return files ? [[person.id, files] as [string, DraftFile[]]] : [];
        }));
        const linkedFiles = batch.files.filter((draft) => linkedPersonFor(batch, draft) !== null);
        const problemFiles = batch.files.filter((draft) => linkedPersonFor(batch, draft) === null);
        const importedCount = batch.results?.filter((result) => result.status === 'Importado').length ?? 0;
        const failedCount = batch.results?.filter((result) => ['Erro', 'Conflito', 'Mais de um PDF para o aluno', 'PDF duplicado', 'Correspondência ambígua', 'Sem correspondência'].includes(result.status)).length ?? 0;
        return <section key={batch.turma.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-slate-200">Prévia independente — {classLabel(batch.turma)}</h2>
          {batch.previewStatus && <p role="status" aria-live="polite" className="mb-3 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">{preparing && !batch.preview && <LoaderCircle className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />}{batch.previewStatus}</p>}
          {batch.previewError && <p role="alert" className="mb-3 rounded-md bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">{batch.previewError}</p>}
          {batch.files.length > 0 && !batch.preview && <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">A prévia será preparada junto com as demais turmas pela ação “Gerar prévias de todas as turmas”.</p>}
          {batch.preview && <>
            <div className="mb-4 grid gap-3 sm:grid-cols-3"><Summary label="Arquivos desta turma" value={String(batch.files.length)} /><Summary label="Prontos para importar" value={String(readyCount)} tone={readyCount ? 'success' : 'warning'} /><Summary label="Alunos sem arquivo associado" value={String(batch.roster.filter((person) => !coveredPeople.has(person.id)).length)} tone="warning" /></div>
            <Accordion title="Arquivos por aluno" count={batch.files.length}>
              <section aria-label={`Arquivos agrupados por aluno de ${classLabel(batch.turma)}`}><div className="grid gap-2 sm:grid-cols-2">{Array.from(filesByPerson.entries()).map(([personId, drafts]) => { const person = batch.roster.find((candidate) => candidate.id === personId)!; return <div key={personId} className="rounded-md bg-slate-50 p-3 text-sm dark:bg-slate-950"><strong>{person.nome} · {drafts.length} documento(s)</strong><ul className="mt-1 space-y-1 text-xs text-slate-600 dark:text-slate-300">{drafts.map((draft) => <li key={draft.key} className="break-all">{draft.path}{draft.excluded ? ' · fora do lote' : ''}</li>)}</ul></div>; })}{unassignedFiles.length > 0 && <div className="rounded-md bg-amber-50 p-3 text-sm dark:bg-amber-950/30"><strong>Sem aluno associado · {unassignedFiles.length} documento(s)</strong><ul className="mt-1 space-y-1 text-xs">{unassignedFiles.map((draft) => <li key={draft.key} className="break-all">{draft.path}{draft.excluded ? ' · fora do lote' : ''}</li>)}</ul></div>}</div></section>
            </Accordion>
            <Accordion title="Correspondência pronta" count={linkedFiles.length}>
              {linkedFiles.length > 0 ? <ConciliationTable batch={batch} files={linkedFiles} running={running} updateBatch={updateBatch} /> : <p className="text-sm text-slate-600 dark:text-slate-300">Nenhum arquivo com aluno vinculado nesta turma.</p>}
            </Accordion>
            {problemFiles.length > 0 && <Accordion title="Pendências de vínculo" count={problemFiles.length} defaultOpen={true}>
              <p className="mb-2 text-sm text-amber-800 dark:text-amber-300">Estes arquivos não têm aluno vinculado. Escolha o aluno na lista ou marque “Fora” para deixá-los de lado.</p>
              <ConciliationTable batch={batch} files={problemFiles} running={running} updateBatch={updateBatch} />
            </Accordion>}
            <section aria-label={`Alunos sem arquivo de ${classLabel(batch.turma)}`} className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30"><h3 className="font-bold text-amber-900 dark:text-amber-200">Alunos desta turma sem arquivo associado</h3><p className="mt-1 text-sm text-amber-800 dark:text-amber-300">{batch.roster.filter((person) => !coveredPeople.has(person.id)).map((person) => person.nome).join(', ') || 'Nenhum.'}</p></section>
            {batch.importError && <p role="alert" className="mt-3 rounded-md bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">Falha nesta turma: {batch.importError}. As demais turmas prontas continuam sendo processadas na importação global.</p>}
          </>}
          {batch.results && <div aria-live="polite" className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-700"><h3 className="mb-3 text-sm font-bold text-slate-800 dark:text-slate-100">Resultado desta turma</h3><div className="mb-4 grid gap-3 sm:grid-cols-3"><Summary label="Importados" value={String(importedCount)} tone="success" /><Summary label="Falhas/conflitos/pendências" value={String(failedCount)} tone={failedCount ? 'warning' : 'success'} /><Summary label="Arquivos reportados" value={String(batch.results.length)} /></div><ul className="space-y-2">{batch.results.map((result) => <li key={result.key} className="rounded-md border border-slate-200 p-3 text-sm dark:border-slate-700"><strong className="break-all">{result.fileName}</strong> · {result.studentName} · <span className={result.status === 'Importado' ? 'font-bold text-emerald-700 dark:text-emerald-300' : 'font-bold text-amber-700 dark:text-amber-300'}>{result.status}</span><p className="mt-1 text-slate-600 dark:text-slate-300">{result.message}</p></li>)}</ul></div>}
        </section>;
      })}

      {batches.some((batch) => batch.preview) && !canStartNewMigration && <section className="rounded-xl border border-teal-300 bg-teal-50 p-5 dark:border-teal-900 dark:bg-teal-950/30">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-teal-950 dark:text-teal-100">Importação em lote</h2>
            <p className="mt-1 text-sm text-teal-900 dark:text-teal-200">{readyBatches.length} turma(s) com arquivos prontos. Somente essas turmas serão importadas, uma por vez; falhas não interrompem as próximas. Somente documentos prontos são enviados; ambiguidades, duplicatas e conflitos não são sobrescritos.</p>
          </div>
          <button type="button" onClick={() => void executeImport(readyBatches)} disabled={running || preparing || dropping || readyBatches.length === 0} aria-busy={running} className="inline-flex items-center gap-2 rounded-md bg-teal-800 px-4 py-2 text-sm font-bold text-white hover:bg-teal-900 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:cursor-not-allowed disabled:opacity-50">{running ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}{running ? 'Processando turmas sequencialmente…' : 'Confirmar e importar todas as turmas prontas'}</button>
        </div>
        {importProgress && <div role="status" aria-live="polite" aria-atomic="true" className="mt-4 space-y-2 rounded-lg border border-teal-300 bg-white p-3 text-sm text-teal-900 dark:border-teal-800 dark:bg-slate-900 dark:text-teal-100">
          <p>Turma {importProgress.classIndex} de {importProgress.classTotal}: <strong>{importProgress.classLabel}</strong></p>
          <p>Arquivo {importProgress.index} de {importProgress.total}: <strong className="break-all">{importProgress.fileName}</strong> — {importProgress.stage === 'checking' ? 'Verificando autorização, vínculo com a turma, hash e duplicidade antes do envio.' : `Enviando para o armazenamento: ${importProgress.percent}%`}</p>
          {importProgress.stage === 'uploading' && <progress className="h-2 w-full accent-teal-700" value={importProgress.percent ?? 0} max={100} aria-label="Progresso do envio do arquivo" />}
        </div>}
      </section>}

      {canStartNewMigration && <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><h2 className="text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-slate-200">Migração finalizada</h2><p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{totalImported} arquivo(s) importado(s) nesta execução. Inicie uma nova migração para limpar a tela e selecionar novas turmas e pastas.</p><button type="button" onClick={startNewMigration} className="mt-4 inline-flex items-center gap-2 rounded-md bg-teal-700 px-4 py-2 text-sm font-bold text-white hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-500"> <RotateCcw className="h-4 w-4" aria-hidden="true" />Finalizar e iniciar nova migração</button></section>}
    </div>
  );
}

function Summary({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'success' | 'warning' }) {
  const color = tone === 'success' ? 'text-emerald-600' : tone === 'warning' ? 'text-amber-600' : 'text-slate-900 dark:text-white';
  return <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950"><p className="text-xs text-slate-500 dark:text-slate-400">{label}</p><p className={`mt-1 text-lg font-extrabold ${color}`}>{value}</p></div>;
}
