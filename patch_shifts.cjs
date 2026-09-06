const fs = require('fs');

let content = fs.readFileSync('src/pages/Shifts.tsx', 'utf8');

content = content.replace(
  "import { Plus, Search, Clock, Play, Square, Save, Trash2, X, AlertCircle } from 'lucide-react';",
  "import { Plus, Search, Clock, Play, Square, Save, Trash2, X, AlertCircle, MoreVertical, Edit } from 'lucide-react';"
);

// We need state for `editingShiftId` and `openMenuId`
if (!content.includes('editingShiftId')) {
  content = content.replace(
    /const \[isModalOpen, setIsModalOpen\] = useState\(false\);/,
    `const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Auto-close menu on global click
  React.useEffect(() => {
    const handleGlobalClick = () => setOpenMenuId(null);
    if (openMenuId) document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, [openMenuId]);`
  );
}

// Close modal needs to clear editingShiftId
content = content.replace(
  /setIsModalOpen\(false\);/,
  "setIsModalOpen(false);\n    setEditingShiftId(null);"
);

// handleSave needs to check editingShiftId
const handleSaveRegex = /createMutation\.mutate\(\{\s*nome: formName,\s*horario_inicio: formStart,\s*horario_termino: formEnd,\s*primeira_chamada: formCall1 \|\| 'Sem prova',\s*segunda_chamada: formCall2 \|\| 'Sem prova',\s*ativo: true,\s*is_system: false,\s*\}\);/;

content = content.replace(handleSaveRegex, `if (editingShiftId) {
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
    }`);

// Replace the UI return block
const returnRegex = /return \([\s\S]*?\);\n\}/;

const newReturn = `return (
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
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative w-full sm:w-80 md:w-96 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar turno por nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 transition-colors shadow-sm"
            />
          </div>
          <button
            onClick={() => {
              setEditingShiftId(null);
              setIsModalOpen(true);
            }}
            className="w-full sm:w-auto px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <Plus className="w-5 h-5" />
            Novo Turno
          </button>
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
              ) : filteredShifts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500 font-sans">
                    <div className="flex flex-col items-center justify-center gap-2.5 max-w-sm mx-auto">
                      <div className="p-3 bg-amber-500/10 rounded-full text-amber-500">
                        <AlertCircle className="w-6 h-6 animate-pulse" />
                      </div>
                      <div>
                        <p className="font-bold text-xs text-slate-850 dark:text-slate-200">Nenhum turno localizado</p>
                        <p className="text-[10px] text-gray-400 mt-0.5 leading-normal">
                          Não encontramos turnos que correspondam aos filtros de busca aplicados.
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredShifts.map((shift) => (
                  <tr key={shift.id} className={\`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors \${!shift.ativo ? 'opacity-60' : ''}\`}>
                    <td className="px-4 py-2 text-center border-r border-gray-200/30 dark:border-slate-800/30 relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === shift.id ? null : shift.id);
                        }}
                        className="p-1 text-gray-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors mx-auto flex"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {openMenuId === shift.id && (
                        <div className="absolute left-full top-0 ml-2 w-32 bg-white dark:bg-slate-850 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 py-1 z-[100] text-left">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(null);
                              setEditingShiftId(shift.id);
                              setFormName(shift.nome);
                              setFormStart(shift.horario_inicio);
                              setFormEnd(shift.horario_termino);
                              setFormCall1(shift.primeira_chamada !== 'Sem prova' ? shift.primeira_chamada : '');
                              setFormCall2(shift.segunda_chamada !== 'Sem prova' ? shift.segunda_chamada : '');
                              setIsModalOpen(true);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-2"
                          >
                            <Edit className="w-3.5 h-3.5" /> Editar
                          </button>
                          {!shift.is_system && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(null);
                                handleDelete(shift);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 flex items-center gap-2"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Excluir
                            </button>
                          )}
                        </div>
                      )}
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
                        className={\`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none \${shift.ativo ? 'bg-teal-500' : 'bg-gray-300 dark:bg-slate-600'}\`}
                      >
                        <span className={\`inline-block h-3 w-3 transform rounded-full bg-white transition-transform \${shift.ativo ? 'translate-x-5' : 'translate-x-1'}\`} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-xl flex items-start gap-3 mt-auto shrink-0">
        <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800 dark:text-blue-300">
          <p className="font-semibold mb-1">Informações sobre Migração e Banco de Dados</p>
          <p>
            Os turnos de sistema estão protegidos contra exclusão, mas podem ser desativados e editados. Na migração para o Supabase, 
            estes dados devem ser inseridos em uma tabela <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">shifts</code> com a coluna <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">is_system: boolean</code>.
          </p>
        </div>
      </div>

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
              <button
                onClick={handleSave}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {(createMutation.isPending || updateMutation.isPending) ? 'Salvando...' : (
                  <>
                    <Save className="w-4 h-4" /> {editingShiftId ? 'Atualizar Turno' : 'Salvar Turno'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}`;

content = content.replace(returnRegex, newReturn);
fs.writeFileSync('src/pages/Shifts.tsx', content);
