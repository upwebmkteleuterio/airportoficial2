export type TipoLancamento = 'ENTRADA' | 'SAIDA';
export type TipoSituacaoLancamento = 'PREVISTO' | 'EFETIVADO';
export type TipoBanco = 'BANCO' | 'COFRE_LOCAL' | 'CARTAO';
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

export interface SaldoPeriodoBanco {
  banco_id: string;
  entradas_periodo: number;
  saidas_periodo: number;
  entradas_acumuladas: number;
  saidas_acumuladas: number;
}

export type ContaComSaldo = Banco & SaldoConta;

export interface TransferenciaEntreContas {
  id: string;
  conta_origem_id: string;
  conta_origem_nome: string;
  conta_destino_id: string;
  conta_destino_nome: string;
  valor: number;
  data: string;
  observacoes: string;
}

export interface CategoriaFinanceira {
  id: string;
  nome: string;
  tipo: TipoLancamento;
  sistema: boolean;
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
  status: TipoSituacaoLancamento;
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

export type TipoCondicaoVenda = 'A_VISTA' | 'PARCELADO';
export type TipoParticipanteVenda = 'ALUNO' | 'EMPRESA';

export interface Venda {
  id: string;
  participante_tipo: TipoParticipanteVenda;
  pessoa_id: string | null;
  empresa_id: string | null;
  participante_nome: string;
  participante_documento: string | null;
  curso_id: string | null;
  turma_id: string | null;
  condicao: TipoCondicaoVenda;
  parcelas_quantidade: number;
  categoria_id: string;
  banco_id: string;
  forma_pagamento: FormaPagamento | null;
  referencia_transacao: string | null;
  cartao_ultimos_digitos: string | null;
  observacoes: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ParcelaVenda {
  id: string;
  valor: number;
  data_competencia: string;
  data_efetivacao: string;
  status: TipoSituacaoLancamento;
}

export interface VendaComRelacoes extends Venda {
  curso: { id: string; nome_curso: string } | null;
  turma: { id: string; id_interno_escola: number } | null;
  categoria: { id: string; nome: string } | null;
  conta: { id: string; nome: string } | null;
  parcelas: ParcelaVenda[];
}

export interface ParcelaRecebimento extends LancamentoFinanceiro {
  venda: Venda | null;
}

export type TipoFrequenciaProgramacao = 'MENSAL_CONTINUA' | 'AVULSA' | 'REPETICAO_FINITA' | 'PARCELAS_PERSONALIZADAS';

export interface ParcelaPersonalizadaInput {
  data: string;
  valor: string;
}

export interface ParcelaPersonalizadaEditavel {
  data: string;
  valor: number;
}

export interface ParcelasPersonalizadasEditor {
  parcelas: ParcelaPersonalizadaEditavel[];
  pagas: number;
  valorPago: number;
  dataMaisAntigaPaga: string | null;
}

export interface ProgramacaoSaida {
  id: string;
  descricao: string;
  frequencia: TipoFrequenciaProgramacao;
  dia_vencimento: number | null;
  data_inicio: string;
  repeticoes: number | null;
  total_parcelas: number | null;
  cancelada: boolean;
  valor_previsto: number | null;
  categoria_id: string;
  banco_id: string;
  participante_tipo: TipoParticipante | null;
  pessoa_id: string | null;
  empresa_id: string | null;
  fornecedor_id: string | null;
  participante_nome: string | null;
  participante_documento: string | null;
  observacoes: string;
  ativa: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProgramacaoSaidaComRelacoes extends ProgramacaoSaida {
  categoria: { id: string; nome: string } | null;
  conta: { id: string; nome: string } | null;
}

export interface ParcelaDespesa extends LancamentoFinanceiro {
  programacao: ProgramacaoSaida | null;
}
