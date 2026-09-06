import re

with open('src/components/StaffRegistrationModal.tsx', 'r') as f:
    content = f.read()

# Replace <PersonalInfoFields>...</PersonalInfoFields> with inline fields
personal_info_regex = re.compile(r"<PersonalInfoFields.*?>.*?</PersonalInfoFields>", re.DOTALL)
replacement = """<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-1 md:col-span-2">
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  name="nome_completo"
                  value={formData.nome_completo}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  className="w-full border border-gray-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-850 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#005f5f] outline-none"
                  placeholder="Ex: João da Silva"
                />
                {touched.nome_completo && errors.nome_completo && (
                  <span className="text-red-500 text-xs mt-1 block">{errors.nome_completo}</span>
                )}
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">CPF *</label>
                <input
                  type="text"
                  name="cpf"
                  value={formData.cpf}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  className="w-full border border-gray-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-850 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#005f5f] outline-none"
                  placeholder="000.000.000-00"
                />
                {touched.cpf && errors.cpf && (
                  <span className="text-red-500 text-xs mt-1 block">{errors.cpf}</span>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">E-mail *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  className="w-full border border-gray-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-850 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#005f5f] outline-none"
                  placeholder="exemplo@email.com"
                />
                {touched.email && errors.email && (
                  <span className="text-red-500 text-xs mt-1 block">{errors.email}</span>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Telefone / WhatsApp *</label>
                <input
                  type="text"
                  name="telefone"
                  value={formData.telefone}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  className="w-full border border-gray-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-850 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#005f5f] outline-none"
                  placeholder="(00) 00000-0000"
                />
                {touched.telefone && errors.telefone && (
                  <span className="text-red-500 text-xs mt-1 block">{errors.telefone}</span>
                )}
              </div>
            </div>"""

content = personal_info_regex.sub(replacement, content)

with open('src/components/StaffRegistrationModal.tsx', 'w') as f:
    f.write(content)
