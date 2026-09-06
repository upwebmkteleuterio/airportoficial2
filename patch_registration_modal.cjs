const fs = require('fs');
let content = fs.readFileSync('src/components/StudentRegistrationModal.tsx', 'utf8');

// import components
content = content.replace(
  "import { useUIStore } from '../store/uiStore';",
  "import { useUIStore } from '../store/uiStore';\nimport { PersonalInfoFields, AddressFields, useStudentFormValidation, isValidFullName, isValidDate, isValidCPF, isValidCEP, isValidPhone } from './shared/StudentFormShared';"
);

// remove duplicate functions and use custom hook
const regexHook = /const \[errors, setErrors\] = useState[\s\S]*?handleCepBlur\(\);\n    \}\n  \};/m;
content = content.replace(regexHook, "const { errors, touched, handleBlur, setErrors, setTouched } = useStudentFormValidation(formData, setFormData);");

// replace step 1 rendering
const step1Old = /<div className="grid grid-cols-1 md:grid-cols-2 gap-4">[\s\S]*?<div className="col-span-1 md:col-span-2">\n\s*<label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Empresa Vinculada \(Opcional\)<\/label>[\s\S]*?<\/select>\n\s*<\/div>[\s\S]*?<\/div>\n\s*<\/div>/m;

// wait, the grid is entirely for step 1. Let's find exactly where step 1 is.
const step1Search = /<div className="grid grid-cols-1 md:grid-cols-2 gap-4">[\s\S]*?<\/select>\n\s*\{touched\.trabalha_seguranca_avsec[\s\S]*?<\/div>\n\s*<\/div>/m;

const step1New = `<PersonalInfoFields 
                formData={formData} 
                handleInputChange={handleInputChange} 
                handleBlur={handleBlur} 
                errors={errors} 
                touched={touched}
              >
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Empresa Vinculada (Opcional)</label>
                  <select
                    name="empresa_id"
                    value={formData.empresa_id}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    className="w-full border border-gray-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-850 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#005f5f] outline-none"
                  >
                    <option value="">Nenhuma (Particular)</option>
                    {companies.map(empresa => (
                      <option key={empresa.id} value={empresa.id}>{empresa.razao_social}</option>
                    ))}
                  </select>
                </div>
              </PersonalInfoFields>`;

content = content.replace(step1Search, step1New);

// replace step 2 rendering
const step2Old = /<div className="grid grid-cols-1 md:grid-cols-4 gap-4">[\s\S]*?<\/select>\n\s*\{touched\.estado[\s\S]*?<\/div>\n\s*<\/div>/m;
const step2New = `<AddressFields
                formData={formData}
                handleInputChange={handleInputChange}
                handleBlur={handleBlur}
                errors={errors}
                touched={touched}
              />`;

content = content.replace(step2Old, step2New);

fs.writeFileSync('src/components/StudentRegistrationModal.tsx', content);
