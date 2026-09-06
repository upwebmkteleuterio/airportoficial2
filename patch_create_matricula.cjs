const fs = require('fs');
let content = fs.readFileSync('src/services/classService.ts', 'utf8');

const regex = /resolve\(newMat\);\n\s*\}, 500\);\n\s*\}\);/;
const replacement = `
        // Pre-generate diario for this student
        if (classIndex !== -1) {
          const classData = classes[classIndex];
          const diario = getStoredDiario();
          const start = new Date(classData.data_inicio + 'T00:00:00');
          const end = new Date(classData.data_termino + 'T00:00:00');
          const current = new Date(start);
          while (current <= end) {
            diario.push({
              id: \`freq-\${Date.now()}-\${Math.random().toString(36).substr(2, 4)}\`,
              matricula_id: newMat.id,
              data_aula: current.toISOString().split('T')[0],
              horario_periodo: 'Tarde',
              presente: true
            });
            current.setDate(current.getDate() + 1);
          }
          saveDiario(diario);
        }

        resolve(newMat);
      }, 500);
    });`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/services/classService.ts', content);
