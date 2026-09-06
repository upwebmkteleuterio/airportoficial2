import { supabase } from '../integrations/supabase/client';
import { Turma, Matricula, DiarioClasse } from '../types';
import { getAttendancePeriodsForShift } from '../utils/attendanceRules';
import { newServiceId, serviceError } from './supabaseErrors';

interface TurmaInstrutorRel {
  id: string;
  turma_id: string;
  instrutor_id: string;
  funcao: string;
}

export interface ClassPageOptions {
  page: number;
  pageSize: number;
  search?: string;
  courseIds?: string[];
}

export interface ClassPage {
  data: Turma[];
  total: number;
}

async function getClassById(id: string): Promise<Turma | undefined> {
  const { data, error } = await supabase
    .from('turmas')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw serviceError(`Não foi possível carregar a turma ${id}`, error);
  return data ? data as Turma : undefined;
}

export const classService = {
  // --- Turmas CRUD ---
  getAll: async (): Promise<Turma[]> => {
    const { data, error } = await supabase
      .from('turmas')
      .select('*');
    if (error) throw serviceError('Não foi possível carregar as turmas', error);
    return (data ?? []) as Turma[];
  },

  getPage: async ({ page, pageSize, search, courseIds }: ClassPageOptions): Promise<ClassPage> => {
    const from = Math.max(0, page - 1) * pageSize;
    const to = from + pageSize - 1;
    let query = supabase
      .from('turmas')
      .select('*', { count: 'exact' })
      .order('id_interno_escola', { ascending: true })
      .range(from, to);

    if (courseIds) {
      if (courseIds.length === 0) return { data: [], total: 0 };
      query = query.in('curso_id', courseIds);
    }
    const term = search?.trim();
    if (term) {
      const escapedTerm = term.replace(/[%,()]/g, ' ');
      const searchFilters = [`id_anac.ilike.%${escapedTerm}%`];
      const internalTerm = term.toLowerCase().startsWith('t-op-') ? term.slice(5) : term;
      if (/^\d+$/.test(internalTerm)) searchFilters.push(`id_interno_escola.eq.${internalTerm}`);
      query = query.or(searchFilters.join(','));
    }

    const { data, count, error } = await query;
    if (error) throw serviceError('Não foi possível carregar as turmas', error);
    return { data: (data ?? []) as Turma[], total: count ?? 0 };
  },

  getById: async (id: string): Promise<Turma | undefined> => getClassById(id),

  create: async (turma: Omit<Turma, 'id' | 'id_interno_escola' | 'qt_alunos_matriculados'> & { id?: string }): Promise<Turma> => {
    const { data: existingClasses, error: listError } = await supabase
      .from('turmas')
      .select('id_interno_escola');
    if (listError) throw serviceError('Não foi possível calcular o identificador interno da turma', listError);

    const internalIds = ((existingClasses ?? []) as Array<{ id_interno_escola: number }>).map(
      (item) => Number(item.id_interno_escola)
    );
    const nextIdInterno = internalIds.length > 0 ? Math.max(...internalIds) + 1 : 100;
    const newClass = {
      ...turma,
      id: turma.id || newServiceId('turma'),
      id_interno_escola: nextIdInterno,
      qt_alunos_matriculados: 0
    };

    const { data, error } = await supabase
      .from('turmas')
      .insert(newClass)
      .select()
      .single();
    if (error) throw serviceError('Não foi possível criar a turma', error);
    return data as Turma;
  },

  update: async (id: string, updates: Partial<Turma>): Promise<Turma> => {
    const { id: _ignoredId, ...classUpdates } = updates;
    const { data, error } = await supabase
      .from('turmas')
      .update(classUpdates)
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw serviceError(`Não foi possível atualizar a turma ${id}`, error);
    if (!data) throw new Error(`Não foi possível atualizar a turma ${id}: turma não encontrada`);
    return data as Turma;
  },

  delete: async (id: string): Promise<boolean> => {
    const { data: matriculas, error: matriculasError } = await supabase
      .from('matriculas')
      .select('id')
      .eq('turma_id', id);
    if (matriculasError) throw serviceError(`Não foi possível consultar as matrículas da turma ${id}`, matriculasError);

    const matriculaIds = ((matriculas ?? []) as Array<{ id: string }>).map((matricula) => matricula.id);
    if (matriculaIds.length > 0) {
      const { error: diarioError } = await supabase
        .from('diario_classe')
        .delete()
        .in('matricula_id', matriculaIds);
      if (diarioError) throw serviceError(`Não foi possível excluir o diário da turma ${id}`, diarioError);
    }

    const { error: deleteMatriculasError } = await supabase
      .from('matriculas')
      .delete()
      .eq('turma_id', id);
    if (deleteMatriculasError) throw serviceError(`Não foi possível excluir as matrículas da turma ${id}`, deleteMatriculasError);

    const { error: relationsError } = await supabase
      .from('turma_instrutores')
      .delete()
      .eq('turma_id', id);
    if (relationsError) throw serviceError(`Não foi possível excluir os instrutores da turma ${id}`, relationsError);

    const { error } = await supabase
      .from('turmas')
      .delete()
      .eq('id', id);
    if (error) throw serviceError(`Não foi possível excluir a turma ${id}`, error);
    return true;
  },

  // --- Matrículas (Alunos na Turma) CRUD ---
  getMatriculasByTurma: async (turmaId: string): Promise<Matricula[]> => {
    const { data, error } = await supabase
      .from('matriculas')
      .select('*')
      .eq('turma_id', turmaId);
    if (error) throw serviceError(`Não foi possível carregar as matrículas da turma ${turmaId}`, error);
    return (data ?? []) as Matricula[];
  },

  getMatriculasByAluno: async (alunoId: string): Promise<Matricula[]> => {
    const { data, error } = await supabase
      .from('matriculas')
      .select('*')
      .eq('aluno_id', alunoId);
    if (error) throw serviceError(`Não foi possível carregar as matrículas do aluno ${alunoId}`, error);
    return (data ?? []) as Matricula[];
  },

  createMatricula: async (matricula: Omit<Matricula, 'id' | 'codigo_re' | 'percentual_presenca'>): Promise<Matricula> => {
    const { data: existingMatriculas, error: listError } = await supabase
      .from('matriculas')
      .select('codigo_re');
    if (listError) throw serviceError('Não foi possível calcular o código RE da matrícula', listError);

    const reCodes = ((existingMatriculas ?? []) as Array<{ codigo_re: number }>).map(
      (item) => Number(item.codigo_re)
    );
    const nextRe = reCodes.length > 0 ? Math.max(...reCodes) + 1 : 1001;
    const newMat = {
      ...matricula,
      id: newServiceId('mat'),
      codigo_re: nextRe,
      percentual_presenca: 100,
      status_matricula: 'Ativo' as const
    };

    const { data, error } = await supabase
      .from('matriculas')
      .insert(newMat)
      .select()
      .single();
    if (error) throw serviceError('Não foi possível criar a matrícula', error);
    const createdMatricula = data as Matricula;

    const classData = await getClassById(matricula.turma_id);
    if (classData) {
      const { error: countError } = await supabase
        .from('turmas')
        .update({ qt_alunos_matriculados: classData.qt_alunos_matriculados + 1 })
        .eq('id', matricula.turma_id);
      if (countError) throw serviceError(`Não foi possível atualizar a quantidade de alunos da turma ${matricula.turma_id}`, countError);

      const start = new Date(classData.data_inicio + 'T00:00:00');
      const end = new Date(classData.data_termino + 'T00:00:00');
      const diarioRows: DiarioClasse[] = [];
      const current = new Date(start);
      while (current <= end) {
        diarioRows.push({
          id: newServiceId('freq'),
          matricula_id: createdMatricula.id,
          data_aula: current.toISOString().split('T')[0],
          horario_periodo: 'Tarde',
          presente: true
        });
        current.setDate(current.getDate() + 1);
      }

      if (diarioRows.length > 0) {
        const { error: diarioError } = await supabase
          .from('diario_classe')
          .insert(diarioRows);
        if (diarioError) throw serviceError(`Não foi possível gerar o diário da matrícula ${createdMatricula.id}`, diarioError);
      }
    }

    return createdMatricula;
  },

  updateMatricula: async (id: string, updates: Partial<Matricula>): Promise<Matricula> => {
    const { id: _ignoredId, ...matriculaUpdates } = updates;
    const { data, error } = await supabase
      .from('matriculas')
      .update(matriculaUpdates)
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw serviceError(`Não foi possível atualizar a matrícula ${id}`, error);
    if (!data) throw new Error(`Não foi possível atualizar a matrícula ${id}: matrícula não encontrada`);
    return data as Matricula;
  },

  deleteMatricula: async (id: string): Promise<boolean> => {
    const { data: matricula, error: findError } = await supabase
      .from('matriculas')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (findError) throw serviceError(`Não foi possível consultar a matrícula ${id}`, findError);
    if (!matricula) return false;

    const mat = matricula as Matricula;
    const { error: diarioError } = await supabase
      .from('diario_classe')
      .delete()
      .eq('matricula_id', id);
    if (diarioError) throw serviceError(`Não foi possível excluir o diário da matrícula ${id}`, diarioError);

    const { error: deleteError } = await supabase
      .from('matriculas')
      .delete()
      .eq('id', id);
    if (deleteError) throw serviceError(`Não foi possível excluir a matrícula ${id}`, deleteError);

    const classData = await getClassById(mat.turma_id);
    if (classData) {
      const { error: countError } = await supabase
        .from('turmas')
        .update({ qt_alunos_matriculados: Math.max(0, classData.qt_alunos_matriculados - 1) })
        .eq('id', mat.turma_id);
      if (countError) throw serviceError(`Não foi possível atualizar a quantidade de alunos da turma ${mat.turma_id}`, countError);
    }

    return true;
  },

  // --- Diário de Classe (Frequência) ---
  getDiarioByTurma: async (turmaId: string): Promise<DiarioClasse[]> => {
    const { data: matriculas, error: matriculasError } = await supabase
      .from('matriculas')
      .select('id')
      .eq('turma_id', turmaId);
    if (matriculasError) throw serviceError(`Não foi possível consultar as matrículas da turma ${turmaId}`, matriculasError);

    const matriculaIds = ((matriculas ?? []) as Array<{ id: string }>).map((matricula) => matricula.id);
    if (matriculaIds.length === 0) return [];

    const { data, error } = await supabase
      .from('diario_classe')
      .select('*')
      .in('matricula_id', matriculaIds);
    if (error) throw serviceError(`Não foi possível carregar o diário da turma ${turmaId}`, error);
    return (data ?? []) as DiarioClasse[];
  },

  saveDiarioPresenca: async (matriculaId: string, dataAula: string, horarioPeriodo: string, presente: boolean): Promise<DiarioClasse> => {
    const { data: existing, error: findError } = await supabase
      .from('diario_classe')
      .select('*')
      .eq('matricula_id', matriculaId)
      .eq('data_aula', dataAula)
      .eq('horario_periodo', horarioPeriodo)
      .maybeSingle();
    if (findError) throw serviceError('Não foi possível consultar o registro de presença', findError);

    let record: DiarioClasse;
    if (existing) {
      const { data, error } = await supabase
        .from('diario_classe')
        .update({ presente })
        .eq('id', (existing as DiarioClasse).id)
        .select()
        .single();
      if (error) throw serviceError('Não foi possível atualizar o registro de presença', error);
      record = data as DiarioClasse;
    } else {
      const newRecord = {
        id: newServiceId('freq'),
        matricula_id: matriculaId,
        data_aula: dataAula,
        horario_periodo: horarioPeriodo,
        presente
      };
      const { data, error } = await supabase
        .from('diario_classe')
        .insert(newRecord)
        .select()
        .single();
      if (error) throw serviceError('Não foi possível criar o registro de presença', error);
      record = data as DiarioClasse;
    }

    const { data: allStudentDiarios, error: diarioListError } = await supabase
      .from('diario_classe')
      .select('*')
      .eq('matricula_id', matriculaId);
    if (diarioListError) throw serviceError('Não foi possível recalcular a presença da matrícula', diarioListError);

    const { data: matricula, error: matriculaError } = await supabase
      .from('matriculas')
      .select('*')
      .eq('id', matriculaId)
      .maybeSingle();
    if (matriculaError) throw serviceError(`Não foi possível consultar a matrícula ${matriculaId}`, matriculaError);

    const diarios = (allStudentDiarios ?? []) as DiarioClasse[];
    const presentCount = diarios.filter((diario) => diario.presente).length;
    let totalCount = diarios.length;
    if (matricula) {
      const classData = await getClassById((matricula as Matricula).turma_id);
      if (classData) {
        const start = new Date(classData.data_inicio + 'T00:00:00');
        const end = new Date(classData.data_termino + 'T00:00:00');
        let days = 0;
        const current = new Date(start);
        while (current <= end) {
          days++;
          current.setDate(current.getDate() + 1);
        }
        const periods = getAttendancePeriodsForShift(classData.turno);
        totalCount = days * periods.length;
      }
    }
    const percentual = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 100;

    if (matricula) {
      const { error: updateError } = await supabase
        .from('matriculas')
        .update({ percentual_presenca: percentual })
        .eq('id', matriculaId);
      if (updateError) throw serviceError(`Não foi possível atualizar a presença da matrícula ${matriculaId}`, updateError);
    }

    return record;
  },

  // --- Vínculo Turma x Instrutores ---
  getTurmasByInstrutor: async (instrutorId: string): Promise<TurmaInstrutorRel[]> => {
    const { data, error } = await supabase
      .from('turma_instrutores')
      .select('*')
      .eq('instrutor_id', instrutorId);
    if (error) throw serviceError(`Não foi possível carregar as turmas do instrutor ${instrutorId}`, error);
    return (data ?? []) as TurmaInstrutorRel[];
  },

  getInstrutoresByTurma: async (turmaId: string): Promise<TurmaInstrutorRel[]> => {
    const { data, error } = await supabase
      .from('turma_instrutores')
      .select('*')
      .eq('turma_id', turmaId);
    if (error) throw serviceError(`Não foi possível carregar os instrutores da turma ${turmaId}`, error);
    return (data ?? []) as TurmaInstrutorRel[];
  },

  saveInstrutoresForTurma: async (turmaId: string, instrutores: { instrutor_id: string; funcao: string }[]): Promise<TurmaInstrutorRel[]> => {
    const { error: deleteError } = await supabase
      .from('turma_instrutores')
      .delete()
      .eq('turma_id', turmaId);
    if (deleteError) throw serviceError(`Não foi possível substituir os instrutores da turma ${turmaId}`, deleteError);

    const validInstrutores = instrutores.filter(({ instrutor_id }) =>
      Boolean(instrutor_id) && instrutor_id !== 'Não aplicável'
    );
    const newRels: TurmaInstrutorRel[] = validInstrutores.map((instrutor) => ({
      id: newServiceId('rel'),
      turma_id: turmaId,
      instrutor_id: instrutor.instrutor_id,
      funcao: instrutor.funcao
    }));
    if (newRels.length === 0) return [];

    const { data, error } = await supabase
      .from('turma_instrutores')
      .insert(newRels)
      .select();
    if (error) throw serviceError(`Não foi possível salvar os instrutores da turma ${turmaId}`, error);
    return (data ?? []) as TurmaInstrutorRel[];
  }
};
