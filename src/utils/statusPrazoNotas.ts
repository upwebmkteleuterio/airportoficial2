import { Turma } from '../types';

interface PrazoStatusResult {
  prazoText: string;
  prazoColor: string;
  trColor: string;
}

export function getStatusPrazoNotas(turma: Turma): PrazoStatusResult {
  let prazoText = '-';
  let prazoColor = 'text-gray-400';
  let trColor = '';

  if (turma.nota_lancada) {
    if (turma.data_lancamento_notas && turma.data_lancada_real) {
      const lancada = new Date(turma.data_lancada_real + 'T00:00:00');
      const limite = new Date(turma.data_lancamento_notas + 'T00:00:00');
      const diffTime = lancada.getTime() - limite.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 0) {
        prazoText = `Lançada ${diffDays}d atrasado`;
        prazoColor = 'text-red-500';
      } else {
        prazoText = 'Nota Lançada';
        prazoColor = 'text-emerald-500';
      }
    } else {
      prazoText = 'Nota Lançada';
      prazoColor = 'text-emerald-500';
    }
  } else {
    if (turma.data_lancamento_notas) {
      const hoje = new Date();
      hoje.setHours(0,0,0,0);
      const limite = new Date(turma.data_lancamento_notas + 'T00:00:00');
      const diffTime = limite.getTime() - hoje.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays < 0) {
        prazoText = `Atrasado ${Math.abs(diffDays)} dias`;
        prazoColor = 'text-red-600 font-bold';
        trColor = 'bg-red-100/50 dark:bg-red-900/20'; // slightly red background
      } else {
        prazoText = `Faltam ${diffDays} dias`;
        prazoColor = 'text-amber-500';
        if (diffDays <= 7) {
          trColor = 'bg-orange-100/50 dark:bg-orange-900/20'; // slightly orange background
        }
      }
    }
  }

  return { prazoText, prazoColor, trColor };
}
