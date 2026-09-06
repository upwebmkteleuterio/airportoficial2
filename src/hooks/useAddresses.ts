/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { addressService } from '../services/addressService';
import { Endereco } from '../types';

export function useAddresses() {
  const queryClient = useQueryClient();

  const addressesQuery = useQuery({
    queryKey: ['addresses'],
    queryFn: () => addressService.getAll(),
  });

  const createAddressMutation = useMutation({
    mutationFn: (newAddress: Omit<Endereco, 'id' | 'ativo' | 'created_at'> & Partial<Pick<Endereco, 'ativo' | 'created_at'>>) => addressService.create(newAddress),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
    }
  });

  const updateAddressMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Endereco> }) => addressService.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
    }
  });

  const deleteAddressMutation = useMutation({
    mutationFn: (id: string) => addressService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
    }
  });

  return {
    addresses: addressesQuery.data || [],
    isLoading: addressesQuery.isLoading,
    createAddress: createAddressMutation.mutateAsync,
    updateAddress: updateAddressMutation.mutateAsync,
    deleteAddress: deleteAddressMutation.mutateAsync,
    isCreating: createAddressMutation.isPending,
    isUpdating: updateAddressMutation.isPending,
    isDeleting: deleteAddressMutation.isPending,
  };
}
