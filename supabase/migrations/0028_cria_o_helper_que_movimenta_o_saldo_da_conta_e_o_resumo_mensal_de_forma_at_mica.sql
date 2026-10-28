CREATE OR REPLACE FUNCTION public.fn_movimentar_saldo(
  p_banco_id text,
  p_data date,
  p_tipo text,
  p_delta numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_ano integer;
  v_mes integer;
  v_entradas numeric(14,2);
  v_saidas numeric(14,2);
BEGIN
  IF p_banco_id IS NULL OR p_data IS NULL OR p_delta IS NULL OR p_delta = 0 THEN
    RETURN;
  END IF;

  v_ano := EXTRACT(YEAR FROM p_data)::integer;
  v_mes := EXTRACT(MONTH FROM p_data)::integer;
  v_entradas := CASE WHEN p_tipo = 'ENTRADA' THEN p_delta ELSE 0 END;
  v_saidas := CASE WHEN p_tipo = 'SAIDA' THEN p_delta ELSE 0 END;

  INSERT INTO public.saldos_contas (banco_id, total_entradas, total_saidas, updated_at)
  VALUES (p_banco_id, v_entradas, v_saidas, now())
  ON CONFLICT (banco_id) DO UPDATE
    SET total_entradas = public.saldos_contas.total_entradas + EXCLUDED.total_entradas,
        total_saidas = public.saldos_contas.total_saidas + EXCLUDED.total_saidas,
        updated_at = now();

  INSERT INTO public.resumo_financeiro_mensal (banco_id, ano, mes, total_entradas, total_saidas, updated_at)
  VALUES (p_banco_id, v_ano, v_mes, v_entradas, v_saidas, now())
  ON CONFLICT (banco_id, ano, mes) DO UPDATE
    SET total_entradas = public.resumo_financeiro_mensal.total_entradas + EXCLUDED.total_entradas,
        total_saidas = public.resumo_financeiro_mensal.total_saidas + EXCLUDED.total_saidas,
        updated_at = now();
END;
$$