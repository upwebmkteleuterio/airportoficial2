GRANT EXECUTE ON FUNCTION
  public.fn_estornar_lancamento(text, numeric, date, text),
  public.fn_cancelar_parcela(text, text),
  public.fn_cancelar_venda(text, text),
  public.fn_renegociar_venda(text, jsonb, text),
  public.fn_salvar_aplicacao(text, jsonb),
  public.fn_excluir_aplicacao(text),
  public.fn_aplicar_aporte(text, numeric, date, text),
  public.fn_registrar_rendimento(text, numeric, numeric, date, text),
  public.fn_resgatar_aplicacao(text, numeric, date, text),
  public.get_aplicacoes_saldo()
TO service_role