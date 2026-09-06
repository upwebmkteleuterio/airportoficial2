import re

with open('src/pages/Students.tsx', 'r') as f:
    content = f.read()

content = content.replace("Students", "Instructors")
content = content.replace("StudentRegistrationModal", "StaffRegistrationModal")
content = content.replace("StudentDetailsPanel", "StaffDetailsPanel")
content = content.replace("aluno", "instrutor")
content = content.replace("Aluno", "Instrutor")
content = content.replace("ALUNO", "INSTRUTOR")
content = content.replace("student", "staff")
content = content.replace("Student", "Staff")

with open('src/pages/Instructors.tsx', 'w') as f:
    f.write(content)
