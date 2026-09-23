import { supabase } from '../integrations/supabase/client';
import { Empresa, UserRole, Usuario } from '../types';
import { newServiceId, serviceError } from './supabaseErrors';

type ActiveCompanyEmployeeProfileRow = Partial<Usuario> & {
  id: string;
  legacy_id?: string | null;
};

type ActiveMatriculaRow = {
  aluno_id: string | null;
  empresa_b2b_id: string | null;
  status_matricula: string;
};

type ActiveProfileRow = {
  id: string | null;
  legacy_id: string | null;
};

type ActivePersonRow = {
  id: string;
  nome: string;
  cpf: string | null;
  ativo: boolean;
  papel: string | null;
  profile_legacy_id: string | null;
};

type ActivePersonIdentityRow = {
  id: string;
  profile_legacy_id: string | null;
};

type PagedResponse<T> = {
  data: T[] | null;
  error: { message?: string } | null;
};

const PAGE_SIZE = 1000;

async function fetchAllPages<T>(
  fetchPage: (from: number, to: number) => PromiseLike<PagedResponse<T>>,
  errorMessage = 'Não foi possível carregar os dados',
): Promise<T[]> {
  const rows: T[] = [];
  for (let page = 0; ; page += 1) {
    const { data, error } = await fetchPage(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (error) throw serviceError(errorMessage, error);
    const pageRows = data ?? [];
    rows.push(...pageRows);
    if (pageRows.length < PAGE_SIZE) return rows;
  }
}

async function fetchAllByIds<T>(
  ids: string[],
  fetchChunk: (chunk: string[], from: number, to: number) => PromiseLike<PagedResponse<T>>,
  errorMessage = 'Não foi possível carregar os dados',
): Promise<T[]> {
  const rows: T[] = [];
  for (let index = 0; index < ids.length; index += 500) {
    rows.push(...await fetchAllPages(
      (from, to) => fetchChunk(ids.slice(index, index + 500), from, to),
      errorMessage,
    ));
  }
  return rows;
}

function toProfileUsuario(row: ActiveCompanyEmployeeProfileRow): Usuario {
  return {
    id: row.legacy_id || row.id,
    role: UserRole.ALUNO,
    nome_completo: row.nome_completo || '',
    cpf: row.cpf || '',
    email: row.email || '',
    telefone: row.telefone || '',
    termo_lgpd_aceite: Boolean(row.termo_lgpd_aceite),
    data_aceite_lgpd: row.data_aceite_lgpd || null,
    foto_url: row.foto_url,
    status: row.status,
    origem_cadastro: row.origem_cadastro,
    data_nascimento: row.data_nascimento,
    nome_mae: row.nome_mae,
    nome_pai: row.nome_pai,
    rg: row.rg,
    orgao_expedicao_rg: row.orgao_expedicao_rg,
    grau_ensino: row.grau_ensino,
    cep: row.cep,
    endereco: row.endereco,
    numero: row.numero,
    bairro: row.bairro,
    cidade: row.cidade,
    estado: row.estado,
    trabalha_aviacao_civil: row.trabalha_aviacao_civil,
    trabalha_seguranca_avsec: row.trabalha_seguranca_avsec,
    certificacao_avsec: row.certificacao_avsec,
    empresa_id: row.empresa_id,
    tipo_documento_selecionado: row.tipo_documento_selecionado,
    turma_id_pendente: row.turma_id_pendente,
  };
}

function toPersonUsuario(row: ActivePersonRow): Usuario {
  return {
    id: row.id,
    role: UserRole.ALUNO,
    nome_completo: row.nome,
    cpf: row.cpf || '',
    email: '',
    telefone: '',
    termo_lgpd_aceite: false,
    data_aceite_lgpd: null,
    status: 'ativo',
    origem_cadastro: 'migracao',
  };
}

async function getCompanyEnrollmentIds(companyId: string): Promise<Set<string>> {
  const data = await fetchAllPages<ActiveMatriculaRow>((from, to) => supabase
    .from('matriculas')
    .select('id, aluno_id, empresa_b2b_id, status_matricula')
    .eq('empresa_b2b_id', companyId)
    .in('status_matricula', ['Ativo', 'Concluido'])
    .order('id')
    .range(from, to),
    'Não foi possível carregar as matrículas da empresa',
  );

  return new Set(
    data
      .map((matricula) => matricula.aluno_id)
      .filter((id): id is string => Boolean(id))
  );
}

/**
 * Counts unique active students linked to each company through active or migrated enrollments.
 */
export async function getActiveEmployeeCounts(): Promise<Record<string, number>> {
  const [matriculas, profiles, people] = await Promise.all([
    fetchAllPages<ActiveMatriculaRow>((from, to) => supabase
      .from('matriculas')
      .select('id, aluno_id, empresa_b2b_id, status_matricula')
      .in('status_matricula', ['Ativo', 'Concluido'])
      .order('id')
      .range(from, to),
      'Não foi possível carregar as matrículas das empresas',
    ),
    fetchAllPages<ActiveProfileRow>((from, to) => supabase
      .from('profiles')
      .select('id, legacy_id')
      .eq('role', 'ALUNO')
      .eq('status', 'ativo')
      .order('id')
      .range(from, to),
      'Não foi possível carregar os perfis ativos dos alunos',
    ),
    fetchAllPages<ActivePersonIdentityRow>((from, to) => supabase
      .from('pessoas')
      .select('id, profile_legacy_id')
      .eq('papel', 'ALUNO')
      .eq('ativo', true)
      .order('id')
      .range(from, to),
      'Não foi possível carregar as pessoas ativas dos alunos',
    ),
  ]);

  const activeStudentIds = new Map<string, string>();
  for (const profile of profiles) {
    const canonicalId = profile.legacy_id || profile.id;
    if (!canonicalId) continue;
    for (const alias of [profile.id, profile.legacy_id]) {
      if (alias) activeStudentIds.set(alias, canonicalId);
    }
  }
  for (const person of people) {
    activeStudentIds.set(person.id, person.id);
    if (person.profile_legacy_id) activeStudentIds.set(person.profile_legacy_id, person.id);
  }
  const counts = new Map<string, Set<string>>();

  for (const matricula of matriculas) {
    if (!matricula.empresa_b2b_id || !matricula.aluno_id) continue;
    const studentId = activeStudentIds.get(matricula.aluno_id);
    if (!studentId) continue;

    const companyStudents = counts.get(matricula.empresa_b2b_id) ?? new Set<string>();
    companyStudents.add(studentId);
    counts.set(matricula.empresa_b2b_id, companyStudents);
  }

  return Object.fromEntries(
    Array.from(counts.entries()).map(([companyId, students]) => [companyId, students.size])
  );
}

/**
 * Loads active students linked to one company, keeping migrated people and profiles in one list.
 */
export async function getActiveEmployees(companyId: string): Promise<Usuario[]> {
  const enrollmentIds = await getCompanyEnrollmentIds(companyId);
  if (enrollmentIds.size === 0) return [];

  const ids = Array.from(enrollmentIds);
  const people = await fetchAllByIds<ActivePersonRow>(ids, (chunk, from, to) => supabase
    .from('pessoas')
    .select('id, nome, cpf, ativo, papel, profile_legacy_id')
    .in('id', chunk)
    .eq('ativo', true)
    .eq('papel', 'ALUNO')
    .order('id')
    .range(from, to),
    'Não foi possível carregar os alunos migrados da empresa',
  );

  const activePeople = people;
  const profileIds = Array.from(new Set([
    ...ids,
    ...activePeople.map((person) => person.profile_legacy_id).filter((id): id is string => Boolean(id)),
  ]));
  const profileSelect = 'id, legacy_id, role, nome_completo, cpf, email, telefone, termo_lgpd_aceite, data_aceite_lgpd, foto_url, status, data_nascimento, nome_mae, nome_pai, rg, orgao_expedicao_rg, grau_ensino, cep, endereco, numero, bairro, cidade, estado, trabalha_aviacao_civil, trabalha_seguranca_avsec, certificacao_avsec, empresa_id, origem_cadastro, tipo_documento_selecionado, turma_id_pendente';
  const legacyProfiles = await fetchAllByIds<ActiveCompanyEmployeeProfileRow>(profileIds, (chunk, from, to) => supabase
    .from('profiles')
    .select(profileSelect)
    .in('legacy_id', chunk)
    .eq('role', 'ALUNO')
    .eq('status', 'ativo')
    .order('id')
    .range(from, to));

  const uuidProfileIds = profileIds.filter((id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id));
  const profilesById = uuidProfileIds.length > 0
    ? await fetchAllByIds<ActiveCompanyEmployeeProfileRow>(uuidProfileIds, (chunk, from, to) => supabase
      .from('profiles')
      .select(profileSelect)
      .in('id', chunk)
      .eq('role', 'ALUNO')
      .eq('status', 'ativo')
      .order('id')
      .range(from, to))
    : [];

  const employees = new Map<string, Usuario>();
  const personIdByProfileLegacyId = new Map(
    activePeople
      .filter((person) => person.profile_legacy_id)
      .map((person) => [person.profile_legacy_id as string, person.id])
  );
  for (const person of activePeople) {
    const employee = { ...toPersonUsuario(person), empresa_id: companyId };
    employees.set(employee.id, employee);
  }
  for (const row of [
    ...((legacyProfiles ?? []) as ActiveCompanyEmployeeProfileRow[]),
    ...profilesById,
  ]) {
    const employeeId = row.legacy_id
      ? personIdByProfileLegacyId.get(row.legacy_id) || (enrollmentIds.has(row.legacy_id) ? row.legacy_id : row.id)
      : row.id;
    const linkedEmployeeId = enrollmentIds.has(row.id) ? row.id : employeeId;
    const employee = { ...toProfileUsuario(row), id: linkedEmployeeId, empresa_id: companyId };
    employees.set(employee.id, employee);
  }

  return Array.from(employees.values()).sort((a, b) => a.nome_completo.localeCompare(b.nome_completo, 'pt-BR'));
}

export const companyService = {
  getAll: async (): Promise<Empresa[]> => {
    const data = await fetchAllPages<Empresa>((from, to) => supabase
      .from('empresas')
      .select('*')
      .order('id')
      .range(from, to),
      'Não foi possível carregar as empresas',
    );
    return data;
  },

  getActiveEmployeeCounts,
  getActiveEmployees,

  getById: async (id: string): Promise<Empresa | undefined> => {
    const { data, error } = await supabase
      .from('empresas')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw serviceError(`Não foi possível carregar a empresa ${id}`, error);
    return (data ?? undefined) as Empresa | undefined;
  },

  create: async (company: Omit<Empresa, 'id'> & { id?: string }): Promise<Empresa> => {
    const newCompany = { ...company, id: company.id || newServiceId('empresa') };
    const { data, error } = await supabase
      .from('empresas')
      .insert(newCompany)
      .select()
      .single();
    if (error) throw serviceError('Não foi possível criar a empresa', error);
    return data as Empresa;
  },

  createMigrationCompany: async (company: Pick<Empresa, 'nome_fantasia'> & Partial<Pick<Empresa, 'razao_social' | 'cnpj'>>): Promise<Empresa> => {
    const uniqueValue = crypto.randomUUID();
    return companyService.create({
      nome_fantasia: company.nome_fantasia.trim(),
      razao_social: company.razao_social?.trim() || '',
      cnpj: company.cnpj?.trim() || '',
      hash_link_inscricao: `migracao-${uniqueValue}`,
      token_registro_b2b: `tk_migracao_${uniqueValue}`,
      limite_vagas_corporativo: 0,
      status_ativo: true,
    });
  },

  update: async (id: string, updates: Partial<Empresa>): Promise<Empresa> => {
    const { data, error } = await supabase
      .from('empresas')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw serviceError(`Não foi possível atualizar a empresa ${id}`, error);
    if (!data) throw new Error(`Não foi possível atualizar a empresa ${id}: empresa não encontrada`);
    return data as Empresa;
  },

  delete: async (id: string): Promise<boolean> => {
    const { error } = await supabase
      .from('empresas')
      .delete()
      .eq('id', id);
    if (error) throw serviceError(`Não foi possível excluir a empresa ${id}`, error);
    return true;
  }
};
