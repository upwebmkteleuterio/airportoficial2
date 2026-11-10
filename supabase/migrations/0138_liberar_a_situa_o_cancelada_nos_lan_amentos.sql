DO $$
BEGIN
  ALTER TABLE public.lancamentos_financeiros DROP CONSTRAINT IF EXISTS lancamentos_financeiros_status_check;
  ALTER TABLE public.lancamentos_financeiros ADD CONSTRAINT lancamentos_financeiros_status_check
    CHECK (status = ANY (ARRAY['PREVISTO','EFETIVADO','CANCELADO']));

  ALTER TABLE public.lancamentos_financeiros DROP CONSTRAINT IF EXISTS lancamentos_financeiros_valor_check;
  ALTER TABLE public.lancamentos_financeiros ADD CONSTRAINT lancamentos_financeiros_valor_check
    CHECK (((status = 'EFETIVADO') AND (valor > 0)) OR ((status <> 'EFETIVADO') AND (valor >= 0)));
END $$