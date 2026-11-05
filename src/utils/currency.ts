/**
 * Utilitários de moeda no padrão brasileiro.
 *
 * O valor digitado é formado por todos os dígitos do campo, em ordem,
 * ignorando vírgulas, pontos e espaços, e dividido por 100 para obter os reais.
 * O estado do formulário guarda o valor canônico com ponto decimal
 * ("1500.00"), que é o formato aceito pelos serviços e pelo banco.
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

/** Texto digitado -> valor canônico, considerando todos os dígitos como centavos. */
export function valorDaMoedaDigitada(texto: string): string {
  const digitos = texto.replace(/\D/g, '').slice(0, 12);
  const valor = Number(digitos || '0') / 100;
  return valor.toFixed(2);
}

/** Indica se o texto digitado não contém nenhum dígito diferente de zero. */
export function moedaDigitadaZerada(texto: string): boolean {
  return !/[1-9]/.test(texto.replace(/\D/g, ''));
}
