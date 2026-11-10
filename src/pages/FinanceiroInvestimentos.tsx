import { useEffect, useMemo, useState } from 'react';
import { Banknote, Edit2, Eye, HelpCircle, Landmark, LineChart, Plus, Sparkles, Trash2, TrendingDown, TrendingUp } from 'lucide-react';
import { useBancos } from '../hooks/useBancos';
import { useAplicacaoMovimentos, useAplicacoes, useExcluirAplicacao, useMovimentoAplicacao, useSalvarAplicacao } from '../hooks/useAplicacoes';
import type { AplicacaoSaldo, TipoMovimentoAplicacao } from '../types/financeiro';
import type { AplicacaoInput } from '../services/aplicacaoService';
import { Button } from '../components/ui/Button';
import { ConfirmDeleteModal } from '../components/ui/ConfirmDeleteModal';
import { HelpModal } from '../components/ui/HelpModal';
import { PaginationFooter } from '../components/ui/PaginationFooter';
import { QueryErrorState } from '../components/ui/QueryErrorState';
import { RowActionMenu } from '../components/ui/RowActionMenu';
import { TableSkeleton } from '../components/ui/FinanceiroSkeleton';
import { AplicacaoDetalhesModal } from '../components/financeiro/AplicacaoDetalhesModal';
import { AplicacaoModal } from '../components/financeiro/AplicacaoModal';
import { MovimentoAplicacaoModal } from '../components/financeiro/MovimentoAplicacaoModal';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const pageSize = 10;
const inputTipo: Record<AplicacaoSaldo['tipo'], string> = { CDB: 'CDB', POUPANCA: 'Poupança', FUNDO: 'Fundo', TESOURO: 'Tesouro', ACOES: 'Ações', OUTRO: 'Outro' };
const dateFormat = (value: string) => value ? new Intl.DateTimeFormat('pt-BR').format(new Date(`${value.slice(0, 10)}T00:00:00`)) : '—';

interface Totais { aportes: number; rendimentos: number; resgates: number; disponivel: number }
const zerados = (): Totais => ({ aportes: 0, rendimentos: 0, resgates: 0, disponivel: 0 });
function somar(totais: Totais, aplicacao: AplicacaoSaldo): Totais {
  return { aportes: totais.aportes + aplicacao.aportes, rendimentos: totais.rendimentos + aplicacao.rendimentos, resgates: totais.resgates + aplicacao.resgates, disponivel: totais.disponivel + aplicacao.disponivel };
}

export default function FinanceiroInvestimentos() {
  const { aplicacoes, isLoading, isFetching, isError, refetch } = useAplicacoes();
  const { contas } = useBancos();
  const { salvarAplicacao, isSaving } = useSalvarAplicacao();
  const { excluirAplicacao, isDeleting } = useExcluirAplicacao();
  const { aplicarAporte, registrarRendimento, resgatar, isPending } = useMovimentoAplicacao();
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<AplicacaoSaldo | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [details, setDetails] = useState<AplicacaoSaldo | null>(null);
  const [movementApp, setMovementApp] = useState<AplicacaoSaldo | null>(null);
  const [movementType, setMovementType] = useState<TipoMovimentoAplicacao | null>(null);
  const [deleting, setDeleting] = useState<AplicacaoSaldo | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [pageError, setPageError] = useState('');
  const movimentoQuery = useAplicacaoMovimentos(details?.id ?? null);

  const agrupado = useMemo(() => {
    const bancos = new Map<string, { nome: string; totais: Totais }>();
    aplicacoes.forEach((aplicacao) => {
      const item = bancos.get(aplicacao.banco_id) ?? { nome: aplicacao.banco_nome, totais: zerados() };
      item.totais = somar(item.totais, aplicacao);
      bancos.set(aplicacao.banco_id, item);
    });
    return [...bancos.entries()].map(([id, banco]) => ({ id, ...banco }));
  }, [aplicacoes]);
  const totalGeral = useMemo(() => aplicacoes.reduce(somar, zerados()), [aplicacoes]);
  const paginas = Math.ceil(aplicacoes.length / pageSize) || 1;
  const aplicacoesPagina = aplicacoes.slice((page - 1) * pageSize, page * pageSize);
  useEffect(() => { if (page > paginas) setPage(paginas); }, [page, paginas]);

  const salvar = async (id: string | null, dados: AplicacaoInput) => salvarAplicacao({ id, dados });
  const excluir = async () => {
    if (!deleting) return;
    try { await excluirAplicacao(deleting.id); setDeleting(null); setPageError(''); }
    catch (cause) { setDeleting(null); setPageError(cause instanceof Error ? cause.message : 'Não foi possível excluir a aplicação.'); }
  };
  const confirmarMovimento = async (dados: { valor: number; percentual: number | null; data: string; observacoes: string }) => {
    if (!movementApp || !movementType) return;
    const comuns = { aplicacaoId: movementApp.id, valor: dados.valor, data: dados.data, observacoes: dados.observacoes };
    if (movementType === 'APORTE') await aplicarAporte(comuns);
    else if (movementType === 'RENDIMENTO') await registrarRendimento({ ...comuns, percentual: dados.percentual });
    else await resgatar(comuns);
  };
  const abrirMovimento = (aplicacao: AplicacaoSaldo, tipo: TipoMovimentoAplicacao) => { setMovementApp(aplicacao); setMovementType(tipo); };
  const abrirEdicao = (aplicacao: AplicacaoSaldo) => { setEditing(aplicacao); setFormOpen(true); };
  const abrirNova = () => { setEditing(null); setFormOpen(true); };

  return (
    <div className="flex-1 flex flex-col p-6 gap-6 overflow-y-auto">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><h2 className="font-display text-2xl font-extrabold leading-tight text-slate-900 dark:text-white md:text-3xl">Investimentos</h2><p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Acompanhe o valor aplicado, os rendimentos e os resgates de cada aplicação.</p></div><div className="flex items-center gap-2"><Button variant="secondary" type="button" onClick={() => setHelpOpen(true)} icon={<HelpCircle className="h-4 w-4" aria-hidden="true" />} aria-label="Ajuda">Ajuda</Button><Button type="button" data-testid="nova-aplicacao-button" onClick={abrirNova} icon={<Plus className="h-4 w-4" aria-hidden="true" />}>Nova aplicação</Button></div></div>
      {pageError && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">{pageError}</p>}
      <section aria-label="Resumo dos investimentos" className="space-y-3"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{agrupado.map((banco) => <ResumoCard key={banco.id} title={banco.nome} totais={banco.totais} />)}<div data-testid="investimentos-total-geral"><ResumoCard title="Total geral" totais={totalGeral} emphasis /></div></div><p className="text-xs text-gray-500 dark:text-slate-400">O valor dos investimentos não faz parte do saldo do caixa da conta: o caixa já saiu no aporte.</p></section>
      <QueryErrorState onRetry={() => void refetch()} isRetrying={isFetching} isError={isError} isFetching={isFetching} isLoading={isLoading} message="Não foi possível carregar as aplicações." />
      <div className="flex min-h-[350px] flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar"><table data-testid="investimentos-table" className="w-full min-w-[1120px] table-fixed border-collapse text-left text-xs"><thead className="sticky top-0 z-10 border-b border-gray-200 bg-slate-50 font-bold uppercase tracking-wider text-gray-500 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-400"><tr><th className="w-[12%] px-3 py-3">Banco</th><th className="w-[15%] px-3 py-3">Aplicação</th><th className="w-[9%] px-3 py-3">Tipo</th><th className="w-[11%] px-3 py-3">Data da aplicação</th><th className="w-[10%] px-3 py-3 text-right">Aplicado</th><th className="w-[10%] px-3 py-3 text-right">Rendimento</th><th className="w-[10%] px-3 py-3 text-right">Resgatado</th><th className="w-[10%] px-3 py-3 text-right">Disponível</th><th className="w-[8%] px-3 py-3 text-center">Situação</th><th className="w-12 px-2 py-3 text-center">Ações</th></tr></thead><tbody className="divide-y divide-gray-150 font-mono text-gray-700 dark:divide-slate-800 dark:text-slate-200">
          {isLoading ? <TableSkeleton columns={10} /> : isError ? null : aplicacoes.length === 0 ? <tr><td colSpan={10} className="px-4 py-12 text-center font-sans text-gray-500"><div className="flex flex-col items-center gap-2.5"><div className="rounded-full bg-teal-500/10 p-3 text-teal-600"><LineChart className="h-6 w-6" aria-hidden="true" /></div><p className="text-sm font-bold text-slate-800 dark:text-slate-200">Nenhuma aplicação cadastrada</p><p className="text-xs text-gray-400">Cadastre uma aplicação para acompanhar aportes, rendimentos e resgates.</p></div></td></tr> : aplicacoesPagina.map((aplicacao) => <tr key={aplicacao.id} tabIndex={0} onClick={(event) => { if (event.target !== event.currentTarget) return; setDetails(aplicacao); }} onKeyDown={(event) => { if (event.target !== event.currentTarget) return; if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setDetails(aplicacao); } }} className="cursor-pointer hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-500 dark:hover:bg-slate-800/50">
            <td className="px-3 py-2 font-sans font-semibold">{aplicacao.banco_nome}</td><td className="px-3 py-2 font-sans font-semibold text-slate-800 dark:text-slate-200">{aplicacao.nome}</td><td className="px-3 py-2">{inputTipo[aplicacao.tipo]}</td><td className="px-3 py-2">{dateFormat(aplicacao.data_aplicacao)}</td><td className="px-3 py-2 text-right">{money.format(aplicacao.aportes)}</td><td className="px-3 py-2 text-right">{money.format(aplicacao.rendimentos)}</td><td className="px-3 py-2 text-right">{money.format(aplicacao.resgates)}</td><td className="px-3 py-2 text-right">{money.format(aplicacao.disponivel)}</td><td className="px-3 py-2 text-center"><span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-bold uppercase ${aplicacao.ativo ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>{aplicacao.ativo ? 'Ativa' : 'Inativa'}</span></td><td className="px-3 py-2 text-center" onClick={(event) => event.stopPropagation()}><RowActionMenu ariaLabel={`Ações para ${aplicacao.nome}`} items={[...(aplicacao.ativo ? [{ label: 'Aplicar', icon: <Banknote className="h-4 w-4" aria-hidden="true" />, onClick: () => abrirMovimento(aplicacao, 'APORTE') }] : []), { label: 'Registrar rendimento', icon: <TrendingUp className="h-4 w-4" aria-hidden="true" />, onClick: () => abrirMovimento(aplicacao, 'RENDIMENTO') }, ...(aplicacao.disponivel > 0 ? [{ label: 'Resgatar', icon: <TrendingDown className="h-4 w-4" aria-hidden="true" />, onClick: () => abrirMovimento(aplicacao, 'RESGATE') }] : []), { label: 'Ver movimentos', icon: <Eye className="h-4 w-4" aria-hidden="true" />, onClick: () => setDetails(aplicacao) }, { label: 'Editar', icon: <Edit2 className="h-4 w-4" aria-hidden="true" />, onClick: () => abrirEdicao(aplicacao) }, { label: 'Excluir', icon: <Trash2 className="h-4 w-4" aria-hidden="true" />, tone: 'danger', onClick: () => { setPageError(''); setDeleting(aplicacao); } }]} /></td>
          </tr>)}
        </tbody></table></div>
        {isFetching && !isLoading && <p role="status" className="px-4 py-2 text-xs text-gray-500">Atualizando...</p>}
        <PaginationFooter page={page} pageSize={pageSize} total={aplicacoes.length} onPageChange={setPage} itemLabel="aplicações" />
      </div>
      <HelpModal isOpen={helpOpen} onClose={() => setHelpOpen(false)} title="Ajuda sobre investimentos" description="Acompanhe suas aplicações financeiras sem misturar o saldo investido ao caixa." items={[{ title: 'Conta vinculada', description: 'Cada aplicação fica vinculada a uma conta bancária cadastrada.', icon: <Landmark className="h-4 w-4" aria-hidden="true" /> }, { title: 'Aporte e resgate', description: 'O aporte sai do caixa da conta e o resgate entra no caixa automaticamente.', icon: <Banknote className="h-4 w-4" aria-hidden="true" /> }, { title: 'Rendimento', description: 'O rendimento é apenas informativo e não movimenta o caixa.', icon: <Sparkles className="h-4 w-4" aria-hidden="true" /> }]} />
      <AplicacaoModal isOpen={formOpen} onClose={() => setFormOpen(false)} aplicacao={editing} onSave={salvar} isSaving={isSaving} />
      <MovimentoAplicacaoModal isOpen={movementApp !== null} onClose={() => { setMovementApp(null); setMovementType(null); }} aplicacao={movementApp} tipo={movementType} conta={contas.find((conta) => conta.id === movementApp?.banco_id)} isPending={isPending} onConfirm={confirmarMovimento} />
      <AplicacaoDetalhesModal isOpen={details !== null} onClose={() => setDetails(null)} aplicacao={details} movimentos={movimentoQuery.movimentos} isLoading={movimentoQuery.isLoading} />
      <ConfirmDeleteModal isOpen={deleting !== null} onClose={() => !isDeleting && setDeleting(null)} onConfirm={excluir} itemName={deleting?.nome} isPending={isDeleting} />
    </div>
  );
}

function ResumoCard({ title, totais, emphasis = false }: { title: string; totais: Totais; emphasis?: boolean }) {
  return <article className={`rounded-xl border p-4 shadow-sm ${emphasis ? 'border-teal-300 bg-teal-50/60 dark:border-teal-800 dark:bg-teal-950/20' : 'border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900'}`}><h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white"><Landmark className="h-4 w-4 text-teal-600" aria-hidden="true" />{title}</h3><dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs"><ResumoValor label="Aplicado" valor={totais.aportes}/><ResumoValor label="Rendimento" valor={totais.rendimentos}/><ResumoValor label="Resgatado" valor={totais.resgates}/><ResumoValor label="Disponível" valor={totais.disponivel} strong/></dl></article>;
}
function ResumoValor({ label, valor, strong = false }: { label: string; valor: number; strong?: boolean }) { return <div><dt className="text-[10px] font-bold uppercase text-gray-500 dark:text-slate-400">{label}</dt><dd className={`mt-0.5 ${strong ? 'font-bold text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>{money.format(valor)}</dd></div>; }
