with open('src/components/StaffDetailsPanel.tsx', 'r') as f:
    content = f.read()

content = content.replace("StudentDetailsPanelProps", "StaffDetailsPanelProps")
content = content.replace("StudentDetailsPanel", "StaffDetailsPanel")
content = content.replace("student", "staff")
content = content.replace("Detalhes do Aluno", "Detalhes do Instrutor/Coordenador")

with open('src/components/StaffDetailsPanel.tsx', 'w') as f:
    f.write(content)
