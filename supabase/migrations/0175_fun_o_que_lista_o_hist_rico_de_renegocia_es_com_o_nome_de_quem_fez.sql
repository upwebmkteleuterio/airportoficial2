CREATE OR REPLACE FUNCTION public.fn_listar_renegociacoes(p_venda_id text)
 RETURNS TABLE(id text, venda_id text, observacao text, created_at timestamp with time zone, usuario_nome text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.can_manage_financeiro() THEN
    RAISE EXCEPTION 'Sem permissão para consultar o histórico de renegociações.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT r.id, r.venda_id, r.observacao, r.created_at,
         COALESCE(NULLIF(btrim(p.nome_completo), ''), 'Usuário do sistema') AS usuario_nome
  FROM public.venda_renegociacoes r
  LEFT JOIN public.profiles p ON p.legacy_id = r.created_by
  WHERE r.venda_id = p_venda_id
  ORDER BY r.created_at DESC;
END;
$function$