export function FinanceiroOptionsLimitWarning({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">Há mais de 1.000 registros nesta lista. As opções exibem somente os primeiros 1.000 registros.</p>;
}
