CREATE OR REPLACE FUNCTION public.fn_proteger_tipo_categoria()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.tipo IS DISTINCT FROM OLD.tipo THEN
    RAISE EXCEPTION 'O tipo da categoria não pode ser alterado. Crie uma nova categoria.' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$