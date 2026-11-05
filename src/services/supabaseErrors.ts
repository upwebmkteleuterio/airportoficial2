export function newServiceId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

const uniqueConstraintMessages: Record<string, string> = {
  fornecedores_cpf_cnpj_key: 'Já existe um fornecedor cadastrado com este CPF/CNPJ.',
  fornecedores_pkey: 'Este fornecedor já existe. Tente novamente.',
  bancos_pkey: 'Esta conta já existe. Tente novamente.',
  categorias_financeiras_nome_tipo_key: 'Já existe uma categoria com este nome para este tipo.',
  categorias_financeiras_pkey: 'Esta categoria já existe. Tente novamente.',
  lancamentos_financeiros_pkey: 'Este lançamento já existe. Tente novamente.',
  lancamentos_financeiros_programacao_mes_idx: 'Já existe uma previsão para esta despesa neste mês.',
  vendas_pkey: 'Esta venda já existe. Tente novamente.',
  notas_fiscais_chave_acesso_key: 'Já existe uma nota fiscal cadastrada com esta chave de acesso.',
  notas_fiscais_pkey: 'Esta nota fiscal já existe. Tente novamente.',
  programacoes_saidas_pkey: 'Esta despesa já existe. Tente novamente.',
  saldos_contas_pkey: 'Este saldo de conta já existe. Tente novamente.',
  resumo_financeiro_mensal_pkey: 'Este resumo financeiro já existe. Tente novamente.',
};

const businessValidationMessages = [
  'A categoria informada não pertence ao tipo',
  'Categorias de sistema não podem ser excluídas.',
  'Categorias de sistema são mantidas pelo sistema e não podem ser alteradas.',
  'O tipo da categoria não pode ser alterado. Crie uma nova categoria.',
];

function getErrorInfo(error: unknown): { code?: string; constraint?: string; message: string; name?: string } {
  if (typeof error === 'object' && error !== null) {
    const value = error as { code?: unknown; constraint?: unknown; message?: unknown; name?: unknown };
    const message = typeof value.message === 'string' ? value.message : String(error);
    const constraintMatch = message.match(/unique constraint ["']([^"']+)["']/i);
    return {
      code: typeof value.code === 'string' ? value.code : undefined,
      constraint: typeof value.constraint === 'string' ? value.constraint : constraintMatch?.[1],
      message,
      name: typeof value.name === 'string' ? value.name : undefined,
    };
  }
  return { message: String(error) };
}

function isPortugueseApplicationMessage(message: string): boolean {
  return /[áàâãéêíóôõúç]/i.test(message)
    || /\b(?:informe|selecione|escolha|escolher|somente|existe|existem|encontrad[oa]s?|não|nao|está|esta|estão|estao|pode|podem|deve|devem|precisa|precisam|válid[oa]s?|inativ[oa]s?|inválid[oa]s?|recebimento|transferência|lançamento|matrícula|categoria|turma|parcela|contas?|origem|destino|venda|despesa|fornecedor|documento|permissão|permissao)\b/i.test(message);
}

function serviceMessage(operation: string, error: unknown): string {
  const { code, constraint, message, name } = getErrorInfo(error);
  const normalized = message.toLowerCase();

  if (code === 'P0001' || (code === '23514' && businessValidationMessages.some((item) => message.startsWith(item)))) {
    return `${operation}: ${message}`;
  }

  if (code === '23505') {
    if (constraint && uniqueConstraintMessages[constraint]) return uniqueConstraintMessages[constraint];
    console.error('Erro de banco de dados não mapeado:', error);
    return `${operation}. Verifique os dados e tente novamente.`;
  }

  if (code === '23503') return 'Este registro está sendo usado em outro lugar e não pode ser alterado agora.';
  if (code === '23502' || code === '23514' || code === '22P02') {
    return 'Alguns dados informados não são válidos. Revise os campos e tente novamente.';
  }
  if (code === '42501') return 'Você não tem permissão para esta ação.';

  if (name === 'AbortError' || /timed? ?out|timeout|aborted|aborterror|deadline exceeded/i.test(message)) {
    return 'O servidor demorou para responder. Tente novamente em instantes.';
  }
  if (/failed to fetch|fetch failed|networkerror|network request failed|load failed|offline/i.test(normalized)) {
    return 'Sem conexão com a internet. Verifique sua rede e tente novamente.';
  }

  if ((code === '22023' || code === 'P0002') && isPortugueseApplicationMessage(message)) {
    return `${operation}: ${message}`;
  }
  if (!code && isPortugueseApplicationMessage(message)) return `${operation}: ${message}`;

  if (code) console.error('Erro de banco de dados não mapeado:', error);
  else console.error('Erro não mapeado:', error);
  return `${operation}. Tente novamente.`;
}

export function serviceError(operation: string, error: unknown): Error {
  return new Error(serviceMessage(operation, error));
}

export function throwServiceError(operation: string, error: unknown): never {
  throw serviceError(operation, error);
}
