const fs = require('fs');
let content = fs.readFileSync('src/components/StudentRegistrationModal.tsx', 'utf8');

const toReplace = `{doc.id === 'antecedentes_federais' && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-3 mb-1 mt-2 rounded-r-lg">
                      <p className="text-xs text-blue-800 dark:text-blue-300">
                        <strong>Aviso:</strong> Anexo do documento do estado de domicílio, ou seja, do mesmo estado do comprovante de residência.
                      </p>
                    </div>
                  )}
                  <div key={doc.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 border border-gray-200 dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-800/50">`;

const replacement = `<React.Fragment key={doc.id}>
                  {doc.id === 'antecedentes_federais' && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-3 mb-1 mt-2 rounded-r-lg">
                      <p className="text-xs text-blue-800 dark:text-blue-300">
                        <strong>Aviso:</strong> Anexo do documento do estado de domicílio, ou seja, do mesmo estado do comprovante de residência.
                      </p>
                    </div>
                  )}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 border border-gray-200 dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-800/50">`;

content = content.replace(toReplace, replacement);

// Replace end parenthesis of map with closing fragment
const toReplaceEnd = `                      </label>
                    </div>
                  </div>
                ))}
              </div>`;

const replacementEnd = `                      </label>
                    </div>
                  </div>
                  </React.Fragment>
                ))}
              </div>`;
content = content.replace(toReplaceEnd, replacementEnd);

// Add import React if needed
if (!content.includes("import React")) {
    content = "import React from 'react';\n" + content;
}

fs.writeFileSync('src/components/StudentRegistrationModal.tsx', content);
