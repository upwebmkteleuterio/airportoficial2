DO $bloco$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT id FROM public.programacoes_saidas LOOP
    PERFORM public.fn_recalcular_situacao_termino(r.id);
  END LOOP;
END
$bloco$