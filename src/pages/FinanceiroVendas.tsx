import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Edit2, FileText, HelpCircle, Plus, Search, ShoppingCart, Trash2, X } from 'lucide-react';
import { useIsFetching, useQueryClient } from '@tanstack/react-query';
import { Button } from '../components/ui/Button';
import { ConfirmDeleteModal } from '../components/ui/ConfirmDeleteModal';
import { HelpModal } from '../components/ui/HelpModal';
import { WideSlidePanel as Modal } from '../components/ui/SlidePanel';
import { QueryErrorState } from '../components/ui/QueryErrorState';
import { TableSkeleton } from '../components/ui/FinanceiroSkeleton';
import { PaginationFooter } from '../components/ui/PaginationFooter';
import { RowActionMenu } from '../components/ui/RowActionMenu';
import { MoneyInput } from '../components/ui/MoneyInput';
import { NumberStepper } from '../components/ui/NumberStepper';
import { DocumentGeneratorModal } from '../components/documents/DocumentGeneratorModal';
import { FinanceiroOptionsLimitWarning } from '../components/financeiro/FinanceiroOptionsLimitWarning';
import { useDocumentTemplates } from '../hooks/useDocumentTemplates';
import { useBancos } from '../hooks/useBancos';
import { useCategoriasFinanceiras } from '../hooks/useCategoriasFinanceiras';
import { useClasses } from '../hooks/useClasses';
import { useCourses } from '../hooks/useCourses';
import { useAlunosPorCpf, useParticipantesFinanceiros } from '../hooks/useParticipantesFinanceiros';
import { useVendas, type VendaFiltros } from '../hooks/useVendas';
import type { FormaPagamento, ParticipanteOpcao, TipoCondicaoVenda, TipoParticipanteVenda, VendaComRelacoes } from '../types/financeiro';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const pageSize = 20;
const focusClass = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-1';
const inputClass = `w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-slate-800 ${focusClass} dark:border-slate-700 dark:bg-slate-900 dark:text-white`;
const labelClass = 'mb-1 block text-xs font-bold uppercase text-gray-700 dark:text-slate-300';
const formasPagamento: { value: FormaPagamento; label: string }[] = [
  { value: 'PIX', label: 'PIX' }, { value: 'DINHEIRO', label: 'Dinheiro' }, { value: 'BOLETO', label: 'Boleto' },
  { value: 'TRANSFERENCIA', label: 'Transferência' }, { value: 'CARTAO', label: 'Cartão' }, { value: 'CHEQUE', label: 'Cheque' }, { value: 'OUTRO', label: 'Outro' },
];
type ParcelaForm = { valor: string; data_competencia: string };
type VendaForm = {
  participanteTipo: TipoParticipanteVenda; participante: ParticipanteOpcao | null; empresaId: string; cursoId: string; valor: string;
  condicao: TipoCondicaoVenda; parcelasQuantidade: string; primeiroVencimento: string; categoriaId: string; bancoId: string;
  formaPagamento: FormaPagamento | ''; referencia: string; digitos: string; turmaId: string; observacoes: string;
};

function hojeLocal(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function addMonthClamped(dateText: string, offset: number): string {
  const [year, month, day] = dateText.split('-').map(Number);
  const target = new Date(Date.UTC(year, month - 1 + offset, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return `${target.getUTCFullYear()}-${String(target.getUTCMonth() + 1).padStart(2, '0')}-${String(target.getUTCDate()).padStart(2, '0')}`;
}

function criarParcelas(total: number, quantidade: number, vencimento: string): ParcelaForm[] {
  if (!Number.isFinite(total) || total <= 0 || !vencimento || quantidade < 1) return [];
  const centavos = Math.round(total * 100);
  const parcelaBase = Math.floor(centavos / quantidade);
  return Array.from({ length: quantidade }, (_, index) => ({
    valor: ((index === quantidade - 1 ? centavos - parcelaBase * (quantidade - 1) : parcelaBase) / 100).toFixed(2),
    data_competencia: addMonthClamped(vencimento, index),
  }));
}

function novoFormulario(): VendaForm {
  return { participanteTipo: 'ALUNO', participante: null, empresaId: '', cursoId: '', valor: '', condicao: 'A_VISTA', parcelasQuantidade: '2', primeiroVencimento: hojeLocal(), categoriaId: '', bancoId: '', formaPagamento: '', referencia: '', digitos: '', turmaId: '', observacoes: '' };
}

function formatarData(data: string): string {
  const [ano, mes, dia] = data.split('-');
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : data;
}

function somaParcelas(parcelas: ParcelaForm[]): number {
  return parcelas.reduce((sum, parcela) => sum + (Number(parcela.valor) || 0), 0);
}

export default function FinanceiroVendas() {
  const { contas, optionsTruncated: contasOptionsTruncated } = useBancos();
  const { categorias, optionsTruncated: categoriasOptionsTruncated } = useCategoriasFinanceiras();
  const { empresas, optionsTruncated: participantesOptionsTruncated } = useParticipantesFinanceiros();
  const { courses } = useCourses();
  const { classes } = useClasses();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [filtroParticipante, setFiltroParticipante] = useState<VendaFiltros['participanteTipo']>();
  const [editing, setEditing] = useState<VendaComRelacoes | null>(null);
  const [deleting, setDeleting] = useState<VendaComRelacoes | null>(null);
  const [form, setForm] = useState<VendaForm>(novoFormulario);
  const [parcelas, setParcelas] = useState<ParcelaForm[]>([]);
  const [cpfSearch, setCpfSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptVendaId, setReceiptVendaId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const documentTemplates = useDocumentTemplates();
  const filtros = useMemo(() => ({ page, pageSize, search: search || undefined, participanteTipo: filtroParticipante }), [page, search, filtroParticipante]);
  const { vendas, total, isLoading, isFetching, isError, saveVenda, isSaving, deleteVenda, isDeleting } = useVendas(filtros);
  const { alunos, isLoading: alunosLoading } = useAlunosPorCpf(cpfSearch);
  const queryClient = useQueryClient();
  const isRetrying = useIsFetching({ queryKey: ['vendas'] }) > 0;
  const settledEditing = Boolean(editing?.parcelas.some((parcela) => parcela.status === 'EFETIVADO'));
  const categoriesEntrada = categorias.filter((categoria) => categoria.tipo === 'ENTRADA');
  const selectedEmpresa = empresas.find((empresa) => empresa.id === form.empresaId);
  const saving = isSaving;

  useEffect(() => {
    const timeout = window.setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 300);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);
  useEffect(() => {
    if (!isLoading && page > 1 && vendas.length === 0) setPage((current) => current - 1);
  }, [page, isLoading, vendas.length]);
  useEffect(() => {
    if (parcelas.length > 0) {
      const totalParcelas = somaParcelas(parcelas);
      if (Number(form.valor) !== totalParcelas) setForm((current) => ({ ...current, valor: totalParcelas.toFixed(2) }));
    }
  }, [parcelas]);

  const selectParticipantType = (value: TipoParticipanteVenda) => {
    const course = courses.find((item) => item.id === form.cursoId);
    const amount = value === 'ALUNO' ? course?.valor_pessoa_fisica : course?.valor_pessoa_juridica;
    setForm((current) => ({ ...current, participanteTipo: value, participante: null, empresaId: '', ...(amount !== null && amount !== undefined ? { valor: String(amount) } : {}) }));
    if (!settledEditing && amount !== null && amount !== undefined) setParcelas(criarParcelas(amount, form.condicao === 'A_VISTA' ? 1 : Number(form.parcelasQuantidade), form.primeiroVencimento));
    setCpfSearch('');
  };

  const openForm = (record?: VendaComRelacoes) => {
    setEditing(record ?? null);
    const participant = record ? { tipo: record.participante_tipo, id: record.pessoa_id ?? record.empresa_id ?? '', nome: record.participante_nome, documento: record.participante_documento } as ParticipanteOpcao : null;
    const initialForm = record ? {
      participanteTipo: record.participante_tipo, participante: participant, empresaId: record.empresa_id ?? '', cursoId: record.curso_id ?? '',
      valor: String(record.parcelas.reduce((sum, parcela) => sum + Number(parcela.valor), 0)), condicao: record.condicao,
      parcelasQuantidade: String(record.parcelas_quantidade), primeiroVencimento: record.parcelas[0]?.data_competencia ?? hojeLocal(),
      categoriaId: record.categoria_id, bancoId: record.banco_id, formaPagamento: record.forma_pagamento ?? '',
      referencia: record.referencia_transacao ?? '', digitos: record.cartao_ultimos_digitos ?? '', turmaId: record.turma_id ?? '', observacoes: record.observacoes ?? '',
    } : novoFormulario();
    setForm(initialForm);
    setParcelas(record ? [...record.parcelas].sort((a, b) => a.data_competencia.localeCompare(b.data_competencia)).map((parcela) => ({ valor: Number(parcela.valor).toFixed(2), data_competencia: parcela.data_competencia })) : []);
    setCpfSearch(''); setErrorMessage(''); setModalOpen(true);
  };
  const closeForm = () => { if (!saving) setModalOpen(false); };

  const updateCourse = (courseId: string) => {
    const course = courses.find((item) => item.id === courseId);
    const amount = form.participanteTipo === 'ALUNO' ? course?.valor_pessoa_fisica : course?.valor_pessoa_juridica;
    setForm((current) => ({ ...current, cursoId: courseId, ...(amount !== null && amount !== undefined ? { valor: String(amount) } : {}) }));
    if (!settledEditing && amount !== null && amount !== undefined) setParcelas(criarParcelas(amount, form.condicao === 'A_VISTA' ? 1 : Number(form.parcelasQuantidade), form.primeiroVencimento));
  };
  const updateTotal = (value: string) => {
    setForm((current) => ({ ...current, valor: value }));
    if (!settledEditing) setParcelas(criarParcelas(Number(value), form.condicao === 'A_VISTA' ? 1 : Number(form.parcelasQuantidade), form.primeiroVencimento));
  };
  const updateCondition = (value: TipoCondicaoVenda) => {
    if (settledEditing) return;
    setForm((current) => ({ ...current, condicao: value }));
    setParcelas(criarParcelas(Number(form.valor), value === 'A_VISTA' ? 1 : Number(form.parcelasQuantidade), form.primeiroVencimento));
  };
  const updateQuantity = (value: string) => {
    const quantity = Math.min(120, Math.max(2, Number(value) || 2));
    setForm((current) => ({ ...current, parcelasQuantidade: value }));
    if (!settledEditing && value !== '') setParcelas(criarParcelas(Number(form.valor), quantity, form.primeiroVencimento));
  };
  const updateFirstDate = (value: string) => {
    setForm((current) => ({ ...current, primeiroVencimento: value }));
    if (!settledEditing) setParcelas(criarParcelas(Number(form.valor), form.condicao === 'A_VISTA' ? 1 : Number(form.parcelasQuantidade), value));
  };

  const save = async (event: FormEvent) => {
    event.preventDefault(); setErrorMessage('');
    const participant = form.participanteTipo === 'ALUNO' ? form.participante : selectedEmpresa ? { ...selectedEmpresa, tipo: 'EMPRESA' as const } : null;
    const values = parcelas.map((parcela) => ({ valor: Number(parcela.valor), data_competencia: parcela.data_competencia }));
    if (!participant?.id) { setErrorMessage('Selecione o participante da venda.'); return; }
    if (!form.cursoId) { setErrorMessage('Selecione um curso.'); return; }
    if (!form.categoriaId || !form.bancoId) { setErrorMessage('Selecione uma categoria de entrada e uma conta.'); return; }
    const quantidadeParcelas = Number(form.parcelasQuantidade);
    if (!settledEditing && form.condicao === 'PARCELADO' && (!Number.isInteger(quantidadeParcelas) || quantidadeParcelas < 2 || quantidadeParcelas > 120)) { setErrorMessage('Informe uma quantidade de parcelas entre 2 e 120.'); return; }
    if (form.digitos && form.digitos.length !== 4) { setErrorMessage('Informe exatamente 4 dígitos do cartão.'); return; }
    if (values.length === 0 || values.some((parcela) => !(parcela.valor > 0) || !parcela.data_competencia)) { setErrorMessage('Informe valores maiores que zero e o vencimento de cada parcela.'); return; }
    const payload = {
      participante_tipo: form.participanteTipo, pessoa_id: form.participanteTipo === 'ALUNO' ? participant.id : null,
      empresa_id: form.participanteTipo === 'EMPRESA' ? participant.id : null, participante_nome: participant.nome,
      participante_documento: participant.documento, curso_id: form.cursoId || null, turma_id: form.turmaId || null,
      condicao: form.condicao, parcelas_quantidade: values.length, categoria_id: form.categoriaId, banco_id: form.bancoId,
      forma_pagamento: form.formaPagamento || null, referencia_transacao: form.referencia.trim() || null,
      cartao_ultimos_digitos: form.digitos || null, observacoes: form.observacoes,
    };
    try {
      await saveVenda({ id: editing?.id ?? null, venda: payload, parcelas: settledEditing ? null : values });
      setModalOpen(false);
    } catch (error) { setErrorMessage(error instanceof Error ? error.message : 'Não foi possível salvar a venda.'); }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try { await deleteVenda(deleting.id); setDeleting(null); }
    catch (error) { setDeleting(null); setErrorMessage(error instanceof Error ? error.message : 'Não foi possível excluir a venda.'); }
  };
  const openReceipt = (vendaId: string) => { setReceiptVendaId(vendaId); setReceiptOpen(true); };

  return (
    <div className="flex-1 flex flex-col p-6 gap-6 overflow-y-auto">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 shrink-0"><div><h2 className="font-display text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white">Vendas</h2><p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Registre vendas e gere os recebimentos previstos conforme as parcelas.</p></div><div className="flex items-center gap-2"><Button variant="secondary" type="button" onClick={() => setHelpOpen(true)} icon={<HelpCircle className="h-4 w-4" aria-hidden="true"/>} aria-label="Ajuda" className={focusClass}>Ajuda</Button><button type="button" data-testid="nova-venda-button" onClick={() => openForm()} className={`flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 dark:bg-teal-600 dark:hover:bg-teal-500 ${focusClass}`}><Plus className="h-4 w-4" aria-hidden="true"/>Nova Venda</button></div></div>
      {errorMessage && !modalOpen && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">{errorMessage}</p>}
      <FinanceiroOptionsLimitWarning visible={contasOptionsTruncated || categoriasOptionsTruncated || participantesOptionsTruncated}/>
      <section aria-label="Filtros de vendas" className="grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:grid-cols-3 dark:border-slate-800 dark:bg-slate-900"><div><label htmlFor="vendas-search" className={labelClass}>Busca</label><div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" aria-hidden="true"/><input id="vendas-search" className={`${inputClass} pl-9`} placeholder="Participante, documento ou referência" value={searchInput} onChange={(event) => setSearchInput(event.target.value)}/></div></div><div><label htmlFor="vendas-participante-filter" className={labelClass}>Participante</label><select id="vendas-participante-filter" className={inputClass} value={filtroParticipante ?? ''} onChange={(event) => { setFiltroParticipante((event.target.value || undefined) as VendaFiltros['participanteTipo']); setPage(1); }}><option value="">Todos</option><option value="ALUNO">Aluno</option><option value="EMPRESA">Empresa</option></select></div></section>
      <QueryErrorState onRetry={() => void queryClient.invalidateQueries({ queryKey: ['vendas'] })} isRetrying={isRetrying} isError={isError} isFetching={isFetching} isLoading={isLoading} message="Verifique sua conexão e tente novamente."/>
      <div className="flex min-h-[350px] flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar"><table data-testid="vendas-table" className="w-full min-w-[1250px] table-fixed border-collapse text-left text-xs"><thead className="sticky top-0 z-10 border-b border-gray-200 bg-slate-50 font-bold uppercase tracking-wider text-gray-500 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-400"><tr><th className="w-12 px-2 py-3 text-center" aria-label="Ações"></th><th className="w-[17%] px-3 py-3">Participante</th><th className="w-[12%] px-3 py-3">Curso</th><th className="w-[8%] px-3 py-3">Turma</th><th className="w-[9%] px-3 py-3">Condição</th><th className="w-[9%] px-3 py-3">Parcelas</th><th className="w-[11%] px-3 py-3 text-right">Total</th><th className="w-[13%] px-3 py-3">Referência</th><th className="w-[12%] px-3 py-3">Conta</th></tr></thead><tbody className="divide-y divide-gray-150 font-mono text-gray-700 dark:text-slate-200">
        {isLoading ? <TableSkeleton columns={9}/> : isError ? null : vendas.length === 0 ? <tr><td colSpan={9} className="px-4 py-12 text-center font-sans text-gray-500"><div className="flex flex-col items-center gap-2"><ShoppingCart className="h-7 w-7 text-teal-600" aria-hidden="true"/><p className="font-bold text-slate-800 dark:text-slate-200">Nenhuma venda encontrada</p><p className="text-xs">Ajuste a busca ou registre uma nova venda.</p></div></td></tr> : vendas.map((record) => { const totalVenda = record.parcelas.reduce((sum, parcela) => sum + Number(parcela.valor), 0); const settled = record.parcelas.filter((parcela) => parcela.status === 'EFETIVADO').length; return <tr key={record.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50"><td className="px-2 py-2 text-center"><RowActionMenu ariaLabel={`Ações para ${record.participante_nome}`} items={[{ label: 'Editar', icon: <Edit2 className="h-4 w-4" aria-hidden="true"/>, onClick: () => openForm(record) }, { label: 'Recibo', icon: <FileText className="h-4 w-4" aria-hidden="true"/>, onClick: () => openReceipt(record.id) }, { label: 'Excluir', icon: <Trash2 className="h-4 w-4" aria-hidden="true"/>, tone: 'danger', onClick: () => { setErrorMessage(''); setDeleting(record); } }]}/></td><td className="px-3 py-2 font-sans"><span className="block truncate font-semibold">{record.participante_nome}</span><span className="block truncate text-[10px] text-gray-500">{record.participante_documento ?? '—'}</span></td><td className="px-3 py-2 font-sans">{record.curso?.nome_curso ?? '—'}</td><td className="px-3 py-2">{record.turma?.id_interno_escola ?? '—'}</td><td className="px-3 py-2 font-sans">{record.condicao === 'A_VISTA' ? 'À vista' : 'Parcelado'}</td><td className="px-3 py-2">{settled}/{record.parcelas.length}</td><td className="px-3 py-2 text-right font-bold">{money.format(totalVenda)}</td><td className="px-3 py-2 font-sans">{record.referencia_transacao ?? '—'}{record.cartao_ultimos_digitos && <span className="block text-[10px] text-gray-500">•••• {record.cartao_ultimos_digitos}</span>}</td><td className="px-3 py-2 font-sans">{record.conta?.nome ?? '—'}</td></tr>; })}
        </tbody></table></div>{isFetching && !isLoading && <p role="status" className="px-4 py-2 text-xs text-gray-500">Atualizando...</p>}</div>
      <PaginationFooter page={page} pageSize={pageSize} total={total} onPageChange={setPage} itemLabel="vendas"/>
      <HelpModal isOpen={helpOpen} onClose={() => setHelpOpen(false)} title="Ajuda sobre Vendas" description="Cada venda cria parcelas previstas para acompanhamento e recebimento." items={[{ title: 'Parcelas', description: 'Defina valores e vencimentos; o total da venda é calculado pela soma delas.' }, { title: 'Recebimentos', description: 'Use a tela Recebimentos para efetivar cada parcela paga.' }]}/>
      <Modal isOpen={modalOpen} onClose={closeForm} ariaLabelledBy="venda-form-title"><div className="flex h-full min-h-0 flex-col bg-white shadow-xl dark:bg-slate-900"><div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-gray-50 px-6 py-5 dark:border-slate-800 dark:bg-slate-850"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full border border-teal-100 bg-teal-50 dark:border-teal-900/20 dark:bg-teal-950/30"><ShoppingCart className="h-5 w-5 text-teal-600" aria-hidden="true"/></div><div><h2 id="venda-form-title" className="font-display text-lg font-bold leading-tight text-slate-900 dark:text-white">{editing ? 'Editar Venda' : 'Nova Venda'}</h2><p className="mt-0.5 text-[11px] text-gray-500 dark:text-slate-400">Registre uma venda e configure suas parcelas.</p></div></div><button type="button" onClick={closeForm} disabled={saving} aria-label="Fechar formulário" className={`rounded-full p-1 text-gray-500 hover:text-red-500 ${focusClass} disabled:opacity-50 dark:hover:text-red-400`}><X className="h-5 w-5" aria-hidden="true"/></button></div>
        <form onSubmit={(event) => void save(event)} className="flex min-h-0 flex-1 flex-col overflow-y-auto custom-scrollbar">
          <div className="flex-1 space-y-4 p-6"><div><label htmlFor="venda-participante-tipo" className={labelClass}>Tipo de participante</label><select id="venda-participante-tipo" required className={inputClass} value={form.participanteTipo} onChange={(event) => selectParticipantType(event.target.value as TipoParticipanteVenda)}><option value="ALUNO">Aluno</option><option value="EMPRESA">Empresa</option></select></div>
          {form.participanteTipo === 'ALUNO' ? <div className="space-y-2"><label htmlFor="venda-aluno-cpf" className={labelClass}>Buscar aluno por CPF</label><input id="venda-aluno-cpf" className={inputClass} inputMode="numeric" placeholder="Digite ao menos 3 dígitos do CPF" value={cpfSearch} onChange={(event) => setCpfSearch(event.target.value)}/>{form.participante && <p className="text-sm text-teal-700 dark:text-teal-300">Selecionado: {form.participante.nome} — {form.participante.documento}</p>}{alunosLoading && <p className="text-xs text-gray-500">Buscando alunos...</p>}{alunos.length > 0 && <div className="max-h-36 space-y-1 overflow-y-auto rounded border border-gray-200 p-2 dark:border-slate-700">{alunos.map((aluno) => <button key={aluno.id} type="button" onClick={() => setForm((current) => ({ ...current, participante: aluno }))} className={`block w-full rounded px-2 py-1 text-left text-sm hover:bg-teal-50 dark:hover:bg-slate-800 ${focusClass}`}>{aluno.nome} — {aluno.documento}</button>)}</div>}</div> : <div><label htmlFor="venda-empresa" className={labelClass}>Empresa</label><select id="venda-empresa" required className={inputClass} value={form.empresaId} onChange={(event) => setForm((current) => ({ ...current, empresaId: event.target.value }))}><option value="">Selecione uma empresa</option>{empresas.map((empresa) => <option key={empresa.id} value={empresa.id}>{empresa.nome}{empresa.documento ? ` — ${empresa.documento}` : ''}</option>)}</select></div>}
          <div><label htmlFor="venda-curso" className={labelClass}>Curso</label><select id="venda-curso" required className={inputClass} value={form.cursoId} onChange={(event) => updateCourse(event.target.value)}><option value="">Selecione um curso</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.nome_curso}</option>)}</select></div>
          <div><label htmlFor="venda-valor" className={labelClass}>Valor da venda (R$)</label><MoneyInput id="venda-valor" className={inputClass} required disabled={settledEditing} value={form.valor} onChange={updateTotal}/></div>
          <div><label htmlFor="venda-condicao" className={labelClass}>Condição</label><select id="venda-condicao" className={inputClass} value={form.condicao} disabled={settledEditing} onChange={(event) => updateCondition(event.target.value as TipoCondicaoVenda)}><option value="A_VISTA">À vista</option><option value="PARCELADO">Parcelado</option></select></div>
          {form.condicao === 'A_VISTA' ? <div><label htmlFor="venda-vencimento" className={labelClass}>Vencimento</label><input id="venda-vencimento" className={inputClass} type="date" required value={parcelas[0]?.data_competencia ?? form.primeiroVencimento} disabled={settledEditing} onChange={(event) => { setForm((current) => ({ ...current, primeiroVencimento: event.target.value })); setParcelas([{ valor: parcelas[0]?.valor ?? form.valor, data_competencia: event.target.value }]); }}/></div> : <div className="space-y-3"><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><div><label htmlFor="venda-parcelas-quantidade" className={labelClass}>Quantidade de parcelas</label><NumberStepper id="venda-parcelas-quantidade" value={form.parcelasQuantidade} min={2} max={120} required disabled={settledEditing} ariaLabel="quantidade de parcelas" onChange={updateQuantity}/></div><div><label htmlFor="venda-primeiro-vencimento" className={labelClass}>Primeiro vencimento</label><input id="venda-primeiro-vencimento" className={inputClass} type="date" required value={form.primeiroVencimento} disabled={settledEditing} onChange={(event) => updateFirstDate(event.target.value)}/></div></div>
            {settledEditing && <p className="text-xs text-amber-700 dark:text-amber-300">Esta venda já possui recebimento efetivado. As parcelas são somente leitura; ajuste os recebimentos na tela Recebimentos.</p>}
            <div className="space-y-2">{parcelas.map((parcela, index) => <div key={index} className="grid grid-cols-1 gap-3 sm:grid-cols-2"><div><label htmlFor={`venda-parcela-valor-${index}`} className={labelClass}>Parcela {index + 1} — valor</label><MoneyInput id={`venda-parcela-valor-${index}`} dataTestId={`venda-parcela-valor-${index}`} ariaLabel={`Valor da parcela ${index + 1}`} className={inputClass} required disabled={settledEditing} value={parcela.valor} onChange={(valor) => setParcelas((current) => current.map((item, idx) => idx === index ? { ...item, valor } : item))}/></div><div><label htmlFor={`venda-parcela-vencimento-${index}`} className={labelClass}>Vencimento da parcela {index + 1}</label><input id={`venda-parcela-vencimento-${index}`} data-testid={`venda-parcela-vencimento-${index}`} aria-label={`Vencimento da parcela ${index + 1}`} className={inputClass} type="date" required disabled={settledEditing} value={parcela.data_competencia} onChange={(event) => setParcelas((current) => current.map((item, idx) => idx === index ? { ...item, data_competencia: event.target.value } : item))}/></div></div>)}</div>
            <p className="text-right text-sm font-semibold text-slate-800 dark:text-slate-200">Total das parcelas: {money.format(somaParcelas(parcelas))}</p></div>}
          {form.condicao === 'A_VISTA' && <p className="text-right text-sm font-semibold text-slate-800 dark:text-slate-200">Total das parcelas: {money.format(somaParcelas(parcelas))}</p>}
          {settledEditing && form.condicao === 'A_VISTA' && <p className="text-xs text-amber-700 dark:text-amber-300">Esta venda já possui recebimento efetivado. As parcelas são somente leitura; ajuste os recebimentos na tela Recebimentos.</p>}
          <div><label htmlFor="venda-categoria" className={labelClass}>Categoria de entrada</label><select id="venda-categoria" required className={inputClass} value={form.categoriaId} onChange={(event) => setForm((current) => ({ ...current, categoriaId: event.target.value }))}><option value="">Selecione uma categoria</option>{categoriesEntrada.map((categoria) => <option key={categoria.id} value={categoria.id}>{categoria.nome}{categoria.ativo ? '' : ' (inativa)'}</option>)}</select></div>
          <div><label htmlFor="venda-conta" className={labelClass}>Conta</label><select id="venda-conta" required className={inputClass} value={form.bancoId} onChange={(event) => setForm((current) => ({ ...current, bancoId: event.target.value }))}><option value="">Selecione uma conta</option>{contas.map((conta) => <option key={conta.id} value={conta.id}>{conta.nome}{conta.ativo ? '' : ' (inativa)'}</option>)}</select></div>
          <div><label htmlFor="venda-forma-pagamento" className={labelClass}>Forma de pagamento</label><select id="venda-forma-pagamento" className={inputClass} value={form.formaPagamento} onChange={(event) => setForm((current) => ({ ...current, formaPagamento: event.target.value as FormaPagamento | '' }))}><option value="">Não informado</option>{formasPagamento.map((forma) => <option key={forma.value} value={forma.value}>{forma.label}</option>)}</select></div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><div><label htmlFor="venda-referencia" className={labelClass}>Referência da transação</label><input id="venda-referencia" className={inputClass} value={form.referencia} onChange={(event) => setForm((current) => ({ ...current, referencia: event.target.value }))}/></div><div><label htmlFor="venda-digitos" className={labelClass}>Últimos 4 dígitos do cartão</label><input id="venda-digitos" className={inputClass} inputMode="numeric" maxLength={4} value={form.digitos} onChange={(event) => setForm((current) => ({ ...current, digitos: event.target.value.replace(/\D/g, '').slice(0, 4) }))}/></div></div>
          <div><label htmlFor="venda-turma" className={labelClass}>Turma (opcional)</label><select id="venda-turma" className={inputClass} value={form.turmaId} onChange={(event) => setForm((current) => ({ ...current, turmaId: event.target.value }))}><option value="">Sem turma</option>{classes.map((turma) => <option key={turma.id} value={turma.id}>{turma.id_interno_escola}</option>)}</select></div>
          <div><label htmlFor="venda-observacoes" className={labelClass}>Observações</label><textarea id="venda-observacoes" className={inputClass} rows={3} value={form.observacoes} onChange={(event) => setForm((current) => ({ ...current, observacoes: event.target.value }))}/></div>
          {errorMessage && <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">{errorMessage}</p>}</div>
          <div className="sticky bottom-0 flex shrink-0 justify-end gap-3 border-t border-gray-200 bg-white px-6 py-4 shadow-md dark:border-slate-800 dark:bg-slate-900"><Button variant="secondary" type="button" onClick={closeForm} disabled={saving}>Cancelar</Button><Button type="submit" disabled={saving}>{saving ? 'Salvando...' : editing ? 'Atualizar' : 'Salvar'}</Button></div>
        </form></div></Modal>
      <ConfirmDeleteModal isOpen={deleting !== null} onClose={() => !isDeleting && setDeleting(null)} onConfirm={confirmDelete} itemName={deleting?.participante_nome} isPending={isDeleting}/>
      <DocumentGeneratorModal
        isOpen={receiptOpen}
        onClose={() => { setReceiptOpen(false); setReceiptVendaId(''); }}
        templates={documentTemplates.templates}
        isLoadingTemplates={documentTemplates.isLoading}
        isErrorTemplates={documentTemplates.isError}
        onRetryTemplates={() => void documentTemplates.refetch()}
        initialEntity="VENDA"
        initialSubjectId={receiptVendaId}
      />
    </div>
  );
}
