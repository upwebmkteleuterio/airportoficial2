const fs = require('fs');
['src/pages/Instructors.tsx', 'src/pages/Coordinators.tsx'].forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace('<SharedDocumentsPanel\n        isOpen={documentsPanelOpen}\n        onClose={() => setDocumentsPanelOpen(false)}\n        staff={selectedStaffForDocs}\n      />', '<SharedDocumentsPanel\n        isOpen={documentsPanelOpen}\n        onClose={() => setDocumentsPanelOpen(false)}\n        student={selectedStaffForDocs}\n      />');
  fs.writeFileSync(file, content);
});
