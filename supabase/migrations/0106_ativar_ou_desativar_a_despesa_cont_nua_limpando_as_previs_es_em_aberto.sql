CREATE OR REPLACE FUNCTION public.fn_definir_programacao_saida_ativa(p_id text, p_ativa boolean)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_removidas integer := 0;
BEGIN
  IF NOT public.can_manage_financeiro() THEN
    RAISE EXCEPTION 'Sem permissão para alterar a situação da despesa.' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.programacoes_saidas WHERE id = p_id) THEN
    RAISE EXCEPTION 'A despesa informada não existe.' USING ERRCODE = '22023';
  END IF;

  -- Desativar interrompe novos vencimentos e remove os que ainda não foram pagos.
  IF p_ativa = false THEN
    DELETE FROM public.lancamentos_financeiros
     WHERE programacao_id = p_id
       AND status = 'PREVISTO';
    GET DIAGNOSTICS v_removidas = ROW_COUNT;
  END IF;

  UPDATE public.programacoes_saidas
     SET ativa = p_ativa, updated_at = now()
   WHERE id = p_id;

  RETURN v_removidas;
END;
$function$