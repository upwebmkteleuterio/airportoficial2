interface TableSkeletonProps {
  columns: number;
  rows?: number;
}

export function TableSkeleton({ columns, rows = 6 }: TableSkeletonProps) {
  return (
    <>
      <tr>
        <td colSpan={columns} data-testid="table-skeleton" className="px-4 py-2">
          <span role="status" className="sr-only">Carregando...</span>
          <div aria-hidden="true" className="space-y-2 animate-pulse">
            {Array.from({ length: rows }, (_, row) => (
              <div key={row} className="flex h-8 items-center gap-3">
                {Array.from({ length: columns }, (_, column) => (
                  <span key={column} className={`h-3 rounded bg-slate-200 dark:bg-slate-700 ${column === 0 ? 'w-1/12' : 'flex-1'}`} />
                ))}
              </div>
            ))}
          </div>
        </td>
      </tr>
    </>
  );
}

export function SummaryCardSkeleton() {
  return (
    <>
      <span role="status" className="sr-only">Carregando...</span>
      <div aria-hidden="true" className="mt-2 h-7 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
    </>
  );
}
