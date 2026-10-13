/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentTemplateService } from '../services/documentTemplateService';
import type { DocumentTemplateInput } from '../types/documentTemplates';

const QUERY_KEY = ['document-templates'];

export function useDocumentTemplates() {
  const queryClient = useQueryClient();

  const templatesQuery = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => documentTemplateService.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: (input: DocumentTemplateInput) => documentTemplateService.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<DocumentTemplateInput> }) =>
      documentTemplateService.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => documentTemplateService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  return {
    templates: templatesQuery.data ?? [],
    isLoading: templatesQuery.isLoading,
    isError: templatesQuery.isError,
    error: templatesQuery.error,
    refetch: templatesQuery.refetch,
    createTemplate: createMutation.mutateAsync,
    updateTemplate: updateMutation.mutateAsync,
    deleteTemplate: deleteMutation.mutateAsync,
    isSaving: createMutation.isPending || updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

export default useDocumentTemplates;
