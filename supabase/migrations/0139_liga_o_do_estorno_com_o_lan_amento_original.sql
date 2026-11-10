ALTER TABLE public.lancamentos_financeiros
  ADD CONSTRAINT lancamentos_financeiros_estorno_de_fkey
  FOREIGN KEY (estorno_de) REFERENCES public.lancamentos_financeiros(id) ON DELETE SET NULL