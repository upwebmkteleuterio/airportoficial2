const fs = require('fs');
let content = fs.readFileSync('src/services/classService.ts', 'utf8');
if (!content.includes('getTurmasByInstrutor: async (instrutorId: string)')) {
  const code = `
  getTurmasByInstrutor: async (instrutorId: string): Promise<MockTurmaInstrutorRel[]> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const rels = getStoredRelInstrutores();
        resolve(rels.filter(r => r.instrutor_id === instrutorId));
      }, 500);
    });
  },`;
  content = content.replace('getInstrutoresByTurma: async (turmaId: string): Promise<MockTurmaInstrutorRel[]> => {', code + '\n  getInstrutoresByTurma: async (turmaId: string): Promise<MockTurmaInstrutorRel[]> => {');
  fs.writeFileSync('src/services/classService.ts', content);
}
