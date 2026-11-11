CREATE OR REPLACE FUNCTION public.fn_relatorio_movimentos_caixa(
  p_inicio date,
  p_fim date,
  p_banco_id text DEFAULT NULL
)
RETURNS TABLE (
  data_efetivacao date,
  tipo text,
  valor numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.can_manage_financeiro() THEN
    RAISE EXCEPTION 'Sem permissão para consultar os relatórios financeiros.' USING ERRCODE = '42501';
  END IF;

  IF p_inicio IS NULL OR p_fim IS NULL THEN
    RAISE EXCEPTION 'Informe o período do relatório.' USING ERRCODE = '22023';
  END IF;

  IF p_fim < p_inicio THEN
    RAISE EXCEPTION 'A data final não pode ser anterior à data inicial.' USING ERRCODE = '22023';
  END IF;

  -- Base única do caixa: todo lançamento que movimentou o saldo da conta,
  -- incluindo transferências, investimentos, estornos e saque de lucro. O
  -- lançamento estornado continua contando (o dinheiro entrou/saiu) e a
  -- contrapartida do estorno devolve o valor, como faz o saldo da conta.
  RETURN QUERY
  SELECT l.data_efetivacao, l.tipo, l.valor
  FROM public.lancamentos_financeiros l
  WHERE (
      (l.status = 'EFETIVADO' AND l.estornado = false)
      OR l.estornado = true
      OR l.estorno_de IS NOT NULL
    )
    AND l.data_efetivacao BETWEEN p_inicio AND p_fim
    AND (p_banco_id IS NULL OR l.banco_id = p_banco_id);
END;
$function$