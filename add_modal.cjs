const fs = require('fs');
let content = fs.readFileSync('src/pages/CentralGed.tsx', 'utf8');

const modalCode = `
      {/* Filters Modal */}
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
            <button
              onClick={() => setIsFiltersModalOpen(false)}
              className="px-4 py-2 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-bold hover:bg-gray-50 dark:hover:bg-slate-750 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                setSelectedEmpresa(tempEmpresa);
                setSelectedTurma(tempTurma);
                setSelectedIaFilter(tempIaFilter);
                setIsFiltersModalOpen(false);
              }}
              className="px-4 py-2 bg-[#005f5f] text-white rounded-lg text-sm font-bold hover:bg-[#004d4d] transition-colors"
            >
              Aplicar Filtros
            </button>
          </div>
        </div>
      </Modal>

      {/* --- SIDE SLIDING DRAWER / DIALOG FOR MANUAL REVIEW (REVISAR) --- */}`;

content = content.replace('{/* --- SIDE SLIDING DRAWER / DIALOG FOR MANUAL REVIEW (REVISAR) --- */}', modalCode);
fs.writeFileSync('src/pages/CentralGed.tsx', content);
