const fs = require('fs');
let content = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

content = content.replace(/data_termino: formDataTermino,\n\s*endereco_realizacao: addressName,/,
  "data_termino: formDataTermino,\n          data_lancamento_notas: formDataLancamentoNotas,\n          endereco_realizacao: addressName,");

content = content.replace(/status_prazo_notas: ClassStatusPrazo\.NO_PRAZO,/, "nota_lancada: false,");

fs.writeFileSync('src/pages/Dashboard.tsx', content);
