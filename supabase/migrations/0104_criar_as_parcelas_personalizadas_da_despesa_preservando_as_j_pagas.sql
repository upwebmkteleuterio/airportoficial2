CREATE OR REPLACE FUNCTION public.fn_substituir_parcelas_personalizadas(p_programacao_id text, p_parcelas jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_programacao public.programacoes_saidas%ROWTYPE;
  v_parcela jsonb;
  v_valor numeric(14,2);
  v_data date;
  v_criadas integer := 0;
  v_operador text;
BEGIN
  IF NOT public.can_manage_financeiro() THEN
    RAISE EXCEPTION 'Sem permissão para alterar as parcelas da despesa.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_programacao FROM public.programacoes_saidas WHERE id = p_programacao_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'A despesa informada não existe.' USING ERRCODE = '22023';
  END IF;

  IF v_programacao.frequencia <> 'PARCELAS_PERSONALIZADAS' THEN
    RAISE EXCEPTION 'Esta despesa não usa parcelas personalizadas.' USING ERRCODE = '22023';
  END IF;

  -- As parcelas já pagas ficam preservadas: apenas as previstas são substituídas.
  DELETE FROM public.lancamentos_financeiros
   WHERE programacao_id = p_programacao_id
     AND status = 'PREVISTO';

  v_operador := public.current_user_legacy_id();

  FOR v_parcela IN SELECT * FROM jsonb_array_elements(COALESCE(p_parcelas, '[]'::jsonb))
  LOOP
    IF COALESCE(v_parcela ->> 'data', '') = '' THEN
      RAISE EXCEPTION 'Informe a data de vencimento de cada parcela.' USING ERRCODE = '22023';
    END IF;

    v_data := (v_parcela ->> 'data')::date;
    v_valor := COALESCE(NULLIF(v_parcela ->> 'valor', '')::numeric, 0);

    IF v_valor < 0 THEN
      RAISE EXCEPTION 'O valor das parcelas não pode ser negativo.' USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.lancamentos_financeiros (
      id, tipo, status, valor, data_competencia, data_efetivacao, categoria_id, banco_id,
      descricao, observacoes, participante_tipo, pessoa_id, empresa_id, fornecedor_id,
      participante_nome, participante_documento, programacao_id, created_by
    ) VALUES (
      'lancamento-' || gen_random_uuid()::text, 'SAIDA', 'PREVISTO', v_valor,
      v_data, v_data,
      v_programacao.categoria_id, v_programacao.banco_id,
      v_programacao.descricao, v_programacao.observacoes,
      v_programacao.participante_tipo, v_programacao.pessoa_id, v_programacao.empresa_id, v_programacao.fornecedor_id,
      v_programacao.participante_nome, v_programacao.participante_documento,
      v_programacao.id, v_operador
    );

    v_criadas := v_criadas + 1;
  END LOOP;

  RETURN v_criadas;
END;
$function$