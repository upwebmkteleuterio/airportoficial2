import { useEffect, useState, type FormEvent } from 'react';
import { Undo2, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { MoneyInput } from '../ui/MoneyInput';
import { SlidePanel } from '../ui/SlidePanel';
import type { LancamentoComRelacoes } from '../../types/financeiro';

const inputClass = 'w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white';
const labelClass = 'block text-xs font-bold uppercase tracking-wide text-gray-700 dark:text-slate-300';
const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function hojeLocal(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatarData(data: string): string {
  const [ano, mes, dia] = data.split('-');
  return `${dia}/${mes}/${ano}`;
}

interface EstornarLancamentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (dados: { valor: number; data: string; motivo: string }) => Promise<void>;
  isPending: boolean;
  lancamento: LancamentoComRelacoes | null;
}

export function EstornarLancamentoModal({ isOpen, onClose, onConfirm, isPending, lancamento }: EstornarLancamentoModalProps) {
  const [valor, setValor] = useState('');
  const [data, setData] = useState(hojeLocal);
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setValor(String(lancamento?.valor ?? ''));
      setData(hojeLocal());
      setMotivo('');
      setError('');
    }
  }, [isOpen, lancamento]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const amount = Number(valor);
    if (!lancamento || !(amount > 0) || !Number.isFinite(amount) || amount > lancamento.valor) {
      setError(`Informe um valor maior que zero e menor ou igual a ${money.format(lancamento?.valor ?? 0)}.`);
      return;
    }
    if (!data) {
      setError('Informe a data do estorno.');
      return;
    }
    if (!motivo.trim()) {
      setError('Informe o motivo do estorno.');
      return;
    }
    setError('');
    try {
      await onConfirm({ valor: amount, data, motivo: motivo.trim() });
      setError('');
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível estornar o lançamento.');
    }
  };

  const tipoEstorno = lancamento?.tipo === 'ENTRADA' ? 'saída' : 'entrada';

  return (
    <SlidePanel isOpen={isOpen} onClose={() => !isPending && onClose()} ariaLabelledBy="estornar-lancamento-title">
      <div className="flex h-full min-h-0 flex-col bg-white dark:bg-slate-900">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-gray-50 px-6 py-5 dark:border-slate-800 dark:bg-slate-850">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-amber-100 bg-amber-50 dark:border-amber-900/30 dark:bg-amber-950/30"><Undo2 className="h-5 w-5 text-amber-600" aria-hidden="true" /></div>
            <div><h2 id="estornar-lancamento-title" className="font-display text-lg font-bold leading-tight text-slate-900 dark:text-white">Estornar lançamento</h2><p className="mt-0.5 text-[11px] text-gray-500 dark:text-slate-400">Informe os dados da contrapartida.</p></div>
          </div>
          <button type="button" onClick={onClose} disabled={isPending} aria-label="Fechar formulário" className="rounded-full p-1 text-gray-500 hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:opacity-50 dark:text-slate-400 dark:hover:text-red-400"><X className="h-5 w-5" aria-hidden="true" /></button>
        </div>
        <form onSubmit={(event) => void submit(event)} className="flex min-h-0 flex-1 flex-col overflow-y-auto custom-scrollbar">
          <div className="flex-1 space-y-4 p-6">
            {lancamento && <>
              <section className="space-y-3 rounded-lg border border-gray-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
                <h3 className="text-xs font-bold uppercase text-gray-600 dark:text-slate-300">Lançamento original</h3>
                <dl className="space-y-2 text-sm"><div><dt className="text-xs text-gray-500">Descrição</dt><dd className="font-semibold text-slate-800 dark:text-slate-200">{lancamento.descricao}</dd></div><div className="grid grid-cols-2 gap-3"><div><dt className="text-xs text-gray-500">Tipo</dt><dd className="font-semibold text-slate-800 dark:text-slate-200">{lancamento.tipo === 'ENTRADA' ? 'Entrada' : 'Saída'}</dd></div><div><dt className="text-xs text-gray-500">Valor</dt><dd className="font-semibold text-slate-800 dark:text-slate-200">{money.format(lancamento.valor)}</dd></div></div><div><dt className="text-xs text-gray-500">Conta</dt><dd className="font-semibold text-slate-800 dark:text-slate-200">{lancamento.banco?.nome ?? '—'}</dd></div><div><dt className="text-xs text-gray-500">Data de efetivação</dt><dd className="font-semibold text-slate-800 dark:text-slate-200">{formatarData(lancamento.data_efetivacao)}</dd></div></dl>
              </section>
              <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">Será lançada uma {tipoEstorno} de estorno de {money.format(Number(valor) || 0)}.</p>
              <div className="space-y-1.5"><label htmlFor="estorno-valor" className={labelClass}>Valor do estorno *</label><MoneyInput id="estorno-valor" dataTestId="estorno-valor" className={inputClass} required value={valor} onChange={setValor}/><p className="text-xs text-gray-500">O valor não pode superar o lançamento original ({money.format(lancamento.valor)}).</p></div>
              <div className="space-y-1.5"><label htmlFor="estorno-data" className={labelClass}>Data do estorno *</label><input id="estorno-data" data-testid="estorno-data" className={inputClass} type="date" required value={data} onChange={(event) => setData(event.target.value)}/></div>
              <div className="space-y-1.5"><label htmlFor="estorno-motivo" className={labelClass}>Motivo do estorno *</label><textarea id="estorno-motivo" data-testid="estorno-motivo" className={inputClass} rows={3} required value={motivo} onChange={(event) => setMotivo(event.target.value)}/></div>
            </>}
            {error && <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
          </div>
          <div className="sticky bottom-0 flex shrink-0 justify-end gap-3 border-t border-gray-200 bg-white px-6 py-4 shadow-md dark:border-slate-800 dark:bg-slate-900"><Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>Cancelar</Button><Button type="submit" data-testid="confirmar-estorno-button" disabled={isPending || !lancamento}>{isPending ? 'Confirmando...' : 'Confirmar estorno'}</Button></div>
        </form>
      </div>
    </SlidePanel>
  );
}

export default EstornarLancamentoModal;
