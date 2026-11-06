CREATE OR REPLACE FUNCTION public.fn_atualizar_situacao_termino_da_programacao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.fn_recalcular_situacao_termino(NEW.id);
  RETURN NEW;
END;
$function$