const fs = require('fs');
let content = fs.readFileSync('src/pages/PublicEnrollment.tsx', 'utf8');

// replace imports to use shared validation
content = content.replace(
  "import { isValidCPF, applyMask, isValidCEP } from '../utils/validation';",
  "import { applyMask } from '../utils/validation';\nimport { PersonalInfoFields, AddressFields, useStudentFormValidation, isValidFullName, isValidDate, isValidCPF, isValidCEP, isValidPhone } from '../components/shared/StudentFormShared';"
);

// replace hook
const hookRegex = /const \[errors, setErrors\] = useState[\s\S]*?handleCepBlur\(\);\n    \}\n  \};/m;
content = content.replace(hookRegex, "const { errors, touched, handleBlur, setErrors, setTouched } = useStudentFormValidation(formData, setFormData);");

// replace step 1 rendering
const step1Search = /<div className="grid grid-cols-1 md:grid-cols-2 gap-4">[\s\S]*?<\/select>\n\s*\{touched\.trabalha_seguranca_avsec[\s\S]*?<\/div>\n\s*<\/div>/m;
const step1New = `<PersonalInfoFields 
                  formData={formData} 
                  handleInputChange={handleChange} 
                  handleBlur={handleBlur} 
                  errors={errors} 
                  touched={touched}
                />`;
content = content.replace(step1Search, step1New);

// replace step 2 rendering
const step2Search = /<div className="grid grid-cols-1 md:grid-cols-3 gap-4">[\s\S]*?<\/select>\n\s*\{touched\.estado[\s\S]*?<\/div>\n\s*<\/div>/m;
const step2New = `<AddressFields
                  formData={formData}
                  handleInputChange={handleChange}
                  handleBlur={handleBlur}
                  errors={errors}
                  touched={touched}
                />`;
content = content.replace(step2Search, step2New);

fs.writeFileSync('src/pages/PublicEnrollment.tsx', content);
