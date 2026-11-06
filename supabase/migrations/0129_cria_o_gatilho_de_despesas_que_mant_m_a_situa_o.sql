CREATE TRIGGER programacoes_saidas_situacao_termino
AFTER INSERT OR UPDATE OF frequencia, data_inicio, dia_vencimento, total_parcelas, repeticoes, cancelada
ON public.programacoes_saidas
FOR EACH ROW EXECUTE FUNCTION public.fn_atualizar_situacao_termino_da_programacao()