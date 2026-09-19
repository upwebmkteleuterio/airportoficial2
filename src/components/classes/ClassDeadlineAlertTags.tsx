import { AlertCircle, AlertTriangle, Clock, X, type LucideIcon } from "lucide-react";
import { ClassDeadlineAlertType } from "../../utils/classDeadlineAlerts";

interface ClassDeadlineAlertTagsProps {
    counts: Record<ClassDeadlineAlertType, number>;
    activeAlert: ClassDeadlineAlertType | null;
    onSelect: (alert: ClassDeadlineAlertType) => void;
    onClear: () => void;
}

const tagIcons: Record<ClassDeadlineAlertType, LucideIcon> = {
    atrasadas: AlertCircle,
    "vence-em-1-dia": AlertTriangle,
    "prazo-curto": Clock,
};

const tagLabels: Record<ClassDeadlineAlertType, string> = {
    atrasadas: "Atrasadas",
    "vence-em-1-dia": "Vence em 1 dia",
    "prazo-curto": "Prazo Curto",
};

const tagStyles: Record<ClassDeadlineAlertType, string> = {
    atrasadas: "bg-red-600 text-white border-red-700 hover:bg-red-700 hover:shadow-sm",
    "vence-em-1-dia": "bg-red-50 text-red-700 border-red-200 hover:bg-red-100 hover:text-red-800 hover:border-red-300",
    "prazo-curto": "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100 hover:text-orange-800 hover:border-orange-300",
};

const activeTagStyles: Record<ClassDeadlineAlertType, string> = {
    atrasadas: "bg-red-800 text-white border-red-900 ring-2 ring-red-300 ring-offset-1 shadow-sm",
    "vence-em-1-dia": "bg-red-100 text-red-900 border-red-300 ring-2 ring-red-200 ring-offset-1 shadow-sm",
    "prazo-curto": "bg-orange-100 text-orange-900 border-orange-300 ring-2 ring-orange-200 ring-offset-1 shadow-sm",
};

export function ClassDeadlineAlertTags({ counts, activeAlert, onSelect, onClear }: ClassDeadlineAlertTagsProps) {
    const availableAlerts = (Object.keys(tagLabels) as ClassDeadlineAlertType[])
        .filter((alert) => counts[alert] > 0);

    if (availableAlerts.length === 0) return null;

    return (
        <div
            className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 px-4 py-2 dark:border-slate-800 dark:bg-slate-900/70"
            aria-label="Alertas de prazo das turmas"
        >
            <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-300">
                Alertas:
            </span>
            {availableAlerts.map((alert) => {
                const isActive = activeAlert === alert;
                const AlertIcon = tagIcons[alert];

                return (
                    <button
                        key={alert}
                        type="button"
                        onClick={() => onSelect(alert)}
                        aria-pressed={isActive}
                        aria-label={`${tagLabels[alert]}: ${counts[alert]} turma${counts[alert] === 1 ? "" : "s"}`}
                        title={`Filtrar turmas: ${tagLabels[alert]}`}
                        className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${isActive ? activeTagStyles[alert] : tagStyles[alert]}`}
                    >
                        <AlertIcon size={16} aria-hidden="true" />
                        <span>{counts[alert]} {tagLabels[alert]}</span>
                    </button>
                );
            })}
            {activeAlert && (
                <button
                    type="button"
                    onClick={onClear}
                    aria-label="Limpar filtro de alerta de prazo"
                    title="Limpar filtros"
                    className="ml-2 rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                >
                    <X size={16} aria-hidden="true" />
                </button>
            )}
        </div>
    );
}
