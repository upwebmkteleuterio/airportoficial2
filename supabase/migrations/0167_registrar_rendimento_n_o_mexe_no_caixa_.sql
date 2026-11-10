CREATE OR REPLACE FUNCTION public.fn_registrar_rendimento(p_aplicacao_id text, p_valor numeric, p_percentual numeric, p_data date, p_observacoes text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_app public.aplicacoes%ROWTYPE;
  v_movimento_id text;
  v_operador text;
BEGIN
  IF NOT public.can_manage_financeiro() THEN
    RAISE EXCEPTION 'Sem permissão para registrar rendimentos.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_app FROM public.aplicacoes WHERE id = p_aplicacao_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Aplicação não encontrada.' USING ERRCODE = 'P0002';
  END IF;

  IF p_valor IS NULL OR p_valor <= 0 THEN
    RAISE EXCEPTION 'Informe um rendimento maior que zero.' USING ERRCODE = '22023';
  END IF;

  IF p_data IS NULL THEN
    RAISE EXCEPTION 'Informe a data do rendimento.' USING ERRCODE = '22023';
  END IF;

  IF p_percentual IS NOT NULL AND p_percentual < 0 THEN
    RAISE EXCEPTION 'O percentual do rendimento não pode ser negativo.' USING ERRCODE = '22023';
  END IF;

  v_operador := public.current_user_legacy_id();
  v_movimento_id := 'movimento-' || gen_random_uuid()::text;

  INSERT INTO public.aplicacao_movimentos (id, aplicacao_id, tipo, valor, data, percentual, observacoes, created_by)
  VALUES (v_movimento_id, v_app.id, 'RENDIMENTO', p_valor, p_data, p_percentual, COALESCE(p_observacoes, ''), v_operador);

  RETURN v_movimento_id;
END;
$function$