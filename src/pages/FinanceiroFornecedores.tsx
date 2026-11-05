import { useEffect, useState, type FormEvent } from 'react';
import { Edit2, HelpCircle, Plus, Power, Truck, Trash2, X } from 'lucide-react';
import { useIsFetching, useQueryClient } from '@tanstack/react-query';
import { useFornecedores } from '../hooks/useFornecedores';
import type { Fornecedor, TipoDocumentoFornecedor } from '../types/financeiro';
import { Button } from '../components/ui/Button';
import { ConfirmDeleteModal } from '../components/ui/ConfirmDeleteModal';
import { HelpModal } from '../components/ui/HelpModal';
import { SlidePanel as Modal } from '../components/ui/SlidePanel';
import { QueryErrorState } from '../components/ui/QueryErrorState';
import { TableSkeleton } from '../components/ui/FinanceiroSkeleton';
import { RowActionMenu } from '../components/ui/RowActionMenu';
import { PaginationFooter } from '../components/ui/PaginationFooter';
import { BRAZIL_STATES } from '../utils/states';
import { formatPhone } from '../utils/format';
import { buscarEnderecoPorCep } from '../services/cepService';

const pageSize = 20;

type FornecedorForm = {
  nome: string; tipo_documento: TipoDocumentoFornecedor; cpf_cnpj: string; cep: string; logradouro: string; numero: string;
  complemento: string; bairro: string; cidade: string; estado: string; telefone: string; email: string;
};
const emptyForm: FornecedorForm = { nome: '', tipo_documento: 'CPF', cpf_cnpj: '', cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '', telefone: '', email: '' };

function formatDocument(value: string, type: TipoDocumentoFornecedor) {
  const digits = value.replace(/\D/g, '').slice(0, type === 'CPF' ? 11 : 14);
  if (type === 'CPF') return digits.replace(/^(\d{3})(\d)/, '$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2');
  return digits.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

export default function FinanceiroFornecedores() {
  const [page, setPage] = useState(1);
  const { fornecedoresPagina: fornecedores, total, createFornecedor, updateFornecedor, deleteFornecedor, isLoading, isFetching, isError, isCreating, isUpdating, isDeleting } = useFornecedores({ page, pageSize });
  const queryClient = useQueryClient();
  const isRetrying = useIsFetching({ queryKey: ['fornecedores'] }) > 0;
  const [editing, setEditing] = useState<Fornecedor | null>(null);
  const [form, setForm] = useState<FornecedorForm>(emptyForm);
  const [modalOpen, setModalOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [deleting, setDeleting] = useState<Fornecedor | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const saving = isCreating || isUpdating;

  useEffect(() => {
    if (!isLoading && page > 1 && fornecedores.length === 0) setPage((current) => current - 1);
  }, [page, isLoading, fornecedores.length]);

  const openForm = (fornecedor?: Fornecedor) => {
    setEditing(fornecedor ?? null);
    setForm(fornecedor ? {
      nome: fornecedor.nome, tipo_documento: fornecedor.tipo_documento, cpf_cnpj: formatDocument(fornecedor.cpf_cnpj, fornecedor.tipo_documento),
      cep: fornecedor.cep ?? '', logradouro: fornecedor.logradouro ?? '', numero: fornecedor.numero ?? '', complemento: fornecedor.complemento ?? '',
      bairro: fornecedor.bairro ?? '', cidade: fornecedor.cidade ?? '', estado: fornecedor.estado ?? '', telefone: fornecedor.telefone ?? '', email: fornecedor.email ?? '',
    } : { ...emptyForm });
    setErrorMessage('');
    setModalOpen(true);
  };
  const closeForm = () => { if (!saving) setModalOpen(false); };
  const handleCepBlur = async () => {
    const endereco = await buscarEnderecoPorCep(form.cep);
    if (!endereco) return;
    setForm((current) => ({ ...current, logradouro: endereco.logradouro || current.logradouro, bairro: endereco.bairro || current.bairro, cidade: endereco.cidade || current.cidade, estado: endereco.uf || current.estado }));
  };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    setErrorMessage('');
    const documentDigits = form.cpf_cnpj.replace(/\D/g, '');
    const expectedLength = form.tipo_documento === 'CPF' ? 11 : 14;
    if (documentDigits.length !== expectedLength) {
      setErrorMessage(`${form.tipo_documento} deve conter exatamente ${expectedLength} dígitos.`);
      return;
    }
    const payload = {
      nome: form.nome.trim(), tipo_documento: form.tipo_documento, cpf_cnpj: documentDigits,
      cep: form.cep || null, logradouro: form.logradouro || null, numero: form.numero || null, complemento: form.complemento || null,
      bairro: form.bairro || null, cidade: form.cidade || null, estado: form.estado || null, telefone: form.telefone || null,
      email: form.email || null,
    };
    try {
      if (editing) await updateFornecedor({ id: editing.id, updates: payload });
      else await createFornecedor({ ...payload, ativo: true });
      setModalOpen(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Não foi possível salvar o fornecedor.');
    }
  };
  const toggleActive = async (fornecedor: Fornecedor) => {
    try {
      await updateFornecedor({ id: fornecedor.id, updates: { ativo: !fornecedor.ativo } });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Não foi possível atualizar o status do fornecedor.');
    }
  };
  const confirmDelete = async () => {
    if (!deleting) return;
    setErrorMessage('');
    try {
      await deleteFornecedor(deleting.id);
      setDeleting(null);
    } catch (error) {
      setDeleting(null);
      setErrorMessage(error instanceof Error ? error.message : 'Não foi possível excluir o fornecedor.');
    }
  };

  return (
    <div className="flex-1 flex flex-col p-6 gap-6 overflow-y-auto">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 shrink-0"><div><h2 className="font-display text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white leading-tight">Fornecedores</h2><p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Cadastre e mantenha os dados de contato dos fornecedores.</p></div><div className="flex items-center gap-2"><Button variant="secondary" type="button" onClick={() => setHelpOpen(true)} icon={<HelpCircle className="w-4 h-4" aria-hidden="true"/>} aria-label="Ajuda">Ajuda</Button><Button onClick={() => openForm()} icon={<Plus className="w-4 h-4" aria-hidden="true"/>}>Novo Fornecedor</Button></div></div>
      {errorMessage && !modalOpen && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">{errorMessage}</p>}
      <QueryErrorState onRetry={() => void queryClient.invalidateQueries({ queryKey: ['fornecedores'] })} isRetrying={isRetrying} isError={isError} isFetching={isFetching} isLoading={isLoading} message="Verifique sua conexão e tente novamente."/>
      <div className="flex-1 border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm flex flex-col min-h-[350px]"><div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar"><table className="w-full min-w-[900px] table-fixed border-collapse text-left text-xs"><thead className="sticky top-0 z-10 border-b border-gray-200 bg-slate-50 font-bold uppercase tracking-wider text-gray-500 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-400"><tr><th className="w-12 px-2 py-3 text-center" aria-label="Ações"></th><th className="w-[20%] px-3 py-3">Nome</th><th className="w-[16%] px-3 py-3">CPF/CNPJ</th><th className="w-[14%] px-3 py-3">Telefone</th><th className="w-[18%] px-3 py-3">E-mail</th><th className="w-[17%] px-3 py-3">Cidade/UF</th><th className="w-[10%] px-2 py-3 text-center">Status</th></tr></thead><tbody className="divide-y divide-gray-150 font-mono text-gray-700 dark:divide-slate-800 dark:text-slate-200">
        {isLoading ? <TableSkeleton columns={7}/> : isError ? null : fornecedores.length === 0 ? <tr><td colSpan={7} className="px-4 py-12 text-center font-sans text-gray-500"><div className="flex flex-col items-center gap-2.5"><div className="rounded-full bg-teal-500/10 p-3 text-teal-500"><Truck className="h-6 w-6" aria-hidden="true"/></div><p className="text-sm font-bold text-slate-800 dark:text-slate-200">Nenhum fornecedor encontrado</p><p className="text-xs text-gray-400">Adicione um fornecedor para começar.</p></div></td></tr> : fornecedores.map((fornecedor) => <tr key={fornecedor.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 ${!fornecedor.ativo ? 'opacity-60' : ''}`}><td className="px-4 py-2 text-center"><RowActionMenu ariaLabel={`Ações para ${fornecedor.nome}`} items={[{ label: 'Editar', icon: <Edit2 className="h-4 w-4" aria-hidden="true"/>, onClick: () => openForm(fornecedor) }, { label: 'Excluir', icon: <Trash2 className="h-4 w-4" aria-hidden="true"/>, tone: 'danger', onClick: () => { setErrorMessage(''); setDeleting(fornecedor); } }]}/></td><td className="px-3 py-2 font-sans font-semibold text-slate-800 dark:text-slate-200">{fornecedor.nome}</td><td className="px-3 py-2">{formatDocument(fornecedor.cpf_cnpj, fornecedor.tipo_documento)}</td><td className="px-3 py-2">{fornecedor.telefone || '—'}</td><td className="break-words px-3 py-2">{fornecedor.email || '—'}</td><td className="px-3 py-2">{[fornecedor.cidade, fornecedor.estado].filter(Boolean).join('/') || '—'}</td><td className="px-2 py-2 text-center"><button type="button" onClick={() => void toggleActive(fornecedor)} disabled={isUpdating} aria-label={`${fornecedor.ativo ? 'Desativar' : 'Ativar'} fornecedor ${fornecedor.nome}`} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 ${fornecedor.ativo ? 'bg-teal-500' : 'bg-gray-300 dark:bg-slate-600'}`}><span className={`inline-block h-3 w-3 rounded-full bg-white transition-transform ${fornecedor.ativo ? 'translate-x-5' : 'translate-x-1'}`}></span></button><span className="sr-only">{fornecedor.ativo ? 'Ativo' : 'Inativo'}</span></td></tr>)}
        </tbody></table></div>{isFetching && !isLoading && <p role="status" className="px-4 py-2 text-xs text-gray-500">Atualizando...</p>}<PaginationFooter page={page} pageSize={pageSize} total={total} onPageChange={setPage} itemLabel="fornecedores"/></div>
      <HelpModal isOpen={helpOpen} onClose={() => setHelpOpen(false)} title="Ajuda sobre Fornecedores" description="Mantenha os dados cadastrais e de contato dos fornecedores organizados." items={[{ title: 'Documento', description: 'Informe CPF ou CNPJ com a quantidade de dígitos correspondente.', icon: <Truck className="h-4 w-4" aria-hidden="true"/> }, { title: 'Status', description: 'Ative ou desative fornecedores sem remover o cadastro.', icon: <Power className="h-4 w-4" aria-hidden="true"/> }]}/>
      <Modal isOpen={modalOpen} onClose={closeForm} ariaLabelledBy="supplier-form-title"><div className="flex h-full min-h-0 flex-col bg-white shadow-xl dark:bg-slate-900"><div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-gray-50 px-6 py-5 dark:border-slate-800 dark:bg-slate-850"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full border border-teal-100 bg-teal-50 dark:border-teal-900/20 dark:bg-teal-950/30">{editing ? <Edit2 className="h-5 w-5 text-teal-600" aria-hidden="true"/> : <Plus className="h-5 w-5 text-teal-600" aria-hidden="true"/>}</div><div><h2 id="supplier-form-title" className="font-display text-lg font-bold leading-tight text-slate-900 dark:text-white">{editing ? 'Editar Fornecedor' : 'Novo Fornecedor'}</h2><p className="mt-0.5 text-[11px] text-gray-500 dark:text-slate-400">Dados cadastrais e de contato do fornecedor.</p></div></div><button type="button" onClick={closeForm} disabled={saving} aria-label="Fechar formulário" className="rounded-full p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-red-400"><X className="h-5 w-5" aria-hidden="true"/></button></div><form onSubmit={(event) => void save(event)} className="flex min-h-0 flex-1 flex-col overflow-y-auto custom-scrollbar"><div className="flex-1 space-y-4 p-6 font-sans"><div className="space-y-1.5"><label htmlFor="supplier-name" className="text-xs font-bold uppercase tracking-wide text-gray-700 dark:text-slate-300">Nome *</label><input id="supplier-name" required value={form.nome} onChange={(event) => setForm({ ...form, nome: event.target.value })} className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:border-slate-700 dark:bg-slate-850 dark:text-white"/></div>
        <div className="space-y-4"><div><label htmlFor="supplier-document-type" className="text-xs font-bold uppercase tracking-wide text-gray-700 dark:text-slate-300">Tipo de documento</label><select id="supplier-document-type" value={form.tipo_documento} onChange={(event) => { const nextType = event.target.value as TipoDocumentoFornecedor; setForm({ ...form, tipo_documento: nextType, cpf_cnpj: formatDocument(form.cpf_cnpj, nextType) }); }} className="w-full rounded border border-gray-300 bg-transparent px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"><option value="CPF">CPF</option><option value="CNPJ">CNPJ</option></select></div><div><label htmlFor="supplier-document" className="text-xs font-bold uppercase tracking-wide text-gray-700 dark:text-slate-300">CPF/CNPJ *</label><input id="supplier-document" required inputMode="numeric" autoComplete="off" value={form.cpf_cnpj} onChange={(event) => setForm({ ...form, cpf_cnpj: formatDocument(event.target.value, form.tipo_documento) })} placeholder={form.tipo_documento === 'CPF' ? '000.000.000-00' : '00.000.000/0000-00'} className="w-full rounded border border-gray-300 bg-transparent px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:border-slate-700 dark:text-white"/></div></div>
        <div className="space-y-4"><div><label htmlFor="supplier-cep" className="text-xs font-bold uppercase tracking-wide text-gray-700 dark:text-slate-300">CEP</label><input id="supplier-cep" value={form.cep} onChange={(event) => setForm({ ...form, cep: event.target.value })} onBlur={() => void handleCepBlur()} autoComplete="postal-code" className="w-full rounded border border-gray-300 bg-transparent px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:border-slate-700 dark:text-white"/></div><div><label htmlFor="supplier-street" className="text-xs font-bold uppercase tracking-wide text-gray-700 dark:text-slate-300">Logradouro</label><input id="supplier-street" value={form.logradouro} onChange={(event) => setForm({ ...form, logradouro: event.target.value })} autoComplete="street-address" className="w-full rounded border border-gray-300 bg-transparent px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:border-slate-700 dark:text-white"/></div></div>
        <div className="space-y-4"><div><label htmlFor="supplier-number" className="text-xs font-bold uppercase tracking-wide text-gray-700 dark:text-slate-300">Número</label><input id="supplier-number" value={form.numero} onChange={(event) => setForm({ ...form, numero: event.target.value })} className="w-full rounded border border-gray-300 bg-transparent px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:border-slate-700 dark:text-white"/></div><div><label htmlFor="supplier-complement" className="text-xs font-bold uppercase tracking-wide text-gray-700 dark:text-slate-300">Complemento</label><input id="supplier-complement" value={form.complemento} onChange={(event) => setForm({ ...form, complemento: event.target.value })} className="w-full rounded border border-gray-300 bg-transparent px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:border-slate-700 dark:text-white"/></div></div>
        <div className="space-y-4"><div><label htmlFor="supplier-neighborhood" className="text-xs font-bold uppercase tracking-wide text-gray-700 dark:text-slate-300">Bairro</label><input id="supplier-neighborhood" value={form.bairro} onChange={(event) => setForm({ ...form, bairro: event.target.value })} className="w-full rounded border border-gray-300 bg-transparent px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:border-slate-700 dark:text-white"/></div><div><label htmlFor="supplier-city" className="text-xs font-bold uppercase tracking-wide text-gray-700 dark:text-slate-300">Cidade</label><input id="supplier-city" value={form.cidade} onChange={(event) => setForm({ ...form, cidade: event.target.value })} autoComplete="address-level2" className="w-full rounded border border-gray-300 bg-transparent px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:border-slate-700 dark:text-white"/></div></div>
        <div className="space-y-4"><div><label htmlFor="supplier-state" className="text-xs font-bold uppercase tracking-wide text-gray-700 dark:text-slate-300">Estado</label><select id="supplier-state" value={form.estado} onChange={(event) => setForm({ ...form, estado: event.target.value })} className="w-full rounded border border-gray-300 bg-white px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"><option value="">Selecione</option>{BRAZIL_STATES.map((state) => <option key={state} value={state}>{state}</option>)}</select></div><div><label htmlFor="supplier-phone" className="text-xs font-bold uppercase tracking-wide text-gray-700 dark:text-slate-300">Telefone</label><input id="supplier-phone" type="tel" inputMode="tel" autoComplete="tel" value={form.telefone} onChange={(event) => setForm({ ...form, telefone: formatPhone(event.target.value) })} className="w-full rounded border border-gray-300 bg-transparent px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:border-slate-700 dark:text-white"/></div></div>
        <div className="space-y-1.5"><label htmlFor="supplier-email" className="text-xs font-bold uppercase tracking-wide text-gray-700 dark:text-slate-300">E-mail</label><input id="supplier-email" type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:border-slate-700 dark:bg-slate-850 dark:text-white"/></div>
        {errorMessage && <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">{errorMessage}</p>}</div><div className="sticky bottom-0 flex shrink-0 justify-end gap-3 border-t border-gray-200 bg-white px-6 py-4 shadow-md dark:border-slate-800 dark:bg-slate-900"><Button variant="secondary" type="button" onClick={closeForm} disabled={saving}>Cancelar</Button><Button type="submit" disabled={saving}>{saving ? 'Salvando...' : editing ? 'Atualizar' : 'Salvar'}</Button></div></form></div></Modal>
      <ConfirmDeleteModal isOpen={deleting !== null} onClose={() => !isDeleting && setDeleting(null)} onConfirm={confirmDelete} itemName={deleting?.nome} isPending={isDeleting}/>
    </div>
  );
}
