import { supabase } from '../integrations/supabase/client';
import { UserRole, type Usuario } from '../types';

const accountProfileColumns = [
  'id',
  'legacy_id',
  'role',
  'nome_completo',
  'cpf',
  'email',
  'telefone',
  'termo_lgpd_aceite',
  'data_aceite_lgpd',
  'foto_url',
  'status',
  'data_nascimento',
  'nome_mae',
  'nome_pai',
  'rg',
  'orgao_expedicao_rg',
  'grau_ensino',
  'cep',
  'endereco',
  'numero',
  'bairro',
  'cidade',
  'estado',
  'trabalha_aviacao_civil',
  'trabalha_seguranca_avsec',
  'certificacao_avsec',
  'origem_cadastro',
  'tipo_documento_selecionado',
  'empresa_id',
  'turma_id_pendente',
].join(', ');

type AccountProfileRow = {
  id: string;
  legacy_id: string | null;
  role: string;
  nome_completo: string | null;
  cpf: string | null;
  email: string | null;
  telefone: string | null;
  termo_lgpd_aceite: boolean | null;
  data_aceite_lgpd: string | null;
  foto_url: string | null;
  status: string | null;
  data_nascimento: string | null;
  nome_mae: string | null;
  nome_pai: string | null;
  rg: string | null;
  orgao_expedicao_rg: string | null;
  grau_ensino: string | null;
  cep: string | null;
  endereco: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  trabalha_aviacao_civil: string | null;
  trabalha_seguranca_avsec: string | null;
  certificacao_avsec: string | null;
  origem_cadastro: string | null;
  tipo_documento_selecionado: string | null;
  empresa_id: string | null;
  turma_id_pendente: string | null;
};

function toUsuario(row: AccountProfileRow, authenticatedEmail: string | undefined): Usuario {
  const role = Object.values(UserRole).includes(row.role as UserRole)
    ? row.role as UserRole
    : UserRole.ALUNO;

  return {
    id: row.legacy_id ?? row.id,
    role,
    nome_completo: row.nome_completo ?? '',
    cpf: row.cpf ?? '',
    email: row.email?.trim() || authenticatedEmail || '',
    telefone: row.telefone ?? '',
    termo_lgpd_aceite: Boolean(row.termo_lgpd_aceite),
    data_aceite_lgpd: row.data_aceite_lgpd,
    foto_url: row.foto_url ?? undefined,
    status: row.status === 'pendente' || row.status === 'recusado' || row.status === 'ativo' ? row.status : undefined,
    origem_cadastro: row.origem_cadastro === 'b2b' || row.origem_cadastro === 'migracao' || row.origem_cadastro === 'interno'
      ? row.origem_cadastro
      : undefined,
    data_nascimento: row.data_nascimento ?? undefined,
    nome_mae: row.nome_mae ?? undefined,
    nome_pai: row.nome_pai ?? undefined,
    rg: row.rg ?? undefined,
    orgao_expedicao_rg: row.orgao_expedicao_rg ?? undefined,
    grau_ensino: row.grau_ensino ?? undefined,
    cep: row.cep ?? undefined,
    endereco: row.endereco ?? undefined,
    numero: row.numero ?? undefined,
    bairro: row.bairro ?? undefined,
    cidade: row.cidade ?? undefined,
    estado: row.estado ?? undefined,
    trabalha_aviacao_civil: row.trabalha_aviacao_civil ?? undefined,
    trabalha_seguranca_avsec: row.trabalha_seguranca_avsec ?? undefined,
    certificacao_avsec: row.certificacao_avsec === 'ISCR' || row.certificacao_avsec === 'IOAD' || row.certificacao_avsec === 'IOAR'
      ? row.certificacao_avsec
      : '',
    tipo_documento_selecionado: row.tipo_documento_selecionado === 'identidade_sem_cpf' || row.tipo_documento_selecionado === 'cnh'
      ? row.tipo_documento_selecionado
      : 'identidade_cpf',
    empresa_id: row.empresa_id ?? undefined,
    turma_id_pendente: row.turma_id_pendente ?? undefined,
  };
}

export function validatePassword(password: string) {
  return password.length >= 8
    && /[A-Z]/.test(password)
    && /[a-z]/.test(password)
    && /\d/.test(password)
    && /[^A-Za-z0-9]/.test(password);
}

export const accountService = {
  getCurrentProfile: async (): Promise<Usuario> => {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) throw new Error('Sessão não encontrada.');

    const { data, error } = await supabase
      .from('profiles')
      .select(accountProfileColumns)
      .eq('id', userId)
      .maybeSingle();

    if (error) throw new Error('Não foi possível carregar o perfil.');
    if (!data) throw new Error('Perfil não encontrado.');
    return toUsuario(data as unknown as AccountProfileRow, sessionData.session?.user.email);
  },

  updatePassword: async (password: string): Promise<void> => {
    if (!validatePassword(password)) throw new Error('A senha deve ter no mínimo 8 caracteres, uma maiúscula, uma minúscula, um número e um símbolo.');

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session?.user) throw new Error('Sessão não encontrada.');

    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw new Error('Não foi possível alterar a senha.');
  },
};

export default accountService;
