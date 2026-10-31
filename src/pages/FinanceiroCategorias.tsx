import { useEffect, useState, type FormEvent } from 'react';
import { ArrowDownCircle, ArrowUpCircle, Edit2, HelpCircle, Plus, Power, Trash2, X } from 'lucide-react';
import { useIsFetching, useQueryClient } from '@tanstack/react-query';
import { useCategoriasFinanceiras } from '../hooks/useCategoriasFinanceiras';
import type { CategoriaFinanceira, TipoLancamento } from '../types/financeiro';
import { Button } from '../components/ui/Button';
import { ConfirmDeleteModal } from '../components/ui/ConfirmDeleteModal';
import { HelpModal } from '../components/ui/HelpModal';
import { Modal } from '../components/ui/Modal';
import { QueryErrorState } from '../components/ui/QueryErrorState';
import { AnimatedTabs } from '../components/ui/AnimatedTabs';
import { RowActionMenu } from '../components/ui/RowActionMenu';
import { PaginationFooter } from '../components/ui/PaginationFooter';
const pageSize = 20;

const tabs = [
  { id: 'ENTRADA', label: 'Entradas', icon: <ArrowUpCircle className="h-4 w-4" aria-hidden="true"/> },
  { id: 'SAIDA', label: 'Saídas', icon: <ArrowDownCircle className="h-4 w-4" aria-hidden="true"/> },
] as const;

export default function FinanceiroCategorias() {
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<TipoLancamento>('ENTRADA');
  const { categoriasPagina, total, createCategoria, updateCategoria, deleteCategoria, isLoading, isError, isCreating, isUpdating, isDeleting } = useCategoriasFinanceiras({ page, pageSize, tipo: activeTab });
  const queryClient = useQueryClient();
  const isRetrying = useIsFetching({ queryKey: ['categorias-financeiras'] }) > 0;
  const [editing, setEditing] = useState<CategoriaFinanceira | null>(null);
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<TipoLancamento>('ENTRADA');
  const [modalOpen, setModalOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [deleting, setDeleting] = useState<CategoriaFinanceira | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const saving = isCreating || isUpdating;
  const shownCategorias = categoriasPagina;

  useEffect(() => setPage(1), [activeTab]);

  const openForm = (categoria?: CategoriaFinanceira) => {
    setEditing(categoria ?? null);
    setNome(categoria?.nome ?? '');
    setTipo(categoria?.tipo ?? activeTab);
    setErrorMessage('');
    setModalOpen(true);
  };
  const closeForm = () => { if (!saving) setModalOpen(false); };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    setErrorMessage('');
    try {
      if (editing) await updateCategoria({ id: editing.id, updates: { nome: nome.trim() } });
      else await createCategoria({ nome: nome.trim(), tipo });
      setModalOpen(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Não foi possível salvar a categoria.');
    }
  };
  const toggleActive = async (categoria: CategoriaFinanceira) => {
    try {
      await updateCategoria({ id: categoria.id, updates: { ativo: !categoria.ativo } });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Não foi possível atualizar o status da categoria.');
    }
  };
  const confirmDelete = async () => {
    if (!deleting) return;
    setErrorMessage('');
    try {
      await deleteCategoria(deleting.id);
      setDeleting(null);
    } catch (error) {
      setDeleting(null);
      setErrorMessage(error instanceof Error ? error.message : 'Não foi possível excluir a categoria.');
    }
  };

  return (
    <div className="flex-1 flex flex-col p-6 gap-6 overflow-y-auto">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 shrink-0"><div><h2 className="font-display text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white leading-tight">Categorias Financeiras</h2><p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Organize as categorias usadas para classificar entradas e saídas.</p></div><div className="flex items-center gap-2"><Button variant="secondary" type="button" onClick={() => setHelpOpen(true)} icon={<HelpCircle className="w-4 h-4" aria-hidden="true"/>} aria-label="Ajuda">Ajuda</Button><Button onClick={() => openForm()} icon={<Plus className="w-4 h-4" aria-hidden="true"/>}>Nova Categoria</Button></div></div>
      {errorMessage && !modalOpen && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">{errorMessage}</p>}
      {isError && !isLoading && <QueryErrorState onRetry={() => void queryClient.invalidateQueries({ queryKey: ['categorias-financeiras'] })} isRetrying={isRetrying} message="Verifique sua conexão e tente novamente."/>}
      <section className="flex-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"><AnimatedTabs tabs={tabs} value={activeTab} onChange={setActiveTab} ariaLabel="Tipo de categoria" idPrefix="animated-tabs-categorias" className="border-b border-gray-200 px-3 dark:border-slate-800"/><div role="tabpanel" id={`animated-tabs-categorias-${activeTab}-panel`} aria-labelledby={`animated-tabs-categorias-${activeTab}`} className="max-h-[calc(100vh-16rem)] min-h-[300px] overflow-auto custom-scrollbar"><table className="w-full table-fixed border-collapse text-left text-xs"><thead className="sticky top-0 z-10 border-b border-gray-200 bg-slate-50 font-bold uppercase tracking-wider text-gray-500 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-400"><tr><th className="w-12 px-2 py-3 text-center" aria-label="Ações"></th><th className="px-3 py-3">Nome</th><th className="w-28 px-2 py-3 text-center">Status</th><th className="w-44 px-3 py-3">Criada em</th></tr></thead><tbody className="divide-y divide-gray-150 font-mono text-gray-700 dark:divide-slate-800 dark:text-slate-200">
        {isLoading ? <tr><td colSpan={4} className="px-4 py-8 text-center"><div className="flex flex-col items-center gap-2 text-gray-500"><div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent" aria-label="Carregando"/><p className="font-sans text-sm">Carregando categorias...</p></div></td></tr> : isError ? <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">Não foi possível carregar as categorias.</td></tr> : shownCategorias.length === 0 ? <tr><td colSpan={4} className="px-4 py-12 text-center font-sans text-gray-500"><div className="flex flex-col items-center gap-2.5"><div className="rounded-full bg-teal-500/10 p-3 text-teal-500">{activeTab === 'ENTRADA' ? <ArrowUpCircle className="h-6 w-6" aria-hidden="true"/> : <ArrowDownCircle className="h-6 w-6" aria-hidden="true"/>}</div><p className="text-sm font-bold text-slate-800 dark:text-slate-200">Nenhuma categoria nesta aba</p></div></td></tr> : shownCategorias.map((categoria) => <tr key={categoria.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 ${!categoria.ativo ? 'opacity-60' : ''}`}><td className="px-4 py-2 text-center"><RowActionMenu ariaLabel={`Ações para ${categoria.nome}`} items={[{ label: 'Editar', icon: <Edit2 className="h-4 w-4" aria-hidden="true"/>, onClick: () => openForm(categoria) }, { label: 'Excluir', icon: <Trash2 className="h-4 w-4" aria-hidden="true"/>, tone: 'danger', onClick: () => { setErrorMessage(''); setDeleting(categoria); } }]}/></td><td className="px-3 py-2 font-sans font-semibold text-slate-800 dark:text-slate-200">{categoria.nome}</td><td className="px-2 py-2 text-center"><button type="button" onClick={() => void toggleActive(categoria)} disabled={isUpdating} aria-label={`${categoria.ativo ? 'Desativar' : 'Ativar'} categoria ${categoria.nome}`} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 ${categoria.ativo ? 'bg-teal-500' : 'bg-gray-300 dark:bg-slate-600'}`}><span className={`inline-block h-3 w-3 rounded-full bg-white transition-transform ${categoria.ativo ? 'translate-x-5' : 'translate-x-1'}`}></span></button><span className="sr-only">{categoria.ativo ? 'Ativa' : 'Inativa'}</span></td><td className="px-3 py-2">{new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(categoria.created_at))}</td></tr>)}
        </tbody></table></div><PaginationFooter page={page} pageSize={pageSize} total={total} onPageChange={setPage} itemLabel="categorias"/></section>
      <HelpModal isOpen={helpOpen} onClose={() => setHelpOpen(false)} title="Ajuda sobre Categorias Financeiras" description="As categorias separam os lançamentos por finalidade." items={[{ title: 'Entradas e saídas', description: 'Use as abas para consultar categorias de recebimentos ou despesas.', icon: <ArrowUpCircle className="h-4 w-4" aria-hidden="true"/> }, { title: 'Tipo fixo', description: 'O tipo da categoria não pode ser alterado depois de criado.', icon: <Power className="h-4 w-4" aria-hidden="true"/> }, { title: 'Categorias de transferência', description: 'As categorias de transferência entre contas são mantidas pelo sistema.', icon: <Power className="h-4 w-4" aria-hidden="true"/> }]}/>
      <Modal isOpen={modalOpen} onClose={closeForm} ariaLabelledBy="category-form-title"><div className="rounded-xl bg-white shadow-xl dark:bg-slate-900"><div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-slate-800"><h2 id="category-form-title" className="flex items-center gap-2 text-lg font-bold text-slate-800 dark:text-white">{editing ? <Edit2 className="h-5 w-5 text-teal-600" aria-hidden="true"/> : <Plus className="h-5 w-5 text-teal-600" aria-hidden="true"/>}{editing ? 'Editar Categoria' : 'Nova Categoria'}</h2><button type="button" onClick={closeForm} disabled={saving} aria-label="Fechar formulário" className="rounded p-1 text-gray-500 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:opacity-50 dark:hover:text-white"><X className="h-5 w-5" aria-hidden="true"/></button></div><form onSubmit={(event) => void save(event)} className="space-y-4 p-6"><div><label htmlFor="category-name" className="mb-1 block text-xs font-bold uppercase text-gray-700 dark:text-slate-300">Nome</label><input id="category-name" required value={nome} onChange={(event) => setNome(event.target.value)} className="w-full rounded border border-gray-300 bg-transparent px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:border-slate-700 dark:text-white"/></div><div><label htmlFor="category-type" className="mb-1 block text-xs font-bold uppercase text-gray-700 dark:text-slate-300">Tipo</label><select id="category-type" disabled={Boolean(editing)} value={tipo} onChange={(event) => setTipo(event.target.value as TipoLancamento)} className="w-full rounded border border-gray-300 bg-white px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-white"><option value="ENTRADA">Entrada</option><option value="SAIDA">Saída</option></select>{editing && <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">O tipo não pode ser alterado depois que a categoria é criada.</p>}</div>{errorMessage && <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">{errorMessage}</p>}<div className="flex justify-end gap-3 pt-2"><Button variant="secondary" type="button" onClick={closeForm} disabled={saving}>Cancelar</Button><Button type="submit" disabled={saving}>{saving ? 'Salvando...' : editing ? 'Atualizar' : 'Salvar'}</Button></div></form></div></Modal>
      <ConfirmDeleteModal isOpen={deleting !== null} onClose={() => !isDeleting && setDeleting(null)} onConfirm={confirmDelete} itemName={deleting?.nome} isPending={isDeleting}/>
    </div>
  );
}
