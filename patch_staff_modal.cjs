const fs = require('fs');
let content = fs.readFileSync('src/components/StaffRegistrationModal.tsx', 'utf8');

// Add Certificação Avsec select
const avsec_field = `
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Certificação Avsec (Opcional)</label>
                <select
                  name="certificacao_avsec"
                  value={formData.certificacao_avsec || ''}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-850 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#005f5f] outline-none"
                >
                  <option value="">Nenhuma</option>
                  <option value="ISCR">ISCR</option>
                  <option value="IOAD">IOAD</option>
                  <option value="IOAR">IOAR</option>
                </select>
              </div>`;

content = content.replace('{/* Content */}', '{/* Content */}\n' + (content.includes('Certificação Avsec') ? '' : '')); // just making sure not double replacing
content = content.replace('placeholder="(00) 00000-0000"\n                />\n                {touched.telefone && errors.telefone && (\n                  <span className="text-red-500 text-xs mt-1 block">{errors.telefone}</span>\n                )}\n              </div>', 'placeholder="(00) 00000-0000"\n                />\n                {touched.telefone && errors.telefone && (\n                  <span className="text-red-500 text-xs mt-1 block">{errors.telefone}</span>\n                )}\n              </div>\n              ' + avsec_field);

// Add ASO file field
content = content.replace('antecedentes: null', 'antecedentes: null, aso: null');
content = content.replace('files.antecedentes', 'files.antecedentes || !files.aso');

const aso_upload = `
                <div className="border border-gray-200 dark:border-slate-700 rounded-lg p-4 bg-white dark:bg-slate-850">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">ASO</h4>
                      <p className="text-xs text-gray-500">Atestado de Saúde Ocupacional</p>
                    </div>
                    <label className="cursor-pointer">
                      <input type="file" className="hidden" onChange={(e) => handleFileChange('aso', e.target.files?.[0] || null)} />
                      <div className={\`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors \${files['aso'] ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}\`}>
                        {files['aso'] ? <><Check className="w-4 h-4" /> Anexado</> : <><Upload className="w-4 h-4" /> Anexar</>}
                      </div>
                    </label>
                  </div>
                </div>`;
                
content = content.replace('Antecedentes Criminais</p>\n                    </div>\n                    <label className="cursor-pointer">\n                      <input type="file" className="hidden" onChange={(e) => handleFileChange(\'antecedentes\', e.target.files?.[0] || null)} />\n                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${files[\'antecedentes\'] ? \'bg-emerald-50 text-emerald-600\' : \'bg-slate-100 text-slate-600 hover:bg-slate-200\'}`}>\n                        {files[\'antecedentes\'] ? <><Check className="w-4 h-4" /> Anexado</> : <><Upload className="w-4 h-4" /> Anexar</>}\n                      </div>\n                    </label>\n                  </div>\n                </div>', 'Antecedentes Criminais</p>\n                    </div>\n                    <label className="cursor-pointer">\n                      <input type="file" className="hidden" onChange={(e) => handleFileChange(\'antecedentes\', e.target.files?.[0] || null)} />\n                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${files[\'antecedentes\'] ? \'bg-emerald-50 text-emerald-600\' : \'bg-slate-100 text-slate-600 hover:bg-slate-200\'}`}>\n                        {files[\'antecedentes\'] ? <><Check className="w-4 h-4" /> Anexado</> : <><Upload className="w-4 h-4" /> Anexar</>}\n                      </div>\n                    </label>\n                  </div>\n                </div>\n' + aso_upload);

content = content.replace('trabalha_seguranca_avsec: formData.trabalha_seguranca_avsec', 'trabalha_seguranca_avsec: formData.trabalha_seguranca_avsec,\n        certificacao_avsec: formData.certificacao_avsec');

fs.writeFileSync('src/components/StaffRegistrationModal.tsx', content);
