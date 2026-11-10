CREATE OR REPLACE FUNCTION public.fn_renegociar_venda(p_venda_id text, p_parcelas jsonb, p_observacao text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_venda public.vendas%ROWTYPE;
  v_parcela jsonb;
  v_item_id text;
  v_valor numeric;
  v_data date;
  v_existente record;
  v_ids_mantidos text[] := ARRAY[]::text[];
  v_numeros jsonb := '{}'::jsonb;
  v_antes jsonb := '[]'::jsonb;
  v_depois jsonb := '[]'::jsonb;
  v_operador text;
  v_curso text;
  v_motivo text := btrim(COALESCE(p_observacao, ''));
  v_recebidas integer := 0;
  v_total integer := 0;
BEGIN
  IF NOT public.can_manage_financeiro() THEN
    RAISE EXCEPTION 'Sem permissão para renegociar títulos.' USING ERRCODE = '42501';
  END IF;

  IF p_venda_id IS NULL THEN
    RAISE EXCEPTION 'Venda não informada.' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_venda FROM public.vendas WHERE id = p_venda_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Venda não encontrada.' USING ERRCODE = 'P0002';
  END IF;

  IF v_venda.cancelada THEN
    RAISE EXCEPTION 'Esta venda está cancelada e não pode ser renegociada.' USING ERRCODE = '22023';
  END IF;

  IF p_parcelas IS NULL OR jsonb_typeof(p_parcelas) <> 'array' OR jsonb_array_length(p_parcelas) = 0 THEN
    RAISE EXCEPTION 'Informe as parcelas da renegociação.' USING ERRCODE = '22023';
  END IF;

  IF v_motivo = '' THEN
    RAISE EXCEPTION 'Informe o motivo da renegociação.' USING ERRCODE = '22023';
  END IF;

  v_operador := public.current_user_legacy_id();

  IF v_venda.curso_id IS NOT NULL THEN
    SELECT nome_curso INTO v_curso FROM public.cursos WHERE id = v_venda.curso_id;
  END IF;

  -- numeração atual de cada parcela (para guardar a parcela original)
  SELECT COALESCE(jsonb_object_agg(s.id, s.numero), '{}'::jsonb) INTO v_numeros
  FROM (
    SELECT id, row_number() OVER (ORDER BY data_competencia, created_at) AS numero
    FROM public.lancamentos_financeiros WHERE venda_id = p_venda_id
  ) AS s;

  -- fotografia do estado atual, para o histórico
  SELECT COALESCE(jsonb_agg(jsonb_build_object('numero', s.numero, 'valor', s.valor, 'data', s.data_competencia) ORDER BY s.numero), '[]'::jsonb)
  INTO v_antes
  FROM (
    SELECT row_number() OVER (ORDER BY data_competencia, created_at) AS numero, valor, data_competencia
    FROM public.lancamentos_financeiros WHERE venda_id = p_venda_id
  ) AS s;

  -- 1) parcelas já recebidas (ou estornadas) não podem sair nem mudar
  FOR v_existente IN
    SELECT id, valor, data_competencia
    FROM public.lancamentos_financeiros
    WHERE venda_id = p_venda_id AND (status = 'EFETIVADO' OR estornado = true)
  LOOP
    SELECT item INTO v_parcela
    FROM jsonb_array_elements(p_parcelas) AS item
    WHERE item->>'id' = v_existente.id
    LIMIT 1;

    IF v_parcela IS NULL THEN
      RAISE EXCEPTION 'Uma parcela já recebida não pode ser removida na renegociação.' USING ERRCODE = '22023';
    END IF;

    IF (v_parcela->>'valor')::numeric <> v_existente.valor
       OR (v_parcela->>'data_competencia')::date <> v_existente.data_competencia THEN
      RAISE EXCEPTION 'Uma parcela já recebida não pode ter valor ou vencimento alterados na renegociação.' USING ERRCODE = '22023';
    END IF;

    v_ids_mantidos := v_ids_mantidos || v_existente.id;
    v_recebidas := v_recebidas + 1;
  END LOOP;

  -- 2) atualiza as parcelas em aberto, guardando os valores originais na primeira mudança
  FOR v_parcela IN SELECT * FROM jsonb_array_elements(p_parcelas) LOOP
    v_item_id := NULLIF(v_parcela->>'id', '');

    IF v_item_id IS NOT NULL THEN
      IF NOT EXISTS (SELECT 1 FROM public.lancamentos_financeiros WHERE id = v_item_id AND venda_id = p_venda_id) THEN
        RAISE EXCEPTION 'Uma das parcelas informadas não pertence a esta venda.' USING ERRCODE = '22023';
      END IF;

      v_valor := NULLIF(v_parcela->>'valor', '')::numeric;
      v_data := NULLIF(v_parcela->>'data_competencia', '')::date;

      IF v_valor IS NULL OR v_valor < 0 THEN
        RAISE EXCEPTION 'Toda parcela precisa de um valor maior ou igual a zero.' USING ERRCODE = '22023';
      END IF;

      IF v_data IS NULL THEN
        RAISE EXCEPTION 'Toda parcela precisa de um vencimento.' USING ERRCODE = '22023';
      END IF;

      UPDATE public.lancamentos_financeiros AS l SET
        valor = v_valor,
        data_competencia = v_data,
        data_efetivacao = v_data,
        valor_original = CASE WHEN l.valor IS DISTINCT FROM v_valor AND l.valor_original IS NULL THEN l.valor ELSE l.valor_original END,
        data_original = CASE WHEN l.data_competencia IS DISTINCT FROM v_data AND l.data_original IS NULL THEN l.data_competencia ELSE l.data_original END,
        parcela_original = CASE WHEN l.parcela_original IS NULL THEN (v_numeros->>l.id)::integer ELSE l.parcela_original END,
        renegociada = true,
        updated_at = now()
      WHERE l.id = v_item_id AND l.venda_id = p_venda_id AND l.status = 'PREVISTO' AND l.estornado = false;

      v_ids_mantidos := v_ids_mantidos || v_item_id;
    END IF;
  END LOOP;

  -- 3) remove as parcelas em aberto que saíram da renegociação
  DELETE FROM public.lancamentos_financeiros
  WHERE venda_id = p_venda_id
    AND status = 'PREVISTO'
    AND estornado = false
    AND NOT (id = ANY (v_ids_mantidos));

  -- 4) cria as parcelas novas
  FOR v_parcela IN SELECT * FROM jsonb_array_elements(p_parcelas) LOOP
    IF NULLIF(v_parcela->>'id', '') IS NULL THEN
      v_valor := NULLIF(v_parcela->>'valor', '')::numeric;
      v_data := NULLIF(v_parcela->>'data_competencia', '')::date;

      IF v_valor IS NULL OR v_valor < 0 THEN
        RAISE EXCEPTION 'Toda parcela precisa de um valor maior ou igual a zero.' USING ERRCODE = '22023';
      END IF;

      IF v_data IS NULL THEN
        RAISE EXCEPTION 'Toda parcela precisa de um vencimento.' USING ERRCODE = '22023';
      END IF;

      INSERT INTO public.lancamentos_financeiros (
        id, tipo, status, valor, data_competencia, data_efetivacao, categoria_id, banco_id,
        descricao, numero_documento, observacoes, forma_pagamento, participante_tipo, pessoa_id,
        empresa_id, participante_nome, participante_documento, turma_id, venda_id, created_by,
        nova_parcela, renegociada
      ) VALUES (
        'lancamento-' || gen_random_uuid()::text, 'ENTRADA', 'PREVISTO', v_valor, v_data, v_data,
        v_venda.categoria_id, v_venda.banco_id, 'Recebimento — ' || v_venda.participante_nome,
        NULLIF(v_venda.referencia_transacao, ''), v_venda.observacoes,
        v_venda.forma_pagamento, v_venda.participante_tipo, v_venda.pessoa_id,
        v_venda.empresa_id, v_venda.participante_nome, v_venda.participante_documento,
        v_venda.turma_id, p_venda_id, v_operador, true, true
      );
    END IF;
  END LOOP;

  -- 5) renumera as descrições
  WITH ordenadas AS (
    SELECT id,
           row_number() OVER (ORDER BY data_competencia, created_at) AS numero,
           COUNT(*) OVER () AS total
    FROM public.lancamentos_financeiros
    WHERE venda_id = p_venda_id
  )
  UPDATE public.lancamentos_financeiros AS l
  SET descricao = 'Recebimento ' || o.numero || '/' || o.total || ' — ' || v_venda.participante_nome
      || CASE WHEN v_curso IS NULL THEN '' ELSE ' (' || v_curso || ')' END
  FROM ordenadas AS o
  WHERE l.id = o.id;

  -- 6) fotografia do novo estado
  SELECT COALESCE(jsonb_agg(jsonb_build_object('numero', s.numero, 'valor', s.valor, 'data', s.data_competencia, 'status', s.status) ORDER BY s.numero), '[]'::jsonb)
  INTO v_depois
  FROM (
    SELECT row_number() OVER (ORDER BY data_competencia, created_at) AS numero, valor, data_competencia, status
    FROM public.lancamentos_financeiros WHERE venda_id = p_venda_id
  ) AS s;

  SELECT COUNT(*) INTO v_total FROM public.lancamentos_financeiros WHERE venda_id = p_venda_id;

  UPDATE public.vendas SET
    condicao = CASE WHEN (SELECT COUNT(*) FROM public.lancamentos_financeiros WHERE venda_id = p_venda_id AND status <> 'CANCELADO') = 1 THEN 'A_VISTA' ELSE 'PARCELADO' END,
    parcelas_quantidade = v_total,
    renegociada = true,
    updated_at = now()
  WHERE id = p_venda_id;

  INSERT INTO public.venda_renegociacoes (id, venda_id, observacao, resumo, created_by)
  VALUES (
    'renegociacao-' || gen_random_uuid()::text,
    p_venda_id,
    v_motivo,
    jsonb_build_object('antes', v_antes, 'depois', v_depois, 'parcelas_recebidas', v_recebidas),
    v_operador
  );

  RETURN p_venda_id;
END;
$function$