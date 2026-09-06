/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { classService } from '../services/classService';
import { Turma, Matricula } from '../types';

interface ClassesOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  courseIds?: string[];
}

interface ClassesQueryData {
  data: Turma[];
  total: number;
}

export function useClasses(options: ClassesOptions = {}) {
  const queryClient = useQueryClient();
  const isPaginated = options.page !== undefined;
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? 6;
  const search = options.search ?? '';
  const courseIds = options.courseIds;

  // Queries
  const classesQuery = useQuery<ClassesQueryData>({
    queryKey: isPaginated
      ? ['classes', 'page', page, pageSize, { search, courseIds: courseIds ?? [] }]
      : ['classes', 'all'],
    queryFn: async () => {
      if (!isPaginated) {
        const data = await classService.getAll();
        return { data, total: data.length };
      }
      return classService.getPage({ page, pageSize, search, courseIds });
    },
  });

  // Mutations
  const createClassMutation = useMutation({
    mutationFn: (newClass: Omit<Turma, 'id' | 'id_interno_escola' | 'qt_alunos_matriculados'>) => classService.create(newClass),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
    }
  });

  const updateClassMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Turma> }) => classService.update(id, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      queryClient.invalidateQueries({ queryKey: ['class', variables.id] });
    }
  });

  const saveInstrutoresForTurmaMutation = useMutation({
    mutationFn: ({ turmaId, instrutores }: { turmaId: string; instrutores: { instrutor_id: string; funcao: string }[] }) =>
      classService.saveInstrutoresForTurma(turmaId, instrutores),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['class-instructors', variables.turmaId] });
    }
  });

  const deleteClassMutation = useMutation({
    mutationFn: (id: string) => classService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
    }
  });

  return {
    classes: classesQuery.data?.data || [],
    total: classesQuery.data?.total || 0,
    isLoading: classesQuery.isLoading,
    isError: classesQuery.isError,
    createClass: createClassMutation.mutateAsync,
    isCreating: createClassMutation.isPending,
    updateClass: updateClassMutation.mutateAsync,
    isUpdating: updateClassMutation.isPending,
    getInstrutoresByTurma: classService.getInstrutoresByTurma,
    saveInstrutoresForTurma: saveInstrutoresForTurmaMutation.mutateAsync,
    isSavingInstrutoresForTurma: saveInstrutoresForTurmaMutation.isPending,
    deleteClass: deleteClassMutation.mutateAsync,
    isDeleting: deleteClassMutation.isPending
  };
}

export function useClassDetails(classId: string | null) {
  const queryClient = useQueryClient();

  // Queries
  const classQuery = useQuery({
    queryKey: ['class', classId],
    queryFn: () => classId ? classService.getById(classId).then(res => res ?? null) : Promise.resolve(null),
    enabled: !!classId,
  });

  const matriculasQuery = useQuery({
    queryKey: ['matriculas', classId],
    queryFn: () => classId ? classService.getMatriculasByTurma(classId) : Promise.resolve([]),
    enabled: !!classId,
  });

  const diarioQuery = useQuery({
    queryKey: ['diario', classId],
    queryFn: () => classId ? classService.getDiarioByTurma(classId) : Promise.resolve([]),
    enabled: !!classId,
  });

  const instructorsQuery = useQuery({
    queryKey: ['class-instructors', classId],
    queryFn: () => classId ? classService.getInstrutoresByTurma(classId) : Promise.resolve([]),
    enabled: !!classId,
  });

  // Mutations
  const createMatriculaMutation = useMutation({
    mutationFn: (newMat: Omit<Matricula, 'id' | 'codigo_re' | 'percentual_presenca'>) => classService.createMatricula(newMat),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matriculas', classId] });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      queryClient.invalidateQueries({ queryKey: ['class', classId] });
    }
  });

  const updateMatriculaMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Matricula> }) => classService.updateMatricula(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matriculas', classId] });
    }
  });

  const deleteMatriculaMutation = useMutation({
    mutationFn: (id: string) => classService.deleteMatricula(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matriculas', classId] });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      queryClient.invalidateQueries({ queryKey: ['class', classId] });
    }
  });

  const saveDiarioPresencaMutation = useMutation({
    mutationFn: ({ matriculaId, dataAula, horarioPeriodo, presente }: { matriculaId: string; dataAula: string; horarioPeriodo: string; presente: boolean }) =>
      classService.saveDiarioPresenca(matriculaId, dataAula, horarioPeriodo, presente),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diario', classId] });
      queryClient.invalidateQueries({ queryKey: ['matriculas', classId] });
    }
  });

  const saveInstructorsMutation = useMutation({
    mutationFn: (instructors: { instrutor_id: string; funcao: string }[]) =>
      classId ? classService.saveInstrutoresForTurma(classId, instructors) : Promise.resolve([]),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-instructors', classId] });
    }
  });

  return {
    classData: classQuery.data,
    isLoadingClass: classQuery.isLoading,
    matriculas: matriculasQuery.data || [],
    isLoadingMatriculas: matriculasQuery.isLoading,
    diario: diarioQuery.data || [],
    isLoadingDiario: diarioQuery.isLoading,
    instructors: instructorsQuery.data || [],
    isLoadingInstructors: instructorsQuery.isLoading,

    createMatricula: createMatriculaMutation.mutateAsync,
    isCreatingMatricula: createMatriculaMutation.isPending,
    updateMatricula: updateMatriculaMutation.mutateAsync,
    deleteMatricula: deleteMatriculaMutation.mutateAsync,
    saveDiarioPresenca: saveDiarioPresencaMutation.mutateAsync,
    saveInstructors: saveInstructorsMutation.mutateAsync,
    isSavingInstructors: saveInstructorsMutation.isPending,
  };
}
