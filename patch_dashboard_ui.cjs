const fs = require('fs');
let content = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

const regex = /<label className="text-\[10px\] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">\n\s*1ª Chamada\n\s*<\/label>\n\s*<input\n\s*id="form-time-1"\n\s*type="time"\n\s*value=\{formHora1\}\n\s*onChange=\{\(e\) => setFormHora1\(e\.target\.value\)\}/m;

const replacement = `<label className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    Data 1ª Chamada
                  </label>
                  <input
                    type="date"
                    value={formDataProva1}
                    onChange={(e) => setFormDataProva1(e.target.value)}
                    className="w-full border border-gray-300 dark:border-slate-700 rounded px-3 py-2 bg-white dark:bg-slate-850 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 mb-2"
                  />
                  <label className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    Horário 1ª Chamada
                  </label>
                  <input
                    id="form-time-1"
                    type="time"
                    value={formHora1}
                    onChange={(e) => setFormHora1(e.target.value)}`;

content = content.replace(regex, replacement);

const regex2 = /<label className="text-\[10px\] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">\n\s*2ª Chamada\n\s*<\/label>\n\s*<input\n\s*id="form-time-2"\n\s*type="time"\n\s*value=\{formHora2\}\n\s*onChange=\{\(e\) => setFormHora2\(e\.target\.value\)\}/m;

const replacement2 = `<label className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    Data 2ª Chamada
                  </label>
                  <input
                    type="date"
                    value={formDataProva2}
                    onChange={(e) => setFormDataProva2(e.target.value)}
                    className="w-full border border-gray-300 dark:border-slate-700 rounded px-3 py-2 bg-white dark:bg-slate-850 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 mb-2"
                  />
                  <label className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    Horário 2ª Chamada
                  </label>
                  <input
                    id="form-time-2"
                    type="time"
                    value={formHora2}
                    onChange={(e) => setFormHora2(e.target.value)}`;

content = content.replace(regex2, replacement2);
fs.writeFileSync('src/pages/Dashboard.tsx', content);
