const fs = require('fs');
let code = fs.readFileSync('src/pages/ClassDetails.tsx', 'utf8');

code = code.replace(
  /<button\s*onClick=\{\(e\) => \{\s*e\.stopPropagation\(\);\s*setOpenMenuStudentId\(null\);\s*setSelectedStudentForDocs\(student\);\s*\}\}\s*className="w-full text-left px-4 py-2 text-xs font-semibold text-teal-600 dark:text-teal-400 hover:bg-gray-50 dark:hover:bg-slate-800 flex items-center gap-2"\s*>\s*<FolderOpen className="w-4 h-4" \/>\s*Documentos\s*<\/button>/g,
  `<button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenMenuStudentId(null);
                                        setSelectedStudentForEdit(student);
                                        setRegistrationModalOpen(true);
                                      }}
                                      className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 flex items-center gap-2"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                      Editar
                                    </button>`
);

code = code.replace(
  /import \{ FolderOpen \} from 'lucide-react';/g,
  `import { FolderOpen, Edit2 } from 'lucide-react';` // assuming FolderOpen is imported
);
// let's just make sure Edit2 is imported
if (!code.includes('Edit2')) {
  code = code.replace(
    /import \{ MoreVertical, /,
    `import { MoreVertical, Edit2, `
  );
}

const stateToAdd2 = `
  const [selectedStudentForEdit, setSelectedStudentForEdit] = useState<any | null>(null);
`;

code = code.replace(
  /const \[selectedStudentForDetails, setSelectedStudentForDetails\] = useState\<any \| null\>\(null\);/,
  `const [selectedStudentForDetails, setSelectedStudentForDetails] = useState<any | null>(null);\n${stateToAdd2}`
);

// We need to pass initialData to StudentRegistrationModal
code = code.replace(
  /<StudentRegistrationModal\s*isOpen=\{registrationModalOpen\}\s*onClose=\{/,
  `<StudentRegistrationModal
        initialData={selectedStudentForEdit}
        isOpen={registrationModalOpen}
        onClose={`
);

// Close handler should clear edit state
code = code.replace(
  /onClose=\{\(\) => setRegistrationModalOpen\(false\)\}/,
  `onClose={() => { setRegistrationModalOpen(false); setSelectedStudentForEdit(null); }}`
);

fs.writeFileSync('src/pages/ClassDetails.tsx', code);
