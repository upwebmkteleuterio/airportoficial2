const fs = require('fs');
let code = fs.readFileSync('src/pages/Students.tsx', 'utf8');

// Function to safely format dates
const formatCode = `                    <td className="px-5 py-2.5 text-gray-500 dark:text-slate-400">
                      {aluno.data_nascimento ? new Date(aluno.data_nascimento + 'T12:00:00Z').toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td className="px-5 py-2.5 text-gray-500 dark:text-slate-400">
                      {aluno.data_aceite_lgpd ? new Date(aluno.data_aceite_lgpd).toLocaleDateString('pt-BR') : '-'}
                    </td>
                  </tr>`;

code = code.replace(
  /<td className="px-5 py-2\.5 text-gray-500 dark:text-slate-400">\s*\{aluno\.data_nascimento \|\| '-'\}\s*<\/td>\s*<\/tr>/,
  formatCode
);

// Add table header for Data de Matrícula
const newHeaderCode = `                <th className="px-5 py-3 font-semibold text-gray-500 dark:text-slate-400 w-32">Nascimento</th>
                <th className="px-5 py-3 font-semibold text-gray-500 dark:text-slate-400 w-32">Data de Matrícula</th>
              </tr>`;

code = code.replace(
  /<th className="px-5 py-3 font-semibold text-gray-500 dark:text-slate-400 w-32">Nascimento<\/th>\s*<\/tr>/,
  newHeaderCode
);

fs.writeFileSync('src/pages/Students.tsx', code);
