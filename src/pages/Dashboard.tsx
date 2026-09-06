/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
// Selection & Actions
// Slide Panel Form state
// Draft and close confirmation state for new class forms.
// Storage may be unavailable in private browsing contexts.
// The form remains usable when browser storage is unavailable.
// The form remains usable when browser storage is unavailable.
// Column Visibility Config
// Generate CSV content
// Accessibility: Focus Trap inside Slide Panel
// Submit/Create Class logic
// Find course or default to first
// Clear Form & Close Panel
// Open class detail view
/* Top Title Section */
/* Filter and utilities box */
/* Column and export utilities */
/* High-Density Data Grid */
/* Paginação do Grid */
/* --- SLIDE PANEL (Modal Lateral Deslizante - Image 3) --- */
/* Panel Header */
/* Panel Body (Scrollable Form) */
/* ID ANAC e ID Interno */
/* Curso e Turno */
/* Horário de aulas preenchido pelo período */
/* Endereço */
/* Data Início / Data Término */
/* Data Lançamento de Notas */
/* Horários de Prova 1ª/2ª Chamada */
/* Instrutores * (Visual representation) */
/* Coordenação */
/* Toggle: Vigilante Sem Deslocamento */
/* Anotações (Textarea) */
/* Panel Footer (Actions) */
/* Draft resume and close confirmation overlays */
/* Delete Confirmation Modal */
import React, { useState, useMemo, useEffect, useRef } from "react";

import {
    Plus,
    Columns,
    Download,
    X,
    ChevronLeft,
    ChevronRight,
    Calendar,
    AlertCircle,
    Edit,
    Trash2,
    MoreVertical,
    Search,
    Filter,
    HelpCircle,
    Info,
} from "lucide-react";

import { useClasses } from "../hooks/useClasses";
import { useUsers } from "../hooks/useUsers";
import { useCourses } from "../hooks/useCourses";
import { shiftService } from "../services/shifts";
import { useAddresses } from "../hooks/useAddresses";
import { useUIStore } from "../store/uiStore";
import { ClassStatusPrazo, InstructorFuncao, Turma } from "../types";
import { getStatusPrazoNotas } from "../utils/statusPrazoNotas";
import { Modal } from "../components/ui/Modal";
import { HelpModal } from "../components/ui/HelpModal";
import { SlidePanel } from "../components/ui/SlidePanel";

type ClassDraft = {
    formIdAnac: string;
    formIdInterno: string;
    formTurno: string;
    formHorarioInicio: string;
    formHorarioTermino: string;
    formHora1: string;
    formHora2: string;
    formHorarioAulas: string;
    formEndereco: string;
    formCurso: string;
    formDataInicio: string;
    formDataTermino: string;
    formDataLancamentoNotas: string;
    formDataProva1: string;
    formDataProva2: string;
    selectedInstructors: string[];
    instructorInput: string;
    formIoad: string;
    formIscr: string;
    formIcar: string;
    formAplicador: string;
    formVigilante: boolean;
    formNotes: string;
};

const CLASS_DRAFT_STORAGE_KEY = "class-registration-draft-v1";

const getClassDraft = (): ClassDraft | null => {
    if (typeof window === "undefined")
        return null;

    try {
        const parsed = JSON.parse(window.localStorage.getItem(CLASS_DRAFT_STORAGE_KEY) || "null");

        if (!parsed || typeof parsed !== "object")
            return null;

        return {
            formIdAnac: typeof parsed.formIdAnac === "string" ? parsed.formIdAnac : "",
            formIdInterno: typeof parsed.formIdInterno === "string" ? parsed.formIdInterno : "",
            formTurno: typeof parsed.formTurno === "string" ? parsed.formTurno : "",
            formHorarioInicio: typeof parsed.formHorarioInicio === "string" ? parsed.formHorarioInicio : "",
            formHorarioTermino: typeof parsed.formHorarioTermino === "string" ? parsed.formHorarioTermino : "",
            formHora1: typeof parsed.formHora1 === "string" ? parsed.formHora1 : "",
            formHora2: typeof parsed.formHora2 === "string" ? parsed.formHora2 : "",
            formHorarioAulas: typeof parsed.formHorarioAulas === "string" ? parsed.formHorarioAulas : "",
            formEndereco: typeof parsed.formEndereco === "string" ? parsed.formEndereco : "",
            formCurso: typeof parsed.formCurso === "string" ? parsed.formCurso : "",
            formDataInicio: typeof parsed.formDataInicio === "string" ? parsed.formDataInicio : "",
            formDataTermino: typeof parsed.formDataTermino === "string" ? parsed.formDataTermino : "",
            formDataLancamentoNotas: typeof parsed.formDataLancamentoNotas === "string" ? parsed.formDataLancamentoNotas : "",
            formDataProva1: typeof parsed.formDataProva1 === "string" ? parsed.formDataProva1 : "",
            formDataProva2: typeof parsed.formDataProva2 === "string" ? parsed.formDataProva2 : "",
            selectedInstructors: Array.isArray(parsed.selectedInstructors) ? parsed.selectedInstructors.filter((value: unknown): value is string => typeof value === "string") : [],
            instructorInput: typeof parsed.instructorInput === "string" ? parsed.instructorInput : "",
            formIoad: typeof parsed.formIoad === "string" ? parsed.formIoad : "",
            formIscr: typeof parsed.formIscr === "string" ? parsed.formIscr : "",
            formIcar: typeof parsed.formIcar === "string" ? parsed.formIcar : "",
            formAplicador: typeof parsed.formAplicador === "string" ? parsed.formAplicador : "",
            formVigilante: parsed.formVigilante === true,
            formNotes: typeof parsed.formNotes === "string" ? parsed.formNotes : ""
        };
    } catch {
        return null;
    }
};

const hasClassDraftContent = (draft: ClassDraft) => (Object.entries(draft).some(
    ([key, value]) => key === "formVigilante" ? value : Array.isArray(value) ? value.length > 0 : Boolean(value)
));

const normalizeForeignKeyValue = (value?: string | null) => value && value !== "Não aplicável" ? value : "";
const formatShiftTime = (value: string) => value.slice(0, 5);

export function Dashboard() {
    const {
        filters,
        setFilter,
        modals,
        setModalOpen,
        setRoute,
        setSelectedClassId
    } = useUIStore();

    const [currentPage, setCurrentPage] = useState(1);
    const [turmaInstructorsMap, setTurmaInstructorsMap] = useState<Record<string, string[]>>({});
    const itemsPerPage = 6;

    const {
        courses
    } = useCourses();

    const courseIds = filters.classCourseFilter ? courses.filter(
        course => course.nome_curso.toLowerCase().includes(filters.classCourseFilter!.toLowerCase())
    ).map(course => course.id) : undefined;

    const {
        classes,
        total,
        createClass,
        updateClass,
        deleteClass,
        getInstrutoresByTurma,
        saveInstrutoresForTurma,
        isLoading
    } = useClasses({
        page: currentPage,
        pageSize: itemsPerPage,
        search: filters.classSearchTerm,
        courseIds
    });

    const [editingClassId, setEditingClassId] = useState<string | null>(null);
    const [classToDelete, setClassToDelete] = useState<Turma | null>(null);
    const [isHelpOpen, setIsHelpOpen] = useState(false);

    const {
        users
    } = useUsers();

    const instructorUsers = useMemo(() => users.filter(user => user.role === "INSTRUTOR").slice().sort(
        (first, second) => Number(second.status === "ativo") - Number(first.status === "ativo")
    ), [users]);

    const {
        addresses
    } = useAddresses();

    const [activeShifts, setActiveShifts] = useState<{
        id: string;
        nome: string;
        horario_inicio: string;
        horario_termino: string;
        primeira_chamada: string;
        segunda_chamada: string;
        ativo: boolean;
    }[]>([]);

    useEffect(() => {
        shiftService.getAll().then(shifts => {
            setActiveShifts(shifts.filter(s => s.ativo));
        }).catch(console.error);
    }, []);

    const [openMenuId, setOpenMenuId] = useState<string | null>(null);

    useEffect(() => {
        const handleGlobalClick = () => setOpenMenuId(null);

        if (openMenuId) {
            document.addEventListener("click", handleGlobalClick);
        }

        return () => document.removeEventListener("click", handleGlobalClick);
    }, [openMenuId]);

    const [formIdAnac, setFormIdAnac] = useState("");
    const [formIdInterno, setFormIdInterno] = useState("");
    const [formTurno, setFormTurno] = useState("");
    const [formHorarioInicio, setFormHorarioInicio] = useState("");
    const [formHorarioTermino, setFormHorarioTermino] = useState("");
    const [formHorarioAulas, setFormHorarioAulas] = useState("");
    const [formEndereco, setFormEndereco] = useState("");

    const availableAddresses = addresses.filter(
        address => address.ativo !== false || (editingClassId !== null && address.id === formEndereco)
    );

    const [formCurso, setFormCurso] = useState("");
    const [formDataInicio, setFormDataInicio] = useState("");
    const [formDataTermino, setFormDataTermino] = useState("");
    const [formDataLancamentoNotas, setFormDataLancamentoNotas] = useState("");
    const [formHora1, setFormHora1] = useState("");
    const [formHora2, setFormHora2] = useState("");
    const [formDataProva1, setFormDataProva1] = useState("");
    const [formDataProva2, setFormDataProva2] = useState("");
    const [selectedInstructors, setSelectedInstructors] = useState<string[]>([]);
    const [instructorInput, setInstructorInput] = useState("");
    const [formIoad, setFormIoad] = useState("");
    const [formIscr, setFormIscr] = useState("");
    const [formIcar, setFormIcar] = useState("");
    const [formAplicador, setFormAplicador] = useState("");

    const applicatorUsers = useMemo(
        () => users.filter(user => user.status === "ativo" || user.id === formAplicador),
        [users, formAplicador]
    );

    const resolveProfileId = (value: string | null | undefined, candidates: typeof users) => {
        const normalizedValue = normalizeForeignKeyValue(value);

        if (!normalizedValue)
            return "";

        if (candidates.length === 0)
            return normalizedValue;

        return candidates.find(
            user => user.id === normalizedValue || user.nome_completo === normalizedValue
        )?.id || "";
    };

    const [formVigilante, setFormVigilante] = useState(false);
    const [formNotes, setFormNotes] = useState("");
    const [classDraftToResume, setClassDraftToResume] = useState<ClassDraft | null>(null);
    const [showClassDiscardConfirm, setShowClassDiscardConfirm] = useState(false);
    const classDraftOpeningRef = useRef(false);

    const currentClassDraft = useMemo<ClassDraft>(() => ({
        formIdAnac,
        formIdInterno,
        formTurno,
        formHorarioInicio,
        formHorarioTermino,
        formHora1,
        formHora2,
        formHorarioAulas,
        formEndereco,
        formCurso,
        formDataInicio,
        formDataTermino,
        formDataLancamentoNotas,
        formDataProva1,
        formDataProva2,
        selectedInstructors,
        instructorInput,
        formIoad,
        formIscr,
        formIcar,
        formAplicador,
        formVigilante,
        formNotes
    }), [
        formIdAnac,
        formIdInterno,
        formTurno,
        formHorarioInicio,
        formHorarioTermino,
        formHora1,
        formHora2,
        formHorarioAulas,
        formEndereco,
        formCurso,
        formDataInicio,
        formDataTermino,
        formDataLancamentoNotas,
        formDataProva1,
        formDataProva2,
        selectedInstructors,
        instructorInput,
        formIoad,
        formIscr,
        formIcar,
        formAplicador,
        formVigilante,
        formNotes
    ]);

    const isClassFormDirty = useMemo(() => hasClassDraftContent(currentClassDraft), [currentClassDraft]);

    const clearClassDraft = () => {
        try {
            window.localStorage.removeItem(CLASS_DRAFT_STORAGE_KEY);
        } catch {}
    };

    useEffect(() => {
        if (!modals.newClassOpen || editingClassId)
            return;

        classDraftOpeningRef.current = true;
        setShowClassDiscardConfirm(false);
        const storedDraft = getClassDraft();
        setClassDraftToResume(storedDraft && hasClassDraftContent(storedDraft) ? storedDraft : null);
    }, [modals.newClassOpen, editingClassId]);

    useEffect(() => {
        if (!modals.newClassOpen || editingClassId)
            return;

        if (classDraftOpeningRef.current) {
            classDraftOpeningRef.current = false;
            return;
        }

        if (classDraftToResume)
            return;

        if (isClassFormDirty) {
            try {
                window.localStorage.setItem(CLASS_DRAFT_STORAGE_KEY, JSON.stringify(currentClassDraft));
            } catch {}
        } else {
            clearClassDraft();
        }
    }, [
        modals.newClassOpen,
        editingClassId,
        classDraftToResume,
        isClassFormDirty,
        currentClassDraft
    ]);

    const handleToggleNotaLancada = async (e: React.MouseEvent, classId: string, currentStatus: boolean) => {
        e.stopPropagation();

        try {
            const isNowLaunched = !currentStatus;

            const updates: Partial<Turma> = {
                nota_lancada: isNowLaunched
            };

            if (isNowLaunched) {
                updates.data_lancada_real = new Date().toISOString().split("T")[0];
            }

            await updateClass({
                id: classId,
                updates
            });
        } catch (err) {
            console.error(err);
        }
    };

    const handleCloseClassModal = () => {
        if (isClassFormDirty && !editingClassId) {
            setShowClassDiscardConfirm(true);
        } else {
            resetClassForm();
            setClassDraftToResume(null);
            setModalOpen("newClassOpen", false);
        }
    };

    const handleSaveDraftAndExit = () => {
        if (isClassFormDirty) {
            try {
                window.localStorage.setItem(CLASS_DRAFT_STORAGE_KEY, JSON.stringify(currentClassDraft));
            } catch {}
        }

        setShowClassDiscardConfirm(false);
        setClassDraftToResume(null);
        resetClassForm();
        setModalOpen("newClassOpen", false);
    };

    const handleForceCloseClassModal = () => {
        clearClassDraft();
        resetClassForm();
        setClassDraftToResume(null);
        setShowClassDiscardConfirm(false);
        setModalOpen("newClassOpen", false);
    };

    const resetClassForm = () => {
        setFormIdAnac("");
        setFormIdInterno("");
        setFormTurno("");
        setFormHorarioInicio("");
        setFormHorarioTermino("");
        setFormHorarioAulas("");
        setFormEndereco("");
        setFormCurso("");
        setFormDataInicio("");
        setFormDataTermino("");
        setFormDataLancamentoNotas("");
        setFormHora1("");
        setFormHora2("");
        setFormDataProva1("");
        setFormDataProva2("");
        setSelectedInstructors([]);
        setInstructorInput("");
        setFormIoad("");
        setFormIscr("");
        setFormIcar("");
        setFormAplicador("");
        setFormNotes("");
        setFormVigilante(false);
        setEditingClassId(null);
    };

    const continueClassDraft = () => {
        if (!classDraftToResume)
            return;

        const draft = classDraftToResume;
        setFormIdAnac(draft.formIdAnac);
        setFormIdInterno(draft.formIdInterno);
        setFormTurno(draft.formTurno);
        setFormHorarioInicio(draft.formHorarioInicio);
        setFormHorarioTermino(draft.formHorarioTermino);
        setFormHorarioAulas(draft.formHorarioAulas);
        setFormEndereco(draft.formEndereco);
        setFormCurso(draft.formCurso);
        setFormDataInicio(draft.formDataInicio);
        setFormDataTermino(draft.formDataTermino);
        setFormDataLancamentoNotas(draft.formDataLancamentoNotas);
        setFormHora1(draft.formHora1);
        setFormHora2(draft.formHora2);
        setFormDataProva1(draft.formDataProva1);
        setFormDataProva2(draft.formDataProva2);

        setSelectedInstructors(
            draft.selectedInstructors.map(value => resolveProfileId(value, instructorUsers)).filter(Boolean)
        );

        setInstructorInput(draft.instructorInput);
        setFormIoad(resolveProfileId(draft.formIoad, instructorUsers));
        setFormIscr(resolveProfileId(draft.formIscr, instructorUsers));
        setFormIcar(resolveProfileId(draft.formIcar, instructorUsers));
        setFormAplicador(resolveProfileId(draft.formAplicador, users));
        setFormVigilante(draft.formVigilante);
        setFormNotes(draft.formNotes);
        setClassDraftToResume(null);
    };

    const startNewClassRegistration = () => {
        clearClassDraft();
        resetClassForm();
        setClassDraftToResume(null);
    };

    const [visibleColumns, setVisibleColumns] = useState({
        id_anac: true,
        id_interno: true,
        curso: true,
        turno: true,
        horario: true,
        inicio: true,
        termino: true,
        hora1: true,
        hora2: true,
        endereco: true,
        ioad: true,
        iscr: true,
        icar: true,
        aplicador: true,
        instrutores_turma: true,
        vigia: true,
        notas_lancadas_em: true,
        data_prova_1: true,
        data_prova_2: true,
        status_notas: true,
        prazo: true,
        sn: true
    });

    const [showColsDropdown, setShowColsDropdown] = useState(false);

    const columnLabels = {
        id_anac: "ID ANAC",
        id_interno: "ID Interno",
        curso: "Curso",
        turno: "Turno",
        horario: "Horário",
        inicio: "Início",
        termino: "Término",
        hora1: "1ª CH",
        hora2: "2ª CH",
        endereco: "Endereço",
        ioad: "Coord. IOAD",
        iscr: "Coord. ISCR",
        icar: "Coord. ICAR",
        aplicador: "Aplicador",
        instrutores_turma: "Instrutores da Turma",
        vigia: "Vigilante sem deslocamento",
        notas_lancadas_em: "Data de Lançamento",
        data_prova_1: "1ª Prova",
        data_prova_2: "2ª Prova",
        status_notas: "Nota Lançada?",
        prazo: "Prazo",
        sn: "S/N"
    };

    const handleExportCSV = () => {
        const headers = [
            "ID ANAC",
            "ID Interno",
            "Curso",
            "Turno",
            "Horário",
            "Data Início",
            "Data Término",
            "Endereço",
            "Nota Lançada",
            "Prazo",
            "S/N"
        ];

        const rows = filteredClasses.map(item => {
            const course = courses.find(c => c.id === item.curso_id);

            return [
                item.id_anac,
                `T-OP-${item.id_interno_escola}`,
                course?.nome_curso || "Curso de Aviação",
                item.turno,
                item.horario_aulas,
                item.data_inicio,
                item.data_termino,
                item.endereco_realizacao,
                item.nota_lancada ? "Sim" : "Não",
                getStatusPrazoNotas(item).prazoText,
                item.status_operacional_sn ? "S" : "N"
            ];
        });

        const csvContent = "﻿" + [headers.join(";"), ...rows.map(e => e.join(";"))].join("\n");

        const blob = new Blob([csvContent], {
            type: "text/csv;charset=utf-8;"
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", "relatorio_turmas.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    React.useEffect(() => {
        if (!modals.newClassOpen)
            return;

        const panelElement = document.getElementById("side-panel-new-class");

        if (!panelElement)
            return;

        const previousActiveElement = document.activeElement as HTMLElement;
        const focusableSelectors = "button, [href], input, select, textarea, [tabindex]:not([tabindex=\"-1\"])";
        const focusableElements = panelElement.querySelectorAll(focusableSelectors);
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (firstElement)
            firstElement.focus();

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key !== "Tab")
                return;

            if (e.shiftKey) {
                if (document.activeElement === firstElement) {
                    lastElement.focus();
                    e.preventDefault();
                }
            } else {
                if (document.activeElement === lastElement) {
                    firstElement.focus();
                    e.preventDefault();
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);

            if (previousActiveElement) {
                previousActiveElement.focus();
            }
        };
    }, [modals.newClassOpen]);

    const filteredClasses = classes;
    const paginatedClasses = classes;
    const totalPages = Math.ceil(total / itemsPerPage) || 1;

    useEffect(() => {
        setCurrentPage(1);
    }, [filters.classSearchTerm, filters.classCourseFilter]);

    const handleRemoveInstructor = (instructorId: string) => {
        setSelectedInstructors(selectedInstructors.filter(id => id !== instructorId));
    };

    const getInstructorName = (instructorId: string) => instructorUsers.find(instructor => instructor.id === instructorId)?.nome_completo || users.find(user => user.id === instructorId)?.nome_completo || instructorId;
    const getUserName = (userId?: string | null) => users.find(user => user.id === userId)?.nome_completo || userId || "Não aplicável";
    const getCoordinatorNames = (turma: Turma) => ({
        ioad: getInstructorName(turma.coordenador_ioad_id || ""),
        iscr: getInstructorName(turma.coordenador_iscr_id || ""),
        icar: getInstructorName(turma.coordenador_icar_id || ""),
        aplicador: getUserName(turma.aplicador_id),
    });

    // Debug: carrega os vínculos reais de turma_instrutores para a coluna "Instrutores da Turma".
    // O mapa guarda apenas os IDs; os nomes são resolvidos no render para evitar
    // dependências instáveis (getInstructorName muda a cada render e causava loop).
    useEffect(() => {
        if (!classes.length) return;
        let cancelled = false;
        const load = async () => {
            console.debug("[turmas] buscando instrutores vinculados no banco", { turmas: classes.length });
            const pairs = await Promise.all(classes.map(async (turma) => {
                try {
                    const relations = await getInstrutoresByTurma(turma.id);
                    console.debug("[turmas] instrutores encontrados", {
                        turmaId: turma.id,
                        idAnac: turma.id_anac,
                        qtd: relations.length,
                        instrutores: relations.map(relation => relation.instrutor_id)
                    });
                    return [turma.id, relations.map(relation => relation.instrutor_id)] as const;
                } catch (error) {
                    console.warn("[turmas] falha ao carregar instrutores da turma", { turmaId: turma.id, error });
                    return [turma.id, []] as const;
                }
            }));
            if (!cancelled) {
                setTurmaInstructorsMap(Object.fromEntries(pairs));
            }
        };
        void load();
        return () => { cancelled = true; };
    }, [classes, getInstrutoresByTurma]);

    const handleSaveClass = async () => {
        if (!formCurso || !formDataInicio || !formDataTermino || !formIdAnac || !formIdInterno || !formEndereco || !formTurno || !formHorarioInicio || !formHorarioTermino) {
            alert("Por favor, preencha todos os campos obrigatórios (*)");
            return;
        }

        try {
            const selectedCourse = courses.find(c => c.id === formCurso) || courses[0];
            const horarioAulas = `${formHorarioInicio} - ${formHorarioTermino}`;
            const selectedAddress = addresses.find(a => a.id === formEndereco);
            const addressName = selectedAddress ? `${selectedAddress.logradouro} - ${selectedAddress.cidade}/${selectedAddress.estado}` : formEndereco;
            let savedClassId = editingClassId;

            if (editingClassId) {
                await updateClass({
                    id: editingClassId,

                    updates: {
                        id_anac: formIdAnac,
                        id_interno_escola: parseInt(formIdInterno, 10),
                        turno: formTurno as any,
                        horario_aulas: horarioAulas,
                        endereco_realizacao: addressName,
                        endereco_id: formEndereco,
                        curso_id: selectedCourse.id,
                        data_inicio: formDataInicio,
                        data_termino: formDataTermino,
                        data_lancamento_notas: formDataLancamentoNotas,
                        horario_prova_1_chamada: formHora1 || "Sem prova",
                        horario_prova_2_chamada: formHora2 || "Sem prova",
                        data_prova_1_chamada: formDataProva1,
                        data_prova_2_chamada: formDataProva2,
                        vigilante_sem_deslocamento: formVigilante,
                        anotacoes_turma: formNotes,
                        coordenador_ioad_id: normalizeForeignKeyValue(formIoad) || undefined,
                        coordenador_iscr_id: normalizeForeignKeyValue(formIscr) || undefined,
                        coordenador_icar_id: normalizeForeignKeyValue(formIcar) || undefined,
                        aplicador_id: normalizeForeignKeyValue(formAplicador) || undefined
                    }
                });
            } else {
                const createdClass = await createClass({
                    id_anac: formIdAnac,
                    curso_id: selectedCourse.id,
                    turno: formTurno as any,
                    horario_aulas: horarioAulas,
                    data_inicio: formDataInicio,
                    data_termino: formDataTermino,
                    data_lancamento_notas: formDataLancamentoNotas,
                    endereco_realizacao: addressName,
                    endereco_id: formEndereco,
                    cidade: selectedAddress?.cidade || "São Paulo",
                    uf: selectedAddress?.estado || "SP",
                    horario_prova_1_chamada: formHora1 || "Sem prova",
                    horario_prova_2_chamada: formHora2 || "Sem prova",
                    data_prova_1_chamada: formDataProva1,
                    data_prova_2_chamada: formDataProva2,
                    vigilante_sem_deslocamento: formVigilante,
                    anotacoes_turma: formNotes,
                    coordenador_ioad_id: normalizeForeignKeyValue(formIoad) || undefined,
                    coordenador_iscr_id: normalizeForeignKeyValue(formIscr) || undefined,
                    coordenador_icar_id: normalizeForeignKeyValue(formIcar) || undefined,
                    aplicador_id: normalizeForeignKeyValue(formAplicador) || undefined,
                    gestor_turma_id: "user-admin-1",
                    nota_lancada: false,
                    dias_para_vencimento: 5,
                    status_operacional_sn: true
                });

                savedClassId = createdClass.id;
            }

            if (savedClassId) {
                const instructorsToSave = selectedInstructors.map(
                    instructorId => instructorUsers.find(instructor => instructor.id === instructorId)?.id
                ).filter((instructorId): instructorId is string => Boolean(instructorId));

                await saveInstrutoresForTurma({
                    turmaId: savedClassId,

                    instrutores: instructorsToSave.map(instrutorId => ({
                        instrutor_id: instrutorId,
                        funcao: InstructorFuncao.INSTRUTOR_TUTOR
                    }))
                });
            }

            clearClassDraft();
            resetClassForm();
            setClassDraftToResume(null);
            setShowClassDiscardConfirm(false);
            setModalOpen("newClassOpen", false);
        } catch (err) {
            console.error(err);
        }
    };

    const handleViewClass = (id: string) => {
        setSelectedClassId(id);
        setRoute("class-details");
    };

    return (
        <div
            id="dashboard-page"
            className="flex-1 flex flex-col p-6 gap-6 overflow-y-auto">
            {}
            <div
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
                <div>
                    <h2
                        className="font-display text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white leading-tight">Gestão de Turmas
                                  </h2>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Acompanhamento e controle de classes ativas e agendadas.
                                  </p>
                </div>
                <div className="flex items-center justify-end gap-2">
                    <button
                        type="button"
                        onClick={() => setIsHelpOpen(true)}
                        aria-label="Ajuda sobre gestão de turmas"
                        title="Ajuda sobre gestão de turmas"
                        className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                        <HelpCircle className="h-4 w-4" aria-hidden="true" />
                        Ajuda
                    </button>
                    <button
                        id="btn-new-class"
                        type="button"
                        onClick={() => {
                            resetClassForm();
                            setModalOpen("newClassOpen", true);
                        }}
                        className="px-4 py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer bg-slate-900 dark:bg-teal-600 hover:bg-slate-850 dark:hover:bg-teal-500 text-white"
                    >
                        <Plus className="w-4 h-4" />
                        Nova Turma
                    </button>
                </div>
            </div>
            {}
            <div
                className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-850 rounded-xl border border-gray-200 dark:border-slate-800 shrink-0">
                <div className="flex flex-col lg:flex-row lg:items-center gap-3 min-w-0">
                    <div
                        className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-750 px-3 py-1.5 rounded-lg font-bold text-xs text-slate-800 dark:text-white shadow-sm shrink-0">
                        <Filter className="w-3.5 h-3.5 text-gray-500" />
                        <span>Filtros</span>
                    </div>
                    <div className="relative w-full lg:w-80 xl:w-96">
                        <Search
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 w-4 h-4" />
                        <input
                            id="top-search-input"
                            type="text"
                            value={filters.classSearchTerm}
                            onChange={e => setFilter("classSearchTerm", e.target.value)}
                            placeholder="Buscar por ID, Curso ou Instrutor..."
                            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 rounded-lg border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white font-sans text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-sm" />
                    </div>
                    <div
                        className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-lg border border-gray-200 dark:border-slate-800 shadow-sm overflow-x-auto">
                        <span
                            className="text-[10px] font-bold text-gray-400 dark:text-slate-500 pl-2 pr-1 uppercase tracking-wider">FILTRAR:</span>
                        {["AT OP", "AEDRO", "AÉREO", "RX11", "RX5", "B5"].map(filterName => (<button
                            id={`quick-filter-${filterName}`}
                            key={filterName}
                            onClick={() => setFilter(
                                "classCourseFilter",
                                filters.classCourseFilter === filterName ? null : filterName
                            )}
                            className={`px-3 py-1.5 rounded text-[10px] font-bold tracking-wider uppercase transition-all cursor-pointer whitespace-nowrap ${filters.classCourseFilter === filterName ? "bg-teal-500 text-slate-900" : "text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800"}`}>
                            {filterName}
                        </button>))}
                    </div>
                </div>
                {}
                <div className="flex items-center gap-2 relative shrink-0">
                    <div className="relative">
                        <button
                            id="btn-cols-view"
                            onClick={() => setShowColsDropdown(!showColsDropdown)}
                            className={`p-2 border rounded-lg transition-colors cursor-pointer ${showColsDropdown ? "border-teal-500 bg-teal-500/10 text-teal-600 dark:text-teal-400" : "border-gray-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-800"}`}
                            title="Alternar Colunas">
                            <Columns className="w-4 h-4" />
                        </button>
                        {showColsDropdown && (<>
                            <div className="fixed inset-0 z-10" onClick={() => setShowColsDropdown(false)} />
                            <div
                                className="absolute right-0 mt-2 w-56 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-3 shadow-xl z-20 font-sans space-y-2 animate-fade-in text-slate-850 dark:text-slate-200">
                                <div
                                    className="flex justify-between items-center pb-1.5 border-b border-gray-150 dark:border-slate-800">
                                    <span
                                        className="text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Visualizar Colunas</span>
                                    <button
                                        onClick={() => {
                                            setVisibleColumns({
                                                id_anac: true,
                                                id_interno: true,
                                                curso: true,
                                                turno: true,
                                                horario: true,
                                                inicio: true,
                                                termino: true,
                                                hora1: true,
                                                hora2: true,
                                                endereco: true,
                                                ioad: true,
                                                iscr: true,
                                                icar: true,
                                                aplicador: true,
                                                instrutores_turma: true,
                                                vigia: true,
                                                notas_lancadas_em: true,
                                                data_prova_1: true,
                                                data_prova_2: true,
                                                status_notas: true,
                                                prazo: true,
                                                sn: true
                                            });
                                        }}
                                        className="text-[10px] text-teal-600 dark:text-teal-400 font-bold hover:underline">Resetar
                                                            </button>
                                </div>
                                <div className="max-h-60 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                                    {Object.entries(columnLabels).map(([key, label]) => (<label
                                        key={key}
                                        className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-50 dark:hover:bg-slate-900 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={visibleColumns[key as keyof typeof visibleColumns]}
                                            onChange={e => {
                                                setVisibleColumns(prev => ({
                                                    ...prev,
                                                    [key]: e.target.checked
                                                }));
                                            }}
                                            className="rounded text-teal-600 focus:ring-teal-500 border-gray-300 dark:border-slate-700 w-3.5 h-3.5" />
                                        <span>{label}</span>
                                    </label>))}
                                </div>
                            </div>
                        </>)}
                    </div>
                    <button
                        id="btn-export-excel"
                        onClick={handleExportCSV}
                        className="p-2 border border-gray-300 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 text-gray-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Exportar Excel/CSV">
                        <Download className="w-4 h-4" />
                    </button>
                </div>
            </div>
            {}
            <div
                className="flex-1 border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm flex flex-col min-h-[350px]">
                <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
                    <table className="w-full text-left border-collapse whitespace-nowrap text-xs">
                        <thead
                            className="sticky top-0 bg-slate-50 dark:bg-slate-850 z-10 border-b border-gray-200 dark:border-slate-800 font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                            <tr>
                                <th
                                    className="px-4 py-3 w-10 text-center border-r border-gray-200/50 dark:border-slate-800/50"></th>
                                {visibleColumns.id_anac && <th
                                    className="px-4 py-3 border-r border-gray-200/50 dark:border-slate-800/50">ID ANAC</th>}
                                {visibleColumns.id_interno && <th
                                    className="px-4 py-3 border-r border-gray-200/50 dark:border-slate-800/50">ID Interno</th>}
                                {visibleColumns.curso && <th
                                    className="px-4 py-3 border-r border-gray-200/50 dark:border-slate-800/50">Curso</th>}
                                {visibleColumns.turno && <th
                                    className="px-4 py-3 border-r border-gray-200/50 dark:border-slate-800/50">Turno</th>}
                                {visibleColumns.horario && <th
                                    className="px-4 py-3 border-r border-gray-200/50 dark:border-slate-800/50">Horário</th>}
                                {visibleColumns.inicio && <th
                                    className="px-4 py-3 border-r border-gray-200/50 dark:border-slate-800/50">Início</th>}
                                {visibleColumns.termino && <th
                                    className="px-4 py-3 border-r border-gray-200/50 dark:border-slate-800/50">Término</th>}
                                {visibleColumns.hora1 && <th
                                    className="px-4 py-3 border-r border-gray-200/50 dark:border-slate-800/50">1ª CH</th>}
                                {visibleColumns.hora2 && <th
                                    className="px-4 py-3 border-r border-gray-200/50 dark:border-slate-800/50">2ª CH</th>}
                                {visibleColumns.endereco && <th
                                    className="px-4 py-3 border-r border-gray-200/50 dark:border-slate-800/50">Endereço</th>}
                                {visibleColumns.ioad && <th
                                    className="px-4 py-3 border-r border-gray-200/50 dark:border-slate-800/50">Coord. IOAD</th>}
                                {visibleColumns.iscr && <th
                                    className="px-4 py-3 border-r border-gray-200/50 dark:border-slate-800/50">Coord. ISCR</th>}
                                {visibleColumns.icar && <th
                                    className="px-4 py-3 border-r border-gray-200/50 dark:border-slate-800/50">Coord. ICAR</th>}
                                {visibleColumns.aplicador && <th
                                    className="px-4 py-3 border-r border-gray-200/50 dark:border-slate-800/50">Aplicador</th>}
                                {visibleColumns.instrutores_turma && <th
                                    className="px-4 py-3 border-r border-gray-200/50 dark:border-slate-800/50">Instrutores da Turma</th>}
                                {visibleColumns.vigia && <th
                                    className="px-4 py-3 border-r border-gray-200/50 dark:border-slate-800/50">Vigilante</th>}
                                {visibleColumns.notas_lancadas_em && <th
                                    className="px-4 py-3 border-r border-gray-200/50 dark:border-slate-800/50">Lançamento</th>}
                                {visibleColumns.data_prova_1 && <th
                                    className="px-4 py-3 border-r border-gray-200/50 dark:border-slate-800/50">1ª Prova</th>}
                                {visibleColumns.data_prova_2 && <th
                                    className="px-4 py-3 border-r border-gray-200/50 dark:border-slate-800/50">2ª Prova</th>}
                                {visibleColumns.status_notas && <th
                                    className="px-4 py-3 border-r border-gray-200/50 dark:border-slate-800/50 text-center">Nota Lançada?</th>}
                                {visibleColumns.prazo && <th
                                    className="px-4 py-3 border-r border-gray-200/50 dark:border-slate-800/50 text-right">Prazo</th>}
                                {visibleColumns.sn && <th
                                    className="px-4 py-3 border-r border-gray-200/50 dark:border-slate-800/50 text-center">S/N</th>}
                            </tr>
                        </thead>
                        <tbody
                            className="divide-y divide-gray-150 dark:divide-slate-800 text-gray-700 dark:text-slate-200 font-mono">
                            {isLoading ? (<tr>
                                <td
                                    colSpan={Object.values(visibleColumns).filter(Boolean).length + 1}
                                    className="px-4 py-8 text-center">
                                    <div className="flex flex-col items-center justify-center gap-2 text-gray-500">
                                        <div
                                            className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                                        <p className="font-sans text-sm">Buscando informações do servidor...</p>
                                    </div>
                                </td>
                            </tr>) : paginatedClasses.length === 0 ? (<tr>
                                <td
                                    colSpan={Object.values(visibleColumns).filter(Boolean).length + 1}
                                    className="px-4 py-12 text-center text-gray-500 font-sans">
                                    <div
                                        className="flex flex-col items-center justify-center gap-2.5 max-w-sm mx-auto">
                                        <div className="p-3 bg-amber-500/10 rounded-full text-amber-500">
                                            <AlertCircle className="w-6 h-6 animate-pulse" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-xs text-slate-850 dark:text-slate-200">Nenhuma turma localizada</p>
                                            <p className="text-[10px] text-gray-400 mt-0.5 leading-normal">Não encontramos turmas que correspondam aos filtros de busca ou curso aplicados atualmente.
                                                                        </p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setFilter("classSearchTerm", "");
                                                setFilter("classCourseFilter", null);
                                            }}
                                            className="mt-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-[10px] font-bold rounded-lg text-slate-700 dark:text-slate-200 transition-colors cursor-pointer">Limpar Filtros de Busca
                                                                  </button>
                                    </div>
                                </td>
                            </tr>) : (paginatedClasses.map(item => {
                                const course = courses.find(c => c.id === item.curso_id);

                                const {
                                    prazoText,
                                    prazoColor,
                                    trColor
                                } = getStatusPrazoNotas(item);

                                return (
                                    <tr
                                        key={item.id}
                                        onClick={() => handleViewClass(item.id)}
                                        className={`hover:bg-slate-50 dark:hover:bg-slate-850/50 transition-colors h-[38px] group cursor-pointer even:bg-slate-50/30 dark:even:bg-slate-900/30 ${trColor}`}>
                                        <td
                                            className="px-4 py-2 text-center border-r border-gray-200/30 dark:border-slate-800/30 relative"
                                            onClick={e => e.stopPropagation()}>
                                            <div className="flex items-center justify-center">
                                                <div className="relative">
                                                    <button
                                                        onClick={e => {
                                                            e.stopPropagation();
                                                            setOpenMenuId(openMenuId === item.id ? null : item.id);
                                                        }}
                                                        className="p-1 text-gray-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
                                                        <MoreVertical className="w-4 h-4" />
                                                    </button>
                                                    {openMenuId === item.id && (<div
                                                        className="absolute left-full top-0 ml-2 w-32 bg-white dark:bg-slate-850 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 py-1 z-50">
                                                        <button
                                                            onClick={async e => {
                                                                e.stopPropagation();
                                                                setOpenMenuId(null);
                                                                const shift = activeShifts.find(candidate => candidate.nome === item.turno);
                                                                const horarioMatch = (item.horario_aulas || "").match(/(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/);
                                                                setEditingClassId(item.id);
                                                                setFormIdAnac(item.id_anac);
                                                                setFormIdInterno(item.id_interno_escola.toString());
                                                                setFormTurno(item.turno as string);
                                                                setFormHorarioInicio(shift ? formatShiftTime(shift.horario_inicio) : horarioMatch?.[1] || "");
                                                                setFormHorarioTermino(shift ? formatShiftTime(shift.horario_termino) : horarioMatch?.[2] || "");
                                                                setFormHorarioAulas(item.horario_aulas || "");
                                                                setFormEndereco(item.endereco_id || item.endereco_realizacao || "");
                                                                setFormCurso(item.curso_id);
                                                                setFormDataInicio(item.data_inicio);
                                                                setFormDataTermino(item.data_termino);
                                                                setFormDataLancamentoNotas(item.data_lancamento_notas || "");

                                                                setFormHora1(
                                                                    item.horario_prova_1_chamada !== "Sem prova" ? formatShiftTime(item.horario_prova_1_chamada) : ""
                                                                );

                                                                setFormHora2(
                                                                    item.horario_prova_2_chamada !== "Sem prova" ? formatShiftTime(item.horario_prova_2_chamada) : ""
                                                                );

                                                                setFormDataProva1(item.data_prova_1_chamada || "");
                                                                setFormDataProva2(item.data_prova_2_chamada || "");
                                                                setSelectedInstructors([]);
                                                                setInstructorInput("");
                                                                setFormIoad(resolveProfileId(item.coordenador_ioad_id, instructorUsers));
                                                                setFormIscr(resolveProfileId(item.coordenador_iscr_id, instructorUsers));
                                                                setFormIcar(resolveProfileId(item.coordenador_icar_id, instructorUsers));
                                                                setFormAplicador(resolveProfileId(item.aplicador_id, users));
                                                                setFormNotes(item.anotacoes_turma || "");
                                                                setFormVigilante(item.vigilante_sem_deslocamento);

                                                                try {
                                                                    const relations = await getInstrutoresByTurma(item.id);
                                                                    setSelectedInstructors(relations.map(relation => relation.instrutor_id));
                                                                } catch (error) {
                                                                    console.error("Não foi possível carregar os instrutores da turma", error);
                                                                    return;
                                                                }

                                                                setModalOpen("newClassOpen", true);
                                                            }}
                                                            className="w-full text-left px-4 py-2 text-xs font-semibold text-teal-600 dark:text-teal-400 hover:bg-gray-50 dark:hover:bg-slate-800 flex items-center gap-2">
                                                            <Edit className="w-4 h-4" />Editar
                                                                                            </button>
                                                        <button
                                                            onClick={e => {
                                                                e.stopPropagation();
                                                                setOpenMenuId(null);
                                                                setClassToDelete(item);
                                                            }}
                                                            className="w-full text-left px-4 py-2 text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2">
                                                            <Trash2 className="w-4 h-4" />Excluir
                                                                                            </button>
                                                    </div>)}
                                                </div>
                                            </div>
                                        </td>
                                        {visibleColumns.id_anac && (<td
                                            className={`px-4 py-2 border-r border-gray-200/30 dark:border-slate-800/30 font-semibold ${item.status_prazo_notas === ClassStatusPrazo.ATRASADO ? "text-red-500 dark:text-red-400" : "text-slate-900 dark:text-white"}`}>
                                            {item.id_anac}
                                        </td>)}
                                        {visibleColumns.id_interno && (<td
                                            className="px-4 py-2 border-r border-gray-200/30 dark:border-slate-800/30 text-gray-500 dark:text-slate-400">T-OP-{item.id_interno_escola}
                                        </td>)}
                                        {visibleColumns.curso && (<td
                                            className="px-4 py-2 border-r border-gray-200/30 dark:border-slate-800/30 font-sans max-w-xs truncate">
                                            {course?.nome_curso || "Curso de Aviação"}
                                        </td>)}
                                        {visibleColumns.turno && (<td
                                            className="px-4 py-2 border-r border-gray-200/30 dark:border-slate-800/30 font-sans">{item.turno}</td>)}
                                        {visibleColumns.horario && (<td
                                            className="px-4 py-2 border-r border-gray-200/30 dark:border-slate-800/30">{item.horario_aulas}</td>)}
                                        {visibleColumns.inicio && (<td
                                            className="px-4 py-2 border-r border-gray-200/30 dark:border-slate-800/30">
                                            {new Date(item.data_inicio + "T00:00:00").toLocaleDateString("pt-BR")}
                                        </td>)}
                                        {visibleColumns.termino && (<td
                                            className="px-4 py-2 border-r border-gray-200/30 dark:border-slate-800/30">
                                            {new Date(item.data_termino + "T00:00:00").toLocaleDateString("pt-BR")}
                                        </td>)}
                                        {visibleColumns.hora1 && (<td
                                            className="px-4 py-2 border-r border-gray-200/30 dark:border-slate-800/30">
                                            {item.data_prova_1_chamada ? new Date(item.data_prova_1_chamada + "T00:00:00").toLocaleDateString("pt-BR") : ""} {item.horario_prova_1_chamada !== "Sem prova" ? item.horario_prova_1_chamada : "Sem prova"}
                                        </td>)}
                                        {visibleColumns.hora2 && (<td
                                            className="px-4 py-2 border-r border-gray-200/30 dark:border-slate-800/30">
                                            {item.data_prova_2_chamada ? new Date(item.data_prova_2_chamada + "T00:00:00").toLocaleDateString("pt-BR") : ""} {item.horario_prova_2_chamada !== "Sem prova" ? item.horario_prova_2_chamada : "Sem prova"}
                                        </td>)}
                                        {visibleColumns.endereco && (<td
                                            className="px-4 py-2 border-r border-gray-200/30 dark:border-slate-800/30 font-sans max-w-xs truncate">
                                            {item.endereco_realizacao}
                                        </td>)}
                                        {visibleColumns.ioad && (<td
                                            className="px-4 py-2 border-r border-gray-200/30 dark:border-slate-800/30 font-sans">
                                            {getInstructorName(item.coordenador_ioad_id || '')}
                                        </td>)}
                                        {visibleColumns.iscr && (<td
                                            className="px-4 py-2 border-r border-gray-200/30 dark:border-slate-800/30 font-sans">
                                            {getInstructorName(item.coordenador_iscr_id || '')}
                                        </td>)}
                                        {visibleColumns.icar && (<td
                                            className="px-4 py-2 border-r border-gray-200/30 dark:border-slate-800/30 font-sans">
                                            {getInstructorName(item.coordenador_icar_id || '')}
                                        </td>)}
                                        {visibleColumns.aplicador && (<td
                                            className="px-4 py-2 border-r border-gray-200/30 dark:border-slate-800/30 font-sans">
                                            {getUserName(item.aplicador_id)}
                                        </td>)}
                                        {visibleColumns.instrutores_turma && (<td
                                            className="px-4 py-2 border-r border-gray-200/30 dark:border-slate-800/30 font-sans max-w-xs truncate"
                                            title={(turmaInstructorsMap[item.id] ?? []).map(getInstructorName).join(', ')}>
                                            {(turmaInstructorsMap[item.id] ?? []).length > 0
                                              ? (turmaInstructorsMap[item.id] ?? []).map(getInstructorName).join(', ')
                                              : '—'}
                                        </td>)}
                                        {visibleColumns.vigia && (<td
                                            className="px-4 py-2 border-r border-gray-200/30 dark:border-slate-800/30 font-sans">
                                            {item.vigilante_sem_deslocamento ? 'Sim' : 'Não'}
                                        </td>)}
                                        {visibleColumns.notas_lancadas_em && (<td
                                            className="px-4 py-2 border-r border-gray-200/30 dark:border-slate-800/30 font-sans">
                                            {item.data_lancamento_notas ? new Date(item.data_lancamento_notas + "T00:00:00").toLocaleDateString("pt-BR") : '—'}
                                        </td>)}
                                        {visibleColumns.data_prova_1 && (<td
                                            className="px-4 py-2 border-r border-gray-200/30 dark:border-slate-800/30 font-sans">
                                            {item.data_prova_1_chamada ? new Date(item.data_prova_1_chamada + "T00:00:00").toLocaleDateString("pt-BR") : '—'}
                                        </td>)}
                                        {visibleColumns.data_prova_2 && (<td
                                            className="px-4 py-2 border-r border-gray-200/30 dark:border-slate-800/30 font-sans">
                                            {item.data_prova_2_chamada ? new Date(item.data_prova_2_chamada + "T00:00:00").toLocaleDateString("pt-BR") : '—'}
                                        </td>)}
                                        {visibleColumns.status_notas && (<td
                                            className="px-4 py-2 border-r border-gray-200/30 dark:border-slate-800/30 font-sans text-center"
                                            onClick={e => e.stopPropagation()}>
                                            <div className="flex items-center justify-center gap-2">
                                                <span
                                                    className={`text-xs font-semibold ${!item.nota_lancada ? "text-gray-800 dark:text-gray-200" : "text-gray-400"}`}>Não</span>
                                                <button
                                                    onClick={e => handleToggleNotaLancada(e, item.id, !!item.nota_lancada)}
                                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${item.nota_lancada ? "bg-teal-500" : "bg-gray-300 dark:bg-slate-600"}`}>
                                                    <span
                                                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${item.nota_lancada ? "translate-x-4.5" : "translate-x-1"}`} />
                                                </button>
                                                <span
                                                    className={`text-xs font-semibold ${item.nota_lancada ? "text-teal-600 dark:text-teal-400" : "text-gray-400"}`}>Sim</span>
                                            </div>
                                        </td>)}
                                        {visibleColumns.prazo && (<td
                                            className={`px-4 py-2 border-r border-gray-200/30 dark:border-slate-800/30 text-right font-bold ${prazoColor}`}>
                                            {prazoText}
                                        </td>)}
                                        {visibleColumns.sn && (<td
                                            className="px-4 py-2 text-center border-r border-gray-200/30 dark:border-slate-800/30"
                                            onClick={e => e.stopPropagation()}>
                                            <span
                                                onClick={() => handleViewClass(item.id)}
                                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${item.status_operacional_sn ? "bg-teal-100 text-teal-800 dark:bg-teal-950/40 dark:text-teal-400" : "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300"}`}>
                                                {item.status_operacional_sn ? "S" : "N"}
                                            </span>
                                        </td>)}
                                    </tr>
                                );
                            }))}
                        </tbody>
                    </table>
                </div>
                {}
                <div className="px-5 py-4 border-t border-gray-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 font-sans text-xs bg-slate-50 dark:bg-slate-850">
                    <span className="text-gray-500 dark:text-slate-400 font-medium">
                        {total === 0
                            ? 'Exibindo 0 de 0 turmas'
                            : `Exibindo ${(currentPage - 1) * itemsPerPage + 1}-${Math.min(currentPage * itemsPerPage, total)} de ${total} turmas`}
                    </span>

                    <div className="flex items-center border border-gray-300 dark:border-slate-750 rounded-lg bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
                        <button
                            id="pagination-prev"
                            type="button"
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                            className="p-2 hover:bg-gray-50 dark:hover:bg-slate-850 text-gray-500 dark:text-slate-400 border-r border-gray-300 dark:border-slate-750 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label="Página anterior"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        {Array.from({ length: totalPages }).map((_, index) => (
                            <button
                                id={`pagination-page-${index + 1}`}
                                type="button"
                                key={index}
                                onClick={() => setCurrentPage(index + 1)}
                                className={`px-3 py-2 font-bold border-r border-gray-300 dark:border-slate-750 transition-colors cursor-pointer ${currentPage === index + 1 ? 'bg-[#005f5f]/10 dark:bg-teal-950/30 text-[#005f5f] dark:text-teal-400' : 'text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-850'}`}
                            >
                                {index + 1}
                            </button>
                        ))}
                        <button
                            id="pagination-next"
                            type="button"
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                            className="p-2 hover:bg-gray-50 dark:hover:bg-slate-850 text-gray-500 dark:text-slate-400 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label="Próxima página"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
            {}
            <SlidePanel isOpen={modals.newClassOpen} onClose={handleCloseClassModal}>
                {}
                <div
                    className="px-6 py-5 border-b border-gray-200 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-850 shrink-0">
                    <h3
                        className="font-display text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        {editingClassId ? "Edição de Turma" : "Inclusão de Turma"}
                    </h3>
                    <button
                        id="btn-close-side-panel"
                        onClick={handleCloseClassModal}
                        className="text-gray-500 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400 transition-colors p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 focus:outline-none">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                {}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                    <form onSubmit={e => e.preventDefault()} className="space-y-6 font-sans">
                        {}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label
                                    className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wide">ID ANAC *
                                                    </label>
                                <input
                                    id="form-id-anac"
                                    type="text"
                                    placeholder="ANC-2023-..."
                                    value={formIdAnac}
                                    onChange={e => setFormIdAnac(e.target.value)}
                                    className="w-full border border-gray-300 dark:border-slate-700 rounded px-3 py-2 bg-white dark:bg-slate-850 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 font-mono" />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label
                                    className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wide">ID Interno *
                                                    </label>
                                <input
                                    id="form-id-interno"
                                    type="number"
                                    placeholder="Somente números"
                                    value={formIdInterno}
                                    onChange={e => setFormIdInterno(e.target.value)}
                                    className="w-full border border-gray-300 dark:border-slate-700 rounded px-3 py-2 bg-white dark:bg-slate-850 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 font-mono" />
                            </div>
                        </div>
                        {}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label
                                    className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wide">Curso *
                                                    </label>
                                <div className="relative">
                                    <select
                                        id="form-curso-select"
                                        value={formCurso}
                                        onChange={e => setFormCurso(e.target.value)}
                                        className="w-full appearance-none border border-gray-300 dark:border-slate-700 rounded px-3 py-2.5 bg-white dark:bg-slate-850 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500">
                                        <option value="" disabled>Selecione um curso</option>
                                        {courses.map(c => (<option key={c.id} value={c.id}>{c.nome_curso}</option>))}
                                    </select>
                                    <div
                                        className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-slate-400">▼</div>
                                </div>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label
                                    className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wide">Período (Turno) *
                                                    </label>
                                <div className="relative">
                                    <select
                                        id="form-turno-select"
                                        value={formTurno}
                                        onChange={e => {
                                            const val = e.target.value;
                                            setFormTurno(val);
                                            const shift = activeShifts.find(candidate => candidate.nome === val);

                                            if (!shift)
                                                return;

                                            const horarioInicio = formatShiftTime(shift.horario_inicio);
                                            const horarioTermino = formatShiftTime(shift.horario_termino);
                                            setFormHorarioInicio(horarioInicio);
                                            setFormHorarioTermino(horarioTermino);
                                            setFormHorarioAulas(`${horarioInicio} - ${horarioTermino}`);

                                            setFormHora1(
                                                shift.primeira_chamada !== "Sem prova" ? formatShiftTime(shift.primeira_chamada) : ""
                                            );

                                            setFormHora2(
                                                shift.segunda_chamada !== "Sem prova" ? formatShiftTime(shift.segunda_chamada) : ""
                                            );
                                        }}
                                        className="w-full appearance-none border border-gray-300 dark:border-slate-700 rounded px-3 py-2.5 bg-white dark:bg-slate-850 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500">
                                        <option value="" disabled>Selecione um período</option>
                                        {activeShifts.map(shift => (<option key={shift.id} value={shift.nome}>{shift.nome}</option>))}
                                    </select>
                                    <div
                                        className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-slate-400">▼</div>
                                </div>
                            </div>
                        </div>
                        {}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label
                                    className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wide">Horário de início *</label>
                                <input
                                    id="form-time-start"
                                    type="time"
                                    value={formHorarioInicio}
                                    onChange={e => {
                                        setFormHorarioInicio(e.target.value);
                                        setFormHorarioAulas(`${e.target.value} - ${formHorarioTermino}`);
                                    }}
                                    className="w-full border border-gray-300 dark:border-slate-700 rounded px-3 py-2 bg-white dark:bg-slate-850 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 font-mono" />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label
                                    className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wide">Horário de término *</label>
                                <input
                                    id="form-time-end"
                                    type="time"
                                    value={formHorarioTermino}
                                    onChange={e => {
                                        setFormHorarioTermino(e.target.value);
                                        setFormHorarioAulas(`${formHorarioInicio} - ${e.target.value}`);
                                    }}
                                    className="w-full border border-gray-300 dark:border-slate-700 rounded px-3 py-2 bg-white dark:bg-slate-850 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 font-mono" />
                            </div>
                        </div>
                        {}
                        <div className="flex flex-col gap-1.5">
                            <label
                                className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wide">Endereço *
                                              </label>
                            <div className="relative">
                                <select
                                    id="form-endereco-select"
                                    value={formEndereco}
                                    onChange={e => setFormEndereco(e.target.value)}
                                    className="w-full appearance-none border border-gray-300 dark:border-slate-700 rounded px-3 py-2.5 bg-white dark:bg-slate-850 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500">
                                    <option value="" disabled>Selecione um endereço</option>
                                    {availableAddresses.map(a => (<option key={a.id} value={a.id}>
                                        {a.logradouro}- {a.cidade}/{a.estado}{a.ativo === false ? " (Inativo)" : ""}
                                    </option>))}
                                </select>
                                <div
                                    className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-slate-400">▼
                                                    </div>
                            </div>
                        </div>
                        {}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label
                                    className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wide">Data Início *
                                                    </label>
                                <input
                                    id="form-date-start"
                                    type="date"
                                    value={formDataInicio}
                                    onChange={e => setFormDataInicio(e.target.value)}
                                    className="w-full border border-gray-300 dark:border-slate-700 rounded px-3 py-2 bg-white dark:bg-slate-850 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 font-mono" />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label
                                    className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wide">Data Término *
                                                    </label>
                                <input
                                    id="form-date-end"
                                    type="date"
                                    value={formDataTermino}
                                    onChange={e => setFormDataTermino(e.target.value)}
                                    className="w-full border border-gray-300 dark:border-slate-700 rounded px-3 py-2 bg-white dark:bg-slate-850 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 font-mono" />
                            </div>
                        </div>
                        {}
                        <div className="flex flex-col gap-1.5">
                            <label
                                className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wide">Data de lançamento
                                              </label>
                            <p className="text-[10px] text-gray-500 dark:text-slate-400 mb-1">Data para lançamento das notas no site oficial.
                                              </p>
                            <input
                                type="date"
                                value={formDataLancamentoNotas}
                                onChange={e => setFormDataLancamentoNotas(e.target.value)}
                                required
                                className="w-full border border-gray-300 dark:border-slate-700 rounded px-3 py-2 bg-white dark:bg-slate-850 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 font-mono" />
                        </div>
                        {}
                        <div
                            className="p-4 border border-gray-200 dark:border-slate-800 rounded-xl bg-gray-50 dark:bg-slate-850/40 space-y-4">
                            <h4
                                className="text-xs font-bold text-slate-800 dark:text-teal-400 flex items-center gap-2 uppercase tracking-wider">
                                <Calendar className="w-4 h-4 text-teal-600 dark:text-teal-400" />Horários de Avaliação
                                              </h4>
                            <div className="grid grid-cols-2 gap-4 font-mono">
                                <div className="flex flex-col gap-1.5">
                                    <label
                                        className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Data 1ª Chamada
                                                          </label>
                                    <input
                                        type="date"
                                        value={formDataProva1}
                                        onChange={e => setFormDataProva1(e.target.value)}
                                        className="w-full border border-gray-300 dark:border-slate-700 rounded px-3 py-2 bg-white dark:bg-slate-850 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 mb-2" />
                                    <label
                                        className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Horário 1ª Chamada
                                                          </label>
                                    <input
                                        id="form-time-1"
                                        type="time"
                                        value={formHora1}
                                        onChange={e => setFormHora1(e.target.value)}
                                        className="w-full border border-gray-300 dark:border-slate-700 rounded px-3 py-2 bg-white dark:bg-slate-850 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-teal-500" />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label
                                        className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Data 2ª Chamada
                                                          </label>
                                    <input
                                        type="date"
                                        value={formDataProva2}
                                        onChange={e => setFormDataProva2(e.target.value)}
                                        className="w-full border border-gray-300 dark:border-slate-700 rounded px-3 py-2 bg-white dark:bg-slate-850 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 mb-2" />
                                    <label
                                        className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Horário 2ª Chamada
                                                          </label>
                                    <input
                                        id="form-time-2"
                                        type="time"
                                        value={formHora2}
                                        onChange={e => setFormHora2(e.target.value)}
                                        className="w-full border border-gray-300 dark:border-slate-700 rounded px-3 py-2 bg-white dark:bg-slate-850 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-teal-500" />
                                </div>
                            </div>
                        </div>
                        {}
                        <div className="flex flex-col gap-1.5">
                            <label
                                className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wide">Instrutores *
                                              </label>
                            <div
                                className="border border-gray-300 dark:border-slate-700 rounded p-2 bg-white dark:bg-slate-850 min-h-[44px] flex flex-wrap gap-2 items-center focus-within:border-teal-500 focus-within:ring-1 focus-within:ring-teal-500 transition-all">
                                {selectedInstructors.map(instructorId => (<span
                                    key={instructorId}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-medium rounded border border-gray-250 dark:border-slate-700">
                                    {getInstructorName(instructorId)}
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveInstructor(instructorId)}
                                        className="text-gray-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400">
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </span>))}
                                <select
                                    id="form-instructors-add-select"
                                    value=""
                                    onChange={e => {
                                        const val = e.target.value;

                                        if (val && !selectedInstructors.includes(val)) {
                                            setSelectedInstructors([...selectedInstructors, val]);
                                        }
                                    }}
                                    className="flex-1 min-w-[120px] border-none outline-none bg-transparent text-sm p-1 text-slate-900 dark:text-white">
                                    <option value="" disabled>Selecione um instrutor...</option>
                                    {instructorUsers.map(
                                        instructor => (<option key={instructor.id} value={instructor.id}>{instructor.nome_completo}</option>)
                                    )}
                                </select>
                            </div>
                        </div>
                        {}
                        <div
                            className="space-y-4 pt-2 border-t border-gray-200 dark:border-slate-800 border-dashed">
                            <h4
                                className="text-xs font-bold text-slate-800 dark:text-teal-400 flex items-center gap-2 uppercase tracking-wider">Coordenação
                                              </h4>
                            <div className="space-y-3 font-sans">
                                <div className="flex flex-col gap-1">
                                    <label
                                        className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">IOAD (Instrutor de Operações)
                                                          </label>
                                    <select
                                        id="form-ioad-select"
                                        value={formIoad}
                                        onChange={e => setFormIoad(e.target.value)}
                                        className="w-full border border-gray-300 dark:border-slate-700 rounded px-3 py-2 text-sm bg-white dark:bg-slate-850 text-slate-900 dark:text-white focus:outline-none">
                                        <option value="">Não aplicável</option>
                                        {instructorUsers.map(
                                            instructor => (<option key={instructor.id} value={instructor.id}>{instructor.nome_completo}</option>)
                                        )}
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label
                                        className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">ISCR (Instrutor de Segurança)
                                                          </label>
                                    <select
                                        id="form-iscr-select"
                                        value={formIscr}
                                        onChange={e => setFormIscr(e.target.value)}
                                        className="w-full border border-gray-300 dark:border-slate-700 rounded px-3 py-2 text-sm bg-white dark:bg-slate-850 text-slate-900 dark:text-white focus:outline-none">
                                        <option value="">Não aplicável</option>
                                        {instructorUsers.map(
                                            instructor => (<option key={instructor.id} value={instructor.id}>{instructor.nome_completo}</option>)
                                        )}
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label
                                        className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">ICAR (Instrutor de Cargas)
                                                          </label>
                                    <select
                                        id="form-icar-select"
                                        value={formIcar}
                                        onChange={e => setFormIcar(e.target.value)}
                                        className="w-full border border-gray-300 dark:border-slate-700 rounded px-3 py-2 text-sm bg-white dark:bg-slate-850 text-slate-900 dark:text-white focus:outline-none">
                                        <option value="">Não aplicável</option>
                                        {instructorUsers.map(
                                            instructor => (<option key={instructor.id} value={instructor.id}>{instructor.nome_completo}</option>)
                                        )}
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label
                                        className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Aplicador</label>
                                    <select
                                        id="form-aplicador-select"
                                        value={formAplicador}
                                        onChange={e => setFormAplicador(e.target.value)}
                                        className="w-full border border-gray-300 dark:border-slate-700 rounded px-3 py-2 text-sm bg-white dark:bg-slate-850 text-slate-900 dark:text-white focus:outline-none">
                                        <option value="">Não aplicável</option>
                                        {applicatorUsers.map(
                                            user => (<option key={user.id} value={user.id}>{user.nome_completo}</option>)
                                        )}
                                    </select>
                                </div>
                            </div>
                        </div>
                        {}
                        <div
                            className="flex items-center justify-between p-4 border border-gray-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-850 mt-4">
                            <div className="flex flex-col font-sans">
                                <span className="text-xs font-bold text-slate-950 dark:text-white">Vigilante Sem Deslocamento
                                                    </span>
                                <span className="text-[10px] text-gray-500 dark:text-slate-400 mt-0.5">Aplica-se a turmas in-company ou remotas.
                                                    </span>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    id="form-vigilante-toggle"
                                    type="checkbox"
                                    checked={formVigilante}
                                    onChange={e => setFormVigilante(e.target.checked)}
                                    className="sr-only peer" />
                                <div
                                    className="w-9 h-5 bg-gray-200 dark:bg-slate-750 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-500" />
                            </label>
                        </div>
                        {}
                        <div className="flex flex-col gap-1.5">
                            <label
                                className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wide">Anotações Internas
                                              </label>
                            <textarea
                                id="form-anotacoes-textarea"
                                rows={3}
                                value={formNotes}
                                onChange={e => setFormNotes(e.target.value)}
                                placeholder="Observações sobre a logística da turma..."
                                className="w-full border border-gray-300 dark:border-slate-700 rounded px-3 py-2 text-sm bg-white dark:bg-slate-850 text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 resize-y" />
                        </div>
                    </form>
                </div>
                {}
                <div
                    className="px-6 py-4 border-t border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 flex justify-end gap-3 shadow-md relative">
                    <button
                        id="btn-form-cancel"
                        type="button"
                        onClick={handleCloseClassModal}
                        className="px-4 py-2 border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-300 rounded font-semibold text-xs hover:bg-gray-50 dark:hover:bg-slate-850 transition-colors cursor-pointer">Cancelar
                                  </button>
                    <button
                        id="btn-form-save"
                        type="button"
                        onClick={handleSaveClass}
                        className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-slate-900 font-bold rounded text-xs transition-colors shadow-sm cursor-pointer">Salvar Turma
                                  </button>
                </div>
                {}
                {classDraftToResume && !showClassDiscardConfirm && (<div
                    className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-6 animate-fade-in">
                    <div
                        className="bg-white dark:bg-slate-900 border border-gray-250 dark:border-slate-800 rounded-xl p-5 max-w-sm w-full text-center space-y-4 shadow-2xl font-sans">
                        <div
                            className="mx-auto w-10 h-10 bg-teal-500/10 rounded-full flex items-center justify-center text-teal-600 dark:text-teal-400">
                            <AlertCircle className="w-5 h-5" />
                        </div>
                        <div className="space-y-1">
                            <h4 className="font-bold text-sm text-slate-900 dark:text-white">Rascunho de turma encontrado</h4>
                            <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">Deseja continuar o cadastro salvo no navegador ou iniciar uma nova turma?</p>
                        </div>
                        <div className="flex items-center gap-2.5 justify-center pt-2">
                            <button
                                onClick={continueClassDraft}
                                className="flex-1 py-2 bg-teal-500 hover:bg-teal-600 text-slate-900 rounded text-xs font-semibold transition-colors cursor-pointer">Continuar editando</button>
                            <button
                                onClick={startNewClassRegistration}
                                className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-semibold transition-colors shadow-sm cursor-pointer">Iniciar novo</button>
                        </div>
                    </div>
                </div>)}
                {showClassDiscardConfirm && (<div
                    className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-6 animate-fade-in">
                    <div
                        className="bg-white dark:bg-slate-900 border border-gray-250 dark:border-slate-800 rounded-xl p-5 max-w-sm w-full text-center space-y-4 shadow-2xl font-sans">
                        <div
                            className="mx-auto w-10 h-10 bg-amber-500/10 rounded-full flex items-center justify-center text-amber-500"><AlertCircle className="w-5 h-5" /></div>
                        <div className="space-y-1">
                            <h4 className="font-bold text-sm text-slate-900 dark:text-white">Alterações não salvas</h4>
                            <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">Deseja salvar um rascunho para continuar depois, continuar editando ou descartar os dados?</p>
                        </div>
                        <div className="grid grid-cols-1 gap-2 pt-2">
                            <button
                                onClick={handleSaveDraftAndExit}
                                className="py-2 bg-teal-500 hover:bg-teal-600 text-slate-900 rounded text-xs font-semibold transition-colors cursor-pointer">Salvar rascunho e sair</button>
                            <button
                                onClick={() => setShowClassDiscardConfirm(false)}
                                className="py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded text-xs font-semibold transition-colors cursor-pointer">Continuar editando</button>
                            <button
                                onClick={handleForceCloseClassModal}
                                className="py-2 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-semibold transition-colors shadow-sm cursor-pointer">Descartar e sair</button>
                        </div>
                    </div>
                </div>)}
            </SlidePanel>

            <HelpModal
                isOpen={isHelpOpen}
                onClose={() => setIsHelpOpen(false)}
                title="Ajuda sobre Gestão de Turmas"
                description="Use esta tela para cadastrar, consultar e acompanhar as turmas da instituição."
                items={[
                    {
                        title: "Objetivo da tela",
                        description: "Centraliza o cadastro e o acompanhamento das turmas, períodos, horários, instrutores, avaliações e informações operacionais.",
                        icon: <Info className="h-4 w-4" aria-hidden="true" />
                    },
                    {
                        title: "Nova Turma",
                        description: "Abre o painel lateral para cadastrar uma turma, selecionar o curso, período, endereço, datas, horários, instrutores e responsáveis.",
                        icon: <Plus className="h-4 w-4" aria-hidden="true" />
                    },
                    {
                        title: "Filtros e busca",
                        description: "Use a busca para localizar turmas e os filtros rápidos para restringir a consulta por curso.",
                        icon: <Filter className="h-4 w-4" aria-hidden="true" />
                    },
                    {
                        title: "Períodos e horários",
                        description: "Os períodos são carregados dos turnos ativos. Ao selecionar um período, os horários de início, término e chamadas são preenchidos automaticamente.",
                        icon: <Calendar className="h-4 w-4" aria-hidden="true" />
                    },
                    {
                        title: "Ações da turma",
                        description: "Use o menu de ações de cada linha para editar ou excluir uma turma. A tabela também permite controlar as colunas visíveis e exportar os dados.",
                        icon: <MoreVertical className="h-4 w-4" aria-hidden="true" />
                    }
                ]}
            />

            <Modal isOpen={!!classToDelete} onClose={() => setClassToDelete(null)}>
                <div
                    className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-6 space-y-4 shadow-2xl font-sans text-center">
                    <div
                        className="mx-auto w-12 h-12 bg-rose-500/10 rounded-full flex items-center justify-center text-rose-600 dark:text-rose-400">
                        <Trash2 className="w-6 h-6 animate-pulse" />
                    </div>
                    <div className="space-y-2">
                        <h4 className="font-bold text-base text-slate-900 dark:text-white">Excluir Turma</h4>
                        <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">Tem certeza de que deseja excluir permanentemente a turma <span className="font-semibold text-slate-850 dark:text-slate-200">{classToDelete?.id_anac}</span>? Esta ação não pode ser desfeita e removerá todas as matrículas associadas.
                                          </p>
                    </div>
                    <div className="flex items-center gap-3 pt-2">
                        <button
                            onClick={() => setClassToDelete(null)}
                            className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-850 dark:text-slate-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer">Cancelar
                                          </button>
                        <button
                            id="btn-confirm-delete-class"
                            onClick={async () => {
                                if (!classToDelete)
                                    return;

                                try {
                                    await deleteClass(classToDelete.id);
                                } catch (err) {
                                    console.error(err);
                                } finally {
                                    setClassToDelete(null);
                                }
                            }}
                            className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm cursor-pointer">Confirmar Exclusão
                                          </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

export default Dashboard;