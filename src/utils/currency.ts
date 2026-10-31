/**
 * Utilitários de moeda no padrão brasileiro.
 *
 * O valor é digitado em reais: os dígitos preenchem a parte inteira da esquerda
 * para a direita e os centavos ficam depois da vírgula ("1.500,00"). O estado do
 * formulário guarda o valor canônico com ponto decimal ("1500.00"), que é o
 * formato aceito pelos serviços e pelo banco.
 */

const formatadorMoeda = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Valor em reais -> texto exibido no campo (1500 -> "1.500,00"). */
export function formatarMoeda(valor: number): string {
  return formatadorMoeda.format(Number.isFinite(valor) ? valor : 0);
}

/** Valor canônico do estado ("1500.00", "1500" ou "") -> texto exibido. */
export function moedaDoValor(valor: string | number | null | undefined): string {
  if (valor === null || valor === undefined || valor === '') return '';
  const numero = typeof valor === 'number' ? valor : Number(valor);
  return Number.isFinite(numero) ? formatarMoeda(numero) : '';
}

/**
 * Separa o texto digitado em reais e centavos. Sem vírgula, tudo é tratado como
 * reais (digitar "1500" produz 1.500,00), que é o comportamento esperado no
 * preenchimento inicial.
 */
export function separarMoedaDigitada(texto: string): { reais: string; centavos: string } {
  let limpo = texto.replace(/[^\d.,]/g, '');
  if (limpo.includes(',')) {
    limpo = limpo.replace(/\./g, '');
  } else {
    // Sem vírgula, um ponto com uma ou duas casas no fim é lido como decimal
    // ("125.50" -> 125,50), enquanto "1.500" e "1.500.000" continuam sendo
    // separadores de milhar.
    const ultimoPonto = limpo.lastIndexOf('.');
    const casas = ultimoPonto === -1 ? 0 : limpo.slice(ultimoPonto + 1).length;
    limpo = casas === 1 || casas === 2
      ? `${limpo.slice(0, ultimoPonto).replace(/\./g, '')},${limpo.slice(ultimoPonto + 1)}`
      : limpo.replace(/\./g, '');
  }
  // A primeira vírgula separa reais e centavos. Se o texto chegar com uma
  // vírgula extra (colagem ou digitação repetida), os dígitos seguintes ainda
  // são lidos como centavos em vez de inflar o valor dos reais.
  const indiceVirgula = limpo.indexOf(',');
  const reais = (indiceVirgula === -1 ? limpo : limpo.slice(0, indiceVirgula)).replace(/\D/g, '');
  const centavos = indiceVirgula === -1
    ? ''
    : limpo.slice(indiceVirgula + 1).replace(/\D/g, '').slice(0, 2);
  return { reais, centavos };
}

/** Texto digitado -> valor canônico ("1.500,00" -> "1500.00"). */
export function valorDaMoedaDigitada(texto: string): string {
  const { reais, centavos } = separarMoedaDigitada(texto);
  const inteiro = Number(reais === '' ? '0' : reais);
  const decimal = Number(centavos === '' ? '0' : centavos.padEnd(2, '0'));
  const valor = (Number.isFinite(inteiro) ? inteiro : 0) + (Number.isFinite(decimal) ? decimal : 0) / 100;
  return valor.toFixed(2);
}

/** Quantos dígitos existem antes de uma posição do texto. */
export function contarDigitosAntes(texto: string, posicao: number): number {
  return texto.slice(0, Math.max(0, posicao)).replace(/\D/g, '').length;
}

/** Posição do cursor depois de N dígitos dentro do texto formatado. */
export function posicaoAposDigitos(texto: string, quantidade: number): number {
  if (quantidade <= 0) return 0;
  let encontrados = 0;
  for (let indice = 0; indice < texto.length; indice += 1) {
    if (/\d/.test(texto.charAt(indice))) {
      encontrados += 1;
      if (encontrados === quantidade) return indice + 1;
    }
  }
  return texto.length;
}

/** Posição do cursor logo antes da vírgula, ou seja, no fim da parte inteira. */
export function posicaoFimDosReais(texto: string): number {
  const indiceVirgula = texto.indexOf(',');
  return indiceVirgula === -1 ? texto.length : indiceVirgula;
}

/** Indica se o texto digitado não contém nenhum dígito significativo. */
export function moedaDigitadaZerada(texto: string): boolean {
  const { reais, centavos } = separarMoedaDigitada(texto);
  return reais.replace(/0/g, '') === '' && centavos.replace(/0/g, '') === '';
}
