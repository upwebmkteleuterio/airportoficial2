import type { VisaoDespesas } from '../services/programacaoSaidaService';
import type { TipoFrequenciaProgramacao } from '../types/financeiro';

export function visaoDaFrequencia(frequencia: TipoFrequenciaProgramacao): VisaoDespesas {
  // Apenas a frequência mensal contínua aparece na aba de despesas contínuas.
  return frequencia === 'MENSAL_CONTINUA' ? 'continuas' : 'termino';
}

export function rotuloDaVisao(visao: VisaoDespesas): string {
  // O rótulo acompanha a aba em que a despesa será exibida.
  return visao === 'continuas' ? 'Despesas contínuas' : 'Despesas com término';
}
