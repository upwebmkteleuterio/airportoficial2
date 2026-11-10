import { useEffect, useState, type FormEvent } from 'react';
import { Landmark, X } from 'lucide-react';
import { useBancos } from '../../hooks/useBancos';
import type { AplicacaoSaldo, TipoAplicacao } from '../../types/financeiro';
import type { AplicacaoInput } from '../../services/aplicacaoService';
import { Button } from '../ui/Button';
import { MoneyInput } from '../ui/MoneyInput';
import { SlidePanel } from '../ui/SlidePanel';

const inputClass = 'w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white';
const labelClass = 'block text-xs font-bold uppercase tracking-wide text-gray-700 dark:text-slate-300';
const tipos: { valor: TipoAplicacao; rotulo: string }[] = [
  { valor: 'CDB', rotulo: 'CDB' }, { valor: 'POUPANCA', rotulo: 'Poupança' }, { valor: 'FUNDO', rotulo: 'Fundo' },
  { valor: 'TESOURO', rotulo: 'Tesouro' }, { valor: 'ACOES', rotulo: 'Ações' }, { valor: 'OUTRO', rotulo: 'Outro' },
];

function hojeLocal() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

interface AplicacaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  aplicacao: AplicacaoSaldo | null;
  onSave: (id: string | null, dados: AplicacaoInput, valorInicial: number) => Promise<unknown>;
  isSaving: boolean;
}

export function AplicacaoModal({ isOpen, onClose, aplicacao, onSave, isSaving }: AplicacaoModalProps) {
  const { contas } = useBancos();
  const [nome, setNome] = useState('');
  const [bancoId, setBancoId] = useState('');
  const [tipo, setTipo] = useState<TipoAplicacao | ''>('');
  const [data, setData] = useState(hojeLocal);
  const [valorInicial, setValorInicial] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [ativo, setAtivo] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setNome(aplicacao?.nome ?? '');
    setBancoId(aplicacao?.banco_id ?? '');
    setTipo(aplicacao?.tipo ?? '');
    setData(aplicacao?.data_aplicacao ?? hojeLocal());
    setValorInicial('');
    setObservacoes(aplicacao?.observacoes ?? '');
    setAtivo(aplicacao?.ativo ?? true);
    setError('');
  }, [isOpen, aplicacao]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!nome.trim() || !bancoId || !tipo || !data) {
      setError('Preencha o nome, banco/conta, tipo e data da aplicação.');
      return;
    }
    setError('');
    try {
      await onSave(aplicacao?.id ?? null, { banco_id: bancoId, nome: nome.trim(), tipo, data_aplicacao: data, ativo, observacoes: observacoes.trim() }, Number(valorInicial) || 0);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar a aplicação.');
    }
  };

  return (
    <SlidePanel isOpen={isOpen} onClose={() => !isSaving && onClose()} ariaLabelledBy="aplicacao-form-title">
      <div className="flex h-full min-h-0 flex-col bg-white dark:bg-slate-900">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-gray-50 px-6 py-5 dark:border-slate-800 dark:bg-slate-850">
          <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full border border-teal-100 bg-teal-50 dark:border-teal-900/20 dark:bg-teal-950/30"><Landmark className="h-5 w-5 text-teal-600" aria-hidden="true" /></div><div><h2 id="aplicacao-form-title" className="font-display text-lg font-bold text-slate-900 dark:text-white">{aplicacao ? 'Editar aplicação' : 'Nova aplicação'}</h2><p className="mt-0.5 text-[11px] text-gray-500 dark:text-slate-400">Dados da aplicação financeira.</p></div></div>
          <button type="button" onClick={onClose} disabled={isSaving} aria-label="Fechar formulário" className="rounded-full p-1 text-gray-500 hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:opacity-50"><X className="h-5 w-5" aria-hidden="true" /></button>
        </div>
        <form onSubmit={(event) => void submit(event)} className="flex min-h-0 flex-1 flex-col overflow-y-auto custom-scrollbar">
          <div className="flex-1 space-y-4 p-6">
            <div className="space-y-1.5"><label htmlFor="aplicacao-nome" className={labelClass}>Nome da aplicação *</label><input id="aplicacao-nome" data-testid="aplicacao-nome" required value={nome} onChange={(event) => setNome(event.target.value)} className={inputClass} /></div>
            <div className="space-y-1.5"><label htmlFor="aplicacao-banco" className={labelClass}>Banco/Conta *</label><select id="aplicacao-banco" data-testid="aplicacao-banco" required value={bancoId} onChange={(event) => setBancoId(event.target.value)} className={inputClass}><option value="">Selecione uma conta</option>{contas.filter((conta) => conta.ativo).map((conta) => <option key={conta.id} value={conta.id}>{conta.nome}</option>)}</select></div>
            <div className="space-y-1.5"><label htmlFor="aplicacao-tipo" className={labelClass}>Tipo *</label><select id="aplicacao-tipo" data-testid="aplicacao-tipo" required value={tipo} onChange={(event) => setTipo(event.target.value as TipoAplicacao | '')} className={inputClass}><option value="">Selecione o tipo</option>{tipos.map((item) => <option key={item.valor} value={item.valor}>{item.rotulo}</option>)}</select></div>
            <div className="space-y-1.5"><label htmlFor="aplicacao-data" className={labelClass}>Data da aplicação *</label><input id="aplicacao-data" data-testid="aplicacao-data" type="date" required value={data} onChange={(event) => setData(event.target.value)} className={inputClass} /></div>
            {!aplicacao && <div className="space-y-1.5"><label htmlFor="aplicacao-valor-inicial" className={labelClass}>Valor aplicado (opcional)</label><MoneyInput id="aplicacao-valor-inicial" dataTestId="aplicacao-valor-inicial" permiteVazio value={valorInicial} onChange={setValorInicial} className={inputClass}/><p className="text-xs text-gray-500 dark:text-slate-400">Se preenchido, registra a saída desse valor da conta escolhida. O valor não pode passar do saldo atual da conta.</p></div>}
            <div className="space-y-1.5"><label htmlFor="aplicacao-observacoes" className={labelClass}>Observações</label><textarea id="aplicacao-observacoes" value={observacoes} onChange={(event) => setObservacoes(event.target.value)} rows={3} className={inputClass} /></div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300"><input type="checkbox" checked={ativo} onChange={(event) => setAtivo(event.target.checked)} className="h-4 w-4 rounded border-gray-300 text-teal-600 focus-visible:ring-2 focus-visible:ring-teal-500" />Aplicação ativa</label>
            {error && <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
          </div>
          <div className="sticky bottom-0 flex shrink-0 justify-end gap-3 border-t border-gray-200 bg-white px-6 py-4 shadow-md dark:border-slate-800 dark:bg-slate-900"><Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>Cancelar</Button><Button type="submit" data-testid="salvar-aplicacao-button" disabled={isSaving}>{isSaving ? 'Salvando...' : 'Salvar aplicação'}</Button></div>
        </form>
      </div>
    </SlidePanel>
  );
}

export default AplicacaoModal;
