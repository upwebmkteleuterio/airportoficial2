/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentService } from '../services/documentService';
import { Documento } from '../types';

export function useDocuments(userIds?: string[]) {
  const queryClient = useQueryClient();
  const isScoped = userIds !== undefined;

  const documentsQuery = useQuery({
    queryKey: isScoped ? ['documents', 'users', userIds] : ['documents'],
    queryFn: () => isScoped ? documentService.getByUserIds(userIds) : documentService.getAll(),
  });

  const createDocumentMutation = useMutation({
    mutationFn: (newDoc: Omit<Documento, 'id' | 'data_criacao'>) => documentService.create(newDoc),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    }
  });

  const updateDocumentMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Documento> }) => documentService.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    }
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: (id: string) => documentService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    }
  });

  return {
    documents: documentsQuery.data || [],
    isLoading: documentsQuery.isLoading,
    isFetching: documentsQuery.isFetching,
    isError: documentsQuery.isError,
    error: documentsQuery.error,
    refetch: documentsQuery.refetch,
    createDocument: createDocumentMutation.mutateAsync,
    updateDocument: updateDocumentMutation.mutateAsync,
    deleteDocument: deleteDocumentMutation.mutateAsync,
  };
}

export function useStudentDocuments(userId: string | null) {
  const queryClient = useQueryClient();

  const studentDocsQuery = useQuery({
    queryKey: ['documents', 'student', userId],
    queryFn: () => userId ? documentService.getByPersonId(userId, userId) : Promise.resolve([]),
    enabled: !!userId,
  });

  const uploadDocMutation = useMutation({
    mutationFn: (newDoc: Omit<Documento, 'id' | 'data_criacao' | 'usuario_id'>) => {
      if (!userId) throw new Error('No user logged in');
      return documentService.create({
        ...newDoc,
        pessoa_id: userId,
        usuario_id: userId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', 'student', userId] });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    }
  });

  const uploadFileMutation = useMutation({
    mutationFn: (input: Omit<Parameters<typeof documentService.uploadFile>[0], 'pessoa_id' | 'usuario_id'>) => {
      if (!userId) throw new Error('No user logged in');
      return documentService.uploadFile({ ...input, pessoa_id: userId, usuario_id: userId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', 'student', userId] });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    }
  });

  return {
    documents: studentDocsQuery.data || [],
    isLoading: studentDocsQuery.isLoading,
    uploadDocument: uploadDocMutation.mutateAsync,
    uploadDocumentFile: uploadFileMutation.mutateAsync,
    isUploading: uploadDocMutation.isPending || uploadFileMutation.isPending,
  };
}
