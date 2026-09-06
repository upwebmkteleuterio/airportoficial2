import re

with open('src/pages/Dashboard.tsx', 'r') as f:
    content = f.read()

# Import the utility
if "getStatusPrazoNotas" not in content:
    content = content.replace(
        "import { ClassTurno, ClassStatusPrazo, Turma } from '../types';",
        "import { ClassTurno, ClassStatusPrazo, Turma } from '../types';\nimport { getStatusPrazoNotas } from '../utils/statusPrazoNotas';"
    )

# Update CSV export logic
csv_regex = re.compile(r"\(\(\) => \{\n\s*if \(item\.nota_lancada\) \{\n[\s\S]*?return '-';\n\s*\}\)\(\),")
csv_replacement = "getStatusPrazoNotas(item).prazoText,"
content = csv_regex.sub(csv_replacement, content)

# Update the render logic
render_regex = re.compile(r"let prazoText = '-';\n\s*let prazoColor = 'text-gray-400';\n\s*let trColor = '';\n\s*if \(item\.nota_lancada\) \{\n[\s\S]*?\}\n\s*\}\n\s*return \(")
render_replacement = "const { prazoText, prazoColor, trColor } = getStatusPrazoNotas(item);\n\n                  return ("
content = render_regex.sub(render_replacement, content)

with open('src/pages/Dashboard.tsx', 'w') as f:
    f.write(content)
