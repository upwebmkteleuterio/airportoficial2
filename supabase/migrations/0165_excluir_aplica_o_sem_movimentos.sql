CREATE OR REPLACE FUNCTION public.fn_excluir_aplicacao(p_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.can_manage_financeiro() THEN
    RAISE EXCEPTION 'Sem permissão para excluir aplicações.' USING ERRCODE = '42501';
  END IF;

  IF p_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.aplicacoes WHERE id = p_id) THEN
    RAISE EXCEPTION 'Aplicação não encontrada.' USING ERRCODE = 'P0002';
  END IF;

  IF EXISTS (SELECT 1 FROM public.aplicacao_movimentos WHERE aplicacao_id = p_id) THEN
    RAISE EXCEPTION 'Esta aplicação já tem movimentos registrados. Desative-a em vez de excluir.' USING ERRCODE = '22023';
  END IF;

  DELETE FROM public.aplicacoes WHERE id = p_id;
END;
$function$