const fs = require('fs');
let code = fs.readFileSync('src/components/StudentRegistrationModal.tsx', 'utf8');

// Replace the placeholder email with formData.email and optional telefone with formData.telefone
code = code.replace(
  /email:\s*`\$\{formData\.cpf\.replace\(\/\\D\/g, ''\)\}@aluno\.com\.br`, \/\/ placeholder email\n\s*telefone: '', \/\/ optional/,
  `email: formData.email,\n        telefone: formData.telefone,`
);

// We need to add the inputs to Step 1.
const newInputs = `                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">E-mail *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-850 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#005f5f] outline-none"
                    placeholder="Ex: joao@email.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Telefone (Celular) *</label>
                  <input
                    type="text"
                    name="telefone"
                    value={formData.telefone}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-850 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#005f5f] outline-none"
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div className="col-span-1 md:col-span-2">`;

code = code.replace(/<div className="col-span-1 md:col-span-2">\s*<label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Grau de Ensino \*/, newInputs + '\n                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Grau de Ensino *');

fs.writeFileSync('src/components/StudentRegistrationModal.tsx', code);
