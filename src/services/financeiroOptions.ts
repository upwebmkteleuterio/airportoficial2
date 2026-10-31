export const FINANCEIRO_OPTIONS_LIMIT = 1000;

export interface FinanceiroOptionsResult<T> {
  data: T[];
  total: number;
}
