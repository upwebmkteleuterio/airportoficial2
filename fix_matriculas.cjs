const fs = require('fs');

let content = fs.readFileSync('src/mocks/classes.ts', 'utf8');

// Find the end of mockMatriculas array
// It ends right before export const mockDiarioClasse: DiarioClasse[] = [
const endStr = '];\n\n// Criação de diários de classe de exemplo';
const idx = content.indexOf(endStr);
if (idx !== -1) {
    const additionalMatriculas = `,
  {
    id: 'mat-10',
    codigo_re: 78910,
    tuf: 'TUF-C',
    anac_codigo: '123490',
    aluno_id: 'aluno-1',
    turma_id: 'turma-881',
    empresa_b2b_id: 'empresa-1',
    software_utilizado: 'ViteOS',
    percentual_presenca: 100,
    nota_1_chamada: 9.0,
    status_resultado_final: 'Aprovado',
    status_matricula: 'Concluido'
  },
  {
    id: 'mat-11',
    codigo_re: 78911,
    aluno_id: 'aluno-1',
    turma_id: 'turma-882',
    empresa_b2b_id: 'empresa-1',
    percentual_presenca: 90,
    status_matricula: 'Ativo'
  },
  {
    id: 'mat-12',
    codigo_re: 78912,
    aluno_id: 'aluno-2',
    turma_id: 'turma-881',
    empresa_b2b_id: 'empresa-2',
    percentual_presenca: 80,
    status_matricula: 'Ativo'
  }
`;
    content = content.slice(0, idx) + additionalMatriculas + content.slice(idx);
    fs.writeFileSync('src/mocks/classes.ts', content);
    console.log("Mock matriculas added successfully.");
} else {
    console.log("Could not find insertion point.");
}

