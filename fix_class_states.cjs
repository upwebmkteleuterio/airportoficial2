const fs = require('fs');
let code = fs.readFileSync('src/pages/ClassDetails.tsx', 'utf8');

if (!code.includes('const [selectedStudentForDetails, setSelectedStudentForDetails] = useState<any | null>(null);')) {
  code = code.replace(
    /const \[selectedStudentForDocs, setSelectedStudentForDocs\] = useState\<any \| null\>\(null\);/,
    `const [selectedStudentForDocs, setSelectedStudentForDocs] = useState<any | null>(null);
  const [detailsPanelOpen, setDetailsPanelOpen] = useState(false);
  const [selectedStudentForDetails, setSelectedStudentForDetails] = useState<any | null>(null);
  const [selectedStudentForEdit, setSelectedStudentForEdit] = useState<any | null>(null);`
  );
}

// Replace the onClick of the row again if it wasn't replaced
if (!code.includes('setDetailsPanelOpen(true)')) {
  code = code.replace(
    /onClick=\{\(\) => setSelectedStudentForDocs\(student\)\}/g,
    `onClick={() => {
                            setSelectedStudentForDetails(student);
                            setDetailsPanelOpen(true);
                          }}`
  );
}

// Add the StudentDetailsPanel if missing
if (!code.includes('<StudentDetailsPanel')) {
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
}

// Ensure StudentDetailsPanel is imported
if (!code.includes('import { StudentDetailsPanel }')) {
  code = code.replace(
    /import \{ StudentDocumentsPanel \} from '\.\.\/components\/StudentDocumentsPanel';/,
    `import { StudentDocumentsPanel } from '../components/StudentDocumentsPanel';\nimport { StudentDetailsPanel } from '../components/StudentDetailsPanel';`
  );
}

fs.writeFileSync('src/pages/ClassDetails.tsx', code);
