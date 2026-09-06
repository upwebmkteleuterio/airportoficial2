const fs = require('fs');
let content = fs.readFileSync('src/types/index.ts', 'utf8');

const regex = /horario_prova_2_chamada: string; \/\/ Ex: "17:00-18:30" ou "Sem prova"/;
const replacement = `horario_prova_2_chamada: string; // Ex: "17:00-18:30" ou "Sem prova"\n  data_prova_1_chamada?: string;\n  data_prova_2_chamada?: string;`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/types/index.ts', content);
