import { supabase } from '../integrations/supabase/client';
import { Turma, Matricula, DiarioClasse, UserRole } from '../types';
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
  courseSearch?: string;
}

export interface ClassPage {
  data: Turma[];
  total: number;
}

export interface MatriculaPageOptions {
  turmaId: string;
  page: number;
  pageSize: number;
  sortOrder: string;
  search?: string;
}

export type MatriculaPageRow = Matricula & {
  aluno_nome: string;
  aluno_cpf: string;
  total_count?: number;
};

export interface MatriculaPage {
  data: MatriculaPageRow[];
  total: number;
}

type AuthContext = {
  id: string;
  role: UserRole;
};

async function getAuthContext(): Promise<AuthContext | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const metadata = data.user.user_metadata ?? {};
  const roleValue = data.user.app_metadata?.role ?? metadata.role;
  const role = Object.values(UserRole).includes(roleValue as UserRole)
    ? roleValue as UserRole
    : UserRole.ALUNO;
  return { id: metadata.legacy_id ?? data.user.id, role };
}

async function getInstructorClassIds(context: AuthContext): Promise<string[]> {
  const { data, error } = await supabase
    .from('turma_instrutores')
    .select('turma_id')
    .eq('instrutor_id', context.id);
  if (error) throw serviceError('Não foi possível validar o escopo do instrutor', error);
  return ((data ?? []) as Array<{ turma_id: string }>).map((relation) => relation.turma_id);
}

async function assertCanManageTurmas(): Promise<void> {
  const context = await getAuthContext();
  if (!context) throw new Error('Sessão não autenticada.');
  if (context.role === UserRole.INSTRUTOR) {
    throw new Error('Instrutores têm acesso somente de leitura às turmas vinculadas.');
  }
}

async function assertCanAccessTurma(turmaId: string): Promise<void> {
  const context = await getAuthContext();
  if (!context) throw new Error('Sessão não autenticada.');
  if (context.role !== UserRole.INSTRUTOR) return;
  const classIds = await getInstructorClassIds(context);
  if (!classIds.includes(turmaId)) {
    throw new Error('A turma não está vinculada ao instrutor autenticado.');
  }
}

async function assertCanRecordAttendance(turmaId: string): Promise<void> {
  const context = await getAuthContext();
  if (!context) throw new Error('Sessão não autenticada.');
  if (context.role === UserRole.GESTOR || context.role === UserRole.EQUIPE) return;

  if (context.role === UserRole.INSTRUTOR) {
    const classIds = await getInstructorClassIds(context);
    if (classIds.includes(turmaId)) return;
  }

  if (context.role === UserRole.COORDENADOR) {
    const { data, error } = await supabase
      .from('turmas')
      .select('coordenador_ioad_id, coordenador_iscr_id, coordenador_icar_id')
      .eq('id', turmaId)
      .maybeSingle();
    if (error) throw serviceError(`Não foi possível validar a permissão de frequência da turma ${turmaId}`, error);
    const turma = data as {
      coordenador_ioad_id?: string | null;
      coordenador_iscr_id?: string | null;
      coordenador_icar_id?: string | null;
    } | null;
    if (turma && [turma.coordenador_ioad_id, turma.coordenador_iscr_id, turma.coordenador_icar_id].includes(context.id)) return;
  }

  throw new Error('Você não tem permissão para registrar frequência nesta turma.');
}

async function getClassById(id: string): Promise<Turma | undefined> {
  await assertCanAccessTurma(id);
  const { data, error } = await supabase
    .from('turmas')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw serviceError(`Não foi possível carregar a turma ${id}`, error);
  return data ? data as Turma : undefined;
}

async function getClassState(id: string): Promise<{ turma: Turma; hasDiary: boolean; hasEnrollments: boolean }> {
  const turma = await getClassById(id);
  if (!turma) throw new Error(`Não foi possível atualizar a turma ${id}: turma não encontrada`);

  const { data: matriculas, error: matriculasError } = await supabase
    .from('matriculas')
    .select('id, nota_1_chamada, nota_2_chamada, resultado_final')
    .eq('turma_id', id);
  if (matriculasError) throw serviceError(`Não foi possível consultar o estado da turma ${id}`, matriculasError);

  const matriculaRows = (matriculas ?? []) as Array<{
    id: string;
    nota_1_chamada?: number;
    nota_2_chamada?: number;
    resultado_final?: number;
  }>;
  let hasDiary = false;
  if (matriculaRows.length > 0) {
    const { data: diario, error: diarioError } = await supabase
      .from('diario_classe')
      .select('id')
      .in('matricula_id', matriculaRows.map((matricula) => matricula.id))
      .limit(1);
    if (diarioError) throw serviceError(`Não foi possível consultar o diário da turma ${id}`, diarioError);
    hasDiary = (diario ?? []).length > 0;
  }

  return {
    turma,
    hasDiary,
    hasEnrollments: matriculaRows.length > 0,
  };
}

function getClassSessions(turma: Turma): Array<{ dataAula: string; horarioPeriodo: string }> {
  const start = new Date(turma.data_inicio + 'T00:00:00');
  const end = new Date(turma.data_termino + 'T00:00:00');
  const periods = getAttendancePeriodsForShift(turma.turno);
  const sessions: Array<{ dataAula: string; horarioPeriodo: string }> = [];
  const current = new Date(start);
  while (current <= end) {
    const dataAula = [
      current.getFullYear(),
      String(current.getMonth() + 1).padStart(2, '0'),
      String(current.getDate()).padStart(2, '0'),
    ].join('-');
    periods.forEach((horarioPeriodo) => sessions.push({ dataAula, horarioPeriodo }));
    current.setDate(current.getDate() + 1);
  }
  return sessions;
}

export const classService = {
  // --- Turmas CRUD ---
  getAll: async (): Promise<Turma[]> => {
    const context = await getAuthContext();
    if (!context) throw new Error('Sessão não autenticada.');
    let query = supabase.from('turmas').select('*');
    if (context?.role === UserRole.INSTRUTOR) {
      const classIds = await getInstructorClassIds(context);
      if (classIds.length === 0) return [];
      query = query.in('id', classIds);
    }
    const { data, error } = await query;
    if (error) throw serviceError('Não foi possível carregar as turmas', error);
    return (data ?? []) as Turma[];
  },

  getPage: async ({ page, pageSize, search, courseSearch }: ClassPageOptions): Promise<ClassPage> => {
    const context = await getAuthContext();
    if (!context) throw new Error('Sessão não autenticada.');
    const from = Math.max(0, page - 1) * pageSize;
    const to = from + pageSize - 1;
    let query = supabase
      .from('turmas')
      .select('*', { count: 'exact' })
      .order('id_interno_escola', { ascending: true })
      .range(from, to);

    if (context.role === UserRole.INSTRUTOR) {
      const classIds = await getInstructorClassIds(context);
      if (classIds.length === 0) return { data: [], total: 0 };
      query = query.in('id', classIds);
    }

    const escapeFilterTerm = (value: string) => value.replace(/[^0-9A-Za-zÀ-ÿ_ -]/g, ' ').slice(0, 100);
    const findCourseIds = async (value: string): Promise<string[]> => {
      const { data, error } = await supabase
        .from('cursos')
        .select('id')
        .ilike('nome_curso', `%${escapeFilterTerm(value)}%`);
      if (error) throw serviceError('Não foi possível pesquisar os cursos', error);
      return ((data ?? []) as Array<{ id: string }>).map((course) => course.id);
    };
    const findInstructorClassIds = async (value: string): Promise<string[]> => {
      const { data: instructors, error: instructorsError } = await supabase
        .from('profiles')
        .select('legacy_id')
        .ilike('nome_completo', `%${escapeFilterTerm(value)}%`)
        .eq('role', UserRole.INSTRUTOR);
      if (instructorsError) throw serviceError('Não foi possível pesquisar os instrutores', instructorsError);
      const instructorIds = ((instructors ?? []) as Array<{ legacy_id: string }>).map((instructor) => instructor.legacy_id);
      if (instructorIds.length === 0) return [];
      const { data: relations, error: relationsError } = await supabase
        .from('turma_instrutores')
        .select('turma_id')
        .in('instrutor_id', instructorIds);
      if (relationsError) throw serviceError('Não foi possível pesquisar as turmas dos instrutores', relationsError);
      return ((relations ?? []) as Array<{ turma_id: string }>).map((relation) => relation.turma_id);
    };

    const courseTerm = courseSearch?.trim();
    if (courseTerm) {
      const courseIds = await findCourseIds(courseTerm);
      if (courseIds.length === 0) return { data: [], total: 0 };
      query = query.in('curso_id', courseIds);
    }

    const term = search?.trim();
    if (term) {
      const safeTerm = escapeFilterTerm(term);
      const [courseIds, instructorClassIds] = await Promise.all([
        findCourseIds(term),
        findInstructorClassIds(term),
      ]);
      const searchFilters = [`id_anac.ilike.%${safeTerm}%`];
      const internalTerm = term.toLowerCase().startsWith('t-op-') ? term.slice(5).trim() : term;
      if (/^\d+$/.test(internalTerm)) searchFilters.push(`id_interno_escola.eq.${internalTerm}`);
      if (courseIds.length > 0) searchFilters.push(`curso_id.in.(${courseIds.join(',')})`);
      if (instructorClassIds.length > 0) searchFilters.push(`id.in.(${instructorClassIds.join(',')})`);
      query = query.or(searchFilters.join(','));
    }

    const { data, count, error } = await query;
    if (error) throw serviceError('Não foi possível carregar as turmas', error);
    return { data: (data ?? []) as Turma[], total: count ?? 0 };
  },

  getById: async (id: string): Promise<Turma | undefined> => getClassById(id),

  getEditability: async (id: string): Promise<{ lockedFields: Array<keyof Turma> }> => {
    const { hasDiary, hasEnrollments } = await getClassState(id);
    return {
      lockedFields: [
        ...(hasDiary ? ['turno', 'horario_aulas', 'data_inicio', 'data_termino'] as Array<keyof Turma> : []),
        ...(hasEnrollments ? ['curso_id', 'id_anac', 'id_interno_escola'] as Array<keyof Turma> : []),
      ],
    };
  },

  create: async (turma: Omit<Turma, 'id' | 'id_interno_escola' | 'qt_alunos_matriculados'> & { id?: string }): Promise<Turma> => {
    await assertCanManageTurmas();
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
    await assertCanManageTurmas();
    const { turma, hasDiary, hasEnrollments } = await getClassState(id);
    const diaryLockedFields: Array<keyof Turma> = ['turno', 'horario_aulas', 'data_inicio', 'data_termino'];
    const enrollmentLockedFields: Array<keyof Turma> = ['curso_id', 'id_anac', 'id_interno_escola'];
    const lockedFields = [...(hasDiary ? diaryLockedFields : []), ...(hasEnrollments ? enrollmentLockedFields : [])];
    const changedLockedField = lockedFields.find((field) =>
      Object.prototype.hasOwnProperty.call(updates, field) && updates[field] !== turma[field]
    );
    if (changedLockedField) {
      throw new Error(`O campo estrutural ${String(changedLockedField)} não pode ser alterado após o início da operação da turma.`);
    }

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
    await assertCanManageTurmas();
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
  getAllMatriculasByTurma: async (turmaId: string): Promise<Matricula[]> => {
    await assertCanAccessTurma(turmaId);
    const { data, error } = await supabase
      .from('matriculas')
      .select('*')
      .eq('turma_id', turmaId);
    if (error) throw serviceError(`Não foi possível carregar as matrículas da turma ${turmaId}`, error);
    return (data ?? []) as Matricula[];
  },

  getMatriculatedAlunoIds: async (turmaId: string): Promise<string[]> => {
    await assertCanAccessTurma(turmaId);
    const { data, error } = await supabase
      .from('matriculas')
      .select('aluno_id')
      .eq('turma_id', turmaId);
    if (error) throw serviceError(`Não foi possível consultar os alunos da turma ${turmaId}`, error);
    return ((data ?? []) as Array<{ aluno_id: string }>).map((matricula) => matricula.aluno_id);
  },

  getMatriculasPage: async ({ turmaId, page, pageSize, sortOrder, search }: MatriculaPageOptions): Promise<MatriculaPage> => {
    await assertCanAccessTurma(turmaId);
    const { data, error } = await supabase.rpc('get_matriculas_page', {
      p_turma_id: turmaId,
      p_page: page,
      p_page_size: pageSize,
      p_sort_order: sortOrder,
      p_search: search?.trim() || null,
    });
    if (error) throw serviceError(`Não foi possível carregar a página de matrículas da turma ${turmaId}`, error);
    const rows = (data ?? []) as MatriculaPageRow[];
    return {
      data: rows,
      total: Number(rows[0]?.total_count ?? 0),
    };
  },

  getMatriculasByAluno: async (alunoId: string): Promise<Matricula[]> => {
    const context = await getAuthContext();
    if (!context) throw new Error('Sessão não autenticada.');
    let query = supabase
      .from('matriculas')
      .select('*')
      .eq('aluno_id', alunoId);
    if (context.role === UserRole.INSTRUTOR) {
      const classIds = await getInstructorClassIds(context);
      if (classIds.length === 0) return [];
      query = query.in('turma_id', classIds);
    }
    const { data, error } = await query;
    if (error) throw serviceError(`Não foi possível carregar as matrículas do aluno ${alunoId}`, error);
    return (data ?? []) as Matricula[];
  },

  createMatricula: async (matricula: Omit<Matricula, 'id' | 'codigo_re' | 'percentual_presenca'>): Promise<Matricula> => {
    await assertCanManageTurmas();
    await assertCanAccessTurma(matricula.turma_id);
    const classData = await getClassById(matricula.turma_id);
    if (!classData) throw new Error(`Não foi possível carregar a turma ${matricula.turma_id}`);
    const sessions = getClassSessions(classData);
    if (sessions.length === 0) {
      throw new Error('Não é possível matricular um aluno em uma turma sem períodos válidos de diário.');
    }
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

    {
      const { error: countError } = await supabase
        .from('turmas')
        .update({ qt_alunos_matriculados: classData.qt_alunos_matriculados + 1 })
        .eq('id', matricula.turma_id);
      if (countError) throw serviceError(`Não foi possível atualizar a quantidade de alunos da turma ${matricula.turma_id}`, countError);

      const { data: existingDiario, error: diarioListError } = await supabase
        .from('diario_classe')
        .select('data_aula, horario_periodo')
        .eq('matricula_id', createdMatricula.id);
      if (diarioListError) throw serviceError(`Não foi possível consultar o diário da matrícula ${createdMatricula.id}`, diarioListError);

      const existingKeys = new Set(((existingDiario ?? []) as Array<{ data_aula: string; horario_periodo: string }>).map(
        (row) => `${row.data_aula}|${row.horario_periodo}`
      ));
      const diarioRows: DiarioClasse[] = sessions
        .filter(({ dataAula, horarioPeriodo }) => !existingKeys.has(`${dataAula}|${horarioPeriodo}`))
        .map(({ dataAula, horarioPeriodo }) => ({
          id: newServiceId('freq'),
          matricula_id: createdMatricula.id,
          data_aula: dataAula,
          horario_periodo: horarioPeriodo,
          presente: true
        }));

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
    await assertCanManageTurmas();
    const { data: currentMatricula, error: currentError } = await supabase
      .from('matriculas')
      .select('turma_id')
      .eq('id', id)
      .maybeSingle();
    if (currentError) throw serviceError(`Não foi possível consultar a matrícula ${id}`, currentError);
    if (!currentMatricula) throw new Error(`Não foi possível atualizar a matrícula ${id}: matrícula não encontrada`);
    await assertCanAccessTurma((currentMatricula as { turma_id: string }).turma_id);
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
    await assertCanManageTurmas();
    const { data: matricula, error: findError } = await supabase
      .from('matriculas')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (findError) throw serviceError(`Não foi possível consultar a matrícula ${id}`, findError);
    if (!matricula) return false;

    const mat = matricula as Matricula;
    await assertCanAccessTurma(mat.turma_id);
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
    await assertCanAccessTurma(turmaId);
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
    const { data: matricula, error: matriculaError } = await supabase
      .from('matriculas')
      .select('turma_id')
      .eq('id', matriculaId)
      .maybeSingle();
    if (matriculaError) throw serviceError(`Não foi possível consultar a matrícula ${matriculaId}`, matriculaError);
    if (!matricula) throw new Error(`Não foi possível registrar a presença: matrícula ${matriculaId} não encontrada`);

    const turmaId = (matricula as { turma_id: string }).turma_id;
    await assertCanRecordAttendance(turmaId);
    await assertCanAccessTurma(turmaId);
    const classData = await getClassById(turmaId);
    if (!classData) throw new Error(`Não foi possível carregar a turma ${turmaId}`);
    const sessions = getClassSessions(classData);
    if (!sessions.some((session) => session.dataAula === dataAula && session.horarioPeriodo === horarioPeriodo)) {
      throw new Error('O período informado não pertence ao turno e às datas da turma.');
    }

    const { data, error } = await supabase.rpc('save_diario_presenca', {
      p_matricula_id: matriculaId,
      p_data_aula: dataAula,
      p_horario_periodo: horarioPeriodo,
      p_presente: presente,
    });
    if (error) throw serviceError('Não foi possível salvar o registro de presença', error);
    return data as DiarioClasse;
  },

  // --- Vínculo Turma x Instrutores ---
  getTurmasByInstrutor: async (instrutorId: string): Promise<TurmaInstrutorRel[]> => {
    const context = await getAuthContext();
    if (!context) throw new Error('Sessão não autenticada.');
    if (context.role === UserRole.INSTRUTOR && context.id !== instrutorId) {
      throw new Error('Instrutor não pode consultar vínculos de outro perfil.');
    }
    const { data, error } = await supabase
      .from('turma_instrutores')
      .select('*')
      .eq('instrutor_id', instrutorId);
    if (error) throw serviceError(`Não foi possível carregar as turmas do instrutor ${instrutorId}`, error);
    return (data ?? []) as TurmaInstrutorRel[];
  },

  getInstrutoresByTurma: async (turmaId: string): Promise<TurmaInstrutorRel[]> => {
    await assertCanAccessTurma(turmaId);
    const { data, error } = await supabase
      .from('turma_instrutores')
      .select('*')
      .eq('turma_id', turmaId);
    if (error) throw serviceError(`Não foi possível carregar os instrutores da turma ${turmaId}`, error);
    return (data ?? []) as TurmaInstrutorRel[];
  },

  saveInstrutoresForTurma: async (turmaId: string, instrutores: { instrutor_id: string; funcao: string }[]): Promise<TurmaInstrutorRel[]> => {
    await assertCanManageTurmas();
    await assertCanAccessTurma(turmaId);
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
