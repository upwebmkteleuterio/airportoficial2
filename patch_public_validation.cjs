const fs = require('fs');
let content = fs.readFileSync('src/pages/PublicEnrollment.tsx', 'utf8');

const validationRegex = /const handlePrev = \(\) => setStep\(s => s - 1\);/;

const validationFunctions = `const handlePrev = () => setStep(s => s - 1);

  const isStep0Valid = () => {
    return formData.email.includes('@') && isValidPhone(formData.telefone);
  };
  
  const isStep1Valid = () => {
    return isValidFullName(formData.nome_completo) &&
           isValidDate(formData.data_nascimento) &&
           isValidFullName(formData.nome_mae) &&
           formData.rg.trim().length > 0 &&
           formData.orgao_expedicao_rg.trim().length > 0 &&
           isValidCPF(formData.cpf) &&
           formData.grau_ensino.trim().length > 0 &&
           formData.trabalha_aviacao_civil.trim().length > 0 &&
           formData.trabalha_seguranca_avsec.trim().length > 0;
  };
  
  const isStep2Valid = () => {
    return isValidCEP(formData.cep) &&
           formData.endereco.trim().length > 0 &&
           formData.numero.trim().length > 0 &&
           formData.bairro.trim().length > 0 &&
           formData.cidade.trim().length > 0 &&
           formData.estado.trim().length > 0;
  };

  const isStep3Valid = () => {
    // Basic check for files if required, but for now we just allow next
    return true;
  };
  
  const isStepValid = (currentStep: number) => {
    if (currentStep === 0) return isStep0Valid();
    if (currentStep === 1) return isStep1Valid();
    if (currentStep === 2) return isStep2Valid();
    if (currentStep === 3) return isStep3Valid();
    if (currentStep === 4) return formData.turma_id !== '';
    return true;
  };`;

content = content.replace(validationRegex, validationFunctions);

const buttonRegex = /<Button type="submit" variant="primary">/g;
content = content.replace(buttonRegex, `<Button type="submit" variant="primary" disabled={!isStepValid(step)}>`);

fs.writeFileSync('src/pages/PublicEnrollment.tsx', content);
