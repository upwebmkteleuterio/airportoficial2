export type EnderecoCep = {
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
};

export async function buscarEnderecoPorCep(cep: string): Promise<EnderecoCep | null> {
  const digits = cep.replace(/\D/g, '');
  if (digits.length !== 8) return null;

  try {
    const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
    if (!response.ok) return null;
    const data = await response.json();
    if (data.erro) return null;
    return {
      logradouro: data.logradouro || '',
      bairro: data.bairro || '',
      cidade: data.localidade || '',
      uf: data.uf || '',
    };
  } catch {
    return null;
  }
}
