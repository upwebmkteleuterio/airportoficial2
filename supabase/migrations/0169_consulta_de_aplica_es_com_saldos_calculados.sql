CREATE OR REPLACE FUNCTION public.get_aplicacoes_saldo()
RETURNS TABLE (
  id text,
  banco_id text,
  banco_nome text,
  nome text,
  tipo text,
  data_aplicacao date,
  ativo boolean,
  observacoes text,
  aportes numeric,
  rendimentos numeric,
  resgates numeric,
  disponivel numeric,
  movimentos integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF NOT public.can_manage_financeiro() THEN
    RAISE EXCEPTION 'Sem permissão para consultar aplicações.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    a.id,
    a.banco_id,
    b.nome,
    a.nome,
    a.tipo,
    a.data_aplicacao,
    a.ativo,
    a.observacoes,
    COALESCE(SUM(m.valor) FILTER (WHERE m.tipo = 'APORTE'), 0),
    COALESCE(SUM(m.valor) FILTER (WHERE m.tipo = 'RENDIMENTO'), 0),
    COALESCE(SUM(m.valor) FILTER (WHERE m.tipo = 'RESGATE'), 0),
    COALESCE(SUM(m.valor) FILTER (WHERE m.tipo IN ('APORTE', 'RENDIMENTO')), 0)
      - COALESCE(SUM(m.valor) FILTER (WHERE m.tipo = 'RESGATE'), 0),
    COUNT(m.id)::integer
  FROM public.aplicacoes AS a
  JOIN public.bancos AS b ON b.id = a.banco_id
  LEFT JOIN public.aplicacao_movimentos AS m ON m.aplicacao_id = a.id
  GROUP BY a.id, a.banco_id, b.nome, a.nome, a.tipo, a.data_aplicacao, a.ativo, a.observacoes
  ORDER BY b.nome, a.nome;
END;
$function$