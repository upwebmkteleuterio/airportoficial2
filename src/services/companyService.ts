import { supabase } from '../integrations/supabase/client';
import { Empresa, Usuario } from '../types';
import { newServiceId, serviceError } from './supabaseErrors';

type ActiveCompanyEmployeeProfileRow = Omit<Usuario, 'id'> & {
  id: string;
  legacy_id?: string | null;
};

type ActiveMatriculaRow = {
  aluno_id: string | null;

  empresa_b2b_id: string | null;
};

type ActiveProfileRow = {
  id: string | null;
  legacy_id: string | null;
};

type ActivePersonRow = {
  id: string | null;
};

export async function getActiveEmployees(companyId: string): Promise<Usuario[]> {
  const { data, error } = await supabase.rpc('get_active_company_employees', {
    target_company_id: companyId,
  });

  if (error) {
    throw serviceError('Não foi possível carregar os colaboradores ativos da empresa', error);
  }

  return ((data ?? []) as ActiveCompanyEmployeeProfileRow[]).map(({ legacy_id, ...profile }) => ({
    ...profile,
    id: legacy_id || profile.id,
  }));
}

/**
 * Counts unique students with an active B2B enrollment for each company.
 * The current application stores the enrollment's aluno_id as profiles.legacy_id;

 * the auth profile id is also accepted for compatibility with direct profile links.

 */
export async function getActiveEmployeeCounts(): Promise<Record<string, number>> {
  const [{ data: matriculas, error: matriculasError }, { data: profiles, error: profilesError }, { data: people, error: peopleError }] = await Promise.all([
    supabase
      .from('matriculas')
      .select('aluno_id, empresa_b2b_id')
      .eq('status_matricula', 'Ativo'),
    supabase
      .from('profiles')
      .select('id, legacy_id')
      .eq('role', 'ALUNO')
      .eq('status', 'ativo'),
    supabase
      .from('pessoas')
      .select('id')
      .eq('papel', 'ALUNO')
      .eq('ativo', true),
  ]);

  if (matriculasError) {
    throw serviceError('Não foi possível carregar as matrículas ativas das empresas', matriculasError);
  }
  if (profilesError) {
    throw serviceError('Não foi possível carregar os perfis ativos dos alunos', profilesError);
  }
  if (peopleError) {
    throw serviceError('Não foi possível carregar as pessoas ativas dos alunos', peopleError);
  }

  const activeStudentIds = new Set([
    ...((profiles ?? []) as ActiveProfileRow[])
      .flatMap((profile) => [profile.id, profile.legacy_id])
      .filter((id): id is string => Boolean(id)),
    ...((people ?? []) as ActivePersonRow[])
      .map((person) => person.id)
      .filter((id): id is string => Boolean(id)),
  ]);
  const counts = new Map<string, Set<string>>();

  for (const matricula of (matriculas ?? []) as ActiveMatriculaRow[]) {
    if (!matricula.empresa_b2b_id || !matricula.aluno_id || !activeStudentIds.has(matricula.aluno_id)) continue;

    const companyStudents = counts.get(matricula.empresa_b2b_id) ?? new Set<string>();
    companyStudents.add(matricula.aluno_id);
    counts.set(matricula.empresa_b2b_id, companyStudents);
  }

  return Object.fromEntries(
    Array.from(counts.entries()).map(([companyId, students]) => [companyId, students.size])
  );
}

export const companyService = {
  getAll: async (): Promise<Empresa[]> => {
    const { data, error } = await supabase
      .from('empresas')
      .select('*');
    if (error) throw serviceError('Não foi possível carregar as empresas', error);
    return (data ?? []) as Empresa[];
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
