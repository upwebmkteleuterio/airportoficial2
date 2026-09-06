const fs = require('fs');
let content = fs.readFileSync('src/pages/CentralGed.tsx', 'utf8');

// Add isLoading to useUsers and useDocuments
content = content.replace(
  "  const { documents, updateDocument } = useDocuments();\n  const { createLog } = useAudit();\n  // Search and general filters\n  const [searchQuery, setSearchQuery] = useState('');\n  const [selectedIaFilter, setSelectedIaFilter] = useState<string>('todos');\n  const [showFiltersDropdown, setShowFiltersDropdown] = useState(false);\n\n  // Initial queue data exactly from the screenshot\n  const { users, updateUser } = useUsers();",
  "  const { documents, updateDocument, isLoading: isLoadingDocuments } = useDocuments();\n  const { createLog } = useAudit();\n  // Search and general filters\n  const [searchQuery, setSearchQuery] = useState('');\n  const [selectedIaFilter, setSelectedIaFilter] = useState<string>('todos');\n  const [showFiltersDropdown, setShowFiltersDropdown] = useState(false);\n\n  // Initial queue data exactly from the screenshot\n  const { users, updateUser, isLoading: isLoadingUsers } = useUsers();\n  const isLoading = isLoadingUsers || isLoadingDocuments;"
);

// Add loading state in the table body
const oldTableBody = `            <tbody className="divide-y divide-gray-150 dark:divide-slate-800 font-sans text-slate-700 dark:text-slate-200">
              {listToRender.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-gray-500 font-sans">
                    <div className="flex flex-col items-center justify-center gap-2.5 max-w-sm mx-auto">
                      <div className="p-3 bg-amber-500/10 rounded-full text-amber-500">
                        <AlertCircle className="w-6 h-6 animate-pulse" />
                      </div>
                      <div>
                        <p className="font-bold text-xs text-slate-850 dark:text-slate-200">Fila GED vazia</p>
                        <p className="text-[10px] text-gray-400 mt-0.5 leading-normal">
                          Nenhum documento localizado para os critérios selecionados ("{searchQuery}" / Filtro IA: "{selectedIaFilter}").
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setSelectedIaFilter('todos');
                        }}
                        className="mt-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-[10px] font-bold rounded-lg text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                      >
                        Limpar Filtros e Restaurar Fila
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (`;

const newTableBody = `            <tbody className="divide-y divide-gray-150 dark:divide-slate-800 font-sans text-slate-700 dark:text-slate-200">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-gray-500">
                      <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                      <p className="font-sans text-sm">Carregando fila GED...</p>
                    </div>
                  </td>
                </tr>
              ) : listToRender.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-gray-500 font-sans">
                    <div className="flex flex-col items-center justify-center gap-2.5 max-w-sm mx-auto">
                      <div className="p-3 bg-amber-500/10 rounded-full text-amber-500">
                        <AlertCircle className="w-6 h-6 animate-pulse" />
                      </div>
                      <div>
                        <p className="font-bold text-xs text-slate-850 dark:text-slate-200">Fila GED vazia</p>
                        <p className="text-[10px] text-gray-400 mt-0.5 leading-normal">
                          Nenhum documento localizado para os critérios selecionados ("{searchQuery}" / Filtro IA: "{selectedIaFilter}").
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setSelectedIaFilter('todos');
                        }}
                        className="mt-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-[10px] font-bold rounded-lg text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                      >
                        Limpar Filtros e Restaurar Fila
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (`;

content = content.replace(oldTableBody, newTableBody);
fs.writeFileSync('src/pages/CentralGed.tsx', content);
