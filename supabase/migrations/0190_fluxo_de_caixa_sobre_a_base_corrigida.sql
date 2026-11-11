CREATE OR REPLACE FUNCTION public.fn_relatorio_fluxo_caixa(
  p_inicio date,
  p_fim date,
  p_banco_id text DEFAULT NULL
)
RETURNS TABLE(mes date, entradas numeric, saidas numeric, resultado numeric, saldo_inicial numeric, saldo_final numeric, movimentos bigint, total_count bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_saldo_base numeric := 0;
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

  -- Saldo de abertura: saldo cadastrado das contas mais tudo que já movimentou
  -- o caixa antes do período.
  SELECT
    (SELECT COALESCE(SUM(s.saldo_inicial), 0) FROM public.saldos_contas s WHERE (p_banco_id IS NULL OR s.banco_id = p_banco_id))
      + COALESCE(SUM(CASE WHEN m.tipo = 'ENTRADA' THEN m.valor ELSE -m.valor END), 0)
  INTO v_saldo_base
  FROM public.fn_relatorio_movimentos_caixa('-infinity'::date, p_inicio - 1, p_banco_id) m;

  RETURN QUERY
  WITH meses AS (
    SELECT generate_series(date_trunc('month', p_inicio)::date, date_trunc('month', p_fim)::date, interval '1 month')::date AS mes
  ),
  mov AS (
    SELECT
      date_trunc('month', m.data_efetivacao)::date AS mes,
      COALESCE(SUM(m.valor) FILTER (WHERE m.tipo = 'ENTRADA'), 0) AS entradas,
      COALESCE(SUM(m.valor) FILTER (WHERE m.tipo = 'SAIDA'), 0) AS saidas,
      COUNT(*) AS movimentos
    FROM public.fn_relatorio_movimentos_caixa(p_inicio, p_fim, p_banco_id) m
    GROUP BY 1
  ),
  linhas AS (
    SELECT
      mes.mes,
      COALESCE(mov.entradas, 0) AS entradas,
      COALESCE(mov.saidas, 0) AS saidas,
      COALESCE(mov.movimentos, 0) AS movimentos
    FROM meses mes
    LEFT JOIN mov ON mov.mes = mes.mes
  )
  SELECT
    l.mes,
    l.entradas,
    l.saidas,
    l.entradas - l.saidas,
    v_saldo_base + COALESCE(SUM(l.entradas - l.saidas) OVER (ORDER BY l.mes ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING), 0),
    v_saldo_base + SUM(l.entradas - l.saidas) OVER (ORDER BY l.mes),
    l.movimentos,
    COUNT(*) OVER ()
  FROM linhas l
  ORDER BY l.mes;
END;
$function$