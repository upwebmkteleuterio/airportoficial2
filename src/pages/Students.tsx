import { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  MoreVertical,
  UserPlus,
  Mail,
  Phone,
  User,
  Edit2,
  Trash2
} from 'lucide-react';
import { useUsers } from '../hooks/useUsers';
import { UserRole } from '../types';
import { Modal } from '../components/ui/Modal';
import { StudentRegistrationModal } from '../components/StudentRegistrationModal';
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

export function Students() {
  const [registrationModalOpen, setRegistrationModalOpen] = useState(false);
  const [registrationNotice, setRegistrationNotice] = useState<'ativo' | 'pendente' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [detailsPanelOpen, setDetailsPanelOpen] = useState(false);
  const [selectedStudentForDetails, setSelectedStudentForDetails] = useState<any | null>(null);

  const [selectedStudentForEdit, setSelectedStudentForEdit] = useState<any | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<any | null>(null);


  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [documentsPanelOpen, setDocumentsPanelOpen] = useState(false);
  const [selectedStudentForDocs, setSelectedStudentForDocs] = useState<any | null>(null);
  const [accessGrant, setAccessGrant] = useState<DocumentAccessGrant | null>(null);

  const handleOpenDocuments = (student: any) => {
    setAccessGrant(null);
    setSelectedStudentForDocs(student);
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


  // Pagination is performed by Supabase; only the current page is kept in memory.
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  const { users, total, isLoading, refetch } = useUsers({
    page: currentPage,
    pageSize: itemsPerPage,
    role: UserRole.ALUNO,
    status: 'ativo',
    search: searchQuery
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  useEffect(() => {
    if (!registrationNotice) return;
    const timer = window.setTimeout(() => setRegistrationNotice(null), 6000);
    return () => window.clearTimeout(timer);
  }, [registrationNotice]);

  const totalPages = Math.ceil(total / itemsPerPage) || 1;
  const paginatedStudents = users;

  return (
    <div className="flex-1 flex flex-col p-6 gap-6 overflow-y-auto font-sans">
      {/* Top Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h2 className="font-display text-2xl md:text-3xl font-extrabold text-slate-950 dark:text-white leading-tight">
            Alunos
          </h2>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 font-medium">
            Gerenciamento de todos os alunos cadastrados no sistema.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setRegistrationModalOpen(true)}
          className="px-4 py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer bg-slate-900 dark:bg-teal-600 hover:bg-slate-850 dark:hover:bg-teal-500 text-white"
        >
          <UserPlus className="w-4 h-4" />
          Matricular Aluno
        </button>
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
            {total} alunos cadastrados
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
                <th className="px-5 py-3">Data de Nasc.</th>
                <th className="px-5 py-3">Data de Matrícula</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-gray-700 dark:text-slate-300">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-gray-500">
                      <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                      <p className="font-sans text-sm">Carregando alunos...</p>
                    </div>
                  </td>
                </tr>
              ) : paginatedStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-slate-400 font-sans">
                    <div className="flex flex-col items-center justify-center gap-2.5 max-w-sm mx-auto">
                      <div className="p-3 bg-teal-500/10 rounded-full text-teal-500">
                        <User className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-slate-800 dark:text-slate-200">Nenhum aluno encontrado</p>
                        <p className="text-xs text-gray-400 mt-1 leading-normal">
                          Tente ajustar os filtros de busca ou cadastre um novo aluno.
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((aluno) => (
                  <tr
                    key={aluno.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20 transition-colors h-[52px] cursor-pointer"
                    onClick={() => {
                      setOpenMenuId(null);
                      setSelectedStudentForDetails(aluno);
                      setDetailsPanelOpen(true);
                    }}
                  >
                    <td className="px-5 py-2.5 text-center relative" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === aluno.id ? null : aluno.id);
                          }}
                          className="p-1 text-gray-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        
                        {openMenuId === aluno.id && (
                          <div className="absolute left-full top-0 ml-2 w-48 bg-white dark:bg-slate-850 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 py-1 z-50">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(null);
                                // TODO: Handle Edit
                                setSelectedStudentForEdit(aluno);
                                setRegistrationModalOpen(true);
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
                                setStudentToDelete(aluno);
                              }}
                              className="w-full text-left px-4 py-2 text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2"
                            >
                              <Trash2 className="w-4 h-4" />
                              Excluir
                            </button>
                          </div>
                        )}
                        <FolderIcon onClick={(e) => { e.stopPropagation(); handleOpenDocuments(aluno); }} />

                      </div>
                    </td>
                    <td className="px-5 py-2.5">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {aluno.nome_completo}
                      </div>
                    </td>
                    <td className="px-5 py-2.5 font-mono text-xs">{aluno.cpf}</td>
                    <td className="px-5 py-2.5">
                      <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400">
                        <Mail className="w-3.5 h-3.5" />
                        {aluno.email || '-'}
                      </div>
                    </td>
                    <td className="px-5 py-2.5">
                      <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400">
                        <Phone className="w-3.5 h-3.5" />
                        {aluno.telefone || '-'}
                      </div>
                    </td>
                                        <td className="px-5 py-2.5 text-gray-500 dark:text-slate-400">
                                          {formatStudentDate(aluno.data_nascimento)}
                                        </td>
                                        <td className="px-5 py-2.5 text-gray-500 dark:text-slate-400">
                                          {formatStudentDate(aluno.data_aceite_lgpd)}
                                        </td>
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
      
      <StudentDetailsPanel 
        isOpen={detailsPanelOpen}
        onClose={() => {
          setDetailsPanelOpen(false);
          setSelectedStudentForDetails(null);
        }}
        student={selectedStudentForDetails}
      />

      
      <Modal isOpen={!!studentToDelete} onClose={() => setStudentToDelete(null)}>
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-6 space-y-4 shadow-2xl font-sans text-center">
          <div className="mx-auto w-12 h-12 bg-rose-500/10 rounded-full flex items-center justify-center text-rose-600 dark:text-rose-400">
            <Trash2 className="w-6 h-6 animate-pulse" />
          </div>
          <div className="space-y-2">
            <h4 className="font-bold text-base text-slate-900 dark:text-white">Excluir Aluno</h4>
            <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
              Tem certeza de que deseja excluir o aluno <span className="font-semibold text-slate-850 dark:text-slate-200">{studentToDelete?.nome_completo}</span>? Esta ação não pode ser desfeita.
            </p>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => setStudentToDelete(null)}
              className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-850 dark:text-slate-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                // TODO: useUsers().deleteUser
                // for now just close
                setStudentToDelete(null);
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
        targetUserId={selectedStudentForDocs?.id || ''}
      />
      <SharedDocumentsPanel
        isOpen={documentsPanelOpen}
        onClose={() => {
          setDocumentsPanelOpen(false);
          setSelectedStudentForDocs(null);
          setAccessGrant(null);
        }}
        student={selectedStudentForDocs}
        accessGrant={accessGrant}
      />
      <StudentRegistrationModal
        initialData={selectedStudentForEdit}
        isOpen={registrationModalOpen}
        onClose={() => { setRegistrationModalOpen(false); setSelectedStudentForEdit(null); }}
        onSuccess={({ status }) => {
          setRegistrationModalOpen(false);
          setSelectedStudentForEdit(null);
          setRegistrationNotice(status);
          void refetch();
        }}
      />
      {registrationNotice && (
        <div role="status" className="fixed bottom-5 left-1/2 z-[70] -translate-x-1/2 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-xl dark:border-slate-700 dark:bg-slate-900 dark:text-white">
          {registrationNotice === 'ativo'
            ? 'Aluno cadastrado e ativado com sucesso.'
            : 'Cadastro salvo. O aluno está em Aprovações Pendentes aguardando documentação completa.'}
        </div>
      )}
    </div>
  );
}

export default Students;
