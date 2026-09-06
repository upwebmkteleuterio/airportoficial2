const fs = require('fs');
let content = fs.readFileSync('src/components/StudentRegistrationModal.tsx', 'utf8');

content = content.replace(
  "empresa_id: '',",
  "empresa_id: '',\n    trabalha_aviacao_civil: '',\n    trabalha_seguranca_avsec: '',\n    tipo_documento: 'identidade_cpf',"
);

// We need to do it for all initialization occurrences.
content = content.replace(
  "estado: initialData.estado || ''",
  "estado: initialData.estado || '',\n          trabalha_aviacao_civil: initialData.trabalha_aviacao_civil || '',\n          trabalha_seguranca_avsec: initialData.trabalha_seguranca_avsec || '',\n          tipo_documento: initialData.tipo_documento || 'identidade_cpf'"
);

content = content.replace(
  "estado: ''",
  "estado: '',\n          trabalha_aviacao_civil: '',\n          trabalha_seguranca_avsec: '',\n          tipo_documento: 'identidade_cpf'"
);

content = content.replace(
  "estado: formData.estado",
  "estado: formData.estado,\n        trabalha_aviacao_civil: formData.trabalha_aviacao_civil,\n        trabalha_seguranca_avsec: formData.trabalha_seguranca_avsec,\n        tipo_documento: formData.tipo_documento"
);

content = content.replace(
  "cep: '', endereco: '', numero: '', bairro: '', cidade: '', estado: ''",
  "cep: '', endereco: '', numero: '', bairro: '', cidade: '', estado: '', trabalha_aviacao_civil: '', trabalha_seguranca_avsec: '', tipo_documento: 'identidade_cpf'"
);

// Add the two new dropdowns before "Empresa Vinculada"
const newInputs = `                <div className="col-span-1 md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Trabalha na aviação civil?</label>
                  <select
                    name="trabalha_aviacao_civil"
                    value={formData.trabalha_aviacao_civil}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-850 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#005f5f] outline-none"
                  >
                    <option value="">Selecione...</option>
                    <option value="sim">Sim, trabalha</option>
                    <option value="nao">Não, não trabalha</option>
                  </select>
                </div>

                <div className="col-span-1 md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Trabalha com segurança Avsec?</label>
                  <select
                    name="trabalha_seguranca_avsec"
                    value={formData.trabalha_seguranca_avsec}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-850 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#005f5f] outline-none"
                  >
                    <option value="">Selecione...</option>
                    <option value="sim">Sim, trabalha</option>
                    <option value="nao">Não, não trabalha</option>
                  </select>
                </div>

                <div className="col-span-1 md:col-span-2">`;

content = content.replace('<div className="col-span-1 md:col-span-2">\n                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Empresa Vinculada', newInputs + '\n                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Empresa Vinculada');

// Change "Estado (UF)" input to a Select dropdown.
const oldEstadoInput = `<input
                    type="text"
                    name="estado"
                    value={formData.estado}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-850 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#005f5f] outline-none"
                    placeholder="Ex: SP"
                    maxLength={2}
                  />`;

const ufOptions = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"].map(uf => `<option value="${uf}">${uf}</option>`).join('\\n                    ');

const newEstadoInput = `<select
                    name="estado"
                    value={formData.estado}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-850 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#005f5f] outline-none"
                  >
                    <option value="">Selecione</option>
                    ${ufOptions}
                  </select>`;

content = content.replace(oldEstadoInput, newEstadoInput);

fs.writeFileSync('src/components/StudentRegistrationModal.tsx', content);
