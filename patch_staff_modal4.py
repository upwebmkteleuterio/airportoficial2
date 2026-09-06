import re

with open('src/components/StaffRegistrationModal.tsx', 'r') as f:
    content = f.read()

content = content.replace("Matrícula de Novo Aluno", "{role === UserRole.INSTRUTOR ? 'Cadastro de Instrutor' : 'Cadastro de Coordenador'}")

# Update step descriptions if they say Aluno
content = content.replace("Dados Pessoais do Aluno", "Dados Pessoais")
content = content.replace("foto do aluno", "foto")

with open('src/components/StaffRegistrationModal.tsx', 'w') as f:
    f.write(content)
