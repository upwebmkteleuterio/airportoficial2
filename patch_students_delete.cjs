const fs = require('fs');
let code = fs.readFileSync('src/pages/Students.tsx', 'utf8');

const deleteModal = `
      <Modal isOpen={!!studentToDelete} onClose={() => setStudentToDelete(null)}>
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-6 space-y-4 shadow-2xl font-sans text-center">
          <div className="mx-auto w-12 h-12 bg-rose-500/10 rounded-full flex items-center justify-center text-rose-600 dark:text-rose-400">
            <Trash2 className="w-6 h-6 animate-pulse" />
          </div>
          <div className="space-y-2">
            <h4 className="font-bold text-base text-slate-900 dark:text-white">Excluir Aluno</h4>
            <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
              Tem certeza de que deseja excluir o aluno <span className="font-semibold text-slate-850 dark:text-slate-200">{studentToDelete?.nome_completo}</span>? Esta ação não pode ser desfeita.
            </p>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => setStudentToDelete(null)}
              className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-850 dark:text-slate-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                // TODO: useUsers().deleteUser
                // for now just close
                setStudentToDelete(null);
              }}
              className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm cursor-pointer"
            >
              Confirmar Exclusão
            </button>
          </div>
        </div>
      </Modal>
`;

code = code.replace(
  /<PasswordModal /,
  `${deleteModal}\n      <PasswordModal `
);

code = code.replace(/import \{ Modal \} from '\.\.\/components\/ui\/Modal';/g, ''); // in case it's there
code = code.replace(/import \{ Button \} from '\.\.\/components\/ui\/Button';/, `import { Button } from '../components/ui/Button';\nimport { Modal } from '../components/ui/Modal';`);

fs.writeFileSync('src/pages/Students.tsx', code);
