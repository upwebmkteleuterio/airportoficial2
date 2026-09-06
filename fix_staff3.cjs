const fs = require('fs');
let staff = fs.readFileSync('src/components/StaffDetailsPanel.tsx', 'utf8');

const matricula_block = `                          <div>
                            <span className="block text-gray-500 dark:text-slate-400 mb-0.5">Vínculo na Matrícula</span>
                            <span className="font-medium text-slate-700 dark:text-slate-200">
                              {matricula.empresa_b2b_id 
                                ? (companies.find(c => c.id === matricula.empresa_b2b_id)?.nome_fantasia || companies.find(c => c.id === matricula.empresa_b2b_id)?.razao_social || 'Empresa B2B')
                                : 'Avulso'}
                            </span>
                          </div>`;

staff = staff.replace(matricula_block, `                          <div>
                            <span className="block text-gray-500 dark:text-slate-400 mb-0.5">Função</span>
                            <span className="font-medium text-slate-700 dark:text-slate-200">{rel.funcao}</span>
                          </div>`);

fs.writeFileSync('src/components/StaffDetailsPanel.tsx', staff);
