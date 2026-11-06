CREATE OR REPLACE FUNCTION public.fn_atualizar_situacao_termino_por_lancamento()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.fn_recalcular_situacao_termino(OLD.programacao_id);
    RETURN OLD;
  END IF;

  PERFORM public.fn_recalcular_situacao_termino(NEW.programacao_id);
  IF TG_OP = 'UPDATE' AND OLD.programacao_id IS DISTINCT FROM NEW.programacao_id THEN
    PERFORM public.fn_recalcular_situacao_termino(OLD.programacao_id);
  END IF;
  RETURN NEW;
END;
$function$