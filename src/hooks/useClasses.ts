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
  courseSearch?: string;
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
  const courseSearch = options.courseSearch ?? '';

  // Queries
  const classesQuery = useQuery<ClassesQueryData>({
    queryKey: isPaginated
      ? ['classes', 'page', page, pageSize, { search, courseSearch }]
      : ['classes', 'all'],
    queryFn: async () => {
      if (!isPaginated) {
        const data = await classService.getAll();
        return { data, total: data.length };
      }
      return classService.getPage({ page, pageSize, search, courseSearch });
    },
  });

  // Mutations
  const createClassMutation = useMutation({
    mutationFn: (newClass: Omit<Turma, 'id' | 'qt_alunos_matriculados'>) => classService.create(newClass),
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

  const cancelClassMutation = useMutation({
    mutationFn: (id: string) => classService.cancel(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      queryClient.invalidateQueries({ queryKey: ['class', id] });
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
    getClassEditability: classService.getEditability,
    createClass: createClassMutation.mutateAsync,
    isCreating: createClassMutation.isPending,
    updateClass: updateClassMutation.mutateAsync,
    isUpdating: updateClassMutation.isPending,
    getInstrutoresByTurma: classService.getInstrutoresByTurma,
    saveInstrutoresForTurma: saveInstrutoresForTurmaMutation.mutateAsync,
    isSavingInstrutoresForTurma: saveInstrutoresForTurmaMutation.isPending,
    cancelClass: cancelClassMutation.mutateAsync,
    isCancelling: cancelClassMutation.isPending,
    deleteClass: deleteClassMutation.mutateAsync,
    isDeleting: deleteClassMutation.isPending
  };
}

export interface ClassDetailsOptions {
  page: number;
  pageSize: number;
  sortOrder: string;
  search: string;
}

export function useClassDetails(classId: string | null, options: ClassDetailsOptions) {
  const queryClient = useQueryClient();

  // Queries
  const classQuery = useQuery({
    queryKey: ['class', classId],
    queryFn: () => classId ? classService.getById(classId).then(res => res ?? null) : Promise.resolve(null),
    enabled: !!classId,
  });

  const matriculasPageQuery = useQuery({
    queryKey: ['matriculas', classId, 'page', options.page, options.pageSize, options.sortOrder, options.search],
    queryFn: () => classId ? classService.getMatriculasPage({ turmaId: classId, ...options }) : Promise.resolve({ data: [], total: 0 }),
    enabled: !!classId && !!classQuery.data,
  });

  const allMatriculasQuery = useQuery({
    queryKey: ['matriculas-complete', classId],
    queryFn: () => classId ? classService.getAllMatriculasByTurma(classId) : Promise.resolve([]),
    enabled: !!classId && !!classQuery.data,
  });

  const matriculatedAlunoIdsQuery = useQuery({
    queryKey: ['matriculated-aluno-ids', classId],
    queryFn: () => classId ? classService.getMatriculatedAlunoIds(classId) : Promise.resolve([]),
    enabled: !!classId && !!classQuery.data,
  });

  const diarioQuery = useQuery({
    queryKey: ['diario', classId],
    queryFn: () => classId ? classService.getDiarioByTurma(classId) : Promise.resolve([]),
    enabled: !!classId && !!classQuery.data,
  });

  const instructorsQuery = useQuery({
    queryKey: ['class-instructors', classId],
    queryFn: () => classId ? classService.getInstrutoresByTurma(classId) : Promise.resolve([]),
    enabled: !!classId && !!classQuery.data,
  });

  // Mutations
  const createMatriculaMutation = useMutation({
    mutationFn: (newMat: Omit<Matricula, 'id' | 'codigo_re' | 'percentual_presenca'>) => classService.createMatricula(newMat),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matriculas', classId] });
      queryClient.invalidateQueries({ queryKey: ['matriculas-complete', classId] });
      queryClient.invalidateQueries({ queryKey: ['matriculated-aluno-ids', classId] });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      queryClient.invalidateQueries({ queryKey: ['class', classId] });
    }
  });

  const updateMatriculaMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Matricula> }) => classService.updateMatricula(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matriculas', classId] });
      queryClient.invalidateQueries({ queryKey: ['matriculas-complete', classId] });
      queryClient.invalidateQueries({ queryKey: ['matriculated-aluno-ids', classId] });
    }
  });

  const deleteMatriculaMutation = useMutation({
    mutationFn: (id: string) => classService.deleteMatricula(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matriculas', classId] });
      queryClient.invalidateQueries({ queryKey: ['matriculas-complete', classId] });
      queryClient.invalidateQueries({ queryKey: ['matriculated-aluno-ids', classId] });
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
      queryClient.invalidateQueries({ queryKey: ['matriculas-complete', classId] });
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
    matriculas: matriculasPageQuery.data?.data || [],
    matriculasTotal: matriculasPageQuery.data?.total || 0,
    matriculasPage: options.page,
    matriculasPageSize: options.pageSize,
    isLoadingMatriculas: matriculasPageQuery.isLoading,
    allMatriculas: allMatriculasQuery.data || [],
    isLoadingAllMatriculas: allMatriculasQuery.isLoading,
    matriculatedAlunoIds: matriculatedAlunoIdsQuery.data || [],
    diario: diarioQuery.data || [],
    isLoadingDiario: diarioQuery.isLoading,
    instructors: instructorsQuery.data || [],
    isLoadingInstructors: instructorsQuery.isLoading,

    createMatricula: createMatriculaMutation.mutateAsync,
    isCreatingMatricula: createMatriculaMutation.isPending,
    updateMatricula: updateMatriculaMutation.mutateAsync,
    isUpdatingMatricula: updateMatriculaMutation.isPending,
    deleteMatricula: deleteMatriculaMutation.mutateAsync,
    isDeletingMatricula: deleteMatriculaMutation.isPending,
    saveDiarioPresenca: saveDiarioPresencaMutation.mutateAsync,
    isSavingDiario: saveDiarioPresencaMutation.isPending,
    saveInstructors: saveInstructorsMutation.mutateAsync,
    isSavingInstructors: saveInstructorsMutation.isPending,
  };
}
