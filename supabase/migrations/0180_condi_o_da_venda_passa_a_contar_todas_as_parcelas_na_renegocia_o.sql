DO $$
DECLARE
  v_def text;
  v_novo text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO v_def
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'fn_renegociar_venda';

  v_novo := replace(
    v_def,
    'WHERE venda_id = p_venda_id AND status <> ''CANCELADO'') = 1',
    'WHERE venda_id = p_venda_id) = 1'
  );

  IF v_novo = v_def THEN
    RAISE EXCEPTION 'O trecho da condição não foi encontrado; nada foi alterado.';
  END IF;

  EXECUTE v_novo;
END $$;