const fs = require('fs');
let content = fs.readFileSync('src/pages/CentralGed.tsx', 'utf8');

content = content.replace("const { users } = useUsers();\n  const { updateUser } = useUsers();", "const { users, updateUser } = useUsers();");
content = content.replace("  const { users } = useUsers();", "");
fs.writeFileSync('src/pages/CentralGed.tsx', content);
