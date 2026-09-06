const fs = require('fs');
let code = fs.readFileSync('src/pages/ClassDetails.tsx', 'utf8');

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
  /\{\/\* --- MODAL CENTRAL ADICIONAR ALUNO --- \*\/\}/,
  `${modalsToAdd}\n      {/* --- MODAL CENTRAL ADICIONAR ALUNO --- */}`
);

fs.writeFileSync('src/pages/ClassDetails.tsx', code);
