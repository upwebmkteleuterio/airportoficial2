import { Turma } from "../types";

export type ClassDeadlineAlertType = "atrasadas" | "vence-em-1-dia" | "prazo-curto";

export interface ClassDeadlineAlert {
    type: ClassDeadlineAlertType;
    daysUntilDeadline: number;
}

export function getDaysUntilClassDeadline(turma: Turma, today = new Date()): number | null {
    if (!turma.data_lancamento_notas) return null;

    const currentDay = new Date(today);
    currentDay.setHours(0, 0, 0, 0);
    const deadline = new Date(`${turma.data_lancamento_notas}T00:00:00`);
    const diffTime = deadline.getTime() - currentDay.getTime();

    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function classifyClassDeadlineAlert(turma: Turma, today = new Date()): ClassDeadlineAlert | null {
    if (turma.nota_lancada) return null;

    const daysUntilDeadline = getDaysUntilClassDeadline(turma, today);
    if (daysUntilDeadline === null) return null;

    if (daysUntilDeadline <= 0) {
        return { type: "atrasadas", daysUntilDeadline };
    }

    if (daysUntilDeadline === 1) {
        return { type: "vence-em-1-dia", daysUntilDeadline };
    }

    if (daysUntilDeadline <= 5) {
        return { type: "prazo-curto", daysUntilDeadline };
    }

    return null;
}

export function isClassDeadlineAlertWithinFiveDays(turma: Turma, today = new Date()): boolean {
    if (turma.nota_lancada) return false;

    const daysUntilDeadline = getDaysUntilClassDeadline(turma, today);
    return daysUntilDeadline !== null && daysUntilDeadline <= 5;
}

export function formatClassDeadline(daysUntilDeadline: number): string {
    if (daysUntilDeadline <= 0) {
        const daysLate = Math.abs(daysUntilDeadline);
        return daysLate === 0 ? "Atrasado hoje" : `Atrasado há ${daysLate} ${daysLate === 1 ? "dia" : "dias"}`;
    }

    return `Vence em ${daysUntilDeadline} ${daysUntilDeadline === 1 ? "dia" : "dias"}`;
}

export const CLASS_DEADLINE_ALERT_LABELS: Record<ClassDeadlineAlertType, string> = {
    atrasadas: "Atrasadas",
    "vence-em-1-dia": "Vence em 1 dia",
    "prazo-curto": "Prazo curto",
};
