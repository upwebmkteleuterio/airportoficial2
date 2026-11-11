export const FINANCEIRO_OPTIONS_LIMIT = 1000;

// Categoria de sistema que movimenta o caixa, mas não entra no resultado.
export const CATEGORIA_SAQUE_LUCRO_ID = 'cat-sai-distribuicao-lucro';

export interface FinanceiroOptionsResult<T> {
  data: T[];
  total: number;
}
