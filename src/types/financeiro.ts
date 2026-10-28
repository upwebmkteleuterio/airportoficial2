export type TipoLancamento = 'ENTRADA' | 'SAIDA';
export type TipoBanco = 'BANCO' | 'COFRE_LOCAL';
export type FormaPagamento = 'PIX' | 'DINHEIRO' | 'BOLETO' | 'TRANSFERENCIA' | 'CARTAO' | 'CHEQUE' | 'OUTRO';
export type TipoParticipante = 'ALUNO' | 'INSTRUTOR' | 'COORDENADOR' | 'EMPRESA' | 'FORNECEDOR';
export type TipoDocumentoFornecedor = 'CPF' | 'CNPJ';

export interface Banco {
  id: string;
  nome: string;
  tipo: TipoBanco;
  logo_url: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface SaldoConta {
  banco_id: string;
  saldo_inicial: number;
  data_saldo_inicial: string;
  total_entradas: number;
  total_saidas: number;
  saldo_atual: number;
  updated_at: string;
}

export type ContaComSaldo = Banco & SaldoConta;

export interface CategoriaFinanceira {
  id: string;
  nome: string;
  tipo: TipoLancamento;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Fornecedor {
  id: string;
  nome: string;
  tipo_documento: TipoDocumentoFornecedor;
  cpf_cnpj: string;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  telefone: string | null;
  email: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface LancamentoFinanceiro {
  id: string;
  tipo: TipoLancamento;
  valor: number;
  data_competencia: string;
  data_efetivacao: string;
  categoria_id: string;
  banco_id: string;
  descricao: string;
  forma_pagamento: FormaPagamento | null;
  numero_documento: string | null;
  observacoes: string;
  participante_tipo: TipoParticipante | null;
  pessoa_id: string | null;
  empresa_id: string | null;
  fornecedor_id: string | null;
  participante_nome: string | null;
  participante_documento: string | null;
  turma_id: string | null;
  matricula_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface LancamentoComRelacoes extends LancamentoFinanceiro {
  categoria: Pick<CategoriaFinanceira, 'id' | 'nome' | 'tipo'> | null;
  banco: Pick<Banco, 'id' | 'nome' | 'tipo'> | null;
}

export interface ResumoFinanceiroMensal {
  banco_id: string;
  ano: number;
  mes: number;
  total_entradas: number;
  total_saidas: number;
  saldo_periodo: number;
}

export interface ParticipanteOpcao {
  tipo: TipoParticipante;
  id: string;
  nome: string;
  documento: string | null;
}
