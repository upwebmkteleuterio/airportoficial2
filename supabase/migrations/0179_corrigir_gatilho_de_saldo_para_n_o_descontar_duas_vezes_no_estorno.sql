CREATE OR REPLACE FUNCTION public.fn_aplicar_saldo_lancamento()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Somente lançamentos EFETIVADOS movimentam saldo. Os PREVISTOS (previsões de
  -- recebimento e contas a pagar) só afetam o saldo quando são efetivados.
  --
  -- Lançamentos estornados também não movimentam mais o saldo: o dinheiro deles já
  -- foi revertido pela contrapartida do estorno. Por isso, quando a própria
  -- atualização marca o lançamento como estornado (e o cancela), o valor NÃO é
  -- descontado de novo — senão o estorno tiraria o dinheiro duas vezes da conta.
  IF TG_OP = 'UPDATE'
     AND OLD.status = NEW.status
     AND OLD.banco_id = NEW.banco_id
     AND OLD.tipo = NEW.tipo
     AND OLD.valor = NEW.valor
     AND OLD.data_efetivacao = NEW.data_efetivacao
     AND OLD.estornado = NEW.estornado THEN
    RETURN NULL;
  END IF;

  IF TG_OP IN ('UPDATE', 'DELETE')
     AND OLD.status = 'EFETIVADO'
     AND OLD.estornado = false
     AND COALESCE(NEW.estornado, false) = false THEN
    PERFORM public.fn_movimentar_saldo(OLD.banco_id, OLD.data_efetivacao, OLD.tipo, -OLD.valor);
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE')
     AND NEW.status = 'EFETIVADO'
     AND NEW.estornado = false THEN
    PERFORM public.fn_movimentar_saldo(NEW.banco_id, NEW.data_efetivacao, NEW.tipo, NEW.valor);
  END IF;

  RETURN NULL;
END;
$function$