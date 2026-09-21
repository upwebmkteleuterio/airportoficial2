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
    Ban,
    MoreVertical,
    Search,
    Filter,
    HelpCircle,
    Info,
    BookOpen,
    MapPin,
} from "lucide-react";

import { useClasses } from "../hooks/useClasses";
import { useUsers } from "../hooks/useUsers";
import { usePeople } from "../hooks/usePeople";
import { useCourses } from "../hooks/useCourses";
import { shiftService } from "../services/shifts";
import { useAddresses } from "../hooks/useAddresses";
import { type ClassFilters } from "../services/classService";
import { useUIStore } from "../store/uiStore";
import { ClassStatusPrazo, InstructorFuncao, Turma, UserRole } from "../types";
import { getStatusPrazoNotas } from "../utils/statusPrazoNotas";
import { Modal } from "../components/ui/Modal";
import { HelpModal } from "../components/ui/HelpModal";
import { SlidePanel } from "../components/ui/SlidePanel";
import { ConfirmDeleteModal } from "../components/ui/ConfirmDeleteModal";
import { TruncatedInfoTooltip } from "../components/ui/TruncatedInfoTooltip";
import { ClassDeadlineAlertModal } from "../components/classes/ClassDeadlineAlertModal";
import { ClassDeadlineAlertTags } from "../components/classes/ClassDeadlineAlertTags";
import {
    ClassDeadlineAlertType,
    classifyClassDeadlineAlert,
    getDaysUntilClassDeadline,
    isClassDeadlineAlertWithinFiveDays,
} from "../utils/classDeadlineAlerts";

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
    formCargaHoraria: string;
    formSoftwareTurma: string;
    selectedInstructors: string[];
    selectedInstructorFunctions: Record<string, InstructorFuncao>;
    instructorInput: string;
    formIoad: string;
    formIscr: string;
    formIcar: string;
    formAplicador: string;
    formStatusHistorico: "" | "No prazo" | "Cancelado" | "Encerrado";
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
            formCargaHoraria: typeof parsed.formCargaHoraria === "string" ? parsed.formCargaHoraria : "",
            formSoftwareTurma: typeof parsed.formSoftwareTurma === "string" ? parsed.formSoftwareTurma : "",
            selectedInstructors: Array.isArray(parsed.selectedInstructors) ? parsed.selectedInstructors.filter((value: unknown): value is string => typeof value === "string") : [],
            selectedInstructorFunctions: parsed.selectedInstructorFunctions && typeof parsed.selectedInstructorFunctions === "object" ? parsed.selectedInstructorFunctions as Record<string, InstructorFuncao> : {},
            instructorInput: typeof parsed.instructorInput === "string" ? parsed.instructorInput : "",
            formIoad: typeof parsed.formIoad === "string" ? parsed.formIoad : "",
            formIscr: typeof parsed.formIscr === "string" ? parsed.formIscr : "",
            formIcar: typeof parsed.formIcar === "string" ? parsed.formIcar : "",
            formAplicador: typeof parsed.formAplicador === "string" ? parsed.formAplicador : "",
            formStatusHistorico: parsed.formStatusHistorico === "No prazo" || parsed.formStatusHistorico === "Cancelado" || parsed.formStatusHistorico === "Encerrado" ? parsed.formStatusHistorico : "",
            formVigilante: parsed.formVigilante === true,
            formNotes: typeof parsed.formNotes === "string" ? parsed.formNotes : ""
        };
    } catch {
        return null;
    }
};

const hasClassDraftContent = (draft: ClassDraft) => (Object.entries(draft).some(
    ([key, value]) => key === "formVigilante" ? value : key === "formStatusHistorico" ? Boolean(value) : Array.isArray(value) ? value.length > 0 : value && typeof value === "object" ? Object.keys(value).length > 0 : Boolean(value)
));

const normalizeForeignKeyValue = (value?: string | null) => value && value !== "Não aplicável" ? value : "";
const formatShiftTime = (value: string | null | undefined) => value ? value.slice(0, 5) : "";
const getExamTimeLabel = (value: string | null | undefined) => value === null || value === undefined ? "Não informado" : value === "Sem prova" || value === "" ? "Sem prova" : value;
const getLocalDateString = () => {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${today.getFullYear()}-${month}-${day}`;
};

const DEFAULT_VISIBLE_COLUMNS = {
    id_anac: true,
    id_interno: true,
    curso: true,
    status_notas: true,
    prazo: true,
    status_turma: true,
    status_historico: true,
    carga_horaria: true,
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
    instrutor: true,
    convidado: true,
    aplicador_pr: true,
    vigia: true,
    notas_lancadas_em: true,
    data_lancamento_real: true,
    data_prova_1: true,
    data_prova_2: true,
    software_utilizado: true,
    sn: true,
} as const;

type VisibleColumns = { -readonly [Key in keyof typeof DEFAULT_VISIBLE_COLUMNS]: boolean };
const VISIBLE_COLUMNS_STORAGE_KEY = "dashboard-visible-columns-v1";

function loadVisibleColumns(): VisibleColumns {
    if (typeof window === "undefined") return { ...DEFAULT_VISIBLE_COLUMNS };
    try {
        const parsed = JSON.parse(window.localStorage.getItem(VISIBLE_COLUMNS_STORAGE_KEY) || "null");
        if (!parsed || typeof parsed !== "object") return { ...DEFAULT_VISIBLE_COLUMNS };
        const legacyTeamVisibility = parsed.instrutores_turma;
        return Object.keys(DEFAULT_VISIBLE_COLUMNS).reduce<VisibleColumns>((result, key) => {
            const legacyValue = key === "instrutor" || key === "convidado"
                ? legacyTeamVisibility
                : key === "aplicador_pr"
                    ? legacyTeamVisibility ?? parsed.aplicador
                    : undefined;
            const storedValue = parsed[key] ?? legacyValue;
            result[key as keyof VisibleColumns] = storedValue === false ? false : true;
            return result;
        }, { ...DEFAULT_VISIBLE_COLUMNS } as VisibleColumns);
    } catch {
        return { ...DEFAULT_VISIBLE_COLUMNS };
    }
}

const DEFAULT_CLASS_FILTERS: ClassFilters = {
    idAnac: "",
    idInterno: "",
    course: "",
    shift: "",
    statusTurma: "",
    statusHistorico: "",
    city: "",
    uf: "",
    startDateFrom: "",
    startDateTo: "",
};

export function Dashboard() {
    const {
        filters,
        setFilter,
        modals,
        setModalOpen,
        setRoute,
        setSelectedClassId,
        classListPage,
        setClassListPage,
        userLogged
    } = useUIStore();
    const isInstructor = userLogged?.role === 'INSTRUTOR';

    const [currentPage, setCurrentPage] = useState(() => classListPage);
    const [activeDeadlineAlert, setActiveDeadlineAlert] = useState<ClassDeadlineAlertType | null>(null);
    const [isDeadlineAlertModalOpen, setIsDeadlineAlertModalOpen] = useState(false);
    const [turmaInstructorsMap, setTurmaInstructorsMap] = useState<Record<string, { instrutor_id: string; funcao: string }[]>>({});
    const [advancedFilters, setAdvancedFilters] = useState<ClassFilters>({ ...DEFAULT_CLASS_FILTERS });
    const [draftAdvancedFilters, setDraftAdvancedFilters] = useState<ClassFilters>({ ...DEFAULT_CLASS_FILTERS });
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const itemsPerPage = 100;

    const {
        courses
    } = useCourses();

    const {
        classes,
        total,
        createClass,
        updateClass,
        deleteClass,
        isDeleting,
        cancelClass,
        isCancelling,
        getInstrutoresByTurma,
        getInstrutoresByTurmas,
        getClassEditability,
        saveInstrutoresForTurma,
        isLoading,
        isFetching,
        isCreating,
        isUpdating
    } = useClasses({
        page: currentPage,
        pageSize: itemsPerPage,
        search: filters.classSearchTerm,
        courseSearch: filters.classCourseFilter ?? '',
        filters: advancedFilters
    });

    const [editingClassId, setEditingClassId] = useState<string | null>(null);
    const [lockedClassFields, setLockedClassFields] = useState<string[]>([]);
    const [classToDelete, setClassToDelete] = useState<Turma | null>(null);
    const [classToCancel, setClassToCancel] = useState<Turma | null>(null);
    const [selectedClassToLaunch, setSelectedClassToLaunch] = useState<Turma | null>(null);
    const [isHelpOpen, setIsHelpOpen] = useState(false);

    const {
        users
    } = useUsers();
    const { people } = usePeople({ activeOnly: true });

    const instructorUsers = useMemo(() => users.filter(user => user.role === "INSTRUTOR" && user.status === "ativo").slice().sort(
        (first, second) => first.nome_completo.localeCompare(second.nome_completo, "pt-BR")
    ), [users]);

    const directoryPeople = useMemo(() => people.filter(person => person.ativo).slice().sort(
        (first, second) => first.nome.localeCompare(second.nome, "pt-BR")
    ), [people]);
    const assignmentPeople = directoryPeople;

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
    const [formCargaHoraria, setFormCargaHoraria] = useState("");
    const [formSoftwareTurma, setFormSoftwareTurma] = useState("");
    const [selectedInstructors, setSelectedInstructors] = useState<string[]>([]);
    const [selectedInstructorFunctions, setSelectedInstructorFunctions] = useState<Record<string, InstructorFuncao>>({});
    const [instructorInput, setInstructorInput] = useState("");
    const [formIoad, setFormIoad] = useState("");
    const [formIscr, setFormIscr] = useState("");
    const [formIcar, setFormIcar] = useState("");
    const [formAplicador, setFormAplicador] = useState("");
    const [formStatusHistorico, setFormStatusHistorico] = useState<"" | "No prazo" | "Cancelado" | "Encerrado">("No prazo");

    const applicatorPeople = directoryPeople;

    const resolveProfileId = (value: string | null | undefined, candidates: typeof users) => {
        const normalizedValue = normalizeForeignKeyValue(value);

        if (!normalizedValue)
            return "";

        if (candidates.length === 0)
            return "";

        return candidates.find(
            user => user.id === normalizedValue || user.nome_completo === normalizedValue
        )?.id || "";
    };
    const resolveDirectoryId = (value: string | null | undefined) => {
        const normalizedValue = normalizeForeignKeyValue(value);
        return directoryPeople.find(person => person.id === normalizedValue || person.nome === normalizedValue)?.id || "";
    };
    const selectedApplicatorId = selectedInstructors.find((personId) => selectedInstructorFunctions[personId] === InstructorFuncao.APLICADOR_PROVA) || resolveDirectoryId(formAplicador);

    const [formVigilante, setFormVigilante] = useState(false);
    const [formNotes, setFormNotes] = useState("");
    const [classDraftToResume, setClassDraftToResume] = useState<ClassDraft | null>(null);
    const [showClassDiscardConfirm, setShowClassDiscardConfirm] = useState(false);
    const classDraftOpeningRef = useRef(false);
    const classSubmitRef = useRef(false);
    const cancelClassSubmitRef = useRef(false);
    const deleteClassSubmitRef = useRef(false);
    const launchClassSubmitRef = useRef(false);
    const deadlineAlertDatasetRef = useRef<string | null>(null);

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
        formCargaHoraria,
        formSoftwareTurma,
        selectedInstructors,
        selectedInstructorFunctions,
        instructorInput,
        formIoad,
        formIscr,
        formIcar,
        formAplicador,
        formStatusHistorico,
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
        formCargaHoraria,
        formSoftwareTurma,
        selectedInstructors,
        selectedInstructorFunctions,
        instructorInput,
        formIoad,
        formIscr,
        formIcar,
        formAplicador,
        formStatusHistorico,
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

    const handleToggleNotaLancada = async (e: React.MouseEvent, turma: Turma) => {
        e.stopPropagation();

        if (launchClassSubmitRef.current || isUpdating)
            return;

        if (!turma.nota_lancada) {
            setSelectedClassToLaunch(turma);
            return;
        }

        try {
            await updateClass({
                id: turma.id,
                updates: {
                    nota_lancada: false,
                    data_lancada_real: null
                }
            });
        } catch (err) {
            console.error(err);
        }
    };

    const handleConfirmNotaLancada = async () => {
        if (!selectedClassToLaunch || launchClassSubmitRef.current || isUpdating)
            return;

        launchClassSubmitRef.current = true;
        try {
            await updateClass({
                id: selectedClassToLaunch.id,
                updates: {
                    nota_lancada: true,
                    data_lancada_real: getLocalDateString()
                }
            });
        } catch (err) {
            console.error(err);
        } finally {
            launchClassSubmitRef.current = false;
            setSelectedClassToLaunch(null);
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
        setFormCargaHoraria("");
        setFormSoftwareTurma("");
        setSelectedInstructors([]);
        setSelectedInstructorFunctions({});
        setInstructorInput("");
        setFormIoad("");
        setFormIscr("");
        setFormIcar("");
        setFormAplicador("");
        setFormStatusHistorico("No prazo");
        setFormNotes("");
        setFormVigilante(false);
        setEditingClassId(null);
        setLockedClassFields([]);
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
        setFormCargaHoraria(draft.formCargaHoraria);
        setFormSoftwareTurma(draft.formSoftwareTurma);

        const draftInstructorIds = draft.selectedInstructors.map(value => resolveDirectoryId(value)).filter(Boolean);
        setSelectedInstructors(draftInstructorIds);
        setSelectedInstructorFunctions(draft.selectedInstructorFunctions);

        setInstructorInput(draft.instructorInput);
        setFormIoad(resolveProfileId(draft.formIoad, instructorUsers));
        setFormIscr(resolveProfileId(draft.formIscr, instructorUsers));
        setFormIcar(resolveProfileId(draft.formIcar, instructorUsers));
        setFormAplicador(resolveDirectoryId(draft.formAplicador));
        setFormStatusHistorico(draft.formStatusHistorico);
        setFormVigilante(draft.formVigilante);
        setFormNotes(draft.formNotes);
        setClassDraftToResume(null);
    };

    const startNewClassRegistration = () => {
        clearClassDraft();
        resetClassForm();
        setClassDraftToResume(null);
    };

    const [visibleColumns, setVisibleColumns] = useState<VisibleColumns>(loadVisibleColumns);
    const [showColsDropdown, setShowColsDropdown] = useState(false);
    const hiddenColumnsCount = Object.values(visibleColumns).filter((visible) => !visible).length;

    useEffect(() => {
        try {
            if (hiddenColumnsCount === 0) window.localStorage.removeItem(VISIBLE_COLUMNS_STORAGE_KEY);
            else window.localStorage.setItem(VISIBLE_COLUMNS_STORAGE_KEY, JSON.stringify(visibleColumns));
        } catch {}
    }, [hiddenColumnsCount, visibleColumns]);

    const columnLabels = {
        id_anac: "ID ANAC",
        id_interno: "ID Interno",
        curso: "Curso",
        status_notas: "Nota Lançada?",
        prazo: "Prazo",
        status_turma: "Situação",
        status_historico: "Status histórico",
        carga_horaria: "Carga horária",
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
        instrutor: "Instrutor",
        convidado: "Convidado",
        aplicador_pr: "Aplicador PR",
        vigia: "Vigilante sem deslocamento",
        notas_lancadas_em: "Data de Lançamento",
        data_lancamento_real: "Lançada em",
        data_prova_1: "1ª Prova",
        data_prova_2: "2ª Prova",
        software_utilizado: "Software",
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

    const classDeadlineAlerts = useMemo(
        () => classes.map((turma) => ({ turma, alert: classifyClassDeadlineAlert(turma) })),
        [classes]
    );
    const deadlineAlertCounts = useMemo(() => classDeadlineAlerts.reduce<Record<ClassDeadlineAlertType, number>>(
        (counts, { alert }) => {
            if (alert) counts[alert.type] += 1;
            return counts;
        },
        { atrasadas: 0, "vence-em-1-dia": 0, "prazo-curto": 0 }
    ), [classDeadlineAlerts]);
    const deadlineModalClasses = useMemo(
        () => classes
            .filter((turma) => isClassDeadlineAlertWithinFiveDays(turma))
            .sort((first, second) => (getDaysUntilClassDeadline(first) ?? 0) - (getDaysUntilClassDeadline(second) ?? 0)),
        [classes]
    );
    const deadlineModalDatasetKey = deadlineModalClasses
        .map((turma) => `${turma.id}:${turma.data_lancamento_notas ?? ""}:${turma.nota_lancada ? "1" : "0"}`)
        .join(",");
    const filteredClasses = activeDeadlineAlert
        ? classDeadlineAlerts.filter(({ alert }) => alert?.type === activeDeadlineAlert).map(({ turma }) => turma)
        : classes;
    const paginatedClasses = filteredClasses;
    const visibleTotal = activeDeadlineAlert ? filteredClasses.length : total;
    const totalPages = Math.ceil(visibleTotal / itemsPerPage) || 1;

    const classListFiltersKey = JSON.stringify({
        search: filters.classSearchTerm,
        course: filters.classCourseFilter,
        advanced: advancedFilters,
        alert: activeDeadlineAlert,
    });
    const previousClassListFiltersKeyRef = useRef(classListFiltersKey);

    useEffect(() => {
        setClassListPage(currentPage);
    }, [currentPage, setClassListPage]);

    useEffect(() => {
        if (previousClassListFiltersKeyRef.current !== classListFiltersKey) {
            previousClassListFiltersKeyRef.current = classListFiltersKey;
            setCurrentPage(1);
        }
    }, [classListFiltersKey]);

    useEffect(() => {
        if (activeDeadlineAlert && deadlineAlertCounts[activeDeadlineAlert] === 0) {
            setActiveDeadlineAlert(null);
        }
    }, [activeDeadlineAlert, deadlineAlertCounts]);

    useEffect(() => {
        if (!isLoading && deadlineModalDatasetKey) {
            if (deadlineAlertDatasetRef.current !== deadlineModalDatasetKey) {
                deadlineAlertDatasetRef.current = deadlineModalDatasetKey;
                setIsDeadlineAlertModalOpen(true);
            }
        } else if (!deadlineModalDatasetKey) {
            deadlineAlertDatasetRef.current = null;
            setIsDeadlineAlertModalOpen(false);
        }
    }, [deadlineModalDatasetKey, isLoading]);

    const handleRemoveInstructor = (instructorId: string) => {
        setSelectedInstructors(selectedInstructors.filter(id => id !== instructorId));
        setSelectedInstructorFunctions((current) => {
            const next = { ...current };
            delete next[instructorId];
            return next;
        });
    };

    const getInstructorName = (instructorId: string) => directoryPeople.find(person => person.id === instructorId)?.nome || instructorUsers.find(instructor => instructor.id === instructorId)?.nome_completo || users.find(user => user.id === instructorId)?.nome_completo || instructorId;
    const getUserName = (userId?: string | null) => directoryPeople.find(person => person.id === userId)?.nome || users.find(user => user.id === userId)?.nome_completo || userId || "Não aplicável";
    const getCoordinatorNames = (turma: Turma) => ({
        ioad: getInstructorName(turma.coordenador_ioad_id || ""),
        iscr: getInstructorName(turma.coordenador_iscr_id || ""),
        icar: getInstructorName(turma.coordenador_icar_id || ""),
        aplicador: getUserName(turma.aplicador_id),
    });
    const getClassAddressLabel = (turma: Turma) => {
        const address = addresses.find((candidate) => candidate.id === turma.endereco_id);
        if (address) return `${address.logradouro} - ${address.cidade}/${address.estado}`;
        const location = [turma.cidade, turma.uf].filter(Boolean).join('/');
        if (turma.endereco_realizacao && location && !turma.endereco_realizacao.includes(location)) {
            return `${turma.endereco_realizacao} - ${location}`;
        }
        return turma.endereco_realizacao || location || "Não aplicável";
    };
    const getClassTeam = (turma: Turma) => {
        const relations = turmaInstructorsMap[turma.id] ?? [];
        const getNames = (funcao: InstructorFuncao) => relations
            .filter((relation) => relation.funcao === funcao)
            .map((relation) => getInstructorName(relation.instrutor_id))
            .filter((name) => name !== "Não aplicável");
        const aplicadores = getNames(InstructorFuncao.APLICADOR_PROVA);
        const applicatorId = normalizeForeignKeyValue(turma.aplicador_id);
        if (applicatorId) {
            const applicatorName = getUserName(applicatorId);
            if (applicatorName !== "Não aplicável" && !aplicadores.includes(applicatorName)) {
                aplicadores.push(applicatorName);
            }
        }
        return {
            instrutor: getNames(InstructorFuncao.INSTRUTOR_TUTOR),
            convidado: getNames(InstructorFuncao.CONVIDADO),
            aplicador: aplicadores,
        };
    };

    // Carrega os vínculos reais de turma_instrutores, incluindo a função persistida.
    // Os nomes são resolvidos no render para evitar dependências instáveis.
    useEffect(() => {
        if (!classes.length) {
            setTurmaInstructorsMap({});
            return;
        }

        let cancelled = false;
        const load = async () => {
            try {
                const relations = await getInstrutoresByTurmas(classes.map((turma) => turma.id));
                const relationsByTurma = relations.reduce<Record<string, { instrutor_id: string; funcao: string }[]>>((map, relation) => {
                    const turmaRelations = map[relation.turma_id] ?? [];
                    turmaRelations.push({ instrutor_id: relation.instrutor_id, funcao: relation.funcao });
                    map[relation.turma_id] = turmaRelations;
                    return map;
                }, {});
                if (!cancelled) {
                    setTurmaInstructorsMap(Object.fromEntries(
                        classes.map((turma) => [turma.id, relationsByTurma[turma.id] ?? []])
                    ));
                }
            } catch (error) {
                console.warn("[turmas] falha ao carregar instrutores das turmas", { error });
                if (!cancelled) {
                    setTurmaInstructorsMap(Object.fromEntries(classes.map((turma) => [turma.id, []])));
                }
            }
        };
        void load();
        return () => { cancelled = true; };
    }, [classes, getInstrutoresByTurmas]);

    const handleSaveClass = async () => {
        if (classSubmitRef.current || isCreating || isUpdating) return;
        if (!formCurso || !formDataInicio || !formDataTermino || !formIdAnac || !formIdInterno || !formEndereco || !formTurno || !formHorarioInicio || !formHorarioTermino) {
            alert("Por favor, preencha todos os campos obrigatórios (*)");
            return;
        }
        const internalId = Number(formIdInterno);
        if (!Number.isInteger(internalId)) {
            alert('O ID interno da escola deve ser um número inteiro.');
            return;
        }
        const cargaHoraria = formCargaHoraria.trim() === '' ? null : Number(formCargaHoraria);
        if (cargaHoraria !== null && (!Number.isFinite(cargaHoraria) || cargaHoraria < 0)) {
            alert('A carga horária deve ser um número igual ou maior que zero.');
            return;
        }
        classSubmitRef.current = true;

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
                        id_interno_escola: internalId,
                        turno: formTurno as any,
                        horario_aulas: horarioAulas,
                        endereco_realizacao: addressName,
                        endereco_id: formEndereco,
                        curso_id: selectedCourse.id,
                        data_inicio: formDataInicio,
                        data_termino: formDataTermino,
                        data_lancamento_notas: formDataLancamentoNotas,
                        carga_horaria: cargaHoraria,
                        software_utilizado: formSoftwareTurma.trim() || null,
                        horario_prova_1_chamada: formHora1 || "Sem prova",
                        horario_prova_2_chamada: formHora2 || "Sem prova",
                        data_prova_1_chamada: formDataProva1,
                        data_prova_2_chamada: formDataProva2,
                        vigilante_sem_deslocamento: formVigilante,
                        anotacoes_turma: formNotes,
                        status_historico: formStatusHistorico || null,
                        coordenador_ioad_id: normalizeForeignKeyValue(formIoad) || undefined,
                        coordenador_iscr_id: normalizeForeignKeyValue(formIscr) || undefined,
                        coordenador_icar_id: normalizeForeignKeyValue(formIcar) || undefined,
                        aplicador_id: selectedApplicatorId || undefined
                    }
                });
            } else {
                const createdClass = await createClass({
                    id_anac: formIdAnac.trim(),
                    id_interno_escola: internalId,
                    curso_id: selectedCourse.id,
                    turno: formTurno as any,
                    horario_aulas: horarioAulas,
                    data_inicio: formDataInicio,
                    data_termino: formDataTermino,
                    data_lancamento_notas: formDataLancamentoNotas,
                    carga_horaria: cargaHoraria,
                    software_utilizado: formSoftwareTurma.trim() || null,
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
                    status_historico: formStatusHistorico || null,
                    coordenador_ioad_id: normalizeForeignKeyValue(formIoad) || undefined,
                    coordenador_iscr_id: normalizeForeignKeyValue(formIscr) || undefined,
                    coordenador_icar_id: normalizeForeignKeyValue(formIcar) || undefined,
                    aplicador_id: selectedApplicatorId || undefined,
                    gestor_turma_id: "user-admin-1",
                    nota_lancada: false,
                    dias_para_vencimento: 5,
                    status_operacional_sn: true,
                    status_turma: 'Ativa'
                });

                savedClassId = createdClass.id;
            }

            if (savedClassId) {
                const assignmentsToSave = selectedInstructors
                    .map((personId) => ({
                        instrutor_id: personId,
                        funcao: selectedInstructorFunctions[personId] || InstructorFuncao.INSTRUTOR_TUTOR,
                    }))
                    .filter((assignment, index, assignments) => assignments.findIndex((item) => item.instrutor_id === assignment.instrutor_id && item.funcao === assignment.funcao) === index);

                await saveInstrutoresForTurma({
                    turmaId: savedClassId,
                    instrutores: assignmentsToSave
                });
            }

            clearClassDraft();
            resetClassForm();
            setClassDraftToResume(null);
            setShowClassDiscardConfirm(false);
            setModalOpen("newClassOpen", false);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Não foi possível salvar a turma.';
            alert(message.includes('ID ANAC') || message.includes('ID interno') || message.includes('identificadores')
                ? message
                : 'Não foi possível salvar a turma. Verifique os dados e tente novamente.');
        } finally {
            classSubmitRef.current = false;
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
                <ClassDeadlineAlertTags
                    counts={deadlineAlertCounts}
                    activeAlert={activeDeadlineAlert}
                    onSelect={(alert) => setActiveDeadlineAlert((current) => current === alert ? null : alert)}
                    onClear={() => setActiveDeadlineAlert(null)}
                />
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
                    {!isInstructor && (<button
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
                    </button>)}
                </div>
            </div>
            {}
            <div
                className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-850 rounded-xl border border-gray-200 dark:border-slate-800 shrink-0">
                <div className="flex flex-col lg:flex-row lg:items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                        <button
                            type="button"
                            onClick={() => {
                                setDraftAdvancedFilters({ ...advancedFilters });
                                setShowAdvancedFilters((open) => !open);
                            }}
                            aria-expanded={showAdvancedFilters}
                            aria-controls="advanced-class-filters"
                            className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-750 px-3 py-1.5 rounded-lg font-bold text-xs text-slate-800 dark:text-white shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                        >
                            <Filter className="w-3.5 h-3.5 text-gray-500" aria-hidden="true" />
                            <span>Filtros</span>
                            {Object.values(advancedFilters).some(Boolean) && <span className="rounded-full bg-teal-600 px-1.5 text-[10px] text-white">ativos</span>}
                        </button>
                        {showAdvancedFilters && <div id="advanced-class-filters" role="dialog" aria-label="Filtros avançados de turmas" className="absolute left-0 top-full z-30 mt-2 w-[min(90vw,42rem)] rounded-xl border border-gray-200 bg-white p-4 shadow-xl dark:border-slate-800 dark:bg-slate-950">
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">ID ANAC<input value={draftAdvancedFilters.idAnac} onChange={(event) => setDraftAdvancedFilters((current) => ({ ...current, idAnac: event.target.value }))} className="mt-1 w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900" /></label>
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">ID interno<input inputMode="numeric" value={draftAdvancedFilters.idInterno} onChange={(event) => setDraftAdvancedFilters((current) => ({ ...current, idInterno: event.target.value }))} className="mt-1 w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900" /></label>
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Curso<input value={draftAdvancedFilters.course} onChange={(event) => setDraftAdvancedFilters((current) => ({ ...current, course: event.target.value }))} className="mt-1 w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900" /></label>
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Turno<select value={draftAdvancedFilters.shift} onChange={(event) => setDraftAdvancedFilters((current) => ({ ...current, shift: event.target.value }))} className="mt-1 w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"><option value="">Todos</option><option>MANHÃ</option><option>TARDE</option><option>NOITE</option><option>MANHÃ/TARDE</option><option>TARDE/NOITE</option><option>MANHÃ/TARDE E NOITE</option></select></label>
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Situação<select value={draftAdvancedFilters.statusTurma} onChange={(event) => setDraftAdvancedFilters((current) => ({ ...current, statusTurma: event.target.value }))} className="mt-1 w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"><option value="">Todas</option><option>Ativa</option><option>Cancelada</option></select></label>
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Status histórico<select value={draftAdvancedFilters.statusHistorico} onChange={(event) => setDraftAdvancedFilters((current) => ({ ...current, statusHistorico: event.target.value }))} className="mt-1 w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"><option value="">Todos</option><option>No prazo</option><option>Cancelado</option><option>Encerrado</option></select></label>
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Cidade<input value={draftAdvancedFilters.city} onChange={(event) => setDraftAdvancedFilters((current) => ({ ...current, city: event.target.value }))} className="mt-1 w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900" /></label>
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">UF<input maxLength={2} value={draftAdvancedFilters.uf} onChange={(event) => setDraftAdvancedFilters((current) => ({ ...current, uf: event.target.value.toUpperCase() }))} className="mt-1 w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm uppercase dark:border-slate-700 dark:bg-slate-900" /></label>
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Início a partir de<input type="date" value={draftAdvancedFilters.startDateFrom} onChange={(event) => setDraftAdvancedFilters((current) => ({ ...current, startDateFrom: event.target.value }))} className="mt-1 w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900" /></label>
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Início até<input type="date" value={draftAdvancedFilters.startDateTo} onChange={(event) => setDraftAdvancedFilters((current) => ({ ...current, startDateTo: event.target.value }))} className="mt-1 w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900" /></label>
                            </div>
                            <div className="mt-4 flex justify-end gap-2">
                                <button type="button" onClick={() => { setAdvancedFilters({ ...DEFAULT_CLASS_FILTERS }); setDraftAdvancedFilters({ ...DEFAULT_CLASS_FILTERS }); setShowAdvancedFilters(false); }} className="rounded-md border border-gray-300 px-3 py-2 text-xs font-bold text-slate-700 dark:border-slate-700 dark:text-slate-300">Limpar</button>
                                <button type="button" onClick={() => { setAdvancedFilters({ ...draftAdvancedFilters }); setShowAdvancedFilters(false); }} className="rounded-md bg-teal-700 px-3 py-2 text-xs font-bold text-white hover:bg-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">Aplicar filtros</button>
                            </div>
                        </div>}
                    </div>
                    <div className="relative w-full lg:w-80 xl:w-96">
                        <Search
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 w-4 h-4" />
                        <input
                            id="top-search-input"
                            type="text"
                            value={filters.classSearchTerm}
                            onChange={e => setFilter("classSearchTerm", e.target.value)}
                            placeholder="Buscar por ID interno ou nome do curso"
                            aria-label="Buscar por ID interno ou nome do curso"
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
                            type="button"
                            onClick={() => setShowColsDropdown(!showColsDropdown)}
                            aria-label={hiddenColumnsCount > 0 ? `Configurar colunas; ${hiddenColumnsCount} coluna(s) oculta(s)` : "Configurar colunas"}
                            aria-expanded={showColsDropdown}
                            className={`relative p-2 border rounded-lg transition-colors cursor-pointer ${showColsDropdown ? "border-teal-500 bg-teal-500/10 text-teal-600 dark:text-teal-400" : "border-gray-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-800"}`}
                            title={hiddenColumnsCount > 0 ? `${hiddenColumnsCount} coluna(s) oculta(s)` : "Configurar colunas"}>
                            <Columns className="w-4 h-4" aria-hidden="true" />
                            {hiddenColumnsCount > 0 && <span aria-label={`${hiddenColumnsCount} coluna(s) oculta(s)`} className="absolute -right-2 -top-2 min-w-4 rounded-full bg-amber-500 px-1 text-[10px] font-bold leading-4 text-white">{hiddenColumnsCount}</span>}
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
                                        type="button"
                                        onClick={() => {
                                            setVisibleColumns({ ...DEFAULT_VISIBLE_COLUMNS });
                                            try {
                                                window.localStorage.removeItem(VISIBLE_COLUMNS_STORAGE_KEY);
                                            } catch {}
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
                                {!isInstructor && <th
                                    className="px-4 py-3 w-10 text-center border-r border-gray-200/50 dark:border-slate-800/50"></th>}
                                {visibleColumns.id_anac && <th
                                    className="px-4 py-3 border-r border-gray-200/50 dark:border-slate-800/50">ID ANAC</th>}
                                {visibleColumns.id_interno && <th
                                    className="px-4 py-3 border-r border-gray-200/50 dark:border-slate-800/50">ID Interno</th>}
                                {visibleColumns.curso && <th
                                    className="px-4 py-3 border-r border-gray-200/50 dark:border-slate-800/50">Curso</th>}
                                {visibleColumns.status_notas && <th
                                    className="px-4 py-3 border-r border-gray-200/50 dark:border-slate-800/50 text-center">Nota Lançada?</th>}
                                {visibleColumns.prazo && <th
                                    className="px-4 py-3 border-r border-gray-200/50 dark:border-slate-800/50 text-right">Prazo</th>}
                                {visibleColumns.status_turma && <th
                                    className="px-4 py-3 border-r border-gray-200/50 dark:border-slate-800/50">Situação</th>}
                                {visibleColumns.status_historico && <th
                                    className="px-4 py-3 border-r border-gray-200/50 dark:border-slate-800/50">Status histórico</th>}
                                {visibleColumns.carga_horaria && <th
                                    className="px-4 py-3 border-r border-gray-200/50 dark:border-slate-800/50">Carga horária</th>}
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
                                {visibleColumns.instrutor && <th
                                    className="px-4 py-3 border-r border-gray-200/50 dark:border-slate-800/50">Instrutor</th>}
                                {visibleColumns.convidado && <th
                                    className="px-4 py-3 border-r border-gray-200/50 dark:border-slate-800/50">Convidado</th>}
                                {visibleColumns.aplicador_pr && <th
                                    className="px-4 py-3 border-r border-gray-200/50 dark:border-slate-800/50">Aplicador PR</th>}
                                {visibleColumns.vigia && <th
                                    className="px-4 py-3 border-r border-gray-200/50 dark:border-slate-800/50">Vigilante</th>}
                                {visibleColumns.notas_lancadas_em && <th
                                    className="px-4 py-3 border-r border-gray-200/50 dark:border-slate-800/50">Lançamento</th>}
                                {visibleColumns.data_lancamento_real && <th
                                    className="px-4 py-3 border-r border-gray-200/50 dark:border-slate-800/50">Lançada em</th>}
                                {visibleColumns.data_prova_1 && <th
                                    className="px-4 py-3 border-r border-gray-200/50 dark:border-slate-800/50">1ª Prova</th>}
                                {visibleColumns.data_prova_2 && <th
                                    className="px-4 py-3 border-r border-gray-200/50 dark:border-slate-800/50">2ª Prova</th>}
                                {visibleColumns.software_utilizado && <th
                                    className="px-4 py-3 border-r border-gray-200/50 dark:border-slate-800/50">Software</th>}
                                {visibleColumns.sn && <th
                                    className="px-4 py-3 border-r border-gray-200/50 dark:border-slate-800/50 text-center">S/N</th>}
                            </tr>
                        </thead>
                        <tbody
                            className="divide-y divide-gray-150 dark:divide-slate-800 text-gray-700 dark:text-slate-200 font-mono">
                            {isLoading || isFetching ? Array.from({ length: 5 }, (_, index) => (
                                <tr key={`class-skeleton-${index}`} aria-hidden="true" className="h-[38px]">
                                    <td
                                        colSpan={Object.values(visibleColumns).filter(Boolean).length + (isInstructor ? 0 : 1)}
                                        className="px-4 py-2">
                                        <div className="h-4 w-full rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
                                    </td>
                                </tr>
                            )) : paginatedClasses.length === 0 ? (<tr>
                                <td
                                    colSpan={Object.values(visibleColumns).filter(Boolean).length + (isInstructor ? 0 : 1)}
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
                                                setAdvancedFilters({ ...DEFAULT_CLASS_FILTERS });
                                                setDraftAdvancedFilters({ ...DEFAULT_CLASS_FILTERS });
                                                setActiveDeadlineAlert(null);
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
                                const team = getClassTeam(item);

                                return (
                                    <tr
                                        key={item.id}
                                        onClick={() => handleViewClass(item.id)}
                                        className={`hover:bg-slate-50 dark:hover:bg-slate-850/50 transition-colors h-[38px] group cursor-pointer even:bg-slate-50/30 dark:even:bg-slate-900/30 ${trColor}`}>
                                        {!isInstructor && (<td
                                            className="px-4 py-2 text-center border-r border-gray-200/30 dark:border-slate-800/30 relative"
                                            onClick={e => e.stopPropagation()}>
                                            <div className="flex items-center justify-center">
                                                <div className="relative">
                                                    <button
                                                        type="button"
                                                        onClick={e => {
                                                            e.stopPropagation();
                                                            setOpenMenuId(openMenuId === item.id ? null : item.id);
                                                        }}
                                                        aria-label={`Ações da turma ${item.id_anac}`}
                                                        aria-expanded={openMenuId === item.id}
                                                        className="p-1 text-gray-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
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
                                                                setFormCargaHoraria(item.carga_horaria == null ? "" : String(item.carga_horaria));
                                                                setFormSoftwareTurma(item.software_utilizado || "");
                                                                setFormStatusHistorico(item.status_historico || "");

                                                                setFormHora1(
                                                                    item.horario_prova_1_chamada !== "Sem prova" ? formatShiftTime(item.horario_prova_1_chamada) : ""
                                                                );

                                                                setFormHora2(
                                                                    item.horario_prova_2_chamada !== "Sem prova" ? formatShiftTime(item.horario_prova_2_chamada) : ""
                                                                );

                                                                setFormDataProva1(item.data_prova_1_chamada || "");
                                                                setFormDataProva2(item.data_prova_2_chamada || "");
                                                                setSelectedInstructors([]);
                                                                setSelectedInstructorFunctions({});
                                                                setInstructorInput("");
                                                                setFormIoad(resolveProfileId(item.coordenador_ioad_id, instructorUsers));
                                                                setFormIscr(resolveProfileId(item.coordenador_iscr_id, instructorUsers));
                                                                setFormIcar(resolveProfileId(item.coordenador_icar_id, instructorUsers));
                                                                setFormAplicador(resolveDirectoryId(item.aplicador_id));
                                                                setFormNotes(item.anotacoes_turma || "");
                                                                setFormVigilante(item.vigilante_sem_deslocamento);

                                                                try {
                                                                    const relations = await getInstrutoresByTurma(item.id);
                                                                    const relationIds = relations.map(relation => resolveDirectoryId(relation.instrutor_id)).filter(Boolean);
                                                                    setSelectedInstructors(relationIds);
                                                                    setSelectedInstructorFunctions(Object.fromEntries(
                                                                        relations.map(relation => [resolveDirectoryId(relation.instrutor_id) || relation.instrutor_id, relation.funcao as InstructorFuncao])
                                                                    ));
                                                                } catch (error) {
                                                                    console.error("Não foi possível carregar os instrutores da turma", error);
                                                                    return;
                                                                }

                                                                try {
                                                                    const editability = await getClassEditability(item.id);
                                                                    setLockedClassFields(editability.lockedFields.map(String));
                                                                } catch (error) {
                                                                    console.error("Não foi possível consultar o estado estrutural da turma", error);
                                                                    return;
                                                                }

                                                                setModalOpen("newClassOpen", true);
                                                            }}
                                                            className="w-full text-left px-4 py-2 text-xs font-semibold text-teal-600 dark:text-teal-400 hover:bg-gray-50 dark:hover:bg-slate-800 flex items-center gap-2">
                                                            <Edit className="w-4 h-4" />Editar
                                                                                            </button>
                                                        {item.status_turma !== 'Cancelada' && (<button
                                                            onClick={e => {
                                                                e.stopPropagation();
                                                                setOpenMenuId(null);
                                                                setClassToCancel(item);
                                                            }}
                                                            aria-label={`Cancelar turma ${item.id_anac}`}
                                                            className="w-full text-left px-4 py-2 text-xs font-semibold text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
                                                            <Ban className="w-4 h-4" aria-hidden="true" />Cancelar
                                                        </button>)}
                                                        <button
                                                            onClick={e => {
                                                                e.stopPropagation();
                                                                setOpenMenuId(null);
                                                                setClassToDelete(item);
                                                            }}
                                                            aria-label={`Excluir turma ${item.id_anac}`}
                                                            className="w-full text-left px-4 py-2 text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2">
                                                            <Trash2 className="w-4 h-4" aria-hidden="true" />Excluir
                                                                                            </button>
                                                    </div>)}
                                                </div>
                                            </div>
                                        </td>)}
                                        {visibleColumns.id_anac && (<td
                                            className={`px-4 py-2 border-r border-gray-200/30 dark:border-slate-800/30 font-semibold ${item.status_turma === 'Cancelada' ? "text-gray-500 dark:text-slate-400" : item.status_prazo_notas === ClassStatusPrazo.ATRASADO ? "text-red-500 dark:text-red-400" : "text-slate-900 dark:text-white"}`}>
                                            {item.id_anac}
                                        </td>)}
                                        {visibleColumns.id_interno && (<td
                                            className="px-4 py-2 border-r border-gray-200/30 dark:border-slate-800/30 text-gray-500 dark:text-slate-400">T-OP-{item.id_interno_escola}
                                        </td>)}
                                        {visibleColumns.curso && (<td
                                            className="px-4 py-2 border-r border-gray-200/30 dark:border-slate-800/30 font-sans max-w-xs">
                                            <TruncatedInfoTooltip
                                                text={course?.nome_curso || "Curso de Aviação"}
                                                title="Curso"
                                                icon={BookOpen}
                                            />
                                        </td>)}
                                        {visibleColumns.status_notas && (<td
                                            className="px-4 py-2 border-r border-gray-200/30 dark:border-slate-800/30 font-sans text-center"
                                            onClick={e => e.stopPropagation()}>
                                            <div className="flex items-center justify-center gap-2">
                                                {isInstructor ? (
                                                    <span className={`text-xs font-semibold ${item.nota_lancada ? "text-teal-600 dark:text-teal-400" : "text-gray-400"}`}>
                                                        {item.nota_lancada ? "Sim" : "Não"}
                                                    </span>
                                                ) : (
                                                    <>
                                                        <span
                                                            className={`text-xs font-semibold ${!item.nota_lancada ? "text-gray-800 dark:text-gray-200" : "text-gray-400"}`}>Não</span>
                                                        <button
                                                            type="button"
                                                            onClick={e => handleToggleNotaLancada(e, item)}
                                                            aria-label={`Marcar notas da turma ${item.id_anac} como ${item.nota_lancada ? "não lançadas" : "lançadas"}`}
                                                            aria-pressed={item.nota_lancada}
                                                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${item.nota_lancada ? "bg-teal-500" : "bg-gray-300 dark:bg-slate-600"}`}>
                                                            <span
                                                                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${item.nota_lancada ? "translate-x-4.5" : "translate-x-1"}`} />
                                                        </button>
                                                        <span
                                                            className={`text-xs font-semibold ${item.nota_lancada ? "text-teal-600 dark:text-teal-400" : "text-gray-400"}`}>Sim</span>
                                                    </>
                                                )}
                                            </div>
                                        </td>)}
                                        {visibleColumns.prazo && (<td
                                            className={`px-4 py-2 border-r border-gray-200/30 dark:border-slate-800/30 text-right font-bold ${prazoColor}`}>
                                            {prazoText}
                                        </td>)}
                                        {visibleColumns.status_turma && (<td
                                            className={`px-4 py-2 border-r border-gray-200/30 dark:border-slate-800/30 font-sans font-semibold ${item.status_turma === 'Cancelada' ? 'text-gray-500 dark:text-slate-400' : 'text-teal-600 dark:text-teal-400'}`}>
                                            {item.status_turma}
                                        </td>)}
                                        {visibleColumns.status_historico && (<td
                                            className="px-4 py-2 border-r border-gray-200/30 dark:border-slate-800/30 font-sans">
                                            {item.status_historico ?? '—'}
                                        </td>)}
                                        {visibleColumns.carga_horaria && (<td
                                            className="px-4 py-2 border-r border-gray-200/30 dark:border-slate-800/30 font-sans">
                                            {item.carga_horaria ?? '—'}
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
                                            {item.data_prova_1_chamada ? new Date(item.data_prova_1_chamada + "T00:00:00").toLocaleDateString("pt-BR") : ""} {getExamTimeLabel(item.horario_prova_1_chamada)}
                                        </td>)}
                                        {visibleColumns.hora2 && (<td
                                            className="px-4 py-2 border-r border-gray-200/30 dark:border-slate-800/30">
                                            {item.data_prova_2_chamada ? new Date(item.data_prova_2_chamada + "T00:00:00").toLocaleDateString("pt-BR") : ""} {getExamTimeLabel(item.horario_prova_2_chamada)}
                                        </td>)}
                                        {visibleColumns.endereco && (<td
                                            className="px-4 py-2 border-r border-gray-200/30 dark:border-slate-800/30 font-sans max-w-xs">
                                            <TruncatedInfoTooltip
                                                text={getClassAddressLabel(item)}
                                                title="Endereço"
                                                icon={MapPin}
                                            />
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
                                        {visibleColumns.instrutor && (<td
                                            className="min-w-[180px] max-w-xs whitespace-normal px-4 py-2 align-top border-r border-gray-200/30 dark:border-slate-800/30 font-sans">
                                            {team.instrutor.join(', ') || '—'}
                                        </td>)}
                                        {visibleColumns.convidado && (<td
                                            className="min-w-[180px] max-w-xs whitespace-normal px-4 py-2 align-top border-r border-gray-200/30 dark:border-slate-800/30 font-sans">
                                            {team.convidado.join(', ') || '—'}
                                        </td>)}
                                        {visibleColumns.aplicador_pr && (<td
                                            className="min-w-[180px] max-w-xs whitespace-normal px-4 py-2 align-top border-r border-gray-200/30 dark:border-slate-800/30 font-sans">
                                            {team.aplicador.join(', ') || '—'}
                                        </td>)}
                                        {visibleColumns.vigia && (<td
                                            className="px-4 py-2 border-r border-gray-200/30 dark:border-slate-800/30 font-sans">
                                            {item.vigilante_sem_deslocamento ? 'Sim' : 'Não'}
                                        </td>)}
                                        {visibleColumns.notas_lancadas_em && (<td
                                            className="px-4 py-2 border-r border-gray-200/30 dark:border-slate-800/30 font-sans">
                                            {item.data_lancamento_notas ? new Date(item.data_lancamento_notas + "T00:00:00").toLocaleDateString("pt-BR") : '—'}
                                        </td>)}
                                        {visibleColumns.data_lancamento_real && (<td
                                            className="px-4 py-2 border-r border-gray-200/30 dark:border-slate-800/30 font-sans">
                                            {item.data_lancada_real ? new Date(item.data_lancada_real + "T00:00:00").toLocaleDateString("pt-BR") : '—'}
                                        </td>)}
                                        {visibleColumns.data_prova_1 && (<td
                                            className="px-4 py-2 border-r border-gray-200/30 dark:border-slate-800/30 font-sans">
                                            {item.data_prova_1_chamada ? new Date(item.data_prova_1_chamada + "T00:00:00").toLocaleDateString("pt-BR") : '—'}
                                        </td>)}
                                        {visibleColumns.data_prova_2 && (<td
                                            className="px-4 py-2 border-r border-gray-200/30 dark:border-slate-800/30 font-sans">
                                            {item.data_prova_2_chamada ? new Date(item.data_prova_2_chamada + "T00:00:00").toLocaleDateString("pt-BR") : '—'}
                                        </td>)}
                                        {visibleColumns.software_utilizado && (<td
                                            className="px-4 py-2 border-r border-gray-200/30 dark:border-slate-800/30 font-sans max-w-xs truncate">
                                            {item.software_utilizado || '—'}
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
                        {visibleTotal === 0
                            ? 'Exibindo 0 de 0 turmas'
                            : `Exibindo ${(currentPage - 1) * itemsPerPage + 1}-${Math.min(currentPage * itemsPerPage, visibleTotal)} de ${visibleTotal} turmas`}
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
            <SlidePanel isOpen={modals.newClassOpen && !isInstructor} onClose={handleCloseClassModal}>
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
                                    disabled={lockedClassFields.includes('id_anac')}
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
                                    disabled={lockedClassFields.includes('id_interno_escola')}
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
                                        disabled={lockedClassFields.includes('curso_id')}
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
                                        disabled={lockedClassFields.includes('turno')}
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
                                    disabled={lockedClassFields.includes('horario_aulas')}
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
                                    disabled={lockedClassFields.includes('horario_aulas')}
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
                                    disabled={lockedClassFields.includes('data_inicio')}
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
                                    disabled={lockedClassFields.includes('data_termino')}
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
                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="form-status-historico" className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wide">Status histórico</label>
                            <select
                                id="form-status-historico"
                                value={formStatusHistorico}
                                onChange={e => setFormStatusHistorico(e.target.value as "" | "No prazo" | "Cancelado" | "Encerrado")}
                                className="w-full border border-gray-300 dark:border-slate-700 rounded px-3 py-2.5 bg-white dark:bg-slate-850 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                            >
                                <option value="">Não informado</option>
                                <option value="No prazo">No prazo</option>
                                <option value="Cancelado">Cancelado</option>
                                <option value="Encerrado">Encerrado</option>
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="form-carga-horaria" className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wide">Carga horária</label>
                                <input
                                    id="form-carga-horaria"
                                    type="number"
                                    min="0"
                                    step="0.5"
                                    value={formCargaHoraria}
                                    onChange={e => setFormCargaHoraria(e.target.value)}
                                    placeholder="Ex.: 40"
                                    className="w-full border border-gray-300 dark:border-slate-700 rounded px-3 py-2 bg-white dark:bg-slate-850 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="form-software-turma" className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wide">Software da turma</label>
                                <input
                                    id="form-software-turma"
                                    type="text"
                                    maxLength={120}
                                    value={formSoftwareTurma}
                                    onChange={e => setFormSoftwareTurma(e.target.value)}
                                    placeholder="Ex.: RayScan"
                                    className="w-full border border-gray-300 dark:border-slate-700 rounded px-3 py-2 bg-white dark:bg-slate-850 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                                />
                            </div>
                        </div>
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
                        <div className="flex flex-col gap-2">
                            <div>
                                <h4 className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wide">Atribuições</h4>
                                <p className="mt-1 text-[10px] text-gray-500 dark:text-slate-400">Selecione uma pessoa ativa e sua função na turma.</p>
                            </div>
                            <div className="space-y-2 rounded border border-gray-300 bg-white p-2 dark:border-slate-700 dark:bg-slate-850">
                                {selectedInstructors.map(instructorId => (
                                    <div key={instructorId} className="flex flex-wrap items-center gap-2 rounded bg-slate-50 p-2 dark:bg-slate-800">
                                        <span className="min-w-[140px] flex-1 text-xs font-medium text-slate-800 dark:text-slate-200">{getInstructorName(instructorId)}</span>
                                        <select
                                            aria-label={`Função de ${getInstructorName(instructorId)}`}
                                            value={selectedInstructorFunctions[instructorId] || InstructorFuncao.INSTRUTOR_TUTOR}
                                            onChange={(event) => setSelectedInstructorFunctions((current) => ({ ...current, [instructorId]: event.target.value as InstructorFuncao }))}
                                            className="rounded border border-gray-300 bg-white px-2 py-1.5 text-xs text-slate-900 focus:border-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                        >
                                            <option value={InstructorFuncao.INSTRUTOR_TUTOR}>Instrutor/Tutor</option>
                                            <option value={InstructorFuncao.CONVIDADO}>Convidado</option>
                                            <option value={InstructorFuncao.APLICADOR_PROVA}>Aplicador de Prova</option>
                                        </select>
                                        <button type="button" aria-label={`Remover ${getInstructorName(instructorId)}`} onClick={() => handleRemoveInstructor(instructorId)} className="rounded p-1 text-gray-400 hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:text-slate-500 dark:hover:text-red-400">
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                ))}
                                <select
                                    id="form-instructors-add-select"
                                    value=""
                                    aria-label="Adicionar pessoa à atribuição"
                                    onChange={(event) => {
                                        const value = event.target.value;
                                        if (value && !selectedInstructors.includes(value)) {
                                            setSelectedInstructors((current) => [...current, value]);
                                            setSelectedInstructorFunctions((current) => ({ ...current, [value]: InstructorFuncao.INSTRUTOR_TUTOR }));
                                        }
                                    }}
                                    className="w-full border-none bg-transparent p-1 text-sm text-slate-900 outline-none dark:text-white"
                                >
                                    <option value="">Selecione uma pessoa...</option>
                                    {assignmentPeople.map((person) => <option key={person.id} value={person.id}>{person.nome}</option>)}
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
                                        {applicatorPeople.map(
                                            person => (<option key={person.id} value={person.id}>{person.nome}</option>)
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
                        disabled={isCreating || isUpdating}
                        className="px-4 py-2 bg-teal-500 hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-60 text-slate-900 font-bold rounded text-xs transition-colors shadow-sm cursor-pointer">{isCreating || isUpdating ? 'Salvando...' : 'Salvar Turma'}
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

            <ClassDeadlineAlertModal
                isOpen={isDeadlineAlertModalOpen}
                classes={deadlineModalClasses}
                onClose={() => setIsDeadlineAlertModalOpen(false)}
            />

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
                        description: "Use o menu de ações de cada linha para editar, cancelar ou excluir uma turma. O cancelamento preserva o registro. A tabela também permite controlar as colunas visíveis e exportar os dados.",
                        icon: <MoreVertical className="h-4 w-4" aria-hidden="true" />
                    }
                ]}
            />

            <ConfirmDeleteModal
                isOpen={!!selectedClassToLaunch}
                onClose={() => setSelectedClassToLaunch(null)}
                onConfirm={handleConfirmNotaLancada}
                itemName={selectedClassToLaunch?.id_anac}
                isPending={isUpdating}
                variant="launch"
            />

            <ConfirmDeleteModal
                isOpen={!!classToCancel}
                onClose={() => setClassToCancel(null)}
                onConfirm={async () => {
                    if (!classToCancel || cancelClassSubmitRef.current || isCancelling) return;
                    cancelClassSubmitRef.current = true;
                    try {
                        await cancelClass(classToCancel.id);
                    } catch (err) {
                        console.error(err);
                    } finally {
                        cancelClassSubmitRef.current = false;
                        setClassToCancel(null);
                    }
                }}
                itemName={classToCancel?.id_anac}
                isPending={isCancelling}
                variant="cancel"
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
                            disabled={isDeleting}
                            onClick={async () => {
                                if (!classToDelete || deleteClassSubmitRef.current || isDeleting)
                                    return;
                                deleteClassSubmitRef.current = true;

                                try {
                                    await deleteClass(classToDelete.id);
                                } catch (err) {
                                    console.error(err);
                                } finally {
                                    deleteClassSubmitRef.current = false;
                                    setClassToDelete(null);
                                }
                            }}
                            className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-60 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm cursor-pointer">{isDeleting ? 'Excluindo...' : 'Confirmar Exclusão'}
                                          </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

export default Dashboard;