import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Search, Filter, MoreVertical, UserPlus, Mail, Phone, User, Edit2, Trash2 } from 'lucide-react';
import { useUsers } from '../hooks/useUsers';
import { usePeople } from '../hooks/usePeople';
import { UserRole } from '../types';
import { Modal } from '../components/ui/Modal';
import { StudentRegistrationModal } from '../components/StudentRegistrationModal';
import { PersonRegistrationModal } from '../components/PersonRegistrationModal';
import { CreateMenu } from '../components/ui/CreateMenu';
import { FolderIcon } from '../components/ui/FolderIcon';
import { PasswordModal } from '../components/ui/PasswordModal';
import { SharedDocumentsPanel } from '../components/SharedDocumentsPanel';
import { StudentDetailsPanel } from '../components/StudentDetailsPanel';
import { DocumentAccessGrant } from '../services/documentAccessService';

const formatStudentDate = (value: unknown) => {
  if (typeof value !== 'string' || !value.trim()) return '-';
  const date = new Date(value.includes('T') ? value : `${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('pt-BR');
};

type StudentRow = Record<string, any> & {
  id: string;
  nome_completo: string;
  is_directory_person: boolean;
};

type ToastState = { type: 'success' | 'error'; message: string };

export function Students() {
  const queryClient = useQueryClient();
  const [registrationModalOpen, setRegistrationModalOpen] = useState(false);
  const [personRegistrationOpen, setPersonRegistrationOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<ToastState | null>(null);
  const [detailsPanelOpen, setDetailsPanelOpen] = useState(false);
  const [selectedStudentForDetails, setSelectedStudentForDetails] = useState<StudentRow | null>(null);
  const [selectedStudentForEdit, setSelectedStudentForEdit] = useState<StudentRow | null>(null);
  const [selectedPersonForAccess, setSelectedPersonForAccess] = useState<string | null>(null);
  const [selectedPersonForEdit, setSelectedPersonForEdit] = useState<StudentRow | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<StudentRow | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [documentsPanelOpen, setDocumentsPanelOpen] = useState(false);
  const [selectedStudentForDocs, setSelectedStudentForDocs] = useState<StudentRow | null>(null);
  const [accessGrant, setAccessGrant] = useState<DocumentAccessGrant | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const { users, isLoading: isUsersLoading, deleteUser } = useUsers({
    role: UserRole.ALUNO,
    status: 'ativo',
    search: searchQuery,
  });
  const { people, isLoading: isPeopleLoading, createPerson, updatePerson } = usePeople({ search: searchQuery, studentOnly: true, activeOnly: true });

  const studentRows: StudentRow[] = [
    ...people.map((person) => {
      const profile = users.find((user) => user.id === person.id || user.id === person.profile_legacy_id);
      return profile
        ? { ...person, ...profile, id: profile.id, is_directory_person: false }
        : {
            ...person,
            nome_completo: person.nome,
            cpf: person.cpf ?? '',
            email: '',
            telefone: '',
            status: 'ativo',
            is_directory_person: true,
          };
    }),
    ...users
      .filter((user) => !people.some((person) => person.id === user.id || person.profile_legacy_id === user.id))
      .map((user) => ({ ...user, is_directory_person: false })),
  ];

  useEffect(() => setCurrentPage(1), [searchQuery]);
  useEffect(() => {
    const handleGlobalClick = () => setOpenMenuId(null);
    if (!openMenuId) return;
    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, [openMenuId]);
  useEffect(() => {
    if (!toast) return;
    const timeoutId = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  const paginatedStudents = studentRows.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(studentRows.length / itemsPerPage) || 1;
  const isLoading = isUsersLoading || isPeopleLoading;

  const handleOpenDocuments = (student: StudentRow) => {
    setAccessGrant(null);
    setSelectedStudentForDocs(student);
    setPasswordModalOpen(true);
  };

  const handleDelete = async () => {
    if (!studentToDelete) return;
    try {
      if (studentToDelete.is_directory_person) {
        await updatePerson({ id: studentToDelete.id, updates: { ativo: false } });
      } else {
        await deleteUser(studentToDelete.id);
      }
      setToast({ type: 'success', message: 'Aluno excluído com sucesso.' });
      setStudentToDelete(null);
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      await queryClient.invalidateQueries({ queryKey: ['people'] });
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Não foi possível excluir o aluno.' });
    }
  };

  return (
    <div className="flex-1 flex flex-col p-6 gap-6 overflow-y-auto font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h2 className="font-display text-2xl md:text-3xl font-extrabold text-slate-950 dark:text-white leading-tight">Alunos</h2>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 font-medium">Gerenciamento de todos os alunos cadastrados no sistema.</p>
        </div>
        <CreateMenu
          anchor="right"
          triggerLabel="Cadastrar Aluno"
          label="Como deseja cadastrar o aluno?"
          items={[{ label: 'Usuário com acesso', icon: UserPlus }, { label: 'Pessoa sem login', icon: User }]}
          onSelect={(label) => {
            if (label === 'Usuário com acesso') setRegistrationModalOpen(true);
            if (label === 'Pessoa sem login') setPersonRegistrationOpen(true);
          }}
        />
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-850 rounded-xl border border-gray-200 dark:border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-750 px-3 py-1.5 rounded-lg font-bold text-xs text-slate-800 dark:text-white shadow-sm"><Filter className="w-3.5 h-3.5 text-gray-500" /><span>Filtros</span></div>
          <div className="h-5 w-px bg-gray-300 dark:bg-slate-750" />
          <span className="text-xs text-gray-500 dark:text-slate-400 font-semibold">{studentRows.length} alunos cadastrados</span>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input type="text" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Buscar por nome, CPF ou e-mail..." className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:text-white transition-shadow shadow-sm" />
        </div>
      </div>

      <div className="flex-1 border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 flex flex-col shadow-sm min-h-[400px]">
        <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
          <table className="w-full text-left border-collapse whitespace-nowrap text-sm">
            <thead className="sticky top-0 bg-slate-50 dark:bg-slate-850 z-10 border-b border-gray-200 dark:border-slate-800 font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider text-xs">
              <tr><th className="px-5 py-3 w-12 text-center" /><th className="px-5 py-3">Nome Completo</th><th className="px-5 py-3">CPF</th><th className="px-5 py-3">E-mail</th><th className="px-5 py-3">Telefone</th><th className="px-5 py-3">Data de Nasc.</th><th className="px-5 py-3">Data de Matrícula</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-gray-700 dark:text-slate-300">
              {isLoading ? <tr><td colSpan={7} className="px-5 py-12 text-center"><div className="flex flex-col items-center justify-center gap-2 text-gray-500"><div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" /><p className="font-sans text-sm">Carregando alunos...</p></div></td></tr> : paginatedStudents.length === 0 ? <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-slate-400"><div className="flex flex-col items-center justify-center gap-2.5 max-w-sm mx-auto"><div className="p-3 bg-teal-500/10 rounded-full text-teal-500"><User className="w-6 h-6" /></div><p className="font-bold text-sm text-slate-800 dark:text-slate-200">Nenhum aluno encontrado</p><p className="text-xs text-gray-400">Tente ajustar a busca ou cadastre um novo aluno.</p></div></td></tr> : paginatedStudents.map((aluno) => <tr key={aluno.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20 transition-colors h-[52px] cursor-pointer" onClick={() => { setOpenMenuId(null); setSelectedStudentForDetails(aluno); setDetailsPanelOpen(true); }}>
                <td className="px-5 py-2.5 text-center relative" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-center gap-1">
                  <button type="button" aria-label={`Ações de ${aluno.nome_completo}`} onClick={(event) => { event.stopPropagation(); setOpenMenuId(openMenuId === aluno.id ? null : aluno.id); }} className="p-1 text-gray-500 hover:text-slate-800 dark:text-slate-400 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800"><MoreVertical className="w-4 h-4" /></button>
                  {openMenuId === aluno.id && <div className="absolute left-full top-0 ml-2 w-48 bg-white dark:bg-slate-850 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 py-1 z-50">
                    <button type="button" onClick={(event) => { event.stopPropagation(); setOpenMenuId(null); if (aluno.is_directory_person) { setSelectedPersonForEdit(aluno); setPersonRegistrationOpen(true); } else { setSelectedStudentForEdit(aluno); setSelectedPersonForAccess(null); setRegistrationModalOpen(true); } }} className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 flex items-center gap-2"><Edit2 className="w-4 h-4" />Editar</button>
                    {aluno.is_directory_person && <button type="button" onClick={(event) => { event.stopPropagation(); setOpenMenuId(null); setSelectedStudentForEdit(aluno); setSelectedPersonForAccess(aluno.id); setRegistrationModalOpen(true); }} className="w-full text-left px-4 py-2 text-xs font-semibold text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-slate-800 flex items-center gap-2"><UserPlus className="w-4 h-4" />Dar acesso ao sistema</button>}
                    <button type="button" onClick={(event) => { event.stopPropagation(); setOpenMenuId(null); setStudentToDelete(aluno); }} className="w-full text-left px-4 py-2 text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-slate-800 flex items-center gap-2"><Trash2 className="w-4 h-4" />Excluir</button>
                  </div>}
                  {!aluno.is_directory_person && <FolderIcon onClick={(event) => { event.stopPropagation(); handleOpenDocuments(aluno); }} />}
                </div></td>
                <td className="px-5 py-2.5"><div className="font-bold text-slate-900 dark:text-white">{aluno.nome_completo}</div></td>
                <td className="px-5 py-2.5 font-mono text-xs">{aluno.cpf || '-'}</td>
                <td className="px-5 py-2.5"><div className="flex items-center gap-2 text-gray-500 dark:text-slate-400"><Mail className="w-3.5 h-3.5" />{aluno.email || '-'}</div></td>
                <td className="px-5 py-2.5"><div className="flex items-center gap-2 text-gray-500 dark:text-slate-400"><Phone className="w-3.5 h-3.5" />{aluno.telefone || '-'}</div></td>
                <td className="px-5 py-2.5 text-gray-500 dark:text-slate-400">{formatStudentDate(aluno.data_nascimento)}</td>
                <td className="px-5 py-2.5 text-gray-500 dark:text-slate-400">{formatStudentDate(aluno.data_aceite_lgpd)}</td>
              </tr>)}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && <div className="px-4 py-3 border-t border-gray-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between"><span className="text-xs font-semibold text-gray-500 dark:text-slate-400">Mostrando {(currentPage - 1) * itemsPerPage + 1} a {Math.min(currentPage * itemsPerPage, studentRows.length)} de {studentRows.length}</span><div className="flex gap-1">{Array.from({ length: totalPages }).map((_, index) => <button type="button" key={index} onClick={() => setCurrentPage(index + 1)} className={`w-8 h-8 flex items-center justify-center rounded-md text-xs font-bold ${currentPage === index + 1 ? 'bg-slate-900 dark:bg-teal-600 text-white' : 'text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700'}`}>{index + 1}</button>)}</div></div>}
      </div>

      <StudentDetailsPanel isOpen={detailsPanelOpen} onClose={() => { setDetailsPanelOpen(false); setSelectedStudentForDetails(null); }} student={selectedStudentForDetails} />
      <PersonRegistrationModal contextLabel="aluno" isOpen={personRegistrationOpen} initialData={selectedPersonForEdit} requireCpf onClose={() => { setPersonRegistrationOpen(false); setSelectedPersonForEdit(null); }} onSubmit={async (input) => { if (selectedPersonForEdit) await updatePerson({ id: selectedPersonForEdit.id, updates: input }); else await createPerson({ ...input, papel: UserRole.ALUNO }); await queryClient.invalidateQueries({ queryKey: ['people'] }); setPersonRegistrationOpen(false); setSelectedPersonForEdit(null); setToast({ type: 'success', message: selectedPersonForEdit ? 'Aluno atualizado com sucesso.' : 'Aluno cadastrado com sucesso.' }); }} />
      <StudentRegistrationModal personId={selectedPersonForAccess ?? undefined} initialData={selectedStudentForEdit} isOpen={registrationModalOpen} onClose={() => { setRegistrationModalOpen(false); setSelectedStudentForEdit(null); setSelectedPersonForAccess(null); }} onSuccess={({ status }) => { setRegistrationModalOpen(false); setSelectedStudentForEdit(null); setSelectedPersonForAccess(null); setToast({ type: 'success', message: status === 'ativo' ? 'Aluno cadastrado e ativado com sucesso.' : 'Cadastro salvo. O aluno está em Aprovações Pendentes.' }); void queryClient.invalidateQueries({ queryKey: ['users'] }); void queryClient.invalidateQueries({ queryKey: ['people'] }); }} />
      <PasswordModal isOpen={passwordModalOpen} onClose={() => setPasswordModalOpen(false)} onConfirm={(grant) => { setAccessGrant(grant); setDocumentsPanelOpen(true); }} targetUserId={selectedStudentForDocs?.id || ''} />
      <SharedDocumentsPanel isOpen={documentsPanelOpen} onClose={() => { setDocumentsPanelOpen(false); setSelectedStudentForDocs(null); setAccessGrant(null); }} student={selectedStudentForDocs} accessGrant={accessGrant} />
      <Modal isOpen={!!studentToDelete} onClose={() => setStudentToDelete(null)}><div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-6 space-y-4 shadow-2xl font-sans text-center"><div className="mx-auto w-12 h-12 bg-rose-500/10 rounded-full flex items-center justify-center text-rose-600"><Trash2 className="w-6 h-6" /></div><h4 className="font-bold text-base text-slate-900 dark:text-white">Excluir aluno</h4><p className="text-xs text-gray-500 dark:text-slate-400">Tem certeza de que deseja excluir <strong>{studentToDelete?.nome_completo}</strong>?</p><div className="flex items-center gap-3"><button type="button" onClick={() => setStudentToDelete(null)} className="flex-1 py-2 bg-gray-100 dark:bg-slate-800 rounded-lg text-xs font-semibold">Cancelar</button><button type="button" onClick={() => void handleDelete()} className="flex-1 py-2 bg-rose-600 text-white rounded-lg text-xs font-semibold">Confirmar Exclusão</button></div></div></Modal>
      {toast && <div role="alert" className={`fixed bottom-4 right-4 z-[100] max-w-md rounded-xl border p-4 shadow-2xl ${toast.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-rose-200 bg-rose-50 text-rose-900'}`}>{toast.message}</div>}
    </div>
  );
}

export default Students;