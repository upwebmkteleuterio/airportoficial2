import { Bell } from "lucide-react";
import { Modal } from "../ui/Modal";
import { Turma } from "../../types";
import { getDaysUntilClassDeadline } from "../../utils/classDeadlineAlerts";

interface ClassDeadlineAlertModalProps {
    isOpen: boolean;
    classes: Turma[];
    onClose: () => void;
}

export function ClassDeadlineAlertModal({ isOpen, classes, onClose }: ClassDeadlineAlertModalProps) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} ariaLabelledBy="class-deadline-alert-title">
            <div className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
                <div className="flex flex-col items-center border-b border-slate-100 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-950">
                    <div className="relative mb-4 flex h-20 w-20 items-center justify-center">
                        <div className="absolute inset-0 animate-ping rounded-full bg-orange-400 opacity-30" />
                        <div
                            className="absolute inset-2 animate-ping rounded-full bg-orange-300 opacity-40"
                            style={{ animationDelay: "0.2s" }}
                        />
                        <div className="relative flex items-center justify-center rounded-full border border-orange-100 bg-white p-4 text-orange-500 shadow-md dark:border-orange-900 dark:bg-slate-900">
                            <Bell size={32} className="animate-pulse" aria-hidden="true" />
                        </div>
                    </div>
                    <h2 id="class-deadline-alert-title" className="text-center text-xl font-bold text-slate-800 dark:text-white">
                        Atenção aos Prazos!
                    </h2>
                    <p className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">
                        Existem turmas com o prazo de lançamento de notas próximo do fim ou já atrasado.
                    </p>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    <ul className="space-y-2">
                        {classes.map((turma) => {
                            const daysUntilDeadline = getDaysUntilClassDeadline(turma);
                            if (daysUntilDeadline === null) return null;

                            return (
                                <li
                                    key={turma.id}
                                    className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-3 transition-all hover:border-slate-200 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900"
                                >
                                    <div className="flex items-center gap-3">
                                        <div
                                            className={`h-2 w-2 rounded-full ${daysUntilDeadline <= 0 ? "bg-red-600" : daysUntilDeadline === 1 ? "bg-red-400" : "bg-orange-400"}`}
                                            aria-hidden="true"
                                        />
                                        <span className="font-semibold text-slate-700 dark:text-slate-200">
                                            T-OP-{turma.id_interno_escola}
                                        </span>
                                    </div>
                                    <span
                                        className={`rounded-md px-2.5 py-1.5 text-xs font-bold ${daysUntilDeadline <= 0 ? "bg-red-50 text-red-700" : daysUntilDeadline === 1 ? "bg-red-50 text-red-600" : "bg-orange-50 text-orange-700"}`}
                                    >
                                        {daysUntilDeadline <= 0
                                            ? "Atrasado"
                                            : daysUntilDeadline === 1
                                                ? "Falta 1 dia"
                                                : `Faltam ${daysUntilDeadline} dias`}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                </div>

                <div className="border-t border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Ciente, ir para o painel"
                        className="w-full cursor-pointer rounded-lg bg-[#1A1C2C] px-4 py-2.5 font-medium text-white shadow-sm transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:bg-teal-600 dark:hover:bg-teal-500"
                    >
                        Ciente, ir para o painel
                    </button>
                </div>
            </div>
        </Modal>
    );
}
