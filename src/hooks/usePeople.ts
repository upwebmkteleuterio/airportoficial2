import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { personService, type Pessoa } from '../services/personService';

export function usePeople(options: { activeOnly?: boolean; directoryOnly?: boolean; studentOnly?: boolean; search?: string } = {}) {
  const queryClient = useQueryClient();
  const search = options.search ?? '';
  const directoryOnly = options.directoryOnly ?? false;
  const studentOnly = options.studentOnly ?? false;
  const peopleQuery = useQuery<Pessoa[]>({
    queryKey: ['people', { search, directoryOnly, studentOnly }],
    queryFn: () => studentOnly ? personService.getStudents(search) : personService.getAll(search, directoryOnly),
  });

  const createMutation = useMutation({
    mutationFn: (input: { nome: string; cpf?: string | null; papel?: import('../types').UserRole | null }) => personService.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['people'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Pick<Pessoa, 'nome' | 'cpf' | 'ativo'>> }) => personService.update(id, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['people'] }),
  });

  const people = (peopleQuery.data ?? []).filter((person) => !options.activeOnly || person.ativo);
  return {
    people,
    isLoading: peopleQuery.isLoading,
    isError: peopleQuery.isError,
    error: peopleQuery.error,
    refetch: peopleQuery.refetch,
    createPerson: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updatePerson: updateMutation.mutateAsync,
  };
}

export type { Pessoa };
