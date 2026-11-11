CREATE OR REPLACE FUNCTION public.fn_relatorio_resumo(
  p_inicio date,
  p_fim date,
  p_regime text DEFAULT 'COMPETENCIA',
  p_banco_id text DEFAULT NULL
)
RETURNS TABLE(receitas numeric, despesas numeric, resultado numeric, receitas_anterior numeric, despesas_anterior numeric, resultado_anterior numeric, entradas_caixa numeric, saidas_caixa numeric, saldo_inicial_periodo numeric, saldo_final_periodo numeric, saldo_contas numeric, a_receber numeric, a_pagar numeric, a_receber_atrasado numeric, a_pagar_atrasado numeric, investimentos numeric, movimentos bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_regime text := CASE WHEN upper(COALESCE(p_regime, '')) = 'CAIXA' THEN 'CAIXA' ELSE 'COMPETENCIA' END;
  v_receitas numeric := 0;
  v_despesas numeric := 0;
  v_movimentos bigint := 0;
  v_receitas_anterior numeric := 0;
  v_despesas_anterior numeric := 0;
  v_entradas_caixa numeric := 0;
  v_saidas_caixa numeric := 0;
  v_saldo_inicial numeric := 0;
  v_a_receber numeric := 0;
  v_a_pagar numeric := 0;
  v_a_receber_atrasado numeric := 0;
  v_a_pagar_atrasado numeric := 0;
  v_investimentos numeric := 0;
  v_saldo_contas numeric := 0;
  v_anterior_inicio date;
  v_anterior_fim date;
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

  v_anterior_fim := p_inicio - 1;
  v_anterior_inicio := p_inicio - (p_fim - p_inicio + 1);

  -- Resultado do período: mesma base do DRE, sem transferências, aplicações,
  -- estornos e saque de lucro, com os estornos abatidos na categoria original.
  SELECT
    COALESCE(SUM(b.valor) FILTER (WHERE b.tipo = 'ENTRADA'), 0),
    COALESCE(SUM(b.valor) FILTER (WHERE b.tipo = 'SAIDA'), 0),
    COUNT(*)
  INTO v_receitas, v_despesas, v_movimentos
  FROM public.fn_relatorio_base_dre(p_inicio, p_fim, v_regime, p_banco_id) b;

  -- Mesmo cálculo para o período imediatamente anterior, de igual duração.
  SELECT
    COALESCE(SUM(b.valor) FILTER (WHERE b.tipo = 'ENTRADA'), 0),
    COALESCE(SUM(b.valor) FILTER (WHERE b.tipo = 'SAIDA'), 0)
  INTO v_receitas_anterior, v_despesas_anterior
  FROM public.fn_relatorio_base_dre(v_anterior_inicio, v_anterior_fim, v_regime, p_banco_id) b;

  -- Movimento de caixa do período: inclui transferências, investimentos,
  -- estornos e saque de lucro, exatamente como o saldo da conta.
  SELECT
    COALESCE(SUM(m.valor) FILTER (WHERE m.tipo = 'ENTRADA'), 0),
    COALESCE(SUM(m.valor) FILTER (WHERE m.tipo = 'SAIDA'), 0)
  INTO v_entradas_caixa, v_saidas_caixa
  FROM public.fn_relatorio_movimentos_caixa(p_inicio, p_fim, p_banco_id) m;

  -- Saldo do início do período: saldo inicial cadastrado mais tudo que já foi
  -- efetivado antes, incluindo os estornos que passaram pela conta.
  SELECT
    (SELECT COALESCE(SUM(s.saldo_inicial), 0) FROM public.saldos_contas s WHERE (p_banco_id IS NULL OR s.banco_id = p_banco_id))
      + COALESCE(SUM(CASE WHEN m.tipo = 'ENTRADA' THEN m.valor ELSE -m.valor END), 0)
  INTO v_saldo_inicial
  FROM public.fn_relatorio_movimentos_caixa('-infinity'::date, p_inicio - 1, p_banco_id) m;

  SELECT COALESCE(SUM(s.saldo_atual), 0)
  INTO v_saldo_contas
  FROM public.saldos_contas s
  WHERE (p_banco_id IS NULL OR s.banco_id = p_banco_id);

  -- Títulos em aberto (previstos), separando os já vencidos.
  SELECT
    COALESCE(SUM(l.valor) FILTER (WHERE l.tipo = 'ENTRADA'), 0),
    COALESCE(SUM(l.valor) FILTER (WHERE l.tipo = 'SAIDA'), 0),
    COALESCE(SUM(l.valor) FILTER (WHERE l.tipo = 'ENTRADA' AND l.data_competencia < CURRENT_DATE), 0),
    COALESCE(SUM(l.valor) FILTER (WHERE l.tipo = 'SAIDA' AND l.data_competencia < CURRENT_DATE), 0)
  INTO v_a_receber, v_a_pagar, v_a_receber_atrasado, v_a_pagar_atrasado
  FROM public.lancamentos_financeiros l
  WHERE l.status = 'PREVISTO'
    AND l.estornado = false
    AND (p_banco_id IS NULL OR l.banco_id = p_banco_id);

  SELECT
    COALESCE(SUM(m.valor) FILTER (WHERE m.tipo IN ('APORTE', 'RENDIMENTO')), 0)
      - COALESCE(SUM(m.valor) FILTER (WHERE m.tipo = 'RESGATE'), 0)
  INTO v_investimentos
  FROM public.aplicacoes a
  LEFT JOIN public.aplicacao_movimentos m ON m.aplicacao_id = a.id
  WHERE (p_banco_id IS NULL OR a.banco_id = p_banco_id);

  RETURN QUERY SELECT
    v_receitas,
    v_despesas,
    v_receitas - v_despesas,
    v_receitas_anterior,
    v_despesas_anterior,
    v_receitas_anterior - v_despesas_anterior,
    v_entradas_caixa,
    v_saidas_caixa,
    v_saldo_inicial,
    v_saldo_inicial + v_entradas_caixa - v_saidas_caixa,
    v_saldo_contas,
    v_a_receber,
    v_a_pagar,
    v_a_receber_atrasado,
    v_a_pagar_atrasado,
    v_investimentos,
    v_movimentos;
END;
$function$