CREATE OR REPLACE FUNCTION public.fn_proteger_categoria_sistema()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'DELETE' AND OLD.sistema THEN
    RAISE EXCEPTION 'Categorias de sistema não podem ser excluídas.' USING ERRCODE = '23514';
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.sistema AND (
    NEW.sistema IS DISTINCT FROM OLD.sistema
    OR NEW.nome IS DISTINCT FROM OLD.nome
    OR NEW.tipo IS DISTINCT FROM OLD.tipo
    OR NEW.ativo IS DISTINCT FROM OLD.ativo
  ) THEN
    RAISE EXCEPTION 'Categorias de sistema são mantidas pelo sistema e não podem ser alteradas.' USING ERRCODE = '23514';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;