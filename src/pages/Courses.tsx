import React, { useState } from 'react';
import { BookOpen, Edit, Edit2, HelpCircle, Info, MoreVertical, Plus, Trash2, X } from 'lucide-react';
import { useCourses } from '../hooks/useCourses';
import { Curso } from '../types';
import { Button } from '../components/ui/Button';
import { ConfirmDeleteModal } from '../components/ui/ConfirmDeleteModal';
import { HelpModal } from '../components/ui/HelpModal';
import { RowActionMenu } from '../components/ui/RowActionMenu';
import { QueryErrorState } from '../components/ui/QueryErrorState';

export default function Courses() {
  const {
    courses,
    createCourse,
    updateCourse,
    deleteCourse,
    isLoading,
    isFetching,
    isError,
    refetch,
    isCreating,
    isUpdating,
    isDeleting,
  } = useCourses();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Curso>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<Curso | null>(null);

  const openModal = (course?: Curso) => {
    if (course) {

      setEditingId(course.id);
      setFormData(course);
    } else {
      setEditingId(null);
      setFormData({ nome_curso: '', carga_horaria_total: 0 });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isCreating || isUpdating) return;
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({});
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome_curso || !formData.carga_horaria_total) return;

    if (editingId) {
      await updateCourse({ id: editingId, updates: formData });
    } else {
      await createCourse(formData as Omit<Curso, 'id'>);
    }
    closeModal();
  };

  const handleConfirmDelete = async () => {
    if (!courseToDelete) return;
    try {
      await deleteCourse(courseToDelete.id);
      setCourseToDelete(null);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-6 gap-6 overflow-y-auto">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 shrink-0">
        <div>
          <h2 className="font-display text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white leading-tight">Cursos</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Gerencie os cursos base da instituição e suas respectivas cargas horárias.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            type="button"
            onClick={() => setIsHelpOpen(true)}
            aria-label="Ajuda"
            title="Ajuda sobre cursos"
            icon={<HelpCircle className="w-4 h-4" aria-hidden="true" />}
          >
            Ajuda
          </Button>
          <Button
            type="button"
            onClick={() => openModal()}
            aria-label="Cadastrar novo curso"
            title="Cadastrar novo curso"
            icon={<Plus className="w-4 h-4" aria-hidden="true" />}
          >
            Novo Curso
          </Button>
        </div>
      </div>

      <div className="flex-1 border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm flex flex-col min-h-[350px]">
        {isError && !isLoading && courses.length > 0 && <QueryErrorState compact onRetry={() => void refetch()} isRetrying={isFetching} message="Os dados anteriores continuam visíveis." />}
        <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
          <table className="w-full text-left border-collapse whitespace-nowrap text-xs">
            <thead className="sticky top-0 bg-slate-50 dark:bg-slate-850 z-10 border-b border-gray-200 dark:border-slate-800 font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3 w-10 text-center border-r border-gray-200/50 dark:border-slate-800/50" aria-label="Ações"></th>
                <th className="px-4 py-3 border-r border-gray-200/50 dark:border-slate-800/50">Nome do Curso</th>
                <th className="px-4 py-3 border-r border-gray-200/50 dark:border-slate-800/50 text-center">Carga Horária (h)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150 dark:divide-slate-800 text-gray-700 dark:text-slate-200">
              {isLoading ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-gray-500">
                      <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" aria-label="Carregando" />
                      <p className="font-sans text-sm">Carregando cursos...</p>
                    </div>
                  </td>
                </tr>
              ) : isError && courses.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-12 text-center text-gray-500 font-sans">
                    <QueryErrorState onRetry={() => void refetch()} isRetrying={isFetching} message="Verifique sua conexão e tente novamente." />
                  </td>
                </tr>
              ) : courses.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-12 text-center text-gray-500 font-sans">
                    <div className="flex flex-col items-center justify-center gap-2.5 max-w-sm mx-auto">
                      <div className="p-3 bg-teal-500/10 rounded-full text-teal-500">
                        <BookOpen className="w-6 h-6" aria-hidden="true" />
                      </div>
                      <div>
                        <p className="font-bold text-xs text-slate-850 dark:text-slate-200">Nenhum curso encontrado</p>
                        <p className="text-[10px] text-gray-400 mt-0.5 leading-normal">Adicione um novo curso para começar.</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                courses.map((course) => (
                  <tr key={course.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-2 text-center border-r border-gray-200/30 dark:border-slate-800/30">
                      <div className="flex items-center justify-center">
                        <RowActionMenu
                          ariaLabel={`Ações para ${course.nome_curso}`}
                          items={[
                            {
                              label: 'Editar',
                              icon: <Edit2 className="h-4 w-4" aria-hidden="true" />,
                              onClick: () => openModal(course),
                            },
                            {
                              label: 'Excluir',
                              icon: <Trash2 className="h-4 w-4" aria-hidden="true" />,
                              tone: 'danger',
                              onClick: () => setCourseToDelete(course),
                            },
                          ]}
                        />
                      </div>
                    </td>

                    <td className="px-4 py-2 border-r border-gray-200/30 dark:border-slate-800/30 font-sans font-semibold text-slate-800 dark:text-slate-200">{course.nome_curso}</td>
                    <td className="px-4 py-2 border-r border-gray-200/30 dark:border-slate-800/30 text-center">{course.carga_horaria_total}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <HelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        title="Ajuda sobre Cursos"
        description="Use esta tela para manter os cursos base da instituição e suas cargas horárias organizados."
        items={[
          {
            title: 'Objetivo da tela',
            description: 'Cadastre e gerencie os cursos oferecidos pela instituição e consulte a carga horária de cada um.',
            icon: <Info className="h-4 w-4" aria-hidden="true" />,
          },
          {
            title: 'Novo Curso',
            description: 'Abre o formulário para cadastrar o nome do curso e sua carga horária total.',
            icon: <Plus className="h-4 w-4" aria-hidden="true" />,
          },
          {
            title: 'Menu de três pontos',
            description: 'Abre as ações disponíveis para cada curso: Editar e Excluir.',
            icon: <MoreVertical className="h-4 w-4" aria-hidden="true" />,
          },
          {
            title: 'Editar',
            description: 'Permite alterar o nome do curso e a carga horária total cadastrada.',
            icon: <Edit2 className="h-4 w-4" aria-hidden="true" />,
          },
          {
            title: 'Excluir',
            description: 'Solicita confirmação antes de excluir o curso. A exclusão só acontece após confirmar.',
            icon: <Trash2 className="h-4 w-4" aria-hidden="true" />,
          },
          {
            title: 'Carga horária',
            description: 'Informe a carga horária total do curso em horas.',
            icon: <BookOpen className="h-4 w-4" aria-hidden="true" />,
          },
        ]}
      />

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-labelledby="course-form-title">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-800">
              <h2 id="course-form-title" className="text-lg font-bold text-slate-800 dark:text-white">
                {editingId ? 'Editar Curso' : 'Novo Curso'}
              </h2>
              <button type="button" onClick={closeModal} disabled={isCreating || isUpdating} aria-label="Fechar formulário" title="Fechar" className="text-gray-500 hover:text-gray-700 dark:hover:text-white disabled:opacity-50">
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label htmlFor="course-name" className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase mb-1">Nome do Curso</label>
                <input
                  id="course-name"
                  type="text"
                  required
                  value={formData.nome_curso || ''}
                  onChange={e => setFormData({ ...formData, nome_curso: e.target.value })}
                  className="w-full border border-gray-300 dark:border-slate-700 rounded px-3 py-2 bg-transparent dark:text-white focus:outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label htmlFor="course-hours" className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase mb-1">Carga Horária (h)</label>
                <input
                  id="course-hours"
                  type="number"
                  required
                  value={formData.carga_horaria_total || ''}
                  onChange={e => setFormData({ ...formData, carga_horaria_total: Number(e.target.value) })}
                  className="w-full border border-gray-300 dark:border-slate-700 rounded px-3 py-2 bg-transparent dark:text-white focus:outline-none focus:border-teal-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="secondary" type="button" onClick={closeModal} disabled={isCreating || isUpdating}>Cancelar</Button>
                <Button type="submit" disabled={isCreating || isUpdating}>{isCreating || isUpdating ? 'Salvando...' : editingId ? 'Atualizar' : 'Salvar'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDeleteModal
        isOpen={courseToDelete !== null}
        onClose={() => !isDeleting && setCourseToDelete(null)}
        onConfirm={handleConfirmDelete}
        itemName={courseToDelete?.nome_curso}
        isPending={isDeleting}
      />
    </div>
  );
}
