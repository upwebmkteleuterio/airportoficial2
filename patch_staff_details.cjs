const fs = require('fs');
let content = fs.readFileSync('src/components/StaffDetailsPanel.tsx', 'utf8');

const personal_regex = /<div className="grid grid-cols-2 gap-4">[\s\S]*?<\/div>\s*<\/div>\s*\)\}/;
const personal_replacement = `<div className="space-y-6">
            <div className="flex justify-center mb-6">
              <div className="w-24 h-24 rounded-full bg-slate-200 dark:bg-slate-800 border-2 border-gray-300 dark:border-slate-700 flex items-center justify-center overflow-hidden">
                {staff.foto_url ? (
                  <img src={staff.foto_url} alt="Foto" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-10 h-10 text-gray-400" />
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">Nome Completo</label>
                <div className="text-sm font-medium text-slate-900 dark:text-white">{staff.nome_completo || '-'}</div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">E-mail</label>
                <div className="text-sm font-medium text-slate-900 dark:text-white">{staff.email || '-'}</div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">CPF</label>
                <div className="text-sm font-medium text-slate-900 dark:text-white">{staff.cpf || '-'}</div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">Telefone</label>
                <div className="text-sm font-medium text-slate-900 dark:text-white">{staff.telefone || '-'}</div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">Certificação Avsec</label>
                <div className="text-sm font-medium text-slate-900 dark:text-white">{staff.certificacao_avsec || '-'}</div>
              </div>
            </div>
          </div>
        )}`;
content = content.replace(personal_regex, personal_replacement);

fs.writeFileSync('src/components/StaffDetailsPanel.tsx', content);
