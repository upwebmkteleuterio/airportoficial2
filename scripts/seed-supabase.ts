import { createClient } from '@supabase/supabase-js';
import { mockAddresses } from '../src/mocks/addresses';
import { mockAuditoriaLogs } from '../src/mocks/audit';
import { mockTurmas, mockTurmasInstrutores, mockMatriculas, mockDiarioClasse } from '../src/mocks/classes';
import { mockEmpresas } from '../src/mocks/companies';
import { mockCursos } from '../src/mocks/courses';
import { mockDocumentos } from '../src/mocks/documents';
import { mockShifts } from '../src/mocks/shifts';
import { mockUsuarios } from '../src/mocks/users';

const supabaseUrl = process.env.SUPABASE_URL ?? 'https://vohvdoyjxaizexocadgp.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const defaultPassword = process.env.SEED_DEFAULT_PASSWORD;

if (!serviceRoleKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY must be provided only in the trusted seed environment.');
}

if (!defaultPassword || defaultPassword.length < 8) {
  throw new Error('SEED_DEFAULT_PASSWORD must be provided and contain at least 8 characters.');
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function ensureAuthUser(user: (typeof mockUsuarios)[number]) {
  const { data: existingProfile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('legacy_id', user.id)
    .maybeSingle();

  if (profileError) throw profileError;
  if (existingProfile?.id) return existingProfile.id as string;

  const { data, error } = await supabase.auth.admin.createUser({
    email: user.email,
    password: defaultPassword,
    email_confirm: true,
    user_metadata: {
      legacy_id: user.id,
      role: user.role,
      nome_completo: user.nome_completo,
      cpf: user.cpf,
      telefone: user.telefone,
      empresa_id: user.empresa_id ?? null,
    },
    app_metadata: { role: user.role },
  });

  if (error || !data.user) throw error ?? new Error(`Could not create Auth user for ${user.email}`);
  return data.user.id;
}

async function seed() {
  const authIds = new Map<string, string>();

  for (const user of mockUsuarios) {
    authIds.set(user.id, await ensureAuthUser(user));
  }

  const profileRows = mockUsuarios.map((user) => ({
    id: authIds.get(user.id),
    legacy_id: user.id,
    role: user.role,
    nome_completo: user.nome_completo,
    cpf: user.cpf,
    email: user.email,
    telefone: user.telefone,
    termo_lgpd_aceite: user.termo_lgpd_aceite,
    data_aceite_lgpd: user.data_aceite_lgpd,
    foto_url: user.foto_url ?? null,
    status: user.status ?? 'ativo',
    data_nascimento: user.data_nascimento ?? null,
    nome_mae: user.nome_mae ?? null,
    nome_pai: user.nome_pai ?? null,
    rg: user.rg ?? null,
    orgao_expedicao_rg: user.orgao_expedicao_rg ?? null,
    grau_ensino: user.grau_ensino ?? null,
    cep: user.cep ?? null,
    endereco: user.endereco ?? null,
    numero: user.numero ?? null,
    bairro: user.bairro ?? null,
    cidade: user.cidade ?? null,
    estado: user.estado ?? null,
    trabalha_aviacao_civil: user.trabalha_aviacao_civil ?? null,
    trabalha_seguranca_avsec: user.trabalha_seguranca_avsec ?? null,
    certificacao_avsec: user.certificacao_avsec ?? null,
    empresa_id: user.empresa_id ?? null,
  }));

  const batches: Array<[string, string, readonly unknown[]]> = [
    ['empresas', 'id', mockEmpresas],
    ['enderecos', 'id', mockAddresses],
    ['cursos', 'id', mockCursos],
    ['turnos', 'id', mockShifts],
    ['profiles', 'id', profileRows],
    ['turmas', 'id', mockTurmas],
    ['turma_instrutores', 'id', mockTurmasInstrutores],
    ['matriculas', 'id', mockMatriculas],
    ['diario_classe', 'id', mockDiarioClasse],
    ['documentos', 'id', mockDocumentos],
    ['auditoria_logs', 'id', mockAuditoriaLogs],
  ];

  for (const [table, conflictKey, rows] of batches) {
    const { error } = await supabase.from(table).upsert(rows, { onConflict: conflictKey });
    if (error) throw new Error(`Failed to seed ${table}: ${error.message}`);
  }

  for (const user of mockUsuarios) {
    const authId = authIds.get(user.id);
    if (!authId) continue;
    const { error } = await supabase.auth.admin.updateUserById(authId, {
      user_metadata: {
        legacy_id: user.id,
        role: user.role,
        nome_completo: user.nome_completo,
        cpf: user.cpf,
        telefone: user.telefone,
        empresa_id: user.empresa_id ?? null,
      },
      app_metadata: { role: user.role },
    });
    if (error) throw error;
  }

  console.info('Supabase seed completed', {
    profiles: mockUsuarios.length,
    empresas: mockEmpresas.length,
    enderecos: mockAddresses.length,
    cursos: mockCursos.length,
    turnos: mockShifts.length,
    turmas: mockTurmas.length,
    matriculas: mockMatriculas.length,
    diario: mockDiarioClasse.length,
    documentos: mockDocumentos.length,
    auditoria: mockAuditoriaLogs.length,
  });
}

await seed();
