import { ClipboardCheck, Clock, Info } from 'lucide-react';

const passos = [
  'Comparar o extrato do banco com os lançamentos registrados no sistema.',
  'Apontar o que está previsto, o que já foi efetivado e o que atrasou.',
  'Conferir as datas de recebimento e de pagamento de cada movimento.',
];

export default function FinanceiroConciliacao() {
  return (
    <div className="flex-1 flex flex-col p-6 gap-6 overflow-y-auto">
      <div>
        <h2 className="font-display text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white leading-tight">Conciliação</h2>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Compare o extrato da conta bancária com os lançamentos registrados no sistema.</p>
      </div>

      <section
        aria-labelledby="conciliacao-em-breve-title"
        data-testid="conciliacao-em-breve"
        className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-teal-100 bg-teal-50 dark:border-teal-900/20 dark:bg-teal-950/30">
            <ClipboardCheck className="h-5 w-5 text-teal-600" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 id="conciliacao-em-breve-title" className="font-display text-lg font-bold text-slate-900 dark:text-white">Em breve</h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
                <Clock className="h-3 w-3" aria-hidden="true" />
                Em construção
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
              Esta tela está reservada para a conciliação bancária e ainda não tem funções. Quando o recurso for liberado, você vai conseguir:
            </p>
            <ul className="mt-3 space-y-2">
              {passos.map((passo) => (
                <li key={passo} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" aria-hidden="true" />
                  <span>{passo}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-gray-500 dark:text-slate-400">
              Nenhum lançamento é alterado por esta tela enquanto ela estiver em construção.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
