const fs = require('fs');
let code = fs.readFileSync('src/components/StudentRegistrationModal.tsx', 'utf8');

code = code.replace(
  /const \[formData, setFormData\] = useState\(\{/,
  `const [formData, setFormData] = useState({
    email: '',
    telefone: '',`
);

fs.writeFileSync('src/components/StudentRegistrationModal.tsx', code);
