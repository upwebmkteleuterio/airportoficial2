CREATE OR REPLACE FUNCTION public.fn_aplicar_aporte(p_aplicacao_id text, p_valor numeric, p_data date, p_observacoes text)
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
  v_saldo numeric;
  v_operador text;
BEGIN
  IF NOT public.can_manage_financeiro() THEN
    RAISE EXCEPTION 'Sem permissão para aplicar em investimentos.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_app FROM public.aplicacoes WHERE id = p_aplicacao_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Aplicação não encontrada.' USING ERRCODE = 'P0002';
  END IF;

  IF NOT v_app.ativo THEN
    RAISE EXCEPTION 'Esta aplicação está desativada.' USING ERRCODE = '22023';
  END IF;

  IF p_valor IS NULL OR p_valor <= 0 THEN
    RAISE EXCEPTION 'Informe um valor de aplicação maior que zero.' USING ERRCODE = '22023';
  END IF;

  IF p_data IS NULL THEN
    RAISE EXCEPTION 'Informe a data da aplicação.' USING ERRCODE = '22023';
  END IF;

  SELECT saldo_atual INTO v_saldo FROM public.saldos_contas WHERE banco_id = v_app.banco_id;
  v_saldo := COALESCE(v_saldo, 0);

  IF p_valor > v_saldo THEN
    RAISE EXCEPTION 'O valor aplicado não pode ser maior que o saldo da conta (R$ %).', to_char(v_saldo, 'FM999999990.00') USING ERRCODE = '22023';
  END IF;

  SELECT id INTO v_cat FROM public.categorias_financeiras WHERE id = 'cat-sai-aplicacao';
  IF v_cat IS NULL THEN
    RAISE EXCEPTION 'A categoria interna de aplicação não está configurada.' USING ERRCODE = 'P0002';
  END IF;

  v_operador := public.current_user_legacy_id();
  v_lancamento_id := 'lancamento-' || gen_random_uuid()::text;
  v_movimento_id := 'movimento-' || gen_random_uuid()::text;

  INSERT INTO public.lancamentos_financeiros (
    id, tipo, status, valor, data_competencia, data_efetivacao, categoria_id, banco_id,
    descricao, observacoes, created_by
  ) VALUES (
    v_lancamento_id, 'SAIDA', 'EFETIVADO', p_valor, p_data, p_data, v_cat, v_app.banco_id,
    'Aplicação — ' || v_app.nome, COALESCE(p_observacoes, ''), v_operador
  );

  INSERT INTO public.aplicacao_movimentos (id, aplicacao_id, tipo, valor, data, observacoes, lancamento_id, created_by)
  VALUES (v_movimento_id, v_app.id, 'APORTE', p_valor, p_data, COALESCE(p_observacoes, ''), v_lancamento_id, v_operador);

  RETURN v_movimento_id;
END;
$function$