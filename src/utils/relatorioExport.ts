import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import type { AbaRelatorio, DadosRelatorioExportacao } from '../types/relatorios';
import {
  formatarDataBr,
  formatarMesBr,
  margemPercentual,
  money,
  nomeArquivoRelatorio,
  rotuloAgrupamento,
  rotuloAba,
  rotuloRegime,
} from './relatorioFormat';

type LinhaPlanilha = (string | number)[];

interface ColunaPlanilha {
  titulo: string;
  moeda?: boolean;
}

function periodoLegivel(dados: DadosRelatorioExportacao): string {
  return `${formatarDataBr(dados.filtros.dateFrom)} a ${formatarDataBr(dados.filtros.dateTo)}`;
}

function contextoLegivel(dados: DadosRelatorioExportacao): string {
  return `${periodoLegivel(dados)} · Regime: ${rotuloRegime(dados.filtros.regime)} · Conta: ${dados.bancoNome}`;
}

function montarAba(cabecalho: string[][], colunas: ColunaPlanilha[], linhas: LinhaPlanilha[]) {
  const aba = XLSX.utils.aoa_to_sheet([...cabecalho, [], colunas.map((coluna) => coluna.titulo), ...linhas]);
  const inicioDados = cabecalho.length + 2;
  colunas.forEach((coluna, indice) => {
    if (!coluna.moeda) return;
    const letra = XLSX.utils.encode_col(indice);
    for (let linha = inicioDados; linha < inicioDados + linhas.length; linha += 1) {
      const celula = aba[`${letra}${linha + 1}`];
      if (celula && typeof celula.v === 'number') celula.z = 'R$ #,##0.00';
    }
  });
  aba['!cols'] = colunas.map((coluna) => ({ wch: coluna.moeda ? 18 : 26 }));
  return aba;
}

function linhasResumo(dados: DadosRelatorioExportacao): LinhaPlanilha[] {
  const { resumo } = dados;
  return [
    ['Receitas do período', resumo.receitas],
    ['Despesas do período', resumo.despesas],
    ['Resultado do período', resumo.resultado],
    ['Receitas do período anterior', resumo.receitasAnterior],
    ['Despesas do período anterior', resumo.despesasAnterior],
    ['Resultado do período anterior', resumo.resultadoAnterior],
    ['Entradas de caixa (todas as categorias)', resumo.entradasCaixa],
    ['Saídas de caixa (todas as categorias)', resumo.saidasCaixa],
    ['Saldo das contas no início do período', resumo.saldoInicialPeriodo],
    ['Saldo das contas no fim do período', resumo.saldoFinalPeriodo],
    ['Saldo atual das contas', resumo.saldoContas],
    ['A receber (em aberto)', resumo.aReceber],
    ['A receber em atraso', resumo.aReceberAtrasado],
    ['A pagar (em aberto)', resumo.aPagar],
    ['A pagar em atraso', resumo.aPagarAtrasado],
    ['Investimentos disponíveis', resumo.investimentos],
    ['Lucro distribuído no período (fora do resultado)', resumo.lucroDistribuido],
  ];
}

function linhasDre(dados: DadosRelatorioExportacao): LinhaPlanilha[] {
  const linhas: LinhaPlanilha[] = dados.dre.map((linha) => [
    linha.grupoNome,
    linha.receitas,
    linha.despesas,
    linha.resultado,
    margemPercentual(linha.resultado, linha.receitas) ?? 0,
    linha.movimentos,
  ]);
  const total = dados.dre.reduce(
    (acumulado, linha) => ({
      receitas: acumulado.receitas + linha.receitas,
      despesas: acumulado.despesas + linha.despesas,
      resultado: acumulado.resultado + linha.resultado,
      movimentos: acumulado.movimentos + linha.movimentos,
    }),
    { receitas: 0, despesas: 0, resultado: 0, movimentos: 0 },
  );
  linhas.push([
    'Total',
    total.receitas,
    total.despesas,
    total.resultado,
    margemPercentual(total.resultado, total.receitas) ?? 0,
    total.movimentos,
  ]);
  return linhas;
}

function linhasFluxo(dados: DadosRelatorioExportacao): LinhaPlanilha[] {
  return dados.fluxo.map((linha) => [
    formatarMesBr(linha.mes),
    linha.saldoInicial,
    linha.entradas,
    linha.saidas,
    linha.resultado,
    linha.saldoFinal,
    linha.movimentos,
  ]);
}

function linhasProjecao(dados: DadosRelatorioExportacao): LinhaPlanilha[] {
  return dados.projecao.map((linha) => [
    formatarMesBr(linha.mes),
    linha.aReceber,
    linha.aPagar,
    linha.resultado,
    linha.saldoFinal,
  ]);
}

function linhasLancamentos(dados: DadosRelatorioExportacao): LinhaPlanilha[] {
  return dados.lancamentos.map((lancamento) => [
    formatarDataBr(lancamento.data_efetivacao),
    lancamento.descricao,
    lancamento.categoria?.nome ?? '—',
    lancamento.banco?.nome ?? '—',
    lancamento.participante_nome ?? '—',
    lancamento.tipo === 'ENTRADA' ? 'Entrada' : 'Saída',
    lancamento.tipo === 'ENTRADA' ? lancamento.valor : -lancamento.valor,
    lancamento.forma_pagamento ?? '—',
    lancamento.numero_documento ?? '—',
  ]);
}

const COLUNAS_DRE: ColunaPlanilha[] = [
  { titulo: `Grupo (${rotuloAgrupamento('CATEGORIA')} por padrão)` },
  { titulo: 'Receitas', moeda: true },
  { titulo: 'Despesas', moeda: true },
  { titulo: 'Resultado', moeda: true },
  { titulo: 'Margem %' },
  { titulo: 'Movimentos' },
];

/** Planilha completa do relatório, com uma aba por visão e a aba analítica da contabilidade. */
export function exportarRelatorioExcel(dados: DadosRelatorioExportacao): void {
  const workbook = XLSX.utils.book_new();
  const cabecalho = [
    ['Relatório gerencial'],
    [contextoLegivel(dados)],
  ];

  XLSX.utils.book_append_sheet(
    workbook,
    montarAba(cabecalho, [{ titulo: 'Indicador' }, { titulo: 'Valor', moeda: true }], linhasResumo(dados)),
    'Resumo',
  );
  XLSX.utils.book_append_sheet(
    workbook,
    montarAba(
      [...cabecalho, [`Agrupado por: ${rotuloAgrupamento(dados.filtros.agruparPor)}`]],
      COLUNAS_DRE,
      linhasDre(dados),
    ),
    'DRE',
  );
  XLSX.utils.book_append_sheet(
    workbook,
    montarAba(
      cabecalho,
      [
        { titulo: 'Mês' },
        { titulo: 'Saldo inicial', moeda: true },
        { titulo: 'Entradas', moeda: true },
        { titulo: 'Saídas', moeda: true },
        { titulo: 'Resultado', moeda: true },
        { titulo: 'Saldo final', moeda: true },
        { titulo: 'Movimentos' },
      ],
      linhasFluxo(dados),
    ),
    'Fluxo de caixa',
  );
  XLSX.utils.book_append_sheet(
    workbook,
    montarAba(
      [...cabecalho, [`Horizonte: ${dados.filtros.mesesProjecao} meses`]],
      [
        { titulo: 'Mês' },
        { titulo: 'A receber', moeda: true },
        { titulo: 'A pagar', moeda: true },
        { titulo: 'Resultado', moeda: true },
        { titulo: 'Saldo projetado', moeda: true },
      ],
      linhasProjecao(dados),
    ),
    'Projeção',
  );
  XLSX.utils.book_append_sheet(
    workbook,
    montarAba(
      [...cabecalho, [`${dados.lancamentos.length} lançamento(s) efetivado(s) no período`]],
      [
        { titulo: 'Data' },
        { titulo: 'Descrição' },
        { titulo: 'Categoria' },
        { titulo: 'Conta' },
        { titulo: 'Participante' },
        { titulo: 'Tipo' },
        { titulo: 'Valor', moeda: true },
        { titulo: 'Forma de pagamento' },
        { titulo: 'Documento' },
      ],
      linhasLancamentos(dados),
    ),
    'Lançamentos',
  );

  XLSX.writeFile(workbook, nomeArquivoRelatorio('relatorio-gerencial', dados.filtros.dateFrom, dados.filtros.dateTo, 'xlsx'));
}

interface ColunaPdf {
  titulo: string;
  largura: number;
  alinhamento?: 'left' | 'right';
}

const MARGEM = 12;
const LARGURA_PAGINA = 210;
const ALTURA_PAGINA = 297;

function desenharTabela(
  pdf: jsPDF,
  titulo: string,
  colunas: ColunaPdf[],
  linhas: string[][],
  y: number,
): number {
  let posicao = y;
  const desenharCabecalho = () => {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(60, 72, 88);
    let x = MARGEM;
    colunas.forEach((coluna) => {
      const texto = coluna.alinhamento === 'right' ? coluna.titulo : coluna.titulo;
      pdf.text(texto, coluna.alinhamento === 'right' ? x + coluna.largura - 2 : x, posicao, {
        align: coluna.alinhamento === 'right' ? 'right' : 'left',
      });
      x += coluna.largura;
    });
    pdf.setDrawColor(200, 208, 218);
    pdf.line(MARGEM, posicao + 1.5, LARGURA_PAGINA - MARGEM, posicao + 1.5);
    posicao += 5;
  };

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(15, 23, 42);
  pdf.text(titulo, MARGEM, posicao);
  posicao += 5;
  desenharCabecalho();

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  linhas.forEach((linha) => {
    if (posicao > ALTURA_PAGINA - 20) {
      pdf.addPage();
      posicao = 20;
      desenharCabecalho();
    }
    let x = MARGEM;
    linha.forEach((valor, indice) => {
      const coluna = colunas[indice];
      if (!coluna) return;
      pdf.setTextColor(30, 41, 59);
      pdf.text(valor, coluna.alinhamento === 'right' ? x + coluna.largura - 2 : x, posicao, {
        align: coluna.alinhamento === 'right' ? 'right' : 'left',
        maxWidth: coluna.largura - 2,
      });
      x += coluna.largura;
    });
    posicao += 4.6;
  });

  return posicao + 6;
}

function linhasTabelaPdf(dados: DadosRelatorioExportacao, aba: AbaRelatorio): { colunas: ColunaPdf[]; linhas: string[][] } {
  if (aba === 'FLUXO') {
    return {
      colunas: [
        { titulo: 'Mês', largura: 26 },
        { titulo: 'Saldo inicial', largura: 32, alinhamento: 'right' },
        { titulo: 'Entradas', largura: 32, alinhamento: 'right' },
        { titulo: 'Saídas', largura: 32, alinhamento: 'right' },
        { titulo: 'Resultado', largura: 32, alinhamento: 'right' },
        { titulo: 'Saldo final', largura: 32, alinhamento: 'right' },
      ],
      linhas: dados.fluxo.map((linha) => [
        formatarMesBr(linha.mes),
        money.format(linha.saldoInicial),
        money.format(linha.entradas),
        money.format(linha.saidas),
        money.format(linha.resultado),
        money.format(linha.saldoFinal),
      ]),
    };
  }

  if (aba === 'PROJECAO') {
    return {
      colunas: [
        { titulo: 'Mês', largura: 36 },
        { titulo: 'A receber', largura: 36, alinhamento: 'right' },
        { titulo: 'A pagar', largura: 36, alinhamento: 'right' },
        { titulo: 'Resultado', largura: 36, alinhamento: 'right' },
        { titulo: 'Saldo projetado', largura: 42, alinhamento: 'right' },
      ],
      linhas: dados.projecao.map((linha) => [
        formatarMesBr(linha.mes),
        money.format(linha.aReceber),
        money.format(linha.aPagar),
        money.format(linha.resultado),
        money.format(linha.saldoFinal),
      ]),
    };
  }

  return {
    colunas: [
      { titulo: `Grupo (${rotuloAgrupamento(dados.filtros.agruparPor)})`, largura: 66 },
      { titulo: 'Receitas', largura: 30, alinhamento: 'right' },
      { titulo: 'Despesas', largura: 30, alinhamento: 'right' },
      { titulo: 'Resultado', largura: 30, alinhamento: 'right' },
      { titulo: 'Margem', largura: 30, alinhamento: 'right' },
    ],
    linhas: dados.dre.map((linha) => [
      linha.grupoNome,
      money.format(linha.receitas),
      money.format(linha.despesas),
      money.format(linha.resultado),
      margemPercentual(linha.resultado, linha.receitas) === null
        ? '—'
        : `${margemPercentual(linha.resultado, linha.receitas)?.toFixed(1)}%`,
    ]),
  };
}

/** PDF de uma página (ou mais) com o resumo gerencial e a visão selecionada, para a diretoria. */
export function exportarRelatorioPdf(dados: DadosRelatorioExportacao, aba: AbaRelatorio): void {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const { resumo } = dados;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(15);
  pdf.setTextColor(15, 23, 42);
  pdf.text('Relatório gerencial', MARGEM, 20);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(100, 116, 139);
  pdf.text(contextoLegivel(dados), MARGEM, 26);
  pdf.text(`Emitido em ${formatarDataBr(new Date().toISOString().slice(0, 10))}`, MARGEM, 31);

  let y = 40;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(15, 23, 42);
  pdf.text('Resumo', MARGEM, y);
  y += 6;

  const indicadores: [string, string][] = [
    ['Receitas do período', money.format(resumo.receitas)],
    ['Despesas do período', money.format(resumo.despesas)],
    ['Resultado do período', money.format(resumo.resultado)],
    ['Resultado do período anterior', money.format(resumo.resultadoAnterior)],
    ['Saldo atual das contas', money.format(resumo.saldoContas)],
    ['Saldo no fim do período', money.format(resumo.saldoFinalPeriodo)],
    ['A receber (em aberto)', money.format(resumo.aReceber)],
    ['A receber em atraso', money.format(resumo.aReceberAtrasado)],
    ['A pagar (em aberto)', money.format(resumo.aPagar)],
    ['A pagar em atraso', money.format(resumo.aPagarAtrasado)],
    ['Investimentos disponíveis', money.format(resumo.investimentos)],
    ['Lucro distribuído no período', money.format(resumo.lucroDistribuido)],
    ['Movimentos considerados', String(resumo.movimentos)],
  ];

  pdf.setFontSize(9);
  indicadores.forEach(([rotulo, valor], indice) => {
    const coluna = indice % 2;
    const linha = Math.floor(indice / 2);
    const x = MARGEM + coluna * 93;
    const posicao = y + linha * 6;
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 116, 139);
    pdf.text(rotulo, x, posicao);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(15, 23, 42);
    pdf.text(valor, x + 60, posicao, { align: 'right' });
  });
  y += Math.ceil(indicadores.length / 2) * 6 + 4;

  const { colunas, linhas } = linhasTabelaPdf(dados, aba);
  desenharTabela(pdf, `Relatório: ${rotuloAba(aba)}`, colunas, linhas, y);

  pdf.save(nomeArquivoRelatorio(`relatorio-${rotuloAba(aba).toLowerCase().replace(/\s+/g, '-')}`, dados.filtros.dateFrom, dados.filtros.dateTo, 'pdf'));
}
