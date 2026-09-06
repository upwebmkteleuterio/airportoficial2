const fs = require('fs');
let content = fs.readFileSync('src/pages/Companies.tsx', 'utf8');

// 1. Add editingCompanyId state
content = content.replace(
  "const [addCompanyOpen, setAddCompanyOpen] = useState(false);",
  "const [addCompanyOpen, setAddCompanyOpen] = useState(false);\n  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);"
);

// 2. Add updateCompany to useCompanies hook destructuring
content = content.replace(
  "const { companies, isLoading, createCompany, deleteCompany } = useCompanies();",
  "const { companies, isLoading, createCompany, updateCompany, deleteCompany } = useCompanies();"
);

// 3. Fix handleSaveCompany to use updateCompany
const saveRegex = /const handleSaveCompany = async \(\) => \{[\s\S]*?createLog\(\{[\s\S]*?\}\);/m;
const newSave = `const handleSaveCompany = async () => {
    if (!formCnpj || !formRazao || !formFantasia) {
      alert('Por favor, preencha todos os campos obrigatórios: Razão Social, Nome Fantasia e CNPJ.');
      return;
    }

    try {
      if (editingCompanyId) {
        await updateCompany({
          id: editingCompanyId,
          updates: {
            cnpj: formCnpj,
            razao_social: formRazao,
            nome_fantasia: formFantasia,
            email_corporativo: formEmail || undefined,
            website: formSite || undefined,
            status_ativo: formStatus,
            telefone: formTelefone || undefined,
            endereco: formEndereco || undefined,
            responsavel: formResponsavel || undefined,
          }
        });
        createLog({
          usuario_id: 'user-admin-1',
          acao: \`Atualizou empresa corporativa "\${formRazao}"\`,
          tabela_afetada: 'empresas_b2b',
          registro_id: editingCompanyId,
        });
      } else {
        const token = \`tk_\${formFantasia.toLowerCase().replace(/[^a-z0-9]/g, '_')}\`;
        const emailToSave = formEmail || \`financeiro@\${formFantasia.toLowerCase().replace(/[^a-z0-9]/g, '') || 'empresa'}.com.br\`;
        await createCompany({
          cnpj: formCnpj,
          razao_social: formRazao,
          nome_fantasia: formFantasia,
          email_corporativo: emailToSave,
          website: formSite || undefined,
          token_registro_b2b: token,
          limite_vagas_corporativo: 100, // default limit
          status_ativo: formStatus,
          telefone: formTelefone || undefined,
          endereco: formEndereco || undefined,
          responsavel: formResponsavel || undefined,
        });
        createLog({
          usuario_id: 'user-admin-1',
          acao: \`Cadastrou nova empresa corporativa "\${formRazao}"\`,
          tabela_afetada: 'empresas_b2b',
          registro_id: formCnpj,
        });
      }`;
content = content.replace(saveRegex, newSave);

// 4. Update the "Nova Empresa" button to clear editing state
const addBtnRegex = /<Button\s*id="btn-add-company-modal"\s*onClick=\{\(\) => setAddCompanyOpen\(true\)\}\s*icon=\{<Plus className="w-4 h-4" \/>\}\s*>\s*Nova Empresa\s*<\/Button>/m;
const newAddBtn = `<Button
          id="btn-add-company-modal"
          onClick={() => {
            setEditingCompanyId(null);
            setFormCnpj('');
            setFormRazao('');
            setFormFantasia('');
            setFormEmail('');
            setFormSite('');
            setFormStatus(true);
            setFormTelefone('');
            setFormEndereco('');
            setFormResponsavel('');
            setAddCompanyOpen(true);
          }}
          icon={<Plus className="w-4 h-4" />}
        >
          Nova Empresa
        </Button>`;
content = content.replace(addBtnRegex, newAddBtn);

// 5. Modify the Table Header
content = content.replace(
  '<th className="px-5 py-4 text-center">ÚLTIMA ATIVIDADE</th>',
  '<th className="px-5 py-4 text-center">LINK DE INSCRIÇÃO</th>'
);

// 6. Modify the Table Body
const tdUltimaAtividade = /\{\/\* Ultima Atividade Column \*\/\}\s*<td className="px-5 py-2\.5 border-r border-gray-100\/50 dark:border-slate-800\/30 text-center font-mono text-\[11px\] text-gray-500 dark:text-slate-400">\s*\{dataAtividade\}\s*<\/td>/m;
const newTdLink = `{/* Link Gerar Column */}
                      <td className="px-5 py-2.5 border-r border-gray-100/50 dark:border-slate-800/30 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyLink(comp);
                          }}
                          disabled={!isAtivo}
                          className={\`px-3 py-1.5 text-[11px] font-bold rounded flex items-center gap-1.5 mx-auto transition-colors \${
                            isAtivo
                              ? 'bg-teal-50 text-teal-700 hover:bg-teal-100 dark:bg-teal-500/10 dark:text-teal-400 dark:hover:bg-teal-500/20 border border-teal-200 dark:border-teal-800/30'
                              : 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-slate-800 dark:text-slate-500 border border-gray-200 dark:border-slate-700'
                          }\`}
                        >
                          <LinkIcon className="w-3.5 h-3.5" />
                          Gerar link único
                        </button>
                      </td>`;
content = content.replace(tdUltimaAtividade, newTdLink);

// 7. Change Status to a switch toggle
const tdStatus = /\{\/\* Status Column with colored small badges \*\/\}\s*<td className="px-5 py-2\.5 border-r border-gray-100\/50 dark:border-slate-800\/30 text-center">\s*<span[\s\S]*?<\/span>\s*<\/td>/m;
const newTdStatus = `{/* Status Switch Column */}
                      <td className="px-5 py-2.5 border-r border-gray-100/50 dark:border-slate-800/30 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateCompany({ id: comp.id, updates: { status_ativo: !comp.status_ativo } });
                          }}
                          className={\`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none \${comp.status_ativo ? 'bg-teal-500' : 'bg-gray-300 dark:bg-slate-600'}\`}
                        >
                          <span className={\`inline-block h-3 w-3 transform rounded-full bg-white transition-transform \${comp.status_ativo ? 'translate-x-5' : 'translate-x-1'}\`} />
                        </button>
                      </td>`;
content = content.replace(tdStatus, newTdStatus);

// 8. Modify 3-dots menu: replace "Copiar Link Único" with "Editar"
const menuRegex = /<button\s*onClick=\{\(e\) => \{\s*e\.stopPropagation\(\);\s*handleCopyLink\(comp\);\s*setOpenMenuId\(null\);\s*\}\}[\s\S]*?Copiar Link Único\s*<\/button>/m;
const newMenuBtn = `<button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuId(null);
                                    setEditingCompanyId(comp.id);
                                    setFormCnpj(comp.cnpj || '');
                                    setFormRazao(comp.razao_social || '');
                                    setFormFantasia(comp.nome_fantasia || '');
                                    setFormEmail(comp.email_corporativo || '');
                                    setFormSite(comp.website || '');
                                    setFormStatus(comp.status_ativo);
                                    setFormTelefone(comp.telefone || '');
                                    setFormEndereco(comp.endereco || '');
                                    setFormResponsavel(comp.responsavel || '');
                                    setAddCompanyOpen(true);
                                  }}
                                  className="w-full text-left px-4 py-2 text-xs font-semibold text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-2"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="w-4 h-4"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                                  Editar
                                </button>`;
content = content.replace(menuRegex, newMenuBtn);

// 9. Fix Panel Title
content = content.replace(
  "{editingCompanyId ? 'Editar Empresa Parceira' : 'Cadastro de Empresa Parceira'}", // Wait, it's static now
  "Cadastro de Empresa Parceira" // I'll replace the static text
);
content = content.replace(
  '<h3 className="font-display font-bold text-lg text-slate-900 dark:text-white leading-tight">\n                Cadastro de Empresa Parceira\n              </h3>',
  '<h3 className="font-display font-bold text-lg text-slate-900 dark:text-white leading-tight">\n                {editingCompanyId ? \'Editar Empresa Parceira\' : \'Cadastro de Empresa Parceira\'}\n              </h3>'
);

fs.writeFileSync('src/pages/Companies.tsx', content);
