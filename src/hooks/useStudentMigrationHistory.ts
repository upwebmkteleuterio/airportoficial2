import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  studentMigrationHistoryService,
  type StudentMigrationHistoryRecord,
} from '../services/studentMigrationHistoryService';
import type { StudentMigrationSuccessfulClass } from '../services/studentMigrationService';

export const STUDENT_MIGRATION_HISTORY_QUERY_KEY = ['student-migration-history'];

export function useStudentMigrationHistory(enabled = true) {
  const queryClient = useQueryClient();
  const historyQuery = useQuery<StudentMigrationHistoryRecord[]>({
    queryKey: STUDENT_MIGRATION_HISTORY_QUERY_KEY,
    queryFn: studentMigrationHistoryService.getAll,
    enabled,
  });
  const saveMutation = useMutation({
    mutationFn: ({ successfulClasses, sourceFile }: { successfulClasses: StudentMigrationSuccessfulClass[]; sourceFile?: string }) =>
      studentMigrationHistoryService.saveBatch(successfulClasses, sourceFile),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STUDENT_MIGRATION_HISTORY_QUERY_KEY });
    },
  });

  return {
    history: historyQuery.data ?? [],
    isLoading: historyQuery.isLoading,
    isError: historyQuery.isError,
    error: historyQuery.error,
    refetch: historyQuery.refetch,
    saveHistory: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
  };
}
