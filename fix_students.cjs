const fs = require('fs');
let code = fs.readFileSync('src/pages/Students.tsx', 'utf8');

code = code.replace(
  /<FolderIcon onClick=\{\(e\) => \{ e\.stopPropagation\(\); handleOpenDocuments\(aluno\); \}\} \/>\s*<button/g,
  `<button`
);

code = code.replace(
  /<MoreVertical className="w-4 h-4" \/>\s*<\/button>/g,
  `<MoreVertical className="w-4 h-4" />
                        </button>
                        <FolderIcon onClick={(e) => { e.stopPropagation(); handleOpenDocuments(aluno); }} />`
);

fs.writeFileSync('src/pages/Students.tsx', code);
