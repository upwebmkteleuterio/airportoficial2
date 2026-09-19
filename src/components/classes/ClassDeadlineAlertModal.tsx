import { Bell } from "lucide-react";
import { Modal } from "../ui/Modal";
import { Turma } from "../../types";
import {
    formatClassDeadline,
    getDaysUntilClassDeadline,
} from "../../utils/classDeadlineAlerts";

interface ClassDeadlineAlertModalProps {
    isOpen: boolean;
    classes: Turma[];
    onClose: () => void;
}

export function ClassDeadlineAlertModal({ isOpen, classes, onClose }: ClassDeadlineAlertModalProps) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} ariaLabelledBy="class-deadline-alert-title">
            <div className="max-h-[min(80vh,34rem)] overflow-y-auto rounded-xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-col items-center border-b border-gray-100 pb-5 text-center dark:border-slate-800">
                    <div className="relative mb-3 flex h-16 w-16 items-center justify-center">
                        <div className="absolute inset-0 animate-ping rounded-full bg-orange-400 opacity-30" />
                        <div className="absolute inset-2 animate-ping rounded-full bg-orange-300 opacity-40" />
                        <div className="relative flex items-center justify-center rounded-full border border-orange-100 bg-white p-3 text-orange-500 shadow-md dark:bg-slate-950">
                            <Bell className="h-7 w-7 animate-pulse" aria-hidden="true" />
                        </div>
                    </div>
                    <h2 id="class-deadline-alert-title" className="font-bold text-base text-slate-900 dark:text-white">
                        Atenção aos Prazos!
                    </h2>
                    <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-slate-400">
                        Existem turmas com o prazo de lançamento de notas próximo do fim ou já atrasado.
                    </p>
                </div>
                <ul className="mt-5 divide-y divide-gray-200 rounded-lg border border-gray-200 dark:divide-slate-800 dark:border-slate-800">
                    {classes.map((turma) => {
                        const daysUntilDeadline = getDaysUntilClassDeadline(turma);
                        if (daysUntilDeadline === null) return null;

                        return (
                            <li key={turma.id} className="flex items-center justify-between gap-4 px-3 py-2.5 text-xs">
                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                    ID interno: T-OP-{turma.id_interno_escola}
                                </span>
                                <span className={daysUntilDeadline <= 0 ? "font-bold text-red-700 dark:text-red-400" : "font-semibold text-orange-700 dark:text-orange-400"}>
                                    {formatClassDeadline(daysUntilDeadline)}
                                </span>
                            </li>
                        );
                    })}
                </ul>
                <div className="mt-5 flex justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:bg-teal-600 dark:text-slate-950 dark:hover:bg-teal-500"
                    >
                        Ciente, ir para o painel
                    </button>
                </div>
            </div>
        </Modal>
    );
}
