CREATE OR REPLACE FUNCTION public.fn_resgatar_aplicacao(p_aplicacao_id text, p_valor numeric, p_data date, p_observacoes text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_app public.aplicacoes%ROWTYPE;
  v_cat text;
  v_lancamento_id text;
  v_movimento_id text;
  v_disponivel numeric;
  v_operador text;
BEGIN
  IF NOT public.can_manage_financeiro() THEN
    RAISE EXCEPTION 'Sem permissão para resgatar investimentos.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_app FROM public.aplicacoes WHERE id = p_aplicacao_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Aplicação não encontrada.' USING ERRCODE = 'P0002';
  END IF;

  IF p_valor IS NULL OR p_valor <= 0 THEN
    RAISE EXCEPTION 'Informe um valor de resgate maior que zero.' USING ERRCODE = '22023';
  END IF;

  IF p_data IS NULL THEN
    RAISE EXCEPTION 'Informe a data do resgate.' USING ERRCODE = '22023';
  END IF;

  SELECT
    COALESCE(SUM(valor) FILTER (WHERE tipo IN ('APORTE', 'RENDIMENTO')), 0)
    - COALESCE(SUM(valor) FILTER (WHERE tipo = 'RESGATE'), 0)
  INTO v_disponivel
  FROM public.aplicacao_movimentos
  WHERE aplicacao_id = v_app.id;

  IF p_valor > v_disponivel THEN
    RAISE EXCEPTION 'O resgate não pode ser maior que o valor disponível na aplicação (R$ %).', to_char(v_disponivel, 'FM999999990.00') USING ERRCODE = '22023';
  END IF;

  SELECT id INTO v_cat FROM public.categorias_financeiras WHERE id = 'cat-ent-resgate-aplicacao';
  IF v_cat IS NULL THEN
    RAISE EXCEPTION 'A categoria interna de resgate não está configurada.' USING ERRCODE = 'P0002';
  END IF;

  v_operador := public.current_user_legacy_id();
  v_lancamento_id := 'lancamento-' || gen_random_uuid()::text;
  v_movimento_id := 'movimento-' || gen_random_uuid()::text;

  INSERT INTO public.lancamentos_financeiros (
    id, tipo, status, valor, data_competencia, data_efetivacao, categoria_id, banco_id,
    descricao, observacoes, created_by
  ) VALUES (
    v_lancamento_id, 'ENTRADA', 'EFETIVADO', p_valor, p_data, p_data, v_cat, v_app.banco_id,
    'Resgate de aplicação — ' || v_app.nome, COALESCE(p_observacoes, ''), v_operador
  );

  INSERT INTO public.aplicacao_movimentos (id, aplicacao_id, tipo, valor, data, observacoes, lancamento_id, created_by)
  VALUES (v_movimento_id, v_app.id, 'RESGATE', p_valor, p_data, COALESCE(p_observacoes, ''), v_lancamento_id, v_operador);

  RETURN v_movimento_id;
END;
$function$