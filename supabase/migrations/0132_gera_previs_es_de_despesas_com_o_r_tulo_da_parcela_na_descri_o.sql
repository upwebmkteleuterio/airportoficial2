CREATE OR REPLACE FUNCTION public.fn_gerar_previsoes_mes(p_mes date)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_inicio date;
  v_fim date;
  v_ultimo_dia integer;
  v_programacao record;
  v_vencimento date;
  v_criadas integer := 0;
  v_operador text;
  v_rotulo text;
BEGIN
  IF NOT public.can_manage_financeiro() THEN
    RAISE EXCEPTION 'Sem permissão para gerar as previsões de despesas.' USING ERRCODE = '42501';
  END IF;

  IF p_mes IS NULL THEN
    RAISE EXCEPTION 'Informe o mês das previsões.' USING ERRCODE = '22023';
  END IF;

  -- Duas consultas simultâneas ao mesmo mês (o aplicativo consulta o mês mais de
  -- uma vez ao abrir a tela) não podem gerar a mesma previsão duas vezes. O lock
  -- serializa as execuções, tornando a checagem de existência abaixo confiável.
  PERFORM pg_advisory_xact_lock(hashtext('fn_gerar_previsoes_mes')::bigint);

  v_inicio := date_trunc('month', p_mes)::date;
  v_fim := (v_inicio + interval '1 month')::date;
  v_ultimo_dia := EXTRACT(DAY FROM (v_fim - interval '1 day'))::integer;
  v_operador := public.current_user_legacy_id();

  FOR v_programacao IN
    SELECT * FROM public.programacoes_saidas p
    WHERE p.ativa = true
      AND p.cancelada = false
      AND p.frequencia <> 'PARCELAS_PERSONALIZADAS'
      AND p.data_inicio < v_fim
      AND (
        p.frequencia = 'MENSAL_CONTINUA'
        OR (
          p.frequencia = 'REPETICAO_FINITA'
          AND v_inicio < (
            date_trunc('month', p.data_inicio)::date
            + ((CASE WHEN p.dia_vencimento >= EXTRACT(DAY FROM p.data_inicio) THEN 0 ELSE 1 END + p.repeticoes) || ' months')::interval
          )::date
        )
        OR (
          p.frequencia = 'AVULSA'
          AND v_inicio = (
            date_trunc('month', p.data_inicio)::date
            + ((CASE WHEN p.dia_vencimento >= EXTRACT(DAY FROM p.data_inicio) THEN 0 ELSE 1 END) || ' months')::interval
          )::date
        )
      )
    ORDER BY p.data_inicio, p.id
  LOOP
    v_vencimento := v_inicio + (LEAST(v_programacao.dia_vencimento, v_ultimo_dia) - 1);

    IF v_vencimento < v_programacao.data_inicio THEN
      CONTINUE;
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.lancamentos_financeiros l
      WHERE l.programacao_id = v_programacao.id
        AND l.data_competencia >= v_inicio
        AND l.data_competencia < v_fim
    ) THEN
      CONTINUE;
    END IF;

    -- A descrição da previsão carrega o tipo de cobrança para que a tela de
    -- lançamentos mostre a mesma informação das telas de contas a pagar e recebimentos.
    v_rotulo := CASE
      WHEN v_programacao.frequencia = 'MENSAL_CONTINUA' THEN 'Recorrente'
      WHEN v_programacao.frequencia = 'AVULSA' THEN 'Parcela única'
      ELSE 'Parcela ' || (
        (EXTRACT(YEAR FROM v_inicio)::integer * 12 + EXTRACT(MONTH FROM v_inicio)::integer)
        - (EXTRACT(YEAR FROM date_trunc('month', v_programacao.data_inicio)::date)::integer * 12
           + EXTRACT(MONTH FROM date_trunc('month', v_programacao.data_inicio)::date)::integer)
        - (CASE WHEN v_programacao.dia_vencimento >= EXTRACT(DAY FROM v_programacao.data_inicio) THEN 0 ELSE 1 END)
        + 1
      )::text || ' de ' || COALESCE(v_programacao.repeticoes, v_programacao.total_parcelas, 1)::text
    END;

    INSERT INTO public.lancamentos_financeiros (
      id, tipo, status, valor, data_competencia, data_efetivacao, categoria_id, banco_id,
      descricao, observacoes, participante_tipo, pessoa_id, empresa_id, fornecedor_id,
      participante_nome, participante_documento, programacao_id, created_by
    ) VALUES (
      'lancamento-' || gen_random_uuid()::text, 'SAIDA', 'PREVISTO',
      COALESCE(v_programacao.valor_previsto, 0),
      v_vencimento, v_vencimento,
      v_programacao.categoria_id, v_programacao.banco_id,
      v_programacao.descricao || ' - ' || v_rotulo, v_programacao.observacoes,
      v_programacao.participante_tipo, v_programacao.pessoa_id, v_programacao.empresa_id, v_programacao.fornecedor_id,
      v_programacao.participante_nome, v_programacao.participante_documento,
      v_programacao.id, v_operador
    );

    v_criadas := v_criadas + 1;
  END LOOP;

  RETURN v_criadas;
END;
$function$