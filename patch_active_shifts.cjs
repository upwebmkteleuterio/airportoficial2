const fs = require('fs');
let content = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

// Find the spot to inject activeShifts state
const injectionPoint = /const \{ courses \} = useCourses\(\);\n\s*const \{ addresses \} = useAddresses\(\);/;

if (!content.includes('const [activeShifts, setActiveShifts]')) {
  content = content.replace(injectionPoint, 
`const { courses } = useCourses();
  const { addresses } = useAddresses();
  
  const [activeShifts, setActiveShifts] = useState<{nome: string, horario_inicio: string, horario_termino: string, primeira_chamada: string, segunda_chamada: string, ativo: boolean}[]>([]);
  useEffect(() => {
    shiftService.getAll().then(shifts => {
      setActiveShifts(shifts.filter(s => s.ativo));
    }).catch(console.error);
  }, []);`
  );
}

fs.writeFileSync('src/pages/Dashboard.tsx', content);
