import type { LinhaProjecao } from '../types/relatorios';

export function resumirProjecao(linhas: LinhaProjecao[]) {
  if (linhas.length === 0) {
    return {
      mesInicial: null,
      mesFinal: null,
      saldoInicial: 0,
      saldoFinal: 0,
      menorSaldo: 0,
      menorSaldoMes: null,
      resultadoTotal: 0,
      totalReceber: 0,
      totalPagar: 0,
      mesesComResultadoNegativo: 0,
      meses: 0,
    };
  }

  const ordenadas = [...linhas].sort((a, b) => a.mes.localeCompare(b.mes));
  const primeira = ordenadas[0];
  const ultima = ordenadas[ordenadas.length - 1];
  let menorSaldo = primeira.saldoFinal;
  let menorSaldoMes = primeira.mes;

  for (const linha of ordenadas.slice(1)) {
    if (linha.saldoFinal < menorSaldo) {
      menorSaldo = linha.saldoFinal;
      menorSaldoMes = linha.mes;
    }
  }

  return {
    mesInicial: primeira.mes,
    mesFinal: ultima.mes,
    saldoInicial: primeira.saldoInicial,
    saldoFinal: ultima.saldoFinal,
    menorSaldo,
    menorSaldoMes,
    resultadoTotal: ordenadas.reduce((total, linha) => total + linha.resultado, 0),
    totalReceber: ordenadas.reduce((total, linha) => total + linha.aReceber, 0),
    totalPagar: ordenadas.reduce((total, linha) => total + linha.aPagar, 0),
    mesesComResultadoNegativo: ordenadas.filter((linha) => linha.resultado < 0).length,
    meses: ordenadas.length,
  };
}
