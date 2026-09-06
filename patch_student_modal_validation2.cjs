const fs = require('fs');
let content = fs.readFileSync('src/components/StudentRegistrationModal.tsx', 'utf8');

// replace isStep1Valid
content = content.replace(
  /formData\.email\.includes\('@'\);/,
  `formData.email.includes('@') &&
           formData.trabalha_aviacao_civil.trim().length > 0 &&
           formData.trabalha_seguranca_avsec.trim().length > 0;`
);

const btnNextRegex = /<Button\s*onClick=\{handleNext\}\s*className="px-6 py-2 bg-\[\#005f5f\] hover:bg-\[\#004d4d\] text-white flex items-center gap-2"\s*>/;

const newBtn = `<Button 
              onClick={handleNext} 
              disabled={(step === 1 && !isStep1Valid()) || (step === 2 && !isStep2Valid())}
              className="px-6 py-2 bg-[#005f5f] hover:bg-[#004d4d] disabled:bg-gray-400 disabled:hover:bg-gray-400 text-white flex items-center gap-2"
            >`;

content = content.replace(btnNextRegex, newBtn);

fs.writeFileSync('src/components/StudentRegistrationModal.tsx', content);
