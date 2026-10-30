CREATE OR REPLACE FUNCTION public.fn_excluir_transferencia(p_transferencia_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.can_manage_financeiro() THEN
    RAISE EXCEPTION 'Sem permissão para excluir transferências entre contas.' USING ERRCODE = '42501';
  END IF;

  IF p_transferencia_id IS NULL OR btrim(p_transferencia_id) = '' THEN
    RAISE EXCEPTION 'Transferência inválida.' USING ERRCODE = '22023';
  END IF;

  DELETE FROM public.lancamentos_financeiros WHERE transferencia_id = p_transferencia_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transferência não encontrada.' USING ERRCODE = 'P0002';
  END IF;
END;
$function$;