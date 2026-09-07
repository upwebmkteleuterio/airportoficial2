import { useState, type FormEvent } from 'react';
import { AlertCircle, CheckCircle2, LockKeyhole, LoaderCircle, Mail, ShieldCheck, User } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useMyAccount } from '../hooks/useMyAccount';
import { validatePassword } from '../services/accountService';
import { UserRole, type Usuario } from '../types';

const roleLabels: Record<UserRole, string> = {
  [UserRole.GESTOR]: 'Gestor',
  [UserRole.EQUIPE]: 'Equipe',
  [UserRole.ALUNO]: 'Aluno',
  [UserRole.INSTRUTOR]: 'Instrutor',
  [UserRole.COORDENADOR]: 'Coordenador',
};

const profileSections: Array<{ title: string; fields: Array<{ key: keyof Usuario; label: string }> }> = [
  {
    title: 'Dados pessoais',
    fields: [
      { key: 'nome_completo', label: 'Nome completo' },
      { key: 'email', label: 'E-mail' },
      { key: 'cpf', label: 'CPF' },
      { key: 'telefone', label: 'Telefone' },
      { key: 'data_nascimento', label: 'Data de nascimento' },
      { key: 'nome_mae', label: 'Nome da mãe' },
      { key: 'nome_pai', label: 'Nome do pai' },
      { key: 'rg', label: 'RG' },
      { key: 'orgao_expedicao_rg', label: 'Órgão expedidor do RG' },
      { key: 'grau_ensino', label: 'Grau de ensino' },
      { key: 'tipo_documento_selecionado', label: 'Documento selecionado' },
      { key: 'foto_url', label: 'Foto de perfil' },
    ],
  },
  {
    title: 'Endereço',
    fields: [
      { key: 'cep', label: 'CEP' },
      { key: 'endereco', label: 'Endereço' },
      { key: 'numero', label: 'Número' },
      { key: 'bairro', label: 'Bairro' },
      { key: 'cidade', label: 'Cidade' },
      { key: 'estado', label: 'Estado' },
    ],
  },
  {
    title: 'Atuação e cadastro',
    fields: [
      { key: 'role', label: 'Perfil de acesso' },
      { key: 'trabalha_aviacao_civil', label: 'Trabalha na aviação civil' },
      { key: 'trabalha_seguranca_avsec', label: 'Trabalha com segurança AVSEC' },
      { key: 'certificacao_avsec', label: 'Certificação AVSEC' },
      { key: 'empresa_id', label: 'Empresa vinculada' },
      { key: 'turma_id_pendente', label: 'Turma pendente' },
      { key: 'status', label: 'Status do cadastro' },
      { key: 'origem_cadastro', label: 'Origem do cadastro' },
      { key: 'termo_lgpd_aceite', label: 'Termo LGPD aceito' },
      { key: 'data_aceite_lgpd', label: 'Data de aceite LGPD' },
    ],
  },
];

function formatProfileValue(key: keyof Usuario, value: unknown) {
  if (value === null || value === undefined || value === '') return 'Não informado';
  if (key === 'role' && Object.values(UserRole).includes(value as UserRole)) return roleLabels[value as UserRole];
  if (key === 'termo_lgpd_aceite') return value ? 'Sim' : 'Não';
  if (key === 'origem_cadastro') {
    return value === 'b2b' ? 'B2B' : value === 'migracao' ? 'Migração' : value === 'interno' ? 'Interno' : String(value);
  }
  if (key === 'tipo_documento_selecionado') {
    return value === 'identidade_cpf' ? 'Identidade com CPF' : value === 'identidade_sem_cpf' ? 'Identidade sem CPF' : value === 'cnh' ? 'CNH' : String(value);
  }
  if (key === 'data_nascimento' || key === 'data_aceite_lgpd') {
    const rawDate = String(value);
    const date = new Date(rawDate.length === 10 ? `${rawDate}T12:00:00` : rawDate);
    if (!Number.isNaN(date.getTime())) return date.toLocaleDateString('pt-BR');
  }
  return String(value);
}

function ProfileField({ profile, field }: { profile: Usuario; field: { key: keyof Usuario; label: string } }) {
  return (
    <div>
      <label htmlFor={`account-${String(field.key)}`} className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {field.label}
      </label>
      <input
        id={`account-${String(field.key)}`}
        value={formatProfileValue(field.key, profile[field.key])}
        readOnly
        aria-readonly="true"
        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-teal-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
      />
    </div>
  );
}

export function MyAccount() {
  const { profile, isLoadingProfile, profileError, updatePassword, isUpdatingPassword } = useMyAccount();
  const [newPassword, setNewPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!validatePassword(newPassword)) {
      setPasswordError('A nova senha deve ter no mínimo 8 caracteres, uma letra maiúscula, uma letra minúscula, um número e um símbolo.');
      return;
    }
    if (newPassword !== passwordConfirmation) {
      setPasswordError('A confirmação deve ser igual à nova senha.');
      return;
    }

    try {
      await updatePassword(newPassword);
      setNewPassword('');
      setPasswordConfirmation('');
      setPasswordSuccess('Senha alterada com sucesso.');
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : 'Não foi possível alterar a senha.');
    }
  };

  return (
    <div className="flex min-h-screen flex-1 flex-col overflow-y-auto bg-gray-50/50 p-6 font-sans dark:bg-slate-950">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <header className="border-b border-gray-200 pb-5 dark:border-slate-800">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-600 dark:text-teal-400">Perfil autenticado</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">Minha Conta</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Consulte seus dados de perfil e mantenha o acesso seguro.</p>
        </header>

        {isLoadingProfile && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400" role="status">
            Carregando seus dados...
          </div>
        )}

        {profileError && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300" role="alert">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <span>{profileError instanceof Error ? profileError.message : 'Não foi possível carregar seu perfil.'}</span>
          </div>
        )}

        {profile && (
          <>
            <section aria-labelledby="account-summary-title" className="grid gap-4 md:grid-cols-3">
              <h2 id="account-summary-title" className="sr-only">Resumo da conta</h2>
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400">
                    <User className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Nome</p>
                    <p className="truncate font-semibold text-slate-900 dark:text-white">{formatProfileValue('nome_completo', profile.nome_completo)}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400">
                    <Mail className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">E-mail</p>
                    <p className="truncate font-semibold text-slate-900 dark:text-white">{formatProfileValue('email', profile.email)}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400">
                    <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Perfil</p>
                    <p className="truncate font-semibold text-slate-900 dark:text-white">{formatProfileValue('role', profile.role)}</p>
                  </div>
                </div>
              </div>
            </section>

            {profileSections.map((section) => (
              <section key={section.title} aria-labelledby={`account-section-${section.title}`} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <h2 id={`account-section-${section.title}`} className="mb-4 text-lg font-bold text-slate-900 dark:text-white">{section.title}</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {section.fields.map((field) => <ProfileField key={field.key} profile={profile} field={field} />)}
                </div>
              </section>
            ))}
          </>
        )}

        <section aria-labelledby="change-password-title" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <LockKeyhole className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="change-password-title" className="text-lg font-bold text-slate-900 dark:text-white">Alterar senha</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Use uma senha forte para proteger sua conta.</p>
            </div>
          </div>
          <form onSubmit={handlePasswordSubmit} className="max-w-2xl space-y-4" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="account-new-password" className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Nova senha</label>
                <input
                  id="account-new-password"
                  name="new-password"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  disabled={isUpdatingPassword}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 disabled:cursor-wait disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>
              <div>
                <label htmlFor="account-password-confirmation" className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Confirmar nova senha</label>
                <input
                  id="account-password-confirmation"
                  name="password-confirmation"
                  type="password"
                  autoComplete="new-password"
                  value={passwordConfirmation}
                  onChange={(event) => setPasswordConfirmation(event.target.value)}
                  disabled={isUpdatingPassword}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 disabled:cursor-wait disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Mínimo de 8 caracteres, com maiúscula, minúscula, número e símbolo.</p>
            {passwordError && (
              <p role="alert" className="flex items-start gap-2 text-sm text-red-700 dark:text-red-300">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                {passwordError}
              </p>
            )}
            {passwordSuccess && (
              <p role="status" className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                {passwordSuccess}
              </p>
            )}
            <Button
              disabled={isUpdatingPassword}
              icon={isUpdatingPassword ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <LockKeyhole className="h-4 w-4" aria-hidden="true" />}
              className="focus:outline-none focus:ring-2 focus:ring-teal-500/50"
            >
              {isUpdatingPassword ? 'Salvando...' : 'Salvar nova senha'}
            </Button>
          </form>
        </section>
      </div>
    </div>
  );
}

export default MyAccount;
