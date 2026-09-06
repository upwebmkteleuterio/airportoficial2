const fs = require('fs');
let content = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

const regexStates = /const \[formHora1, setFormHora1\] = useState\(''\);\n  const \[formHora2, setFormHora2\] = useState\(''\);/;
content = content.replace(regexStates, `const [formHora1, setFormHora1] = useState('');\n  const [formHora2, setFormHora2] = useState('');\n  const [formDataProva1, setFormDataProva1] = useState('');\n  const [formDataProva2, setFormDataProva2] = useState('');`);

const regexReset = /setFormHora1\(''\);\n      setFormHora2\(''\);/;
content = content.replace(regexReset, `setFormHora1('');\n      setFormHora2('');\n      setFormDataProva1('');\n      setFormDataProva2('');`);

const regexUpdates = /data_termino: formDataTermino,\n            horario_prova_1_chamada: formHora1 \|\| 'Sem prova',\n            horario_prova_2_chamada: formHora2 \|\| 'Sem prova',/;
content = content.replace(regexUpdates, `data_termino: formDataTermino,\n            horario_prova_1_chamada: formHora1 || 'Sem prova',\n            horario_prova_2_chamada: formHora2 || 'Sem prova',\n            data_prova_1_chamada: formDataProva1,\n            data_prova_2_chamada: formDataProva2,`);

const regexCreate = /data_termino: formDataTermino,\n          endereco_realizacao: addressName,\n          endereco_id: formEndereco,\n          cidade: selectedAddress\?.cidade \|\| 'São Paulo',\n          uf: selectedAddress\?.estado \|\| 'SP',\n          horario_prova_1_chamada: formHora1 \|\| 'Sem prova',\n          horario_prova_2_chamada: formHora2 \|\| 'Sem prova',/;
content = content.replace(regexCreate, `data_termino: formDataTermino,\n          endereco_realizacao: addressName,\n          endereco_id: formEndereco,\n          cidade: selectedAddress?.cidade || 'São Paulo',\n          uf: selectedAddress?.estado || 'SP',\n          horario_prova_1_chamada: formHora1 || 'Sem prova',\n          horario_prova_2_chamada: formHora2 || 'Sem prova',\n          data_prova_1_chamada: formDataProva1,\n          data_prova_2_chamada: formDataProva2,`);

const regexEdit = /setFormHora1\(item\.horario_prova_1_chamada !== 'Sem prova' \? item\.horario_prova_1_chamada : ''\);\n                                    setFormHora2\(item\.horario_prova_2_chamada !== 'Sem prova' \? item\.horario_prova_2_chamada : ''\);/;
content = content.replace(regexEdit, `setFormHora1(item.horario_prova_1_chamada !== 'Sem prova' ? item.horario_prova_1_chamada : '');\n                                    setFormHora2(item.horario_prova_2_chamada !== 'Sem prova' ? item.horario_prova_2_chamada : '');\n                                    setFormDataProva1(item.data_prova_1_chamada || '');\n                                    setFormDataProva2(item.data_prova_2_chamada || '');`);

fs.writeFileSync('src/pages/Dashboard.tsx', content);
