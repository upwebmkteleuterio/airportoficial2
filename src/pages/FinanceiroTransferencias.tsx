import { useEffect, useState, type FormEvent } from 'react';
import { ArrowRightLeft, HelpCircle, Info, Plus, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '../components/ui/Button';
import { ConfirmDeleteModal } from '../components/ui/ConfirmDeleteModal';
import { HelpModal } from '../components/ui/HelpModal';
import { SlidePanel as Modal } from '../components/ui/SlidePanel';
import { QueryErrorState } from '../components/ui/QueryErrorState';
import { TableSkeleton } from '../components/ui/FinanceiroSkeleton';
import { PaginationFooter } from '../components/ui/PaginationFooter';
import { MoneyInput } from '../components/ui/MoneyInput';
import { FinanceiroOptionsLimitWarning } from '../components/financeiro/FinanceiroOptionsLimitWarning';
import { useBancos } from '../hooks/useBancos';
import { useTransferencias } from '../hooks/useTransferencias';
import type { TransferenciaEntreContas } from '../types/financeiro';
import { primeiroDiaDoMes, ultimoDiaDoMes } from '../utils/dateRange';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const pageSize = 20;
const focusClass = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-1';
const inputClass = `w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-slate-800 ${focusClass} dark:border-slate-700 dark:bg-slate-900 dark:text-white`;
const labelClass = 'mb-1 block text-xs font-bold uppercase text-gray-700 dark:text-slate-300';

type TransferenciaForm = { origem_id: string; destino_id: string; valor: string; data: string; observacoes: string };

function dataLocalHoje(): string {
  const data = new Date();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${data.getFullYear()}-${mes}-${dia}`;
}

function novaTransferenciaForm(): TransferenciaForm {
  return { origem_id: '', destino_id: '', valor: '', data: dataLocalHoje(), observacoes: '' };
}

function formatarData(value: string): string {
  const [ano, mes, dia] = value.split('-');
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : value;
}

export default function FinanceiroTransferencias() {
  const [page, setPage] = useState(1);
  const [dateFrom, setDateFrom] = useState(primeiroDiaDoMes);
  const [dateTo, setDateTo] = useState(ultimoDiaDoMes);
  const [modalOpen, setModalOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [form, setForm] = useState<TransferenciaForm>(novaTransferenciaForm);
  const [editing, setEditing] = useState<TransferenciaEntreContas | null>(null);
  const [deleting, setDeleting] = useState<TransferenciaEntreContas | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const { contas, optionsTruncated } = useBancos();
  const {
    transferencias,
    total,
    isLoading,
    isFetching,
    isError,
    criarTransferencia,
    atualizarTransferencia,
    excluirTransferencia,
    isCreating,
    isUpdating,
    isDeleting,
  } = useTransferencias({ page, pageSize, dateFrom, dateTo });
  const queryClient = useQueryClient();
  const saving = isCreating || isUpdating;
  const contasAtivas = contas.filter((conta) => conta.ativo);

  useEffect(() => setPage(1), [dateFrom, dateTo]);
  useEffect(() => {
    if (!isLoading && page > 1 && transferencias.length === 0) setPage((current) => current - 1);
  }, [page, isLoading, transferencias.length]);

  const openForm = (transferencia?: TransferenciaEntreContas) => {
    setEditing(transferencia ?? null);
    setForm(transferencia ? {
      origem_id: transferencia.conta_origem_id,
      destino_id: transferencia.conta_destino_id,
      valor: String(transferencia.valor),
      data: transferencia.data,
      observacoes: transferencia.observacoes,
    } : novaTransferenciaForm());
    setErrorMessage('');
    setModalOpen(true);
  };
  const closeForm = () => { if (!saving) setModalOpen(false); };

  const clearFilters = () => {
    setDateFrom(primeiroDiaDoMes());
    setDateTo(ultimoDiaDoMes());
    setPage(1);
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setErrorMessage('');
    const valor = Number(form.valor);
    if (!editing && form.origem_id === form.destino_id) {
      setErrorMessage('Selecione contas de origem e destino diferentes.');
      return;
    }
    if (!form.origem_id || !form.destino_id) {
      setErrorMessage('Informe a conta de origem e a conta de destino.');
      return;
    }
    if (!Number.isFinite(valor) || valor <= 0) {
      setErrorMessage('Informe um valor maior que zero.');
      return;
    }
    if (!form.data) {
      setErrorMessage('Informe a data da transferência.');
      return;
    }
    try {
      if (editing) {
        await atualizarTransferencia({ id: editing.id, valor, data: form.data, observacoes: form.observacoes.trim() });
      } else {
        await criarTransferencia({ origem_id: form.origem_id, destino_id: form.destino_id, valor, data: form.data, observacoes: form.observacoes.trim() });
      }
      setModalOpen(false);
      setEditing(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Não foi possível salvar a transferência.');
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setErrorMessage('');
    try {
      await excluirTransferencia(deleting.id);
      setDeleting(null);
    } catch (error) {
      setDeleting(null);
      setErrorMessage(error instanceof Error ? error.message : 'Não foi possível excluir a transferência.');
    }
  };

  return (
    <div className="flex-1 flex flex-col p-6 gap-6 overflow-y-auto">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 shrink-0">
        <div><h2 className="font-display text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white leading-tight">Transferências entre contas</h2><p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Movimente valores de uma conta para outra sem alterar o resultado do período.</p></div>
        <div className="flex items-center gap-2"><Button variant="secondary" type="button" onClick={() => setHelpOpen(true)} icon={<HelpCircle className="w-4 h-4" aria-hidden="true"/>} aria-label="Ajuda" className={focusClass}>Ajuda</Button><button type="button" data-testid="nova-transferencia-button" onClick={() => openForm()} className={`flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-850 dark:bg-teal-600 dark:hover:bg-teal-500 ${focusClass}`}><Plus className="h-4 w-4" aria-hidden="true"/>Nova transferência</button></div>
      </div>
      {errorMessage && !modalOpen && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">{errorMessage}</p>}
      <FinanceiroOptionsLimitWarning visible={optionsTruncated}/>
      <p className="flex items-start gap-2 rounded-xl border border-teal-100 bg-teal-50/60 p-3 text-xs text-teal-800 dark:border-teal-900/40 dark:bg-teal-950/20 dark:text-teal-200"><Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true"/>Cada transferência gera dois lançamentos efetivados: uma saída na conta de origem e uma entrada na conta de destino, na categoria de sistema “Transferência entre contas”.</p>
      <section aria-label="Filtros de transferências" className="grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-3 dark:border-slate-800 dark:bg-slate-900">
        <div><label className={labelClass} htmlFor="transferencia-date-from">De</label><input id="transferencia-date-from" type="date" className={inputClass} value={dateFrom} onChange={(event) => setDateFrom(event.target.value || primeiroDiaDoMes())}/></div>
        <div><label className={labelClass} htmlFor="transferencia-date-to">Até</label><input id="transferencia-date-to" type="date" className={inputClass} value={dateTo} onChange={(event) => setDateTo(event.target.value || ultimoDiaDoMes())}/></div>
        <div className="flex items-end"><Button type="button" variant="secondary" onClick={clearFilters} className={`w-full py-2 ${focusClass}`}>Limpar filtros</Button></div>
      </section>
      <QueryErrorState onRetry={() => void queryClient.invalidateQueries({ queryKey: ['transferencias-financeiras'] })} isRetrying={isFetching} isError={isError} isFetching={isFetching} isLoading={isLoading} message="Verifique sua conexão e tente novamente."/>
      <div className="flex min-h-[350px] flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {isFetching && !isLoading && <p role="status" className="px-4 py-2 text-xs text-gray-500 dark:text-slate-400">Atualizando...</p>}
        <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar">
          <table data-testid="transferencias-table" className="w-full min-w-[900px] table-fixed border-collapse text-left text-xs">
            <thead className="sticky top-0 z-10 border-b border-gray-200 bg-slate-50 font-bold uppercase tracking-wider text-gray-500 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-400"><tr><th className="w-12 px-2 py-3 text-center" aria-label="Ações"></th><th className="w-[20%] px-3 py-3">Origem</th><th className="w-[20%] px-3 py-3">Destino</th><th className="w-[13%] px-3 py-3 text-right">Valor</th><th className="w-[11%] px-3 py-3">Data</th><th className="w-[24%] px-3 py-3">Observações</th></tr></thead>
            <tbody className="divide-y divide-gray-150 text-gray-700 dark:divide-slate-800 dark:text-slate-200">
              {isLoading ? <TableSkeleton columns={6}/> : isError ? null : transferencias.length === 0 ? <tr><td colSpan={6} className="px-4 py-12 text-center font-sans text-gray-500"><div className="flex flex-col items-center gap-2.5"><div className="rounded-full bg-teal-500/10 p-3 text-teal-500"><ArrowRightLeft className="h-6 w-6" aria-hidden="true"/></div><p className="text-sm font-bold text-slate-800 dark:text-slate-200">Nenhuma transferência no período</p><p className="text-xs text-gray-400">Ajuste o período ou registre uma nova transferência.</p></div></td></tr> : transferencias.map((transferencia) => <tr key={transferencia.id} data-testid={`transferencia-row-${transferencia.id}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50"><td className="px-2 py-2 text-center"><div className="flex justify-center gap-2"><Button variant="secondary" type="button" data-testid={`editar-transferencia-${transferencia.id}`} disabled={saving || isDeleting} onClick={() => openForm(transferencia)}>Editar</Button><Button variant="secondary" type="button" data-testid={`excluir-transferencia-${transferencia.id}`} disabled={saving || isDeleting} onClick={() => { setErrorMessage(''); setDeleting(transferencia); }}>Excluir</Button></div></td><td className="px-3 py-2 font-sans font-semibold">{transferencia.conta_origem_nome}</td><td className="px-3 py-2 font-sans font-semibold">{transferencia.conta_destino_nome}</td><td className="px-3 py-2 text-right font-bold">{money.format(transferencia.valor)}</td><td className="px-3 py-2">{formatarData(transferencia.data)}</td><td className="px-3 py-2 font-sans">{transferencia.observacoes || '—'}</td></tr>)}
            </tbody>
          </table>
        </div>
        <PaginationFooter page={page} pageSize={pageSize} total={total} onPageChange={setPage} itemLabel="transferências"/>
      </div>
      <HelpModal isOpen={helpOpen} onClose={() => setHelpOpen(false)} title="Ajuda sobre Transferências" description="Transferência entre contas movimenta um valor de uma conta para outra sem mudar o resultado total do período." items={[{ title: 'Dois lançamentos', description: 'A transferência cria uma saída na conta de origem e uma entrada na conta de destino, ambas já efetivadas.', icon: <ArrowRightLeft className="h-4 w-4" aria-hidden="true"/> }, { title: 'Categoria do sistema', description: 'As duas pontas usam a categoria “Transferência entre contas”, mantida pelo sistema e que não pode ser alterada ou excluída.', icon: <Info className="h-4 w-4" aria-hidden="true"/> }, { title: 'Editar e excluir', description: 'Editar altera as duas pontas de uma vez. Excluir remove a transferência inteira.', icon: <Plus className="h-4 w-4" aria-hidden="true"/> }]}/>
      <Modal isOpen={modalOpen} onClose={closeForm} ariaLabelledBy="transferencia-form-title"><div className="flex h-full min-h-0 flex-col bg-white shadow-xl dark:bg-slate-900"><div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-gray-50 px-6 py-5 dark:border-slate-800 dark:bg-slate-850"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full border border-teal-100 bg-teal-50 dark:border-teal-900/20 dark:bg-teal-950/30"><ArrowRightLeft className="h-5 w-5 text-teal-600" aria-hidden="true"/></div><div><h2 id="transferencia-form-title" className="font-display text-lg font-bold leading-tight text-slate-900 dark:text-white">{editing ? 'Editar transferência' : 'Nova transferência'}</h2><p className="mt-0.5 text-[11px] text-gray-500 dark:text-slate-400">Movimente valores entre contas financeiras.</p></div></div><button type="button" onClick={closeForm} disabled={saving} aria-label="Fechar formulário" className={`rounded-full p-1 text-gray-500 hover:text-red-500 ${focusClass} disabled:opacity-50 dark:hover:text-red-400`}><X className="h-5 w-5" aria-hidden="true"/></button></div>
        <form onSubmit={(event) => void save(event)} className="flex min-h-0 flex-1 flex-col overflow-y-auto custom-scrollbar">
          <div className="flex-1 space-y-4 p-6">
            {editing ? <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><div><span className={labelClass}>Conta de origem</span><p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{editing.conta_origem_nome}</p></div><div><span className={labelClass}>Conta de destino</span><p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{editing.conta_destino_nome}</p></div></div> : <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><div><label htmlFor="transfer-origem" className={labelClass}>Conta de origem</label><select id="transfer-origem" data-testid="transfer-origem" required className={inputClass} value={form.origem_id} onChange={(event) => setForm((current) => ({ ...current, origem_id: event.target.value }))}><option value="">Selecione uma conta</option>{contasAtivas.map((conta) => <option key={conta.id} value={conta.id}>{conta.nome}</option>)}</select></div><div><label htmlFor="transfer-destino" className={labelClass}>Conta de destino</label><select id="transfer-destino" data-testid="transfer-destino" required className={inputClass} value={form.destino_id} onChange={(event) => setForm((current) => ({ ...current, destino_id: event.target.value }))}><option value="">Selecione uma conta</option>{contasAtivas.map((conta) => <option key={conta.id} value={conta.id}>{conta.nome}</option>)}</select></div></div>}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><div><label htmlFor="transfer-valor" className={labelClass}>Valor</label><MoneyInput id="transfer-valor" dataTestId="transfer-valor" className={inputClass} required value={form.valor} onChange={(valor) => setForm((current) => ({ ...current, valor }))}/></div><div><label htmlFor="transfer-data" className={labelClass}>Data</label><input id="transfer-data" data-testid="transfer-data" className={inputClass} type="date" required value={form.data} onChange={(event) => setForm((current) => ({ ...current, data: event.target.value }))}/></div></div>
            <div><label htmlFor="transfer-observacoes" className={labelClass}>Observações</label><textarea id="transfer-observacoes" data-testid="transfer-observacoes" className={inputClass} rows={3} value={form.observacoes} onChange={(event) => setForm((current) => ({ ...current, observacoes: event.target.value }))}/></div>
            {errorMessage && <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">{errorMessage}</p>}
          </div>
          <div className="sticky bottom-0 flex shrink-0 justify-end gap-3 border-t border-gray-200 bg-white px-6 py-4 shadow-md dark:border-slate-800 dark:bg-slate-900"><Button variant="secondary" type="button" onClick={closeForm} disabled={saving} className={focusClass}>Cancelar</Button><Button type="submit" disabled={saving} className={focusClass}>{saving ? 'Salvando...' : editing ? 'Atualizar' : 'Transferir'}</Button></div>
        </form></div></Modal>
      <ConfirmDeleteModal isOpen={deleting !== null} onClose={() => !isDeleting && setDeleting(null)} onConfirm={confirmDelete} itemName={deleting ? `${deleting.conta_origem_nome} para ${deleting.conta_destino_nome}` : undefined} descriptionOverride={deleting ? `A transferência de ${money.format(deleting.valor)} entre “${deleting.conta_origem_nome}” e “${deleting.conta_destino_nome}” será removida das duas contas.` : undefined} isPending={isDeleting}/>
    </div>
  );
}
