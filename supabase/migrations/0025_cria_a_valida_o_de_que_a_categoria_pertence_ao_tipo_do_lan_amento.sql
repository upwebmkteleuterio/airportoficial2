CREATE OR REPLACE FUNCTION public.fn_validar_categoria_lancamento()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.categorias_financeiras AS categoria
    WHERE categoria.id = NEW.categoria_id
      AND categoria.tipo = NEW.tipo
  ) THEN
    RAISE EXCEPTION 'A categoria informada não pertence ao tipo %.', NEW.tipo USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$