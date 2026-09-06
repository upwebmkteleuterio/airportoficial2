const fs = require('fs');
let content = fs.readFileSync('src/pages/Shifts.tsx', 'utf8');

// Also update the "Salvar Turno" button to use `<Button>`
const saveBtnRegex = /<button\s*onClick=\{handleSave\}\s*disabled=\{createMutation\.isPending \|\| updateMutation\.isPending\}\s*className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2"\s*>\s*\{\(createMutation\.isPending \|\| updateMutation\.isPending\) \? 'Salvando\.\.\.' : \(\s*<>\s*<Save className="w-4 h-4" \/> \{editingShiftId \? 'Atualizar Turno' : 'Salvar Turno'\}\s*<\/>\s*\)\}\s*<\/button>/m;

const newSaveBtn = `<Button
                onClick={handleSave}
                disabled={createMutation.isPending || updateMutation.isPending}
                icon={!(createMutation.isPending || updateMutation.isPending) && <Save className="w-4 h-4" />}
              >
                {(createMutation.isPending || updateMutation.isPending) ? 'Salvando...' : (editingShiftId ? 'Atualizar Turno' : 'Salvar Turno')}
              </Button>`;

content = content.replace(saveBtnRegex, newSaveBtn);

fs.writeFileSync('src/pages/Shifts.tsx', content);
