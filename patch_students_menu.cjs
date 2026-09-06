const fs = require('fs');
let code = fs.readFileSync('src/pages/Students.tsx', 'utf8');

// The block is:
/*
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === aluno.id ? null : aluno.id);
                          }}
                          className="p-1 text-gray-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        <FolderIcon onClick={(e) => { e.stopPropagation(); handleOpenDocuments(aluno); }} />
*/

const menuCode = `
                        {openMenuId === aluno.id && (
                          <div className="absolute left-full top-0 ml-2 w-48 bg-white dark:bg-slate-850 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 py-1 z-50">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(null);
                                // TODO: Handle Edit
                                setSelectedStudentForEdit(aluno);
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
                                setOpenMenuId(null);
                                setStudentToDelete(aluno);
                              }}
                              className="w-full text-left px-4 py-2 text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2"
                            >
                              <Trash2 className="w-4 h-4" />
                              Excluir
                            </button>
                          </div>
                        )}
                        <FolderIcon onClick={(e) => { e.stopPropagation(); handleOpenDocuments(aluno); }} />
`;

code = code.replace(
  /<FolderIcon onClick=\{\(e\) => \{ e\.stopPropagation\(\); handleOpenDocuments\(aluno\); \}\} \/>/,
  menuCode
);

code = code.replace(
  /import \{ User \} from 'lucide-react';/,
  `import { User, Edit2, Trash2 } from 'lucide-react';`
);

const stateToAdd2 = `
  const [selectedStudentForEdit, setSelectedStudentForEdit] = useState<any | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<any | null>(null);
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

fs.writeFileSync('src/pages/Students.tsx', code);
