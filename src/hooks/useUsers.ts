/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userService, type CreateUserInput } from '../services/userService';
import { UserRole, Usuario } from '../types';

interface UsersOptions {
  page?: number;
  pageSize?: number;
  role?: UserRole;
  status?: Usuario['status'];
  search?: string;
  empresaId?: string;
  turmaId?: string;
  enabled?: boolean;
}

interface UsersQueryData {
  data: Usuario[];
  total: number;
}

export function useUsers(options: UsersOptions = {}) {
  const queryClient = useQueryClient();
  const isPaginated = options.page !== undefined;
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? 50;
  const role = options.role;
  const status = options.status;
  const search = options.search ?? '';
  const empresaId = options.empresaId;
  const turmaId = options.turmaId;
  const enabled = options.enabled ?? true;

  const usersQuery = useQuery<UsersQueryData>({
    queryKey: isPaginated
      ? ['users', 'page', page, pageSize, { role, status, search, empresaId, turmaId }]
      : ['users', 'all', { role, status, search, empresaId, turmaId }],
    queryFn: async () => {
      if (!isPaginated) {
        const data = await userService.getAll({ role, status, search, empresaId, turmaId });
        return { data, total: data.length };
      }
      return userService.getPage({ page, pageSize, role, status, search, empresaId, turmaId });
    },
    enabled,
  });

  const createUserMutation = useMutation({
    mutationFn: (newUser: CreateUserInput) => userService.create(newUser),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['directory-people'] });
    }
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Usuario> }) => userService.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['directory-people'] });
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => userService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['directory-people'] });
    }
  });

  return {
    users: usersQuery.data?.data || [],
    total: usersQuery.data?.total || 0,
    isLoading: usersQuery.isLoading,
    isFetching: usersQuery.isFetching,
    isError: usersQuery.isError,
    error: usersQuery.error,
    refetch: usersQuery.refetch,
    createUser: createUserMutation.mutateAsync,
    updateUser: updateUserMutation.mutateAsync,
    deleteUser: deleteUserMutation.mutateAsync,
  };
}

export type { UsersOptions };
