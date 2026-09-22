import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { personService, type DirectoryPerson, type Pessoa } from '../services/personService';
import { userService } from '../services/userService';
import { UserRole } from '../types';

interface DirectoryPeopleOptions {
  role: UserRole;
  page: number;
  pageSize: number;
  search?: string;
  onlyActive: boolean;
}

export function useDirectoryPeople(options: DirectoryPeopleOptions) {
  const queryClient = useQueryClient();
  const search = options.search ?? '';
  const directoryQuery = useQuery({
    queryKey: ['directory-people', options.role, options.page, options.pageSize, search, options.onlyActive],
    queryFn: () => personService.getDirectoryPage(options),
  });

  const createMutation = useMutation({
    mutationFn: (input: { nome: string; cpf?: string | null; papel?: UserRole | null }) => personService.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['directory-people'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Pick<Pessoa, 'nome' | 'cpf' | 'ativo' | 'papel'>> }) => personService.update(id, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['directory-people'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => userService.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['directory-people'] }),
  });

  return {
    people: (directoryQuery.data?.data ?? []) as DirectoryPerson[],
    total: directoryQuery.data?.total ?? 0,
    isLoading: directoryQuery.isLoading,
    isFetching: directoryQuery.isFetching,
    isError: directoryQuery.isError,
    error: directoryQuery.error,
    refetch: directoryQuery.refetch,
    createPerson: createMutation.mutateAsync,
    updatePerson: updateMutation.mutateAsync,
    deleteUser: deleteMutation.mutateAsync,
  };
}

export type { DirectoryPeopleOptions };
export type { DirectoryPerson };

export default useDirectoryPeople;
