import { useMemo, useState, type ChangeEvent } from 'react';
import { CheckCircle2, Clipboard, FileSpreadsheet, LoaderCircle, Play, TriangleAlert, UploadCloud } from 'lucide-react';
import {
  createStudentMigrationCompany,
  normalizeStudentComparison,
  parseStudentMigrationFile,
  previewStudentMigrationBatch,
  runStudentMigrationBatch,
  studentMigrationIssuesLogText,
  studentMigrationLogText,
  STUDENT_MIGRATION_COLUMNS,
  STUDENT_MIGRATION_DESTINATIONS,
  type StudentMigrationParseResult,
  type StudentMigrationPreviewResult,
  type StudentMigrationProgress,
  type StudentMigrationRunResult,
  type StudentMigrationRow,
} from '../services/studentMigrationService';

const MAX_BATCH_SIZE = 3000;

type CompanyRegistrationForm = {
  nome_fantasia: string;
  razao_social: string;
  cnpj: string;
};

export default function StudentMigrationPanel() {
  const [parsed, setParsed] = useState<StudentMigrationParseResult | null>(null);
  const [fileName, setFileName] = useState('');
  const [batchSize, setBatchSize] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [referencePreview, setReferencePreview] = useState<StudentMigrationPreviewResult | null>(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<StudentMigrationProgress | null>(null);
  const [result, setResult] = useState<StudentMigrationRunResult | null>(null);
  const [parseError, setParseError] = useState('');
  const [clipboardMessage, setClipboardMessage] = useState('');
  const [companyForms, setCompanyForms] = useState<Record<string, CompanyRegistrationForm>>({});
  const [creatingCompany, setCreatingCompany] = useState('');
  const [companyMessage, setCompanyMessage] = useState('');

  const selectedRows = useMemo(() => {
    const sourceRows = referencePreview?.rows.filter((row) => row.valid) ?? parsed?.validRows ?? [];
    return sourceRows.slice(0, Math.min(MAX_BATCH_SIZE, batchSize));
  }, [batchSize, parsed, referencePreview]);
  const blockingProblemSummary = useMemo(() => {
    const reasons = new Map<string, { count: number; lines: number[] }>();
    parsed?.discardedRows.forEach((row) => row.problems.forEach((problem) => {
      const current = reasons.get(problem) ?? { count: 0, lines: [] };
      current.count += 1;
      current.lines.push(row.line);
      reasons.set(problem, current);
    }));
    return {
      affectedRows: parsed?.discardedRows.length ?? 0,
      totalOccurrences: Array.from(reasons.values()).reduce((total, reason) => total + reason.count, 0),
      reasons: Array.from(reasons.entries()).map(([reason, details]) => ({ reason, ...details })),
    };
  }, [parsed]);
  const problems = blockingProblemSummary.totalOccurrences;
  const warnings = parsed?.rows.reduce((total, row) => total + row.warnings.length, 0) ?? 0;
  const hasFileProblem = Boolean(parsed && (parsed.duplicateHeaders.length > 0 || !parsed.recognized.includes('TURMA') || !parsed.recognized.includes('ANAC') || !parsed.recognized.includes('NOMES') || !parsed.recognized.includes('CPF')));

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setParseError('');
    setResult(null);
    setConfirming(false);
    setReferencePreview(null);
    setCompanyForms({});
    setCompanyMessage('');
    try {
      const next = await parseStudentMigrationFile(file);
      setParsed(next);
      setFileName(file.name);
      setBatchSize(Math.min(MAX_BATCH_SIZE, next.validRows.length));
    } catch (error) {
      setParsed(null);
      setFileName('');
      setParseError(error instanceof Error ? error.message : 'Não foi possível ler o arquivo.');
    }
    event.target.value = '';
  };

  const copy = async (text: string, message: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setClipboardMessage(message);
    } catch {
      setClipboardMessage('Não foi possível copiar o log. Verifique a permissão da área de transferência.');
    }
  };

  const prepare = async () => {
    if (!parsed?.validRows.length || running || previewing) return;
    setPreviewing(true);
    setParseError('');
    try {
      const preview = await previewStudentMigrationBatch(parsed.validRows.slice(0, Math.min(MAX_BATCH_SIZE, batchSize)));
      setReferencePreview(preview);
      setCompanyForms((current) => Object.fromEntries(preview.missingCompanies.map((name) => {
        const key = normalizeStudentComparison(name);
        return [key, current[key] ?? { nome_fantasia: name, razao_social: '', cnpj: '' }];
      })));
      setCompanyMessage('');
      setConfirming(true);
    } catch (error) {
      setParseError(error instanceof Error ? error.message : 'Não foi possível validar as referências da migração.');
    } finally {
      setPreviewing(false);
    }
  };

  const registerCompany = async (companyName: string) => {
    const key = normalizeStudentComparison(companyName);
    const form = companyForms[key];
    if (!form || !form.nome_fantasia.trim() || !form.razao_social.trim() || !form.cnpj.trim() || creatingCompany) return;
    setCreatingCompany(key);
    setCompanyMessage('');
    try {
      await createStudentMigrationCompany(form);
      setCompanyMessage(`Empresa "${form.nome_fantasia}" cadastrada. Refaça a prévia antes de confirmar o lote.`);
      setReferencePreview(null);
      setConfirming(false);
    } catch (error) {
      setCompanyMessage(error instanceof Error ? error.message : 'Não foi possível cadastrar a empresa.');
    } finally {
      setCreatingCompany('');
    }
  };

  const execute = async () => {
    if (!selectedRows.length || running || previewing) return;
    setRunning(true);
    setConfirming(false);
    setClipboardMessage('');
    try {
      setResult(await runStudentMigrationBatch(selectedRows, setProgress));
    } catch (error) {
      setResult({ results: [{ line: 0, status: 'erro', message: error instanceof Error ? error.message : 'Não foi possível iniciar o lote.' }], successCount: 0, errorCount: selectedRows.length });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-600 dark:text-teal-400">Importação histórica</p>
        <h1 className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-white">Migração de alunos</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-400">Leia a planilha em memória, valide CPF e concilie TURMA + ANAC antes de gravar. A leitura e a prévia não alteram o banco.</p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-slate-200">1. Selecionar arquivo</h2>
        <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-4 text-center transition hover:border-teal-500 dark:border-slate-700 dark:bg-slate-950">
          <UploadCloud className="mb-2 h-8 w-8 text-teal-600" aria-hidden="true" />
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Escolher XLSX, XLS ou CSV</span>
          <span className="mt-1 text-xs text-slate-500">Cabeçalhos esperados: TURMA, ANAC, NOMES e CPF.</span>
          <input className="sr-only" type="file" accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv" onChange={(event) => void handleFile(event)} />
        </label>
        {fileName && <p className="mt-3 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"><FileSpreadsheet className="h-4 w-4 text-teal-600" aria-hidden="true" /> {fileName}</p>}
        {parseError && <p role="alert" className="mt-3 rounded-md bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">{parseError}</p>}
      </section>

      {parsed && <>
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-slate-200">2. Mapeamento, validação e prévia</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Summary label="Linhas lidas" value={String(parsed.rows.length)} />
            <Summary label="Linhas válidas" value={String(parsed.validRows.length)} tone="success" />
            <Summary label="Descartadas" value={String(parsed.discardedRows.length)} tone={parsed.discardedRows.length ? 'warning' : 'default'} />
            <Summary label="Problemas bloqueantes" value={String(problems)} tone={problems ? 'warning' : 'success'} />
            <Summary label="Avisos" value={String(warnings)} tone={warnings ? 'warning' : 'success'} />
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-4">
            <Mapping title="Reconhecidas → destino" values={parsed.recognized} mapping />
            <Mapping title="Ausentes" values={parsed.missing} tone="warning" />
            <Mapping title="Ignoradas" values={parsed.ignored} tone="warning" />
            <Mapping title="Desconhecidas" values={parsed.unknown} tone="danger" />
          </div>
          {parsed.duplicateHeaders.length > 0 && <p role="alert" className="mt-4 rounded-md bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">Cabeçalhos duplicados impedem o lote: {parsed.duplicateHeaders.join(', ')}.</p>}
          <p className="mt-4 rounded-md border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-200">A combinação <strong>TURMA + ANAC</strong> é validada contra turmas já existentes ao revisar o lote, antes da confirmação final. Segunda chamada vazia é pré-visualizada como <strong>null</strong>. Curso, turno, datas, local, MAT., REF. e Software aparecem como ignorados e não são gravados nesta migração.</p>

          <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
            <table className="min-w-full text-left text-xs">
              <caption className="sr-only">Amostra dos valores originais e normalizados dos alunos</caption>
              <thead className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"><tr><th className="px-3 py-2">Linha</th><th className="px-3 py-2">TURMA + ANAC</th><th className="px-3 py-2">Nome</th><th className="px-3 py-2">CPF normalizado</th><th className="px-3 py-2">%</th><th className="px-3 py-2">Notas</th><th className="px-3 py-2">Resultados</th><th className="px-3 py-2">Empresa</th><th className="px-3 py-2">Ignorados</th><th className="px-3 py-2">Situação</th></tr></thead>
              <tbody>{parsed.rows.slice(0, 12).map((row) => <PreviewRow key={row.line} row={row} />)}</tbody>
            </table>
          </div>
          <section aria-labelledby="blocking-problems-title" className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
            <h3 id="blocking-problems-title" className="font-bold text-amber-900 dark:text-amber-200">Problemas bloqueantes</h3>
            <p className="mt-1 text-sm text-amber-800 dark:text-amber-300"><strong>{blockingProblemSummary.totalOccurrences}</strong> ocorrências em <strong>{blockingProblemSummary.affectedRows}</strong> linhas afetadas.</p>
            {blockingProblemSummary.reasons.length > 0 ? <ul aria-label="Motivos dos problemas bloqueantes" className="mt-3 space-y-1 text-sm text-amber-900 dark:text-amber-200">{blockingProblemSummary.reasons.map(({ reason, count, lines }) => <li key={reason} className="flex flex-col gap-1 border-t border-amber-200/70 pt-1 first:border-t-0 first:pt-0 dark:border-amber-800/70 sm:flex-row sm:items-start sm:justify-between sm:gap-4"><span className="min-w-0 break-words">{reason} — {count} {count === 1 ? 'ocorrência' : 'ocorrências'}; {lines.length === 1 ? 'Linha' : 'Linhas'}: {formatLineReferences(lines)}</span></li>)}</ul> : <p className="mt-3 text-sm text-emerald-700 dark:text-emerald-300">Nenhum problema bloqueante encontrado.</p>}
          </section>
          {parsed.discardedRows.length > 0 && <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-4 dark:border-rose-900 dark:bg-rose-950/30"><h3 className="font-bold text-rose-900 dark:text-rose-200">Linhas descartadas</h3><ul className="mt-2 max-h-56 list-disc space-y-1 overflow-y-auto pl-5 text-sm text-rose-800 dark:text-rose-200">{parsed.discardedRows.map((row) => <li key={row.line}>Linha {row.line}: {row.problems.join(' ')}</li>)}</ul></div>}
          {warnings > 0 && <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30"><strong>Avisos não bloqueantes:</strong> CPFs repetidos no arquivo serão conciliados com a mesma pessoa. Empresas sem correspondência ficam pendentes de cadastro manual e não bloqueiam a matrícula.</div>}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-slate-200">3. Selecionar lote e confirmar</h2>
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Quantidade de linhas válidas a gravar (máximo {Math.min(MAX_BATCH_SIZE, parsed.validRows.length)})
            <input type="number" min={parsed.validRows.length ? 1 : 0} max={Math.min(MAX_BATCH_SIZE, parsed.validRows.length)} value={batchSize} onChange={(event) => { setReferencePreview(null); setConfirming(false); setBatchSize(Math.max(1, Math.min(MAX_BATCH_SIZE, parsed.validRows.length, Number(event.target.value) || 1))); }} disabled={running || parsed.validRows.length === 0} className="mt-2 block w-36 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
          </label>
          {confirming && <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/20"><p className="font-bold text-amber-900 dark:text-amber-200">Confirme o lote antes de gravar</p><p className="mt-1 text-sm text-amber-800 dark:text-amber-300">Serão processadas {selectedRows.length} linha(s) válidas após a conciliação. Linhas descartadas ou com conflito bloqueante não entram no lote, e cada linha terá resultado individual.</p>{referencePreview && <div className="mt-3 rounded-md border border-slate-200 bg-white/70 p-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950/30 dark:text-slate-200"><strong>Prévia das referências:</strong> {referencePreview.blockingCount} problema(s) bloqueante(s) e {referencePreview.warningCount} aviso(s) não bloqueante(s). Empresas sem correspondência não serão criadas e ficam pendentes de cadastro manual.{referencePreview.blockingCount > 0 && <ul className="mt-2 max-h-36 list-disc overflow-y-auto pl-5 text-rose-700 dark:text-rose-300">{referencePreview.rows.filter((row) => row.problems.length > 0).map((row) => <li key={row.line}>Linha {row.line}: {row.problems.join(' ')}</li>)}</ul>}{referencePreview.warningCount > 0 && <ul className="mt-2 max-h-36 list-disc overflow-y-auto pl-5 text-amber-700 dark:text-amber-300">{referencePreview.rows.filter((row) => row.warnings.length > 0).map((row) => <li key={`warning-${row.line}`}>Linha {row.line}: {row.warnings.join(' ')}</li>)}</ul>}</div>}<div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => void execute()} disabled={!selectedRows.length} className="inline-flex items-center gap-2 rounded-md bg-teal-700 px-4 py-2 text-sm font-bold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-teal-500"><CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Confirmar e iniciar lote</button><button type="button" onClick={() => { setReferencePreview(null); setConfirming(false); }} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold dark:border-slate-700">Voltar</button></div></div>}
          <button type="button" onClick={() => void prepare()} disabled={running || previewing || !parsed.validRows.length || hasFileProblem} className="mt-4 inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-teal-700 dark:hover:bg-teal-600"><Play className="h-4 w-4" aria-hidden="true" /> {previewing ? 'Validando referências…' : 'Revisar e confirmar lote'}</button>
        </section>
        {companyMessage && !confirming && <p role="status" className="rounded-md border border-teal-200 bg-teal-50 p-3 text-sm text-teal-800 dark:border-teal-900 dark:bg-teal-950/30 dark:text-teal-300">{companyMessage}</p>}

        {confirming && referencePreview?.missingCompanies.length ? <section className="rounded-xl border border-amber-300 bg-amber-50 p-5 shadow-sm dark:border-amber-800 dark:bg-amber-950/20">
          <h2 className="text-sm font-bold uppercase tracking-wide text-amber-900 dark:text-amber-200">Empresas ausentes: cadastro antes do vínculo</h2>
          <p className="mt-2 text-sm text-amber-800 dark:text-amber-300">Cadastre cada empresa ausente com nome fantasia, razão social e CNPJ. A matrícula permanecerá sem empresa enquanto o cadastro não existir. Depois, refaça a prévia para conciliar a empresa antes da gravação.</p>
          <div className="mt-4 space-y-4">
            {referencePreview.missingCompanies.map((companyName) => {
              const key = normalizeStudentComparison(companyName);
              const form = companyForms[key] ?? { nome_fantasia: companyName, razao_social: '', cnpj: '' };
              return <fieldset key={key} className="rounded-md border border-amber-200 bg-white/70 p-3 dark:border-amber-900 dark:bg-slate-950/30"><legend className="px-1 text-sm font-bold text-slate-800 dark:text-slate-100">Empresa informada: {companyName}</legend><div className="grid gap-3 md:grid-cols-3"><label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Nome fantasia<input value={form.nome_fantasia} onChange={(event) => setCompanyForms((current) => ({ ...current, [key]: { ...form, nome_fantasia: event.target.value } }))} disabled={creatingCompany === key} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:border-slate-700 dark:bg-slate-950" /></label><label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Razão social<input value={form.razao_social} onChange={(event) => setCompanyForms((current) => ({ ...current, [key]: { ...form, razao_social: event.target.value } }))} disabled={creatingCompany === key} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:border-slate-700 dark:bg-slate-950" /></label><label className="text-xs font-semibold text-slate-700 dark:text-slate-200">CNPJ<input value={form.cnpj} onChange={(event) => setCompanyForms((current) => ({ ...current, [key]: { ...form, cnpj: event.target.value } }))} disabled={creatingCompany === key} className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:border-slate-700 dark:bg-slate-950" /></label></div><button type="button" onClick={() => void registerCompany(companyName)} disabled={creatingCompany !== '' || !form.nome_fantasia.trim() || !form.razao_social.trim() || !form.cnpj.trim()} className="mt-3 inline-flex items-center gap-2 rounded-md border border-teal-700 px-3 py-2 text-sm font-bold text-teal-800 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-teal-500 dark:border-teal-500 dark:text-teal-300">{creatingCompany === key && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />} {creatingCompany === key ? 'Cadastrando…' : 'Cadastrar empresa'}</button></fieldset>;
            })}
          </div>
          {companyMessage && <p role="status" className="mt-3 text-sm text-teal-800 dark:text-teal-300">{companyMessage}</p>}
        </section> : null}

        {(running || progress || result) && <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-slate-200">4. Acompanhamento e logs</h2>
          {progress && <div aria-live="polite"><div className="mb-2 flex justify-between text-sm font-semibold"><span>{progress.stage}: {progress.message}</span><span>{progress.current}/{progress.total} ({progress.percent}%)</span></div><div className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"><div className={`h-full transition-all ${progress.stage === 'erro' ? 'bg-rose-600' : 'bg-teal-600'}`} style={{ width: `${progress.percent}%` }} /></div></div>}
          {running && <p className="mt-4 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"><LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> Processando linha a linha; o botão permanece desabilitado.</p>}
          {result && <div className="mt-4"><div className="grid gap-3 sm:grid-cols-3"><Summary label="Sucessos" value={String(result.successCount)} tone="success" /><Summary label="Erros/pendências" value={String(result.errorCount)} tone={result.errorCount ? 'warning' : 'success'} /><Summary label="Total processado" value={String(result.results.length)} /></div><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => void copy(studentMigrationLogText(result), 'Log completo copiado para a área de transferência.')} className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-xs font-bold dark:border-slate-700"><Clipboard className="h-4 w-4" aria-hidden="true" /> Copiar log completo</button><button type="button" disabled={result.errorCount === 0} onClick={() => void copy(studentMigrationIssuesLogText(result), 'Log de erros copiado para a área de transferência.')} className="inline-flex items-center gap-2 rounded-md border border-rose-300 px-3 py-2 text-xs font-bold text-rose-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-800 dark:text-rose-300"><Clipboard className="h-4 w-4" aria-hidden="true" /> Copiar erros/pendências</button></div><pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-md bg-slate-950 p-4 text-xs text-slate-200">{studentMigrationLogText(result)}</pre>{result.errorCount > 0 && <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap rounded-md bg-rose-950 p-4 text-xs text-rose-100">{studentMigrationIssuesLogText(result)}</pre>}{clipboardMessage && <p role="status" className="mt-2 text-sm text-slate-600 dark:text-slate-300">{clipboardMessage}</p>}</div>}
        </section>}
      </>}

      {!parsed && <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"><TriangleAlert className="mb-2 h-5 w-5 text-amber-500" aria-hidden="true" />Nenhum dado é gravado durante a leitura ou a prévia. Escolha um arquivo para começar.</div>}
    </div>
  );
}

function formatLineReferences(lines: readonly number[]) {
  const sortedLines = Array.from(new Set(lines)).sort((a, b) => a - b);
  if (!sortedLines.length) return '';

  const references: string[] = [];
  let rangeStart = sortedLines[0];
  let rangeEnd = sortedLines[0];
  sortedLines.slice(1).forEach((line) => {
    if (line === rangeEnd + 1) {
      rangeEnd = line;
      return;
    }
    references.push(rangeStart === rangeEnd ? String(rangeStart) : `${rangeStart}-${rangeEnd}`);
    rangeStart = line;
    rangeEnd = line;
  });
  references.push(rangeStart === rangeEnd ? String(rangeStart) : `${rangeStart}-${rangeEnd}`);
  return references.join(', ');
}

function Summary({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'success' | 'warning' }) {
  const color = tone === 'success' ? 'text-emerald-600' : tone === 'warning' ? 'text-amber-600' : 'text-slate-900 dark:text-white';
  return <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950"><p className="text-xs text-slate-500 dark:text-slate-400">{label}</p><p className={`mt-1 text-lg font-extrabold ${color}`}>{value}</p></div>;
}

function Mapping({ title, values, tone = 'success', mapping = false }: { title: string; values: readonly string[]; tone?: 'success' | 'warning' | 'danger'; mapping?: boolean }) {
  const color = tone === 'success' ? 'text-emerald-700 dark:text-emerald-300' : tone === 'warning' ? 'text-amber-700 dark:text-amber-300' : 'text-rose-700 dark:text-rose-300';
  return <div><h3 className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">{title}</h3><div className={`mt-1 text-xs leading-6 ${color}`}>{values.length ? values.map((value) => <div key={value}>{value}{mapping ? ` → ${STUDENT_MIGRATION_DESTINATIONS[value as keyof typeof STUDENT_MIGRATION_DESTINATIONS]}` : ''}</div>) : 'Nenhuma'}</div></div>;
}

function PreviewRow({ row }: { row: StudentMigrationRow }) {
  const ignoredValues = STUDENT_MIGRATION_COLUMNS.filter((column) => row.values[column] && ['REF', 'Software', 'CURSO', 'TURNO', 'INÍCIO', 'TÉMINO', 'LOCAL', 'MAT.'].includes(column)).map((column) => `${column}: ${row.values[column]}`).join(' · ');
  return <tr className="border-t border-slate-200 dark:border-slate-800"><td className="px-3 py-2 font-semibold">{row.line}</td><td className="px-3 py-2">{row.normalized.turma || '—'} / {row.normalized.anac || '—'}</td><td className="px-3 py-2">{row.normalized.nome || '—'}</td><td className="px-3 py-2">{row.normalized.cpf || '—'}</td><td className="px-3 py-2">{row.normalized.percentualPresenca ?? '—'}</td><td className="px-3 py-2">{row.normalized.nota1Chamada ?? '—'} / {row.normalized.nota2Chamada === null ? 'null' : row.normalized.nota2Chamada}</td><td className="px-3 py-2">{row.normalized.statusResultado ?? '—'} / {row.normalized.statusResultadoFinal ?? '—'}</td><td className="px-3 py-2">{row.values.Empresa || '—'}{row.warnings.length > 0 && <div className="mt-1 font-semibold text-amber-700 dark:text-amber-300">{row.warnings.join(' ')}</div>}</td><td className="max-w-xs px-3 py-2 text-slate-500 dark:text-slate-400">{ignoredValues || '—'}</td><td className={`px-3 py-2 font-semibold ${row.valid ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>{row.valid ? 'Válida' : `Descartada: ${row.problems.join(' ')}`}</td></tr>;
}
