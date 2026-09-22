import { CalendarDays, FileText, History, LoaderCircle, X } from 'lucide-react';
import { SlidePanel } from './ui/SlidePanel';
import { useStudentMigrationHistory } from '../hooks/useStudentMigrationHistory';
import type { StudentMigrationHistoryRecord } from '../services/studentMigrationHistoryService';

interface StudentMigrationHistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectClass: (turmaId: string) => void;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

function HistoryCard({ record, onSelect }: { record: StudentMigrationHistoryRecord; onSelect: (turmaId: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(record.turma_id)}
      className="w-full rounded-lg border border-slate-200 bg-white p-4 text-left transition hover:border-teal-500 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-teal-500"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-teal-700 dark:text-teal-300">Turma</p>
          <p className="mt-1 font-bold text-slate-900 dark:text-white">ID interno: {record.id_interno_escola}</p>
          <p className="text-sm text-slate-600 dark:text-slate-300">ANAC: {record.id_anac}</p>
        </div>
        <span className="rounded-full bg-teal-50 px-2 py-1 text-xs font-bold text-teal-700 dark:bg-teal-950/40 dark:text-teal-300">
          {record.alunos_importados} {record.alunos_importados === 1 ? 'aluno' : 'alunos'}
        </span>
      </div>
      <div className="mt-4 space-y-2 text-xs text-slate-600 dark:text-slate-400">
        <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4" aria-hidden="true" /> {formatDate(record.created_at)}</p>
        {record.source_file && <p className="flex min-w-0 items-center gap-2"><FileText className="h-4 w-4 shrink-0" aria-hidden="true" /><span className="truncate">Arquivo: {record.source_file}</span></p>}
      </div>
    </button>
  );
}

export default function StudentMigrationHistoryPanel({ isOpen, onClose, onSelectClass }: StudentMigrationHistoryPanelProps) {
  const { history, isLoading, isError, error } = useStudentMigrationHistory(isOpen);

  return (
    <SlidePanel isOpen={isOpen} onClose={onClose} maxWidth="max-w-lg" ariaLabelledBy="student-migration-history-title">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <History className="h-5 w-5 text-teal-600" aria-hidden="true" />
          <h2 id="student-migration-history-title" className="text-lg font-bold text-slate-900 dark:text-white">Histórico de migrações</h2>
        </div>
        <button type="button" onClick={onClose} aria-label="Fechar histórico" className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 dark:hover:bg-slate-800 dark:hover:text-slate-200">
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        {isLoading && <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300" role="status"><LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> Carregando histórico…</div>}
        {isError && <p role="alert" className="rounded-md bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">{error instanceof Error ? error.message : 'Não foi possível carregar o histórico das migrações.'}</p>}
        {!isLoading && !isError && history.length === 0 && <div className="rounded-md border border-dashed border-slate-300 p-5 text-center text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">Nenhuma turma recebeu alunos em uma migração salva.</div>}
        {!isLoading && !isError && history.length > 0 && <div className="space-y-3">{history.map((record) => <HistoryCard key={record.id} record={record} onSelect={onSelectClass} />)}</div>}
      </div>
    </SlidePanel>
  );
}
