import { useEffect } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { personService, type DirectoryPerson, type Pessoa } from '../services/personService';
import { userService } from '../services/userService';
import { UserRole } from '../types';
import { withQueryTimeout } from '../utils/queryTimeout';

interface DirectoryPeopleOptions {
  role: UserRole;
  page: number;
  pageSize: number;
  search?: string;
  onlyActive: boolean;
}

export const directoryPeopleQueryKey = (options: DirectoryPeopleOptions) => [
  'directory-people',
  options.role,
  options.page,
  options.pageSize,
  options.search ?? '',
  options.onlyActive,
] as const;

const directoryStaleTime = 30_000;

export function useDirectoryPeople(options: DirectoryPeopleOptions) {
  const queryClient = useQueryClient();
  const { role, page, pageSize, onlyActive } = options;
  const search = options.search ?? '';
  const queryKey = directoryPeopleQueryKey({ ...options, search });
  const directoryQuery = useQuery({
    queryKey,
    queryFn: ({ signal }) => withQueryTimeout(
      (requestSignal) => personService.getDirectoryPage({ ...options, search, signal: requestSignal }),
      signal,
    ),
    placeholderData: keepPreviousData,
    retry: false,
    staleTime: directoryStaleTime,
  });

  useEffect(() => {
    if (directoryQuery.isPlaceholderData || !directoryQuery.data?.total) return;

    const totalPages = Math.ceil(directoryQuery.data.total / pageSize);
    const adjacentPages = [page - 1, page + 1]
      .filter((adjacentPage) => adjacentPage >= 1 && adjacentPage <= totalPages);

    adjacentPages.forEach((adjacentPage) => {
      const adjacentOptions = { role, page: adjacentPage, pageSize, search, onlyActive };
      void queryClient.prefetchQuery({
        queryKey: directoryPeopleQueryKey(adjacentOptions),
        queryFn: ({ signal }) => withQueryTimeout(
          (requestSignal) => personService.getDirectoryPage({ ...adjacentOptions, signal: requestSignal }),
          signal,
        ),
        retry: false,
        staleTime: directoryStaleTime,
      });
    });
  }, [directoryQuery.data, directoryQuery.isPlaceholderData, onlyActive, page, pageSize, queryClient, role, search]);

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
