import type { LancamentoComRelacoes, ParcelaRecebimento, VendaComRelacoes } from '../types/financeiro';

export type ComprovanteEscopo = 'VENDA' | 'PARCELA';

export interface ComprovanteDados {
  escopo: ComprovanteEscopo;
  numero: string;
  dataEmissao: string;
  pagador: { nome: string; documento: string; tipo: string };
  descricao: string;
  valor: number;
  formaPagamento: string;
  conta: string;
  referencia: string;
  observacoes: string;
  parcelas?: { numero: number; vencimento: string; valor: number; situacao: string }[];
  situacao?: string;
}

const formaPagamentoLabels: Record<string, string> = {
  PIX: 'PIX', DINHEIRO: 'Dinheiro', BOLETO: 'Boleto', TRANSFERENCIA: 'Transferência', CARTAO: 'Cartão', CHEQUE: 'Cheque', OUTRO: 'Outro',
};
const participanteLabels: Record<string, string> = {
  ALUNO: 'Aluno', EMPRESA: 'Empresa', FORNECEDOR: 'Fornecedor', INSTRUTOR: 'Instrutor', COORDENADOR: 'Coordenador',
};
const situacaoLabels: Record<string, string> = { EFETIVADO: 'Efetivado', PREVISTO: 'Previsto', CANCELADO: 'Cancelado' };

function shortId(id: string): string { return id.slice(0, 8); }
function dataISO(value: string | null | undefined): string { return value ? value.slice(0, 10) : ''; }
function numeroDocumento(numero: string | null | undefined, referencia: string | null | undefined, id: string): string {
  return numero?.trim() || referencia?.trim() || shortId(id);
}
function situacao(value: string): string { return situacaoLabels[value] ?? value; }

export function comprovanteDeVenda(venda: VendaComRelacoes): ComprovanteDados {
  const numero = numeroDocumento(null, venda.referencia_transacao, venda.id);
  const parcelas = [...venda.parcelas]
    .sort((a, b) => a.data_competencia.localeCompare(b.data_competencia))
    .map((parcela, index) => ({ numero: index + 1, vencimento: dataISO(parcela.data_competencia), valor: Number(parcela.valor), situacao: situacao(parcela.status) }));
  return {
    escopo: 'VENDA', numero, dataEmissao: dataISO(venda.created_at),
    pagador: { nome: venda.participante_nome, documento: venda.participante_documento ?? '', tipo: participanteLabels[venda.participante_tipo] },
    descricao: `Venda ${numero} — ${venda.curso?.nome_curso ?? 'Venda'}`,
    valor: parcelas.reduce((total, parcela) => total + parcela.valor, 0),
    formaPagamento: venda.forma_pagamento ? formaPagamentoLabels[venda.forma_pagamento] : 'Não informado',
    conta: venda.conta?.nome ?? '', referencia: venda.referencia_transacao ?? '', observacoes: venda.observacoes ?? '',
    parcelas, situacao: venda.cancelada ? 'Cancelada' : venda.renegociada ? 'Renegociada' : undefined,
  };
}

export function comprovanteDeParcela(parcela: ParcelaRecebimento): ComprovanteDados {
  const numero = numeroDocumento(parcela.numero_documento, parcela.venda?.referencia_transacao, parcela.id);
  return {
    escopo: 'PARCELA', numero, dataEmissao: dataISO(parcela.data_efetivacao || parcela.data_competencia),
    pagador: { nome: parcela.participante_nome ?? '', documento: parcela.participante_documento ?? '', tipo: parcela.participante_tipo ? participanteLabels[parcela.participante_tipo] : '' },
    descricao: parcela.descricao, valor: Number(parcela.valor),
    formaPagamento: parcela.venda?.forma_pagamento ? formaPagamentoLabels[parcela.venda.forma_pagamento] : 'Não informado',
    conta: '', referencia: parcela.numero_documento ?? parcela.venda?.referencia_transacao ?? '', observacoes: parcela.observacoes ?? '',
    situacao: situacao(parcela.status),
  };
}

export function comprovanteDeLancamento(lancamento: LancamentoComRelacoes, nomeConta: string): ComprovanteDados {
  const numero = numeroDocumento(lancamento.numero_documento, lancamento.venda?.referencia_transacao, lancamento.id);
  return {
    escopo: 'PARCELA', numero, dataEmissao: dataISO(lancamento.data_efetivacao),
    pagador: { nome: lancamento.participante_nome ?? '', documento: lancamento.participante_documento ?? '', tipo: lancamento.participante_tipo ? participanteLabels[lancamento.participante_tipo] : '' },
    descricao: lancamento.descricao, valor: Number(lancamento.valor),
    formaPagamento: lancamento.forma_pagamento ? formaPagamentoLabels[lancamento.forma_pagamento] : 'Não informado',
    conta: nomeConta, referencia: lancamento.numero_documento ?? lancamento.venda?.referencia_transacao ?? '',
    observacoes: lancamento.observacoes ?? '', situacao: situacao(lancamento.status),
  };
}

export function podeEmitirNotaFiscalLancamento(l: LancamentoComRelacoes): boolean {
  return l.tipo === 'ENTRADA' && Boolean(l.venda_id) && !l.estornado && l.estorno_de === null;
}

export function podeEmitirComprovanteLancamento(l: LancamentoComRelacoes): boolean {
  return l.tipo === 'ENTRADA' && l.status === 'EFETIVADO' && !l.estornado && l.estorno_de === null
    && !l.transferencia_id && !l.categoria?.sistema && (Boolean(l.participante_nome) || Boolean(l.venda_id));
}
