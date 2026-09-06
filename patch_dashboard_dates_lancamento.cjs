const fs = require('fs');
let content = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

const regex = /<\/div>\n\s*<\/div>\n\s*\{\/\* Horários de Prova 1ª\/2ª Chamada \*\/\}/;
const replacement = `</div>
            </div>

            {/* Data Lançamento de Notas */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wide">
                Data de lançamento
              </label>
              <p className="text-[10px] text-gray-500 dark:text-slate-400 mb-1">
                Data para lançamento das notas no site oficial.
              </p>
              <input
                type="date"
                value={formDataLancamentoNotas}
                onChange={(e) => setFormDataLancamentoNotas(e.target.value)}
                required
                className="w-full border border-gray-300 dark:border-slate-700 rounded px-3 py-2 bg-white dark:bg-slate-850 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 font-mono"
              />
            </div>

            {/* Horários de Prova 1ª/2ª Chamada */}`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/pages/Dashboard.tsx', content);
