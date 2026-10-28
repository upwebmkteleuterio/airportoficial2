CREATE OR REPLACE FUNCTION public.fn_aplicar_saldo_lancamento()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND OLD.banco_id = NEW.banco_id
     AND OLD.tipo = NEW.tipo
     AND OLD.valor = NEW.valor
     AND OLD.data_efetivacao = NEW.data_efetivacao THEN
    RETURN NULL;
  END IF;

  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    PERFORM public.fn_movimentar_saldo(OLD.banco_id, OLD.data_efetivacao, OLD.tipo, -OLD.valor);
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM public.fn_movimentar_saldo(NEW.banco_id, NEW.data_efetivacao, NEW.tipo, NEW.valor);
  END IF;

  RETURN NULL;
END;
$$