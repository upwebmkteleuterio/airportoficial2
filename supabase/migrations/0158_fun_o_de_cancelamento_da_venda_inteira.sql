CREATE OR REPLACE FUNCTION public.fn_cancelar_venda(p_venda_id text, p_motivo text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_motivo text := btrim(COALESCE(p_motivo, ''));
  v_canceladas integer := 0;
  v_recebidas integer := 0;
BEGIN
  IF NOT public.can_manage_financeiro() THEN
    RAISE EXCEPTION 'Sem permissão para cancelar vendas.' USING ERRCODE = '42501';
  END IF;

  IF p_venda_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.vendas WHERE id = p_venda_id) THEN
    RAISE EXCEPTION 'Venda não encontrada.' USING ERRCODE = 'P0002';
  END IF;

  IF v_motivo = '' THEN
    RAISE EXCEPTION 'Informe o motivo do cancelamento.' USING ERRCODE = '22023';
  END IF;

  SELECT COUNT(*) INTO v_recebidas
  FROM public.lancamentos_financeiros
  WHERE venda_id = p_venda_id AND status = 'EFETIVADO' AND estornado = false;

  UPDATE public.lancamentos_financeiros
  SET status = 'CANCELADO', cancelado_motivo = v_motivo, updated_at = now()
  WHERE venda_id = p_venda_id AND status = 'PREVISTO';
  GET DIAGNOSTICS v_canceladas = ROW_COUNT;

  UPDATE public.vendas
  SET cancelada = true, cancelada_motivo = v_motivo, updated_at = now()
  WHERE id = p_venda_id;

  RETURN jsonb_build_object('canceladas', v_canceladas, 'recebidas', v_recebidas);
END;
$function$