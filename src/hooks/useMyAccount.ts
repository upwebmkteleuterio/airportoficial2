import { useMutation, useQuery } from '@tanstack/react-query';
import { useSessionContext } from '../contexts/SessionContext';
import { accountService } from '../services/accountService';

export function useMyAccount() {
  const { session } = useSessionContext();
  const profileQuery = useQuery({
    queryKey: ['my-account', session?.user.id],
    queryFn: accountService.getCurrentProfile,
    enabled: Boolean(session?.user.id),
  });
  const passwordMutation = useMutation({
    mutationFn: accountService.updatePassword,
  });

  return {
    profile: profileQuery.data,
    isLoadingProfile: profileQuery.isLoading,
    profileError: profileQuery.error,
    refetchProfile: profileQuery.refetch,
    updatePassword: passwordMutation.mutateAsync,
    isUpdatingPassword: passwordMutation.isPending,
  };
}

export default useMyAccount;
