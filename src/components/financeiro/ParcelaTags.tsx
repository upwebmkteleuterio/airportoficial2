import type { ParcelaVenda } from '../../types/financeiro';

const base = 'inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold';

export function ParcelaTags({ parcela, numero }: { parcela: ParcelaVenda; numero: number }) {
  const formatarData = (data: string) => {
    const [ano, mes, dia] = data.slice(0, 10).split('-');
    return `${dia}/${mes}/${ano}`;
  };
  return <span className="inline-flex flex-wrap gap-1">
    {parcela.status === 'CANCELADO' && <span data-testid="parcela-tag-cancelada" title={parcela.cancelado_motivo ?? undefined} className={`${base} bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300`}>Cancelada</span>}
    {parcela.estornado && <span data-testid="parcela-tag-estornada" title={parcela.estorno_motivo ?? undefined} className={`${base} bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300`}>Estornada</span>}
    {parcela.nova_parcela && <span data-testid="parcela-tag-nova" className={`${base} bg-teal-100 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300`}>Nova parcela</span>}
    {parcela.valor_original !== null && parcela.valor_original !== Number(parcela.valor) && <span data-testid="parcela-tag-valor-alterado" title={`Valor original: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(parcela.valor_original))}`} className={`${base} bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300`}>Valor alterado</span>}
    {parcela.data_original && parcela.data_original !== parcela.data_competencia && <span data-testid="parcela-tag-data-alterada" title={`Vencimento original: ${formatarData(parcela.data_original)}`} className={`${base} bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300`}>Data alterada</span>}
    {parcela.parcela_original !== null && parcela.parcela_original !== numero && <span className={`${base} bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300`}>Era a parcela nº {parcela.parcela_original}</span>}
  </span>;
}

export default ParcelaTags;
