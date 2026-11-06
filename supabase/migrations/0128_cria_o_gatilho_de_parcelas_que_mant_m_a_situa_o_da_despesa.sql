CREATE TRIGGER lancamentos_financeiros_situacao_termino
AFTER INSERT OR DELETE OR UPDATE OF status, data_competencia, programacao_id
ON public.lancamentos_financeiros
FOR EACH ROW EXECUTE FUNCTION public.fn_atualizar_situacao_termino_por_lancamento()