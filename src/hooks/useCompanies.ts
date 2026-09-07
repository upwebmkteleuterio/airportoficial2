/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { companyService } from '../services/companyService';
import { Empresa } from '../types';

export function useCompanies() {
  const queryClient = useQueryClient();

  const companiesQuery = useQuery({
    queryKey: ['companies'],
    queryFn: () => companyService.getAll(),
  });

  const createCompanyMutation = useMutation({

    mutationFn: (newCompany: Omit<Empresa, 'id' | 'hash_link_inscricao'>) => {
      const hash = `${newCompany.nome_fantasia.toLowerCase().replace(/\s+/g, '-')}-link-${Math.random().toString(36).substr(2, 5)}`;
      return companyService.create({ ...newCompany, hash_link_inscricao: hash });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
    }
  });

  const updateCompanyMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Empresa> }) => companyService.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
    }
  });

  const deleteCompanyMutation = useMutation({
    mutationFn: (id: string) => companyService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
    }
  });

  return {
    companies: companiesQuery.data || [],
    isLoading: companiesQuery.isLoading,
    isError: companiesQuery.isError,
    createCompany: createCompanyMutation.mutateAsync,

    isCreating: createCompanyMutation.isPending,
    updateCompany: updateCompanyMutation.mutateAsync,
    isUpdating: updateCompanyMutation.isPending,
    deleteCompany: deleteCompanyMutation.mutateAsync,
    isDeleting: deleteCompanyMutation.isPending,
  };
}
