import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Filter,
  MoreVertical,
  UserPlus,
  Mail,
  Phone,
  User,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X
} from 'lucide-react';
import { useUsers } from '../hooks/useUsers';
import { usePeople } from '../hooks/usePeople';
import { UserRole } from '../types';
import { Modal } from '../components/ui/Modal';
import { StaffRegistrationModal } from '../components/StaffRegistrationModal';
import { FolderIcon } from '../components/ui/FolderIcon';
import { PasswordModal } from '../components/ui/PasswordModal';
import { SharedDocumentsPanel } from '../components/SharedDocumentsPanel';
import { StaffDetailsPanel } from '../components/StaffDetailsPanel';
import { CreateMenu } from '../components/ui/CreateMenu';
import { PersonRegistrationModal } from '../components/PersonRegistrationModal';
import { DocumentAccessGrant } from '../services/documentAccessService';


type ToastState = {
  type: 'success' | 'error';
  message: string;
};

export function Instructors() {
  const queryClient = useQueryClient();
  const [registrationModalOpen, setRegistrationModalOpen] = useState(false);
  const [personRegistrationOpen, setPersonRegistrationOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<ToastState | null>(null);
  
  const [detailsPanelOpen, setDetailsPanelOpen] = useState(false);
  const [selectedStaffForDetails, setSelectedStaffForDetails] = useState<any | null>(null);
  const [selectedPersonForEdit, setSelectedPersonForEdit] = useState<any | null>(null);

  const [selectedStaffForEdit, setSelectedStaffForEdit] = useState<any | null>(null);
  const [staffToDelete, setStaffToDelete] = useState<any | null>(null);


  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [documentsPanelOpen, setDocumentsPanelOpen] = useState(false);
  const [selectedStaffForDocs, setSelectedStaffForDocs] = useState<any | null>(null);
  const [accessGrant, setAccessGrant] = useState<DocumentAccessGrant | null>(null);

  const handleOpenDocuments = (staff: any) => {
    setAccessGrant(null);
    setSelectedStaffForDocs(staff);
    setPasswordModalOpen(true);
  };

  const handlePasswordConfirm = (grant: DocumentAccessGrant) => {
    setAccessGrant(grant);
    setDocumentsPanelOpen(true);
  };

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  useEffect(() => {
    const handleGlobalClick = () => setOpenMenuId(null);
    if (openMenuId) {
      document.addEventListener('click', handleGlobalClick);
    }
    return () => document.removeEventListener('click', handleGlobalClick);
  }, [openMenuId]);

  useEffect(() => {
    if (!toast) return;
    const timeoutId = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  // Pagination is performed by Supabase; only the current page is kept in memory.
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  const { users, isLoading: isUsersLoading } = useUsers({
    role: UserRole.INSTRUTOR,
    search: searchQuery
  });
  const { people, createPerson, updatePerson, isLoading: isPeopleLoading } = usePeople({
    search: searchQuery,
    directoryOnly: true,
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const instructorRows: any[] = [
    ...people.map((person) => {
      const profile = users.find((user) => user.id === person.id || user.id === person.profile_legacy_id);
      return profile
        ? { ...person, ...profile, id: profile.id, is_directory_person: false }
        : { ...person, nome_completo: person.nome, cpf: person.cpf ?? '', email: '', telefone: '', certificacao_avsec: '', is_directory_person: true };
    }),
    ...users.filter((user) => !people.some((person) => person.id === user.id || person.profile_legacy_id === user.id)),
  ];
  const total = instructorRows.length;
  const paginatedInstructors = instructorRows.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(total / itemsPerPage) || 1;
  const isLoading = isUsersLoading || isPeopleLoading;
  const getErrorMessage = (error: unknown) => {
    if (error instanceof Error && error.message.trim()) return error.message;
    if (error && typeof error === 'object' && 'message' in error) {
      const message = (error as { message?: unknown }).message;
      if (typeof message === 'string' && message.trim()) return message;
    }
    return 'Não foi possível concluir o cadastro do instrutor.';
  };

  return (
    <div className="flex-1 flex flex-col p-6 gap-6 overflow-y-auto font-sans">
      {/* Top Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h2 className="font-display text-2xl md:text-3xl font-extrabold text-slate-950 dark:text-white leading-tight">
            Instrutors
          </h2>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 font-medium">
            Gerenciamento de todos os instrutors cadastrados no sistema.
          </p>
        </div>
        <CreateMenu
          anchor="right"
          triggerLabel="Cadastrar Instrutor"
          label="Como deseja cadastrar o instrutor?"
          items={[
            { label: 'Usuário com acesso', icon: UserPlus },
            { label: 'Pessoa sem login', icon: User },
          ]}
          onSelect={(label) => {
            if (label === 'Usuário com acesso') setRegistrationModalOpen(true);
            if (label === 'Pessoa sem login') setPersonRegistrationOpen(true);
          }}
        />
      </div>

      {/* Filter and Count Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-850 rounded-xl border border-gray-200 dark:border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-750 px-3 py-1.5 rounded-lg font-bold text-xs text-slate-800 dark:text-white shadow-sm">
            <Filter className="w-3.5 h-3.5 text-gray-500" />
            <span>Filtros</span>
          </div>
          <div className="h-5 w-px bg-gray-300 dark:bg-slate-750" />
          <span className="text-xs text-gray-500 dark:text-slate-400 font-semibold">
            {total} instrutors cadastrados
          </span>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1); // Reset to page 1 on search
            }}
            placeholder="Buscar por nome, CPF ou e-mail..."
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:text-white transition-shadow shadow-sm"
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="flex-1 border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 flex flex-col shadow-sm min-h-[400px]">
        <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
          <table className="w-full text-left border-collapse whitespace-nowrap text-sm">
            <thead className="sticky top-0 bg-slate-50 dark:bg-slate-850 z-10 border-b border-gray-200 dark:border-slate-800 font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider text-xs">
              <tr>
                <th className="px-5 py-3 w-12 text-center"></th>
                <th className="px-5 py-3">Nome Completo</th>
                <th className="px-5 py-3">CPF</th>
                <th className="px-5 py-3">E-mail</th>
                <th className="px-5 py-3">Telefone</th>
                <th className="px-5 py-3">Certificação Avsec</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-gray-700 dark:text-slate-300">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-gray-500">
                      <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                      <p className="font-sans text-sm">Carregando instrutors...</p>
                    </div>
                  </td>
                </tr>
              ) : paginatedInstructors.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-slate-400 font-sans">
                    <div className="flex flex-col items-center justify-center gap-2.5 max-w-sm mx-auto">
                      <div className="p-3 bg-teal-500/10 rounded-full text-teal-500">
                        <User className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-slate-800 dark:text-slate-200">Nenhum instrutor encontrado</p>
                        <p className="text-xs text-gray-400 mt-1 leading-normal">
                          Tente ajustar os filtros de busca ou cadastre um novo instrutor.
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedInstructors.map((instrutor) => (
                  <tr
                    key={instrutor.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20 transition-colors h-[52px] cursor-pointer"
                    onClick={() => {
                      setOpenMenuId(null);
                      setSelectedStaffForDetails(instrutor);
                      setDetailsPanelOpen(true);
                    }}
                  >
                    <td className="px-5 py-2.5 text-center relative" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === instrutor.id ? null : instrutor.id);
                          }}
                          className="p-1 text-gray-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        
                        {openMenuId === instrutor.id && (
                          <div className="absolute left-full top-0 ml-2 w-48 bg-white dark:bg-slate-850 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 py-1 z-50">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(null);
                                if (instrutor.is_directory_person) {
                                  setSelectedPersonForEdit(instrutor);
                                  setPersonRegistrationOpen(true);
                                } else {
                                  setSelectedStaffForEdit(instrutor);
                                  setRegistrationModalOpen(true);
                                }
                              }}
                              className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 flex items-center gap-2"
                            >
                              <Edit2 className="w-4 h-4" />
                              Editar
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(null);
                                setStaffToDelete(instrutor);
                              }}
                              className="w-full text-left px-4 py-2 text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2"
                            >
                              <Trash2 className="w-4 h-4" />
                              Excluir
                            </button>
                          </div>
                        )}
                        <FolderIcon title="Ver Documentos do Instrutor" onClick={(e) => { e.stopPropagation(); handleOpenDocuments(instrutor); }} />

                      </div>
                    </td>
                    <td className="px-5 py-2.5">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {instrutor.nome_completo}
                      </div>
                    </td>
                    <td className="px-5 py-2.5 font-mono text-xs">{instrutor.cpf}</td>
                    <td className="px-5 py-2.5">
                      <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400">
                        <Mail className="w-3.5 h-3.5" />
                        {instrutor.email || '-'}
                      </div>
                    </td>
                    <td className="px-5 py-2.5">
                      <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400">
                        <Phone className="w-3.5 h-3.5" />
                        {instrutor.telefone || '-'}
                      </div>
                    </td>
                    <td className="px-5 py-2.5"><span className="px-2 py-1 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 rounded text-xs font-semibold">{instrutor.certificacao_avsec || "-"}</span></td>
                    <td className="px-5 py-2.5"><span className={`px-2 py-1 rounded text-xs font-semibold ${instrutor.status === 'ativo' || instrutor.ativo ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-300'}`}>{instrutor.status === 'ativo' || instrutor.ativo ? 'Ativo' : 'Inativo'}</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-slate-400">
              Mostrando {(currentPage - 1) * itemsPerPage + 1} a {Math.min(currentPage * itemsPerPage, total)} de {total}
            </span>
            <div className="flex gap-1">
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-8 h-8 flex items-center justify-center rounded-md text-xs font-bold transition-colors ${
                    currentPage === i + 1
                      ? 'bg-slate-900 dark:bg-teal-600 text-white shadow-sm'
                      : 'text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      
      <StaffDetailsPanel 
        isOpen={detailsPanelOpen}
        onClose={() => {
          setDetailsPanelOpen(false);
          setSelectedStaffForDetails(null);
        }}
        staff={selectedStaffForDetails}
      />

      
      <Modal isOpen={!!staffToDelete} onClose={() => setStaffToDelete(null)}>
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-6 space-y-4 shadow-2xl font-sans text-center">
          <div className="mx-auto w-12 h-12 bg-rose-500/10 rounded-full flex items-center justify-center text-rose-600 dark:text-rose-400">
            <Trash2 className="w-6 h-6 animate-pulse" />
          </div>
          <div className="space-y-2">
            <h4 className="font-bold text-base text-slate-900 dark:text-white">Excluir Instrutor</h4>
            <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
              Tem certeza de que deseja excluir o instrutor <span className="font-semibold text-slate-850 dark:text-slate-200">{staffToDelete?.nome_completo}</span>? Esta ação não pode ser desfeita.
            </p>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => setStaffToDelete(null)}
              className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-850 dark:text-slate-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                // TODO: useUsers().deleteUser
                // for now just close
                setStaffToDelete(null);
              }}
              className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm cursor-pointer"
            >
              Confirmar Exclusão
            </button>
          </div>
        </div>
      </Modal>

      <PasswordModal
        isOpen={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
        onConfirm={handlePasswordConfirm}
        targetUserId={selectedStaffForDocs?.id || ''}
      />
      <SharedDocumentsPanel
        isOpen={documentsPanelOpen}
        onClose={() => {
          setDocumentsPanelOpen(false);
          setSelectedStaffForDocs(null);
          setAccessGrant(null);
        }}
        student={selectedStaffForDocs}
        accessGrant={accessGrant}
      />
      <PersonRegistrationModal
        isOpen={personRegistrationOpen}
        initialData={selectedPersonForEdit}
        onClose={() => {
          setPersonRegistrationOpen(false);
          setSelectedPersonForEdit(null);
        }}
        onSubmit={async (input) => {
          if (selectedPersonForEdit) {
            await updatePerson({ id: selectedPersonForEdit.id, updates: input });
          } else {
            await createPerson(input);
          }
          await queryClient.invalidateQueries({ queryKey: ['people'] });
          setToast({ type: 'success', message: selectedPersonForEdit ? 'Pessoa atualizada com sucesso.' : 'Pessoa cadastrada com sucesso.' });
        }}
      />
      <StaffRegistrationModal role={UserRole.INSTRUTOR}
        initialData={selectedStaffForEdit}
        isOpen={registrationModalOpen}
        onClose={() => { setRegistrationModalOpen(false); setSelectedStaffForEdit(null); }}
        onSuccess={() => {
          const wasEditing = Boolean(selectedStaffForEdit);
          setRegistrationModalOpen(false);
          setSelectedStaffForEdit(null);
          setToast({
            type: 'success',
            message: wasEditing
              ? 'Instrutor atualizado com sucesso.'
              : 'Instrutor cadastrado com sucesso.'
          });
          queryClient.invalidateQueries({ queryKey: ['users'] });
          void queryClient.refetchQueries({ queryKey: ['users'] });
        }}
        onError={(error) => {
          setToast({
            type: 'error',
            message: `Não foi possível salvar o instrutor: ${getErrorMessage(error)}`
          });
        }}
      />

      {toast && (
        <div
          role="alert"
          className={`fixed bottom-4 right-4 z-[100] w-[calc(100vw-2rem)] max-w-md rounded-xl border p-4 shadow-2xl ${
            toast.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/90 dark:text-emerald-100'
              : 'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/90 dark:text-rose-100'
          }`}
        >
          <div className="flex items-start gap-3">
            {toast.type === 'success'
              ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
              : <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />}
            <p className="min-w-0 flex-1 text-sm font-semibold leading-5">{toast.message}</p>
            <button
              type="button"
              aria-label="Fechar aviso"
              onClick={() => setToast(null)}
              className="rounded-md p-1 opacity-70 transition-opacity hover:opacity-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Instructors;
