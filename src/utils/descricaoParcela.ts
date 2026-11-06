const ROTULO_DA_PARCELA = /^(Recorrente|Parcela única|Parcela \d+ de \d+)$/;

export function separarDescricao(descricao: string): { base: string; rotulo: string } {
  const separador = descricao.lastIndexOf(' - ');
  if (separador <= 0) return { base: descricao, rotulo: '' };

  const base = descricao.slice(0, separador).trim();
  const rotulo = descricao.slice(separador + 3).trim();
  if (!ROTULO_DA_PARCELA.test(rotulo)) return { base: descricao, rotulo: '' };

  return { base, rotulo };
}
