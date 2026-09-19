import { X } from "lucide-react";
import {
    CLASS_DEADLINE_ALERT_LABELS,
    ClassDeadlineAlertType,
} from "../../utils/classDeadlineAlerts";

interface ClassDeadlineAlertTagsProps {
    counts: Record<ClassDeadlineAlertType, number>;
    activeAlert: ClassDeadlineAlertType | null;
    onSelect: (alert: ClassDeadlineAlertType) => void;
    onClear: () => void;
}

const tagStyles: Record<ClassDeadlineAlertType, string> = {
    atrasadas: "border-red-700 bg-red-600 text-white hover:bg-red-700",
    "vence-em-1-dia": "border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800",
    "prazo-curto": "border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 hover:text-orange-800",
};

const activeTagStyles: Record<ClassDeadlineAlertType, string> = {
    atrasadas: "border-red-900 bg-red-800",
    "vence-em-1-dia": "border-red-300 bg-red-100 text-red-900",
    "prazo-curto": "border-orange-300 bg-orange-100 text-orange-900",
};

export function ClassDeadlineAlertTags({ counts, activeAlert, onSelect, onClear }: ClassDeadlineAlertTagsProps) {
    const availableAlerts = (Object.keys(CLASS_DEADLINE_ALERT_LABELS) as ClassDeadlineAlertType[])
        .filter((alert) => counts[alert] > 0);

    if (availableAlerts.length === 0) return null;

    return (
        <div className="flex flex-wrap items-center gap-2" aria-label="Alertas de prazo das turmas">
            {availableAlerts.map((alert) => {
                const isActive = activeAlert === alert;
                return (
                    <button
                        key={alert}
                        type="button"
                        onClick={() => onSelect(alert)}
                        aria-pressed={isActive}
                        aria-label={`${CLASS_DEADLINE_ALERT_LABELS[alert]}: ${counts[alert]} turma${counts[alert] === 1 ? "" : "s"}`}
                        className={`rounded-full border px-2.5 py-1 text-[10px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${isActive ? activeTagStyles[alert] : tagStyles[alert]} ${isActive ? "ring-2 ring-teal-500 ring-offset-1 dark:ring-offset-slate-950" : ""}`}
                    >
                        {CLASS_DEADLINE_ALERT_LABELS[alert]} ({counts[alert]})
                    </button>
                );
            })}
            {activeAlert && (
                <button
                    type="button"
                    onClick={onClear}
                    aria-label="Limpar filtro de alerta de prazo"
                    title="Limpar filtro de alerta"
                    className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white p-1.5 text-slate-500 transition-colors hover:bg-gray-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                    <X className="h-4 w-4" aria-hidden="true" />
                </button>
            )}
        </div>
    );
}
