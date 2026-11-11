CREATE OR REPLACE FUNCTION public.fn_atualizar_transferencia(p_transferencia_id text, p_valor numeric, p_data date, p_observacoes text DEFAULT ''::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_saldo_origem numeric;
  v_saida_atual numeric;
  v_disponivel numeric;
  v_texto text;
BEGIN
  IF NOT public.can_manage_financeiro() THEN
    RAISE EXCEPTION 'Sem permissão para alterar transferências entre contas.' USING ERRCODE = '42501';
  END IF;

  IF p_transferencia_id IS NULL OR btrim(p_transferencia_id) = '' THEN
    RAISE EXCEPTION 'Transferência inválida.' USING ERRCODE = '22023';
  END IF;

  IF p_valor IS NULL OR p_valor <= 0 THEN
    RAISE EXCEPTION 'O valor da transferência deve ser maior que zero.' USING ERRCODE = '22023';
  END IF;

  IF p_data IS NULL THEN
    RAISE EXCEPTION 'Informe a data da transferência.' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.lancamentos_financeiros WHERE transferencia_id = p_transferencia_id) THEN
    RAISE EXCEPTION 'Transferência não encontrada.' USING ERRCODE = 'P0002';
  END IF;

  -- O valor novo substitui a saída atual: o disponível é o saldo de hoje mais o
  -- que esta própria transferência já retirou da conta de origem.
  SELECT COALESCE(saldo.saldo_atual, 0), COALESCE(saida.valor, 0)
  INTO v_saldo_origem, v_saida_atual
  FROM public.lancamentos_financeiros saida
  LEFT JOIN public.saldos_contas saldo ON saldo.banco_id = saida.banco_id
  WHERE saida.transferencia_id = p_transferencia_id
    AND saida.tipo = 'SAIDA'
  LIMIT 1;

  v_disponivel := COALESCE(v_saldo_origem, 0) + COALESCE(v_saida_atual, 0);

  IF v_disponivel < p_valor THEN
    v_texto := replace(to_char(v_disponivel, 'FM9999999990D00'), '.', ',');
    RAISE EXCEPTION 'Saldo insuficiente na conta de origem: disponível R$ %.', v_texto USING ERRCODE = '22023';
  END IF;

  UPDATE public.lancamentos_financeiros
  SET valor = p_valor,
      data_competencia = p_data,
      data_efetivacao = p_data,
      observacoes = COALESCE(p_observacoes, ''),
      updated_at = now()
  WHERE transferencia_id = p_transferencia_id;
END;
$function$