import type { ParcelaVenda } from '../../types/financeiro';

const base = 'inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold';
const estorno = `${base} bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300`;
const cancelamento = `${base} bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300`;

export function ParcelaTags({ parcela, numero }: { parcela: ParcelaVenda; numero: number }) {
  const cancelada = parcela.status === 'CANCELADO';
  return <span className="inline-flex flex-wrap gap-1">
    {parcela.estornado && cancelada && <span data-testid="parcela-tag-estornada" title={parcela.estorno_motivo ?? undefined} className={estorno}>Estornado / Cancelado</span>}
    {parcela.estornado && !cancelada && <span data-testid="parcela-tag-estornada" title={parcela.estorno_motivo ?? undefined} className={estorno}>Estornado</span>}
    {!parcela.estornado && cancelada && <span data-testid="parcela-tag-cancelada" title={parcela.cancelado_motivo ?? undefined} className={cancelamento}>Cancelada</span>}
    {parcela.nova_parcela && <span data-testid="parcela-tag-nova" className={`${base} bg-teal-100 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300`}>Nova parcela</span>}
    {parcela.parcela_original !== null && parcela.parcela_original !== numero && <span className={`${base} bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300`}>Era a parcela nº {parcela.parcela_original}</span>}
  </span>;
}

export default ParcelaTags;
