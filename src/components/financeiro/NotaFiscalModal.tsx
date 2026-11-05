import { FileText, Info, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { SlidePanel } from '../ui/SlidePanel';

interface NotaFiscalModalProps {
  isOpen: boolean;
  onClose: () => void;
  subtitulo: string;
  linhas: { rotulo: string; valor: string }[];
}

export function NotaFiscalModal({ isOpen, onClose, subtitulo, linhas }: NotaFiscalModalProps) {
  return (
    <SlidePanel isOpen={isOpen} onClose={onClose} ariaLabelledBy="nota-fiscal-title">
      <div className="flex h-full min-h-0 flex-col bg-white shadow-xl dark:bg-slate-900">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-gray-50 px-6 py-5 dark:border-slate-800 dark:bg-slate-850">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-teal-100 bg-teal-50 dark:border-teal-900/20 dark:bg-teal-950/30"><FileText className="h-5 w-5 text-teal-600" aria-hidden="true" /></div>
            <div><h2 id="nota-fiscal-title" className="font-display text-lg font-bold leading-tight text-slate-900 dark:text-white">Emitir nota fiscal</h2><p className="mt-0.5 text-[11px] text-gray-500 dark:text-slate-400">{subtitulo}</p></div>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="rounded-full p-1 text-gray-500 hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:text-slate-400 dark:hover:text-red-400"><X className="h-5 w-5" aria-hidden="true" /></button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto custom-scrollbar">
          <div className="flex-1 space-y-5 p-6">
            <dl className="space-y-4">
              {linhas.map((linha, index) => <div key={`${linha.rotulo}-${index}`}><dt className="mb-1 block text-xs font-bold uppercase text-gray-700 dark:text-slate-300">{linha.rotulo}</dt><dd className="text-sm font-semibold text-slate-800 dark:text-slate-200">{linha.valor}</dd></div>)}
            </dl>
            <p className="flex items-start gap-2 rounded-xl border border-teal-100 bg-teal-50/60 p-3 text-xs text-teal-800 dark:border-teal-900/40 dark:bg-teal-950/20 dark:text-teal-200"><Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true"/>A integração com a API de nota fiscal ainda não está configurada. Quando estiver, a emissão usará os dados acima e trará o número, a chave de acesso e o PDF da nota.</p>
          </div>
          <div className="sticky bottom-0 flex shrink-0 justify-end border-t border-gray-200 bg-white px-6 py-4 shadow-md dark:border-slate-800 dark:bg-slate-900"><Button variant="secondary" type="button" onClick={onClose}>Fechar</Button></div>
        </div>
      </div>
    </SlidePanel>
  );
}
