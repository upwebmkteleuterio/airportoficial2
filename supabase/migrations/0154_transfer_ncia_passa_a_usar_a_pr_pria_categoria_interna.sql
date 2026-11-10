CREATE OR REPLACE FUNCTION public.fn_criar_transferencia(
  p_origem_id text,
  p_destino_id text,
  p_valor numeric,
  p_data date,
  p_observacoes text DEFAULT ''
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_transferencia_id text;
  v_cat_entrada text;
  v_cat_saida text;
  v_operador text;
BEGIN
  IF NOT public.can_manage_financeiro() THEN
    RAISE EXCEPTION 'Sem permissão para registrar transferências entre contas.' USING ERRCODE = '42501';
  END IF;

  IF p_origem_id IS NULL OR p_destino_id IS NULL OR p_origem_id = p_destino_id THEN
    RAISE EXCEPTION 'Escolha contas de origem e destino diferentes.' USING ERRCODE = '22023';
  END IF;

  IF p_valor IS NULL OR p_valor <= 0 THEN
    RAISE EXCEPTION 'O valor da transferência deve ser maior que zero.' USING ERRCODE = '22023';
  END IF;

  IF p_data IS NULL THEN
    RAISE EXCEPTION 'Informe a data da transferência.' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.bancos WHERE id = p_origem_id)
     OR NOT EXISTS (SELECT 1 FROM public.bancos WHERE id = p_destino_id) THEN
    RAISE EXCEPTION 'Conta de origem ou de destino não encontrada.' USING ERRCODE = 'P0002';
  END IF;

  SELECT id INTO v_cat_entrada FROM public.categorias_financeiras WHERE id = 'cat-ent-transferencia';
  SELECT id INTO v_cat_saida FROM public.categorias_financeiras WHERE id = 'cat-sai-transferencia';

  IF v_cat_entrada IS NULL OR v_cat_saida IS NULL THEN
    RAISE EXCEPTION 'As categorias de sistema de transferência não estão configuradas.' USING ERRCODE = 'P0002';
  END IF;

  v_operador := public.current_user_legacy_id();
  v_transferencia_id := 'transferencia-' || gen_random_uuid()::text;

  INSERT INTO public.lancamentos_financeiros (
    id, tipo, status, valor, data_competencia, data_efetivacao, categoria_id, banco_id,
    descricao, observacoes, transferencia_id, created_by
  ) VALUES (
    'lancamento-' || gen_random_uuid()::text, 'SAIDA', 'EFETIVADO', p_valor, p_data, p_data, v_cat_saida, p_origem_id,
    'Transferência entre contas', COALESCE(p_observacoes, ''), v_transferencia_id, v_operador
  );

  INSERT INTO public.lancamentos_financeiros (
    id, tipo, status, valor, data_competencia, data_efetivacao, categoria_id, banco_id,
    descricao, observacoes, transferencia_id, created_by
  ) VALUES (
    'lancamento-' || gen_random_uuid()::text, 'ENTRADA', 'EFETIVADO', p_valor, p_data, p_data, v_cat_entrada, p_destino_id,
    'Transferência entre contas', COALESCE(p_observacoes, ''), v_transferencia_id, v_operador
  );

  RETURN v_transferencia_id;
END;
$function$