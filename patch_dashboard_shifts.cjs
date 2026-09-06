const fs = require('fs');

let content = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

// 1. Imports
if (!content.includes('shiftService')) {
  content = content.replace(/import \{ courseService \} from '\.\.\/services\/courses';/, "import { courseService } from '../services/courses';\nimport { shiftService } from '../services/shifts';");
}

// 2. State definition for formTurno
content = content.replace(/const \[formTurno, setFormTurno\] = useState<ClassTurno>\(ClassTurno.MANHA\);/, "const [formTurno, setFormTurno] = useState('Manhã');\n  const [formHorarioAulas, setFormHorarioAulas] = useState('09:00 - 13:00');");

// 3. Reset state
content = content.replace(/setFormTurno\(ClassTurno.MANHA\);/, "setFormTurno('Manhã');\n      setFormHorarioAulas('09:00 - 13:00');");

// 4. Fetch shifts
if (!content.includes("queryKey: ['shifts']")) {
  const queryStr = `  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts'],
    queryFn: shiftService.getAll,
  });
  const activeShifts = shifts.filter(s => s.ativo);`;
  
  content = content.replace(/const \{ data: courses = \[\] \} = useQuery\(\{\n\s*queryKey: \['courses'\],\n\s*queryFn: courseService.getAll,\n\s*\}\);/, "const { data: courses = [] } = useQuery({\n    queryKey: ['courses'],\n    queryFn: courseService.getAll,\n  });\n" + queryStr);
}

// 5. Update editingClassId effect
content = content.replace(
  /setFormTurno\(item\.turno\);/g,
  "setFormTurno(item.turno as string);\n      setFormHorarioAulas(item.horario_aulas || '09:00 - 13:00');"
);

// 6. Fix createClass & updateClass
content = content.replace(
  /horario_aulas: '09:00 - 13:00', \/\/ Padrão/g,
  "horario_aulas: formHorarioAulas,"
);

// Wait, we also need to add it to updates: {} if we are changing it on edit.
if (content.includes('turno: formTurno,')) {
    content = content.replace(
      /turno: formTurno,(\s+)endereco_realizacao/g,
      "turno: formTurno as any,\n            horario_aulas: formHorarioAulas,$1endereco_realizacao"
    );
}

// Also in createClass
content = content.replace(
  /turno: formTurno,(\s+)horario_aulas/g,
  "turno: formTurno as any,$1horario_aulas"
);


// 7. Update the select element
const selectRegex = /<select\s+id="form-turno-select"[\s\S]*?<\/select>/;
const newSelect = `<select
                    id="form-turno-select"
                    value={formTurno}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormTurno(val);
                      const shift = activeShifts.find(s => s.nome === val);
                      if (shift) {
                        setFormHorarioAulas(\`\${shift.horario_inicio} - \${shift.horario_termino}\`);
                        setFormHora1(shift.primeira_chamada !== 'Sem prova' ? shift.primeira_chamada : '');
                        setFormHora2(shift.segunda_chamada !== 'Sem prova' ? shift.segunda_chamada : '');
                      }
                    }}
                    className="w-full appearance-none border border-gray-300 dark:border-slate-700 rounded px-3 py-2.5 bg-white dark:bg-slate-850 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                  >
                    {activeShifts.map((t) => (
                      <option key={t.id} value={t.nome}>{t.nome}</option>
                    ))}
                  </select>`;

content = content.replace(selectRegex, newSelect);

fs.writeFileSync('src/pages/Dashboard.tsx', content);
