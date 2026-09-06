const fs = require('fs');
let code = fs.readFileSync('src/pages/ClassDetails.tsx', 'utf8');

const stateToAdd2 = `
  const [selectedStudentForEdit, setSelectedStudentForEdit] = useState<any | null>(null);
`;

code = code.replace(
  /const \[selectedStudentForDetails, setSelectedStudentForDetails\] = useState\<any \| null\>\(null\);/,
  `const [selectedStudentForDetails, setSelectedStudentForDetails] = useState<any | null>(null);\n${stateToAdd2}`
);

fs.writeFileSync('src/pages/ClassDetails.tsx', code);
