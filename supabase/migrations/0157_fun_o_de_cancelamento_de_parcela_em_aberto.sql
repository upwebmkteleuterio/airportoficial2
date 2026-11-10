CREATE OR REPLACE FUNCTION public.fn_cancelar_parcela(p_lancamento_id text, p_motivo text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_row public.lancamentos_financeiros%ROWTYPE;
  v_motivo text := btrim(COALESCE(p_motivo, ''));
BEGIN
  IF NOT public.can_manage_financeiro() THEN
    RAISE EXCEPTION 'Sem permissão para cancelar parcelas.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_row FROM public.lancamentos_financeiros WHERE id = p_lancamento_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Parcela não encontrada.' USING ERRCODE = 'P0002';
  END IF;

  IF v_row.status = 'CANCELADO' THEN
    RAISE EXCEPTION 'Esta parcela já está cancelada.' USING ERRCODE = '22023';
  END IF;

  IF v_row.status = 'EFETIVADO' THEN
    RAISE EXCEPTION 'Parcela já recebida não pode ser cancelada. Use o estorno.' USING ERRCODE = '22023';
  END IF;

  IF v_row.transferencia_id IS NOT NULL THEN
    RAISE EXCEPTION 'Lançamentos de transferência entre contas não podem ser cancelados.' USING ERRCODE = '22023';
  END IF;

  IF v_motivo = '' THEN
    RAISE EXCEPTION 'Informe o motivo do cancelamento.' USING ERRCODE = '22023';
  END IF;

  UPDATE public.lancamentos_financeiros
  SET status = 'CANCELADO', cancelado_motivo = v_motivo, updated_at = now()
  WHERE id = v_row.id;
END;
$function$