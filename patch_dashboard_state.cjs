const fs = require('fs');
let content = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

content = content.replace(/const \[formDataTermino, setFormDataTermino\] = useState\(''\);/,
  "const [formDataTermino, setFormDataTermino] = useState('');\n  const [formDataLancamentoNotas, setFormDataLancamentoNotas] = useState('');");

content = content.replace(/setFormDataTermino\(''\);/,
  "setFormDataTermino('');\n      setFormDataLancamentoNotas('');");

content = content.replace(/setFormDataTermino\(item\.data_termino\);/,
  "setFormDataTermino(item.data_termino);\n                                    setFormDataLancamentoNotas(item.data_lancamento_notas || '');");

content = content.replace(/data_termino: formDataTermino,/,
  "data_termino: formDataTermino,\n          data_lancamento_notas: formDataLancamentoNotas,");

fs.writeFileSync('src/pages/Dashboard.tsx', content);
