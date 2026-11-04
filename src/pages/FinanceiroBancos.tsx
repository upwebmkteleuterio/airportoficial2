import { useEffect, useState, type FormEvent } from 'react';
import { ArrowRightLeft, Banknote, Edit2, HelpCircle, Landmark, Plus, Power, Trash2, Vault, X } from 'lucide-react';
import { useIsFetching, useQueryClient } from '@tanstack/react-query';
import { bancoService } from '../services/bancoService';
import { useBancos } from '../hooks/useBancos';
import { useTransferencias } from '../hooks/useTransferencias';
import type { ContaComSaldo, TipoBanco, TransferenciaEntreContas } from '../types/financeiro';
import { Button } from '../components/ui/Button';
import { ConfirmDeleteModal } from '../components/ui/ConfirmDeleteModal';
import { HelpModal } from '../components/ui/HelpModal';
import { SlidePanel as Modal } from '../components/ui/SlidePanel';
import { QueryErrorState } from '../components/ui/QueryErrorState';
import { RowActionMenu } from '../components/ui/RowActionMenu';
import { PaginationFooter } from '../components/ui/PaginationFooter';
import { MoneyInput } from '../components/ui/MoneyInput';
import { FinanceiroOptionsLimitWarning } from '../components/financeiro/FinanceiroOptionsLimitWarning';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const pageSize = 20;
type BancoForm = { nome: string; tipo: TipoBanco; saldo_inicial: string; data_saldo_inicial: string; logo_url: string | null };
type TransferenciaForm = { origem_id: string; destino_id: string; valor: string; data: string; observacoes: string };

function dataLocalHoje(): string {
  const data = new Date();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${data.getFullYear()}-${mes}-${dia}`;
}

function mesAtual(): string {
  const data = new Date();
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
}

function rotuloMes(mes: string): string {
  const [ano, numeroMes] = mes.split('-').map(Number);
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(ano, numeroMes - 1, 1));
}

function novaTransferenciaForm(): TransferenciaForm {
  return { origem_id: '', destino_id: '', valor: '', data: dataLocalHoje(), observacoes: '' };
}

function novoForm(): BancoForm {
  return { nome: '', tipo: 'BANCO', saldo_inicial: '0', data_saldo_inicial: dataLocalHoje(), logo_url: null };
}

export default function FinanceiroBancos() {
  const [page, setPage] = useState(1);
  const [mes, setMes] = useState(mesAtual);
  const [transferenciasPage, setTransferenciasPage] = useState(1);
  const { contas, contasPagina, total, optionsTruncated, createBanco, updateBanco, deleteBanco, isLoading, isFetching, isCreating, isUpdating, isDeleting, isError } = useBancos({ page, pageSize, mes });
  const {
    transferencias,
    total: totalTransferencias,
    isLoading: transferenciasLoading,
    isError: transferenciasError,
    criarTransferencia,
    atualizarTransferencia,
    excluirTransferencia,
    isCreating: criandoTransferencia,
    isUpdating: atualizandoTransferencia,
    isDeleting: excluindoTransferencia,
  } = useTransferencias({ page: transferenciasPage, pageSize });
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
  const [transferenciaOpen, setTransferenciaOpen] = useState(false);
  const [transferenciaForm, setTransferenciaForm] = useState<TransferenciaForm>(novaTransferenciaForm);
  const [transferenciaEditing, setTransferenciaEditing] = useState<TransferenciaEntreContas | null>(null);
  const [transferenciaDeleting, setTransferenciaDeleting] = useState<TransferenciaEntreContas | null>(null);
  const [transferenciaError, setTransferenciaError] = useState('');
  const saving = isCreating || isUpdating;
  const transferenciaSaving = criandoTransferencia || atualizandoTransferencia;

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
  const openTransferencia = (transferencia?: TransferenciaEntreContas) => {
    setTransferenciaEditing(transferencia ?? null);
    setTransferenciaForm(transferencia ? {
      origem_id: transferencia.conta_origem_id,
      destino_id: transferencia.conta_destino_id,
      valor: String(transferencia.valor),
      data: transferencia.data,
      observacoes: transferencia.observacoes,
    } : novaTransferenciaForm());
    setTransferenciaError('');
    setTransferenciaOpen(true);
  };
  const closeTransferencia = () => {
    if (transferenciaSaving) return;
    setTransferenciaOpen(false);
    setTransferenciaEditing(null);
  };
  const saveTransferencia = async (event: FormEvent) => {
    event.preventDefault();
    setTransferenciaError('');
    const valor = Number(transferenciaForm.valor);
    if (!transferenciaEditing && transferenciaForm.origem_id === transferenciaForm.destino_id) {
      setTransferenciaError('Selecione contas de origem e destino diferentes.');
      return;
    }
    if (!Number.isFinite(valor) || valor <= 0) {
      setTransferenciaError('Informe um valor maior que zero.');
      return;
    }
    try {
      if (transferenciaEditing) {
        await atualizarTransferencia({
          id: transferenciaEditing.id,
          valor,
          data: transferenciaForm.data,
          observacoes: transferenciaForm.observacoes.trim(),
        });
      } else {
        await criarTransferencia({
          origem_id: transferenciaForm.origem_id,
          destino_id: transferenciaForm.destino_id,
          valor,
          data: transferenciaForm.data,
          observacoes: transferenciaForm.observacoes.trim(),
        });
      }
      setTransferenciaOpen(false);
      setTransferenciaEditing(null);
    } catch (error) {
      setTransferenciaError(error instanceof Error ? error.message : 'Não foi possível salvar a transferência.');
    }
  };
  const confirmDeleteTransferencia = async () => {
    if (!transferenciaDeleting) return;
    try {
      await excluirTransferencia(transferenciaDeleting.id);
      setTransferenciaDeleting(null);
    } catch (error) {
      setTransferenciaDeleting(null);
      setTransferenciaError(error instanceof Error ? error.message : 'Não foi possível excluir a transferência.');
    }
  };
  const busy = isDeleting;

  useEffect(() => setPage(1), [mes]);

  useEffect(() => {
    if (!isLoading && page > 1 && contasPagina.length === 0) setPage((current) => current - 1);
    if (!transferenciasLoading && transferenciasPage > 1 && transferencias.length === 0) setTransferenciasPage((current) => current - 1);
  }, [isLoading, page, contasPagina.length, transferenciasLoading, transferenciasPage, transferencias.length]);

  return (
    <div className="flex-1 flex flex-col p-6 gap-6 overflow-y-auto">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 shrink-0">
        <div><h2 className="font-display text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white leading-tight">Bancos e Contas</h2><p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Gerencie as contas bancárias e caixas usados no controle financeiro.</p></div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" type="button" onClick={() => setHelpOpen(true)} icon={<HelpCircle className="w-4 h-4" aria-hidden="true" />} aria-label="Ajuda">Ajuda</Button>
          <Button variant="secondary" type="button" data-testid="transferir-entre-contas-button" onClick={() => openTransferencia()} icon={<ArrowRightLeft className="h-4 w-4" aria-hidden="true"/>}>Transferir entre contas</Button>
          <Button onClick={() => openForm()} icon={<Plus className="w-4 h-4" aria-hidden="true" />}>Nova Conta</Button>
        </div>
      </div>
      {errorMessage && !modalOpen && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">{errorMessage}</p>}
      {isError && !isLoading && <QueryErrorState onRetry={() => void Promise.all([queryClient.invalidateQueries({ queryKey: ['bancos'] }), queryClient.invalidateQueries({ queryKey: ['saldos-contas'] }), queryClient.invalidateQueries({ queryKey: ['bancos-page'] })])} isRetrying={isRetrying} message="Verifique sua conexão e tente novamente." />}
      <FinanceiroOptionsLimitWarning visible={optionsTruncated}/>
      <div className="flex-1 border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm flex flex-col min-h-[350px]">
        <div className="flex flex-col gap-3 border-b border-gray-200 px-4 py-3 dark:border-slate-800 sm:flex-row sm:items-end sm:justify-between">
          <h3 className="font-semibold text-slate-800 dark:text-slate-200">Movimentações de {rotuloMes(mes)}</h3>
          <div><label htmlFor="bancos-mes" className="mb-1 block text-xs font-bold uppercase text-gray-700 dark:text-slate-300">Mês</label><input id="bancos-mes" type="month" value={mes} onChange={(event) => setMes(event.target.value)} className="rounded border border-gray-300 bg-white px-3 py-2 text-sm text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"/></div>
        </div>
        <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar"><table className="w-full min-w-[960px] table-fixed text-left border-collapse text-xs">
          <thead className="sticky top-0 bg-slate-50 dark:bg-slate-850 z-10 border-b border-gray-200 dark:border-slate-800 font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400"><tr><th className="w-12 px-2 py-3 text-center" aria-label="Ações"></th><th className="w-[22%] px-3 py-3">Nome</th><th className="w-[12%] px-3 py-3">Tipo</th><th className="w-[12%] px-3 py-3 text-right">Saldo inicial</th><th className="w-[12%] px-3 py-3 text-right">Entradas</th><th className="w-[12%] px-3 py-3 text-right">Saídas</th><th className="w-[12%] px-3 py-3 text-right">Saldo atual</th><th className="w-[10%] px-2 py-3 text-center">Status</th></tr></thead>
          <tbody className="divide-y divide-gray-150 dark:divide-slate-800 text-gray-700 dark:text-slate-200 font-mono">
            {isLoading ? <tr><td colSpan={8} className="px-4 py-8 text-center"><div className="flex flex-col items-center gap-2 text-gray-500"><div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" aria-label="Carregando"/><p className="font-sans text-sm">Carregando contas...</p></div></td></tr> : isError ? <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">Não foi possível carregar as contas.</td></tr> : contasPagina.length === 0 ? <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-500 font-sans"><div className="flex flex-col items-center gap-2.5"><div className="p-3 bg-teal-500/10 rounded-full text-teal-500"><Landmark className="w-6 h-6" aria-hidden="true"/></div><p className="font-bold text-sm text-slate-800 dark:text-slate-200">Nenhuma conta encontrada</p><p className="text-xs text-gray-400">Adicione uma conta para começar.</p></div></td></tr> : contasPagina.map((conta) => <tr key={conta.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 ${!conta.ativo ? 'opacity-60' : ''}`}>
              <td className="px-4 py-2 text-center"><RowActionMenu ariaLabel={`Ações para ${conta.nome}`} items={[{ label: 'Editar', icon: <Edit2 className="h-4 w-4" aria-hidden="true"/>, onClick: () => openForm(conta) }, { label: 'Excluir', icon: <Trash2 className="h-4 w-4" aria-hidden="true"/>, tone: 'danger', onClick: () => { setErrorMessage(''); setDeleting(conta); } }]}/></td>
              <td className="px-3 py-2 font-sans font-semibold text-slate-800 dark:text-slate-200"><span className="flex items-center gap-2">{conta.logo_url ? <img src={conta.logo_url} alt={`Logo de ${conta.nome}`} className="h-7 w-7 rounded object-contain"/> : conta.tipo === 'BANCO' ? <Landmark className="h-5 w-5 text-teal-600" aria-hidden="true"/> : conta.tipo === 'CARTAO' ? <Banknote className="h-5 w-5 text-teal-600" aria-hidden="true"/> : <Vault className="h-5 w-5 text-teal-600" aria-hidden="true"/>}{conta.nome}</span></td>
              <td className="px-3 py-2">{conta.tipo === 'BANCO' ? 'Banco' : conta.tipo === 'CARTAO' ? 'Cartão / maquininha' : 'Cofre local'}</td><td className="px-3 py-2 text-right">{money.format(conta.saldo_inicial)}</td><td className="px-3 py-2 text-right">{money.format(conta.total_entradas)}</td><td className="px-3 py-2 text-right">{money.format(conta.total_saidas)}</td><td className="px-3 py-2 text-right">{money.format(conta.saldo_atual)}</td>
              <td className="px-2 py-2 text-center"><button type="button" onClick={() => void toggleActive(conta)} disabled={isUpdating} aria-label={`${conta.ativo ? 'Desativar' : 'Ativar'} conta ${conta.nome}`} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 ${conta.ativo ? 'bg-teal-500' : 'bg-gray-300 dark:bg-slate-600'}`}><span className={`inline-block h-3 w-3 rounded-full bg-white transition-transform ${conta.ativo ? 'translate-x-5' : 'translate-x-1'}`}></span></button><span className="sr-only">{conta.ativo ? 'Ativo' : 'Inativo'}</span></td>
            </tr>)}
          </tbody></table></div>
        {isFetching && !isLoading && <p role="status" className="px-4 py-2 text-xs text-gray-500">Atualizando...</p>}
        <PaginationFooter page={page} pageSize={pageSize} total={total} onPageChange={setPage} itemLabel="contas"/>
      </div>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3 dark:border-slate-800"><ArrowRightLeft className="h-4 w-4 text-teal-600" aria-hidden="true"/><h3 className="font-bold text-slate-800 dark:text-slate-200">Transferências</h3></div>
        {transferenciaError && !transferenciaOpen && <p role="alert" className="m-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">{transferenciaError}</p>}
        {transferenciasError ? <p role="alert" className="p-6 text-center text-sm text-rose-600">Não foi possível carregar as transferências.</p> : transferenciasLoading ? <p className="p-6 text-center text-sm text-gray-500">Carregando transferências...</p> : transferencias.length === 0 ? <p className="p-6 text-center text-sm text-gray-500">Nenhuma transferência encontrada.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-xs"><thead className="bg-slate-50 font-bold uppercase tracking-wider text-gray-500 dark:bg-slate-850 dark:text-slate-400"><tr><th className="px-3 py-3">Origem</th><th className="px-3 py-3">Destino</th><th className="px-3 py-3 text-right">Valor</th><th className="px-3 py-3">Data</th><th className="px-3 py-3">Observações</th><th className="px-3 py-3 text-center">Ações</th></tr></thead><tbody className="divide-y divide-gray-150 text-gray-700 dark:divide-slate-800 dark:text-slate-200">{transferencias.map((transferencia) => <tr key={transferencia.id} data-testid={`transferencia-row-${transferencia.id}`}><td className="px-3 py-3">{transferencia.conta_origem_nome}</td><td className="px-3 py-3">{transferencia.conta_destino_nome}</td><td className="px-3 py-3 text-right font-mono">{money.format(transferencia.valor)}</td><td className="px-3 py-3">{new Intl.DateTimeFormat('pt-BR').format(new Date(`${transferencia.data}T00:00:00`))}</td><td className="px-3 py-3">{transferencia.observacoes || '—'}</td><td className="px-3 py-3"><div className="flex justify-center gap-2"><Button variant="secondary" type="button" data-testid={`editar-transferencia-${transferencia.id}`} disabled={criandoTransferencia || atualizandoTransferencia || excluindoTransferencia} onClick={() => openTransferencia(transferencia)}>Editar</Button><Button variant="secondary" type="button" data-testid={`excluir-transferencia-${transferencia.id}`} disabled={criandoTransferencia || atualizandoTransferencia || excluindoTransferencia} onClick={() => setTransferenciaDeleting(transferencia)}>Excluir</Button></div></td></tr>)}</tbody></table></div>}
        <PaginationFooter page={transferenciasPage} pageSize={pageSize} total={totalTransferencias} onPageChange={setTransferenciasPage} itemLabel="transferências"/>
      </section>

      <HelpModal isOpen={helpOpen} onClose={() => setHelpOpen(false)} title="Ajuda sobre Bancos e Contas" description="Cada registro representa uma conta bancária, um caixa local ou uma conta de cartão / maquininha." items={[{ title: 'Contas', description: 'Cadastre bancos, cofres locais ou contas de cartão / maquininha para associar aos lançamentos.', icon: <Landmark className="h-4 w-4" aria-hidden="true"/> }, { title: 'Saldos', description: 'Os saldos exibidos são fornecidos pelo controle financeiro.', icon: <Banknote className="h-4 w-4" aria-hidden="true"/> }, { title: 'Status', description: 'Contas inativas permanecem disponíveis para consulta, mas podem ser desativadas para novos usos.', icon: <Power className="h-4 w-4" aria-hidden="true"/> }]}/>
      <Modal isOpen={modalOpen} onClose={closeForm} ariaLabelledBy="bank-form-title"><div className="flex h-full min-h-0 flex-col bg-white shadow-xl dark:bg-slate-900"><div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-gray-50 px-6 py-5 dark:border-slate-800 dark:bg-slate-850"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full border border-teal-100 bg-teal-50 dark:border-teal-900/20 dark:bg-teal-950/30"><Landmark className="h-5 w-5 text-teal-600" aria-hidden="true"/></div><div><h2 id="bank-form-title" className="font-display text-lg font-bold leading-tight text-slate-900 dark:text-white">{editing ? 'Editar Conta' : 'Nova Conta'}</h2><p className="mt-0.5 text-[11px] text-gray-500 dark:text-slate-400">Dados da conta financeira.</p></div></div><button type="button" onClick={closeForm} disabled={saving} aria-label="Fechar formulário" className="rounded-full p-1 text-gray-500 hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:opacity-50 dark:hover:text-red-400"><X className="h-5 w-5" aria-hidden="true"/></button></div>
        <form onSubmit={(event) => void save(event)} className="flex min-h-0 flex-1 flex-col overflow-y-auto custom-scrollbar"><div className="flex-1 space-y-4 p-6"><div><label htmlFor="bank-name" className="mb-1 block text-xs font-bold uppercase text-gray-700 dark:text-slate-300">Nome</label><input id="bank-name" required value={form.nome} onChange={(event) => setForm({ ...form, nome: event.target.value })} className="w-full rounded border border-gray-300 bg-transparent px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:border-slate-700 dark:text-white"/></div>
          <div><label htmlFor="bank-type" className="mb-1 block text-xs font-bold uppercase text-gray-700 dark:text-slate-300">Tipo</label><select id="bank-type" value={form.tipo} onChange={(event) => setForm({ ...form, tipo: event.target.value as TipoBanco })} className="w-full rounded border border-gray-300 bg-white px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"><option value="BANCO">Banco</option><option value="COFRE_LOCAL">Cofre local</option><option value="CARTAO">Cartão / maquininha</option></select></div>
          <div><label htmlFor="bank-logo" className="mb-1 block text-xs font-bold uppercase text-gray-700 dark:text-slate-300">Logo (JPEG, PNG ou WebP; até 5 MB)</label><input id="bank-logo" type="file" accept="image/jpeg,image/png,image/webp" disabled={saving} onChange={(event) => { const file = event.target.files?.[0] ?? null; setLogoFile(file); if (file) setErrorMessage(''); }} className="w-full text-sm text-gray-700 file:mr-3 file:rounded file:border-0 file:bg-slate-100 file:px-3 file:py-2 dark:text-slate-300 dark:file:bg-slate-800"/>{(logoFile || form.logo_url) && <div className="mt-2 flex items-center gap-3">{logoFile ? <img src={logoPreviewUrl ?? ''} alt="Pré-visualização do logo" className="h-12 w-12 rounded object-contain"/> : <img src={form.logo_url ?? ''} alt="Logo atual" className="h-12 w-12 rounded object-contain"/>}<button type="button" disabled={saving} onClick={() => { setLogoFile(null); setForm({ ...form, logo_url: null }); const input = document.getElementById('bank-logo') as HTMLInputElement | null; if (input) input.value = ''; }} className="rounded px-2 py-1 text-xs font-semibold text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:opacity-50">Remover logo</button></div>}</div>
          <div className="grid grid-cols-2 gap-4"><div><label htmlFor="bank-opening-balance" className="mb-1 block text-xs font-bold uppercase text-gray-700 dark:text-slate-300">Saldo inicial</label><MoneyInput id="bank-opening-balance" required value={form.saldo_inicial} onChange={(saldo_inicial) => setForm({ ...form, saldo_inicial })} className="w-full rounded border border-gray-300 bg-transparent px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:border-slate-700 dark:text-white"/></div><div><label htmlFor="bank-opening-date" className="mb-1 block text-xs font-bold uppercase text-gray-700 dark:text-slate-300">Data do saldo inicial</label><input id="bank-opening-date" type="date" required value={form.data_saldo_inicial} onChange={(event) => setForm({ ...form, data_saldo_inicial: event.target.value })} className="w-full rounded border border-gray-300 bg-transparent px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:border-slate-700 dark:text-white"/></div></div>
          {errorMessage && <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">{errorMessage}</p>}</div><div className="sticky bottom-0 flex shrink-0 justify-end gap-3 border-t border-gray-200 bg-white px-6 py-4 shadow-md dark:border-slate-800 dark:bg-slate-900"><Button variant="secondary" type="button" onClick={closeForm} disabled={saving}>Cancelar</Button><Button type="submit" disabled={saving}>{saving ? 'Salvando...' : editing ? 'Atualizar' : 'Salvar'}</Button></div>
        </form></div></Modal>

      <Modal isOpen={transferenciaOpen} onClose={closeTransferencia} ariaLabelledBy="transfer-form-title"><div className="flex h-full min-h-0 flex-col bg-white shadow-xl dark:bg-slate-900"><div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-gray-50 px-6 py-5 dark:border-slate-800 dark:bg-slate-850"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full border border-teal-100 bg-teal-50 dark:border-teal-900/20 dark:bg-teal-950/30"><ArrowRightLeft className="h-5 w-5 text-teal-600" aria-hidden="true"/></div><div><h2 id="transfer-form-title" className="font-display text-lg font-bold leading-tight text-slate-900 dark:text-white">{transferenciaEditing ? 'Editar transferência' : 'Transferir entre contas'}</h2><p className="mt-0.5 text-[11px] text-gray-500 dark:text-slate-400">Movimente valores entre contas financeiras.</p></div></div><button type="button" onClick={closeTransferencia} disabled={transferenciaSaving} aria-label="Fechar formulário de transferência" className="rounded-full p-1 text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:opacity-50"><X className="h-5 w-5" aria-hidden="true"/></button></div><form onSubmit={(event) => void saveTransferencia(event)} className="flex min-h-0 flex-1 flex-col overflow-y-auto custom-scrollbar"><div className="flex-1 space-y-4 p-6">
          {transferenciaEditing ? <div className="grid grid-cols-2 gap-4"><div><span className="mb-1 block text-xs font-bold uppercase text-gray-700 dark:text-slate-300">Conta de origem</span><p>{transferenciaEditing.conta_origem_nome}</p></div><div><span className="mb-1 block text-xs font-bold uppercase text-gray-700 dark:text-slate-300">Conta de destino</span><p>{transferenciaEditing.conta_destino_nome}</p></div></div> : <div className="grid grid-cols-2 gap-4"><div><label htmlFor="transfer-origem" className="mb-1 block text-xs font-bold uppercase text-gray-700 dark:text-slate-300">Conta de origem</label><select id="transfer-origem" data-testid="transfer-origem" required value={transferenciaForm.origem_id} onChange={(event) => setTransferenciaForm({ ...transferenciaForm, origem_id: event.target.value })} className="w-full rounded border border-gray-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900 dark:text-white"><option value="">Selecione uma conta</option>{contas.filter((conta) => conta.ativo).map((conta) => <option key={conta.id} value={conta.id}>{conta.nome}</option>)}</select></div><div><label htmlFor="transfer-destino" className="mb-1 block text-xs font-bold uppercase text-gray-700 dark:text-slate-300">Conta de destino</label><select id="transfer-destino" data-testid="transfer-destino" required value={transferenciaForm.destino_id} onChange={(event) => setTransferenciaForm({ ...transferenciaForm, destino_id: event.target.value })} className="w-full rounded border border-gray-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900 dark:text-white"><option value="">Selecione uma conta</option>{contas.filter((conta) => conta.ativo).map((conta) => <option key={conta.id} value={conta.id}>{conta.nome}</option>)}</select></div></div>}
          <div className="grid grid-cols-2 gap-4"><div><label htmlFor="transfer-valor" className="mb-1 block text-xs font-bold uppercase text-gray-700 dark:text-slate-300">Valor</label><MoneyInput id="transfer-valor" dataTestId="transfer-valor" required value={transferenciaForm.valor} onChange={(valor) => setTransferenciaForm({ ...transferenciaForm, valor })} className="w-full rounded border border-gray-300 bg-transparent px-3 py-2 dark:border-slate-700 dark:text-white"/></div><div><label htmlFor="transfer-data" className="mb-1 block text-xs font-bold uppercase text-gray-700 dark:text-slate-300">Data</label><input id="transfer-data" data-testid="transfer-data" type="date" required value={transferenciaForm.data} onChange={(event) => setTransferenciaForm({ ...transferenciaForm, data: event.target.value })} className="w-full rounded border border-gray-300 bg-transparent px-3 py-2 dark:border-slate-700 dark:text-white"/></div></div>
          <div><label htmlFor="transfer-observacoes" className="mb-1 block text-xs font-bold uppercase text-gray-700 dark:text-slate-300">Observações</label><textarea id="transfer-observacoes" data-testid="transfer-observacoes" rows={3} value={transferenciaForm.observacoes} onChange={(event) => setTransferenciaForm({ ...transferenciaForm, observacoes: event.target.value })} className="w-full rounded border border-gray-300 bg-transparent px-3 py-2 dark:border-slate-700 dark:text-white"/></div>
          {transferenciaError && <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">{transferenciaError}</p>}</div><div className="sticky bottom-0 flex shrink-0 justify-end gap-3 border-t border-gray-200 bg-white px-6 py-4 shadow-md dark:border-slate-800 dark:bg-slate-900"><Button variant="secondary" type="button" onClick={closeTransferencia} disabled={transferenciaSaving}>Cancelar</Button><Button type="submit" disabled={transferenciaSaving}>{transferenciaSaving ? 'Salvando...' : transferenciaEditing ? 'Atualizar' : 'Transferir'}</Button></div>
        </form></div></Modal>
      <ConfirmDeleteModal isOpen={deleting !== null} onClose={() => !busy && setDeleting(null)} onConfirm={confirmDelete} itemName={deleting?.nome} isPending={busy}/>
      <ConfirmDeleteModal isOpen={transferenciaDeleting !== null} onClose={() => !excluindoTransferencia && setTransferenciaDeleting(null)} onConfirm={confirmDeleteTransferencia} itemName={transferenciaDeleting ? `${transferenciaDeleting.conta_origem_nome} para ${transferenciaDeleting.conta_destino_nome}` : undefined} isPending={excluindoTransferencia}/>
    </div>
  );
}
