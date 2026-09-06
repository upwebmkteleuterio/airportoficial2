const fs = require('fs');
let content = fs.readFileSync('src/components/StudentRegistrationModal.tsx', 'utf8');

const regex = /const handleInputChange = \(e: React\.ChangeEvent<HTMLInputElement \| HTMLSelectElement>\) => \{/m;
const replacer = `
  const handleCepBlur = async () => {
    const cep = formData.cep.replace(/\\D/g, '');
    if (cep.length === 8) {
      try {
        const response = await fetch(\`https://viacep.com.br/ws/\${cep}/json/\`);
        const data = await response.json();
        if (!data.erro) {
          setFormData(prev => ({
            ...prev,
            endereco: data.logradouro || prev.endereco,
            bairro: data.bairro || prev.bairro,
            cidade: data.localidade || prev.cidade,
            estado: data.uf || prev.estado
          }));
        }
      } catch (error) {
        console.error("Failed to fetch CEP", error);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {`;

content = content.replace(regex, replacer);

const cepInput = /name="cep"\s*value=\{formData\.cep\}\s*onChange=\{handleInputChange\}/m;
const cepReplacer = `name="cep"\n                    value={formData.cep}\n                    onChange={handleInputChange}\n                    onBlur={handleCepBlur}`;
content = content.replace(cepInput, cepReplacer);

fs.writeFileSync('src/components/StudentRegistrationModal.tsx', content);
