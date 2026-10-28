import { useQuery } from '@tanstack/react-query';
import { fornecedorService } from '../services/fornecedorService';
import { participanteService } from '../services/participanteService';

export function useParticipantesFinanceiros() {
  const fornecedoresQuery = useQuery({ queryKey: ['fornecedores'], queryFn: fornecedorService.getAll });
  const instrutoresQuery = useQuery({ queryKey: ['participantes-financeiros', 'instrutores'], queryFn: participanteService.getInstrutores });
  const empresasQuery = useQuery({ queryKey: ['participantes-financeiros', 'empresas'], queryFn: participanteService.getEmpresas });

  return {
    fornecedores: fornecedoresQuery.data ?? [],
    instrutores: instrutoresQuery.data ?? [],
    empresas: empresasQuery.data ?? [],
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
