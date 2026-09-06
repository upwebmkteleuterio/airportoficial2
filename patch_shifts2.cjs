const fs = require('fs');

let content = fs.readFileSync('src/pages/Shifts.tsx', 'utf8');

// 1. Add Button import if it's missing
if (!content.includes("import { Button } from '../components/ui/Button';")) {
  content = content.replace(
    "import { Plus, Search, Clock, Play, Square, Save, Trash2, X, AlertCircle, MoreVertical, Edit } from 'lucide-react';",
    "import { Plus, Search, Clock, Play, Square, Save, Trash2, X, AlertCircle, MoreVertical, Edit } from 'lucide-react';\nimport { Button } from '../components/ui/Button';"
  );
}

// 2. Change the "Novo Turno" button to use the <Button> component
const btnRegex = /<button\s*onClick=\{\(\) => \{\s*setEditingShiftId\(null\);\s*setIsModalOpen\(true\);\s*\}\}\s*className="w-full sm:w-auto px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm"\s*>\s*<Plus className="w-5 h-5" \/>\s*Novo Turno\s*<\/button>/m;

const newBtn = `<Button
            onClick={() => {
              setEditingShiftId(null);
              setIsModalOpen(true);
            }}
            icon={<Plus className="w-5 h-5" />}
          >
            Novo Turno
          </Button>`;

content = content.replace(btnRegex, newBtn);

// 3. Update the 3-dots menu wrapper inside the table
const menuRegex = /<td className="px-4 py-2 text-center border-r border-gray-200\/30 dark:border-slate-800\/30 relative">\s*<button\s*onClick=\{\(e\) => \{\s*e\.stopPropagation\(\);\s*setOpenMenuId\(openMenuId === shift\.id \? null : shift\.id\);\s*\}\}\s*className="p-1 text-gray-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors mx-auto flex"\s*>\s*<MoreVertical className="w-4 h-4" \/>\s*<\/button>\s*\{openMenuId === shift\.id && \(\s*<div className="absolute left-full top-0 ml-2 w-32 bg-white dark:bg-slate-850 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 py-1 z-\[100\] text-left">/m;

const newMenu = `<td className="px-4 py-2 text-center border-r border-gray-200/30 dark:border-slate-800/30">
                      <div className="flex items-center justify-center">
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(openMenuId === shift.id ? null : shift.id);
                            }}
                            className="p-1 text-gray-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          {openMenuId === shift.id && (
                            <div className="absolute left-full top-0 ml-2 w-32 bg-white dark:bg-slate-850 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 py-1 z-50 text-left">`;

content = content.replace(menuRegex, newMenu);

// Fix the closing tags for the menu in the td
const menuEndRegex = /<\/div>\s*\)\}\s*<\/td>/m;
const newMenuEnd = `</div>\n                          )}\n                        </div>\n                      </div>\n                    </td>`;

content = content.replace(menuEndRegex, newMenuEnd);

fs.writeFileSync('src/pages/Shifts.tsx', content);
