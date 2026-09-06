const fs = require('fs');

function addUseEffect(filePath, stateName) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Add useEffect to imports if not there
    if (!content.includes('useEffect')) {
        content = content.replace('import React, { useState', 'import React, { useState, useEffect');
    }

    const useEffectSnippet = `
  useEffect(() => {
    const handleGlobalClick = () => set${stateName.charAt(0).toUpperCase() + stateName.slice(1)}(null);
    if (${stateName}) {
      document.addEventListener('click', handleGlobalClick);
    }
    return () => document.removeEventListener('click', handleGlobalClick);
  }, [${stateName}]);
`;

    if (!content.includes('handleGlobalClick')) {
        // Find state declaration and insert after it
        const stateDeclRegex = new RegExp(`const \\[${stateName}, set${stateName.charAt(0).toUpperCase() + stateName.slice(1)}\\] = useState<.*?>(.*?);`);
        content = content.replace(stateDeclRegex, `$&` + useEffectSnippet);
        fs.writeFileSync(filePath, content);
        console.log('Patched ' + filePath);
    }
}

addUseEffect('src/pages/Dashboard.tsx', 'openMenuId');
addUseEffect('src/pages/Companies.tsx', 'openMenuId');
addUseEffect('src/pages/Students.tsx', 'openMenuId');
addUseEffect('src/pages/ClassDetails.tsx', 'openMenuStudentId');
