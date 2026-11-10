import { useEffect, useState, type FormEvent } from 'react';
import { Banknote, X } from 'lucide-react';
import type { AplicacaoSaldo, TipoMovimentoAplicacao } from '../../types/financeiro';
import type { ContaComSaldo } from '../../hooks/useBancos';
import { Button } from '../ui/Button';
import { MoneyInput } from '../ui/MoneyInput';
import { SlidePanel } from '../ui/SlidePanel';

const inputClass = 'w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white';
const labelClass = 'block text-xs font-bold uppercase tracking-wide text-gray-700 dark:text-slate-300';
function hojeLocal() { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }

interface MovimentoAplicacaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  aplicacao: AplicacaoSaldo | null;
  tipo: TipoMovimentoAplicacao | null;
  conta?: ContaComSaldo;
  isPending: boolean;
  onConfirm: (dados: { valor: number; percentual: number | null; data: string; observacoes: string }) => Promise<unknown>;
}

const titulos: Record<TipoMovimentoAplicacao, string> = {
  APORTE: 'Aplicar em investimento', RENDIMENTO: 'Registrar rendimento', RESGATE: 'Resgatar da aplicação',
};

export function MovimentoAplicacaoModal({ isOpen, onClose, aplicacao, tipo, conta, isPending, onConfirm }: MovimentoAplicacaoModalProps) {
  const [valor, setValor] = useState('');
  const [data, setData] = useState(hojeLocal);
  const [percentual, setPercentual] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setValor(''); setData(hojeLocal()); setPercentual(''); setObservacoes(''); setError('');
  }, [isOpen, aplicacao, tipo]);

  if (!tipo) return null;
  const baseRendimento = aplicacao ? aplicacao.aportes + aplicacao.rendimentos - aplicacao.resgates : 0;
  const saldoConta = conta?.saldo_atual;
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const amount = Number(valor);
    const percent = percentual.trim() ? Number(percentual.trim().replace(',', '.')) : null;
    if (!data || !(amount > 0) || !Number.isFinite(amount)) {
      setError('Informe uma data e um valor maior que zero.'); return;
    }
    if (tipo === 'RESGATE' && aplicacao && amount > aplicacao.disponivel) {
      setError('O valor do resgate não pode ser maior que o disponível na aplicação.'); return;
    }
    if (percent !== null && !Number.isFinite(percent)) {
      setError('Informe um percentual válido.'); return;
    }
    setError('');
    try { await onConfirm({ valor: amount, percentual: tipo === 'RENDIMENTO' ? percent : null, data, observacoes: observacoes.trim() }); onClose(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível registrar o movimento.'); }
  };

  const apoio = tipo === 'APORTE'
    ? 'O valor sairá do caixa da conta escolhida.'
    : tipo === 'RENDIMENTO'
      ? 'O rendimento não movimenta o caixa; ele só aumenta o valor disponível na aplicação.'
      : 'Informe o valor LÍQUIDO que realmente caiu na conta (depois de impostos e taxas).';

  return (
    <SlidePanel isOpen={isOpen} onClose={() => !isPending && onClose()} ariaLabelledBy="movimento-aplicacao-title">
      <div className="flex h-full min-h-0 flex-col bg-white dark:bg-slate-900">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-gray-50 px-6 py-5 dark:border-slate-800 dark:bg-slate-850"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full border border-teal-100 bg-teal-50 dark:border-teal-900/20 dark:bg-teal-950/30"><Banknote className="h-5 w-5 text-teal-600" aria-hidden="true" /></div><div><h2 id="movimento-aplicacao-title" className="font-display text-lg font-bold text-slate-900 dark:text-white">{titulos[tipo]}</h2><p className="mt-0.5 text-[11px] text-gray-500 dark:text-slate-400">{aplicacao?.nome} · {aplicacao?.banco_nome}</p></div></div><button type="button" onClick={onClose} disabled={isPending} aria-label="Fechar formulário" className="rounded-full p-1 text-gray-500 hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:opacity-50"><X className="h-5 w-5" aria-hidden="true" /></button></div>
        <form onSubmit={(event) => void submit(event)} className="flex min-h-0 flex-1 flex-col overflow-y-auto custom-scrollbar"><div className="flex-1 space-y-4 p-6">
          <p className="rounded-lg bg-teal-50 p-3 text-sm text-teal-900 dark:bg-teal-950/30 dark:text-teal-200">{apoio}</p>
          {tipo === 'APORTE' && <p className="text-xs text-slate-600 dark:text-slate-400">{saldoConta === undefined ? 'O valor não pode passar do saldo atual da conta.' : `Saldo atual da conta: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(saldoConta)}. O aporte não pode passar desse saldo.`}</p>}
          {tipo === 'RESGATE' && <p className="text-xs text-slate-600 dark:text-slate-400">Disponível atual: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(aplicacao?.disponivel ?? 0)}. O resgate não pode passar desse valor.</p>}
          {tipo === 'RENDIMENTO' && <div className="space-y-1.5"><label htmlFor="movimento-percentual" className={labelClass}>Percentual (%)</label><input id="movimento-percentual" data-testid="movimento-percentual" type="text" inputMode="decimal" value={percentual} onChange={(event) => { const entered = event.target.value; setPercentual(entered); const parsed = Number(entered.trim().replace(',', '.')); if (entered.trim() && Number.isFinite(parsed)) setValor(((baseRendimento * parsed) / 100).toFixed(2)); }} className={inputClass} placeholder="Opcional, ex.: 1,25" /></div>}
          <div className="space-y-1.5"><label htmlFor="movimento-valor" className={labelClass}>Valor *</label><MoneyInput id="movimento-valor" dataTestId="movimento-valor" required value={valor} onChange={setValor} className={inputClass} /></div>
          <div className="space-y-1.5"><label htmlFor="movimento-data" className={labelClass}>Data *</label><input id="movimento-data" data-testid="movimento-data" type="date" required value={data} onChange={(event) => setData(event.target.value)} className={inputClass} /></div>
          <div className="space-y-1.5"><label htmlFor="movimento-observacoes" className={labelClass}>Observações</label><textarea id="movimento-observacoes" data-testid="movimento-observacoes" value={observacoes} onChange={(event) => setObservacoes(event.target.value)} rows={3} className={inputClass} /></div>
          {error && <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
        </div><div className="sticky bottom-0 flex shrink-0 justify-end gap-3 border-t border-gray-200 bg-white px-6 py-4 shadow-md dark:border-slate-800 dark:bg-slate-900"><Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>Cancelar</Button><Button type="submit" data-testid="confirmar-movimento-button" disabled={isPending}>{isPending ? 'Confirmando...' : 'Confirmar'}</Button></div></form>
      </div>
    </SlidePanel>
  );
}

export default MovimentoAplicacaoModal;
