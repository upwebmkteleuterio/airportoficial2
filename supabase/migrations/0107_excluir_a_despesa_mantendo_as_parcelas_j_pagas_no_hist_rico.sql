CREATE OR REPLACE FUNCTION public.fn_excluir_programacao_saida(p_id text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_removidas integer := 0;
BEGIN
  IF NOT public.can_manage_financeiro() THEN
    RAISE EXCEPTION 'Sem permissão para excluir a despesa.' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.programacoes_saidas WHERE id = p_id) THEN
    RAISE EXCEPTION 'A despesa informada não existe.' USING ERRCODE = '22023';
  END IF;

  -- Excluir apaga a despesa e as parcelas em aberto. As parcelas já pagas
  -- continuam no histórico: elas apenas se desligam da despesa.
  DELETE FROM public.lancamentos_financeiros
   WHERE programacao_id = p_id
     AND status = 'PREVISTO';
  GET DIAGNOSTICS v_removidas = ROW_COUNT;

  UPDATE public.lancamentos_financeiros
     SET programacao_id = NULL
   WHERE programacao_id = p_id;

  DELETE FROM public.programacoes_saidas WHERE id = p_id;

  RETURN v_removidas;
END;
$function$