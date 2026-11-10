import { useEffect, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { Button } from '../ui/Button';
import { SlidePanel } from '../ui/SlidePanel';
import type { VendaComRelacoes } from '../../types/financeiro';

const inputClass = 'w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white';

export function CancelarVendaModal({ isOpen, onClose, onConfirm, isPending, venda }: { isOpen: boolean; onClose: () => void; onConfirm: (motivo: string) => Promise<void>; isPending: boolean; venda: VendaComRelacoes | null }) {
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { if (isOpen) { setMotivo(''); setError(''); } }, [isOpen, venda?.id]);
  const abertas = venda?.parcelas.filter((parcela) => parcela.status === 'PREVISTO') ?? [];
  const recebidas = venda?.parcelas.filter((parcela) => parcela.status === 'EFETIVADO') ?? [];
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!motivo.trim()) { setError('Informe o motivo do cancelamento.'); return; }
    try { setError(''); await onConfirm(motivo.trim()); onClose(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível cancelar a venda.'); }
  };
  return <SlidePanel isOpen={isOpen} onClose={() => !isPending && onClose()} ariaLabelledBy="cancelar-venda-title">
    <div className="flex h-full min-h-0 flex-col bg-white dark:bg-slate-900">
      <header className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-6 py-5 dark:border-slate-800 dark:bg-slate-850"><div><h2 id="cancelar-venda-title" className="text-lg font-bold text-slate-900 dark:text-white">Cancelar venda</h2><p className="mt-1 text-xs text-gray-500">{venda?.participante_nome ?? ''}</p></div><button type="button" onClick={onClose} disabled={isPending} aria-label="Fechar" className="rounded-full p-1 text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:opacity-50"><X className="h-5 w-5" aria-hidden="true"/></button></header>
      <form onSubmit={(event) => void submit(event)} className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="flex-1 space-y-5 p-6">
          <section className="space-y-3 rounded-lg bg-slate-50 p-4 text-sm dark:bg-slate-800"><p><b>Participante:</b> {venda?.participante_nome ?? '—'}</p><p><b>Curso/turma:</b> {venda?.curso?.nome_curso ?? '—'} / {venda?.turma?.id_interno_escola ?? '—'}</p><p><b>Total em aberto:</b> {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(abertas.reduce((s, p) => s + Number(p.valor), 0))}</p><p><b>Parcelas já recebidas:</b> {recebidas.length}</p></section>
          <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">As parcelas em aberto serão canceladas e deixarão de aparecer em Recebimentos.</p>
          {recebidas.length > 0 && <p className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm font-semibold text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">As {recebidas.length} parcela(s) já recebida(s) NÃO serão canceladas. Se o valor precisar voltar, faça o estorno na tela de Lançamentos.</p>}
          <div><label htmlFor="cancelar-venda-motivo" className="mb-1 block text-xs font-bold uppercase text-gray-700 dark:text-slate-300">Motivo do cancelamento *</label><textarea id="cancelar-venda-motivo" data-testid="cancelar-venda-motivo" required rows={4} className={inputClass} value={motivo} onChange={(event) => setMotivo(event.target.value)}/></div>
          {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
        </div>
        <footer className="flex justify-end gap-3 border-t border-gray-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900"><Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>Voltar</Button><Button type="submit" disabled={isPending} data-testid="confirmar-cancelamento-venda-button">{isPending ? 'Confirmando...' : 'Confirmar cancelamento'}</Button></footer>
      </form>
    </div>
  </SlidePanel>;
}

export default CancelarVendaModal;
