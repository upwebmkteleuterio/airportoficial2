import re

with open('src/pages/Students.tsx', 'r') as f:
    content = f.read()

content = content.replace("Students", "Coordinators")
content = content.replace("StudentRegistrationModal", "StaffRegistrationModal")
content = content.replace("StudentDetailsPanel", "StaffDetailsPanel")
content = content.replace("aluno", "coordenador")
content = content.replace("Aluno", "Coordenador")
content = content.replace("ALUNO", "COORDENADOR")
content = content.replace("student", "staff")
content = content.replace("Student", "Staff")

with open('src/pages/Coordinators.tsx', 'w') as f:
    f.write(content)
