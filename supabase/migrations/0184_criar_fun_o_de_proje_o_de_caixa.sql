CREATE OR REPLACE FUNCTION public.fn_relatorio_projecao(
  p_meses integer DEFAULT 6,
  p_banco_id text DEFAULT NULL,
  p_inicio date DEFAULT NULL
)
RETURNS TABLE(
  mes date,
  a_receber numeric,
  a_pagar numeric,
  resultado numeric,
  saldo_inicial numeric,
  saldo_final numeric,
  total_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_inicio date;
  v_meses integer;
  v_saldo_base numeric := 0;
BEGIN
  IF NOT public.can_manage_financeiro() THEN
    RAISE EXCEPTION 'Sem permissão para consultar os relatórios financeiros.' USING ERRCODE = '42501';
  END IF;

  v_meses := LEAST(GREATEST(COALESCE(p_meses, 6), 1), 36);
  v_inicio := date_trunc('month', COALESCE(p_inicio, CURRENT_DATE))::date;

  SELECT COALESCE(SUM(s.saldo_atual), 0)
  INTO v_saldo_base
  FROM public.saldos_contas s
  WHERE (p_banco_id IS NULL OR s.banco_id = p_banco_id);

  RETURN QUERY
  WITH meses AS (
    SELECT generate_series(v_inicio, (v_inicio + ((v_meses - 1) || ' months')::interval)::date, interval '1 month')::date AS mes
  ),
  previstos AS (
    SELECT
      date_trunc('month', l.data_competencia)::date AS mes,
      COALESCE(SUM(l.valor) FILTER (WHERE l.tipo = 'ENTRADA'), 0) AS a_receber,
      COALESCE(SUM(l.valor) FILTER (WHERE l.tipo = 'SAIDA'), 0) AS a_pagar
    FROM public.lancamentos_financeiros l
    WHERE l.status = 'PREVISTO'
      AND l.estornado = false
      AND l.data_competencia >= v_inicio
      AND l.data_competencia < (v_inicio + ((v_meses) || ' months')::interval)::date
      AND (p_banco_id IS NULL OR l.banco_id = p_banco_id)
    GROUP BY 1
  ),
  recorrentes AS (
    SELECT m.mes, COALESCE(SUM(p.valor_previsto), 0) AS a_pagar
    FROM meses m
    JOIN public.programacoes_saidas p
      ON p.ativa = true
     AND p.cancelada = false
     AND p.frequencia <> 'PARCELAS_PERSONALIZADAS'
     AND m.mes >= date_trunc('month', p.data_inicio)::date
     AND (
       p.frequencia = 'MENSAL_CONTINUA'
       OR (p.frequencia = 'REPETICAO_FINITA'
           AND m.mes < (date_trunc('month', p.data_inicio)::date + ((CASE WHEN p.dia_vencimento >= EXTRACT(DAY FROM p.data_inicio) THEN 0 ELSE 1 END + COALESCE(p.repeticoes, 1)) || ' months')::interval)::date)
       OR (p.frequencia = 'AVULSA'
           AND m.mes = (date_trunc('month', p.data_inicio)::date + ((CASE WHEN p.dia_vencimento >= EXTRACT(DAY FROM p.data_inicio) THEN 0 ELSE 1 END) || ' months')::interval)::date)
     )
     AND (p_banco_id IS NULL OR p.banco_id = p_banco_id)
     AND NOT EXISTS (
       SELECT 1
       FROM public.lancamentos_financeiros l
       WHERE l.programacao_id = p.id
         AND l.data_competencia >= m.mes
         AND l.data_competencia < (m.mes + interval '1 month')::date
     )
    GROUP BY m.mes
  ),
  linhas AS (
    SELECT
      m.mes,
      COALESCE(pr.a_receber, 0) AS a_receber,
      COALESCE(pr.a_pagar, 0) + COALESCE(rec.a_pagar, 0) AS a_pagar
    FROM meses m
    LEFT JOIN previstos pr ON pr.mes = m.mes
    LEFT JOIN recorrentes rec ON rec.mes = m.mes
  )
  SELECT
    l.mes,
    l.a_receber,
    l.a_pagar,
    l.a_receber - l.a_pagar,
    v_saldo_base + COALESCE(SUM(l.a_receber - l.a_pagar) OVER (ORDER BY l.mes ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING), 0),
    v_saldo_base + SUM(l.a_receber - l.a_pagar) OVER (ORDER BY l.mes),
    COUNT(*) OVER ()
  FROM linhas l
  ORDER BY l.mes;
END;
$function$;