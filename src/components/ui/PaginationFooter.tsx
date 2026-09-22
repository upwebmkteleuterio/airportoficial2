import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationFooterProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  itemLabel?: string;
}

type PageItem = number | 'ellipsis';

function getPageItems(totalPages: number, currentPage: number): PageItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pageNumbers = new Set([1, 2, totalPages - 1, totalPages]);
  for (let offset = -1; offset <= 1; offset += 1) {
    const nearbyPage = currentPage + offset;
    if (nearbyPage >= 1 && nearbyPage <= totalPages) {
      pageNumbers.add(nearbyPage);
    }
  }

  const sortedPages = Array.from(pageNumbers).sort((a, b) => a - b);
  return sortedPages.reduce<PageItem[]>((items, pageNumber, index) => {
    if (index > 0 && pageNumber - sortedPages[index - 1] > 1) {
      items.push('ellipsis');
    }
    items.push(pageNumber);
    return items;
  }, []);
}

export function PaginationFooter({ page, pageSize, total, onPageChange, itemLabel = '' }: PaginationFooterProps) {
  const totalPages = Math.ceil(total / pageSize) || 1;
  const firstItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastItem = Math.min(page * pageSize, total);
  const label = total === 0
    ? `Exibindo 0 de 0${itemLabel ? ` ${itemLabel}` : ''}`
    : `Exibindo ${firstItem}-${lastItem} de ${total}${itemLabel ? ` ${itemLabel}` : ''}`;
  const pageItems = getPageItems(totalPages, page);

  return (
    <div className="px-5 py-4 border-t border-gray-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 font-sans text-xs bg-slate-50 dark:bg-slate-850">
      <span className="text-gray-500 dark:text-slate-400 font-medium">{label}</span>
      <div className="flex items-center border border-gray-300 dark:border-slate-750 rounded-lg bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        <button
          type="button"
          disabled={page === 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
          className="p-2 hover:bg-gray-50 dark:hover:bg-slate-850 text-gray-500 dark:text-slate-400 border-r border-gray-300 dark:border-slate-750 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Página anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        {pageItems.map((item, index) => (
          item === 'ellipsis' ? (
            <span
              key={`ellipsis-${index}`}
              aria-hidden="true"
              className="px-3 py-2 text-gray-500 dark:text-slate-400 border-r border-gray-300 dark:border-slate-750"
            >
              …
            </span>
          ) : (
            <button
              type="button"
              key={item}
              onClick={() => onPageChange(item)}
              className={`px-3 py-2 font-bold border-r border-gray-300 dark:border-slate-750 transition-colors cursor-pointer ${page === item ? 'bg-[#005f5f]/10 dark:bg-teal-950/30 text-[#005f5f] dark:text-teal-400' : 'text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-850'}`}
              aria-label={`Página ${item}`}
              aria-current={page === item ? 'page' : undefined}
            >
              {item}
            </button>
          )
        ))}
        <button
          type="button"
          disabled={page === totalPages}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          className="p-2 hover:bg-gray-50 dark:hover:bg-slate-850 text-gray-500 dark:text-slate-400 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Próxima página"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default PaginationFooter;
