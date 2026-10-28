import { supabase } from '../integrations/supabase/client';
import type { ParticipanteOpcao } from '../types/financeiro';
import { serviceError } from './supabaseErrors';

type PessoaParticipante = {
  id: string;
  nome: string;
  cpf: string | null;
};

type EmpresaParticipante = {
  id: string;
  nome_fantasia: string;
  cnpj: string | null;
};

function formatarDocumento(documento: string | null | undefined): string | null {
  const digitos = documento?.replace(/\D/g, '') ?? '';
  if (digitos.length === 11) return digitos.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  if (digitos.length === 14) return digitos.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  return null;
}

function toPessoaOpcao(pessoa: PessoaParticipante, tipo: 'ALUNO' | 'INSTRUTOR'): ParticipanteOpcao {
  return { tipo, id: pessoa.id, nome: pessoa.nome, documento: formatarDocumento(pessoa.cpf) };
}

export const participanteService = {
  getInstrutores: async (): Promise<ParticipanteOpcao[]> => {
    const { data, error } = await supabase.from('pessoas').select('id, nome, cpf')
      .eq('papel', 'INSTRUTOR').eq('ativo', true).order('nome', { ascending: true });
    if (error) throw serviceError('Não foi possível carregar os instrutores', error);
    return ((data ?? []) as PessoaParticipante[]).map((pessoa) => toPessoaOpcao(pessoa, 'INSTRUTOR'));
  },

  getEmpresas: async (): Promise<ParticipanteOpcao[]> => {
    const { data, error } = await supabase.from('empresas').select('id, nome_fantasia, cnpj')
      .order('nome_fantasia', { ascending: true });
    if (error) throw serviceError('Não foi possível carregar as empresas', error);
    return ((data ?? []) as EmpresaParticipante[]).map((empresa) => ({
      tipo: 'EMPRESA',
      id: empresa.id,
      nome: empresa.nome_fantasia,
      documento: formatarDocumento(empresa.cnpj),
    }));
  },

  buscarAlunosPorCpf: async (termo: string): Promise<ParticipanteOpcao[]> => {
    const digitos = termo.replace(/\D/g, '').slice(0, 100);
    if (digitos.length < 3) return [];
    const { data, error } = await supabase.from('pessoas').select('id, nome, cpf')
      .eq('ativo', true).or('papel.is.null,papel.eq.ALUNO')
      .ilike('cpf', `%${digitos}%`).order('nome', { ascending: true }).limit(20);
    if (error) throw serviceError('Não foi possível buscar alunos pelo CPF', error);
    return ((data ?? []) as PessoaParticipante[]).map((pessoa) => toPessoaOpcao(pessoa, 'ALUNO'));
  },
};
