CREATE OR REPLACE FUNCTION public.fn_salvar_venda(p_venda_id text, p_venda jsonb, p_parcelas jsonb)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_id text := p_venda_id;
  v_operador text;
  v_parcela jsonb;
  v_total integer;
  v_indice integer := 0;
  v_curso text;
  v_participante_tipo text;
  v_condicao text;
  v_nome text;
  v_troca_parcelas boolean := false;
  v_existente record;
  v_ids_mantidos text[] := ARRAY[]::text[];
  v_item_id text;
  v_valor numeric;
  v_data date;
BEGIN
  IF NOT public.can_manage_financeiro() THEN
    RAISE EXCEPTION 'Sem permissão para salvar vendas.' USING ERRCODE = '42501';
  END IF;

  v_participante_tipo := p_venda->>'participante_tipo';
  v_condicao := p_venda->>'condicao';
  v_nome := btrim(COALESCE(p_venda->>'participante_nome', ''));

  IF v_participante_tipo IS NULL OR v_participante_tipo NOT IN ('ALUNO', 'EMPRESA') THEN
    RAISE EXCEPTION 'Informe se a venda é para aluno ou empresa.' USING ERRCODE = '22023';
  END IF;

  IF v_condicao IS NULL OR v_condicao NOT IN ('A_VISTA', 'PARCELADO') THEN
    RAISE EXCEPTION 'Informe a condição de pagamento da venda.' USING ERRCODE = '22023';
  END IF;

  IF v_nome = '' THEN
    RAISE EXCEPTION 'Informe o participante da venda.' USING ERRCODE = '22023';
  END IF;

  IF p_venda->>'categoria_id' IS NULL OR p_venda->>'banco_id' IS NULL THEN
    RAISE EXCEPTION 'Informe a categoria e a conta do recebimento.' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.categorias_financeiras WHERE id = p_venda->>'categoria_id' AND tipo = 'ENTRADA') THEN
    RAISE EXCEPTION 'A categoria da venda precisa ser de entrada.' USING ERRCODE = '23514';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.bancos WHERE id = p_venda->>'banco_id') THEN
    RAISE EXCEPTION 'Conta de recebimento não encontrada.' USING ERRCODE = 'P0002';
  END IF;

  IF p_parcelas IS NOT NULL AND jsonb_typeof(p_parcelas) = 'array' AND jsonb_array_length(p_parcelas) > 0 THEN
    v_troca_parcelas := true;
    v_total := jsonb_array_length(p_parcelas);
  ELSIF v_id IS NULL THEN
    RAISE EXCEPTION 'Informe ao menos uma parcela para a venda.' USING ERRCODE = '22023';
  ELSE
    SELECT parcelas_quantidade INTO v_total FROM public.vendas WHERE id = v_id;
    IF v_total IS NULL THEN
      RAISE EXCEPTION 'Venda não encontrada.' USING ERRCODE = 'P0002';
    END IF;
  END IF;

  v_operador := public.current_user_legacy_id();

  IF NULLIF(p_venda->>'curso_id', '') IS NOT NULL THEN
    SELECT nome_curso INTO v_curso FROM public.cursos WHERE id = p_venda->>'curso_id';
  END IF;

  IF v_id IS NULL THEN
    v_id := 'venda-' || gen_random_uuid()::text;
    INSERT INTO public.vendas (
      id, participante_tipo, pessoa_id, empresa_id, participante_nome, participante_documento,
      curso_id, turma_id, condicao, parcelas_quantidade, categoria_id, banco_id, forma_pagamento,
      referencia_transacao, cartao_ultimos_digitos, observacoes, created_by
    ) VALUES (
      v_id, v_participante_tipo,
      CASE WHEN v_participante_tipo = 'ALUNO' THEN NULLIF(p_venda->>'pessoa_id', '') END,
      CASE WHEN v_participante_tipo = 'EMPRESA' THEN NULLIF(p_venda->>'empresa_id', '') END,
      v_nome,
      NULLIF(p_venda->>'participante_documento', ''),
      NULLIF(p_venda->>'curso_id', ''),
      NULLIF(p_venda->>'turma_id', ''),
      v_condicao, v_total,
      p_venda->>'categoria_id', p_venda->>'banco_id',
      NULLIF(p_venda->>'forma_pagamento', ''),
      NULLIF(p_venda->>'referencia_transacao', ''),
      NULLIF(p_venda->>'cartao_ultimos_digitos', ''),
      COALESCE(p_venda->>'observacoes', ''),
      v_operador
    );
  ELSE
    UPDATE public.vendas SET
      participante_tipo = v_participante_tipo,
      pessoa_id = CASE WHEN v_participante_tipo = 'ALUNO' THEN NULLIF(p_venda->>'pessoa_id', '') END,
      empresa_id = CASE WHEN v_participante_tipo = 'EMPRESA' THEN NULLIF(p_venda->>'empresa_id', '') END,
      participante_nome = v_nome,
      participante_documento = NULLIF(p_venda->>'participante_documento', ''),
      curso_id = NULLIF(p_venda->>'curso_id', ''),
      turma_id = NULLIF(p_venda->>'turma_id', ''),
      condicao = v_condicao,
      parcelas_quantidade = v_total,
      categoria_id = p_venda->>'categoria_id',
      banco_id = p_venda->>'banco_id',
      forma_pagamento = NULLIF(p_venda->>'forma_pagamento', ''),
      referencia_transacao = NULLIF(p_venda->>'referencia_transacao', ''),
      cartao_ultimos_digitos = NULLIF(p_venda->>'cartao_ultimos_digitos', ''),
      observacoes = COALESCE(p_venda->>'observacoes', ''),
      updated_at = now()
    WHERE id = v_id;
  END IF;

  IF v_troca_parcelas THEN
    -- 1) parcelas já recebidas (ou estornadas) são intocáveis: precisam vir iguais
    FOR v_existente IN
      SELECT id, valor, data_competencia
      FROM public.lancamentos_financeiros
      WHERE venda_id = v_id AND (status = 'EFETIVADO' OR estornado = true)
    LOOP
      SELECT item INTO v_parcela
      FROM jsonb_array_elements(p_parcelas) AS item
      WHERE item->>'id' = v_existente.id
      LIMIT 1;

      IF v_parcela IS NULL THEN
        RAISE EXCEPTION 'Uma parcela já recebida não pode ser removida. Use o estorno.' USING ERRCODE = '22023';
      END IF;

      IF (v_parcela->>'valor')::numeric <> v_existente.valor
         OR (v_parcela->>'data_competencia')::date <> v_existente.data_competencia THEN
        RAISE EXCEPTION 'Uma parcela já recebida não pode ter valor ou vencimento alterados. Use o estorno.' USING ERRCODE = '22023';
      END IF;

      v_ids_mantidos := v_ids_mantidos || v_existente.id;
    END LOOP;

    -- 2) atualiza as parcelas em aberto informadas
    FOR v_parcela IN SELECT * FROM jsonb_array_elements(p_parcelas) LOOP
      v_indice := v_indice + 1;
      v_item_id := NULLIF(v_parcela->>'id', '');

      IF v_item_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM public.lancamentos_financeiros WHERE id = v_item_id AND venda_id = v_id) THEN
          RAISE EXCEPTION 'A parcela % não pertence a esta venda.', v_indice USING ERRCODE = '22023';
        END IF;

        v_valor := NULLIF(v_parcela->>'valor', '')::numeric;
        v_data := NULLIF(v_parcela->>'data_competencia', '')::date;

        IF v_valor IS NULL OR v_valor < 0 THEN
          RAISE EXCEPTION 'A parcela % precisa de um valor maior ou igual a zero.', v_indice USING ERRCODE = '22023';
        END IF;

        IF v_data IS NULL THEN
          RAISE EXCEPTION 'A parcela % precisa de um vencimento.', v_indice USING ERRCODE = '22023';
        END IF;

        UPDATE public.lancamentos_financeiros SET
          valor = v_valor,
          data_competencia = v_data,
          data_efetivacao = v_data,
          categoria_id = p_venda->>'categoria_id',
          banco_id = p_venda->>'banco_id',
          numero_documento = NULLIF(p_venda->>'referencia_transacao', ''),
          forma_pagamento = NULLIF(p_venda->>'forma_pagamento', ''),
          participante_tipo = v_participante_tipo,
          pessoa_id = CASE WHEN v_participante_tipo = 'ALUNO' THEN NULLIF(p_venda->>'pessoa_id', '') END,
          empresa_id = CASE WHEN v_participante_tipo = 'EMPRESA' THEN NULLIF(p_venda->>'empresa_id', '') END,
          participante_nome = v_nome,
          participante_documento = NULLIF(p_venda->>'participante_documento', ''),
          turma_id = NULLIF(p_venda->>'turma_id', ''),
          observacoes = COALESCE(p_venda->>'observacoes', ''),
          updated_at = now()
        WHERE id = v_item_id AND venda_id = v_id AND status = 'PREVISTO' AND estornado = false;

        v_ids_mantidos := v_ids_mantidos || v_item_id;
      END IF;
    END LOOP;

    -- 3) remove as parcelas em aberto que não vieram na lista
    DELETE FROM public.lancamentos_financeiros
    WHERE venda_id = v_id
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
          empresa_id, participante_nome, participante_documento, turma_id, venda_id, created_by
        ) VALUES (
          'lancamento-' || gen_random_uuid()::text, 'ENTRADA', 'PREVISTO', v_valor, v_data, v_data,
          p_venda->>'categoria_id', p_venda->>'banco_id', 'Recebimento — ' || v_nome,
          NULLIF(p_venda->>'referencia_transacao', ''), COALESCE(p_venda->>'observacoes', ''),
          NULLIF(p_venda->>'forma_pagamento', ''), v_participante_tipo,
          CASE WHEN v_participante_tipo = 'ALUNO' THEN NULLIF(p_venda->>'pessoa_id', '') END,
          CASE WHEN v_participante_tipo = 'EMPRESA' THEN NULLIF(p_venda->>'empresa_id', '') END,
          v_nome, NULLIF(p_venda->>'participante_documento', ''),
          NULLIF(p_venda->>'turma_id', ''), v_id, v_operador
        );
      END IF;
    END LOOP;

    -- 5) renumera as descrições na ordem de vencimento
    WITH ordenadas AS (
      SELECT id,
             row_number() OVER (ORDER BY data_competencia, created_at) AS numero,
             COUNT(*) OVER () AS total
      FROM public.lancamentos_financeiros
      WHERE venda_id = v_id
    )
    UPDATE public.lancamentos_financeiros AS l
    SET descricao = 'Recebimento ' || o.numero || '/' || o.total || ' — ' || v_nome
        || CASE WHEN v_curso IS NULL THEN '' ELSE ' (' || v_curso || ')' END
    FROM ordenadas AS o
    WHERE l.id = o.id;

    SELECT COUNT(*) INTO v_total FROM public.lancamentos_financeiros WHERE venda_id = v_id;

    UPDATE public.vendas SET parcelas_quantidade = v_total, updated_at = now() WHERE id = v_id;
  ELSE
    UPDATE public.lancamentos_financeiros SET
      categoria_id = p_venda->>'categoria_id',
      banco_id = p_venda->>'banco_id',
      numero_documento = NULLIF(p_venda->>'referencia_transacao', ''),
      forma_pagamento = NULLIF(p_venda->>'forma_pagamento', ''),
      participante_tipo = v_participante_tipo,
      pessoa_id = CASE WHEN v_participante_tipo = 'ALUNO' THEN NULLIF(p_venda->>'pessoa_id', '') END,
      empresa_id = CASE WHEN v_participante_tipo = 'EMPRESA' THEN NULLIF(p_venda->>'empresa_id', '') END,
      participante_nome = v_nome,
      participante_documento = NULLIF(p_venda->>'participante_documento', ''),
      turma_id = NULLIF(p_venda->>'turma_id', ''),
      observacoes = COALESCE(p_venda->>'observacoes', ''),
      updated_at = now()
    WHERE venda_id = v_id;
  END IF;

  RETURN v_id;
END;
$function$