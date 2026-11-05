function formatLocalDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function primeiroDiaDoMes(referencia: Date = new Date()): string {
  return formatLocalDate(new Date(referencia.getFullYear(), referencia.getMonth(), 1));
}

export function ultimoDiaDoMes(referencia: Date = new Date()): string {
  return formatLocalDate(new Date(referencia.getFullYear(), referencia.getMonth() + 1, 0));
}
