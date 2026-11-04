import { useLayoutEffect, useRef, useState, type ChangeEvent, type FocusEvent } from 'react';
import {
  contarDigitosAntes,
  moedaDigitadaZerada,
  moedaDoValor,
  posicaoAposDigitos,
  posicaoFimDosReais,
  valorDaMoedaDigitada,
} from '../../utils/currency';

interface MoneyInputProps {
  id?: string;
  /** Valor canônico em reais ("1500.00"), como os formulários já guardam hoje. */
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  /** Permite manter o campo vazio, usado em valores opcionais ("A definir"). */
  permiteVazio?: boolean;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
  dataTestId?: string;
}

/**
 * Campo de valor no padrão de banco: sem setinhas, o usuário digita os números.
 *
 * Ao focar um campo vazio ou zerado, o valor aparece como "0,00" e o cursor fica
 * no fim da parte inteira, então os dígitos preenchem os reais da esquerda para a
 * direita (digitar 1, 5, 0, 0 produz 1.500,00). Em uma edição o cursor permanece
 * onde o usuário clicou. A vírgula (ou o ponto) apenas leva o cursor para os
 * centavos, sem virar dígito: digitar "1500,50" produz 1.500,50.
 */
export function MoneyInput({
  id,
  value,
  onChange,
  required,
  disabled,
  permiteVazio = false,
  placeholder,
  className = '',
  ariaLabel,
  dataTestId,
}: MoneyInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const posicaoRef = useRef<{ texto: string; posicao: number } | null>(null);
  const primeiraEntradaReaisRef = useRef(false);
  const [focado, setFocado] = useState(false);

  const zerado = value === '' || Number(value) === 0;
  const exibicao = moedaDoValor(value) || (focado ? '0,00' : '');

  useLayoutEffect(() => {
    const input = inputRef.current;
    const pendente = posicaoRef.current;
    if (!input || !pendente) return;
    // Só posiciona o cursor quando o campo já mostra o texto esperado; assim uma
    // renderização atrasada nunca reposiciona o cursor no meio da digitação.
    if (input.value !== pendente.texto) return;
    input.setSelectionRange(pendente.posicao, pendente.posicao);
    posicaoRef.current = null;
  });

  const aoFocar = () => {
    // O navegador aplica a posição do clique após o evento de foco, por isso a
    // primeira digitação é tratada independentemente da posição do cursor.
    if (!zerado) return;
    setFocado(true);
    primeiraEntradaReaisRef.current = true;
    posicaoRef.current = { texto: '0,00', posicao: posicaoFimDosReais('0,00') };
  };

  const aoSair = () => {
    setFocado(false);
    if (permiteVazio && (value === '' || Number(value) === 0)) onChange('');
  };

  const aoDigitar = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const texto = input.value;
    const cursor = input.selectionStart ?? texto.length;
    const inputEvent = event.nativeEvent as InputEvent;
    const separadorDigitado = /[,.]$/.test(texto) || (texto.match(/,/g) ?? []).length > 1;
    let textoParaInterpretar = texto;

    // No campo zerado, o navegador pode inserir o primeiro dígito junto a
    // "0,00" no ponto clicado (inclusive nos centavos). Trate esse dígito como
    // o início dos reais, mas preserve uma vírgula digitada explicitamente.
    if (primeiraEntradaReaisRef.current && zerado && inputEvent.inputType === 'insertText' && /^\d$/.test(inputEvent.data ?? '')) {
      textoParaInterpretar = inputEvent.data!;
    } else if (separadorDigitado) {
      primeiraEntradaReaisRef.current = false;
    }

    const proximo = valorDaMoedaDigitada(textoParaInterpretar);
    const formatado = moedaDoValor(proximo);
    const separadorExplicito = separadorDigitado && textoParaInterpretar === texto;

    // A vírgula (ou o ponto) digitada não é um dígito: serve apenas para levar o
    // cursor até os centavos, evitando que os números seguintes entrem nos reais.
    if (separadorExplicito) {
      const inicioDosCentavos = Math.min(formatado.length, posicaoFimDosReais(formatado) + 1);
      posicaoRef.current = { texto: formatado, posicao: inicioDosCentavos };
    } else if (textoParaInterpretar !== texto) {
      posicaoRef.current = { texto: formatado, posicao: posicaoFimDosReais(formatado) };
    } else {
      const estavaNosReais = cursor <= posicaoFimDosReais(texto);
      const digitosAntes = contarDigitosAntes(texto, cursor);
      posicaoRef.current = estavaNosReais
        ? { texto: formatado, posicao: posicaoFimDosReais(formatado) }
        : { texto: formatado, posicao: posicaoAposDigitos(formatado, digitosAntes) };
    }

    if (Number(proximo) !== 0) primeiraEntradaReaisRef.current = false;
    if (permiteVazio && moedaDigitadaZerada(textoParaInterpretar)) onChange('');
    else onChange(proximo);
  };

  return (
    <input
      ref={inputRef}
      id={id}
      data-testid={dataTestId}
      aria-label={ariaLabel}
      className={className}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      required={required}
      disabled={disabled}
      placeholder={placeholder}
      value={exibicao}
      onFocus={aoFocar}
      onBlur={aoSair}
      onChange={aoDigitar}
    />
  );
}

export default MoneyInput;
