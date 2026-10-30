CREATE OR REPLACE FUNCTION public.fn_atualizar_transferencia(
  p_transferencia_id text,
  p_valor numeric,
  p_data date,
  p_observacoes text DEFAULT ''
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.can_manage_financeiro() THEN
    RAISE EXCEPTION 'Sem permissão para alterar transferências entre contas.' USING ERRCODE = '42501';
  END IF;

  IF p_transferencia_id IS NULL OR btrim(p_transferencia_id) = '' THEN
    RAISE EXCEPTION 'Transferência inválida.' USING ERRCODE = '22023';
  END IF;

  IF p_valor IS NULL OR p_valor <= 0 THEN
    RAISE EXCEPTION 'O valor da transferência deve ser maior que zero.' USING ERRCODE = '22023';
  END IF;

  IF p_data IS NULL THEN
    RAISE EXCEPTION 'Informe a data da transferência.' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.lancamentos_financeiros WHERE transferencia_id = p_transferencia_id) THEN
    RAISE EXCEPTION 'Transferência não encontrada.' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.lancamentos_financeiros
  SET valor = p_valor,
      data_competencia = p_data,
      data_efetivacao = p_data,
      observacoes = COALESCE(p_observacoes, ''),
      updated_at = now()
  WHERE transferencia_id = p_transferencia_id;
END;
$function$;