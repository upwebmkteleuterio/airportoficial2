import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { personService, type Pessoa } from '../services/personService';

export function usePeople(options: { activeOnly?: boolean; directoryOnly?: boolean; studentOnly?: boolean; search?: string; page?: number; pageSize?: number } = {}) {
  const queryClient = useQueryClient();
  const search = options.search ?? '';
  const directoryOnly = options.directoryOnly ?? false;
  const studentOnly = options.studentOnly ?? false;
  const isPaginated = options.page !== undefined;
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? 50;
  const peopleQuery = useQuery<{ data: Pessoa[]; total: number }>({
    queryKey: ['people', { search, directoryOnly, studentOnly, activeOnly: options.activeOnly, page: isPaginated ? page : null, pageSize: isPaginated ? pageSize : null }],
    queryFn: async ({ signal }) => {
      if (isPaginated) return personService.getPage({ page, pageSize, search, activeOnly: options.activeOnly, signal });
      const data = studentOnly ? await personService.getStudents(search) : await personService.getAll(search, directoryOnly);
      return { data, total: data.length };
    },
  });

  const createMutation = useMutation({
    mutationFn: (input: { nome: string; cpf?: string | null; papel?: import('../types').UserRole | null }) => personService.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['people'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Pick<Pessoa, 'nome' | 'cpf' | 'ativo'>> }) => personService.update(id, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['people'] }),
  });

  const people = (peopleQuery.data?.data ?? []).filter((person) => !options.activeOnly || person.ativo);
  return {
    people,
    total: peopleQuery.data?.total ?? 0,
    isLoading: peopleQuery.isLoading,
    isFetching: peopleQuery.isFetching,
    isError: peopleQuery.isError,
    error: peopleQuery.error,
    refetch: peopleQuery.refetch,
    createPerson: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updatePerson: updateMutation.mutateAsync,
  };
}

export type { Pessoa };
