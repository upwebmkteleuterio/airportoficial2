import { useMemo, useState, type ChangeEvent, type ReactNode } from 'react';
import { CheckCircle2, Clipboard, FileSpreadsheet, LoaderCircle, Play, TriangleAlert, UploadCloud } from 'lucide-react';
import {
  MIGRATION_COLUMNS,
  MIGRATION_DESTINATIONS,
  migrationIssuesLogText,
  migrationLogText,
  parseMigrationFile,
  runMigrationBatch,
  type MigrationParseResult,
  type MigrationProgress,
  type MigrationRunResult,
} from '../services/migrationService';

const MAX_BATCH_SIZE = 1000;

function formatBrazilianDate(date: string): string {
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
}

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
  const [batchSize, setBatchSize] = useState(MAX_BATCH_SIZE);
  const [confirming, setConfirming] = useState(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<MigrationProgress | null>(null);
  const [runResult, setRunResult] = useState<MigrationRunResult | null>(null);
  const [parseError, setParseError] = useState('');
  const [clipboardMessage, setClipboardMessage] = useState('');

  const selectedRows = useMemo(() => parsed?.rows.slice(0, Math.min(batchSize, MAX_BATCH_SIZE, parsed.rows.length)) ?? [], [batchSize, parsed]);
  const numericDeadlineRows = parsed?.rows.filter((row) => row.prazoNumericDays !== undefined && row.prazoCalculatedDate) ?? [];
  const allProblems = parsed?.rows.reduce((total, row) => total + row.problems.length, 0) ?? 0;
  const allWarnings = parsed?.rows.reduce((total, row) => total + row.warnings.length, 0) ?? 0;
  const resultWarnings = runResult?.results.flatMap((result) => (result.warnings ?? []).map((warning) => `Linha ${result.line} · TURMA ${result.turma || '—'} · ANAC ${result.anac || '—'}: ${warning}`)) ?? [];
  const warningRows = parsed?.rows.filter((row) => row.warnings.length > 0) ?? [];
  const problemRows = parsed?.rows.filter((row) => row.problems.length > 0) ?? [];
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
      setBatchSize(Math.min(MAX_BATCH_SIZE, result.rows.length || 1));
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
      setClipboardMessage('Log completo copiado para a área de transferência.');
    } catch {
      setClipboardMessage('Não foi possível copiar o log. Verifique a permissão da área de transferência.');
    }
  };

  const copyIssuesLog = async () => {
    if (!runResult || runResult.errorCount === 0) return;
    try {
      await navigator.clipboard.writeText(migrationIssuesLogText(runResult));
      setClipboardMessage('Log de erros e pendências copiado para a área de transferência.');
    } catch {
      setClipboardMessage('Não foi possível copiar o log de erros. Verifique a permissão da área de transferência.');
    }
  };

  return (
    <main className="flex-1 min-h-0 overflow-y-auto bg-slate-50 px-4 py-6 dark:bg-slate-950 md:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-600 dark:text-teal-400">Operação controlada</p>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-white">Migração de turmas</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-400">Leia a planilha em memória, revise o mapeamento e execute somente um lote confirmado. Nenhum arquivo ou dado da planilha é persistido automaticamente.</p>
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
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <Summary label="Linhas lidas" value={String(parsed.rows.length)} />
                <Summary label="Colunas reconhecidas" value={`${parsed.recognized.length}/${MIGRATION_COLUMNS.length}`} />
                <Summary label="Problemas por linha" value={String(allProblems)} tone={allProblems ? 'warning' : 'success'} />
                <Summary label="Avisos de revisão" value={String(allWarnings)} tone={allWarnings ? 'warning' : 'success'} />
                <Summary label="Ignoradas explicitamente" value={parsed.ignored.length ? parsed.ignored.join(', ') : 'Nenhuma'} />
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-3">
                <MappingList title="Reconhecidas → destino" values={parsed.recognized} tone="success" mapping />
                <MappingList title="Ausentes" values={parsed.missing} tone="warning" />
                <MappingList title="Desconhecidas" values={parsed.unknown} tone="danger" />
              </div>
              {numericDeadlineRows.length > 0 && <section aria-labelledby="numeric-deadline-preview" className="mt-4 rounded-lg border border-sky-200 bg-sky-50 p-4 dark:border-sky-900 dark:bg-sky-950/30">
                <h3 id="numeric-deadline-preview" className="font-bold text-sky-900 dark:text-sky-200">Prévia dos prazos numéricos</h3>
                <p className="mt-1 text-sm text-sky-800 dark:text-sky-300">Valores numéricos em Prazo são interpretados como dias restantes a partir da data local desta leitura. Esta prévia é informativa e não altera a contagem de avisos de localização.</p>
                <div className="mt-3 overflow-x-auto rounded-md border border-sky-200 dark:border-sky-800">
                  <table className="min-w-full text-left text-xs">
                    <caption className="sr-only">Interpretação dos prazos numéricos antes da importação</caption>
                    <thead className="bg-sky-100 text-sky-900 dark:bg-sky-900/50 dark:text-sky-100"><tr><th className="px-3 py-2">Linha</th><th className="px-3 py-2">TURMA</th><th className="px-3 py-2">ANAC</th><th className="px-3 py-2">Dias originais</th><th className="px-3 py-2">Data de lançamento das notas</th></tr></thead>
                    <tbody>{numericDeadlineRows.map((row) => row.prazoNumericDays !== undefined && row.prazoCalculatedDate ? <tr key={row.line} className="border-t border-sky-200 text-sky-950 dark:border-sky-800 dark:text-sky-100"><td className="px-3 py-2 font-semibold">{row.line}</td><td className="px-3 py-2">{row.values.TURMA || '—'}</td><td className="px-3 py-2">{row.values.ANAC || '—'}</td><td className="px-3 py-2">{row.prazoNumericDays}</td><td className="px-3 py-2 font-semibold">{formatBrazilianDate(row.prazoCalculatedDate)}</td></tr> : null)}</tbody>
                  </table>
                </div>
              </section>}
              <p className="mt-4 rounded-md bg-slate-100 p-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">PASTA, CÓPIA TURMA e referência são explicitamente ignoradas e não serão gravadas, estejam ou não presentes no arquivo.</p>
              <p className="mt-3 rounded-md border border-teal-200 bg-teal-50 p-3 text-sm text-teal-800 dark:border-teal-900 dark:bg-teal-950/30 dark:text-teal-200"><strong>Conciliação automática na confirmação:</strong> cada linha válida procura curso por nome normalizado (acentos, caixa e espaços). Se o curso não existir, ele será criado com a carga de H/a e reutilizado nas linhas seguintes do lote. Endereços e pessoas também são localizados ou criados uma vez; correspondências ambíguas permanecem pendentes. A decisão efetiva aparece no acompanhamento e no log.</p>
              {allWarnings > 0 && <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200"><strong>Avisos não bloqueantes:</strong> campos de localização ausentes receberam valores padrão e permanecem destacados por linha para revisão manual antes ou depois da gravação.</p>}
              {parsed.duplicateHeaders.length > 0 && <p role="alert" className="mt-4 rounded-md bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">Cabeçalhos duplicados impedem o lote: {parsed.duplicateHeaders.join(', ')}.</p>}

              <div className="mt-5 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                <table className="min-w-full text-left text-xs">
                  <caption className="sr-only">Amostra das primeiras linhas da planilha</caption>
                  <thead className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"><tr><th className="px-3 py-2">Linha</th><th className="px-3 py-2">TURMA</th><th className="px-3 py-2">ANAC</th><th className="px-3 py-2">Curso</th><th className="px-3 py-2">INÍCIO</th><th className="px-3 py-2">TÉRMINO</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Avisos de revisão</th><th className="px-3 py-2">Problemas</th></tr></thead>
                  <tbody>{parsed.rows.slice(0, 10).map((row) => <tr key={row.line} className="border-t border-slate-200 dark:border-slate-800"><td className="px-3 py-2 font-semibold">{row.line}</td><td className="px-3 py-2">{row.values.TURMA}</td><td className="px-3 py-2">{row.values.ANAC}</td><td className="px-3 py-2">{row.values.Curso}</td><td className="px-3 py-2">{row.values['INÍCIO']}</td><td className="px-3 py-2">{row.values['TÉRMINO']}</td><td className="px-3 py-2">{row.values.Status}</td><td className="max-w-xs px-3 py-2 text-amber-700 dark:text-amber-300">{row.warnings.join(' ') || 'Nenhum'}</td><td className="max-w-xs px-3 py-2 text-rose-700 dark:text-rose-300">{row.problems.join(' ') || 'Nenhum'}</td></tr>)}</tbody>
                </table>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <ReviewPanel
                  title="Avisos de revisão — não bloqueantes"
                  rows={warningRows}
                  messageCount={allWarnings}
                  emptyMessage="Nenhum aviso de revisão nesta planilha."
                  tone="warning"
                />
                <ReviewPanel
                  title="Problemas por linha — bloqueantes"
                  rows={problemRows}
                  messageCount={allProblems}
                  emptyMessage="Nenhum problema bloqueante nesta planilha."
                  tone="danger"
                />
              </div>
            </Section>

            <Section title="3. Selecionar lote">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Quantidade de linhas a gravar (máximo {Math.min(MAX_BATCH_SIZE, parsed.rows.length)})
                  <input type="number" min={parsed.rows.length ? 1 : 0} max={Math.min(MAX_BATCH_SIZE, parsed.rows.length)} value={Math.min(batchSize, MAX_BATCH_SIZE, parsed.rows.length)} onChange={(event) => setBatchSize(Math.max(1, Math.min(MAX_BATCH_SIZE, parsed.rows.length, Number(event.target.value) || 1)))} disabled={running || parsed.rows.length === 0} className="mt-2 block w-36 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
                </label>
                <p className="max-w-xl text-xs text-slate-500 dark:text-slate-400">Somente as primeiras {selectedRows.length} linhas selecionadas serão gravadas. Depois da confirmação, cursos, endereços e pessoas serão conciliados por chave normalizada: registros existentes serão localizados e os ausentes serão criados uma vez e reutilizados. Linhas inválidas e entidades ambíguas permanecem pendentes.</p>
              </div>
              {confirming && <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/20"><p className="font-bold text-amber-900 dark:text-amber-200">Confirme o lote antes de gravar</p><p className="mt-1 text-sm text-amber-800 dark:text-amber-300">Você está prestes a processar {selectedRows.length} linha(s). A execução criará apenas os registros conciliados e continuará após erros individuais.</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => void executeBatch()} className="inline-flex items-center gap-2 rounded-md bg-teal-700 px-4 py-2 text-sm font-bold text-white hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-500"><CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Confirmar e iniciar lote</button><button type="button" onClick={() => setConfirming(false)} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold dark:border-slate-700">Voltar</button></div></div>}
              <button type="button" onClick={prepareBatch} disabled={running || !selectedRows.length || hasBlockingFileIssue} className="mt-4 inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-teal-700 dark:hover:bg-teal-600"><Play className="h-4 w-4" aria-hidden="true" /> Revisar e confirmar lote</button>
            </Section>

            {(running || progress || runResult) && <Section title="4. Acompanhamento e logs">
              {progress && <div aria-live="polite"><div className="mb-2 flex justify-between text-sm font-semibold"><span>Etapa: {progress.stage} — {progress.message}</span><span>{progress.current}/{progress.total} ({progress.percent}%)</span></div><div className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"><div className={`h-full transition-all ${progress.stage === 'erro' ? 'bg-rose-600' : 'bg-teal-600'}`} style={{ width: `${progress.percent}%` }} /></div></div>}
              {running && <p className="mt-4 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"><LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> Processando linha a linha. O botão permanece desabilitado durante a execução.</p>}
              {runResult && <div className="mt-4">
                <div className="grid gap-3 sm:grid-cols-3"><Summary label="Sucessos" value={String(runResult.successCount)} tone="success" /><Summary label="Erros/pendências" value={String(runResult.errorCount)} tone={runResult.errorCount ? 'warning' : 'success'} /><Summary label="Total processado" value={String(runResult.results.length)} /></div>
                {resultWarnings.length > 0 && <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200"><h3 className="font-bold">Avisos de revisão (não bloqueantes)</h3><ul className="mt-2 list-disc space-y-1 pl-5">{resultWarnings.map((warning, index) => <li key={`${warning}-${index}`}>{warning}</li>)}</ul></div>}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">Logs do lote</h3><div className="flex flex-wrap gap-2"><button type="button" onClick={() => void copyLog()} className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-xs font-bold dark:border-slate-700"><Clipboard className="h-4 w-4" aria-hidden="true" /> Copiar log completo</button><button type="button" onClick={() => void copyIssuesLog()} disabled={runResult.errorCount === 0} className="inline-flex items-center gap-2 rounded-md border border-rose-300 px-3 py-2 text-xs font-bold text-rose-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-800 dark:text-rose-300"><Clipboard className="h-4 w-4" aria-hidden="true" /> Copiar erros/pendências</button></div></div>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{runResult.errorCount === 0 ? 'Não há erros ou pendências para copiar.' : 'O log de erros/pendências contém somente as linhas que não foram concluídas.'}</p>
                <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-md bg-slate-950 p-4 text-xs text-slate-200">{migrationLogText(runResult)}</pre>
                {runResult.errorCount > 0 && <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap rounded-md bg-rose-950 p-4 text-xs text-rose-100">{migrationIssuesLogText(runResult)}</pre>}
                {clipboardMessage && <p role="status" className="mt-2 text-sm text-slate-600 dark:text-slate-300">{clipboardMessage}</p>}
              </div>}
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

function ReviewPanel({
  title,
  rows,
  messageCount,
  emptyMessage,
  tone,
}: {
  title: string;
  rows: MigrationParseResult['rows'];
  messageCount: number;
  emptyMessage: string;
  tone: 'warning' | 'danger';
}) {
  const panelClasses = tone === 'warning'
    ? 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30'
    : 'border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/30';
  const headingClasses = tone === 'warning'
    ? 'text-amber-900 dark:text-amber-200'
    : 'text-rose-900 dark:text-rose-200';
  const messageClasses = tone === 'warning'
    ? 'text-amber-800 dark:text-amber-200'
    : 'text-rose-800 dark:text-rose-200';

  return (
    <section aria-labelledby={`${tone}-review-heading`} className={`rounded-lg border p-4 ${panelClasses}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 id={`${tone}-review-heading`} className={`font-bold ${headingClasses}`}>{title}</h3>
        <p className={`text-xs font-semibold ${messageClasses}`}>
          {messageCount} {messageCount === 1 ? 'mensagem' : 'mensagens'} · {rows.length} {rows.length === 1 ? 'linha' : 'linhas'}
        </p>
      </div>
      {rows.length ? (
        <ul className="mt-3 max-h-80 list-none space-y-3 overflow-y-auto pr-2" aria-label={title}>
          {rows.map((row) => (
            <li key={row.line} className="rounded-md border border-current/15 bg-white/70 p-3 text-sm dark:bg-slate-950/30">
              <p className={`font-bold ${headingClasses}`}>
                Linha {row.line} · TURMA {row.values.TURMA || '—'} · ANAC {row.values.ANAC || '—'}
              </p>
              <ul className={`mt-2 list-disc space-y-1 pl-5 ${messageClasses}`}>
                {(tone === 'warning' ? row.warnings : row.problems).map((message, index) => (
                  <li key={`${row.line}-${index}`} className="break-words whitespace-normal">{message}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      ) : (
        <p className={`mt-3 text-sm ${messageClasses}`}>{emptyMessage}</p>
      )}
    </section>
  );
}