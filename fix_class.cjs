const fs = require('fs');
let code = fs.readFileSync('src/pages/ClassDetails.tsx', 'utf8');

// The line is:
// <td className="px-4 py-2 text-center relative" onClick={(e) => e.stopPropagation()}>
//   <div className="flex items-center justify-center">
//     <div className="relative">
//       <button
code = code.replace(
  /<td\s+className="px-4 py-2 text-center relative"\s+onClick=\{\(e\) => e.stopPropagation\(\)\}\s*>\s*<div className="flex items-center justify-center">\s*<div className="relative">/,
  `<td
                            className="px-4 py-2 text-center relative"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-center gap-1">
                              <div className="relative">`
);

code = code.replace(
  /<\/button>\s*\{openMenuStudentId === m\.id && \(/,
  `</button>
                                
                                {openMenuStudentId === m.id && (`
);

// We want to insert the FolderIcon *after* the div.relative inside the td.
// Wait, the structure is:
// <div className="flex items-center justify-center gap-1">
//   <div className="relative">
//     <button>
//       <MoreVertical />
//     </button>
//     {openMenuStudentId === m.id && ( ... menu items ... )}
//   </div>
//   {student && <FolderIcon onClick={(e) => { e.stopPropagation(); handleOpenDocuments(student); }} />}
// </div>

code = code.replace(
  /Copiar Link Único\s*<\/button>\s*<\/div>\s*\)\}\s*<\/div>\s*<\/div>\s*<\/td>/,
  `Copiar Link Único
                                    </button>
                                  </div>
                                )}
                              </div>
                              {student && <FolderIcon onClick={(e) => { e.stopPropagation(); handleOpenDocuments(student); }} />}
                            </div>
                          </td>`
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
  /\{addStudentOpen \? \(/, // It's actually <Modal isOpen={addStudentOpen}
  `${modalsToAdd}\n      {addStudentOpen ? (`
); // Wait, my grep showed <Modal isOpen={addStudentOpen}

fs.writeFileSync('src/pages/ClassDetails.tsx', code);
