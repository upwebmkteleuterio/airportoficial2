CREATE OR REPLACE FUNCTION public.fn_programacoes_saida_pagas(p_ids text[])
 RETURNS TABLE(programacao_id text, pagas integer)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT l.programacao_id, COUNT(*)::integer AS pagas
    FROM public.lancamentos_financeiros l
   WHERE l.programacao_id = ANY(p_ids)
     AND l.status = 'EFETIVADO'
   GROUP BY l.programacao_id;
$function$