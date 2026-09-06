import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { shiftService } from '../services/shifts';
import { Shift } from '../types/shift';
import { Plus, HelpCircle, Clock, Save, Trash2, X, AlertCircle, MoreVertical, Edit, Edit2, Power, Info } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { ConfirmDeleteModal } from '../components/ui/ConfirmDeleteModal';
import { HelpModal } from '../components/ui/HelpModal';
import { RowActionMenu } from '../components/ui/RowActionMenu';

export default function Shifts() {
  const queryClient = useQueryClient();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  const [shiftToDelete, setShiftToDelete] = useState<Shift | null>(null);
  
  // Form State

  const [formName, setFormName] = useState('');
  const [formStart, setFormStart] = useState('');
  const [formEnd, setFormEnd] = useState('');
  const [formCall1, setFormCall1] = useState('');
  const [formCall2, setFormCall2] = useState('');

  const { data: shifts = [], isLoading } = useQuery({
    queryKey: ['shifts'],
    queryFn: shiftService.getAll,
  });

  const createMutation = useMutation({
    mutationFn: shiftService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Shift> }) => shiftService.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: shiftService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
    },
  });

  const handleToggleActive = (shift: Shift) => {
    updateMutation.mutate({ id: shift.id, updates: { ativo: !shift.ativo } });
  };

  const handleDelete = (shift: Shift) => {
    if (shift.is_system) return;
    setShiftToDelete(shift);
  };

  const handleConfirmDelete = async () => {
    if (!shiftToDelete || shiftToDelete.is_system) return;

    try {
      await deleteMutation.mutateAsync(shiftToDelete.id);
      setShiftToDelete(null);
    } catch (error) {
      console.error(error);
    }
  };

  const handleSave = () => {
    if (!formName || !formStart || !formEnd) {
      alert('Preencha os campos obrigatórios (Nome, Início, Término).');
      return;
    }
    
    if (editingShiftId) {
      updateMutation.mutate({
        id: editingShiftId,
        updates: {
          nome: formName,
          horario_inicio: formStart,
          horario_termino: formEnd,
          primeira_chamada: formCall1 || 'Sem prova',
          segunda_chamada: formCall2 || 'Sem prova',
        }
      });
      closeModal();
    } else {
      createMutation.mutate({
        nome: formName,
        horario_inicio: formStart,
        horario_termino: formEnd,
        primeira_chamada: formCall1 || 'Sem prova',
        segunda_chamada: formCall2 || 'Sem prova',
        ativo: true,
        is_system: false,
      });
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingShiftId(null);
    setFormName('');
    setFormStart('');
    setFormEnd('');
    setFormCall1('');
    setFormCall2('');
  };

  return (
    <div id="shifts-page" className="flex-1 flex flex-col p-6 gap-6 overflow-y-auto">
      {/* Top Title Section */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 shrink-0">
        <div>
          <h2 className="font-display text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white leading-tight">
            Turnos e Horários
          </h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            Gerencie os períodos de aula e seus horários padrão.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            type="button"
            onClick={() => setIsHelpOpen(true)}
            aria-label="Ajuda"
            title="Ajuda sobre turnos e horários"
            icon={<HelpCircle className="w-4 h-4" aria-hidden="true" />}
          >
            Ajuda
          </Button>
          <Button
            type="button"
            onClick={() => setIsModalOpen(true)}
            aria-label="Cadastrar novo turno"
            title="Cadastrar novo turno"
            icon={<Plus className="w-4 h-4" aria-hidden="true" />}
          >
            Novo Turno
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm flex flex-col min-h-[350px]">
        <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
          <table className="w-full text-left border-collapse whitespace-nowrap text-xs">
            <thead className="sticky top-0 bg-slate-50 dark:bg-slate-850 z-10 border-b border-gray-200 dark:border-slate-800 font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3 w-10 text-center border-r border-gray-200/50 dark:border-slate-800/50"></th>
                <th className="px-4 py-3 border-r border-gray-200/50 dark:border-slate-800/50">Nome do Turno</th>
                <th className="px-4 py-3 border-r border-gray-200/50 dark:border-slate-800/50 text-center">Início</th>
                <th className="px-4 py-3 border-r border-gray-200/50 dark:border-slate-800/50 text-center">Término</th>
                <th className="px-4 py-3 border-r border-gray-200/50 dark:border-slate-800/50 text-center">1ª Chamada</th>
                <th className="px-4 py-3 border-r border-gray-200/50 dark:border-slate-800/50 text-center">2ª Chamada</th>
                <th className="px-4 py-3 border-r border-gray-200/50 dark:border-slate-800/50 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150 dark:divide-slate-800 text-gray-700 dark:text-slate-200 font-mono">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-gray-500">
                      <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                      <p className="font-sans text-sm">Carregando turnos...</p>
                    </div>
                  </td>
                </tr>
              ) : shifts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500 font-sans">
                    <div className="flex flex-col items-center justify-center gap-2.5 max-w-sm mx-auto">
                      <div className="p-3 bg-amber-500/10 rounded-full text-amber-500">
                        <AlertCircle className="w-6 h-6 animate-pulse" />
                      </div>
                      <div>
                        <p className="font-bold text-xs text-slate-850 dark:text-slate-200">Nenhum turno cadastrado</p>
                        <p className="text-[10px] text-gray-400 mt-0.5 leading-normal">
                          Cadastre um novo turno para começar a organizar os horários das turmas.
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                shifts.map((shift) => (
                  <tr key={shift.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${!shift.ativo ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-2 text-center border-r border-gray-200/30 dark:border-slate-800/30">
                      <div className="flex items-center justify-center">
                        <RowActionMenu
                          ariaLabel={`Ações para ${shift.nome}`}
                          items={[
                            {
                              label: 'Editar',
                              icon: <Edit2 className="h-4 w-4" aria-hidden="true" />,
                              onClick: () => {
                                setEditingShiftId(shift.id);
                                setFormName(shift.nome);
                                setFormStart(shift.horario_inicio);
                                setFormEnd(shift.horario_termino);
                                setFormCall1(shift.primeira_chamada !== 'Sem prova' ? shift.primeira_chamada : '');
                                setFormCall2(shift.segunda_chamada !== 'Sem prova' ? shift.segunda_chamada : '');
                                setIsModalOpen(true);
                              },
                            },
                            ...(!shift.is_system
                              ? [
                                  {
                                    label: 'Excluir',
                                    icon: <Trash2 className="h-4 w-4" aria-hidden="true" />,
                                    tone: 'danger' as const,
                                    onClick: () => handleDelete(shift),
                                  },
                                ]
                              : []),
                          ]}
                        />
                      </div>
                    </td>

                    <td className="px-4 py-2 border-r border-gray-200/30 dark:border-slate-800/30 font-sans">
                      <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        {shift.nome}
                        {shift.is_system && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded uppercase tracking-wider">
                            Sistema
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2 border-r border-gray-200/30 dark:border-slate-800/30 text-center">
                      {shift.horario_inicio}
                    </td>
                    <td className="px-4 py-2 border-r border-gray-200/30 dark:border-slate-800/30 text-center">
                      {shift.horario_termino}
                    </td>
                    <td className="px-4 py-2 border-r border-gray-200/30 dark:border-slate-800/30 text-center">
                      {shift.primeira_chamada}
                    </td>
                    <td className="px-4 py-2 border-r border-gray-200/30 dark:border-slate-800/30 text-center">
                      {shift.segunda_chamada}
                    </td>
                    <td className="px-4 py-2 border-r border-gray-200/30 dark:border-slate-800/30 text-center">
                      <button
                        onClick={() => handleToggleActive(shift)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${shift.ativo ? 'bg-teal-500' : 'bg-gray-300 dark:bg-slate-600'}`}
                      >
                        <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${shift.ativo ? 'translate-x-5' : 'translate-x-1'}`} />
                      </button>
                    </td>
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
        title="Ajuda sobre Turnos e Horários"
        description="Use esta tela para gerenciar os turnos e os horários padrão das turmas."
        items={[
          {
            title: 'Objetivo da tela',
            description: 'Gerencie os turnos e os horários padrão das turmas em um só lugar.',
            icon: <Info className="h-4 w-4" aria-hidden="true" />,
          },
          {
            title: 'Menu de três pontos',
            description: 'Abre as opções Editar e Excluir. Turnos marcados como Sistema não podem ser excluídos.',
            icon: <MoreVertical className="h-4 w-4" aria-hidden="true" />,
          },
          {
            title: 'Novo/Cadastrar Novo Turno',
            description: 'Abre o formulário para informar nome, horário de início, horário de término e, opcionalmente, a primeira e a segunda chamada.',
            icon: <Plus className="h-4 w-4" aria-hidden="true" />,
          },
          {
            title: 'Coluna Status',
            description: 'Ative ou desative o turno para definir se ele poderá ser usado no cadastro de turmas.',
            icon: <Power className="h-4 w-4" aria-hidden="true" />,
          },
          {
            title: 'Início e término',
            description: 'Início é o horário em que o período de aula começa; término é o horário em que ele termina.',
            icon: <Clock className="h-4 w-4" aria-hidden="true" />,
          },
          {
            title: 'Primeira e segunda chamada',
            description: 'São os horários opcionais das chamadas de presença: a primeira chamada e, quando necessário, a segunda chamada.',
            icon: <Clock className="h-4 w-4" aria-hidden="true" />,
          },
          {
            title: 'Turnos do Sistema',
            description: 'Turnos marcados como Sistema são registros protegidos contra exclusão.',
            icon: <AlertCircle className="h-4 w-4" aria-hidden="true" />,
          },
        ]}
      />

      <ConfirmDeleteModal
        isOpen={shiftToDelete !== null}
        onClose={() => !deleteMutation.isPending && setShiftToDelete(null)}
        onConfirm={handleConfirmDelete}
        itemName={shiftToDelete?.nome}
        isPending={deleteMutation.isPending}
      />

      {/* Modal Novo/Editar Turno */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-full">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                {editingShiftId ? <Edit className="w-5 h-5 text-teal-600" /> : <Plus className="w-5 h-5 text-teal-600" />}
                {editingShiftId ? 'Editar Turno' : 'Cadastrar Novo Turno'}
              </h2>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wide">
                  Nome do Turno *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: Madrugada"
                  className="w-full border border-gray-300 dark:border-slate-700 rounded px-3 py-2 bg-white dark:bg-slate-850 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wide">
                    Horário de Início *
                  </label>
                  <input
                    type="time"
                    value={formStart}
                    onChange={(e) => setFormStart(e.target.value)}
                    className="w-full border border-gray-300 dark:border-slate-700 rounded px-3 py-2 bg-white dark:bg-slate-850 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wide">
                    Horário de Término *
                  </label>
                  <input
                    type="time"
                    value={formEnd}
                    onChange={(e) => setFormEnd(e.target.value)}
                    className="w-full border border-gray-300 dark:border-slate-700 rounded px-3 py-2 bg-white dark:bg-slate-850 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wide">
                    1ª Chamada (Opcional)
                  </label>
                  <input
                    type="time"
                    value={formCall1}
                    onChange={(e) => setFormCall1(e.target.value)}
                    className="w-full border border-gray-300 dark:border-slate-700 rounded px-3 py-2 bg-white dark:bg-slate-850 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wide">
                    2ª Chamada (Opcional)
                  </label>
                  <input
                    type="time"
                    value={formCall2}
                    onChange={(e) => setFormCall2(e.target.value)}
                    className="w-full border border-gray-300 dark:border-slate-700 rounded px-3 py-2 bg-white dark:bg-slate-850 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900 flex justify-end gap-3">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-800 rounded transition-colors"
              >
                Cancelar
              </button>
              <Button
                onClick={handleSave}
                disabled={createMutation.isPending || updateMutation.isPending}
                icon={!(createMutation.isPending || updateMutation.isPending) && <Save className="w-4 h-4" />}
              >
                {(createMutation.isPending || updateMutation.isPending) ? 'Salvando...' : (editingShiftId ? 'Atualizar Turno' : 'Salvar Turno')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
