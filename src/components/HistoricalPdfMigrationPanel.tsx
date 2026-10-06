import { useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, FileText, LoaderCircle, Search, UploadCloud } from 'lucide-react';
import { historicalPdfMigrationService, hashHistoricalPdf, matchPdfName, type HistoricalPdfClass, type HistoricalPdfRosterPerson } from '../services/historicalPdfMigrationService';
import type { Documento, UserRole } from '../types';
import { useUIStore } from '../store/uiStore';

type DraftFile = { key: string; file: File; excluded: boolean };
type MatchResult = ReturnType<typeof matchPdfName>;
type PreviewData = {
  hashes: Record<string, string>;
  matches: Record<string, MatchResult>;
  automaticAssignments: Record<string, string | null>;
  automaticDuplicateKeys: Record<string, boolean>;
  documents: Documento[];
};
type FileResult = { key: string; fileName: string; studentName: string; status: string; message: string };

function classLabel(turma: HistoricalPdfClass) {
  return `Turma ${turma.id_anac || '—'} · ID interno ${turma.id_interno_escola}`;
}

function isPdf(file: File) {
  return file.name.toLocaleLowerCase('pt-BR').endsWith('.pdf');
}

export default function HistoricalPdfMigrationPanel() {
  const user = useUIStore((state) => state.userLogged);
  const role = user?.role as UserRole | undefined;
  const authorized = role === 'GESTOR' || role === 'EQUIPE';
  const [classSearch, setClassSearch] = useState('');
  const [debouncedClassSearch, setDebouncedClassSearch] = useState('');
  const [classId, setClassId] = useState('');
  const [selectedClass, setSelectedClass] = useState<HistoricalPdfClass | null>(null);
  const [classPickerOpen, setClassPickerOpen] = useState(false);
  const [activeClassIndex, setActiveClassIndex] = useState(-1);
  const classSearchInputRef = useRef<HTMLInputElement>(null);
  const [drafts, setDrafts] = useState<DraftFile[]>([]);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [manualAssignments, setManualAssignments] = useState<Record<string, string>>({});
  const [previewing, setPreviewing] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<FileResult[] | null>(null);

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
  const rosterQuery = useQuery({
    queryKey: ['historical-pdf-migration', 'roster', classId],
    queryFn: () => historicalPdfMigrationService.getRoster(classId),
    enabled: authorized && Boolean(classId),
    retry: false,
  });

  const classOptions = classesQuery.data ?? [];
  const searchIsCurrent = classSearch === debouncedClassSearch && Boolean(classSearch);

  useEffect(() => {
    setActiveClassIndex(-1);
  }, [debouncedClassSearch, classesQuery.data]);

  const assignedPerson = (draft: DraftFile) => {
    if (Object.prototype.hasOwnProperty.call(manualAssignments, draft.key)) return manualAssignments[draft.key] || null;
    return preview?.automaticAssignments[draft.key] ?? null;
  };

  const collisionCounts = useMemo(() => {
    const counts = new Map<string, number>();
    drafts.filter((draft) => !draft.excluded).forEach((draft) => {
      const personId = assignedPerson(draft);
      if (personId) counts.set(personId, (counts.get(personId) ?? 0) + 1);
    });
    return counts;
  }, [drafts, manualAssignments, preview]);

  const rosterById = useMemo(() => new Map((rosterQuery.data ?? []).map((person) => [person.id, person])), [rosterQuery.data]);
  const coveredPeople = useMemo(() => new Set(drafts.filter((draft) => !draft.excluded).map(assignedPerson).filter((id): id is string => Boolean(id))), [drafts, manualAssignments, preview]);

  const chooseClass = (turma: HistoricalPdfClass) => {
    setClassId(turma.id);
    setSelectedClass(turma);
    setClassSearch('');
    setClassPickerOpen(false);
    setActiveClassIndex(-1);
    classSearchInputRef.current?.blur();
    setDrafts([]);
    setPreview(null);
    setManualAssignments({});
    setResults(null);
    setError('');
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

  const handleFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files: File[] = event.target.files ? Array.from(event.target.files as FileList) as File[] : [];
    event.target.value = '';
    setError('');
    setResults(null);
    setPreview(null);
    setManualAssignments({});
    if (files.some((file) => !isPdf(file))) {
      setDrafts([]);
      setError('Selecione somente arquivos PDF. Nenhum arquivo foi adicionado.');
      return;
    }
    try {
      for (const file of files) {
        if (file.size === 0) throw new Error(`O arquivo “${file.name}” está vazio.`);
        const signature = new TextDecoder().decode(await file.slice(0, 5).arrayBuffer());
        if (signature !== '%PDF-') throw new Error(`O arquivo “${file.name}” não contém uma assinatura PDF válida.`);
      }
      const offset = drafts.length;
      setDrafts((current) => [...current, ...files.map((file, index) => ({
        key: `${file.name}:${file.size}:${file.lastModified}:${offset + index}`,
        file,
        excluded: false,
      }))]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível validar os arquivos selecionados.');
    }
  };

  const preparePreview = async () => {
    if (!classId || !rosterQuery.data || drafts.length === 0 || previewing || running) return;
    setPreviewing(true);
    setPreview(null);
    setResults(null);
    setError('');
    try {
      const [hashes, documents] = await Promise.all([
        (async () => {
          const fileHashes: Array<readonly [string, string]> = [];
          for (const draft of drafts) {
            fileHashes.push([draft.key, await hashHistoricalPdf(draft.file)]);
          }
          return fileHashes;
        })(),
        historicalPdfMigrationService.getUnifiedDocuments(classId, rosterQuery.data.map((person) => person.id)),
      ]);
      const matches = Object.fromEntries(drafts.map((draft) => [draft.key, matchPdfName(draft.file.name, rosterQuery.data!)])) as Record<string, MatchResult>;
      const automaticAssignments: Record<string, string | null> = {};
      const automaticCounts = new Map<string, number>();
      Object.values(matches).forEach((match) => {
        if ((match.kind === 'exact' || match.kind === 'partial') && match.candidates[0]) {
          const personId = match.candidates[0].id;
          automaticCounts.set(personId, (automaticCounts.get(personId) ?? 0) + 1);
        }
      });
      const automaticDuplicateKeys: Record<string, boolean> = {};
      drafts.forEach((draft) => {
        const match = matches[draft.key];
        const person = (match.kind === 'exact' || match.kind === 'partial') ? match.candidates[0] : undefined;
        const duplicate = Boolean(person && (automaticCounts.get(person.id) ?? 0) > 1);
        automaticDuplicateKeys[draft.key] = duplicate;
        automaticAssignments[draft.key] = person && !duplicate ? person.id : null;
      });
      setPreview({ hashes: Object.fromEntries(hashes), matches, automaticAssignments, automaticDuplicateKeys, documents });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível gerar a prévia.');
    } finally {
      setPreviewing(false);
    }
  };

  const getFileState = (draft: DraftFile) => {
    if (draft.excluded) return { label: 'Fora do lote', message: 'Excluído explicitamente pelo operador.', person: null as HistoricalPdfRosterPerson | null, blocked: true };
    const personId = assignedPerson(draft);
    const match = preview?.matches[draft.key];
    if (!personId) {
      if (preview?.automaticDuplicateKeys[draft.key]) return { label: 'Mais de um PDF para o aluno', message: 'Vários PDFs correspondem automaticamente ao mesmo aluno. Nenhum foi associado; resolva manualmente um arquivo e deixe os demais de fora.', person: null, blocked: true };
      const ambiguity = match?.kind === 'ambiguous';
      return { label: ambiguity ? 'Correspondência ambígua' : 'Sem correspondência', message: ambiguity ? 'Escolha explicitamente um aluno da turma ou exclua este arquivo.' : 'Selecione explicitamente um aluno da turma ou exclua este arquivo.', person: null, blocked: true };
    }
    const person = rosterById.get(personId) ?? null;
    if (!person) return { label: 'Aluno inválido', message: 'O aluno escolhido não pertence ao roster carregado desta turma.', person: null, blocked: true };
    if ((collisionCounts.get(personId) ?? 0) > 1) return { label: 'Mais de um PDF para o aluno', message: 'Há vários PDFs associados a este aluno. Desassocie ou exclua arquivos até restar apenas um.', person, blocked: true };
    const hash = preview?.hashes[draft.key];
    const existing = preview?.documents.filter((document) => document.pessoa_id === personId) ?? [];
    if (hash && existing.some((document) => document.hash_sha256 === hash)) return { label: 'Já importado', message: 'O mesmo hash já está registrado para este aluno; o arquivo será ignorado.', person, blocked: true };
    if (existing.length > 0) return { label: 'Conflito', message: 'Este aluno já possui documento unificado com outro hash. Não será sobrescrito nem versionado.', person, blocked: true };
    return { label: 'Pronto para importar', message: 'Correspondência revisada. Nenhuma gravação foi feita nesta prévia.', person, blocked: false };
  };

  const executeImport = async () => {
    if (!preview || running) return;
    setRunning(true);
    setError('');
    setResults(null);
    const fileResults: FileResult[] = [];
    for (const draft of drafts) {
      const state = getFileState(draft);
      if (draft.excluded) {
        fileResults.push({ key: draft.key, fileName: draft.file.name, studentName: '—', status: 'Ignorado', message: state.message });
        continue;
      }
      if (!state.person || state.blocked) {
        fileResults.push({ key: draft.key, fileName: draft.file.name, studentName: state.person?.nome ?? 'Não associado', status: state.label, message: state.message });
        continue;
      }
      try {
        const outcome = await historicalPdfMigrationService.importOne(classId, draft.file, state.person);
        fileResults.push({
          key: draft.key,
          fileName: draft.file.name,
          studentName: state.person.nome,
          status: outcome === 'importado' ? 'Importado' : outcome === 'ja_importado' ? 'Já importado' : 'Conflito',
          message: outcome === 'importado' ? 'Documento unificado enviado e registrado.' : outcome === 'ja_importado' ? 'O mesmo hash já estava registrado para este aluno.' : 'Já existe documento unificado com outro hash; nenhum arquivo foi sobrescrito.',
        });
      } catch (cause) {
        fileResults.push({ key: draft.key, fileName: draft.file.name, studentName: state.person.nome, status: 'Erro', message: cause instanceof Error ? cause.message : 'Falha ao enviar ou registrar o arquivo.' });
      }
    }
    setResults(fileResults);
    setRunning(false);
  };

  const importableCount = drafts.filter((draft) => !getFileState(draft).blocked).length;
  const importedCount = results?.filter((result) => result.status === 'Importado').length ?? 0;
  const failedCount = results?.filter((result) => result.status === 'Erro' || result.status === 'Conflito' || result.status === 'Mais de um PDF para o aluno' || result.status === 'Correspondência ambígua' || result.status === 'Sem correspondência').length ?? 0;

  if (!authorized) return <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">A migração histórica de PDFs é restrita a usuários autenticados com perfil Gestor ou Equipe.</p>;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-600 dark:text-teal-400">Importação documental controlada</p>
        <h1 className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-white">Migração histórica de PDFs</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-400">Escolha uma turma, concilie cada PDF com o roster e revise os conflitos. A prévia é somente leitura; os arquivos só são enviados após confirmação explícita.</p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-slate-200">1. Turma e roster</h2>
        <div className="max-w-xl">
          <label htmlFor="historical-class-search" className="text-sm font-semibold text-slate-700 dark:text-slate-200">Buscar e selecionar turma</label>
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
              disabled={running || previewing}
              className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:border-slate-700 dark:bg-slate-950"
              placeholder="Digite o ID ANAC ou interno"
            />
            {classPickerOpen && <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
              <ul id="historical-class-options" role="listbox" aria-label="Turmas encontradas" className="py-1">
                {searchIsCurrent && classOptions.map((turma, index) => <li
                  id={`historical-class-option-${index}`}
                  key={turma.id}
                  role="option"
                  aria-selected={turma.id === classId}
                  className={`cursor-pointer px-3 py-2 text-sm ${index === activeClassIndex ? 'bg-teal-50 dark:bg-teal-950' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActiveClassIndex(index)}
                  onClick={() => chooseClass(turma)}
                >
                  <span className="block font-semibold">ANAC: {turma.id_anac || '—'}</span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">ID interno: {turma.id_interno_escola}</span>
                </li>)}
                {!classSearch && <li className="px-3 py-2 text-sm text-slate-500">Digite um número para buscar turmas.</li>}
              </ul>
              {classSearch && classSearch !== debouncedClassSearch && <p role="status" className="px-3 py-2 text-sm text-slate-500">Aguardando busca…</p>}
              {classSearch && classSearch === debouncedClassSearch && classesQuery.isFetching && <p role="status" className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-300"><LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> Buscando turmas…</p>}
              {classesQuery.isError && classSearch === debouncedClassSearch && <p role="alert" className="px-3 py-2 text-sm text-rose-700 dark:text-rose-300">{(classesQuery.error as Error)?.message || 'Não foi possível buscar as turmas.'}</p>}
              {searchIsCurrent && !classesQuery.isFetching && !classesQuery.isError && classOptions.length === 0 && <p role="status" className="px-3 py-2 text-sm text-slate-500">Nenhuma turma corresponde à busca.</p>}
            </div>}
          </div>
        </div>
        {classId && rosterQuery.isLoading && <p role="status" className="mt-3 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"><LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> Carregando matrículas e pessoas da turma…</p>}
        {rosterQuery.isError && <p role="alert" className="mt-3 text-sm text-rose-700 dark:text-rose-300">{(rosterQuery.error as Error)?.message || 'Não foi possível carregar o roster.'}</p>}
        {rosterQuery.data && <p role="status" className="mt-3 text-sm text-slate-600 dark:text-slate-300">{rosterQuery.data.length} aluno(s) no roster desta turma. Todas as matrículas são consideradas, sem filtro por status.</p>}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-slate-200">2. Selecionar vários PDFs</h2>
        <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-4 text-center transition hover:border-teal-500 dark:border-slate-700 dark:bg-slate-950">
          <UploadCloud className="mb-2 h-7 w-7 text-teal-600" aria-hidden="true" />
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Escolher arquivos PDF</span>
          <span className="mt-1 text-xs text-slate-500">PDF válido. Os arquivos permanecem no navegador até confirmar.</span>
          <input className="sr-only" type="file" accept="application/pdf,.pdf" multiple onChange={(event) => void handleFiles(event)} disabled={!classId || !rosterQuery.data || running || previewing} />
        </label>
        {drafts.length > 0 && <div className="mt-3 flex items-center justify-between gap-3"><p className="text-sm text-slate-600 dark:text-slate-300">{drafts.length} arquivo(s) selecionado(s)</p><button type="button" onClick={() => { setDrafts([]); setPreview(null); setManualAssignments({}); setResults(null); }} disabled={running || previewing} className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50 dark:border-slate-700">Limpar arquivos</button></div>}
        {error && <p role="alert" className="mt-3 rounded-md bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">{error}</p>}
      </section>

      {drafts.length > 0 && <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-slate-200">3. Conciliar e revisar — prévia somente leitura</h2>
        {!preview && <button type="button" onClick={() => void preparePreview()} disabled={!rosterQuery.data || previewing || running} aria-busy={previewing} className="inline-flex items-center gap-2 rounded-md bg-teal-700 px-4 py-2 text-sm font-bold text-white hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:cursor-not-allowed disabled:opacity-50">{previewing ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <FileText className="h-4 w-4" aria-hidden="true" />}{previewing ? 'Gerando prévia…' : 'Gerar prévia e conciliar nomes'}</button>}
        {preview && <>
          <div className="mb-4 grid gap-3 sm:grid-cols-3"><Summary label="Arquivos" value={String(drafts.length)} /><Summary label="Prontos para importar" value={String(importableCount)} tone={importableCount ? 'success' : 'warning'} /><Summary label="Alunos sem arquivo associado" value={String((rosterQuery.data ?? []).filter((person) => !coveredPeople.has(person.id)).length)} tone="warning" /></div>
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
            <table className="min-w-[900px] text-left text-xs">
              <caption className="sr-only">Conciliação, resolução e estado de cada PDF histórico</caption>
              <thead className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"><tr><th className="px-3 py-2">Arquivo / hash SHA-256</th><th className="px-3 py-2">Correspondência</th><th className="px-3 py-2">Associar ao aluno</th><th className="px-3 py-2">Resultado previsto</th><th className="px-3 py-2">Incluir</th></tr></thead>
              <tbody>{drafts.map((draft) => {
                const match = preview.matches[draft.key];
                const state = getFileState(draft);
                const hash = preview.hashes[draft.key];
                const matchLabel = match.kind === 'exact' ? 'Nome exato' : match.kind === 'partial' ? 'Prefixo inequívoco' : match.kind === 'ambiguous' ? 'Ambíguo — vários candidatos' : 'Sem correspondência';
                const assigned = assignedPerson(draft) ?? '';
                return <tr key={draft.key} className="border-t border-slate-200 align-top dark:border-slate-800"><td className="max-w-xs break-all px-3 py-3"><strong className="flex items-center gap-1"><FileText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />{draft.file.name}</strong><code className="mt-1 block text-[10px] text-slate-500">SHA-256: {hash}</code></td><td className="px-3 py-3"><strong>{matchLabel}</strong>{match.candidates.length > 0 && <ul className="mt-1 list-disc pl-4 text-slate-500">{match.candidates.map((person) => <li key={person.id}>{person.nome} · {person.id}</li>)}</ul>}</td><td className="px-3 py-3"><label className="sr-only" htmlFor={`student-${draft.key}`}>Associar {draft.file.name} ao aluno</label><select id={`student-${draft.key}`} value={assigned} onChange={(event) => setManualAssignments((current) => ({ ...current, [draft.key]: event.target.value }))} disabled={draft.excluded || running} className="max-w-xs rounded border border-slate-300 bg-white px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950"><option value="">Não associar — selecionar aluno</option>{(rosterQuery.data ?? []).map((person) => <option key={person.id} value={person.id}>{person.nome} · {person.id}</option>)}</select></td><td className="max-w-xs px-3 py-3"><strong className={state.blocked ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'}>{state.label}</strong><p className="mt-1 whitespace-normal">{state.message}</p></td><td className="px-3 py-3"><label className="inline-flex items-center gap-2"><input type="checkbox" checked={!draft.excluded} onChange={(event) => setDrafts((current) => current.map((item) => item.key === draft.key ? { ...item, excluded: !event.target.checked } : item))} disabled={running} className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-500" /><span>{draft.excluded ? 'Fora' : 'Sim'}</span></label></td></tr>;
              })}</tbody>
            </table>
          </div>
          <section aria-label="Alunos sem arquivo" className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30"><h3 className="font-bold text-amber-900 dark:text-amber-200">Alunos da turma sem arquivo associado</h3><p className="mt-1 text-sm text-amber-800 dark:text-amber-300">{(rosterQuery.data ?? []).filter((person) => !coveredPeople.has(person.id)).map((person) => person.nome).join(', ') || 'Nenhum.'}</p></section>
          <div className="mt-4 flex flex-wrap items-center gap-3"><button type="button" onClick={() => void executeImport()} disabled={running || importableCount === 0} aria-busy={running} className="inline-flex items-center gap-2 rounded-md bg-teal-700 px-4 py-2 text-sm font-bold text-white hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:cursor-not-allowed disabled:opacity-50">{running ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}{running ? 'Enviando documentos…' : `Confirmar e importar ${importableCount} PDF(s)`}</button><p className="text-xs text-slate-500 dark:text-slate-400">A confirmação envia apenas os arquivos marcados como prontos. Ambiguidades, duplicatas e conflitos permanecem sem gravação.</p></div>
        </>}
      </section>}

      {results && <section aria-live="polite" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-slate-200">4. Resultado por arquivo e aluno</h2><div className="mb-4 grid gap-3 sm:grid-cols-3"><Summary label="Importados" value={String(importedCount)} tone="success" /><Summary label="Falhas/conflitos/pendências" value={String(failedCount)} tone={failedCount ? 'warning' : 'success'} /><Summary label="Arquivos reportados" value={String(results.length)} /></div><ul className="space-y-2">{results.map((result) => <li key={result.key} className="rounded-md border border-slate-200 p-3 text-sm dark:border-slate-700"><strong>{result.fileName}</strong> · {result.studentName} · <span className={result.status === 'Importado' ? 'font-bold text-emerald-700 dark:text-emerald-300' : 'font-bold text-amber-700 dark:text-amber-300'}>{result.status}</span><p className="mt-1 text-slate-600 dark:text-slate-300">{result.message}</p></li>)}</ul></section>}
    </div>
  );
}

function Summary({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'success' | 'warning' }) {
  const color = tone === 'success' ? 'text-emerald-600' : tone === 'warning' ? 'text-amber-600' : 'text-slate-900 dark:text-white';
  return <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950"><p className="text-xs text-slate-500 dark:text-slate-400">{label}</p><p className={`mt-1 text-lg font-extrabold ${color}`}>{value}</p></div>;
}
