const fs = require('fs');

let content = fs.readFileSync('src/mocks/classes.ts', 'utf8');

const regex = /export const mockMatriculas: Matricula\[\] = \[([\s\S]*?)\];/;
const match = content.match(regex);
if (match) {
    let matriculas = match[1];
    
    // We want to make sure we add mock matriculas for more users if they don't have them
    // Let's first get the user IDs from users.ts
    const usersContent = fs.readFileSync('src/mocks/users.ts', 'utf8');
    const userIds = [...usersContent.matchAll(/id: '([^']+)'/g)].map(m => m[1]);
    
    // Create new matriculas for all ALUNO users
    // Actually, I can just append new matriculas to the list for specific users if they are not already there.
}
