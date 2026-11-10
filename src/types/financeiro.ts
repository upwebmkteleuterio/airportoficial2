export type TipoLancamento = 'ENTRADA' | 'SAIDA';
export type TipoSituacaoLancamento = 'PREVISTO' | 'EFETIVADO' | 'CANCELADO';
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
  venda_id?: string | null;
  transferencia_id?: string | null;
  programacao_id?: string | null;
  estornado: boolean;
  estorno_de: string | null;
  estorno_motivo: string | null;
  cancelado_motivo: string | null;
  renegociada: boolean;
  nova_parcela: boolean;
  valor_original: number | null;
  data_original: string | null;
  parcela_original: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface LancamentoComRelacoes extends LancamentoFinanceiro {
  categoria: Pick<CategoriaFinanceira, 'id' | 'nome' | 'tipo'> | null;
  banco: Pick<Banco, 'id' | 'nome' | 'tipo'> | null;
  venda?: Pick<Venda, 'id' | 'condicao' | 'forma_pagamento' | 'referencia_transacao' | 'cartao_ultimos_digitos' | 'observacoes'> | null;
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
  cancelada: boolean;
  cancelada_motivo: string | null;
  renegociada: boolean;
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
  estornado: boolean;
  estorno_motivo: string | null;
  cancelado_motivo: string | null;
  renegociada: boolean;
  nova_parcela: boolean;
  valor_original: number | null;
  data_original: string | null;
  parcela_original: number | null;
}

export interface VendaRenegociacao {
  id: string;
  venda_id: string;
  observacao: string;
  created_by: string | null;
  created_at: string;
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
  situacao_termino: 'EM_ANDAMENTO' | 'FINALIZADA' | 'CANCELADA';
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

export type TipoAplicacao = 'CDB' | 'POUPANCA' | 'FUNDO' | 'TESOURO' | 'ACOES' | 'OUTRO';
export type TipoMovimentoAplicacao = 'APORTE' | 'RENDIMENTO' | 'RESGATE';

export interface AplicacaoSaldo {
  id: string;
  banco_id: string;
  banco_nome: string;
  nome: string;
  tipo: TipoAplicacao;
  data_aplicacao: string;
  ativo: boolean;
  observacoes: string;
  aportes: number;
  rendimentos: number;
  resgates: number;
  disponivel: number;
  movimentos: number;
}

export interface AplicacaoMovimento {
  id: string;
  aplicacao_id: string;
  tipo: TipoMovimentoAplicacao;
  valor: number;
  data: string;
  percentual: number | null;
  observacoes: string;
  lancamento_id: string | null;
  created_by: string | null;
  created_at: string;
}
