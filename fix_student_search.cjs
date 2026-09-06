const fs = require('fs');
let content = fs.readFileSync('src/pages/ClassDetails.tsx', 'utf8');

// Add new state variables near selectedAlunoId
content = content.replace("const [selectedAlunoId, setSelectedAlunoId] = useState('');", "const [selectedAlunoId, setSelectedAlunoId] = useState('');\n  const [studentSearchQuery, setStudentSearchQuery] = useState('');\n  const [isStudentDropdownOpen, setIsStudentDropdownOpen] = useState(false);");

// Build the search autocomplete component replacement
const searchComponent = `
              <div className="flex flex-col gap-1.5 relative">
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300">Selecionar Aluno *</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Buscar aluno por nome ou CPF..."
                    value={studentSearchQuery}
                    onChange={(e) => {
                      setStudentSearchQuery(e.target.value);
                      setIsStudentDropdownOpen(true);
                      setSelectedAlunoId('');
                    }}
                    onFocus={() => {
                      if (studentSearchQuery.length > 0) setIsStudentDropdownOpen(true);
                    }}
                    className="w-full border border-gray-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-850 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                  {isStudentDropdownOpen && studentSearchQuery.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-850 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {availableStudents.filter(s => 
                        s.nome_completo.toLowerCase().includes(studentSearchQuery.toLowerCase()) || 
                        s.cpf.replace(/\\D/g, '').includes(studentSearchQuery.replace(/\\D/g, ''))
                      ).length === 0 ? (
                        <div className="p-3 text-xs text-gray-500 text-center">Nenhum aluno encontrado.</div>
                      ) : (
                        availableStudents.filter(s => 
                          s.nome_completo.toLowerCase().includes(studentSearchQuery.toLowerCase()) || 
                          s.cpf.replace(/\\D/g, '').includes(studentSearchQuery.replace(/\\D/g, ''))
                        ).map(stud => (
                          <div
                            key={stud.id}
                            onClick={() => {
                              setSelectedAlunoId(stud.id);
                              setStudentSearchQuery(stud.nome_completo + ' (CPF: ' + stud.cpf + ')');
                              setIsStudentDropdownOpen(false);
                            }}
                            className="p-2.5 hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer text-xs text-slate-800 dark:text-slate-200"
                          >
                            {stud.nome_completo} (CPF: {stud.cpf})
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
                <div className="flex justify-end mt-1">
                  <button 
                    onClick={() => {
                      setAddStudentOpen(false);
                      setRegistrationModalOpen(true);
                    }}
                    className="text-[10px] text-[#005f5f] hover:text-[#004d4d] dark:text-teal-400 dark:hover:text-teal-300 font-bold underline cursor-pointer"
                  >
                    Não encontrou o aluno? Cadastrar novo
                  </button>
                </div>
              </div>
`;

content = content.replace(/<div className="flex flex-col gap-1\.5">\s*<label className="text-xs font-bold text-gray-700 dark:text-slate-300">Selecionar Aluno \*<\/label>\s*<select[\s\S]*?<\/select>\s*<div className="flex justify-end mt-1">[\s\S]*?<\/div>\s*<\/div>/, searchComponent.trim());

// We should also clear studentSearchQuery when the modal is closed or opened
content = content.replace("setSelectedAlunoId('');\n    setAddStudentOpen(false);", "setSelectedAlunoId('');\n    setStudentSearchQuery('');\n    setAddStudentOpen(false);");

fs.writeFileSync('src/pages/ClassDetails.tsx', content);
