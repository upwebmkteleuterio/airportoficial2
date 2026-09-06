const fs = require('fs');
let code = fs.readFileSync('src/pages/ClassDetails.tsx', 'utf8');

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

// We need to change the onClick of the row
code = code.replace(
  /onClick=\{\(\) => setSelectedStudentForDocs\(student\)\}/g,
  `onClick={() => {
                            setSelectedStudentForDetails(student);
                            setDetailsPanelOpen(true);
                          }}`
);

// Add the StudentDetailsPanel modal
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

// The menu inside ClassDetails already has "Documentos" and "Remover". The user wants Edit and Delete in the 3 dots.
// Let's modify the menu.
const menuCode = `
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenMenuStudentId(null);
                                        // TODO: Handle Edit
                                        setSelectedStudentForEdit(student);
                                        setRegistrationModalOpen(true);
                                      }}
                                      className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 flex items-center gap-2"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                      Editar
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenMenuStudentId(null);
                                        setMatriculaToDelete({ id: m.id, studentName: student?.nome_completo });
                                      }}
                                      className="w-full text-left px-4 py-2 text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                      Remover da Turma
                                    </button>
`;

// wait, we need to replace the old items which were Documentos and Remover.
// Let's do it carefully.
