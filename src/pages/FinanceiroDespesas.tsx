import { useEffect, useState, type FormEvent } from 'react';
import { CalendarClock, Edit2, HelpCircle, Plus, Trash2, X } from 'lucide-react';
import { FinanceiroOptionsLimitWarning } from '../components/financeiro/FinanceiroOptionsLimitWarning';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '../components/ui/Button';
import { ConfirmDeleteModal } from '../components/ui/ConfirmDeleteModal';
import { HelpModal } from '../components/ui/HelpModal';
import { Modal } from '../components/ui/Modal';
import { QueryErrorState } from '../components/ui/QueryErrorState';
import { PaginationFooter } from '../components/ui/PaginationFooter';
import { RowActionMenu } from '../components/ui/RowActionMenu';
import { MoneyInput } from '../components/ui/MoneyInput';
import { NumberStepper } from '../components/ui/NumberStepper';
import { useBancos } from '../hooks/useBancos';
import { useCategoriasFinanceiras } from '../hooks/useCategoriasFinanceiras';
import { useAlunosPorCpf, useParticipantesFinanceiros } from '../hooks/useParticipantesFinanceiros';
import { useProgramacoesSaida } from '../hooks/useProgramacoesSaida';
import { useUIStore } from '../store/uiStore';
import type { ParticipanteOpcao, ProgramacaoSaidaComRelacoes, TipoFrequenciaProgramacao, TipoParticipante } from '../types/financeiro';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const focusClass = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-1';
const inputClass = `w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-slate-800 ${focusClass} dark:border-slate-700 dark:bg-slate-900 dark:text-white`;
const labelClass = 'mb-1 block text-xs font-bold uppercase text-gray-700 dark:text-slate-300';
const pageSize = 20;
type TipoPicker = '' | 'ALUNO' | 'INSTRUTOR' | 'EMPRESA' | 'FORNECEDOR';
type FormState = {
  descricao: string; frequencia: TipoFrequenciaProgramacao; dia_vencimento: string; data_inicio: string;
  repeticoes: string; valor_previsto: string; categoria_id: string; banco_id: string;
  participante_tipo: TipoPicker; participante_id: string; participante: ParticipanteOpcao | null;
  observacoes: string; ativa: boolean;
};

function hojeLocal(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function newForm(): FormState {
  return { descricao: '', frequencia: 'MENSAL_CONTINUA', dia_vencimento: '1', data_inicio: hojeLocal(), repeticoes: '', valor_previsto: '', categoria_id: '', banco_id: '', participante_tipo: '', participante_id: '', participante: null, observacoes: '', ativa: true };
}

function formatDate(value: string): string {
  const [year, month, day] = value.split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function formatDocument(value: string | null): string | null {
  const digits = value?.replace(/\D/g, '') ?? '';
  if (digits.length === 11) return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  if (digits.length === 14) return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  return null;
}

function participantLabel(participant: ParticipanteOpcao): string {
  return participant.documento ? `${participant.nome} — ${participant.documento}` : participant.nome;
}

function frequencyLabel(frequency: TipoFrequenciaProgramacao): string {
  if (frequency === 'MENSAL_CONTINUA') return 'Mensal contínua';
  if (frequency === 'REPETICAO_FINITA') return 'Repetição finita';
  return 'Avulsa';
}

export default function FinanceiroDespesas() {
  const { contas, optionsTruncated: contasOptionsTruncated } = useBancos();
  const { categorias, optionsTruncated: categoriasOptionsTruncated } = useCategoriasFinanceiras();
  const { fornecedores, instrutores, empresas, optionsTruncated: participantesOptionsTruncated } = useParticipantesFinanceiros();
  const [cpfSearch, setCpfSearch] = useState('');
  const [form, setForm] = useState<FormState>(newForm);
  const [editing, setEditing] = useState<ProgramacaoSaidaComRelacoes | null>(null);
  const [deleting, setDeleting] = useState<ProgramacaoSaidaComRelacoes | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const userLogged = useUIStore((state) => state.userLogged);
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const { programacoes, totalProgramacoes, isLoading, isFetching, isError, createProgramacao, updateProgramacao, deleteProgramacao, isCreating, isUpdating, isDeleting } = useProgramacoesSaida({ page, pageSize });
  const { alunos: cpfAlunos, isLoading: cpfAlunosLoading } = useAlunosPorCpf(cpfSearch);
  const saving = isCreating || isUpdating;
  const categoriasSaida = categorias.filter((categoria) => categoria.tipo === 'SAIDA');
  const fornecedoresOpcoes: ParticipanteOpcao[] = fornecedores.map((item) => ({ tipo: 'FORNECEDOR', id: item.id, nome: item.nome, documento: formatDocument(item.cpf_cnpj) }));
  const participants: Record<'INSTRUTOR' | 'EMPRESA' | 'FORNECEDOR', ParticipanteOpcao[]> = { INSTRUTOR: instrutores, EMPRESA: empresas, FORNECEDOR: fornecedoresOpcoes };
  const retrying = isFetching;

  useEffect(() => {
    if (!isLoading && page > 1 && programacoes.length === 0) setPage((current) => current - 1);
  }, [page, isLoading, programacoes.length]);

  const openForm = (record?: ProgramacaoSaidaComRelacoes) => {
    setEditing(record ?? null);
    let participant: ParticipanteOpcao | null = null;
    if (record?.participante_tipo && record.participante_tipo !== 'ALUNO') {
      const id = record.participante_tipo === 'EMPRESA' ? record.empresa_id : record.participante_tipo === 'FORNECEDOR' ? record.fornecedor_id : record.pessoa_id;
      const options = record.participante_tipo === 'INSTRUTOR' || record.participante_tipo === 'EMPRESA' || record.participante_tipo === 'FORNECEDOR' ? participants[record.participante_tipo] : [];
      participant = options.find((option) => option.id === id) ?? (id ? { tipo: record.participante_tipo, id, nome: record.participante_nome ?? 'Participante', documento: record.participante_documento } : null);
    } else if (record?.participante_tipo === 'ALUNO' && record.pessoa_id) {
      participant = { tipo: 'ALUNO', id: record.pessoa_id, nome: record.participante_nome ?? 'Aluno', documento: record.participante_documento };
    }
    setForm(record ? {
      descricao: record.descricao, frequencia: record.frequencia, dia_vencimento: String(record.dia_vencimento), data_inicio: record.data_inicio,
      repeticoes: record.repeticoes === null ? '' : String(record.repeticoes), valor_previsto: record.valor_previsto === null ? '' : String(record.valor_previsto),
      categoria_id: record.categoria_id, banco_id: record.banco_id,
      participante_tipo: (record.participante_tipo ?? '') as TipoPicker, participante_id: participant?.id ?? '', participante: participant,
      observacoes: record.observacoes ?? '', ativa: record.ativa,
    } : newForm());
    setCpfSearch(''); setErrorMessage(''); setModalOpen(true);
  };
  const closeForm = () => { if (!saving) setModalOpen(false); };

  const chooseType = (type: TipoPicker) => {
    setForm((current) => ({ ...current, participante_tipo: type, participante_id: '', participante: null }));
    if (type === 'ALUNO') setCpfSearch('');
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setErrorMessage('');
    const category = categoriasSaida.find((item) => item.id === form.categoria_id);
    if (!form.descricao.trim()) return setErrorMessage('Informe uma descrição.');
    if (!category || !form.banco_id || !contas.some((item) => item.id === form.banco_id)) return setErrorMessage('Selecione uma categoria de saída e uma conta.');
    const day = Number(form.dia_vencimento);
    if (!Number.isInteger(day) || day < 1 || day > 31 || !form.data_inicio) return setErrorMessage('Informe um vencimento entre 1 e 31 e uma data de início.');
    const repetitions = form.frequencia === 'REPETICAO_FINITA' ? Number(form.repeticoes) : null;
    if (form.frequencia === 'REPETICAO_FINITA' && (!Number.isInteger(repetitions) || Number(repetitions) < 1)) return setErrorMessage('Informe ao menos uma repetição.');
    const amount = form.valor_previsto.trim() === '' ? null : Number(form.valor_previsto);
    if (amount !== null && (!Number.isFinite(amount) || amount <= 0)) return setErrorMessage('O valor previsto deve ser maior que zero ou ficar em branco para A definir.');
    if (form.participante_tipo && !form.participante) return setErrorMessage('Selecione um participante ou escolha Nenhum.');
    const selected = form.participante;
    const participantType = form.participante_tipo ? form.participante_tipo as TipoParticipante : null;
    const payload = {
      descricao: form.descricao.trim(), frequencia: form.frequencia, dia_vencimento: day, data_inicio: form.data_inicio,
      repeticoes: repetitions, valor_previsto: amount, categoria_id: form.categoria_id, banco_id: form.banco_id,
      participante_tipo: participantType,
      pessoa_id: selected && (participantType === 'ALUNO' || participantType === 'INSTRUTOR') ? selected.id : null,
      empresa_id: selected && participantType === 'EMPRESA' ? selected.id : null,
      fornecedor_id: selected && participantType === 'FORNECEDOR' ? selected.id : null,
      participante_nome: selected?.nome ?? null, participante_documento: selected?.documento ?? null,
      observacoes: form.observacoes, ativa: form.ativa,
    };
    try {
      if (editing) await updateProgramacao({ id: editing.id, updates: payload });
      else await createProgramacao({ ...payload, created_by: userLogged?.id ?? null });
      setModalOpen(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Não foi possível salvar a despesa.');
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try { await deleteProgramacao(deleting.id); setDeleting(null); }
    catch (error) { setDeleting(null); setErrorMessage(error instanceof Error ? error.message : 'Não foi possível excluir a despesa.'); }
  };

  return (
    <div className="flex-1 flex flex-col p-6 gap-6 overflow-y-auto">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="font-display text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white">Despesas</h2><p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Cadastre programações recorrentes ou avulsas para gerar os pagamentos previstos de cada mês.</p></div><div className="flex gap-2"><Button type="button" variant="secondary" onClick={() => setHelpOpen(true)} icon={<HelpCircle className="h-4 w-4" aria-hidden="true"/>} aria-label="Ajuda" className={focusClass}>Ajuda</Button><button type="button" data-testid="nova-despesa-button" onClick={() => openForm()} className={`flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-teal-600 dark:hover:bg-teal-500 ${focusClass}`}><Plus className="h-4 w-4" aria-hidden="true"/>Nova Despesa</button></div></div>
      {errorMessage && !modalOpen && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">{errorMessage}</p>}
      <FinanceiroOptionsLimitWarning visible={contasOptionsTruncated || categoriasOptionsTruncated || participantesOptionsTruncated}/>
      {isError && !isLoading && <QueryErrorState onRetry={() => void queryClient.invalidateQueries({ queryKey: ['programacoes-saida'] })} isRetrying={retrying} message="Verifique sua conexão e tente novamente."/>}
      <div className="flex min-h-[350px] flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {isFetching && !isLoading && <p role="status" className="px-4 py-2 text-xs text-gray-500">Atualizando...</p>}
        <div className="flex-1 overflow-x-auto overflow-y-auto"><table data-testid="despesas-table" className="w-full min-w-[1100px] border-collapse text-left text-xs"><thead className="sticky top-0 z-10 border-b border-gray-200 bg-slate-50 font-bold uppercase tracking-wider text-gray-500 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-400"><tr><th className="w-12 px-2 py-3 text-center" aria-label="Ações"></th><th className="px-3 py-3">Descrição</th><th className="px-3 py-3">Frequência</th><th className="px-3 py-3">Vencimento</th><th className="px-3 py-3">Início</th><th className="px-3 py-3 text-right">Valor previsto</th><th className="px-3 py-3">Categoria</th><th className="px-3 py-3">Conta</th><th className="px-3 py-3">Participante</th><th className="px-3 py-3">Situação</th></tr></thead><tbody className="divide-y divide-gray-150 text-gray-700 dark:text-slate-200">
          {isLoading ? <tr><td colSpan={10} className="px-4 py-10 text-center">Carregando despesas...</td></tr> : isError ? <tr><td colSpan={10} className="px-4 py-10 text-center">Não foi possível carregar as despesas.</td></tr> : programacoes.length === 0 ? <tr><td colSpan={10} className="px-4 py-12 text-center"><div className="flex flex-col items-center gap-2"><CalendarClock className="h-7 w-7 text-teal-600" aria-hidden="true"/><p className="font-bold text-slate-800 dark:text-slate-200">Nenhuma despesa cadastrada</p><p className="text-xs text-gray-500">Cadastre uma programação para prever pagamentos.</p></div></td></tr> : programacoes.map((item) => <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50"><td className="px-2 py-2 text-center"><RowActionMenu ariaLabel={`Ações para ${item.descricao}`} items={[{ label: 'Editar', icon: <Edit2 className="h-4 w-4" aria-hidden="true"/>, onClick: () => openForm(item) }, { label: 'Excluir', icon: <Trash2 className="h-4 w-4" aria-hidden="true"/>, tone: 'danger', onClick: () => { setErrorMessage(''); setDeleting(item); } }]}/></td><td className="px-3 py-2 font-semibold">{item.descricao}</td><td className="px-3 py-2">{frequencyLabel(item.frequencia)}</td><td className="px-3 py-2">Dia {item.dia_vencimento}</td><td className="px-3 py-2">{formatDate(item.data_inicio)}</td><td className="px-3 py-2 text-right">{item.valor_previsto === null ? 'A definir' : money.format(item.valor_previsto)}</td><td className="px-3 py-2">{item.categoria?.nome ?? '—'}</td><td className="px-3 py-2">{item.conta?.nome ?? '—'}</td><td className="px-3 py-2">{item.participante_nome ?? '—'}</td><td className="px-3 py-2">{item.ativa ? 'Ativa' : 'Inativa'}</td></tr>)}
          </tbody></table></div>
        <PaginationFooter page={page} pageSize={pageSize} total={totalProgramacoes} onPageChange={setPage} itemLabel="despesas" />
      </div>
      <HelpModal isOpen={helpOpen} onClose={() => setHelpOpen(false)} title="Ajuda sobre Despesas" description="As programações geram os pagamentos previstos do mês quando as previsões são solicitadas. Excluir uma programação também remove os pagamentos previstos associados." items={[{ title: 'Frequência', description: 'Escolha uma programação mensal contínua, avulsa ou com número finito de repetições.', icon: <CalendarClock className="h-4 w-4" aria-hidden="true"/> }]}/>
      <Modal isOpen={modalOpen} onClose={closeForm} ariaLabelledBy="despesa-form-title"><div className="max-h-[calc(100vh-2rem)] overflow-y-auto rounded-xl bg-white shadow-xl dark:bg-slate-900"><div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-slate-800"><h2 id="despesa-form-title" className="text-lg font-bold text-slate-800 dark:text-white">{editing ? 'Editar Despesa' : 'Nova Despesa'}</h2><button type="button" onClick={closeForm} disabled={saving} aria-label="Fechar formulário" className={`rounded p-1 text-gray-500 ${focusClass} disabled:opacity-50`}><X className="h-5 w-5" aria-hidden="true"/></button></div><form onSubmit={(event) => void save(event)} className="space-y-4 p-6">
        <div><label htmlFor="despesa-descricao" className={labelClass}>Descrição</label><input id="despesa-descricao" className={inputClass} required value={form.descricao} onChange={(event) => setForm((current) => ({ ...current, descricao: event.target.value }))}/></div>
        <div><label htmlFor="despesa-frequencia" className={labelClass}>Frequência</label><select id="despesa-frequencia" className={inputClass} value={form.frequencia} onChange={(event) => setForm((current) => ({ ...current, frequencia: event.target.value as TipoFrequenciaProgramacao }))}><option value="MENSAL_CONTINUA">Mensal contínua</option><option value="AVULSA">Avulsa</option><option value="REPETICAO_FINITA">Repetição finita</option></select></div>
        <div className="grid gap-4 sm:grid-cols-2"><div><label htmlFor="despesa-dia-vencimento" className={labelClass}>Dia do vencimento</label><NumberStepper id="despesa-dia-vencimento" value={form.dia_vencimento} min={1} max={31} required ariaLabel="dia do vencimento" onChange={(dia_vencimento) => setForm((current) => ({ ...current, dia_vencimento }))}/></div><div><label htmlFor="despesa-data-inicio" className={labelClass}>Data de início</label><input id="despesa-data-inicio" className={inputClass} type="date" required value={form.data_inicio} onChange={(event) => setForm((current) => ({ ...current, data_inicio: event.target.value }))}/></div></div>
        {form.frequencia === 'REPETICAO_FINITA' && <div><label htmlFor="despesa-repeticoes" className={labelClass}>Número de repetições</label><NumberStepper id="despesa-repeticoes" value={form.repeticoes} min={1} required ariaLabel="número de repetições" onChange={(repeticoes) => setForm((current) => ({ ...current, repeticoes }))}/></div>}
        <div><label htmlFor="despesa-valor" className={labelClass}>Valor previsto (opcional)</label><MoneyInput id="despesa-valor" className={inputClass} permiteVazio placeholder="Em branco para A definir" value={form.valor_previsto} onChange={(valor_previsto) => setForm((current) => ({ ...current, valor_previsto }))}/><p className="mt-1 text-xs text-gray-500">Deixe em branco quando o valor ainda não for conhecido.</p></div>
        <div><label htmlFor="despesa-categoria" className={labelClass}>Categoria</label><select id="despesa-categoria" className={inputClass} required value={form.categoria_id} onChange={(event) => setForm((current) => ({ ...current, categoria_id: event.target.value }))}><option value="">Selecione uma categoria</option>{categoriasSaida.map((item) => <option key={item.id} value={item.id}>{item.nome}{item.ativo ? '' : ' (inativa)'}</option>)}</select></div>
        <div><label htmlFor="despesa-conta" className={labelClass}>Conta</label><select id="despesa-conta" className={inputClass} required value={form.banco_id} onChange={(event) => setForm((current) => ({ ...current, banco_id: event.target.value }))}><option value="">Selecione uma conta</option>{contas.map((item) => <option key={item.id} value={item.id}>{item.nome}{item.ativo ? '' : ' (inativa)'}</option>)}</select></div>
        <div><label htmlFor="despesa-participante-tipo" className={labelClass}>Tipo de participante</label><select id="despesa-participante-tipo" className={inputClass} value={form.participante_tipo} onChange={(event) => chooseType(event.target.value as TipoPicker)}><option value="">Nenhum</option><option value="FORNECEDOR">Fornecedor</option><option value="INSTRUTOR">Instrutor</option><option value="EMPRESA">Empresa</option><option value="ALUNO">Aluno</option></select></div>
        {(form.participante_tipo === 'FORNECEDOR' || form.participante_tipo === 'INSTRUTOR' || form.participante_tipo === 'EMPRESA') && <div><label htmlFor="despesa-participante-id" className={labelClass}>{form.participante_tipo === 'FORNECEDOR' ? 'Fornecedor' : form.participante_tipo === 'INSTRUTOR' ? 'Instrutor' : 'Empresa'}</label><select id="despesa-participante-id" className={inputClass} required value={form.participante_id} onChange={(event) => setForm((current) => ({ ...current, participante_id: event.target.value, participante: participants[current.participante_tipo as 'INSTRUTOR' | 'EMPRESA' | 'FORNECEDOR'].find((item) => item.id === event.target.value) ?? null }))}><option value="">Selecione um participante</option>{form.participante && !participants[form.participante_tipo].some((item) => item.id === form.participante?.id) && <option value={form.participante.id}>{participantLabel(form.participante)}</option>}{participants[form.participante_tipo].map((item) => <option key={item.id} value={item.id}>{participantLabel(item)}</option>)}</select></div>}
        {form.participante_tipo === 'ALUNO' && <div className="space-y-2"><label htmlFor="despesa-aluno-cpf" className={labelClass}>Buscar aluno por CPF</label><input id="despesa-aluno-cpf" className={inputClass} inputMode="numeric" placeholder="Digite ao menos 3 dígitos do CPF" value={cpfSearch} onChange={(event) => setCpfSearch(event.target.value)}/>{form.participante && <p className="text-sm text-teal-700 dark:text-teal-300">Selecionado: {participantLabel(form.participante)}</p>}{cpfAlunosLoading && <p className="text-xs text-gray-500">Buscando alunos...</p>}{cpfAlunos.length > 0 && <div className="max-h-36 space-y-1 overflow-y-auto rounded border border-gray-200 p-2 dark:border-slate-700">{cpfAlunos.map((aluno) => <button key={aluno.id} type="button" onClick={() => setForm((current) => ({ ...current, participante_id: aluno.id, participante: aluno }))} className={`block w-full rounded px-2 py-1 text-left text-sm hover:bg-teal-50 dark:hover:bg-slate-800 ${focusClass}`}>{participantLabel(aluno)}</button>)}</div>}</div>}
        <div><label htmlFor="despesa-observacoes" className={labelClass}>Observações</label><textarea id="despesa-observacoes" className={inputClass} rows={3} value={form.observacoes} onChange={(event) => setForm((current) => ({ ...current, observacoes: event.target.value }))}/></div>
        <label htmlFor="despesa-ativa" className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200"><input id="despesa-ativa" type="checkbox" checked={form.ativa} onChange={(event) => setForm((current) => ({ ...current, ativa: event.target.checked }))}/>Programação ativa</label>
        {errorMessage && <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">{errorMessage}</p>}
        <div className="flex justify-end gap-3 pt-2"><Button variant="secondary" type="button" onClick={closeForm} disabled={saving} className={focusClass}>Cancelar</Button><Button type="submit" disabled={saving} className={focusClass}>{saving ? 'Salvando...' : editing ? 'Atualizar' : 'Salvar'}</Button></div>
      </form></div></Modal>
      <ConfirmDeleteModal isOpen={deleting !== null} onClose={() => !isDeleting && setDeleting(null)} onConfirm={() => void confirmDelete()} itemName={deleting ? `${deleting.descricao} — a exclusão também remove os pagamentos previstos desta programação` : undefined} isPending={isDeleting}/>
    </div>
  );
}
