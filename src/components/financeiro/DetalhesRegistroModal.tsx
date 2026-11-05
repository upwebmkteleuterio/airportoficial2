import { Eye, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { SlidePanel as Modal } from '../ui/SlidePanel';

interface DetalhesRegistroModalProps {
  isOpen: boolean;
  onClose: () => void;
  titulo: string;
  subtitulo: string;
  grupos: { titulo?: string; linhas: { rotulo: string; valor: string }[] }[];
}

export function DetalhesRegistroModal({ isOpen, onClose, titulo, subtitulo, grupos }: DetalhesRegistroModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} ariaLabelledBy="detalhes-registro-title">
      <div className="flex h-full min-h-0 flex-col bg-white shadow-xl dark:bg-slate-900">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-gray-50 px-6 py-5 dark:border-slate-800 dark:bg-slate-850">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-teal-100 bg-teal-50 dark:border-teal-900/20 dark:bg-teal-950/30"><Eye className="h-5 w-5 text-teal-600" aria-hidden="true" /></div>
            <div><h2 id="detalhes-registro-title" className="font-display text-lg font-bold leading-tight text-slate-900 dark:text-white">{titulo}</h2><p className="mt-0.5 text-[11px] text-gray-500 dark:text-slate-400">{subtitulo}</p></div>
          </div>
          <div className="flex items-center gap-3"><span className="rounded bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase text-gray-500 dark:bg-slate-800">Somente leitura</span><button type="button" onClick={onClose} aria-label="Fechar" className="rounded-full p-1 text-gray-500 hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:text-slate-400 dark:hover:text-red-400"><X className="h-5 w-5" aria-hidden="true" /></button></div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto custom-scrollbar">
          <div className="flex-1 space-y-5 p-6">
            {grupos.map((grupo, grupoIndex) => <section key={`${grupo.titulo ?? 'detalhes'}-${grupoIndex}`} className="space-y-3">
              {grupo.titulo && <h3 className="text-xs font-bold uppercase text-gray-700 dark:text-slate-300">{grupo.titulo}</h3>}
              <dl className="space-y-4">{grupo.linhas.map((linha, index) => <div key={`${linha.rotulo}-${index}`}><dt className="mb-1 block text-xs font-bold uppercase text-gray-500">{linha.rotulo}</dt><dd className="break-words text-sm font-semibold text-slate-800 dark:text-slate-200">{linha.valor}</dd></div>)}</dl>
            </section>)}
          </div>
          <div className="sticky bottom-0 flex shrink-0 justify-end border-t border-gray-200 bg-white px-6 py-4 shadow-md dark:border-slate-800 dark:bg-slate-900"><Button variant="secondary" type="button" onClick={onClose}>Fechar</Button></div>
        </div>
      </div>
    </Modal>
  );
}
