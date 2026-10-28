CREATE OR REPLACE FUNCTION public.recalcular_saldo_conta(p_banco_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NOT public.can_manage_financeiro() THEN
    RAISE EXCEPTION 'Sem permissão para recalcular saldos financeiros.' USING ERRCODE = '42501';
  END IF;

  UPDATE public.saldos_contas AS saldo
  SET total_entradas = COALESCE(agg.entradas, 0),
      total_saidas = COALESCE(agg.saidas, 0),
      updated_at = now()
  FROM (
    SELECT
      SUM(valor) FILTER (WHERE tipo = 'ENTRADA') AS entradas,
      SUM(valor) FILTER (WHERE tipo = 'SAIDA') AS saidas
    FROM public.lancamentos_financeiros
    WHERE banco_id = p_banco_id
  ) AS agg
  WHERE saldo.banco_id = p_banco_id;

  DELETE FROM public.resumo_financeiro_mensal WHERE banco_id = p_banco_id;

  INSERT INTO public.resumo_financeiro_mensal (banco_id, ano, mes, total_entradas, total_saidas)
  SELECT
    p_banco_id,
    EXTRACT(YEAR FROM data_efetivacao)::integer,
    EXTRACT(MONTH FROM data_efetivacao)::integer,
    COALESCE(SUM(valor) FILTER (WHERE tipo = 'ENTRADA'), 0),
    COALESCE(SUM(valor) FILTER (WHERE tipo = 'SAIDA'), 0)
  FROM public.lancamentos_financeiros
  WHERE banco_id = p_banco_id
  GROUP BY EXTRACT(YEAR FROM data_efetivacao)::integer, EXTRACT(MONTH FROM data_efetivacao)::integer;
END;
$$