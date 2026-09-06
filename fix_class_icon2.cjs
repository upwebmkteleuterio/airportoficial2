const fs = require('fs');
let code = fs.readFileSync('src/pages/ClassDetails.tsx', 'utf8');

code = code.replace(
  /Remover\s*<\/button>\s*<\/div>\s*\)\}\s*<\/div>\s*<\/div>\s*<\/td>/g,
  `Remover
                                    </button>
                                  </div>
                                )}
                              </div>
                              {student && <FolderIcon onClick={(e) => { e.stopPropagation(); handleOpenDocuments(student); }} />}
                            </div>
                          </td>`
);

fs.writeFileSync('src/pages/ClassDetails.tsx', code);
