const fs = require('fs');
let content = fs.readFileSync('src/pages/PublicEnrollment.tsx', 'utf8');

const docsRegex = /\{Object\.keys\(files\)\.map\(key => \(\s*<React\.Fragment key=\{key\}>/m;

// We need to inject the select field before the grid:
const step3Regex = /<h3 className="text-lg font-bold text-slate-800 mb-4">Envio de Documentos<\/h3>\s*<div className="grid grid-cols-1 md:grid-cols-2 gap-4">/m;

const step3Replacement = `<h3 className="text-lg font-bold text-slate-800 mb-4">Envio de Documentos</h3>
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Tipo de Documento de Identificação</label>
                  <select
                    name="tipo_documento"
                    value={formData.tipo_documento}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-teal-500 focus:border-teal-500 bg-white"
                  >
                    <option value="identidade_cpf">Identidade com CPF</option>
                    <option value="identidade_sem_cpf">Identidade sem CPF</option>
                    <option value="cnh">CNH</option>
                  </select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">`;

content = content.replace(step3Regex, step3Replacement);

// Now we need to filter `Object.keys(files)` based on `formData.tipo_documento`.
// Instead of `Object.keys(files)`, we'll define an array inline.
const mapRegex = /\{Object\.keys\(files\)\.map\(key => \(/m;
const mapReplacement = `{[
                  ...(formData.tipo_documento === 'identidade_cpf' ? ['rg_frente', 'rg_verso'] : []),
                  ...(formData.tipo_documento === 'identidade_sem_cpf' ? ['rg_frente', 'rg_verso', 'cpf_documento'] : []),
                  ...(formData.tipo_documento === 'cnh' ? ['cnh_documento'] : []),
                  'comprovante_residencia',
                  'historico_escolar',
                  'certidao_antecedentes_federais',
                  'certidao_antecedentes_estaduais'
                ].map(key => (`;

content = content.replace(mapRegex, mapReplacement);

// We need to update the initial files state to include 'cnh_documento'
content = content.replace(
  "certidao_antecedentes_estaduais: null",
  "certidao_antecedentes_estaduais: null,\n    cnh_documento: null"
);

// We also need to update the aviso text
content = content.replace(
  "<strong>Aviso:</strong> Anexo do documento do estado de domicílio, ou seja, do mesmo estado do comprovante de residência.",
  "<strong>Aviso:</strong> Certidões de antecedentes criminais devem ser do mesmo estado de domicílio, ou seja, do mesmo estado do comprovante de residência."
);

fs.writeFileSync('src/pages/PublicEnrollment.tsx', content);
