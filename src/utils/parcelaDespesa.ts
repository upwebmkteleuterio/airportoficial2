import type { ProgramacaoSaida } from '../types/financeiro';

/** Índice absoluto do mês de uma data AAAA-MM-DD, para comparar meses entre anos. */
function indiceDoMes(data: string): number {
  const [ano, mes] = data.split('-').map(Number);
  return ano * 12 + (mes - 1);
}

/**
 * Número da parcela de uma despesa de repetição finita, contando a partir do mês da
 * primeira parcela: o mês da data de início ou o seguinte, quando o dia do vencimento
 * é anterior ao dia da data de início.
 */
export function numeroDaParcela(dataInicio: string, diaVencimento: number, dataCompetencia: string): number {
  const diaInicio = Number(dataInicio.split('-')[2]);
  const primeiroMes = indiceDoMes(dataInicio) + (diaVencimento >= diaInicio ? 0 : 1);
  return indiceDoMes(dataCompetencia) - primeiroMes + 1;
}

/**
 * Diz se a previsão é um valor recorrente, uma parcela única ou qual parcela é.
 * `numeroPersonalizada` é usado apenas nas despesas com parcelas personalizadas, em que
 * o número depende da ordem de vencimento das parcelas cadastradas.
 */
export function rotuloDaParcela(programacao: ProgramacaoSaida, dataCompetencia: string, numeroPersonalizada?: number): string {
  if (programacao.frequencia === 'MENSAL_CONTINUA') return 'Recorrente';
  if (programacao.frequencia === 'AVULSA') return 'Parcela única';
  const total = programacao.repeticoes ?? programacao.total_parcelas;
  if (programacao.frequencia === 'REPETICAO_FINITA' && programacao.dia_vencimento !== null) {
    const numero = numeroDaParcela(programacao.data_inicio, programacao.dia_vencimento, dataCompetencia);
    return total !== null && numero <= total ? `Parcela ${numero} de ${total}` : `Parcela ${numero}`;
  }
  if (numeroPersonalizada === undefined) return 'Parcela';
  return total !== null ? `Parcela ${numeroPersonalizada} de ${total}` : `Parcela ${numeroPersonalizada}`;
}
