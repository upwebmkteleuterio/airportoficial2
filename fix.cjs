const fs = require('fs');
let code = fs.readFileSync('src/components/StudentRegistrationModal.tsx', 'utf8');
code = code.replace(/if \(name === 'cpf'\) \{[\s\S]*?\} else if \(name === 'data_nascimento'\) \{[\s\S]*?\} else if \(name === 'cep'\) \{[\s\S]*?return masked;/m,
`if (name === 'cpf') {
      masked = value.replace(/\\D/g, '')
                    .replace(/(\\d{3})(\\d)/, '$1.$2')
                    .replace(/(\\d{3})(\\d)/, '$1.$2')
                    .replace(/(\\d{3})(\\d{1,2})$/, '$1-$2')
                    .substring(0, 14);
    } else if (name === 'data_nascimento') {
      masked = value.replace(/\\D/g, '')
                    .replace(/(\\d{2})(\\d)/, '$1/$2')
                    .replace(/(\\d{2})(\\d)/, '$1/$2')
                    .substring(0, 10);
    } else if (name === 'cep') {
      masked = value.replace(/\\D/g, '')
                    .replace(/(\\d{5})(\\d)/, '$1-$2')
                    .substring(0, 9);
    }
    return masked;`);
fs.writeFileSync('src/components/StudentRegistrationModal.tsx', code);
