const fs = require('fs');
let content = fs.readFileSync('src/pages/CentralGed.tsx', 'utf8');

const regex = /<\/div>\n\s*<div className="relative">\n\s*<button\n\s*onClick=\{\(\) => setShowFiltersDropdown/;
const replacement = `</div>
          
          <select
            value={selectedEmpresa}
            onChange={(e) => setSelectedEmpresa(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-slate-800 rounded-lg text-xs font-bold text-slate-850 dark:text-white bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-[#005f5f]"
          >
            <option value="todas">Todas as Empresas</option>
            {companies.map(c => (
              <option key={c.id} value={c.id}>{c.razao_social}</option>
            ))}
          </select>

          <select
            value={selectedTurma}
            onChange={(e) => setSelectedTurma(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-slate-800 rounded-lg text-xs font-bold text-slate-850 dark:text-white bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-[#005f5f]"
          >
            <option value="todas">Todas as Turmas</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.id_anac}</option>
            ))}
          </select>

          <div className="relative">
            <button
              onClick={() => setShowFiltersDropdown`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/pages/CentralGed.tsx', content);
