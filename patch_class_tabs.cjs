const fs = require('fs');
let content = fs.readFileSync('src/pages/ClassDetails.tsx', 'utf8');

// Add isLoadingDocuments
content = content.replace(
  "  const { documents, updateDocument } = useDocuments();",
  "  const { documents, updateDocument, isLoading: isLoadingDocuments } = useDocuments();"
);

// Tab 1: Alunos
const studentsListOld = `<tbody className="divide-y divide-gray-150 dark:divide-slate-800 font-mono text-gray-700 dark:text-slate-200">
                    {[...matriculas].sort((a, b) => {`;
const studentsListNew = `<tbody className="divide-y divide-gray-150 dark:divide-slate-800 font-mono text-gray-700 dark:text-slate-200">
                    {isLoadingMatriculas ? (
                      <tr>
                        <td colSpan={10} className="px-4 py-8">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-gray-500 text-sm font-sans">Carregando matrículas...</p>
                          </div>
                        </td>
                      </tr>
                    ) : matriculas.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-4 py-12 text-center text-gray-500 font-sans">
                          <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                            <div className="p-3 bg-teal-500/10 rounded-full text-teal-500">
                              <Users className="w-6 h-6" />
                            </div>
                            <div>
                              <p className="font-bold text-sm text-slate-800 dark:text-slate-200">Nenhum aluno matriculado</p>
                              <p className="text-xs text-gray-400 mt-1 leading-normal">
                                Adicione um aluno existente ou cadastre um novo para começar.
                              </p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : [...matriculas].sort((a, b) => {`;
content = content.replace(studentsListOld, studentsListNew);

// Tab 2: Frequência
const freqOld = `<tbody className="divide-y divide-gray-150 dark:divide-slate-800 font-sans text-slate-700 dark:text-slate-200">
                    {matriculas.map((m) => {`;
const freqNew = `<tbody className="divide-y divide-gray-150 dark:divide-slate-800 font-sans text-slate-700 dark:text-slate-200">
                    {isLoadingMatriculas ? (
                      <tr>
                        <td colSpan={2 + classDates.length} className="px-4 py-8">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-gray-500 text-sm font-sans">Carregando frequência...</p>
                          </div>
                        </td>
                      </tr>
                    ) : matriculas.length === 0 ? (
                      <tr>
                        <td colSpan={2 + classDates.length} className="px-4 py-12 text-center text-gray-500 font-sans">
                          Nenhum aluno matriculado para registro de frequência.
                        </td>
                      </tr>
                    ) : matriculas.map((m) => {`;
content = content.replace(freqOld, freqNew);

// Tab 3: Visita
const visitMapOld = `{visitStudents.map((item) => (`;
const visitMapNew = `{isLoadingMatriculas ? (
                        <tr>
                          <td colSpan={4} className="px-3 py-6 text-center text-gray-500 text-sm">
                            <div className="flex flex-col items-center justify-center gap-2">
                               <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                               Carregando relação de alunos...
                            </div>
                          </td>
                        </tr>
                      ) : visitStudents.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-3 py-6 text-center text-gray-500 text-sm">
                            Nenhum aluno matriculado nesta turma para a visita.
                          </td>
                        </tr>
                      ) : visitStudents.map((item) => (`;
content = content.replace(visitMapOld, visitMapNew);

// Fix visitStudents logic inside the component to not use defaultList and slice
const visitStudentsDefOld = `          const visitStudents = matriculas.length > 0 
            ? matriculas.slice(0, 7).map((m, idx) => {
                const student = users.find((u) => u.id === m.aluno_id);
                const codeAnac = m.anac_codigo || student?.cpf?.substring(0, 7) || '123.456-7';
                const isPending = m.percentual_presenca < 75 || idx === 2; // Keep index 2 pending for visual fidelity
                return {
                  num: String(idx + 1).padStart(2, '0'),
                  name: student?.nome_completo || 'Aluno ' + (idx + 1),
                  cpf: student?.cpf ? student.cpf.substring(0, 3) + '.' + student.cpf.substring(3, 6) + '-' + student.cpf.substring(6, 7) : codeAnac,
                  status: isPending ? 'PENDENTE CNH' : 'REGULAR'
                };
              })
            : defaultList;`;
const visitStudentsDefNew = `          const visitStudents = matriculas.map((m, idx) => {
                const student = users.find((u) => u.id === m.aluno_id);
                const codeAnac = m.anac_codigo || student?.cpf?.substring(0, 7) || '---';
                const isPending = m.percentual_presenca < 75;
                return {
                  num: String(idx + 1).padStart(2, '0'),
                  name: student?.nome_completo || 'Sem Nome',
                  cpf: student?.cpf || codeAnac,
                  status: isPending ? 'PENDENTE CNH' : 'REGULAR'
                };
              });`;
content = content.replace(visitStudentsDefOld, visitStudentsDefNew);


// Tab 4: GED
const gedOld = `{classDocuments.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500 font-sans">
                          Nenhum documento anexado ainda para os alunos desta turma.
                        </td>
                      </tr>
                    ) : (`;
const gedNew = `{(isLoadingMatriculas || isLoadingDocuments) ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500 font-sans">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-gray-500 text-sm">Carregando documentos...</p>
                          </div>
                        </td>
                      </tr>
                    ) : classDocuments.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500 font-sans">
                          Nenhum documento anexado ainda para os alunos desta turma.
                        </td>
                      </tr>
                    ) : (`;
content = content.replace(gedOld, gedNew);

fs.writeFileSync('src/pages/ClassDetails.tsx', content);
