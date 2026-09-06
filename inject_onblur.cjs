const fs = require('fs');
let content = fs.readFileSync('src/components/StudentRegistrationModal.tsx', 'utf8');

content = content.replace(/onBlur=\{handleCepBlur\}/g, 'onBlur={handleBlur}');

const addErrorToFields = (content) => {
  const fields = [
    'nome_completo', 'email', 'telefone', 'data_nascimento', 
    'nome_mae', 'nome_pai', 'rg', 'orgao_expedicao_rg', 'cpf', 
    'grau_ensino', 'empresa_id', 'trabalha_aviacao_civil', 
    'trabalha_seguranca_avsec', 'cep', 'endereco', 'numero', 
    'bairro', 'cidade', 'estado'
  ];

  fields.forEach(field => {
    let fieldRegex = new RegExp(`(name="${field}"\\s+value=\\{formData\\.${field}\\}\\s+onChange=\\{handleInputChange\\})\\s*(?!onBlur)`, "g");
    content = content.replace(fieldRegex, `$1 onBlur={handleBlur}`);
    
    let endInputRegex = new RegExp(`(name="${field}"[\\s\\S]*?(?:\\/>|<\\/select>))\\s*<\\/div>`, "g");
    content = content.replace(endInputRegex, `$1
                  {touched.${field} && errors.${field} && (
                    <span className="text-red-500 text-xs mt-1 block">{errors.${field}}</span>
                  )}
                </div>`);
  });

  return content;
};

content = addErrorToFields(content);

fs.writeFileSync('src/components/StudentRegistrationModal.tsx', content);
