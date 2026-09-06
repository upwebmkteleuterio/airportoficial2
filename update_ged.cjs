const fs = require('fs');
let content = fs.readFileSync('src/pages/CentralGed.tsx', 'utf8');

if (!content.includes('import { Button }')) {
  content = content.replace("import { Modal } from '../components/ui/Modal';", "import { Modal } from '../components/ui/Modal';\nimport { Button } from '../components/ui/Button';");
}

const state_regex = /const \[showFiltersDropdown, setShowFiltersDropdown\] = useState\(false\);/;
content = content.replace(state_regex, `const [isFiltersModalOpen, setIsFiltersModalOpen] = useState(false);\n  const [tempEmpresa, setTempEmpresa] = useState('todas');\n  const [tempTurma, setTempTurma] = useState('todas');\n  const [tempIaFilter, setTempIaFilter] = useState('todos');`);

const regex = /\{\/\* Filters bar and query inputs \*\/\}[\s\S]*?\{\/\* 3 Summary Cards Row \*\//m;

const replacement = `{/* Filter and Count Bar */}
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-850 rounded-xl border border-gray-200 dark:border-slate-800 shrink-0">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              setTempEmpresa(selectedEmpresa);
              setTempTurma(selectedTurma);
              setTempIaFilter(selectedIaFilter);
              setIsFiltersModalOpen(true);
            }}
            className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-750 hover:bg-gray-50 dark:hover:bg-slate-800 px-3 py-1.5 rounded-lg font-bold text-xs text-slate-800 dark:text-white shadow-sm transition-colors cursor-pointer"
          >
            <Filter className="w-3.5 h-3.5 text-gray-500" />
            <span>Filtros</span>
          </button>
          
          <div className="h-5 w-px bg-gray-300 dark:bg-slate-750" />
          
          <span className="text-xs text-gray-500 dark:text-slate-400 font-semibold">
            {filteredQueue.length} aprovações pendentes
          </span>

          {/* Active Filter Tags */}
          {(selectedEmpresa !== 'todas' || selectedTurma !== 'todas' || selectedIaFilter !== 'todos') && (
            <div className="flex flex-wrap items-center gap-2 ml-2">
              {selectedEmpresa !== 'todas' && (
                <span className="inline-flex items-center gap-1 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 px-2 py-1 rounded text-[10px] font-bold border border-teal-200 dark:border-teal-800">
                  Empresa: {companies.find(c => c.id === selectedEmpresa)?.nome_fantasia || companies.find(c => c.id === selectedEmpresa)?.razao_social || '...'}
                  <button onClick={() => setSelectedEmpresa('todas')} className="hover:text-teal-900 dark:hover:text-teal-200"><X className="w-3 h-3" /></button>
                </span>
              )}
              {selectedTurma !== 'todas' && (
                <span className="inline-flex items-center gap-1 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 px-2 py-1 rounded text-[10px] font-bold border border-teal-200 dark:border-teal-800">
                  Turma: {classes.find(c => c.id === selectedTurma)?.id_anac || '...'}
                  <button onClick={() => setSelectedTurma('todas')} className="hover:text-teal-900 dark:hover:text-teal-200"><X className="w-3 h-3" /></button>
                </span>
              )}
              {selectedIaFilter !== 'todos' && (
                <span className="inline-flex items-center gap-1 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 px-2 py-1 rounded text-[10px] font-bold border border-teal-200 dark:border-teal-800">
                  Status IA: {selectedIaFilter === 'divergencia' ? 'Divergência de Nome' : selectedIaFilter === 'aprovado' ? 'Aprovado por IA' : selectedIaFilter === 'baixa_qualidade' ? 'Baixa Qualidade' : selectedIaFilter}
                  <button onClick={() => setSelectedIaFilter('todos')} className="hover:text-teal-900 dark:hover:text-teal-200"><X className="w-3 h-3" /></button>
                </span>
              )}
              <button 
                onClick={() => { setSelectedEmpresa('todas'); setSelectedTurma('todas'); setSelectedIaFilter('todos'); }}
                className="text-[10px] font-semibold text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors underline"
              >
                Limpar todos
              </button>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="relative w-full xl:w-72 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar alunos ou documentos..."
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#005f5f] dark:text-white transition-shadow shadow-sm"
          />
        </div>
      </div>

      {/* 3 Summary Cards Row */`;

content = content.replace(regex, replacement);

const modal_code = `
      <Modal isOpen={isFiltersModalOpen} onClose={() => setIsFiltersModalOpen(false)}>
        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-2xl font-sans relative overflow-hidden border border-gray-200 dark:border-slate-800">
          <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-[#005f5f] dark:text-teal-400" />
            Filtros
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Empresa</label>
              <select
                value={tempEmpresa}
                onChange={(e) => setTempEmpresa(e.target.value)}
                className="w-full border border-gray-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-850 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#005f5f] outline-none"
              >
                <option value="todas">Todas as Empresas</option>
                {companies.map(c => (
                  <option key={c.id} value={c.id}>{c.nome_fantasia || c.razao_social}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Turma</label>
              <select
                value={tempTurma}
                onChange={(e) => setTempTurma(e.target.value)}
                className="w-full border border-gray-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-850 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#005f5f] outline-none"
              >
                <option value="todas">Todas as Turmas</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.id_anac}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Status da IA</label>
              <select
                value={tempIaFilter}
                onChange={(e) => setTempIaFilter(e.target.value)}
                className="w-full border border-gray-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-850 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#005f5f] outline-none"
              >
                <option value="todos">Todos os Documentos</option>
                <option value="divergencia">Divergência de Nome</option>
                <option value="aprovado">Aprovados por IA</option>
                <option value="baixa_qualidade">Baixa Qualidade</option>
              </select>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="secondary" onClick={() => setIsFiltersModalOpen(false)}>Cancelar</Button>
            <Button onClick={() => {
              setSelectedEmpresa(tempEmpresa);
              setSelectedTurma(tempTurma);
              setSelectedIaFilter(tempIaFilter);
              setIsFiltersModalOpen(false);
            }}>
              Aplicar Filtros
            </Button>
          </div>
        </div>
      </Modal>

      {/* Slide Panel for Review */}`;

content = content.replace('{/* Slide Panel for Review */}', modal_code);

fs.writeFileSync('src/pages/CentralGed.tsx', content);
