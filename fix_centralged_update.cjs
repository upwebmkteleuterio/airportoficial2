const fs = require('fs');
let content = fs.readFileSync('src/pages/CentralGed.tsx', 'utf8');

// Fix updateUser
content = content.replace("updateUser(itemId, { status: 'ativo' });", "updateUser({ id: itemId, updates: { status: 'ativo' } });");
content = content.replace("  const { updateUser } = useUsers();", "");
content = content.replace("  const { users } = useUsers();", "  const { users, updateUser } = useUsers();");

fs.writeFileSync('src/pages/CentralGed.tsx', content);
