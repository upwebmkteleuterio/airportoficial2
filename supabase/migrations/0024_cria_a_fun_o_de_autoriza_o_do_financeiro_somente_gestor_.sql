CREATE OR REPLACE FUNCTION public.can_manage_financeiro()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT COALESCE(public.current_user_role() = 'GESTOR', false);
$$