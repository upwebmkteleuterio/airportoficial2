import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Banknote, Edit2, HelpCircle, Landmark, Plus, Receipt, Search, Trash2, Vault, X } from 'lucide-react';
import { useIsFetching, useQueryClient } from '@tanstack/react-query';
import { Button } from '../components/ui/Button';
import { ConfirmDeleteModal } from '../components/ui/ConfirmDeleteModal';
import { HelpModal } from '../components/ui/HelpModal';
import { Modal } from '../components/ui/Modal';
import { QueryErrorState } from '../components/ui/QueryErrorState';
import { RowActionMenu } from '../components/ui/RowActionMenu';
import { useBancos } from '../hooks/useBancos';
import { useCategoriasFinanceiras } from '../hooks/useCategoriasFinanceiras';
import { useLancamentosFinanceiros } from '../hooks/useLancamentosFinanceiros';
import { useAlunosPorCpf, useParticipantesFinanceiros } from '../hooks/useParticipantesFinanceiros';
import { useUIStore } from '../store/uiStore';
import type { FormaPagamento, LancamentoComRelacoes, LancamentoFinanceiro, ParticipanteOpcao, TipoLancamento, TipoParticipante, TipoSituacaoLancamento } from '../types/financeiro';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const pageSize = 20;
const focusClass = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-1';
const inputClass = `w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-slate-800 ${focusClass} dark:border-slate-700 dark:bg-slate-900 dark:text-white`;
const labelClass = 'mb-1 block text-xs font-bold uppercase text-gray-700 dark:text-slate-300';

 type TipoPicker = '' | 'ALUNO' | 'INSTRUTOR' | 'EMPRESA' | 'FORNECEDOR' | 'COORDENADOR';
type LancamentoForm = {
  tipo: TipoLancamento;
  status: TipoSituacaoLancamento;
  valor: string;
  data_competencia: string;
  data_efetivacao: string;
  banco_id: string;
  categoria_id: string;
  descricao: string;
  forma_pagamento: FormaPagamento | '';
  numero_documento: string;
  observacoes: string;
  participante_tipo: TipoPicker;
  participante_id: string;
  participante: ParticipanteOpcao | null;
};

function hojeLocal(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function novoFormulario(): LancamentoForm {
  return { tipo: 'ENTRADA', status: 'EFETIVADO', valor: '', data_competencia: hojeLocal(), data_efetivacao: hojeLocal(), banco_id: '', categoria_id: '', descricao: '', forma_pagamento: '', numero_documento: '', observacoes: '', participante_tipo: '', participante_id: '', participante: null };
}

function formatarData(data: string): string {
  const [ano, mes, dia] = data.split('-');
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : data;
}

function formatarDocumento(documento: string | null): string | null {
  const digitos = documento?.replace(/\D/g, '') ?? '';
  if (digitos.length === 11) return digitos.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  if (digitos.length === 14) return digitos.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  return null;
}

const formasPagamento: { value: FormaPagamento; label: string }[] = [
  { value: 'PIX', label: 'PIX' }, { value: 'DINHEIRO', label: 'Dinheiro' }, { value: 'BOLETO', label: 'Boleto' },
  { value: 'TRANSFERENCIA', label: 'Transferência' }, { value: 'CARTAO', label: 'Cartão' }, { value: 'CHEQUE', label: 'Cheque' }, { value: 'OUTRO', label: 'Outro' },
];

function labelForma(value: FormaPagamento | null): string {
  return value ? formasPagamento.find((forma) => forma.value === value)?.label ?? '—' : '—';
}

function labelParticipante(option: ParticipanteOpcao): string {
  return option.documento ? `${option.nome} — ${option.documento}` : option.nome;
}

export default function FinanceiroLancamentos() {
  const userLogged = useUIStore((state) => state.userLogged);
  const { contas } = useBancos();
  const { categorias } = useCategoriasFinanceiras();
  const { fornecedores, instrutores, empresas } = useParticipantesFinanceiros();
  const [page, setPage] = useState(1);
  const [tipoFiltro, setTipoFiltro] = useState<TipoLancamento | ''>('');
  const [bancoId, setBancoId] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [editing, setEditing] = useState<LancamentoComRelacoes | null>(null);
  const [deleting, setDeleting] = useState<LancamentoComRelacoes | null>(null);
  const [form, setForm] = useState<LancamentoForm>(novoFormulario);
  const [modalOpen, setModalOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [cpfSearch, setCpfSearch] = useState('');
  const filtros = useMemo(() => ({ page, pageSize, tipo: tipoFiltro || undefined, bancoId: bancoId || undefined, categoriaId: categoriaId || undefined, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined, search: search || undefined }), [page, tipoFiltro, bancoId, categoriaId, dateFrom, dateTo, search]);
  const { lancamentos, total, isLoading, isFetching, isError, createLancamento, updateLancamento, deleteLancamento, isCreating, isUpdating, isDeleting } = useLancamentosFinanceiros(filtros);
  const { alunos, isLoading: alunosLoading } = useAlunosPorCpf(cpfSearch);
  const queryClient = useQueryClient();
  const isRetrying = useIsFetching({ queryKey: ['lancamentos-financeiros'] }) > 0;

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    if (!isLoading && page > 1 && lancamentos.length === 0) {
      setPage((currentPage) => currentPage - 1);
    }
  }, [page, isLoading, lancamentos.length]);
  const saving = isCreating || isUpdating;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const categoriasForm = categorias.filter((categoria) => categoria.tipo === form.tipo);
  const categoriasDisponiveisFiltro = categorias.filter((categoria) => !tipoFiltro || categoria.tipo === tipoFiltro);
  const fornecedoresOpcoes: ParticipanteOpcao[] = fornecedores.map((fornecedor) => ({ tipo: 'FORNECEDOR', id: fornecedor.id, nome: fornecedor.nome, documento: formatarDocumento(fornecedor.cpf_cnpj) }));
  const participantLists: Record<'INSTRUTOR' | 'EMPRESA' | 'FORNECEDOR', ParticipanteOpcao[]> = { INSTRUTOR: instrutores, EMPRESA: empresas, FORNECEDOR: fornecedoresOpcoes };

  const updateFilter = (setter: (value: string) => void) => (value: string) => { setter(value); setPage(1); };

  const optionForRecord = (record: LancamentoComRelacoes): ParticipanteOpcao | null => {
    if (!record.participante_tipo) return null;
    if (record.participante_tipo === 'ALUNO' || record.participante_tipo === 'INSTRUTOR') {
      const id = record.pessoa_id ?? '';
      const list = record.participante_tipo === 'ALUNO' ? alunos : instrutores;
      return list.find((item) => item.id === id) ?? (id ? { tipo: record.participante_tipo, id, nome: record.participante_nome ?? 'Participante', documento: record.participante_documento } : null);
    }
    if (record.participante_tipo === 'EMPRESA' || record.participante_tipo === 'FORNECEDOR') {
      const id = record.participante_tipo === 'EMPRESA' ? record.empresa_id : record.fornecedor_id;
      const list = participantLists[record.participante_tipo];
      return list.find((item) => item.id === id) ?? (id ? { tipo: record.participante_tipo, id, nome: record.participante_nome ?? 'Participante', documento: record.participante_documento } : null);
    }
    if (record.participante_tipo === 'COORDENADOR' && record.pessoa_id) {
      return { tipo: 'COORDENADOR', id: record.pessoa_id, nome: record.participante_nome ?? 'Coordenador', documento: record.participante_documento };
    }
    return null;
  };

  const openForm = (record?: LancamentoComRelacoes) => {
    setEditing(record ?? null);
    const participant = record ? optionForRecord(record) : null;
    setForm(record ? {
      tipo: record.tipo, status: 'EFETIVADO', valor: String(record.valor), data_competencia: record.data_competencia, data_efetivacao: record.data_efetivacao,
      banco_id: record.banco_id, categoria_id: record.categoria_id, descricao: record.descricao, forma_pagamento: record.forma_pagamento ?? '',
      numero_documento: record.numero_documento ?? '', observacoes: record.observacoes ?? '', participante_tipo: record.participante_tipo ?? '',
      participante_id: participant?.id ?? '', participante: participant,
    } : novoFormulario());
    setCpfSearch('');
    setErrorMessage('');
    setModalOpen(true);
  };
  const closeForm = () => { if (!saving) setModalOpen(false); };

  const selectParticipant = (participant: ParticipanteOpcao | null) => setForm((current) => ({ ...current, participante: participant, participante_id: participant?.id ?? '' }));
  const selectParticipantType = (value: TipoPicker) => {
    if (!value) {
      setForm((current) => ({ ...current, participante_tipo: '', participante_id: '', participante: null }));
      setCpfSearch('');
      return;
    }
    if (value !== form.participante_tipo) setForm((current) => ({ ...current, participante_tipo: value, participante_id: '', participante: null }));
    if (value === 'ALUNO') setCpfSearch('');
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setErrorMessage('');
    const valor = Number(form.valor);
    const categoria = categorias.find((item) => item.id === form.categoria_id);
    if (!form.banco_id || !form.categoria_id || !categoria || categoria.tipo !== form.tipo) {
      setErrorMessage('Selecione uma conta e uma categoria compatível com o tipo do lançamento.');
      return;
    }
    if (!(valor > 0) || !Number.isFinite(valor)) {
      setErrorMessage('O valor deve ser maior que zero.');
      return;
    }
    if (!form.descricao.trim()) {
      setErrorMessage('Informe uma descrição para o lançamento.');
      return;
    }
    const selected = form.participante;
    const participantType = form.participante_tipo || null;
    if (participantType && !selected) {
      setErrorMessage('Selecione um participante ou escolha Nenhum.');
      return;
    }
    const common = {
      tipo: form.tipo, status: form.status, valor, data_competencia: form.data_competencia, data_efetivacao: form.data_efetivacao,
      categoria_id: form.categoria_id, banco_id: form.banco_id, descricao: form.descricao.trim(),
      forma_pagamento: form.forma_pagamento || null, numero_documento: form.numero_documento.trim() || null,
      observacoes: form.observacoes, participante_tipo: participantType as TipoParticipante | null,
      pessoa_id: selected && (participantType === 'ALUNO' || participantType === 'INSTRUTOR' || participantType === 'COORDENADOR') ? selected.id : null,
      empresa_id: selected && participantType === 'EMPRESA' ? selected.id : null,
      fornecedor_id: selected && participantType === 'FORNECEDOR' ? selected.id : null,
      participante_nome: selected?.nome ?? null, participante_documento: selected?.documento ?? null,
    };
    try {
      if (editing) {
        await updateLancamento({ id: editing.id, updates: { ...common, turma_id: editing.turma_id, matricula_id: editing.matricula_id } });
      } else {
        const input: Omit<LancamentoFinanceiro, 'id' | 'created_at' | 'updated_at'> = {
          ...common, turma_id: null, matricula_id: null, created_by: userLogged?.id ?? null,
        };
        await createLancamento(input);
      }
      setModalOpen(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Não foi possível salvar o lançamento.');
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setErrorMessage('');
    try {
      await deleteLancamento(deleting.id);
      setDeleting(null);
    } catch (error) {
      setDeleting(null);
      setErrorMessage(error instanceof Error ? error.message : 'Não foi possível excluir o lançamento.');
    }
  };

  const clearFilters = () => {
    setTipoFiltro(''); setBancoId(''); setCategoriaId(''); setDateFrom(''); setDateTo(''); setSearch(''); setSearchInput(''); setPage(1);
  };

  return (
    <div className="flex-1 flex flex-col p-6 gap-6 overflow-y-auto">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 shrink-0">
        <div><h2 className="font-display text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white leading-tight">Lançamentos Financeiros</h2><p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Entradas e saídas efetivadas por conta.</p></div>
        <div className="flex items-center gap-2"><Button variant="secondary" type="button" onClick={() => setHelpOpen(true)} icon={<HelpCircle className="w-4 h-4" aria-hidden="true" />} aria-label="Ajuda" className={focusClass}>Ajuda</Button><button type="button" data-testid="novo-lancamento-button" onClick={() => openForm()} className={`flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-850 dark:bg-teal-600 dark:hover:bg-teal-500 ${focusClass}`}><Plus className="h-4 w-4" aria-hidden="true"/>Novo Lançamento</button></div>
      </div>
      {errorMessage && !modalOpen && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">{errorMessage}</p>}
      <section aria-label="Saldos por conta" data-testid="saldos-por-conta" className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200"><Banknote className="h-4 w-4 text-teal-600" aria-hidden="true"/>Visão bancária</h3>
        <div className="flex gap-3 overflow-x-auto pb-1">
          {[{ id: '', nome: 'Todas as contas', saldo: null as number | null, tipo: null as string | null }, ...contas.map((conta) => ({ id: conta.id, nome: conta.nome, saldo: conta.saldo_atual, tipo: conta.tipo }))].map((chip) => {
            const active = bancoId === chip.id;
            const Icon = chip.tipo === 'BANCO' ? Landmark : chip.tipo === 'COFRE_LOCAL' ? Vault : Banknote;
            return <button key={chip.id || 'todas'} type="button" aria-pressed={active} onClick={() => updateFilter(setBancoId)(active && chip.id ? '' : chip.id)} className={`flex min-w-[190px] items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${focusClass} ${active ? 'border-teal-500 bg-teal-50 text-teal-900 dark:bg-teal-950/30 dark:text-teal-200' : 'border-gray-200 bg-slate-50 text-slate-700 hover:border-teal-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'}`}><Icon className="h-5 w-5 shrink-0 text-teal-600" aria-hidden="true"/><span className="min-w-0"><span className="block truncate text-xs font-semibold">{chip.nome}</span><span className="block text-sm font-bold">{chip.saldo === null ? 'Todas as contas' : money.format(chip.saldo)}</span></span></button>;
          })}
        </div>
      </section>
      <section aria-label="Filtros de lançamentos" className="grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="lg:col-span-2"><label className={labelClass} htmlFor="lancamento-search">Busca</label><div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" aria-hidden="true"/><input id="lancamento-search" className={`${inputClass} pl-9`} placeholder="Descrição, participante ou documento" value={searchInput} onChange={(event) => setSearchInput(event.target.value)}/></div></div>
        <div><label className={labelClass} htmlFor="lancamento-filter-type">Tipo</label><select id="lancamento-filter-type" className={inputClass} value={tipoFiltro} onChange={(event) => { const value = event.target.value as TipoLancamento | ''; updateFilter((next) => { setTipoFiltro(next as TipoLancamento | ''); if (categoriaId && !categorias.some((item) => item.id === categoriaId && (!next || item.tipo === next))) setCategoriaId(''); })(value); }}><option value="">Todos</option><option value="ENTRADA">Entradas</option><option value="SAIDA">Saídas</option></select></div>
        <div><label className={labelClass} htmlFor="lancamento-filter-category">Categoria</label><select id="lancamento-filter-category" className={inputClass} value={categoriaId} onChange={(event) => updateFilter(setCategoriaId)(event.target.value)}><option value="">Todas</option>{tipoFiltro ? categoriasDisponiveisFiltro.map((item) => <option key={item.id} value={item.id}>{item.nome}{item.ativo ? '' : ' (inativa)'}</option>) : <><optgroup label="Entradas">{categorias.filter((item) => item.tipo === 'ENTRADA').map((item) => <option key={item.id} value={item.id}>{item.nome}{item.ativo ? '' : ' (inativa)'}</option>)}</optgroup><optgroup label="Saídas">{categorias.filter((item) => item.tipo === 'SAIDA').map((item) => <option key={item.id} value={item.id}>{item.nome}{item.ativo ? '' : ' (inativa)'}</option>)}</optgroup></>}</select></div>
        <div><label className={labelClass} htmlFor="lancamento-date-from">De</label><input id="lancamento-date-from" type="date" className={inputClass} value={dateFrom} onChange={(event) => updateFilter(setDateFrom)(event.target.value)}/></div>
        <div><label className={labelClass} htmlFor="lancamento-date-to">Até</label><input id="lancamento-date-to" type="date" className={inputClass} value={dateTo} onChange={(event) => updateFilter(setDateTo)(event.target.value)}/></div>
        <div className="sm:col-span-2 lg:col-span-6"><Button type="button" variant="secondary" onClick={clearFilters} className={`py-2 ${focusClass}`}>Limpar filtros</Button></div>
      </section>
      {isError && !isLoading && <QueryErrorState onRetry={() => void queryClient.invalidateQueries({ queryKey: ['lancamentos-financeiros'] })} isRetrying={isRetrying} message="Verifique sua conexão e tente novamente."/>}
      <div className="flex min-h-[350px] flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {isFetching && !isLoading && <p className="px-4 py-2 text-xs text-gray-500 dark:text-slate-400" role="status">Atualizando...</p>}
        <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar"><table data-testid="lancamentos-table" className="w-full min-w-[1100px] table-fixed border-collapse text-left text-xs"><thead className="sticky top-0 z-10 border-b border-gray-200 bg-slate-50 font-bold uppercase tracking-wider text-gray-500 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-400"><tr><th className="w-12 px-2 py-3 text-center" aria-label="Ações"></th><th className="w-[9%] px-3 py-3">Data</th><th className="w-[17%] px-3 py-3">Descrição</th><th className="w-[12%] px-3 py-3">Categoria</th><th className="w-[12%] px-3 py-3">Conta</th><th className="w-[15%] px-3 py-3">Participante</th><th className="w-[12%] px-3 py-3">Forma de pagamento</th><th className="w-[8%] px-3 py-3">Tipo</th><th className="w-[12%] px-3 py-3 text-right">Valor</th></tr></thead>
          <tbody className="divide-y divide-gray-150 font-mono text-gray-700 dark:text-slate-200">
            {isLoading ? <tr><td colSpan={9} className="px-4 py-8 text-center"><div className="flex flex-col items-center gap-2 text-gray-500"><div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent" aria-label="Carregando"/><p className="font-sans text-sm">Carregando lançamentos...</p></div></td></tr> : isError ? <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-500">Não foi possível carregar os lançamentos.</td></tr> : lancamentos.length === 0 ? <tr><td colSpan={9} className="px-4 py-12 text-center font-sans text-gray-500"><div className="flex flex-col items-center gap-2.5"><div className="rounded-full bg-teal-500/10 p-3 text-teal-500"><Receipt className="h-6 w-6" aria-hidden="true"/></div><p className="text-sm font-bold text-slate-800 dark:text-slate-200">Nenhum lançamento encontrado</p><p className="text-xs text-gray-400">Ajuste os filtros ou cadastre um novo lançamento.</p></div></td></tr> : lancamentos.map((record) => <tr key={record.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
              <td className="px-2 py-2 text-center"><RowActionMenu ariaLabel={`Ações para ${record.descricao}`} items={[{ label: 'Editar', icon: <Edit2 className="h-4 w-4" aria-hidden="true"/>, onClick: () => openForm(record) }, { label: 'Excluir', icon: <Trash2 className="h-4 w-4" aria-hidden="true"/>, tone: 'danger', onClick: () => { setErrorMessage(''); setDeleting(record); } }]}/></td>
              <td className="px-3 py-2">{formatarData(record.data_efetivacao)}</td><td className="px-3 py-2 font-sans font-semibold text-slate-800 dark:text-slate-200"><span className="block truncate">{record.descricao}</span>{record.numero_documento && <span className="block truncate text-[10px] font-normal text-gray-500">Nº {record.numero_documento}</span>}</td><td className="px-3 py-2 font-sans">{record.categoria?.nome ?? '—'}</td><td className="px-3 py-2 font-sans">{record.banco?.nome ?? '—'}</td><td className="px-3 py-2 font-sans">{record.participante_nome ? <><span className="block truncate">{record.participante_nome}</span>{record.participante_documento && <span className="block truncate text-[10px] text-gray-500">{record.participante_documento}</span>}</> : '—'}</td><td className="px-3 py-2 font-sans">{labelForma(record.forma_pagamento)}</td><td className="px-3 py-2"><span className={`rounded-full px-2 py-1 font-sans text-[10px] font-bold ${record.tipo === 'ENTRADA' ? 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300' : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'}`}>{record.tipo === 'ENTRADA' ? 'Entrada' : 'Saída'}</span></td><td className={`px-3 py-2 text-right font-bold ${record.tipo === 'ENTRADA' ? 'text-teal-600' : 'text-rose-600'}`}>{record.tipo === 'ENTRADA' ? '+' : '−'}{money.format(record.valor)}</td>
            </tr>)}
          </tbody></table></div>
      </div>
      <div className="flex flex-col items-center justify-between gap-3 text-sm text-gray-600 sm:flex-row dark:text-slate-300"><p>Mostrando {total === 0 ? 0 : (page - 1) * pageSize + 1} a {Math.min(page * pageSize, total)} de {total} lançamentos</p><div className="flex items-center gap-2"><Button type="button" variant="secondary" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className={focusClass}>Anterior</Button><span aria-live="polite">Página {page} de {pageCount}</span><Button type="button" variant="secondary" disabled={page >= pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))} className={focusClass}>Próxima</Button></div></div>
      <HelpModal isOpen={helpOpen} onClose={() => setHelpOpen(false)} title="Ajuda sobre Lançamentos" description="Consulte e gerencie entradas e saídas efetivadas nas contas financeiras." items={[{ title: 'Visão bancária', description: 'Os saldos são fornecidos pelas contas financeiras.', icon: <Landmark className="h-4 w-4" aria-hidden="true"/> }, { title: 'Filtros', description: 'Busque lançamentos por texto, tipo, categoria, conta e período.', icon: <Search className="h-4 w-4" aria-hidden="true"/> }]}/>
      <Modal isOpen={modalOpen} onClose={closeForm} ariaLabelledBy="lancamento-form-title"><div className="max-h-[calc(100vh-2rem)] overflow-y-auto rounded-xl bg-white shadow-xl dark:bg-slate-900"><div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-slate-800"><h2 id="lancamento-form-title" className="flex items-center gap-2 text-lg font-bold text-slate-800 dark:text-white">{editing ? <Edit2 className="h-5 w-5 text-teal-600" aria-hidden="true"/> : <Plus className="h-5 w-5 text-teal-600" aria-hidden="true"/>}{editing ? 'Editar Lançamento' : 'Novo Lançamento'}</h2><button type="button" onClick={closeForm} disabled={saving} aria-label="Fechar formulário" className={`rounded p-1 text-gray-500 hover:text-gray-700 ${focusClass} disabled:opacity-50 dark:hover:text-white`}><X className="h-5 w-5" aria-hidden="true"/></button></div>
        <form onSubmit={(event) => void save(event)} className="space-y-4 p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><div><label htmlFor="form-tipo" className={labelClass}>Tipo</label><select id="form-tipo" required className={inputClass} value={form.tipo} onChange={(event) => { const tipo = event.target.value as TipoLancamento; setForm((current) => { const categoria = categorias.find((item) => item.id === current.categoria_id); return { ...current, tipo, categoria_id: categoria?.tipo === tipo ? current.categoria_id : '' }; }); }}>{(['ENTRADA', 'SAIDA'] as TipoLancamento[]).map((tipo) => <option key={tipo} value={tipo}>{tipo === 'ENTRADA' ? 'Entrada' : 'Saída'}</option>)}</select></div><div><label htmlFor="form-valor" className={labelClass}>Valor</label><input id="form-valor" className={inputClass} type="number" step="0.01" min="0.01" required value={form.valor} onChange={(event) => setForm((current) => ({ ...current, valor: event.target.value }))}/></div></div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><div><label htmlFor="form-competencia" className={labelClass}>Data de competência</label><input id="form-competencia" className={inputClass} type="date" required value={form.data_competencia} onChange={(event) => setForm((current) => ({ ...current, data_competencia: event.target.value }))}/></div><div><label htmlFor="form-efetivacao" className={labelClass}>Data de efetivação</label><input id="form-efetivacao" className={inputClass} type="date" required value={form.data_efetivacao} onChange={(event) => setForm((current) => ({ ...current, data_efetivacao: event.target.value }))}/></div></div>
          <div><label htmlFor="form-conta" className={labelClass}>Conta</label><select id="form-conta" required className={inputClass} value={form.banco_id} onChange={(event) => setForm((current) => ({ ...current, banco_id: event.target.value }))}><option value="">Selecione uma conta</option>{contas.map((conta) => <option key={conta.id} value={conta.id}>{conta.nome}{conta.ativo ? '' : ' (inativa)'}</option>)}</select></div>
          <div><label htmlFor="form-categoria" className={labelClass}>Categoria</label><select id="form-categoria" required className={inputClass} value={form.categoria_id} onChange={(event) => setForm((current) => ({ ...current, categoria_id: event.target.value }))}><option value="">Selecione uma categoria</option>{categoriasForm.map((categoria) => <option key={categoria.id} value={categoria.id}>{categoria.nome}{categoria.ativo ? '' : ' (inativa)'}</option>)}</select></div>
          <div><label htmlFor="form-descricao" className={labelClass}>Descrição</label><input id="form-descricao" className={inputClass} required value={form.descricao} onChange={(event) => setForm((current) => ({ ...current, descricao: event.target.value }))}/></div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><div><label htmlFor="form-pagamento" className={labelClass}>Forma de pagamento</label><select id="form-pagamento" className={inputClass} value={form.forma_pagamento} onChange={(event) => setForm((current) => ({ ...current, forma_pagamento: event.target.value as FormaPagamento | '' }))}><option value="">Não informado</option>{formasPagamento.map((forma) => <option key={forma.value} value={forma.value}>{forma.label}</option>)}</select></div><div><label htmlFor="form-documento" className={labelClass}>Número do documento</label><input id="form-documento" className={inputClass} value={form.numero_documento} onChange={(event) => setForm((current) => ({ ...current, numero_documento: event.target.value }))}/></div></div>
          <div><label htmlFor="form-observacoes" className={labelClass}>Observações</label><textarea id="form-observacoes" className={inputClass} rows={3} value={form.observacoes} onChange={(event) => setForm((current) => ({ ...current, observacoes: event.target.value }))}/></div>
          <div><label htmlFor="form-participant-type" className={labelClass}>Tipo de participante</label><select id="form-participant-type" className={inputClass} value={form.participante_tipo} onChange={(event) => selectParticipantType(event.target.value as TipoPicker)}><option value="">Nenhum</option><option value="ALUNO">Aluno</option><option value="INSTRUTOR">Instrutor</option><option value="EMPRESA">Empresa</option><option value="FORNECEDOR">Fornecedor</option>{form.participante_tipo === 'COORDENADOR' && <option value="COORDENADOR" disabled>Participante existente: {form.participante?.nome ?? editing?.participante_nome ?? 'Coordenador'}</option>}</select></div>
          {form.participante_tipo === 'ALUNO' && <div className="space-y-2"><label htmlFor="form-aluno-cpf" className={labelClass}>Buscar aluno por CPF</label><input id="form-aluno-cpf" className={inputClass} inputMode="numeric" placeholder="Digite ao menos 3 dígitos do CPF" value={cpfSearch} onChange={(event) => setCpfSearch(event.target.value)}/>{form.participante && <p className="text-sm text-teal-700 dark:text-teal-300">Selecionado: {labelParticipante(form.participante)}</p>}{alunosLoading && <p className="text-xs text-gray-500">Buscando alunos...</p>}{alunos.length > 0 && <div className="max-h-36 space-y-1 overflow-y-auto rounded border border-gray-200 p-2 dark:border-slate-700">{alunos.map((aluno) => <button key={aluno.id} type="button" onClick={() => selectParticipant(aluno)} className={`block w-full rounded px-2 py-1 text-left text-sm hover:bg-teal-50 dark:hover:bg-slate-800 ${focusClass}`}>{labelParticipante(aluno)}</button>)}</div>}</div>}
          {(form.participante_tipo === 'INSTRUTOR' || form.participante_tipo === 'EMPRESA' || form.participante_tipo === 'FORNECEDOR') && <div><label htmlFor="form-participant-id" className={labelClass}>{form.participante_tipo === 'INSTRUTOR' ? 'Instrutor' : form.participante_tipo === 'EMPRESA' ? 'Empresa' : 'Fornecedor'}</label><select id="form-participant-id" required className={inputClass} value={form.participante_id} onChange={(event) => selectParticipant(participantLists[form.participante_tipo as 'INSTRUTOR' | 'EMPRESA' | 'FORNECEDOR'].find((item) => item.id === event.target.value) ?? null)}><option value="">Selecione um participante</option>{form.participante && !participantLists[form.participante_tipo].some((item) => item.id === form.participante?.id) && <option value={form.participante.id}>{labelParticipante(form.participante)}</option>}{participantLists[form.participante_tipo].map((item) => <option key={item.id} value={item.id}>{labelParticipante(item)}</option>)}</select></div>}
          {errorMessage && <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">{errorMessage}</p>}
          <div className="flex justify-end gap-3 pt-2"><Button variant="secondary" type="button" onClick={closeForm} disabled={saving} className={focusClass}>Cancelar</Button><Button type="submit" disabled={saving} className={focusClass}>{saving ? 'Salvando...' : editing ? 'Atualizar' : 'Salvar'}</Button></div>
        </form></div></Modal>
      <ConfirmDeleteModal isOpen={deleting !== null} onClose={() => !isDeleting && setDeleting(null)} onConfirm={confirmDelete} itemName={deleting?.descricao} isPending={isDeleting}/>
    </div>
  );
}
