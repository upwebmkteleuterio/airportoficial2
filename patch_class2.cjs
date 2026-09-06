const fs = require('fs');
let code = fs.readFileSync('src/pages/ClassDetails.tsx', 'utf8');

const importsToAdd = `
import { FolderIcon } from '../components/ui/FolderIcon';
import { PasswordModal } from '../components/ui/PasswordModal';
import { StudentDocumentsPanel } from '../components/StudentDocumentsPanel';
`;

code = code.replace(
  /import \{ SlidePanel \} from '\.\.\/components\/ui\/SlidePanel';/,
  `import { SlidePanel } from '../components/ui/SlidePanel';${importsToAdd}`
);

const stateToAdd = `
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [documentsPanelOpen, setDocumentsPanelOpen] = useState(false);

  const handleOpenDocuments = (student: any) => {
    setSelectedStudentForDocs(student);
    setPasswordModalOpen(true);
  };

  const handlePasswordConfirm = () => {
    setDocumentsPanelOpen(true);
  };
`;

code = code.replace(
  /const \[selectedStudentForDocs, setSelectedStudentForDocs\] = useState\<any \| null\>\(null\);/,
  `const [selectedStudentForDocs, setSelectedStudentForDocs] = useState<any | null>(null);${stateToAdd}`
);

code = code.replace(
  /<td className="px-4 py-3 text-center relative" onClick=\{\(e\) => e.stopPropagation\(\)\}>\s*<div className="flex items-center justify-center">\s*<div className="relative">/g,
  `<td className="px-4 py-3 text-center relative" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1">
                              {student && <FolderIcon onClick={(e) => { e.stopPropagation(); handleOpenDocuments(student); }} />}
                              <div className="relative">`
);

const modalsToAdd = `
      <PasswordModal 
        isOpen={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
        onConfirm={handlePasswordConfirm}
      />
      <StudentDocumentsPanel 
        isOpen={documentsPanelOpen}
        onClose={() => {
          setDocumentsPanelOpen(false);
          setSelectedStudentForDocs(null);
        }}
        student={selectedStudentForDocs}
      />
`;

code = code.replace(
  /<\/div>\s*\{addStudentOpen && \(/m,
  `</div>
      ${modalsToAdd}
      {addStudentOpen && (`
);

fs.writeFileSync('src/pages/ClassDetails.tsx', code);
