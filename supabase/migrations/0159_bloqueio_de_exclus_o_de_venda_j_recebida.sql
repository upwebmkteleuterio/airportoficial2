CREATE OR REPLACE FUNCTION public.fn_bloquear_exclusao_venda_com_recebimento()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.lancamentos_financeiros
    WHERE venda_id = OLD.id AND status = 'EFETIVADO'
  ) THEN
    RAISE EXCEPTION 'Esta venda já tem recebimento efetivado. Use cancelar ou estornar em vez de excluir.' USING ERRCODE = '22023';
  END IF;
  RETURN OLD;
END;
$function$