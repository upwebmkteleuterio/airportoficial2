const fs = require('fs');
let content = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

const regex = /const handleCloseClassModal = \(\) => \{/;
const replacement = `const handleToggleNotaLancada = async (e: React.MouseEvent, classId: string, currentStatus: boolean) => {
    e.stopPropagation();
    try {
      const isNowLaunched = !currentStatus;
      const updates: Partial<Turma> = {
        nota_lancada: isNowLaunched,
      };
      if (isNowLaunched) {
        updates.data_lancada_real = new Date().toISOString().split('T')[0];
      }
      await updateClass({ id: classId, updates });
    } catch (err) {
      console.error(err);
    }
  };

  const handleCloseClassModal = () => {`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/pages/Dashboard.tsx', content);
