import re

with open('src/components/StaffRegistrationModal.tsx', 'r') as f:
    content = f.read()

# Replace Student names with Staff names
content = content.replace('StudentRegistrationModalProps', 'StaffRegistrationModalProps')
content = content.replace('StudentRegistrationModal', 'StaffRegistrationModal')
content = content.replace('Dados Pessoais do Aluno', 'Dados Pessoais')
content = content.replace("role: UserRole.ALUNO", "role: role")

# Add role prop
content = content.replace('export function StaffRegistrationModal({ isOpen, onClose, onSuccess, initialData }: StaffRegistrationModalProps) {', 'export function StaffRegistrationModal({ isOpen, onClose, onSuccess, initialData, role }: StaffRegistrationModalProps & { role: UserRole }) {')

# Modify step 1 fields
# Remove RG, Orgao, Grau de ensino, etc. from Step 1.
step1_regex = re.compile(r"\{\/\* Nome da Mãe / Nome do Pai \*\/\}.*?\{\/\* RG / Órgão / Grau \*\/\}.*?<\/div>", re.DOTALL)
content = step1_regex.sub("", content)
# We only want Nome Completo, CPF, Data de Nascimento, Email, Telefone, and Foto.
# Actually, the user said: "anexar foto, nome completo, e-mail, telefone e o único campo a mais que entra é o campo de CPF."
# We should probably remove "Data de Nascimento" from step 1 for Staff. Or maybe keep it? Let's check PersonalInfoFields.

with open('src/components/StaffRegistrationModal.tsx', 'w') as f:
    f.write(content)
