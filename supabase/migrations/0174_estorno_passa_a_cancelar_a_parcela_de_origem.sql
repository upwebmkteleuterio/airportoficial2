CREATE OR REPLACE FUNCTION public.fn_estornar_lancamento(p_lancamento_id text, p_valor numeric, p_data date, p_motivo text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_orig public.lancamentos_financeiros%ROWTYPE;
  v_cat text;
  v_estorno_id text;
  v_operador text;
  v_motivo text := btrim(COALESCE(p_motivo, ''));
  v_tipo text;
BEGIN
  IF NOT public.can_manage_financeiro() THEN
    RAISE EXCEPTION 'Sem permissão para estornar lançamentos financeiros.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_orig FROM public.lancamentos_financeiros WHERE id = p_lancamento_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lançamento não encontrado.' USING ERRCODE = 'P0002';
  END IF;

  IF v_orig.status <> 'EFETIVADO' THEN
    RAISE EXCEPTION 'Somente lançamentos já efetivados podem ser estornados.' USING ERRCODE = '22023';
  END IF;

  IF v_orig.estornado THEN
    RAISE EXCEPTION 'Este lançamento já foi estornado.' USING ERRCODE = '22023';
  END IF;

  IF v_orig.estorno_de IS NOT NULL THEN
    RAISE EXCEPTION 'Um lançamento de estorno não pode ser estornado.' USING ERRCODE = '22023';
  END IF;

  IF v_orig.transferencia_id IS NOT NULL THEN
    RAISE EXCEPTION 'Lançamentos de transferência entre contas não podem ser estornados individualmente.' USING ERRCODE = '22023';
  END IF;

  IF p_valor IS NULL OR p_valor <= 0 THEN
    RAISE EXCEPTION 'Informe um valor de estorno maior que zero.' USING ERRCODE = '22023';
  END IF;

  IF p_valor > v_orig.valor THEN
    RAISE EXCEPTION 'O valor do estorno não pode ser maior que o valor do lançamento.' USING ERRCODE = '22023';
  END IF;

  IF p_data IS NULL THEN
    RAISE EXCEPTION 'Informe a data do estorno.' USING ERRCODE = '22023';
  END IF;

  IF v_motivo = '' THEN
    RAISE EXCEPTION 'Informe o motivo do estorno.' USING ERRCODE = '22023';
  END IF;

  IF v_orig.tipo = 'ENTRADA' THEN
    v_tipo := 'SAIDA';
    SELECT id INTO v_cat FROM public.categorias_financeiras WHERE id = 'cat-sai-estorno';
  ELSE
    v_tipo := 'ENTRADA';
    SELECT id INTO v_cat FROM public.categorias_financeiras WHERE id = 'cat-ent-estorno';
  END IF;

  IF v_cat IS NULL THEN
    RAISE EXCEPTION 'A categoria interna de estorno não está configurada.' USING ERRCODE = 'P0002';
  END IF;

  v_operador := public.current_user_legacy_id();
  v_estorno_id := 'lancamento-' || gen_random_uuid()::text;

  -- A contrapartida não recebe venda_id nem programacao_id: ela não é uma parcela
  -- da venda nem um pagamento da despesa, é apenas o dinheiro voltando.
  INSERT INTO public.lancamentos_financeiros (
    id, tipo, status, valor, data_competencia, data_efetivacao, categoria_id, banco_id,
    descricao, observacoes, forma_pagamento, participante_tipo, pessoa_id, empresa_id,
    fornecedor_id, participante_nome, participante_documento, turma_id, matricula_id,
    estorno_de, created_by
  ) VALUES (
    v_estorno_id, v_tipo, 'EFETIVADO', p_valor, p_data, p_data, v_cat, v_orig.banco_id,
    'Estorno — ' || v_orig.descricao, v_motivo, v_orig.forma_pagamento, v_orig.participante_tipo,
    v_orig.pessoa_id, v_orig.empresa_id, v_orig.fornecedor_id, v_orig.participante_nome,
    v_orig.participante_documento, v_orig.turma_id, v_orig.matricula_id,
    v_orig.id, v_operador
  );

  -- O estorno encerra a parcela de origem: ela fica marcada como estornada (para
  -- não contar duas vezes no caixa, já que a contrapartida retira o valor) e como
  -- cancelada (para sair dos recebíveis e aparecer cancelada na venda, sem
  -- cancelar o contrato inteiro).
  UPDATE public.lancamentos_financeiros
  SET estornado = true,
      estorno_motivo = v_motivo,
      status = 'CANCELADO',
      cancelado_motivo = v_motivo,
      updated_at = now()
  WHERE id = v_orig.id;

  RETURN v_estorno_id;
END;
$function$