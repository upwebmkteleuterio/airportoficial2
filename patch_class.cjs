const fs = require('fs');
let code = fs.readFileSync('src/pages/ClassDetails.tsx', 'utf8');

code = code.replace(
  /const \[activeTab, setActiveTab\] = useState\<'students' \| 'frequency' \| 'visit' \| 'ged'\>\('students'\);/,
  `const [activeTab, setActiveTab] = useState<'students' | 'frequency' | 'visit' | 'ged'>('students');
  const [sortOrder, setSortOrder] = useState('az'); // az, za, newest, oldest`
);

code = code.replace(
  /\{matriculas\.map\(\(m\) =\> \{/,
  `{[...matriculas].sort((a, b) => {
                      const studentA = users.find((u) => u.id === a.aluno_id);
                      const studentB = users.find((u) => u.id === b.aluno_id);
                      const nameA = studentA?.nome_completo || '';
                      const nameB = studentB?.nome_completo || '';
                      
                      if (sortOrder === 'az') return nameA.localeCompare(nameB);
                      if (sortOrder === 'za') return nameB.localeCompare(nameA);
                      if (sortOrder === 'newest') return (b.data_matricula || '').localeCompare(a.data_matricula || '');
                      if (sortOrder === 'oldest') return (a.data_matricula || '').localeCompare(b.data_matricula || '');
                      return 0;
                    }).map((m) => {`
);

code = code.replace(
  /<div className="flex items-center gap-3">\s*<div className="text-xs text-slate-950 dark:text-slate-100 font-bold bg-slate-50 dark:bg-slate-850 px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-800 flex items-center gap-2 shadow-xs">\s*<Users className="w-4 h-4 text-teal-600 dark:text-teal-400" \/>\s*Contagem: \{matriculas\.length\} Alunos\s*<\/div>\s*<\/div>/,
  `<div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-white dark:bg-slate-850 border border-gray-200 dark:border-slate-700 rounded-lg px-2 py-1">
                  <span className="text-xs font-semibold text-gray-500 dark:text-slate-400 pl-1">Ordenar:</span>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
                  >
                    <option value="az">Ordem Alfabética (A-Z)</option>
                    <option value="za">Ordem Alfabética (Z-A)</option>
                    <option value="newest">Mais recentes</option>
                    <option value="oldest">Mais antigos</option>
                  </select>
                </div>
                <div className="text-xs text-slate-950 dark:text-slate-100 font-bold bg-slate-50 dark:bg-slate-850 px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-800 flex items-center gap-2 shadow-xs">
                  <Users className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  Contagem: {matriculas.length} Alunos
                </div>
              </div>`
);

fs.writeFileSync('src/pages/ClassDetails.tsx', code);
