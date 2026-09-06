const fs = require('fs');
let content = fs.readFileSync('src/pages/PublicEnrollment.tsx', 'utf8');

const regex = /const handleChange = \(e: React\.ChangeEvent<HTMLInputElement \| HTMLSelectElement>\) => \{/m;
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {`;

content = content.replace(regex, replacer);

const cepInput = /name="cep"\s*value=\{formData\.cep\}\s*onChange=\{handleChange\}/m;
const cepReplacer = `name="cep" value={formData.cep} onChange={handleChange} onBlur={handleCepBlur}`;
content = content.replace(cepInput, cepReplacer);

fs.writeFileSync('src/pages/PublicEnrollment.tsx', content);
