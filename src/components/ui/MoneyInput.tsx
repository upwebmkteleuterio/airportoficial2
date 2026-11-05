import { useLayoutEffect, useRef, useState, type ChangeEvent } from 'react';
import { moedaDigitadaZerada, moedaDoValor, valorDaMoedaDigitada } from '../../utils/currency';

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
 * Todos os dígitos digitados, ignorando separadores e espaços, formam os
 * centavos. Assim, os números crescem da direita para a esquerda: digitar
 * "1", "5", "0", "0" produz "15,00". Depois de cada digitação o cursor fica
 * no fim do valor exibido. Ao focar um campo vazio ou zerado, ele mostra "0,00".
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
  const [focado, setFocado] = useState(false);

  const zerado = value === '' || Number(value) === 0;
  const exibicao = zerado && !focado ? '' : moedaDoValor(value) || (focado ? '0,00' : '');

  useLayoutEffect(() => {
    const input = inputRef.current;
    const pendente = posicaoRef.current;
    if (!input || !pendente) return;
    if (input.value !== pendente.texto) return;
    input.setSelectionRange(pendente.posicao, pendente.posicao);
    posicaoRef.current = null;
  });

  const aoFocar = () => {
    if (!zerado) return;
    setFocado(true);
    posicaoRef.current = { texto: '0,00', posicao: '0,00'.length };
  };

  const aoSair = () => {
    setFocado(false);
    if (permiteVazio && (value === '' || Number(value) === 0)) onChange('');
  };

  const aoDigitar = (event: ChangeEvent<HTMLInputElement>) => {
    const texto = event.target.value;
    const proximo = valorDaMoedaDigitada(texto);
    const formatado = moedaDoValor(proximo);
    const exibicaoSeguinte = permiteVazio && moedaDigitadaZerada(texto) ? '0,00' : formatado;

    posicaoRef.current = { texto: exibicaoSeguinte, posicao: exibicaoSeguinte.length };
    if (permiteVazio && moedaDigitadaZerada(texto)) onChange('');
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
