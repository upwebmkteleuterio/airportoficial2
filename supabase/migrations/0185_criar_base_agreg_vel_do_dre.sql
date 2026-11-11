CREATE OR REPLACE FUNCTION public.fn_relatorio_base_dre(
  p_inicio date,
  p_fim date,
  p_regime text DEFAULT 'COMPETENCIA',
  p_banco_id text DEFAULT NULL
)
RETURNS TABLE (
  tipo text,
  valor numeric,
  banco_id text,
  turma_id text,
  categoria_id text,
  participante_nome text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_regime text := CASE WHEN upper(COALESCE(p_regime, '')) = 'CAIXA' THEN 'CAIXA' ELSE 'COMPETENCIA' END;
BEGIN
  IF NOT public.can_manage_financeiro() THEN
    RAISE EXCEPTION 'Sem permissão para consultar os relatórios financeiros.' USING ERRCODE = '42501';
  END IF;

  IF p_inicio IS NULL OR p_fim IS NULL THEN
    RAISE EXCEPTION 'Informe o período do relatório.' USING ERRCODE = '22023';
  END IF;

  IF p_fim < p_inicio THEN
    RAISE EXCEPTION 'A data final não pode ser anterior à data inicial.' USING ERRCODE = '22023';
  END IF;

  -- Base única do resultado (DRE). Fora dela ficam as categorias de sistema
  -- (transferência entre contas, aplicação/resgate, estorno e saque de lucro),
  -- que movimentam o caixa mas não são receita nem despesa.
  RETURN QUERY
  WITH base AS (
    -- Lançamentos que aconteceram de fato. Os estornados continuam aqui: o
    -- dinheiro passou pela conta e o abatimento vem da contrapartida abaixo.
    SELECT l.tipo, l.valor, l.banco_id, l.turma_id, l.categoria_id, l.participante_nome
    FROM public.lancamentos_financeiros l
    JOIN public.categorias_financeiras c ON c.id = l.categoria_id
    WHERE ((l.status = 'EFETIVADO' AND l.estornado = false) OR l.estornado = true)
      AND COALESCE(c.sistema, false) = false
      AND (CASE WHEN v_regime = 'CAIXA' THEN l.data_efetivacao ELSE l.data_competencia END) BETWEEN p_inicio AND p_fim
      AND (p_banco_id IS NULL OR l.banco_id = p_banco_id)

    UNION ALL

    -- Contrapartidas de estorno abatem na categoria do lançamento original, com
    -- o sinal invertido: um estorno parcial reduz a receita (ou a despesa) só no
    -- valor devolvido, em vez de zerar o lançamento inteiro.
    SELECT original.tipo, -estorno.valor, estorno.banco_id, estorno.turma_id, original.categoria_id, estorno.participante_nome
    FROM public.lancamentos_financeiros estorno
    JOIN public.lancamentos_financeiros original ON original.id = estorno.estorno_de
    JOIN public.categorias_financeiras c ON c.id = original.categoria_id
    WHERE COALESCE(c.sistema, false) = false
      AND (CASE WHEN v_regime = 'CAIXA' THEN estorno.data_efetivacao ELSE estorno.data_competencia END) BETWEEN p_inicio AND p_fim
      AND (p_banco_id IS NULL OR estorno.banco_id = p_banco_id)
  )
  SELECT b.tipo, b.valor, b.banco_id, b.turma_id, b.categoria_id, b.participante_nome
  FROM base b;
END;
$function$