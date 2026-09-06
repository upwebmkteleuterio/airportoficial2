const fs = require('fs');

['src/pages/Instructors.tsx', 'src/pages/Coordinators.tsx'].forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  // Replace Matricular with Cadastrar
  content = content.replace("Matricular Instrutor", "Cadastrar Instrutor");
  content = content.replace("Matricular Coordenador", "Cadastrar Coordenador");

  // Replace column headers
  content = content.replace('<th className="px-5 py-3">Data de Nasc.</th>', '<th className="px-5 py-3">Certificação Avsec</th>');
  content = content.replace('<th className="px-5 py-3">Data de Matrícula</th>', '');

  // Find td replacements for Data de Nascimento and Data de Matricula
  // They look like:
  // <td className="px-5 py-2.5 text-gray-500 dark:text-slate-400">\n                      {instrutor.data_nascimento ? new Date(instrutor.data_nascimento + 'T12:00:00Z').toLocaleDateString('pt-BR') : '-'}\n                    </td>
  const td_nasc_regex = /<td className="px-5 py-2.5 text-gray-500 dark:text-slate-400">\s*\{[a-z]+\.data_nascimento[^<]+<\/td>/m;
  const td_matr_regex = /<td className="px-5 py-2.5 text-gray-500 dark:text-slate-400">\s*\{[a-z]+\.data_aceite_lgpd[^<]+<\/td>/m;
  
  content = content.replace(td_nasc_regex, '<td className="px-5 py-2.5"><span className="px-2 py-1 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 rounded text-xs font-semibold">{instrutor.certificacao_avsec || "-"}</span></td>'.replace(/instrutor/g, file.includes('Instructors') ? 'instrutor' : 'coordenador'));
  content = content.replace(td_matr_regex, '');

  // colSpan={7} to colSpan={6}
  content = content.replace(/colSpan=\{7\}/g, "colSpan={6}");

  fs.writeFileSync(file, content);
});
