import { useMemo, useState, type ChangeEvent, type ReactNode } from 'react';
import { CheckCircle2, Clipboard, FileSpreadsheet, LoaderCircle, Play, TriangleAlert, UploadCloud } from 'lucide-react';
import {
  MIGRATION_COLUMNS,
  MIGRATION_DESTINATIONS,
  migrationLogText,
  parseMigrationFile,
  runMigrationBatch,
  type MigrationParseResult,
  type MigrationProgress,
  type MigrationRunResult,
} from '../services/migrationService';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-slate-200">{title}</h2>
      {children}
    </section>
  );
}

export default function Migration() {
  const [parsed, setParsed] = useState<MigrationParseResult | null>(null);
  const [fileName, setFileName] = useState('');
  const [batchSize, setBatchSize] = useState(10);
  const [confirming, setConfirming] = useState(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<MigrationProgress | null>(null);
  const [runResult, setRunResult] = useState<MigrationRunResult | null>(null);
  const [parseError, setParseError] = useState('');
  const [clipboardMessage, setClipboardMessage] = useState('');

  const selectedRows = useMemo(() => parsed?.rows.slice(0, Math.min(batchSize, parsed.rows.length)) ?? [], [batchSize, parsed]);
  const allProblems = parsed?.rows.reduce((total, row) => total + row.problems.length, 0) ?? 0;
  const hasBlockingFileIssue = Boolean(parsed && (parsed.duplicateHeaders.length > 0 || parsed.recognized.length === 0));

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setParseError('');
    setRunResult(null);
    setConfirming(false);
    try {
      const result = await parseMigrationFile(file);
      setParsed(result);
      setFileName(file.name);
      setBatchSize(Math.min(10, result.rows.length || 1));
    } catch (error) {
      setParsed(null);
      setFileName('');
      setParseError(error instanceof Error ? error.message : 'Não foi possível ler o arquivo.');
    }
    event.target.value = '';
  };

  const prepareBatch = () => {
    if (!parsed || selectedRows.length === 0 || hasBlockingFileIssue) return;
    setConfirming(true);
    setRunResult(null);
  };

  const executeBatch = async () => {
    if (!parsed || selectedRows.length === 0 || running) return;
    setRunning(true);
    setConfirming(false);
    setClipboardMessage('');
    try {
      const result = await runMigrationBatch(selectedRows, setProgress);
      setRunResult(result);
    } catch (error) {
      setRunResult({ results: [{ line: 0, status: 'erro', message: error instanceof Error ? error.message : 'Não foi possível iniciar o lote.' }], successCount: 0, errorCount: selectedRows.length });
    } finally {
      setRunning(false);
    }
  };

  const copyLog = async () => {
    if (!runResult) return;
    try {
      await navigator.clipboard.writeText(migrationLogText(runResult));
      setClipboardMessage('Log copiado para a área de transferência.');
    } catch {
      setClipboardMessage('Não foi possível copiar o log. Verifique a permissão da área de transferência.');
    }
  };

  return (
    <main className="min-h-full bg-slate-50 px-4 py-6 dark:bg-slate-950 md:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-600 dark:text-teal-400">Operação controlada</p>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-white">Migração de turmas</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-400">Leia a planilha em memória, revise o mapeamento e execute somente um lote piloto confirmado. Nenhum arquivo ou dado da planilha é persistido automaticamente.</p>
        </header>

        <Section title="1. Selecionar arquivo">
          <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-4 text-center transition hover:border-teal-500 dark:border-slate-700 dark:bg-slate-950">
            <UploadCloud className="mb-2 h-8 w-8 text-teal-600" aria-hidden="true" />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Escolher XLSX, XLS ou CSV</span>
            <span className="mt-1 text-xs text-slate-500">CSV com separadores comuns é detectado pela biblioteca XLSX.</span>
            <input className="sr-only" type="file" accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv" onChange={(event) => void handleFile(event)} />
          </label>
          {fileName && <p className="mt-3 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"><FileSpreadsheet className="h-4 w-4 text-teal-600" aria-hidden="true" /> {fileName}</p>}
          {parseError && <p role="alert" className="mt-3 rounded-md bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">{parseError}</p>}
        </Section>

        {parsed && (
          <>
            <Section title="2. Mapeamento e validação">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Summary label="Linhas lidas" value={String(parsed.rows.length)} />
                <Summary label="Colunas reconhecidas" value={`${parsed.recognized.length}/${MIGRATION_COLUMNS.length}`} />
                <Summary label="Problemas por linha" value={String(allProblems)} tone={allProblems ? 'warning' : 'success'} />
                <Summary label="Ignoradas explicitamente" value={parsed.ignored.length ? parsed.ignored.join(', ') : 'Nenhuma'} />
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-3">
                <MappingList title="Reconhecidas → destino" values={parsed.recognized} tone="success" mapping />
                <MappingList title="Ausentes" values={parsed.missing} tone="warning" />
                <MappingList title="Desconhecidas" values={parsed.unknown} tone="danger" />
              </div>
              <p className="mt-4 rounded-md bg-slate-100 p-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">PASTA, CÓPIA TURMA e referência são explicitamente ignoradas e não serão gravadas, estejam ou não presentes no arquivo.</p>
              {parsed.duplicateHeaders.length > 0 && <p role="alert" className="mt-4 rounded-md bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">Cabeçalhos duplicados impedem o piloto: {parsed.duplicateHeaders.join(', ')}.</p>}

              <div className="mt-5 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                <table className="min-w-full text-left text-xs">
                  <caption className="sr-only">Amostra das primeiras linhas da planilha</caption>
                  <thead className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"><tr><th className="px-3 py-2">Linha</th><th className="px-3 py-2">TURMA</th><th className="px-3 py-2">ANAC</th><th className="px-3 py-2">Curso</th><th className="px-3 py-2">INÍCIO</th><th className="px-3 py-2">TÉRMINO</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Problemas</th></tr></thead>
                  <tbody>{parsed.rows.slice(0, 10).map((row) => <tr key={row.line} className="border-t border-slate-200 dark:border-slate-800"><td className="px-3 py-2 font-semibold">{row.line}</td><td className="px-3 py-2">{row.values.TURMA}</td><td className="px-3 py-2">{row.values.ANAC}</td><td className="px-3 py-2">{row.values.Curso}</td><td className="px-3 py-2">{row.values['INÍCIO']}</td><td className="px-3 py-2">{row.values['TÉRMINO']}</td><td className="px-3 py-2">{row.values.Status}</td><td className="max-w-xs px-3 py-2 text-rose-700 dark:text-rose-300">{row.problems.join(' ') || 'Nenhum'}</td></tr>)}</tbody>
                </table>
              </div>
            </Section>

            <Section title="3. Lote piloto">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Quantidade de linhas a gravar (máximo {parsed.rows.length})
                  <input type="number" min={parsed.rows.length ? 1 : 0} max={parsed.rows.length} value={Math.min(batchSize, parsed.rows.length)} onChange={(event) => setBatchSize(Math.max(1, Math.min(parsed.rows.length, Number(event.target.value) || 1)))} disabled={running || parsed.rows.length === 0} className="mt-2 block w-36 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
                </label>
                <p className="max-w-xl text-xs text-slate-500 dark:text-slate-400">Somente as primeiras {selectedRows.length} linhas selecionadas serão gravadas. Cursos não encontrados continuam pendentes; pessoas e endereços novos só são criados depois da confirmação.</p>
              </div>
              {confirming && <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/20"><p className="font-bold text-amber-900 dark:text-amber-200">Confirme o piloto antes de gravar</p><p className="mt-1 text-sm text-amber-800 dark:text-amber-300">Você está prestes a processar {selectedRows.length} linha(s). A execução criará apenas os registros conciliados e continuará após erros individuais.</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => void executeBatch()} className="inline-flex items-center gap-2 rounded-md bg-teal-700 px-4 py-2 text-sm font-bold text-white hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-500"><CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Confirmar e iniciar piloto</button><button type="button" onClick={() => setConfirming(false)} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold dark:border-slate-700">Voltar</button></div></div>}
              <button type="button" onClick={prepareBatch} disabled={running || !selectedRows.length || hasBlockingFileIssue} className="mt-4 inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-teal-700 dark:hover:bg-teal-600"><Play className="h-4 w-4" aria-hidden="true" /> Revisar e confirmar lote</button>
            </Section>

            {(running || progress || runResult) && <Section title="4. Acompanhamento e logs">
              {progress && <div aria-live="polite"><div className="mb-2 flex justify-between text-sm font-semibold"><span>Etapa: {progress.stage} — {progress.message}</span><span>{progress.current}/{progress.total} ({progress.percent}%)</span></div><div className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"><div className={`h-full transition-all ${progress.stage === 'erro' ? 'bg-rose-600' : 'bg-teal-600'}`} style={{ width: `${progress.percent}%` }} /></div></div>}
              {running && <p className="mt-4 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"><LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> Processando linha a linha. O botão permanece desabilitado durante a execução.</p>}
              {runResult && <div className="mt-4"><div className="grid gap-3 sm:grid-cols-3"><Summary label="Sucessos" value={String(runResult.successCount)} tone="success" /><Summary label="Erros/pendências" value={String(runResult.errorCount)} tone={runResult.errorCount ? 'warning' : 'success'} /><Summary label="Total processado" value={String(runResult.results.length)} /></div><div className="mt-4 flex items-center justify-between gap-3"><h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">Log do lote</h3><button type="button" onClick={() => void copyLog()} className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-xs font-bold dark:border-slate-700"><Clipboard className="h-4 w-4" aria-hidden="true" /> Copiar log</button></div><pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-md bg-slate-950 p-4 text-xs text-slate-200">{migrationLogText(runResult)}</pre>{clipboardMessage && <p role="status" className="mt-2 text-sm text-slate-600 dark:text-slate-300">{clipboardMessage}</p>}</div>}
            </Section>}
          </>
        )}

        {!parsed && <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"><TriangleAlert className="mb-2 h-5 w-5 text-amber-500" aria-hidden="true" />Nenhum dado é gravado durante a leitura ou a prévia. Escolha um arquivo para começar.</div>}
      </div>
    </main>
  );
}

function Summary({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'success' | 'warning' }) {
  const color = tone === 'success' ? 'text-emerald-600' : tone === 'warning' ? 'text-amber-600' : 'text-slate-900 dark:text-white';
  return <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950"><p className="text-xs text-slate-500 dark:text-slate-400">{label}</p><p className={`mt-1 text-lg font-extrabold ${color}`}>{value}</p></div>;
}

function MappingList({ title, values, tone, mapping = false }: { title: string; values: readonly string[] | string[]; tone: 'success' | 'warning' | 'danger'; mapping?: boolean }) {
  const colors = tone === 'success' ? 'text-emerald-700 dark:text-emerald-300' : tone === 'warning' ? 'text-amber-700 dark:text-amber-300' : 'text-rose-700 dark:text-rose-300';
  return <div><h3 className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">{title}</h3><div className={`mt-1 text-xs leading-6 ${colors}`}>{values.length ? values.map((value) => <div key={value}>{value}{mapping ? ` → ${MIGRATION_DESTINATIONS[value as keyof typeof MIGRATION_DESTINATIONS]}` : ''}</div>) : 'Nenhuma'}</div></div>;
}