import type { AbaRelatorio, AgrupamentoDre, RegimeRelatorio } from '../types/relatorios';

export const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export const percentual = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const regimeOpcoes: { valor: RegimeRelatorio; rotulo: string; ajuda: string }[] = [
  { valor: 'COMPETENCIA', rotulo: 'Competência (vencimento)', ajuda: 'Considera a data de vencimento do lançamento.' },
  { valor: 'CAIXA', rotulo: 'Caixa (recebido/pago)', ajuda: 'Considera o dia em que o dinheiro entrou ou saiu da conta.' },
];

export const agrupamentoOpcoes: { valor: AgrupamentoDre; rotulo: string }[] = [
  { valor: 'CATEGORIA', rotulo: 'Categoria' },
  { valor: 'CONTA', rotulo: 'Conta' },
  { valor: 'TURMA', rotulo: 'Turma (centro de custo)' },
  { valor: 'PARTICIPANTE', rotulo: 'Participante' },
];

export const mesesProjecaoOpcoes = [3, 6, 12];

export function rotuloRegime(regime: RegimeRelatorio): string {
  return regimeOpcoes.find((opcao) => opcao.valor === regime)?.rotulo ?? regime;
}

export function rotuloAgrupamento(agrupamento: AgrupamentoDre): string {
  return agrupamentoOpcoes.find((opcao) => opcao.valor === agrupamento)?.rotulo ?? agrupamento;
}

export function rotuloAba(aba: AbaRelatorio): string {
  return aba === 'DRE' ? 'DRE' : aba === 'FLUXO' ? 'Fluxo de caixa' : 'Projeção';
}

export function formatarDataBr(data: string): string {
  const [ano, mes, dia] = data.slice(0, 10).split('-');
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : data;
}

export function formatarMesBr(mes: string): string {
  const [ano, numeroMes] = mes.slice(0, 10).split('-');
  return ano && numeroMes ? `${numeroMes}/${ano}` : mes;
}

export function formatarMesCurto(mes: string): string {
  const [ano, numeroMes, dia] = mes.slice(0, 10).split('-').map(Number);
  if (!ano || !numeroMes) return mes;
  const referencia = new Date(Date.UTC(ano, numeroMes - 1, dia || 1));
  return new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit', timeZone: 'UTC' }).format(referencia).replace('.', '');
}

export function formatarMesLongo(mes: string): string {
  const [ano, numeroMes, dia] = mes.slice(0, 10).split('-').map(Number);
  if (!ano || !numeroMes) return mes;
  const referencia = new Date(Date.UTC(ano, numeroMes - 1, dia || 1));
  const rotulo = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(referencia);
  return rotulo.charAt(0).toUpperCase() + rotulo.slice(1);
}

/** Variação percentual entre dois valores; nulo quando não há base de comparação. */
export function variacaoPercentual(atual: number, anterior: number): number | null {
  if (!anterior) return null;
  return ((atual - anterior) / Math.abs(anterior)) * 100;
}

/** Participação do resultado no total de receitas do período. */
export function margemPercentual(resultado: number, receitas: number): number | null {
  if (!receitas) return null;
  return (resultado / receitas) * 100;
}

export function nomeArquivoRelatorio(prefixo: string, dateFrom: string, dateTo: string, extensao: string): string {
  return `${prefixo}-${dateFrom}-a-${dateTo}.${extensao}`;
}
