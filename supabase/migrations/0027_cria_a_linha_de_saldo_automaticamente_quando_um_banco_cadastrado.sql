CREATE OR REPLACE FUNCTION public.fn_criar_saldo_banco()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.saldos_contas (banco_id)
  VALUES (NEW.id)
  ON CONFLICT (banco_id) DO NOTHING;
  RETURN NULL;
END;
$$