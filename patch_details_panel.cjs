const fs = require('fs');
let content = fs.readFileSync('src/components/StudentDetailsPanel.tsx', 'utf8');

const personalTabOld = `<label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">Nome da Mãe</label>
                <div className="text-sm font-medium text-slate-900 dark:text-white">{student.nome_mae || '-'}</div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">Grau de Ensino</label>
                <div className="text-sm font-medium text-slate-900 dark:text-white">{student.grau_ensino || '-'}</div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">Gênero</label>
                <div className="text-sm font-medium text-slate-900 dark:text-white">-</div>
              </div>`;

const personalTabNew = `<label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">Nome da Mãe</label>
                <div className="text-sm font-medium text-slate-900 dark:text-white">{student.nome_mae || '-'}</div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">Nome do Pai</label>
                <div className="text-sm font-medium text-slate-900 dark:text-white">{student.nome_pai || '-'}</div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">Grau de Ensino</label>
                <div className="text-sm font-medium text-slate-900 dark:text-white">{student.grau_ensino || '-'}</div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">Trabalha na aviação civil?</label>
                <div className="text-sm font-medium text-slate-900 dark:text-white">{student.trabalha_aviacao_civil === 'sim' ? 'Sim' : student.trabalha_aviacao_civil === 'nao' ? 'Não' : '-'}</div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">Trabalha com segurança Avsec?</label>
                <div className="text-sm font-medium text-slate-900 dark:text-white">{student.trabalha_seguranca_avsec === 'sim' ? 'Sim' : student.trabalha_seguranca_avsec === 'nao' ? 'Não' : '-'}</div>
              </div>`;

content = content.replace(personalTabOld, personalTabNew);

fs.writeFileSync('src/components/StudentDetailsPanel.tsx', content);
