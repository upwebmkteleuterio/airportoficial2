const fs = require('fs');
let content = fs.readFileSync('src/pages/Companies.tsx', 'utf8');

content = content.replace(
  '<Modal \n        isOpen={!!linkModalCompany} \n        onClose={() => setLinkModalCompany(null)} \n        title="Configurar Link de Matrícula"\n      >',
  '<Modal \n        isOpen={!!linkModalCompany} \n        onClose={() => setLinkModalCompany(null)} \n      >\n      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-6 shadow-2xl">\n        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Configurar Link de Matrícula</h3>'
);

content = content.replace(
  '          </div>\n        </div>\n      </Modal>',
  '          </div>\n        </div>\n      </div>\n      </Modal>'
);

fs.writeFileSync('src/pages/Companies.tsx', content);
