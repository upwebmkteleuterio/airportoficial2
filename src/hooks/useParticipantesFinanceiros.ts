import { useQuery } from '@tanstack/react-query';
import { fornecedorService } from '../services/fornecedorService';
import { participanteService } from '../services/participanteService';
import { FINANCEIRO_OPTIONS_LIMIT } from '../services/financeiroOptions';

export function useParticipantesFinanceiros() {
  const fornecedoresQuery = useQuery({ queryKey: ['fornecedores'], queryFn: fornecedorService.getOptions });
  const instrutoresQuery = useQuery({ queryKey: ['participantes-financeiros', 'instrutores'], queryFn: participanteService.getInstrutorOptions });
  const empresasQuery = useQuery({ queryKey: ['participantes-financeiros', 'empresas'], queryFn: participanteService.getEmpresaOptions });

  return {
    fornecedores: fornecedoresQuery.data?.data ?? [],
    instrutores: instrutoresQuery.data?.data ?? [],
    empresas: empresasQuery.data?.data ?? [],
    optionsTruncated: (fornecedoresQuery.data?.total ?? 0) > FINANCEIRO_OPTIONS_LIMIT
      || (instrutoresQuery.data?.total ?? 0) > FINANCEIRO_OPTIONS_LIMIT
      || (empresasQuery.data?.total ?? 0) > FINANCEIRO_OPTIONS_LIMIT,
    isLoading: fornecedoresQuery.isLoading || instrutoresQuery.isLoading || empresasQuery.isLoading,
  };
}

export function useAlunosPorCpf(termo: string) {
  const digitos = termo.replace(/\D/g, '');
  const alunosQuery = useQuery({
    queryKey: ['alunos-por-cpf', digitos],
    queryFn: () => participanteService.buscarAlunosPorCpf(termo),
    enabled: digitos.length >= 3,
  });

  return { alunos: alunosQuery.data ?? [], isLoading: alunosQuery.isLoading };
}
