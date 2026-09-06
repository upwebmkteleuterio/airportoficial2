const fs = require('fs');
let content = fs.readFileSync('src/pages/PublicEnrollment.tsx', 'utf8');

const newInputs = `
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Trabalha na aviação civil?</label>
                    <select
                      name="trabalha_aviacao_civil"
                      value={formData.trabalha_aviacao_civil}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-teal-500 focus:border-teal-500 bg-white"
                    >
                      <option value="">Selecione...</option>
                      <option value="sim">Sim, trabalha</option>
                      <option value="nao">Não, não trabalha</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Trabalha com segurança Avsec?</label>
                    <select
                      name="trabalha_seguranca_avsec"
                      value={formData.trabalha_seguranca_avsec}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-teal-500 focus:border-teal-500 bg-white"
                    >
                      <option value="">Selecione...</option>
                      <option value="sim">Sim, trabalha</option>
                      <option value="nao">Não, não trabalha</option>
                    </select>
                  </div>`;

const rgRegex = /<div>\s*<label className="block text-sm font-semibold text-slate-700 mb-1">RG<\/label>/;
content = content.replace(rgRegex, newInputs + '\n                  <div>\n                    <label className="block text-sm font-semibold text-slate-700 mb-1">RG</label>');

fs.writeFileSync('src/pages/PublicEnrollment.tsx', content);
