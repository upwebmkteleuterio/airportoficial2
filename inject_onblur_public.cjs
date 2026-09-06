const fs = require('fs');
let content = fs.readFileSync('src/pages/PublicEnrollment.tsx', 'utf8');

// Replace any handleCepBlur with handleBlur
content = content.replace(/onBlur=\{handleCepBlur\}/g, 'onBlur={handleBlur}');

const addErrorToFields = (content) => {
  const fields = [
    'nome_completo', 'email', 'telefone', 'data_nascimento', 
    'nome_mae', 'nome_pai', 'rg', 'orgao_expedicao_rg', 'cpf', 
    'grau_ensino', 'trabalha_aviacao_civil', 
    'trabalha_seguranca_avsec', 'cep', 'endereco', 'numero', 
    'bairro', 'cidade', 'estado'
  ];

  fields.forEach(field => {
    // Inject onBlur if not present
    let fieldRegex = new RegExp(`(name="${field}"\\s+value=\\{formData\\.${field}\\}\\s+onChange=\\{handleChange\\})\\s*(?!onBlur)`, "g");
    content = content.replace(fieldRegex, `$1 onBlur={handleBlur}`);
    
    // In PublicEnrollment, inputs might be in divs like <div><label>...</label><input .../></div>
    // Replace closing div
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

// check for duplicate onBlur={handleBlur}
content = content.replace(/onBlur=\{handleBlur\}\s*onBlur=\{handleBlur\}/g, 'onBlur={handleBlur}');
content = content.replace(/onBlur=\{handleBlur\}className/g, 'onBlur={handleBlur}\n                      className');


fs.writeFileSync('src/pages/PublicEnrollment.tsx', content);
