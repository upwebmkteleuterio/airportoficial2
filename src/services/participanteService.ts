import { supabase } from '../integrations/supabase/client';
import { FINANCEIRO_OPTIONS_LIMIT, type FinanceiroOptionsResult } from './financeiroOptions';
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
  getInstrutorOptions: async (): Promise<FinanceiroOptionsResult<ParticipanteOpcao>> => {
    const { data, count, error } = await supabase.from('pessoas').select('id, nome, cpf', { count: 'exact' })
      .eq('papel', 'INSTRUTOR').eq('ativo', true).order('nome', { ascending: true })
      .range(0, FINANCEIRO_OPTIONS_LIMIT - 1);
    if (error) throw serviceError('Não foi possível carregar os instrutores', error);
    return { data: ((data ?? []) as PessoaParticipante[]).map((pessoa) => toPessoaOpcao(pessoa, 'INSTRUTOR')), total: count ?? 0 };
  },

  getInstrutores: async (): Promise<ParticipanteOpcao[]> => (await participanteService.getInstrutorOptions()).data,

  getEmpresaOptions: async (): Promise<FinanceiroOptionsResult<ParticipanteOpcao>> => {
    const { data, count, error } = await supabase.from('empresas').select('id, nome_fantasia, cnpj', { count: 'exact' })
      .order('nome_fantasia', { ascending: true }).range(0, FINANCEIRO_OPTIONS_LIMIT - 1);
    if (error) throw serviceError('Não foi possível carregar as empresas', error);
    return {
      data: ((data ?? []) as EmpresaParticipante[]).map((empresa) => ({
        tipo: 'EMPRESA', id: empresa.id, nome: empresa.nome_fantasia, documento: formatarDocumento(empresa.cnpj),
      })),
      total: count ?? 0,
    };
  },

  getEmpresas: async (): Promise<ParticipanteOpcao[]> => (await participanteService.getEmpresaOptions()).data,

  buscarAlunosPorCpf: async (termo: string): Promise<ParticipanteOpcao[]> => {
    const digitos = termo.replace(/\D/g, '').slice(0, 100);
    if (digitos.length < 3) return [];
    const { data, error } = await supabase.from('pessoas').select('id, nome, cpf')
      .eq('ativo', true).or('papel.is.null,papel.eq.ALUNO')
      .like('cpf', `${digitos}%`).order('nome', { ascending: true }).limit(20);
    if (error) throw serviceError('Não foi possível buscar alunos pelo CPF', error);
    return ((data ?? []) as PessoaParticipante[]).map((pessoa) => toPessoaOpcao(pessoa, 'ALUNO'));
  },
};
