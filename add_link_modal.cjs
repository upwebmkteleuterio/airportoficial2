const fs = require('fs');
let content = fs.readFileSync('src/pages/Companies.tsx', 'utf8');

const modalToInsert = `      {/* Link Config Modal */}
      <Modal 
        isOpen={!!linkModalCompany} 
        onClose={() => setLinkModalCompany(null)} 
        title="Configurar Link de Matrícula"
      >
        <div className="space-y-4 font-sans text-left min-w-[300px]">
          <p className="text-sm text-slate-500">
            Selecione as turmas que estarão disponíveis para os funcionários da empresa <strong className="text-slate-800 dark:text-slate-200">{linkModalCompany?.nome_fantasia || linkModalCompany?.razao_social}</strong>.
          </p>
          <div className="max-h-60 overflow-y-auto space-y-2 border border-slate-200 dark:border-slate-700 rounded-lg p-2 bg-slate-50 dark:bg-slate-900/50">
            {classes.length === 0 ? (
              <p className="text-xs text-center text-slate-400 py-4">Nenhuma turma cadastrada.</p>
            ) : (
              classes.map((cls: any) => (
                <label key={cls.id} className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded cursor-pointer transition-colors">
                  <input 
                    type="checkbox" 
                    className="rounded border-slate-300 text-teal-500 focus:ring-teal-500 w-4 h-4"
                    checked={selectedClassesForLink.includes(cls.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedClassesForLink([...selectedClassesForLink, cls.id]);
                      } else {
                        setSelectedClassesForLink(selectedClassesForLink.filter(id => id !== cls.id));
                      }
                    }}
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">T-OP-{cls.id_interno_escola}</span>
                    <span className="text-xs text-slate-500">{cls.turno}</span>
                  </div>
                </label>
              ))
            )}
          </div>
          
          <div className="mt-4 p-3 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Link de Compartilhamento</label>
            <div className="flex items-center justify-between gap-2 overflow-hidden bg-white dark:bg-slate-900 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded">
              <span className="text-xs truncate text-slate-700 dark:text-slate-300">
                {window.location.origin}/enroll/{linkModalCompany?.id}{selectedClassesForLink.length > 0 ? \`?classes=\${selectedClassesForLink.join(',')}\` : ''}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button 
              onClick={() => setLinkModalCompany(null)}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            >
              Cancelar
            </button>
            <button 
              onClick={handleGenerateAndCopyLink}
              className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white text-sm font-bold rounded shadow-sm flex items-center gap-2 transition-colors"
            >
              {copiedToken === linkModalCompany?.token_registro_b2b ? (
                <Check className="w-4 h-4 text-white" />
              ) : (
                <LinkIcon className="w-4 h-4" />
              )}
              {copiedToken === linkModalCompany?.token_registro_b2b ? 'Copiado!' : 'Copiar Link'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Company Confirmation Modal */}`;

content = content.replace("      {/* Delete Company Confirmation Modal */}", modalToInsert);

fs.writeFileSync('src/pages/Companies.tsx', content);
