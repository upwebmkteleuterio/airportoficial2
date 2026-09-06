const fs = require('fs');
let content = fs.readFileSync('src/components/StudentRegistrationModal.tsx', 'utf8');

const listRegex = /\{\[\s*\{ id: 'rg', label: 'Anexar RG' \},\s*\{ id: 'cpf', label: 'Anexar CPF' \},\s*\{ id: 'cnh', label: 'Anexar Carteira de Motorista \(CNH\)' \},\s*\{ id: 'residencia', label: 'Anexar Comprovante de Residência' \},\s*\{ id: 'ensino_medio', label: 'Anexar Certificado Ensino Médio' \},\s*\{ id: 'antecedentes_federais', label: 'Anexar Certidão de Antecedentes Criminais da Justiça Federal' \},\s*\{ id: 'antecedentes_estaduais', label: 'Anexar Certidão de Antecedentes Criminais da Justiça Estadual' \}\s*\]\.map/m;

const replacement = `{[
                  ...(formData.tipo_documento === 'identidade_cpf' ? [{ id: 'rg', label: 'Anexar Identidade com CPF' }] : []),
                  ...(formData.tipo_documento === 'identidade_sem_cpf' ? [{ id: 'rg', label: 'Anexar Identidade' }, { id: 'cpf', label: 'Anexar CPF' }] : []),
                  ...(formData.tipo_documento === 'cnh' ? [{ id: 'cnh', label: 'Anexar Carteira de Motorista (CNH)' }] : []),
                  { id: 'residencia', label: 'Anexar Comprovante de Residência' },
                  { id: 'ensino_medio', label: 'Anexar Certificado Ensino Médio' },
                  { id: 'antecedentes_federais', label: 'Anexar Certidão de Antecedentes Criminais da Justiça Federal' },
                  { id: 'antecedentes_estaduais', label: 'Anexar Certidão de Antecedentes Criminais da Justiça Estadual' }
                ].map`;

content = content.replace(listRegex, replacement);

const step3Regex = /<h4 className="font-bold">Anexar Documentos<\/h4>\s*<\/div>\s*<p className="text-xs text-gray-500 dark:text-slate-400 mb-4">\s*Selecione os arquivos correspondentes para cada documento\. Arquivos nos formatos PDF, JPG ou PNG\.\s*<\/p>\s*<div className="space-y-3">/m;

const step3Replacement = `<h4 className="font-bold">Anexar Documentos</h4>
              </div>
              <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">
                Selecione os arquivos correspondentes para cada documento. Arquivos nos formatos PDF, JPG ou PNG.
              </p>

              <div className="mb-4">
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Tipo de Documento de Identificação</label>
                <select
                  name="tipo_documento"
                  value={formData.tipo_documento}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-850 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#005f5f] outline-none"
                >
                  <option value="identidade_cpf">Identidade com CPF</option>
                  <option value="identidade_sem_cpf">Identidade sem CPF</option>
                  <option value="cnh">CNH</option>
                </select>
              </div>

              <div className="space-y-3">`;

content = content.replace(step3Regex, step3Replacement);

content = content.replace(
  "<strong>Aviso:</strong> Anexo do documento do estado de domicílio, ou seja, do mesmo estado do comprovante de residência.",
  "<strong>Aviso:</strong> Certidões de antecedentes criminais devem ser do mesmo estado de domicílio, ou seja, do mesmo estado do comprovante de residência."
);

fs.writeFileSync('src/components/StudentRegistrationModal.tsx', content);
