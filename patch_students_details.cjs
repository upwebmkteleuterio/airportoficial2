const fs = require('fs');
let code = fs.readFileSync('src/pages/Students.tsx', 'utf8');

code = code.replace(
  /import \{ StudentDocumentsPanel \} from '\.\.\/components\/StudentDocumentsPanel';/,
  `import { StudentDocumentsPanel } from '../components/StudentDocumentsPanel';\nimport { StudentDetailsPanel } from '../components/StudentDetailsPanel';`
);

const stateToAdd = `
  const [detailsPanelOpen, setDetailsPanelOpen] = useState(false);
  const [selectedStudentForDetails, setSelectedStudentForDetails] = useState<any | null>(null);
`;

code = code.replace(
  /const \[passwordModalOpen, setPasswordModalOpen\] = useState\(false\);/,
  `${stateToAdd}\n  const [passwordModalOpen, setPasswordModalOpen] = useState(false);`
);

code = code.replace(
  /onClick=\{\(\) => setOpenMenuId\(null\)\}/g,
  `onClick={() => {
                      setOpenMenuId(null);
                      setSelectedStudentForDetails(aluno);
                      setDetailsPanelOpen(true);
                    }}`
);

const modalsToAdd = `
      <StudentDetailsPanel 
        isOpen={detailsPanelOpen}
        onClose={() => {
          setDetailsPanelOpen(false);
          setSelectedStudentForDetails(null);
        }}
        student={selectedStudentForDetails}
      />
`;

code = code.replace(
  /<PasswordModal /,
  `${modalsToAdd}\n      <PasswordModal `
);

fs.writeFileSync('src/pages/Students.tsx', code);
