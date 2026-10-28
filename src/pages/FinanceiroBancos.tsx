import { useEffect, useState, type FormEvent } from 'react';
import { Banknote, Edit2, HelpCircle, Landmark, Plus, Power, Trash2, Vault, X } from 'lucide-react';
import { useIsFetching, useQueryClient } from '@tanstack/react-query';
import { bancoService } from '../services/bancoService';
import { useBancos } from '../hooks/useBancos';
import type { ContaComSaldo, TipoBanco } from '../types/financeiro';
import { Button } from '../components/ui/Button';
import { ConfirmDeleteModal } from '../components/ui/ConfirmDeleteModal';
import { HelpModal } from '../components/ui/HelpModal';
import { Modal } from '../components/ui/Modal';
import { QueryErrorState } from '../components/ui/QueryErrorState';
import { RowActionMenu } from '../components/ui/RowActionMenu';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
type BancoForm = { nome: string; tipo: TipoBanco; saldo_inicial: string; data_saldo_inicial: string; logo_url: string | null };

function dataLocalHoje(): string {
  const data = new Date();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${data.getFullYear()}-${mes}-${dia}`;
}

function novoForm(): BancoForm {
  return { nome: '', tipo: 'BANCO', saldo_inicial: '0', data_saldo_inicial: dataLocalHoje(), logo_url: null };
}

export default function FinanceiroBancos() {
  const { contas, createBanco, updateBanco, deleteBanco, isLoading, isCreating, isUpdating, isDeleting, isError } = useBancos();
  const queryClient = useQueryClient();
  // Os dois hooks precisam ser chamados em todo render: combinar as chamadas com
  // `||` ignora a segunda enquanto a primeira for verdadeira, o que muda a
  // quantidade de hooks entre renders e derruba a tela inteira.
  const isFetchingBancos = useIsFetching({ queryKey: ['bancos'] }) > 0;
  const isFetchingSaldos = useIsFetching({ queryKey: ['saldos-contas'] }) > 0;
  const isRetrying = isFetchingBancos || isFetchingSaldos;
  const [editing, setEditing] = useState<ContaComSaldo | null>(null);
  const [form, setForm] = useState<BancoForm>(novoForm);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [deleting, setDeleting] = useState<ContaComSaldo | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const saving = isCreating || isUpdating;

  useEffect(() => {
    if (!logoFile) {
      setLogoPreviewUrl(null);
      return;
    }
    const previewUrl = URL.createObjectURL(logoFile);
    setLogoPreviewUrl(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [logoFile]);

  const openForm = (conta?: ContaComSaldo) => {
    setEditing(conta ?? null);
    setForm(conta ? {
      nome: conta.nome,
      tipo: conta.tipo,
      saldo_inicial: String(conta.saldo_inicial),
      data_saldo_inicial: conta.data_saldo_inicial,
      logo_url: conta.logo_url,
    } : novoForm());
    setLogoFile(null);
    setErrorMessage('');
    setModalOpen(true);
  };
  const closeForm = () => {
    if (saving) return;
    setModalOpen(false);
  };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    setErrorMessage('');
    try {
      const logoUrl = logoFile ? await bancoService.uploadLogo(logoFile) : form.logo_url;
      const updates = { nome: form.nome.trim(), tipo: form.tipo, logo_url: logoUrl };
      const saldo = { saldo_inicial: Number(form.saldo_inicial), data_saldo_inicial: form.data_saldo_inicial };
      if (editing) await updateBanco({ id: editing.id, updates, saldo });
      else await createBanco({ ...updates, ...saldo });
      setModalOpen(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Não foi possível salvar a conta.');
    }
  };
  const toggleActive = async (conta: ContaComSaldo) => {
    try {
      await updateBanco({ id: conta.id, updates: { ativo: !conta.ativo } });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Não foi possível atualizar o status da conta.');
    }
  };
  const confirmDelete = async () => {
    if (!deleting) return;
    setErrorMessage('');
    try {
      await deleteBanco(deleting.id);
      setDeleting(null);
    } catch (error) {
      setDeleting(null);
      setErrorMessage(error instanceof Error ? error.message : 'Não foi possível excluir a conta.');
    }
  };
  const busy = isDeleting;

  return (
    <div className="flex-1 flex flex-col p-6 gap-6 overflow-y-auto">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 shrink-0">
        <div><h2 className="font-display text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white leading-tight">Bancos e Contas</h2><p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Gerencie as contas bancárias e caixas usados no controle financeiro.</p></div>
        <div className="flex items-center gap-2"><Button variant="secondary" type="button" onClick={() => setHelpOpen(true)} icon={<HelpCircle className="w-4 h-4" aria-hidden="true" />} aria-label="Ajuda">Ajuda</Button><Button onClick={() => openForm()} icon={<Plus className="w-4 h-4" aria-hidden="true" />}>Nova Conta</Button></div>
      </div>
      {errorMessage && !modalOpen && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">{errorMessage}</p>}
      {isError && !isLoading && <QueryErrorState onRetry={() => void Promise.all([queryClient.invalidateQueries({ queryKey: ['bancos'] }), queryClient.invalidateQueries({ queryKey: ['saldos-contas'] })])} isRetrying={isRetrying} message="Verifique sua conexão e tente novamente." />}
      <div className="flex-1 border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm flex flex-col min-h-[350px]">
        <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar"><table className="w-full min-w-[960px] table-fixed text-left border-collapse text-xs">
          <thead className="sticky top-0 bg-slate-50 dark:bg-slate-850 z-10 border-b border-gray-200 dark:border-slate-800 font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400"><tr><th className="w-12 px-2 py-3 text-center" aria-label="Ações"></th><th className="w-[22%] px-3 py-3">Nome</th><th className="w-[12%] px-3 py-3">Tipo</th><th className="w-[12%] px-3 py-3 text-right">Saldo inicial</th><th className="w-[12%] px-3 py-3 text-right">Entradas</th><th className="w-[12%] px-3 py-3 text-right">Saídas</th><th className="w-[12%] px-3 py-3 text-right">Saldo atual</th><th className="w-[10%] px-2 py-3 text-center">Status</th></tr></thead>
          <tbody className="divide-y divide-gray-150 dark:divide-slate-800 text-gray-700 dark:text-slate-200 font-mono">
            {isLoading ? <tr><td colSpan={8} className="px-4 py-8 text-center"><div className="flex flex-col items-center gap-2 text-gray-500"><div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" aria-label="Carregando"/><p className="font-sans text-sm">Carregando contas...</p></div></td></tr> : isError ? <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">Não foi possível carregar as contas.</td></tr> : contas.length === 0 ? <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-500 font-sans"><div className="flex flex-col items-center gap-2.5"><div className="p-3 bg-teal-500/10 rounded-full text-teal-500"><Landmark className="w-6 h-6" aria-hidden="true"/></div><p className="font-bold text-sm text-slate-800 dark:text-slate-200">Nenhuma conta encontrada</p><p className="text-xs text-gray-400">Adicione uma conta para começar.</p></div></td></tr> : contas.map((conta) => <tr key={conta.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 ${!conta.ativo ? 'opacity-60' : ''}`}>
              <td className="px-4 py-2 text-center"><RowActionMenu ariaLabel={`Ações para ${conta.nome}`} items={[{ label: 'Editar', icon: <Edit2 className="h-4 w-4" aria-hidden="true"/>, onClick: () => openForm(conta) }, { label: 'Excluir', icon: <Trash2 className="h-4 w-4" aria-hidden="true"/>, tone: 'danger', onClick: () => { setErrorMessage(''); setDeleting(conta); } }]}/></td>
              <td className="px-3 py-2 font-sans font-semibold text-slate-800 dark:text-slate-200"><span className="flex items-center gap-2">{conta.logo_url ? <img src={conta.logo_url} alt={`Logo de ${conta.nome}`} className="h-7 w-7 rounded object-contain"/> : conta.tipo === 'BANCO' ? <Landmark className="h-5 w-5 text-teal-600" aria-hidden="true"/> : <Vault className="h-5 w-5 text-teal-600" aria-hidden="true"/>}{conta.nome}</span></td>
              <td className="px-3 py-2">{conta.tipo === 'BANCO' ? 'Banco' : 'Cofre local'}</td><td className="px-3 py-2 text-right">{money.format(conta.saldo_inicial)}</td><td className="px-3 py-2 text-right">{money.format(conta.total_entradas)}</td><td className="px-3 py-2 text-right">{money.format(conta.total_saidas)}</td><td className="px-3 py-2 text-right">{money.format(conta.saldo_atual)}</td>
              <td className="px-2 py-2 text-center"><button type="button" onClick={() => void toggleActive(conta)} disabled={isUpdating} aria-label={`${conta.ativo ? 'Desativar' : 'Ativar'} conta ${conta.nome}`} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 ${conta.ativo ? 'bg-teal-500' : 'bg-gray-300 dark:bg-slate-600'}`}><span className={`inline-block h-3 w-3 rounded-full bg-white transition-transform ${conta.ativo ? 'translate-x-5' : 'translate-x-1'}`}></span></button><span className="sr-only">{conta.ativo ? 'Ativo' : 'Inativo'}</span></td>
            </tr>)}
          </tbody></table></div>
      </div>
      <HelpModal isOpen={helpOpen} onClose={() => setHelpOpen(false)} title="Ajuda sobre Bancos e Contas" description="Cada registro representa uma conta bancária ou um caixa local." items={[{ title: 'Contas', description: 'Cadastre bancos ou cofres locais para associar aos lançamentos.', icon: <Landmark className="h-4 w-4" aria-hidden="true"/> }, { title: 'Saldos', description: 'Os saldos exibidos são fornecidos pelo controle financeiro.', icon: <Banknote className="h-4 w-4" aria-hidden="true"/> }, { title: 'Status', description: 'Contas inativas permanecem disponíveis para consulta, mas podem ser desativadas para novos usos.', icon: <Power className="h-4 w-4" aria-hidden="true"/> }]}/>
      <Modal isOpen={modalOpen} onClose={closeForm} ariaLabelledBy="bank-form-title"><div className="max-h-[calc(100vh-2rem)] overflow-y-auto rounded-xl bg-white shadow-xl dark:bg-slate-900"><div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-slate-800"><h2 id="bank-form-title" className="flex items-center gap-2 text-lg font-bold text-slate-800 dark:text-white">{editing ? <Edit2 className="h-5 w-5 text-teal-600" aria-hidden="true"/> : <Plus className="h-5 w-5 text-teal-600" aria-hidden="true"/>}{editing ? 'Editar Conta' : 'Nova Conta'}</h2><button type="button" onClick={closeForm} disabled={saving} aria-label="Fechar formulário" className="rounded p-1 text-gray-500 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:opacity-50 dark:hover:text-white"><X className="h-5 w-5" aria-hidden="true"/></button></div>
        <form onSubmit={(event) => void save(event)} className="space-y-4 p-6"><div><label htmlFor="bank-name" className="mb-1 block text-xs font-bold uppercase text-gray-700 dark:text-slate-300">Nome</label><input id="bank-name" required value={form.nome} onChange={(event) => setForm({ ...form, nome: event.target.value })} className="w-full rounded border border-gray-300 bg-transparent px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:border-slate-700 dark:text-white"/></div>
          <div><label htmlFor="bank-type" className="mb-1 block text-xs font-bold uppercase text-gray-700 dark:text-slate-300">Tipo</label><select id="bank-type" value={form.tipo} onChange={(event) => setForm({ ...form, tipo: event.target.value as TipoBanco })} className="w-full rounded border border-gray-300 bg-white px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"><option value="BANCO">Banco</option><option value="COFRE_LOCAL">Cofre local</option></select></div>
          <div><label htmlFor="bank-logo" className="mb-1 block text-xs font-bold uppercase text-gray-700 dark:text-slate-300">Logo (JPEG, PNG ou WebP; até 5 MB)</label><input id="bank-logo" type="file" accept="image/jpeg,image/png,image/webp" disabled={saving} onChange={(event) => { const file = event.target.files?.[0] ?? null; setLogoFile(file); if (file) setErrorMessage(''); }} className="w-full text-sm text-gray-700 file:mr-3 file:rounded file:border-0 file:bg-slate-100 file:px-3 file:py-2 dark:text-slate-300 dark:file:bg-slate-800"/>{(logoFile || form.logo_url) && <div className="mt-2 flex items-center gap-3">{logoFile ? <img src={logoPreviewUrl ?? ''} alt="Pré-visualização do logo" className="h-12 w-12 rounded object-contain"/> : <img src={form.logo_url ?? ''} alt="Logo atual" className="h-12 w-12 rounded object-contain"/>}<button type="button" disabled={saving} onClick={() => { setLogoFile(null); setForm({ ...form, logo_url: null }); const input = document.getElementById('bank-logo') as HTMLInputElement | null; if (input) input.value = ''; }} className="rounded px-2 py-1 text-xs font-semibold text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:opacity-50">Remover logo</button></div>}</div>
          <div className="grid grid-cols-2 gap-4"><div><label htmlFor="bank-opening-balance" className="mb-1 block text-xs font-bold uppercase text-gray-700 dark:text-slate-300">Saldo inicial</label><input id="bank-opening-balance" type="number" step="0.01" required value={form.saldo_inicial} onChange={(event) => setForm({ ...form, saldo_inicial: event.target.value })} className="w-full rounded border border-gray-300 bg-transparent px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:border-slate-700 dark:text-white"/></div><div><label htmlFor="bank-opening-date" className="mb-1 block text-xs font-bold uppercase text-gray-700 dark:text-slate-300">Data do saldo inicial</label><input id="bank-opening-date" type="date" required value={form.data_saldo_inicial} onChange={(event) => setForm({ ...form, data_saldo_inicial: event.target.value })} className="w-full rounded border border-gray-300 bg-transparent px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:border-slate-700 dark:text-white"/></div></div>
          {errorMessage && <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">{errorMessage}</p>}<div className="flex justify-end gap-3 pt-2"><Button variant="secondary" type="button" onClick={closeForm} disabled={saving}>Cancelar</Button><Button type="submit" disabled={saving}>{saving ? 'Salvando...' : editing ? 'Atualizar' : 'Salvar'}</Button></div>
        </form></div></Modal>
      <ConfirmDeleteModal isOpen={deleting !== null} onClose={() => !busy && setDeleting(null)} onConfirm={confirmDelete} itemName={deleting?.nome} isPending={busy}/>
    </div>
  );
}
