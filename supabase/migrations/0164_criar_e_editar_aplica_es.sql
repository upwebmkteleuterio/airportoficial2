CREATE OR REPLACE FUNCTION public.fn_salvar_aplicacao(p_id text, p_dados jsonb)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_id text := NULLIF(p_id, '');
  v_nome text := btrim(COALESCE(p_dados->>'nome', ''));
  v_tipo text := p_dados->>'tipo';
  v_banco_id text := NULLIF(p_dados->>'banco_id', '');
  v_data date := NULLIF(p_dados->>'data_aplicacao', '')::date;
  v_ativo boolean := COALESCE((p_dados->>'ativo')::boolean, true);
  v_operador text;
BEGIN
  IF NOT public.can_manage_financeiro() THEN
    RAISE EXCEPTION 'Sem permissão para salvar aplicações.' USING ERRCODE = '42501';
  END IF;

  IF v_nome = '' THEN
    RAISE EXCEPTION 'Informe o nome da aplicação.' USING ERRCODE = '22023';
  END IF;

  IF v_tipo IS NULL OR v_tipo NOT IN ('CDB', 'POUPANCA', 'FUNDO', 'TESOURO', 'ACOES', 'OUTRO') THEN
    RAISE EXCEPTION 'Informe o tipo da aplicação.' USING ERRCODE = '22023';
  END IF;

  IF v_banco_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.bancos WHERE id = v_banco_id) THEN
    RAISE EXCEPTION 'Informe a conta do banco onde a aplicação está.' USING ERRCODE = '22023';
  END IF;

  IF v_data IS NULL THEN
    RAISE EXCEPTION 'Informe a data da aplicação.' USING ERRCODE = '22023';
  END IF;

  IF v_id IS NULL THEN
    v_operador := public.current_user_legacy_id();
    v_id := 'aplicacao-' || gen_random_uuid()::text;
    INSERT INTO public.aplicacoes (id, banco_id, nome, tipo, data_aplicacao, ativo, observacoes, created_by)
    VALUES (v_id, v_banco_id, v_nome, v_tipo, v_data, v_ativo, COALESCE(p_dados->>'observacoes', ''), v_operador);
  ELSE
    UPDATE public.aplicacoes SET
      banco_id = v_banco_id,
      nome = v_nome,
      tipo = v_tipo,
      data_aplicacao = v_data,
      ativo = v_ativo,
      observacoes = COALESCE(p_dados->>'observacoes', ''),
      updated_at = now()
    WHERE id = v_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Aplicação não encontrada.' USING ERRCODE = 'P0002';
    END IF;
  END IF;

  RETURN v_id;
END;
$function$