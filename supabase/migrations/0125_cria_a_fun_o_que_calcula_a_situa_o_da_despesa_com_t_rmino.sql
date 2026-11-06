CREATE OR REPLACE FUNCTION public.fn_recalcular_situacao_termino(p_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_situacao text;
BEGIN
  IF p_id IS NULL THEN
    RETURN;
  END IF;

  SELECT CASE
           WHEN p.cancelada THEN 'CANCELADA'
           WHEN p.frequencia = 'MENSAL_CONTINUA' THEN 'EM_ANDAMENTO'
           WHEN count(l.id) FILTER (WHERE l.status = 'EFETIVADO') = 0 THEN 'EM_ANDAMENTO'
           WHEN count(l.id) FILTER (WHERE l.status = 'PREVISTO') > 0 THEN 'EM_ANDAMENTO'
           WHEN p.frequencia = 'PARCELAS_PERSONALIZADAS' THEN 'FINALIZADA'
           WHEN max(l.data_competencia) >= (
                  date_trunc('month', p.data_inicio)::date
                  + ((CASE WHEN p.dia_vencimento >= EXTRACT(DAY FROM p.data_inicio) THEN 0 ELSE 1 END
                      + COALESCE(p.total_parcelas, 1) - 1) || ' months')::interval
                )::date THEN 'FINALIZADA'
           ELSE 'EM_ANDAMENTO'
         END
    INTO v_situacao
    FROM public.programacoes_saidas p
    LEFT JOIN public.lancamentos_financeiros l ON l.programacao_id = p.id
   WHERE p.id = p_id
   GROUP BY p.id, p.cancelada, p.frequencia, p.data_inicio, p.dia_vencimento, p.total_parcelas;

  IF v_situacao IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.programacoes_saidas
     SET situacao_termino = v_situacao
   WHERE id = p_id
     AND situacao_termino IS DISTINCT FROM v_situacao;
END;
$function$