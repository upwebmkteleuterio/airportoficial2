const fs = require('fs');

const code = `import { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  MoreVertical,
  UserPlus,
  Mail,
  Phone,
  User
} from 'lucide-react';
import { useUsers } from '../hooks/useUsers';
import { UserRole } from '../types';
import { Button } from '../components/ui/Button';
import { StudentRegistrationModal } from '../components/StudentRegistrationModal';

export function Students() {
  const { users } = useUsers();
  
  const [registrationModalOpen, setRegistrationModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Filter students
  const filteredStudents = useMemo(() => {
    return users
      .filter(u => u.role === UserRole.ALUNO)
      .filter((u) => {
        const query = searchQuery.toLowerCase();
        return (
          u.nome_completo?.toLowerCase().includes(query) ||
          u.cpf?.toLowerCase().includes(query) ||
          u.email?.toLowerCase().includes(query)
        );
      });
  }, [users, searchQuery]);

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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
        <Button
          onClick={() => setRegistrationModalOpen(true)}
          icon={<UserPlus className="w-4 h-4" />}
        >
          Matricular Aluno
        </Button>
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
            {filteredStudents.length} alunos cadastrados
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
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-gray-700 dark:text-slate-300">
              {paginatedStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-slate-400">
                    <User className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-slate-600" />
                    <p className="text-base font-semibold">Nenhum aluno encontrado</p>
                    <p className="text-xs mt-1">Tente ajustar os filtros de busca.</p>
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((aluno) => (
                  <tr
                    key={aluno.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20 transition-colors h-[52px]"
                    onClick={() => setOpenMenuId(null)}
                  >
                    <td className="px-5 py-2.5 text-center relative" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === aluno.id ? null : aluno.id);
                          }}
                          className="p-1 text-gray-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
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
                      {aluno.data_nascimento || '-'}
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
              Mostrando {(currentPage - 1) * itemsPerPage + 1} a {Math.min(currentPage * itemsPerPage, filteredStudents.length)} de {filteredStudents.length}
            </span>
            <div className="flex gap-1">
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={\`w-8 h-8 flex items-center justify-center rounded-md text-xs font-bold transition-colors \${
                    currentPage === i + 1
                      ? 'bg-slate-900 dark:bg-teal-600 text-white shadow-sm'
                      : 'text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700'
                  }\`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <StudentRegistrationModal
        isOpen={registrationModalOpen}
        onClose={() => setRegistrationModalOpen(false)}
        onSuccess={() => {
          setRegistrationModalOpen(false);
          // Optional: Refresh list or show toast
        }}
      />
    </div>
  );
}
`;

fs.writeFileSync('src/pages/Students.tsx', code);
