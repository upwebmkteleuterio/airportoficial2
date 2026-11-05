CREATE OR REPLACE FUNCTION public.fn_cancelar_programacao_saida(p_id text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_removidas integer := 0;
  v_frequencia text;
BEGIN
  IF NOT public.can_manage_financeiro() THEN
    RAISE EXCEPTION 'Sem permissão para cancelar a despesa.' USING ERRCODE = '42501';
  END IF;

  SELECT frequencia INTO v_frequencia FROM public.programacoes_saidas WHERE id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'A despesa informada não existe.' USING ERRCODE = '22023';
  END IF;

  IF v_frequencia = 'MENSAL_CONTINUA' THEN
    RAISE EXCEPTION 'Despesas contínuas são desativadas, não canceladas.' USING ERRCODE = '22023';
  END IF;

  -- Cancelar encerra a despesa e remove apenas as parcelas ainda não pagas.
  DELETE FROM public.lancamentos_financeiros
   WHERE programacao_id = p_id
     AND status = 'PREVISTO';
  GET DIAGNOSTICS v_removidas = ROW_COUNT;

  UPDATE public.programacoes_saidas
     SET cancelada = true, ativa = false, updated_at = now()
   WHERE id = p_id;

  RETURN v_removidas;
END;
$function$