const fs = require('fs');
let content = fs.readFileSync('src/components/StudentDetailsPanel.tsx', 'utf8');

const historyContent = `
        {activeTab === 'history' && (
          <div className="space-y-6">
            <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200">Linha do Tempo de Turmas</h4>
            
            {historyQuery.isLoading ? (
              <div className="text-sm text-gray-500">Carregando histórico...</div>
            ) : historyQuery.data && historyQuery.data.length > 0 ? (
              <div className="relative border-l-2 border-gray-200 dark:border-slate-700 ml-3 space-y-6">
                {historyQuery.data.map(matricula => {
                  const details = getCourseDetails(matricula.turma_id);
                  if (!details || !details.turma) return null;
                  const { turma, course } = details;
                  
                  return (
                    <div key={matricula.id} className="relative pl-6">
                      <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-teal-500 border-4 border-white dark:border-slate-900" />
                      
                      <div 
                        onClick={() => handleOpenClass(turma.id)}
                        className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h5 className="font-bold text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                              {course?.nome_curso || 'Curso Desconhecido'}
                            </h5>
                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400 mt-1">
                              <span className="font-mono bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-gray-700 dark:text-slate-300">
                                {turma.id_anac}
                              </span>
                              <span>•</span>
                              <span>Turma {turma.id_interno_escola}</span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {turma.data_inicio} a {turma.data_termino}
                              </span>
                            </div>
                          </div>
                          <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-teal-500" />
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-xs">
                          <div>
                            <span className="block text-gray-500 dark:text-slate-400 mb-0.5">Turno</span>
                            <span className="font-medium text-slate-700 dark:text-slate-200">{turma.turno}</span>
                          </div>
                          <div>
                            <span className="block text-gray-500 dark:text-slate-400 mb-0.5">Horário</span>
                            <span className="font-medium text-slate-700 dark:text-slate-200">{turma.horario_aulas}</span>
                          </div>
                          <div>
                            <span className="block text-gray-500 dark:text-slate-400 mb-0.5">Cidade/UF</span>
                            <span className="font-medium text-slate-700 dark:text-slate-200">{turma.cidade}/{turma.uf}</span>
                          </div>
                          <div>
                            <span className="block text-gray-500 dark:text-slate-400 mb-0.5">Vínculo na Matrícula</span>
                            <span className="font-medium text-slate-700 dark:text-slate-200">{matricula.empresa_b2b_id ? 'Empresa B2B' : 'Avulso'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-sm text-gray-500 dark:text-slate-400 p-4 bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-gray-300 dark:border-slate-700 text-center">
                Este aluno não possui matrículas em turmas até o momento.
              </div>
            )}
          </div>
        )}
`;

content = content.replace("        )}\n      </div>", "        )}\n" + historyContent + "\n      </div>");
fs.writeFileSync('src/components/StudentDetailsPanel.tsx', content);
