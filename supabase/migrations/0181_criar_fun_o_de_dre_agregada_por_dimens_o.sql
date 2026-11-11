CREATE OR REPLACE FUNCTION public.fn_relatorio_dre(
  p_inicio date,
  p_fim date,
  p_regime text DEFAULT 'COMPETENCIA',
  p_agrupar text DEFAULT 'CATEGORIA',
  p_banco_id text DEFAULT NULL,
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 50
)
RETURNS TABLE(
  grupo_id text,
  grupo_nome text,
  receitas numeric,
  despesas numeric,
  resultado numeric,
  movimentos bigint,
  total_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_regime text := CASE WHEN upper(COALESCE(p_regime, '')) = 'CAIXA' THEN 'CAIXA' ELSE 'COMPETENCIA' END;
  v_agrupar text := upper(COALESCE(p_agrupar, 'CATEGORIA'));
  v_page integer := GREATEST(COALESCE(p_page, 1), 1);
  v_page_size integer := LEAST(GREATEST(COALESCE(p_page_size, 50), 1), 1000);
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

  IF v_agrupar NOT IN ('CATEGORIA', 'CONTA', 'TURMA', 'PARTICIPANTE') THEN
    v_agrupar := 'CATEGORIA';
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT
      l.tipo,
      l.valor,
      l.participante_nome,
      c.nome AS categoria_nome,
      b.nome AS conta_nome,
      t.id_interno_escola AS turma_numero
    FROM public.lancamentos_financeiros l
    LEFT JOIN public.categorias_financeiras c ON c.id = l.categoria_id
    LEFT JOIN public.bancos b ON b.id = l.banco_id
    LEFT JOIN public.turmas t ON t.id = l.turma_id
    WHERE l.status = 'EFETIVADO'
      AND l.estornado = false
      AND COALESCE(c.sistema, false) = false
      AND (CASE WHEN v_regime = 'CAIXA' THEN l.data_efetivacao ELSE l.data_competencia END) BETWEEN p_inicio AND p_fim
      AND (p_banco_id IS NULL OR l.banco_id = p_banco_id)
  ),
  agrupado AS (
    SELECT
      CASE v_agrupar
        WHEN 'CONTA' THEN COALESCE(b.conta_nome, 'sem-conta')
        WHEN 'TURMA' THEN COALESCE(b.turma_numero::text, 'sem-turma')
        WHEN 'PARTICIPANTE' THEN COALESCE(NULLIF(btrim(b.participante_nome), ''), 'sem-participante')
        ELSE COALESCE(b.categoria_nome, 'sem-categoria')
      END AS grupo_id,
      CASE v_agrupar
        WHEN 'CONTA' THEN COALESCE(b.conta_nome, 'Sem conta')
        WHEN 'TURMA' THEN COALESCE('Turma ' || b.turma_numero::text, 'Sem turma')
        WHEN 'PARTICIPANTE' THEN COALESCE(NULLIF(btrim(b.participante_nome), ''), 'Sem participante')
        ELSE COALESCE(b.categoria_nome, 'Sem categoria')
      END AS grupo_nome,
      COALESCE(SUM(b.valor) FILTER (WHERE b.tipo = 'ENTRADA'), 0) AS receitas,
      COALESCE(SUM(b.valor) FILTER (WHERE b.tipo = 'SAIDA'), 0) AS despesas,
      COUNT(*) AS movimentos
    FROM base b
    GROUP BY 1, 2
  )
  SELECT a.grupo_id, a.grupo_nome, a.receitas, a.despesas, a.receitas - a.despesas, a.movimentos, COUNT(*) OVER ()
  FROM agrupado a
  ORDER BY (a.receitas + a.despesas) DESC, a.grupo_nome ASC
  LIMIT v_page_size OFFSET (v_page - 1) * v_page_size;
END;
$function$;