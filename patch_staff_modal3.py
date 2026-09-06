import re

with open('src/components/StaffRegistrationModal.tsx', 'r') as f:
    content = f.read()

# Replace isStep1Valid
step1_valid_regex = re.compile(r"const isStep1Valid = \(\) => \{[\s\S]*?\};")
replacement = """const isStep1Valid = () => {
    return isValidFullName(formData.nome_completo || '') && 
           isValidCPF(formData.cpf || '') && 
           isValidPhone(formData.telefone || '') &&
           (formData.email || '').includes('@');
  };"""

content = step1_valid_regex.sub(replacement, content)

with open('src/components/StaffRegistrationModal.tsx', 'w') as f:
    f.write(content)
