import { getAttendancePeriodsForShift } from '../utils/attendanceRules';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect, useRef } from 'react';
import { jsPDF } from 'jspdf';
import {
  ArrowLeft,
  Users,
  CalendarDays,
  PlaneTakeoff,
  FolderOpen,
  UserPlus,
  FileDown,
  Printer,
  CheckCircle2,
  X,
  FileText,
  Mail,
  Phone,
  Check,
  AlertCircle,
  Clock,
  Copy,
  ExternalLink,
  ClipboardCheck,
  Eye,
  Info,
  AlertTriangle,
  XCircle,
  Home,
  Contact,
  FileCheck2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Trash2,
  MoreVertical,
  Edit2,
  ClipboardList,
  Search,
} from 'lucide-react';
import { useClassDetails } from '../hooks/useClasses';
import { useUsers } from '../hooks/useUsers';
import { usePeople } from '../hooks/usePeople';
import { useCourses } from '../hooks/useCourses';
import { useCompanies } from '../hooks/useCompanies';
import { useDocuments } from '../hooks/useDocuments';
import { useUIStore } from '../store/uiStore';
import { useAudit } from '../hooks/useAudit';
import { Modal } from '../components/ui/Modal';
import { SlidePanel } from '../components/ui/SlidePanel';
import { FolderIcon } from '../components/ui/FolderIcon';
import { PasswordModal } from '../components/ui/PasswordModal';
import { SharedDocumentsPanel } from '../components/SharedDocumentsPanel';
import { StudentDetailsPanel } from '../components/StudentDetailsPanel';
import { DocumentAccessGrant } from '../services/documentAccessService';
import type { Matricula } from '../types';

import { CreateMenu } from '../components/ui/CreateMenu';
import { StudentRegistrationModal } from '../components/StudentRegistrationModal';

const parseClassDate = (value: unknown): Date | null => {
  if (typeof value !== 'string' || !value.trim()) return null;
  const datePart = value.slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
  if (!match) return null;
  const date = new Date(`${datePart}T12:00:00`);
  if (Number.isNaN(date.getTime()) || date.getFullYear() !== Number(match[1]) || date.getMonth() + 1 !== Number(match[2]) || date.getDate() !== Number(match[3])) return null;
  return date;
};

const formatClassDate = (value: unknown, options?: Intl.DateTimeFormatOptions) => {
  const date = parseClassDate(value);
  return date ? date.toLocaleDateString('pt-BR', options) : 'Data não informada';
};

const parseFinalResult = (value: unknown): number | null => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
};

const renderExamStatus = (nota: number | null | undefined, res: string | null | undefined, isSecondCh: boolean) => {
  if (typeof nota === 'number' && Number.isFinite(nota)) {
    if (nota >= 7.0) {
      return (
        <div className="flex items-center justify-center text-emerald-600 dark:text-emerald-400" title={`Nota: ${nota.toFixed(1)}`}>
          <CheckCircle2 className="w-5 h-5" />
        </div>
      );
    } else {
      return (
        <div className="flex items-center justify-center text-red-600 dark:text-red-400" title={`Nota: ${nota.toFixed(1)}`}>
          <XCircle className="w-5 h-5" />
        </div>
      );
    }
  } else {
    // Nota is undefined
    if (res === 'Pendente' && isSecondCh) {
      return (
        <div className="flex items-center justify-center text-amber-600 dark:text-amber-400" title="Aguardando / Pendente">
          <AlertTriangle className="w-5 h-5" />
        </div>
      );
    }
    return <span className="text-gray-400 dark:text-slate-600 font-sans font-medium">—</span>;
  }
};

export function NotaInput({ value, onChange, disabled = false }: { value?: number | null, onChange: (val: number | null) => void; disabled?: boolean }) {
  const [localVal, setLocalVal] = useState(value !== undefined && value !== null ? String(value).replace('.', ',') : '');

  useEffect(() => {
    setLocalVal(value !== undefined && value !== null ? String(value).replace('.', ',') : '');
  }, [value]);

  return (
    <input
      type="text"
      value={localVal}
      disabled={disabled}
      onChange={(e) => {
        let val = e.target.value.replace(/[^0-9,]/g, '');
        if (val.includes(',')) {
          const parts = val.split(',');
          val = parts[0] + ',' + parts.slice(1).join('');
        }
        setLocalVal(val);
      }}
      onBlur={() => {
        let num = parseFloat(localVal.replace(',', '.'));
        if (localVal === '') {
          onChange(null);
        } else if (!isNaN(num)) {
          if (num > 10) num = 10;
          onChange(num);
          setLocalVal(String(num).replace('.', ','));
        } else {
          setLocalVal(value !== undefined && value !== null ? String(value).replace('.', ',') : '');
        }
      }}
      className="w-16 mx-auto px-2 py-1 text-center border border-gray-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:cursor-wait disabled:opacity-60"
      placeholder="0,0"
      aria-label="Nota"
    />
  );
}

function ClassDetails() {
  const { selectedClassId, setRoute, setSelectedClassId, userLogged } = useUIStore();
  const isInstructor = userLogged?.role === 'INSTRUTOR';
  const { createLog } = useAudit();
  const [studentPage, setStudentPage] = useState(1);
  const [studentPageSize] = useState(10);
  const [studentSearch, setStudentSearch] = useState('');
  const [sortOrder, setSortOrder] = useState('az');
  const attendanceHoldTimerRef = useRef<number | null>(null);
  const attendanceHoldAnimationRef = useRef<number | null>(null);
  const attendanceHoldKeyRef = useRef<string | null>(null);
  const attendanceHoldPointerTargetRef = useRef<HTMLButtonElement | null>(null);
  const attendanceHoldCompletedRef = useRef(false);
  const [attendanceHold, setAttendanceHold] = useState<{ key: string; progress: number } | null>(null);

  const cancelAttendanceHold = () => {
    if (attendanceHoldTimerRef.current !== null) {
      window.clearTimeout(attendanceHoldTimerRef.current);
      attendanceHoldTimerRef.current = null;
    }
    if (attendanceHoldAnimationRef.current !== null) {
      window.cancelAnimationFrame(attendanceHoldAnimationRef.current);
      attendanceHoldAnimationRef.current = null;
    }
    attendanceHoldKeyRef.current = null;
    attendanceHoldPointerTargetRef.current = null;
    attendanceHoldCompletedRef.current = false;
    setAttendanceHold(null);
  };

  const startAttendanceHold = (key: string, action: () => void, pointerTarget?: HTMLButtonElement) => {
    cancelAttendanceHold();
    const startedAt = performance.now();
    attendanceHoldKeyRef.current = key;
    attendanceHoldPointerTargetRef.current = pointerTarget ?? null;
    attendanceHoldCompletedRef.current = false;

    const updateProgress = (now: number) => {
      if (attendanceHoldKeyRef.current !== key || attendanceHoldCompletedRef.current) return;
      const progress = Math.min((now - startedAt) / 1000, 1);
      setAttendanceHold({ key, progress });
      if (progress < 1) {
        attendanceHoldAnimationRef.current = window.requestAnimationFrame(updateProgress);
      }
    };

    attendanceHoldTimerRef.current = window.setTimeout(() => {
      if (attendanceHoldKeyRef.current !== key) return;
      attendanceHoldCompletedRef.current = true;
      if (attendanceHoldAnimationRef.current !== null) {
        window.cancelAnimationFrame(attendanceHoldAnimationRef.current);
        attendanceHoldAnimationRef.current = null;
      }
      setAttendanceHold(null);
      attendanceHoldKeyRef.current = null;
      const pointerTarget = attendanceHoldPointerTargetRef.current;
      attendanceHoldPointerTargetRef.current = null;
      pointerTarget?.blur();
      action();
    }, 1000);
    attendanceHoldAnimationRef.current = window.requestAnimationFrame(updateProgress);
  };

  useEffect(() => () => cancelAttendanceHold(), []);

  const {
    classData,
    isLoadingClass,
    isLoadingMatriculas,
    isFetchingMatriculas,
    isLoadingDiario,
    isLoadingInstructors,
    matriculas,
    matriculasTotal,
    allMatriculas,
    isLoadingAllMatriculas,
    matriculatedAlunoIds,
    diario,
    createMatricula,
    isCreatingMatricula,
    updateMatricula,
    deleteMatricula,
    isDeletingMatricula,
    saveDiarioPresenca,
    isSavingDiario,
  } = useClassDetails(selectedClassId, {
    page: studentPage,
    pageSize: studentPageSize,
    sortOrder,
    search: studentSearch,
  });

  const { courses } = useCourses();
  const { users } = useUsers();
  const { people: studentPeople } = usePeople({ studentOnly: true, activeOnly: true });
  const { companies } = useCompanies();
  const { documents, updateDocument, isLoading: isLoadingDocuments } = useDocuments();
  const directoryStudents = useMemo(() => studentPeople.map((person) => {
    const profile = users.find((user) => user.id === person.id || user.id === person.profile_legacy_id);
    return profile ?? {
      id: person.id,
      nome_completo: person.nome,
      cpf: person.cpf ?? '',
      email: '',
      telefone: '',
      role: 'ALUNO' as const,
      termo_lgpd_aceite: false,
      data_aceite_lgpd: null,
      status: 'ativo' as const,
    };
  }), [studentPeople, users]);
  const findStudent = (studentId: string) => users.find((user) => user.id === studentId) ?? directoryStudents.find((student) => student.id === studentId);

  useEffect(() => {
    if (isInstructor && selectedClassId && !isLoadingClass && !classData) {
      setSelectedClassId(null);
      setRoute('dashboard');
    }
  }, [classData, isInstructor, isLoadingClass, selectedClassId, setRoute, setSelectedClassId]);

  // Selected tab state
  const [activeTab, setActiveTab] = useState<'students' | 'frequency' | 'visit' | 'ged' | 'grades'>('students');

  useEffect(() => {
    setStudentPage(1);
  }, [studentSearch, sortOrder, selectedClassId]);

  useEffect(() => {
    const lastPage = Math.max(1, Math.ceil(matriculasTotal / studentPageSize));
    if (studentPage > lastPage) setStudentPage(lastPage);
  }, [matriculasTotal, studentPage, studentPageSize]);

  // Selected student for documents drawer (Tela Documentos do Aluno - Airport)
  const [selectedStudentForDocs, setSelectedStudentForDocs] = useState<any | null>(null);
  const [detailsPanelOpen, setDetailsPanelOpen] = useState(false);
  const [selectedStudentForDetails, setSelectedStudentForDetails] = useState<any | null>(null);
  const [selectedStudentForEdit, setSelectedStudentForEdit] = useState<any | null>(null);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [documentsPanelOpen, setDocumentsPanelOpen] = useState(false);
  const [accessGrant, setAccessGrant] = useState<DocumentAccessGrant | null>(null);

  const handleOpenDocuments = (student: any) => {
    if (isInstructor) return;
    setAccessGrant(null);
    setSelectedStudentForDocs(student);
    setPasswordModalOpen(true);
  };

  const handlePasswordConfirm = (grant: DocumentAccessGrant) => {
    setAccessGrant(grant);
    setDocumentsPanelOpen(true);
  };


  // Selection & Actions
  const [openMenuStudentId, setOpenMenuStudentId] = useState<string | null>(null);
  useEffect(() => {
    const handleGlobalClick = () => setOpenMenuStudentId(null);
    if (openMenuStudentId) {
      document.addEventListener('click', handleGlobalClick);
    }
    return () => document.removeEventListener('click', handleGlobalClick);
  }, [openMenuStudentId]);


  // Modal Geração de Documentos (Tela 2.6)
  const [generateDocOpen, setGenerateDocOpen] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState('1');

  // Modal Novo Aluno
  const [addStudentOpen, setAddStudentOpen] = useState(false);
  const [registrationModalOpen, setRegistrationModalOpen] = useState(false);
  const [selectedAlunoId, setSelectedAlunoId] = useState('');
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [isStudentDropdownOpen, setIsStudentDropdownOpen] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [formSoftware, setFormSoftware] = useState('AeroFS');
  const addStudentSubmitRef = useRef(false);
  const deleteMatriculaSubmitRef = useRef(false);
  const [pendingGrades, setPendingGrades] = useState<Record<string, { nota1: number | null; nota2: number | null }>>({});
  const [savingGradeId, setSavingGradeId] = useState<string | null>(null);
  const [gradeError, setGradeError] = useState<string | null>(null);

  // Discard Confirmation state for dirty student enrollment modal
  const [showStudentDiscardConfirm, setShowStudentDiscardConfirm] = useState(false);
  const [matriculaToDelete, setMatriculaToDelete] = useState<{ id: string; studentName: string } | null>(null);

  const isStudentFormDirty = useMemo(() => {
    return !!(selectedAlunoId || selectedCompanyId || (formSoftware !== 'AeroFS' && formSoftware !== ''));
  }, [selectedAlunoId, selectedCompanyId, formSoftware]);

  const handleCloseStudentModal = () => {
    if (isStudentFormDirty) {
      setShowStudentDiscardConfirm(true);
    } else {
      setAddStudentOpen(false);
    }
  };

  const handleForceCloseStudentModal = () => {
    setSelectedAlunoId('');
    setSelectedCompanyId('');
    setFormSoftware('AeroFS');
    setShowStudentDiscardConfirm(false);
    setAddStudentOpen(false);
  };

  // Visita Técnica State (Tela 2.9)
  const [visitEmails, setVisitEmails] = useState('representantes@riogaleao.com.br; diretoria@aeroporto.gov.br');
  const [visitPhone, setVisitPhone] = useState('(21) 3398-5000');
  const [visitSent, setVisitSent] = useState(false);


  const handleGeneratePDF = () => {
    if (!classData) return;

    // Create a new A4 PDF
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Set page font to clean helvetica
    doc.setFont('helvetica', 'normal');

    // Draw Title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('SOLICITAÇÃO DE VISITA TÉCNICA', 105, 25, { align: 'center' });

    // Draw Subtitle / Reference
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 100, 100);
    doc.text('REFERÊNCIA: IS Nº 110', 105, 31, { align: 'center' });

    // Horizontal Divider line
    doc.setLineWidth(0.5);
    doc.setDrawColor(0, 0, 0);
    doc.line(15, 36, 195, 36);

    // Credentials Grid
    doc.setTextColor(120, 120, 120);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('INSTRUTOR RESPONSÁVEL', 15, 46);
    doc.text('DATA PREVISTA', 110, 46);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Cmte. Roberto Silva', 15, 51);
    
    const formattedDate = formatClassDate(classData.data_termino, {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    doc.text(formattedDate, 110, 51);

    doc.setTextColor(120, 120, 120);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('BASE ORIGEM', 15, 60);
    doc.text('BASE DESTINO', 110, 60);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('São Paulo (CGH)', 15, 65);
    doc.text('Campinas (VCP)', 110, 65);

    // Introductory text block
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(50, 50, 50);
    
    const introText = `Vimos por meio deste solicitar a autorização para a realização de visita técnica nas instalações aeroportuárias, conforme requisitos estabelecidos pela instrução suplementar IS nº 110. A relação dos alunos ativos na turma ${classData.id_anac} segue abaixo para credenciamento e emissão de badges de acesso temporário.`;
    const splitIntro = doc.splitTextToSize(introText, 180);
    doc.text(splitIntro, 15, 75);

    // Adjust Y coordinate after intro paragraph (approx 3 lines of text)
    let y = 75 + (splitIntro.length * 5) + 8;

    // Student list table header
    doc.setFillColor(245, 247, 250);
    doc.rect(15, y, 180, 8, 'F');
    
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Nº', 20, y + 5.5, { align: 'center' });
    doc.text('Nome do Aluno', 30, y + 5.5);
    doc.text('ANAC / CPF', 110, y + 5.5);
    doc.text('Status Documental', 160, y + 5.5);

    // Draw bottom line under table header
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.line(15, y + 8, 195, y + 8);

    y += 8;

    // Get current students (similar to layout logic)
    const defaultList = [
      { num: '01', name: 'Ana Clara Mendes', cpf: '123.456-7', status: 'REGULAR' },
      { num: '02', name: 'Carlos Eduardo Souza', cpf: '987.654-3', status: 'REGULAR' },
      { num: '03', name: 'Fernanda Lima', cpf: '456.789-0', status: 'PENDENTE CNH' },
      { num: '04', name: 'João Pedro Alves', cpf: '321.654-9', status: 'REGULAR' },
      { num: '05', name: 'Mariana Costa', cpf: '789.123-4', status: 'REGULAR' },
      { num: '06', name: 'Rafael Gomes', cpf: '159.753-8', status: 'REGULAR' },
      { num: '07', name: 'Sofia Ribeiro', cpf: '357.951-2', status: 'REGULAR' },
    ];

    const visitStudents = allMatriculas.length > 0
      ? allMatriculas.slice(0, 7).map((m, idx) => {
          const student = findStudent(m.aluno_id);
          const codeAnac = m.anac_codigo || student?.cpf?.substring(0, 7) || '123.456-7';
          const isPending = m.percentual_presenca < 75 || idx === 2;
          return {
            num: String(idx + 1).padStart(2, '0'),
            name: student?.nome_completo || 'Aluno ' + (idx + 1),
            cpf: student?.cpf ? student.cpf.substring(0, 3) + '.' + student.cpf.substring(3, 6) + '-' + student.cpf.substring(6, 7) : codeAnac,
            status: isPending ? 'PENDENTE CNH' : 'REGULAR'
          };
        })
      : defaultList;

    const totalAlunos = allMatriculas.length > 0 ? allMatriculas.length : 30;
    const excessStudentsCount = totalAlunos > 7 ? totalAlunos - 7 : 23;

    // Draw student rows
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(50, 50, 50);

    visitStudents.forEach((item) => {
      // Background shading for table row
      doc.setFillColor(255, 255, 255);
      doc.rect(15, y, 180, 8, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(120, 120, 120);
      doc.text(item.num, 20, y + 5.5, { align: 'center' });

      doc.setTextColor(0, 0, 0);
      doc.text(item.name, 30, y + 5.5);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      doc.text(item.cpf, 110, y + 5.5);

      if (item.status === 'REGULAR') {
        doc.setTextColor(0, 128, 96);
      } else {
        doc.setTextColor(181, 129, 0);
      }
      doc.setFont('helvetica', 'bold');
      doc.text(item.status, 160, y + 5.5);

      // Draw light horizontal divider
      doc.setDrawColor(230, 230, 230);
      doc.line(15, y + 8, 195, y + 8);
      
      y += 8;
    });

    // Ellipsis message for rest of students
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.text(`... e mais ${excessStudentsCount} alunos listados no documento completo.`, 15, y + 6);

    // Draw signature lines at the bottom (y=250)
    const sigY = 250;
    doc.setLineWidth(0.3);
    doc.setDrawColor(180, 180, 180);
    
    // Gestor da Turma Line & Text
    doc.line(15, sigY, 95, sigY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text('GESTOR DA TURMA', 55, sigY + 5, { align: 'center' });

    // Responsável Base Line & Text
    doc.line(115, sigY, 195, sigY);
    doc.text('RESPONSÁVEL BASE', 155, sigY + 5, { align: 'center' });

    // Trigger PDF download
    doc.save(`Oficio_Solicitacao_Visita_Tecnica_Turma_${classData.id_anac}.pdf`);
  };

  // Active course
  const course = useMemo(() => {
    return courses.find((c) => c.id === classData?.curso_id);
  }, [courses, classData]);

  // Alunos candidates for adding
  const availableStudents = useMemo(() => {
    return directoryStudents.filter((student) => !matriculatedAlunoIds.includes(student.id));
  }, [directoryStudents, matriculatedAlunoIds]);

  // Dates list for frequency table based on start and end dates
  const classDates = useMemo(() => {
    if (!classData) return [];
    const dates = [];
    const start = parseClassDate(classData.data_inicio);
    const end = parseClassDate(classData.data_termino);
    if (!start || !end || start > end) return dates;

    // Gen dates day by day
    const current = new Date(start);
    while (current <= end) {
      dates.push([
        current.getFullYear(),
        String(current.getMonth() + 1).padStart(2, '0'),
        String(current.getDate()).padStart(2, '0'),
      ].join('-'));
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }, [classData]);

  
  // Sessions list for frequency table based on dates and shift
  const classSessions = useMemo(() => {
    if (!classData) return [];
    const sessions = [];
    const start = parseClassDate(classData.data_inicio);
    const end = parseClassDate(classData.data_termino);
    if (!start || !end || start > end) return sessions;

    const periods = getAttendancePeriodsForShift(classData.turno);

    // Gen dates day by day
    const current = new Date(start);
    while (current <= end) {
      const dateStr = [
        current.getFullYear(),
        String(current.getMonth() + 1).padStart(2, '0'),
        String(current.getDate()).padStart(2, '0'),
      ].join('-');
      
      periods.forEach(period => {
        sessions.push({ dateStr, period });
      });
      
      current.setDate(current.getDate() + 1);
    }
    return sessions;
  }, [classData]);

  const handleExportFrequencyCSV = () => {
    if (!classData) return;
    const escapeCsv = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const headers = ['Turma', 'Matricula', 'Aluno', 'RE', 'Data', 'Período', 'Presente', 'Percentual de presença'];
    const rows = allMatriculas.flatMap((matricula) => classSessions.map(({ dateStr, period }) => {
      const attendance = diario.find((record) =>
        record.matricula_id === matricula.id && record.data_aula === dateStr && record.horario_periodo === period
      );
      return [
        classData.id,
        matricula.id,
        matricula.aluno_id,
        matricula.codigo_re,
        dateStr,
        period,
        attendance?.presente === true ? 'Sim' : 'Não',
        matricula.percentual_presenca,
      ].map(escapeCsv).join(';');
    }));
    const csvContent = '\ufeff' + [headers.map(escapeCsv).join(';'), ...rows].join('\n');
    const url = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `frequencia_${classData.id_anac || classData.id}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Generate Document Action (Tela 2.6)
  const handleGenerateDoc = () => {
    if (isInstructor) return;
    const docsMap: { [key: string]: string } = {
      '1': 'Programação Semanal',
      '2': 'Regulamento do Curso',
      '3': 'Formulário de Avaliação de Reação',
      '4': 'Roteiro Preparatório',
      '5': 'ATA de Aplicação de Prova',
      '6': 'Informações de Interposição de Recursos',
      '7': 'Grade Curricular',
      '8': 'Termo de Responsabilidade',
      '9': 'Lista de Frequência',
      '10': 'Lista de Recebimento de Material',
    };

    const docName = docsMap[selectedDocType] || 'Documento Acadêmico';
    
    // Log Audit Trail
    createLog({
      usuario_id: 'user-admin-1',
      acao: `Gerou documento de automação "${docName}" para a turma ${classData?.id_anac}`,
      tabela_afetada: 'turmas',
      registro_id: classData?.id || '',
      ip_address: '189.120.45.67'
    });

    alert(`Sucesso! Documento "${docName}" compilado e gerado em PDF com assinatura ICP-Brasil.`);
    setGenerateDocOpen(false);
  };

  // Add Student Action
  const handleAddStudentSubmit = async () => {
    if (isInstructor || addStudentSubmitRef.current || isCreatingMatricula) return;
    if (!selectedAlunoId || !classData?.id) {
      alert('Selecione um aluno da lista.');
      return;
    }
    if (!availableStudents.some((student) => student.id === selectedAlunoId)) {
      setSelectedAlunoId('');
      alert('Selecione um aluno ativo disponível na lista.');
      return;
    }
    addStudentSubmitRef.current = true;

    try {
      await createMatricula({
        aluno_id: selectedAlunoId,
        turma_id: classData?.id || '',
        empresa_b2b_id: selectedCompanyId || undefined,
        software_utilizado: formSoftware,
        status_matricula: 'Ativo',
      });

      // Log in audit
      const studentName = users.find(u => u.id === selectedAlunoId)?.nome_completo || 'Aluno';
      createLog({
        usuario_id: 'user-admin-1',
        acao: `Matriculou aluno "${studentName}" na turma ${classData?.id_anac}`,
        tabela_afetada: 'matriculas',
        registro_id: classData?.id || '',
        ip_address: '189.120.45.67'
      });

      setAddStudentOpen(false);
      setSelectedAlunoId('');
      setSelectedCompanyId('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Não foi possível matricular o aluno.';
      alert(message.includes('já está matriculado') ? message : 'Não foi possível matricular o aluno. Tente novamente.');
    } finally {
      addStudentSubmitRef.current = false;
    }
  };

  const handleGradeDraftChange = (matricula: Matricula, field: 'nota1' | 'nota2', value: number | null) => {
    setGradeError(null);
    setPendingGrades((current) => {
      const existing = current[matricula.id] ?? {
        nota1: matricula.nota_1_chamada ?? null,
        nota2: matricula.nota_2_chamada ?? null,
      };
      return {
        ...current,
        [matricula.id]: { ...existing, [field]: value },
      };
    });
  };

  const handleGradeCancel = (matriculaId: string) => {
    setPendingGrades((current) => {
      const next = { ...current };
      delete next[matriculaId];
      return next;
    });
    setGradeError(null);
  };

  const handleGradeConfirm = async (matricula: Matricula) => {
    const draft = pendingGrades[matricula.id];
    if (!draft || savingGradeId) return;

    setSavingGradeId(matricula.id);
    setGradeError(null);
    const maxNota = [draft.nota1, draft.nota2].filter((nota): nota is number => typeof nota === 'number' && Number.isFinite(nota)).reduce<number | null>(
      (highest, nota) => highest === null ? nota : Math.max(highest, nota),
      null,
    );
    const resultado = maxNota === null ? (matricula.percentual_presenca === 0 ? 'Falta' : null) : maxNota >= 7 ? 'Aprovado' : 'Reprovado';
    const resultadoFinal = maxNota === null ? (matricula.percentual_presenca === 0 ? 'Reprovado' : null) : maxNota >= 7 && matricula.percentual_presenca >= 80 ? 'Aprovado' : 'Reprovado';

    try {
      await updateMatricula({
        id: matricula.id,
        updates: {
          nota_1_chamada: draft.nota1,
          nota_2_chamada: draft.nota2,
          resultado_final: maxNota,
          status_resultado: resultado,
          status_resultado_final: resultadoFinal,
        } as Partial<Matricula>,
      });
      setPendingGrades((current) => {
        const next = { ...current };
        delete next[matricula.id];
        return next;
      });
    } catch (error) {
      setGradeError(error instanceof Error ? error.message : 'Não foi possível salvar a nota.');
    } finally {
      setSavingGradeId(null);
    }
  };

  // Filter documents that belong to students in this class
  const classDocuments = useMemo(() => {
    const studentIds = allMatriculas.map((m) => m.aluno_id);
    return documents.filter((doc) => studentIds.includes(doc.usuario_id));
  }, [documents, allMatriculas]);



  return (
    <div id="class-details-page" className="flex-1 flex flex-col p-6 gap-6 overflow-y-auto">
      {/* Header and Back Button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 dark:border-slate-800 pb-4 shrink-0 font-sans">
        <div className="flex items-center gap-3">
          <button
            id="btn-back-to-dashboard"
            onClick={() => {
              setSelectedClassId(null);
              setRoute('dashboard');
            }}
            className="p-2 border border-gray-300 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 text-gray-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-teal-500/10 text-teal-600 dark:text-teal-400 font-mono text-xs font-bold px-2 py-0.5 rounded border border-teal-500/20">
                {isLoadingClass ? <div className="w-16 h-4 bg-teal-500/20 animate-pulse rounded"></div> : classData?.id_anac}
              </span>
              <span className="text-gray-400">/</span>
              <span className="text-xs font-mono text-gray-500 dark:text-slate-400">
                {isLoadingClass ? <div className="w-32 h-4 bg-gray-200 dark:bg-slate-700 animate-pulse rounded"></div> : `ID Interno: T-OP-${classData?.id_interno_escola}`}
              </span>
            </div>
            <h2 className="font-display text-xl md:text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {isLoadingClass ? <div className="w-64 h-8 bg-slate-200 dark:bg-slate-700 animate-pulse rounded mt-1"></div> : (course?.nome_curso || 'Curso de Capacitação')}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isInstructor && (<button
            id="btn-open-doc-generator"
            onClick={() => setGenerateDocOpen(true)}
            className="bg-[#0a192f] dark:bg-slate-950 hover:bg-[#112240] text-white px-4 py-2.5 rounded-lg font-bold text-xs flex items-center gap-2 cursor-pointer shadow-md transition-colors border border-[#112240] dark:border-slate-850"
          >
            <FileDown className="w-4 h-4 text-teal-400" />
            Gerar Documentos PDFs
          </button>)}
        </div>
      </div>

      {/* Navigation tabs for Details Screen */}
      <div className="flex border-b border-gray-200 dark:border-slate-800 gap-6 shrink-0 font-sans">
        <button
          id="tab-students"
          onClick={() => setActiveTab('students')}
          className={`pb-3 font-semibold text-sm transition-colors relative cursor-pointer ${
            activeTab === 'students'
              ? 'text-teal-600 dark:text-teal-400 border-b-2 border-teal-500'
              : 'text-gray-500 hover:text-gray-800 dark:hover:text-white'
          }`}
        >
          <span className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Alunos Matriculados
          </span>
        </button>

        <button
          id="tab-frequency"
          onClick={() => setActiveTab('frequency')}
          className={`pb-3 font-semibold text-sm transition-colors relative cursor-pointer ${
            activeTab === 'frequency'
              ? 'text-teal-600 dark:text-teal-400 border-b-2 border-teal-500'
              : 'text-gray-500 hover:text-gray-800 dark:hover:text-white'
          }`}
        >
          <span className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4" />
            Diário / Frequência
          </span>
        </button>

        {!isInstructor && (<button
          id="tab-visit"
          onClick={() => setActiveTab('visit')}
          className={`pb-3 font-semibold text-sm transition-colors relative cursor-pointer ${
            activeTab === 'visit'
              ? 'text-teal-600 dark:text-teal-400 border-b-2 border-teal-500'
              : 'text-gray-500 hover:text-gray-800 dark:hover:text-white'
          }`}
        >
          <span className="flex items-center gap-2">
            <PlaneTakeoff className="w-4 h-4" />
            Visita Técnica
          </span>
        </button>)}

        {!isInstructor && (<button
          id="tab-ged"
          onClick={() => setActiveTab('ged')}
          className={`pb-3 font-semibold text-sm transition-colors relative cursor-pointer ${
            activeTab === 'ged'
              ? 'text-teal-600 dark:text-teal-400 border-b-2 border-teal-500'
              : 'text-gray-500 hover:text-gray-800 dark:hover:text-white'
          }`}
        >
          <span className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4" />
            Documentos GED
          </span>
        </button>)}

        <button
          id="tab-grades"
          onClick={() => setActiveTab('grades')}
          className={`pb-3 font-semibold text-sm transition-colors relative cursor-pointer ${
            activeTab === 'grades'
              ? 'text-teal-600 dark:text-teal-400 border-b-2 border-teal-500'
              : 'text-gray-500 hover:text-gray-800 dark:hover:text-white'
          }`}
        >
          <span className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4" />
            Notas
          </span>
        </button>
      </div>

      {/* TAB CONTENT */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* --- ABA 1: ALUNOS MATRICULADOS --- */}
        {activeTab === 'students' && (
          <div className="flex-1 flex flex-col gap-4 min-h-0">
            {/* Actions Panel inside Tab */}
            <div className="flex flex-wrap items-center justify-between gap-4 shrink-0 font-sans">
              <div className="flex items-center gap-6">
                {!isInstructor && (<CreateMenu
                  onSelect={(label) => {
                    if (label === 'Adicionar aluno existente') {
                      setAddStudentOpen(true);
                    } else if (label === 'Cadastrar novo aluno') {
                      setRegistrationModalOpen(true);
                    }
                  }}
                />)}
                <label className="relative">
                  <span className="sr-only">Buscar alunos matriculados</span>
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="search"
                    value={studentSearch}
                    onChange={(event) => setStudentSearch(event.target.value)}
                    placeholder="Buscar por nome ou CPF..."
                    className="w-64 pl-8 pr-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-850 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </label>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-white dark:bg-slate-850 border border-gray-200 dark:border-slate-700 rounded-lg px-2 py-1">
                  <span className="text-xs font-semibold text-gray-500 dark:text-slate-400 pl-1">Ordenar:</span>
                  <select
                    aria-label="Ordenar alunos matriculados"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 outline-none cursor-pointer focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="az">Ordem Alfabética (A-Z)</option>
                    <option value="za">Ordem Alfabética (Z-A)</option>
                    <option value="newest">Mais recentes</option>
                    <option value="oldest">Mais antigos</option>
                  </select>
                </div>
                <div className="text-xs text-slate-950 dark:text-slate-100 font-bold bg-slate-50 dark:bg-slate-850 px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-800 flex items-center gap-2 shadow-xs">
                  <Users className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  Contagem: {matriculasTotal} Alunos
                </div>
              </div>
            </div>

            {/* High Density Table for Grades (Substitute TURMA sheet) */}
            <div className="flex-1 border border-gray-250 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 flex flex-col shadow-sm min-h-[250px]">
              <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
                <table className="w-full text-left border-collapse whitespace-nowrap text-xs">
                  <thead className="sticky top-0 bg-slate-50 dark:bg-slate-850 z-10 border-b border-gray-250 dark:border-slate-800 font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3 w-10 text-center"></th>
                      <th className="px-4 py-3">RE</th>
                      <th className="px-4 py-3">TUF</th>
                      <th className="px-4 py-3">ANAC</th>
                      <th className="px-4 py-3">CPF</th>
                      <th className="px-4 py-3">Nome</th>
                      <th className="px-4 py-3 text-center">%</th>
                      <th className="px-4 py-3 text-center w-24">1ª CH</th>
                      <th className="px-4 py-3 text-center w-24">2ª CH</th>
                      <th className="px-4 py-3 text-center">Resultado</th>
                      <th className="px-4 py-3 text-center">Resultado final</th>
                      <th className="px-4 py-3 text-center">Média / Nota</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-150 dark:divide-slate-800 font-mono text-gray-700 dark:text-slate-200">
                    {isLoadingMatriculas || isFetchingMatriculas ? (
                      Array.from({ length: 5 }, (_, index) => (
                        <tr key={`student-skeleton-${index}`} aria-hidden="true" className="h-[40px]">
                          <td colSpan={13} className="px-4 py-2">
                            <div className="h-4 w-full rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
                          </td>
                        </tr>
                      ))
                    ) : matriculas.length === 0 ? (
                      <tr>
                        <td colSpan={13} className="px-4 py-12 text-center text-gray-500 font-sans">
                          <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                            <div className="p-3 bg-teal-500/10 rounded-full text-teal-500">
                              <Users className="w-6 h-6" />
                            </div>
                            <div>
                              <p className="font-bold text-sm text-slate-800 dark:text-slate-200">Nenhum aluno matriculado</p>
                              <p className="text-xs text-gray-400 mt-1 leading-normal">
                                Adicione um aluno existente ou cadastre um novo para começar.
                              </p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : matriculas.map((m) => {
                      const student = findStudent(m.aluno_id) ?? {
                        id: m.aluno_id,
                        role: 'ALUNO' as const,
                        nome_completo: m.aluno_nome || 'Aluno desconhecido',
                        cpf: m.aluno_cpf || '',
                        email: '',
                        telefone: '',
                        termo_lgpd_aceite: false,
                        data_aceite_lgpd: null,
                        status: 'ativo' as const,
                      };
                      const studentName = typeof m.aluno_nome === 'string' && m.aluno_nome.trim()
                        ? m.aluno_nome
                        : typeof student?.nome_completo === 'string' && student.nome_completo.trim()
                          ? student.nome_completo
                          : 'Aluno desconhecido';
                      const studentCpf = typeof m.aluno_cpf === 'string' && m.aluno_cpf.trim()
                        ? m.aluno_cpf
                        : typeof student?.cpf === 'string' && student.cpf.trim()
                          ? student.cpf
                          : 'CPF não informado';
                      const attendancePercentage = typeof m.percentual_presenca === 'number' && Number.isFinite(m.percentual_presenca)
                        ? m.percentual_presenca
                        : 0;
                      const finalResult = parseFinalResult(m.resultado_final);
                      const b2b = companies.find((c) => c.id === m.empresa_b2b_id);
                      const hasLogin = users.some((user) => user.id === m.aluno_id);

                      return (
                        <tr
                          key={m.id}
                          className="hover:bg-teal-500/5 dark:hover:bg-teal-500/10 transition-colors h-[40px] even:bg-slate-50/20 dark:even:bg-slate-900/10 cursor-pointer"
                          onClick={!isInstructor ? () => {
                            setSelectedStudentForDetails(student);
                            setDetailsPanelOpen(true);
                          } : undefined}
                        >
                          {/* Actions */}
                          {!isInstructor && (<td
                            className="px-4 py-2 text-center relative"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-center gap-1">
                              <div className="relative">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuStudentId(openMenuStudentId === m.id ? null : m.id);
                                  }}
                                  className="p-1 text-gray-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>
                                
                                {openMenuStudentId === m.id && (
                                  <div className="absolute left-full top-0 ml-2 w-48 bg-white dark:bg-slate-850 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 py-1 z-50">
                                    {hasLogin && <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenMenuStudentId(null);
                                        setSelectedStudentForEdit(student);
                                        setRegistrationModalOpen(true);
                                      }}
                                      className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 flex items-center gap-2"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                      Editar
                                    </button>}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenMenuStudentId(null);
                                        setMatriculaToDelete({ id: m.id, studentName });
                                      }}
                                      className="w-full text-left px-4 py-2 text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                      Remover
                                    </button>
                                  </div>
                                )}
                              </div>
                              {hasLogin && <FolderIcon onClick={(e) => { e.stopPropagation(); handleOpenDocuments(student); }} />}
                            </div>
                          </td>)}
                          {/* RE Clickable to open GED */}
                          <td className="px-4 py-2 font-bold text-teal-600 dark:text-teal-400 hover:underline">
                            {m.codigo_re}
                          </td>
                          <td className="px-4 py-2 font-sans">
                            {m.tuf || 'TUF-A'}
                          </td>
                          <td className="px-4 py-2">
                            {m.anac_codigo || '123456'}
                          </td>
                          <td className="px-4 py-2 text-gray-500 dark:text-slate-400">
                            {studentCpf}
                          </td>
                          <td className="px-4 py-2 font-sans font-bold text-slate-900 dark:text-white">
                            {studentName}
                          </td>
                          <td className="px-4 py-2 text-center font-bold">
                            <span className={attendancePercentage < 75 ? 'text-red-500' : 'text-slate-900 dark:text-slate-200'}>
                              {attendancePercentage}%
                            </span>
                          </td>
                          <td className="px-4 py-2 text-center font-semibold">
                            {typeof m.nota_1_chamada === 'number' ? m.nota_1_chamada.toFixed(1).replace('.', ',') : '—'}
                          </td>
                          <td className="px-4 py-2 text-center font-semibold">
                            {typeof m.nota_2_chamada === 'number' ? m.nota_2_chamada.toFixed(1).replace('.', ',') : '—'}
                          </td>
                          <td className="px-4 py-2 text-center font-semibold">
                            {m.status_resultado || (attendancePercentage === 0 ? 'Falta' : '—')}
                          </td>
                          <td className="px-4 py-2 text-center font-semibold">
                            {m.status_resultado_final || '—'}
                          </td>
                          <td className="px-4 py-2 text-center">
                            <div className="font-bold">
                              {finalResult === null ? '—' : finalResult.toFixed(1).replace('.', ',')}
                            </div>
                            {m.status_resultado_final && (
                              <span className={`text-[10px] font-bold uppercase ${
                                m.status_resultado_final === 'Aprovado'
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : m.status_resultado_final === 'Pendente'
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-red-600 dark:text-red-400'
                              }`}>
                                {m.status_resultado_final}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 border-t border-gray-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs font-sans">
                <span className="text-gray-500 dark:text-slate-400">
                  {matriculasTotal === 0 ? 'Exibindo 0 de 0 alunos' : `Exibindo ${(studentPage - 1) * studentPageSize + 1}-${Math.min(studentPage * studentPageSize, matriculasTotal)} de ${matriculasTotal} alunos`}
                </span>
                <div className="flex items-center border border-gray-300 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-900">
                  <button type="button" onClick={() => setStudentPage((page) => Math.max(1, page - 1))} disabled={studentPage === 1} aria-label="Página anterior de alunos" className="p-2 cursor-pointer border-r border-gray-300 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-teal-500">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: Math.max(1, Math.ceil(matriculasTotal / studentPageSize)) }).map((_, index) => (
                    <button key={index + 1} type="button" onClick={() => setStudentPage(index + 1)} aria-label={`Página ${index + 1} de alunos`} className={`px-3 py-2 cursor-pointer border-r border-gray-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500 ${studentPage === index + 1 ? 'bg-teal-500/10 text-teal-700 dark:text-teal-400 font-bold' : 'text-gray-600 dark:text-slate-300'}`}>
                      {index + 1}
                    </button>
                  ))}
                  <button type="button" onClick={() => setStudentPage((page) => Math.min(Math.max(1, Math.ceil(matriculasTotal / studentPageSize)), page + 1))} disabled={studentPage >= Math.max(1, Math.ceil(matriculasTotal / studentPageSize))} aria-label="Próxima página de alunos" className="p-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-teal-500">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- ABA 2: FREQUÊNCIA / DIÁRIO (Excel Lista de Frequência - Tela 2.5) --- */}
        {activeTab === 'frequency' && (
          <div className="flex-1 flex flex-col gap-4 min-h-0 font-sans">
            {/* Header controls matching Screenshot "Tela Diário de Classe - Airport" */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-850 rounded-xl border border-gray-200 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Month Dropdown Selector */}
                <div className="relative">
                  <button className="inline-flex items-center gap-2.5 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-750 rounded-lg px-4 py-2 text-xs font-bold text-slate-800 dark:text-white hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors cursor-pointer shadow-sm">
                    <CalendarDays className="w-4 h-4 text-gray-500 dark:text-slate-400" />
                    <span>
                      {(() => {
                        const date = parseClassDate(classData.data_inicio);
                        const months = [
                          'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                          'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
                        ];
                        return date ? `${months[date.getMonth()]} ${date.getFullYear()}` : 'Data não informada';
                      })()}
                    </span>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </button>
                </div>

                {/* Left/Right controls */}
                <div className="flex items-center border border-gray-300 dark:border-slate-750 rounded-lg bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
                  <button className="p-2 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-500 dark:text-slate-400 border-r border-gray-300 dark:border-slate-750 transition-colors cursor-pointer">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button className="p-2 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-500 dark:text-slate-400 transition-colors cursor-pointer">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Legends and Export on the right side */}
              <div className="flex items-center justify-between sm:justify-end gap-6">
                <div className="flex items-center gap-4 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 bg-[#005f5f] dark:bg-teal-600 rounded-sm" />
                    <span>Presente</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-750 rounded-sm" />
                    <span>Falta</span>
                  </div>
                </div>

                {!isInstructor && (<button
                  onClick={handleExportFrequencyCSV}
                  className="inline-flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-750 rounded-lg px-4 py-2 text-xs font-bold text-slate-800 dark:text-white hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors cursor-pointer shadow-sm"
                >
                  <FileDown className="w-4 h-4 text-gray-500 dark:text-slate-400" />
                  Exportar
                </button>)}
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-xs text-teal-900 dark:border-teal-800 dark:bg-teal-950/30 dark:text-teal-200" role="note">
              <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span><strong>Dica:</strong> mantenha pressionado por 1 segundo ou clique duas vezes em uma célula para alterar o status de presença.</span>
            </div>

            {/* Frequência Grid estilo planilha */}
            <div className="flex-1 border border-gray-250 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 flex flex-col shadow-sm min-h-[250px]">
              <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
                <table className="w-full text-left border-collapse whitespace-nowrap text-xs">
                  <thead className="sticky top-0 bg-slate-50 dark:bg-slate-850 z-10 border-b border-gray-250 dark:border-slate-800 font-bold uppercase text-gray-500 dark:text-slate-400">
                    <tr>
                      <th className="px-5 py-4 border-r border-gray-200 dark:border-slate-800 min-w-[240px]">ALUNO</th>
                      <th className="px-4 py-4 border-r border-gray-200 dark:border-slate-800 text-center w-28">
                        TOTAL <span className="text-[10px] text-gray-400 block font-normal">% FREQ</span>
                      </th>
                      {classSessions.map(({ dateStr, period }, idx) => {
                        const [, m, d] = dateStr.split('-');
                        const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
                        const dayName = daysOfWeek[new Date(dateStr + 'T12:00:00').getDay()];

                        return (
                          <th
                            key={dateStr + period + idx}
                            className="px-3 py-3 border-r border-gray-200 dark:border-slate-800 text-center w-24 font-sans"
                          >
                            <div className="text-[9px] text-gray-400 dark:text-slate-500 font-semibold uppercase">{dayName} - {d}/{m}</div>
                            <div className="text-[10px] font-bold text-slate-850 dark:text-slate-200 mt-1 truncate px-1" title={period}>{period}</div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-150 dark:divide-slate-800 font-sans text-slate-700 dark:text-slate-200">
                    {classSessions.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="px-4 py-12 text-center text-rose-500 font-sans font-bold">
                          Período inválido: verifique as datas de início e término da turma.
                        </td>
                      </tr>
                    ) : isLoadingAllMatriculas ? (
                      <tr>
                        <td colSpan={Math.max(2, 2 + classSessions.length)} className="px-4 py-8">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-gray-500 text-sm font-sans">Carregando frequência...</p>
                          </div>
                        </td>
                      </tr>
                    ) : allMatriculas.length === 0 ? (
                      <tr>
                        <td colSpan={Math.max(2, 2 + classSessions.length)} className="px-4 py-12 text-center text-gray-500 font-sans">
                          Nenhum aluno matriculado para registro de frequência.
                        </td>
                      </tr>
                    ) : allMatriculas.map((m) => {
                      const student = findStudent(m.aluno_id);
                      if (!student) return null;
                      const studentName = typeof student.nome_completo === 'string' && student.nome_completo.trim()
                        ? student.nome_completo
                        : 'Aluno desconhecido';
                      const attendancePercentage = typeof m.percentual_presenca === 'number' && Number.isFinite(m.percentual_presenca)
                        ? m.percentual_presenca
                        : 0;

                      // Generate Initials
                      const parts = studentName.trim().split(/\s+/);
                      const initials = parts.length > 1
                        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
                        : studentName.substring(0, 2).toUpperCase();

                      return (
                        <tr
                          key={m.id}
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-850/30 transition-colors h-[52px]"
                        >
                          {/* Student Name and Avatar */}
                          <td className="px-5 py-2.5 border-r border-gray-150 dark:border-slate-800/80 font-bold text-slate-900 dark:text-white sticky left-0 bg-white dark:bg-slate-900 z-10 flex items-center gap-3">
                            <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 flex items-center justify-center text-[11px] font-bold text-slate-600 dark:text-slate-300">
                              {initials}
                            </div>
                            <span className="truncate max-w-[180px] text-sm">
                              {studentName}
                            </span>
                          </td>

                          {/* Percentual Presença Badge */}
                          <td className="px-4 py-2 border-r border-gray-150 dark:border-slate-800/80 text-center">
                            <span
                              className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                                attendancePercentage === 100
                                  ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-450 border-emerald-150 dark:border-emerald-900/30'
                                  : attendancePercentage >= 75
                                  ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-450 border-amber-150 dark:border-amber-900/30'
                                  : 'bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-450 border-rose-150 dark:border-rose-900/30'
                              }`}
                            >
                              {attendancePercentage}%
                            </span>
                          </td>

                          {/* Grid Squares */}
                          {classSessions.map(({ dateStr, period }, idx) => {
                            const diaRecord = diario.find(
                              (d) => d.matricula_id === m.id && d.data_aula === dateStr && d.horario_periodo === period
                            );
                            const isPresent = diaRecord ? diaRecord.presente : false;

                            return (
                              <td
                                key={dateStr + period + idx}
                                className="px-3 py-2 border-r border-gray-100 dark:border-slate-800/50 text-center"
                              >
                                {(() => {
                                  const holdKey = `${m.id}-${dateStr}-${period}`;
                                  const holdProgress = attendanceHold?.key === holdKey ? attendanceHold.progress : 0;
                                  const holdAction = () => {
                                    void saveDiarioPresenca({
                                      matriculaId: m.id,
                                      dataAula: dateStr,
                                      horarioPeriodo: period,
                                      presente: !isPresent,
                                    });
                                  };

                                  return (
                                    <button
                                      type="button"
                                      id={`freq-toggle-${m.id}-${dateStr}-${period.replace(/\//g, '')}`}
                                      disabled={isSavingDiario}
                                      onPointerDown={(event) => startAttendanceHold(holdKey, holdAction, event.currentTarget)}
                                      onPointerUp={cancelAttendanceHold}
                                      onPointerLeave={cancelAttendanceHold}
                                      onPointerCancel={cancelAttendanceHold}
                                      onDoubleClick={(event) => {
                                        event.preventDefault();
                                        cancelAttendanceHold();
                                        holdAction();
                                      }}
                                      onKeyDown={(event) => {
                                        if ((event.key === 'Enter' || event.key === ' ') && !event.repeat) {
                                          event.preventDefault();
                                          startAttendanceHold(holdKey, holdAction);
                                        }
                                      }}
                                      onKeyUp={(event) => {
                                        if (event.key === 'Enter' || event.key === ' ') {
                                          event.preventDefault();
                                          cancelAttendanceHold();
                                        }
                                      }}
                                      onBlur={cancelAttendanceHold}
                                      className="relative w-7 h-7 rounded-sm transition-all cursor-pointer mx-auto disabled:cursor-wait disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-teal-500"
                                      aria-label={`${isPresent ? 'Remover presença' : 'Marcar presença'} de ${studentName} em ${dateStr}, período ${period}. Mantenha pressionado por um segundo ou clique duas vezes.`}
                                    >
                                      {holdProgress > 0 && (
                                        <span
                                          className="absolute -inset-1 rounded-full"
                                          style={{ background: `conic-gradient(#14b8a6 ${holdProgress * 360}deg, transparent 0)` }}
                                          aria-hidden="true"
                                        >
                                          <span className="absolute inset-[2px] rounded-full bg-white dark:bg-slate-900" />
                                        </span>
                                      )}
                                      <span
                                        className={`relative block w-5 h-5 rounded-sm mx-auto ${
                                          isPresent
                                            ? 'bg-[#005f5f] dark:bg-teal-600 border border-[#005f5f] dark:border-teal-600 shadow-sm'
                                            : 'bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 hover:border-teal-500/50'
                                        }`}
                                      />
                                    </button>
                                  );
                                })()}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        
        

        
        {/* --- ABA DE NOTAS --- */}
        {activeTab === 'grades' && (
          <div className="flex-1 flex flex-col gap-4 min-h-0 font-sans">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-850 rounded-xl border border-gray-200 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-800 dark:text-white">Lançamento de Notas</h3>
              </div>
            </div>

            <div className="flex-1 border border-gray-250 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 flex flex-col shadow-sm min-h-[250px]">
              <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
                <table className="w-full text-left border-collapse whitespace-nowrap text-xs">
                  <thead className="sticky top-0 bg-slate-50 dark:bg-slate-850 z-10 border-b border-gray-250 dark:border-slate-800 font-bold uppercase text-gray-500 dark:text-slate-400">
                    <tr>
                      <th className="px-5 py-4 border-r border-gray-200 dark:border-slate-800 min-w-[240px]">ALUNO</th>
                      <th className="px-4 py-4 border-r border-gray-200 dark:border-slate-800 text-center w-32">1ª CHAMADA</th>
                      <th className="px-4 py-4 border-r border-gray-200 dark:border-slate-800 text-center w-32">2ª CHAMADA</th>
                      <th className="px-4 py-4 text-center w-32">MÉDIA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-150 dark:divide-slate-800 font-sans text-slate-700 dark:text-slate-200">
                    {isLoadingAllMatriculas ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-gray-500 font-sans">Carregando alunos para registro de notas...</td>
                      </tr>
                    ) : allMatriculas.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-12 text-center text-gray-500 font-sans">
                          Nenhum aluno matriculado para registro de notas.
                        </td>
                      </tr>
                    ) : allMatriculas.map((m) => {
                      const student = findStudent(m.aluno_id);
                      if (!student) return null;
                      const studentName = typeof student.nome_completo === 'string' && student.nome_completo.trim()
                        ? student.nome_completo
                        : 'Aluno desconhecido';

                      const parts = studentName.trim().split(/\s+/);
                      const initials = parts.length > 1
                        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
                        : studentName.substring(0, 2).toUpperCase();
                      
                      const draft = pendingGrades[m.id];
                      const nota1 = draft ? draft.nota1 : (m.nota_1_chamada ?? null);
                      const nota2 = draft ? draft.nota2 : (m.nota_2_chamada ?? null);
                      const maxNota = [nota1, nota2].filter((nota): nota is number => typeof nota === 'number' && Number.isFinite(nota)).reduce<number | null>(
                        (highest, nota) => highest === null ? nota : Math.max(highest, nota),
                        null,
                      );
                      const isSavingGrade = savingGradeId === m.id;

                      return (
                        <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/30 transition-colors h-[52px]">
                          <td className="px-5 py-2.5 border-r border-gray-150 dark:border-slate-800/80 font-bold text-slate-900 dark:text-white sticky left-0 bg-white dark:bg-slate-900 z-10 flex items-center gap-3">
                            <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 flex items-center justify-center text-[11px] font-bold text-slate-600 dark:text-slate-300">
                              {initials}
                            </div>
                            <span className="truncate max-w-[180px] text-sm">
                              {studentName}
                            </span>
                          </td>
                          <td className="px-4 py-2 border-r border-gray-150 dark:border-slate-800/80 text-center">
                            <NotaInput value={nota1} onChange={(value) => handleGradeDraftChange(m, 'nota1', value)} disabled={savingGradeId !== null} />
                          </td>
                          <td className="px-4 py-2 border-r border-gray-150 dark:border-slate-800/80 text-center">
                            <NotaInput value={nota2} onChange={(value) => handleGradeDraftChange(m, 'nota2', value)} disabled={savingGradeId !== null} />
                          </td>
                          <td className="px-4 py-2 text-center">
                            <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                               maxNota !== null && maxNota >= 7 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                               : maxNota !== null ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
                               : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                            }`}>
                              {maxNota !== null ? maxNota.toFixed(1).replace('.', ',') : '-'}
                            </span>
                            {draft && (
                              <div className="mt-2 flex flex-col items-center gap-1">
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => void handleGradeConfirm(m)}
                                    disabled={isSavingGrade || savingGradeId !== null}
                                    className="rounded bg-teal-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:cursor-wait disabled:opacity-60"
                                  >
                                    {isSavingGrade ? 'Salvando...' : 'Confirmar'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleGradeCancel(m.id)}
                                    disabled={isSavingGrade}
                                    className="rounded border border-slate-300 px-2 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                                  >
                                    Cancelar
                                  </button>
                                </div>
                                {gradeError && <span className="max-w-[180px] whitespace-normal text-[10px] text-red-600" role="alert">{gradeError}</span>}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* --- ABA 3: VISITA TÉCNICA (Aero Solicitador - Tela 2.9) --- */}
        {activeTab === 'visit' && (() => {
          // Prepare exact students list as per screenshot 2 with dynamic fallback
          const defaultList = [
            { num: '01', name: 'Ana Clara Mendes', cpf: '123.456-7', status: 'REGULAR' },
            { num: '02', name: 'Carlos Eduardo Souza', cpf: '987.654-3', status: 'REGULAR' },
            { num: '03', name: 'Fernanda Lima', cpf: '456.789-0', status: 'PENDENTE CNH' },
            { num: '04', name: 'João Pedro Alves', cpf: '321.654-9', status: 'REGULAR' },
            { num: '05', name: 'Mariana Costa', cpf: '789.123-4', status: 'REGULAR' },
            { num: '06', name: 'Rafael Gomes', cpf: '159.753-8', status: 'REGULAR' },
            { num: '07', name: 'Sofia Ribeiro', cpf: '357.951-2', status: 'REGULAR' },
          ];

          const visitStudents = allMatriculas.map((m, idx) => {
                const student = findStudent(m.aluno_id);
                const codeAnac = m.anac_codigo || student?.cpf?.substring(0, 7) || '---';
                const isPending = m.percentual_presenca < 75;
                return {
                  num: String(idx + 1).padStart(2, '0'),
                  name: student?.nome_completo || 'Sem Nome',
                  cpf: student?.cpf || codeAnac,
                  status: isPending ? 'PENDENTE CNH' : 'REGULAR'
                };
              });

          const totalAlunos = allMatriculas.length > 0 ? allMatriculas.length : 30;
          const excessStudentsCount = totalAlunos > 7 ? totalAlunos - 7 : 23;

          const emailBody = `Assunto: Solicitação de Visita Técnica - Turma ${classData.id_anac}

Prezados,

Encaminhamos em anexo o ofício formal solicitando autorização para visita técnica nas instalações, conforme diretrizes da IS nº 110.

A visita está prevista para ${formatClassDate(classData.data_termino)} sob responsabilidade do Cmte. Roberto Silva. O documento anexo contém a relação completa de ${totalAlunos} alunos aptos.

Em caso de dúvidas, favor contatar via telefone informado ou responder a este e-mail.

Atenciosamente,
Equipe Airport`;

          return (
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0 overflow-y-auto custom-scrollbar font-sans text-xs">
              
              {/* LADO ESQUERDO: PAPEL TIMBRADO CARTA FINAL (Takes 7 columns on desktop) */}
              <div id="visit-print-content" className="lg:col-span-7 bg-white p-8 border border-gray-250 rounded-2xl flex flex-col min-h-[500px] shadow-sm relative text-slate-900 leading-normal">
                {/* Visual Title */}
                <div className="text-center space-y-1 mb-6">
                  <h1 className="font-sans font-extrabold text-[16px] tracking-tight text-slate-900">
                    SOLICITAÇÃO DE VISITA TÉCNICA
                  </h1>
                  <p className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">
                    REFERÊNCIA: IS Nº 110
                  </p>
                  <div className="h-[2px] bg-slate-900 w-full mt-3" />
                </div>

                {/* Grid layout of credentials */}
                <div className="grid grid-cols-2 gap-4 mb-6 text-[10px]">
                  <div>
                    <span className="block text-gray-400 font-bold tracking-wider uppercase">INSTRUTOR RESPONSÁVEL</span>
                    <span className="font-bold text-slate-900">Cmte. Roberto Silva</span>
                  </div>
                  <div>
                    <span className="block text-gray-400 font-bold tracking-wider uppercase">DATA PREVISTA</span>
                    <span className="font-bold text-slate-900">
                      {formatClassDate(classData.data_termino, { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                  <div>
                    <span className="block text-gray-400 font-bold tracking-wider uppercase">BASE ORIGEM</span>
                    <span className="font-bold text-slate-900">São Paulo (CGH)</span>
                  </div>
                  <div>
                    <span className="block text-gray-400 font-bold tracking-wider uppercase">BASE DESTINO</span>
                    <span className="font-bold text-slate-900">Campinas (VCP)</span>
                  </div>
                </div>

                {/* Introductory text */}
                <p className="text-[11px] text-gray-700 leading-relaxed mb-6">
                  Vimos por meio deste solicitar a autorização para a realização de visita técnica nas instalações aeroportuárias, conforme requisitos estabelecidos pela instrução suplementar IS nº 110. A relação dos alunos ativos na turma {classData.id_anac} segue abaixo para credenciamento e emissão de badges de acesso temporário.
                </p>

                {/* Mini student relation grid */}
                <div className="border border-gray-200 rounded-lg overflow-hidden mb-4">
                  <table className="w-full text-left text-[10px]">
                    <thead className="bg-gray-50 border-b border-gray-200 font-bold uppercase text-gray-500">
                      <tr>
                        <th className="px-3 py-2 w-12 text-center">Nº</th>
                        <th className="px-3 py-2">Nome do Aluno</th>
                        <th className="px-3 py-2">ANAC / CPF</th>
                        <th className="px-3 py-2 text-center">Status Documental</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-150 text-slate-700">
                      {isLoadingAllMatriculas ? (
                        <tr>
                          <td colSpan={4} className="px-3 py-6 text-center text-gray-500 text-sm">
                            <div className="flex flex-col items-center justify-center gap-2">
                               <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                               Carregando relação de alunos...
                            </div>
                          </td>
                        </tr>
                      ) : visitStudents.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-3 py-6 text-center text-gray-500 text-sm">
                            Nenhum aluno matriculado nesta turma para a visita.
                          </td>
                        </tr>
                      ) : visitStudents.map((item) => (
                        <tr key={item.num} className="hover:bg-slate-50">
                          <td className="px-3 py-1.5 text-center font-mono font-bold text-gray-400">{item.num}</td>
                          <td className="px-3 py-1.5 font-bold text-slate-900">{item.name}</td>
                          <td className="px-3 py-1.5 font-mono text-gray-500">{item.cpf}</td>
                          <td className="px-3 py-1.5 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold tracking-wide ${
                              item.status === 'REGULAR'
                                ? 'bg-emerald-50 text-[#008060]'
                                : 'bg-amber-50 text-[#b58100]'
                            }`}>
                              {item.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Ellipsis text */}
                <p className="text-[10px] text-gray-400 italic mb-8 font-mono">
                  ... e mais {excessStudentsCount} alunos listados no documento completo.
                </p>

                {/* Signatures spacer */}
                <div className="mt-auto pt-6 grid grid-cols-2 gap-12 font-bold text-center text-gray-400 text-[9px] uppercase tracking-wider">
                  <div className="space-y-1">
                    <div className="h-px bg-gray-300 w-full" />
                    <span>GESTOR DA TURMA</span>
                  </div>
                  <div className="space-y-1">
                    <div className="h-px bg-gray-300 w-full" />
                    <span>RESPONSÁVEL BASE</span>
                  </div>
                </div>
              </div>

              {/* LADO DIREITO: CONFIGURAÇÃO DE ENVIO (Takes 5 columns on desktop) */}
              <div className="lg:col-span-5 flex flex-col gap-5 min-h-0">
                {/* Form configuration box */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-250 dark:border-slate-800 shadow-sm flex flex-col gap-4">
                  <div className="flex justify-between items-center pb-2 border-b border-gray-150 dark:border-slate-800">
                    <div>
                      <h3 className="font-display font-extrabold text-slate-900 dark:text-white text-sm">
                        Configuração de Envio
                      </h3>
                      <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-0.5">
                        Defina os destinatários e informações adicionais.
                      </p>
                    </div>
                    {/* Students total indicator */}
                    <div className="flex items-center gap-1.5 bg-teal-50 dark:bg-teal-950/20 text-[#005f5f] dark:text-teal-400 px-3 py-1.5 rounded-lg border border-teal-150 dark:border-teal-900/30">
                      <Users className="w-4 h-4" />
                      <span className="font-bold text-xs">Total: {totalAlunos} Alunos</span>
                    </div>
                  </div>

                  {/* Inputs */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      E-MAIL DOS REPRESENTANTES (SEPARADOS POR VÍRGULA)
                    </label>
                    <textarea
                      id="visit-emails-textarea"
                      rows={2}
                      value={visitEmails}
                      onChange={(e) => setVisitEmails(e.target.value)}
                      placeholder="exemplo@aeroporto.com.br, gestor@empresa.com"
                      className="w-full border border-gray-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-850 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#005f5f]"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      TELEFONE DE CONTATO (BASE/OPERAÇÃO)
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                      <input
                        id="visit-phone-input"
                        type="text"
                        value={visitPhone}
                        onChange={(e) => setVisitPhone(e.target.value)}
                        placeholder="(00) 00000-0000"
                        className="w-full pl-9 pr-3 border border-gray-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-850 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#005f5f] font-mono"
                      />
                    </div>
                  </div>

                  {/* Email body formatted preview */}
                  <div className="flex flex-col gap-1.5 flex-1">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      CORPO DO E-MAIL (PREVIEW)
                    </label>
                    <div className="border border-gray-250 dark:border-slate-800 rounded-xl p-3 bg-slate-50 dark:bg-slate-950 font-mono text-[11px] text-slate-700 dark:text-slate-350 leading-relaxed overflow-y-auto max-h-[190px] h-[190px] whitespace-pre-wrap select-all">
                      {emailBody}
                    </div>
                  </div>
                </div>

                {/* Actions bottom bar */}
                <div className="flex items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 border border-gray-250 dark:border-slate-800 rounded-2xl">
                  <button
                    id="btn-visit-clear"
                    onClick={() => {
                      setVisitEmails('');
                      setVisitPhone('');
                    }}
                    className="px-4 py-2 text-gray-500 dark:text-slate-400 hover:text-gray-700 hover:underline font-bold text-xs cursor-pointer"
                  >
                    Limpar
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      id="btn-visit-copy-text"
                      onClick={() => {
                        navigator.clipboard.writeText(emailBody);
                        alert('Corpo do e-mail copiado com sucesso! Pronto para colar no Outlook.');
                        createLog({
                          usuario_id: 'user-admin-1',
                          acao: `Copiou texto do e-mail da Carta de Visita para a turma ${classData.id_anac}`,
                          tabela_afetada: 'turmas',
                          registro_id: classData.id,
                          ip_address: '189.120.45.67'
                        });
                      }}
                      className="px-4 py-2.5 border border-gray-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 font-bold text-xs flex items-center gap-2 cursor-pointer transition-colors shadow-xs"
                    >
                      <Copy className="w-4 h-4 text-gray-500" />
                      Copiar Texto
                    </button>

                    <button
                      id="btn-visit-pdf"
                      onClick={() => {
                        handleGeneratePDF();
                        createLog({
                          usuario_id: 'user-admin-1',
                          acao: `Gerou PDF da Carta de Visita Técnica para a turma ${classData.id_anac}`,
                          tabela_afetada: 'turmas',
                          registro_id: classData.id,
                          ip_address: '189.120.45.67'
                        });
                      }}
                      className="px-4 py-2.5 bg-[#005f5f] hover:bg-[#004d4d] text-white rounded-lg font-bold text-xs flex items-center gap-2 cursor-pointer transition-colors shadow-sm"
                    >
                      <FileText className="w-4 h-4" />
                      Gerar PDF
                    </button>
                  </div>
                </div>

              </div>

            </div>
          );
        })()}

        {/* --- ABA 4: DOCUMENTOS GED (Revisão da Turma) --- */}
        {activeTab === 'ged' && (
          <div className="flex-1 flex flex-col gap-4 min-h-0 font-sans">
            <div className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-slate-850 rounded-lg border border-gray-200 dark:border-slate-800">
              <span className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1.5">
                <FolderOpen className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                Dossiê GED Completo da Turma. Estes documentos foram enviados pelos alunos e validados pela inteligência artificial.
              </span>
            </div>

            {/* Lista de Documentos GED */}
            <div className="flex-1 border border-gray-250 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 flex flex-col shadow-sm min-h-[250px]">
              <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
                <table className="w-full text-left border-collapse whitespace-nowrap text-xs">
                  <thead className="sticky top-0 bg-slate-50 dark:bg-slate-850 z-10 border-b border-gray-250 dark:border-slate-800 font-bold uppercase text-gray-500 dark:text-slate-400">
                    <tr>
                      <th className="px-4 py-3 border-r border-gray-200/50 dark:border-slate-800/50">Aluno</th>
                      <th className="px-4 py-3 border-r border-gray-200/50 dark:border-slate-800/50">Tipo do Documento</th>
                      <th className="px-4 py-3 border-r border-gray-200/50 dark:border-slate-800/50 font-mono">Hash SHA-256</th>
                      <th className="px-4 py-3 border-r border-gray-200/50 dark:border-slate-800/50 text-center">Status</th>
                      <th className="px-4 py-3 border-r border-gray-200/50 dark:border-slate-800/50 text-center">Verificação IA</th>
                      <th className="px-4 py-3 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-150 dark:divide-slate-800 text-gray-700 dark:text-slate-200">
                    {(isLoadingAllMatriculas || isLoadingDocuments) ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500 font-sans">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-gray-500 text-sm">Carregando documentos...</p>
                          </div>
                        </td>
                      </tr>
                    ) : classDocuments.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500 font-sans">
                          Nenhum documento anexado ainda para os alunos desta turma.
                        </td>
                      </tr>
                    ) : (
                      classDocuments.map((doc) => {
                        const student = users.find((u) => u.id === doc.usuario_id);

                        return (
                          <tr
                            key={doc.id}
                            className="hover:bg-slate-50 dark:hover:bg-slate-850/50 transition-colors h-[40px]"
                          >
                            <td className="px-4 py-2 border-r border-gray-100/55 dark:border-slate-800/30 font-bold text-slate-900 dark:text-white">
                              {student?.nome_completo || 'Aluno'}
                            </td>
                            <td className="px-4 py-2 border-r border-gray-100/55 dark:border-slate-800/30 font-bold">
                              {doc.tipo_documento}
                            </td>
                            <td className="px-4 py-2 border-r border-gray-100/55 dark:border-slate-800/30 font-mono text-[10px] text-gray-400">
                              {doc.hash_sha256.substr(0, 32)}...
                            </td>
                            <td className="px-4 py-2 border-r border-gray-100/55 dark:border-slate-800/30 text-center font-mono">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase inline-flex items-center gap-1 ${
                                  doc.status === 'Aprovado'
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'
                                    : doc.status === 'Pendente'
                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400'
                                    : doc.status === 'Em Analise'
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400'
                                    : 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400'
                                }`}
                              >
                                {doc.status}
                              </span>
                            </td>
                            <td className="px-4 py-2 border-r border-gray-100/55 dark:border-slate-800/30 font-sans">
                              {doc.metadados_ia ? (
                                <div className="flex flex-col gap-0.5 text-[10px]">
                                  {doc.metadados_ia.ocr_nome_correto && (
                                    <span className="text-emerald-500 font-bold">✓ Nome Compatível</span>
                                  )}
                                  {doc.metadados_ia.ocr_cpf_correto && (
                                    <span className="text-emerald-500 font-bold">✓ CPF Compatível</span>
                                  )}
                                  {doc.metadados_ia.detectou_fraude === false && (
                                    <span className="text-emerald-500 font-bold">✓ Sem indícios de fraude</span>
                                  )}
                                  {doc.metadados_ia.motivo_rejeicao && (
                                    <span className="text-red-500 font-bold">{doc.metadados_ia.motivo_rejeicao}</span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  id={`btn-open-doc-verify-${doc.id}`}
                                  onClick={() => {
                                    setRoute('central-ged');
                                  }}
                                  className="text-gray-500 hover:text-teal-600 dark:text-slate-400 dark:hover:text-teal-400 transition-colors cursor-pointer"
                                  title="Revisar na Central GED"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* --- MODAL DE GERAÇÃO DE DOCUMENTOS GERAIS (Tela 2.6 - Airport) --- */}
      <Modal isOpen={!isInstructor && generateDocOpen} onClose={() => setGenerateDocOpen(false)}>
        <div className="bg-white dark:bg-slate-900 border border-gray-250 dark:border-slate-800 rounded-2xl w-full p-6 shadow-2xl font-sans relative flex flex-col items-center text-center">
          {/* Close button on top right */}
          <button
              onClick={() => setGenerateDocOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Circular blue-teal icon header */}
            <div className="w-12 h-12 rounded-full bg-teal-500/10 dark:bg-teal-500/20 flex items-center justify-center text-[#005f5f] dark:text-teal-400 mb-4">
              <FileText className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-slate-950 dark:text-white mb-2">
              Geração de Documentos
            </h3>
            
            <p className="text-xs text-gray-500 dark:text-slate-400 mb-6 leading-relaxed px-2">
              Selecione o tipo de documento que deseja gerar para a turma atual. O sistema preencherá automaticamente os dados cadastrais.
            </p>

            <div className="w-full flex flex-col gap-1.5 mb-6 text-left">
              <label className="text-xs font-bold text-gray-700 dark:text-slate-300">Tipo de Documento</label>
              <select
                id="doc-selector-select"
                value={selectedDocType}
                onChange={(e) => setSelectedDocType(e.target.value)}
                className="w-full border border-gray-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-850 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#005f5f]"
              >
                <option value="" disabled>Selecione um formulário padrão...</option>
                <option value="1">1. Programação Semanal</option>
                <option value="2">2. Regulamento do Curso</option>
                <option value="3">3. Formulário de Avaliação de Reação</option>
                <option value="4">4. Roteiro Preparatório</option>
                <option value="5">5. ATA de Aplicação de Prova</option>
                <option value="6">6. Informações de Interposição de Recursos</option>
                <option value="7">7. Grade Curricular</option>
                <option value="8">8. Termo de Responsabilidade</option>
                <option value="9">9. Lista de Frequência</option>
                <option value="10">10. Lista de Recebimento de Material</option>
              </select>
            </div>

            <div className="w-full flex items-center justify-between gap-3 border-t border-gray-150 dark:border-slate-800 pt-4">
              <button
                id="btn-close-doc-modal"
                onClick={() => setGenerateDocOpen(false)}
                className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-300 rounded-lg font-bold text-xs hover:bg-gray-50 dark:hover:bg-slate-850 cursor-pointer text-center"
              >
                Fechar Modal
              </button>
              <button
                id="btn-confirm-doc-gen"
                onClick={handleGenerateDoc}
                className="flex-1 px-4 py-2.5 bg-[#005f5f] hover:bg-[#004d4d] text-white font-bold rounded-lg text-xs shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Printer className="w-4 h-4" />
                Gerar e Imprimir PDF
              </button>
            </div>
          </div>
        </Modal>

      {/* --- DRAWERS / OVERLAYS: DETALHES DOCUMENTOS DO ALUNO (Tela Documentos do Aluno - Airport) --- */}
      <SlidePanel isOpen={false} onClose={() => setSelectedStudentForDocs(null)}>
        {selectedStudentForDocs && (() => {
          const studentDocs = documents.filter(doc => doc.usuario_id === selectedStudentForDocs.id);
        
        // Find documents or prepare fallback mock status
        const rgDoc = studentDocs.find(doc => doc.tipo_documento === 'RG');
        const compDoc = studentDocs.find(doc => doc.tipo_documento === 'Comprovante de Reisdência' || doc.tipo_documento === 'Comprovante de Residência');
        const antecDoc = studentDocs.find(doc => doc.tipo_documento === 'Antecedentes Criminais');

        const rgStatus = rgDoc ? rgDoc.status : 'Aprovado'; // Default approved for Joao/Maria
        const compStatus = compDoc ? compDoc.status : (selectedStudentForDocs.id === 'aluno-maria' ? 'Pendente' : 'Aprovado');
        const antecStatus = antecDoc ? antecDoc.status : 'Aprovado';

        return (
          <div className="flex flex-col h-full font-sans">
            {/* Header */}
            <div className="p-5 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-850 shrink-0">
                <div>
                  <h3 className="text-lg font-bold text-slate-950 dark:text-white">
                    Documentos do Aluno
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400 font-medium mt-0.5">
                    {selectedStudentForDocs.nome_completo}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedStudentForDocs(null)}
                  className="p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrolled Body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
                
                {/* 1. Identidade (RG) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                      Identidade (RG)
                    </span>
                    <span className={`px-2 py-0.5 rounded-sm font-bold uppercase text-[9px] tracking-wider ${
                      rgStatus === 'Aprovado'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400'
                    }`}>
                      {rgStatus === 'Aprovado' ? 'Validado' : rgStatus}
                    </span>
                  </div>
                  {/* Visual container */}
                  <div className="bg-slate-50 dark:bg-slate-850 rounded-xl border border-gray-200 dark:border-slate-800 h-32 flex items-center justify-center flex-col gap-2">
                    <Contact className="w-10 h-10 text-slate-400 dark:text-slate-500" />
                    <span className="text-[10px] text-gray-400 font-mono">RG_{String(selectedStudentForDocs?.cpf ?? '').replace(/\D/g, '') || 'aluno'}.pdf</span>
                  </div>
                </div>

                {/* 2. Comprovante de Residência */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                      Comprovante de Residência
                    </span>
                    <span className={`px-2 py-0.5 rounded-sm font-bold uppercase text-[9px] tracking-wider ${
                      compStatus === 'Aprovado'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 animate-pulse'
                    }`}>
                      {compStatus === 'Aprovado' ? 'Validado' : compStatus}
                    </span>
                  </div>
                  {/* Visual container */}
                  <div className="bg-slate-50 dark:bg-slate-850 rounded-xl border border-gray-200 dark:border-slate-800 h-32 flex items-center justify-center flex-col gap-2">
                    <Home className="w-10 h-10 text-slate-400 dark:text-slate-500" />
                    {compStatus === 'Aprovado' ? (
                      <span className="text-[10px] text-gray-400 font-mono">COMP_RESIDENCIA_{String(selectedStudentForDocs?.cpf ?? '').replace(/\D/g, '') || 'aluno'}.pdf</span>
                    ) : (
                      <span className="text-[10px] text-amber-500 font-semibold font-mono">Pendente de Envio / Revisão</span>
                    )}
                  </div>
                </div>

                {/* 3. Antecedentes Criminais */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                      Antecedentes Criminais
                    </span>
                    <span className={`px-2 py-0.5 rounded-sm font-bold uppercase text-[9px] tracking-wider ${
                      antecStatus === 'Aprovado'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400'
                    }`}>
                      {antecStatus === 'Aprovado' ? 'Validado' : antecStatus}
                    </span>
                  </div>
                  {/* Visual container */}
                  <div className="bg-slate-50 dark:bg-slate-850 rounded-xl border border-gray-200 dark:border-slate-800 h-32 flex items-center justify-center flex-col gap-2">
                    <FileCheck2 className="w-10 h-10 text-slate-400 dark:text-slate-500" />
                    <span className="text-[10px] text-gray-400 font-mono">CERTIDÃO_ANTECEDENTES_{String(selectedStudentForDocs?.cpf ?? '').replace(/\D/g, '') || 'aluno'}.pdf</span>
                  </div>
                </div>

              </div>

              {/* Action Button Footer */}
              <div className="p-5 border-t border-gray-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex flex-col gap-3">
                <button
                  onClick={async () => {
                    // Quick state validation simulator
                    const docsToValidate = documents.filter(d => d.usuario_id === selectedStudentForDocs.id);
                    if (docsToValidate.length > 0) {
                      for (const d of docsToValidate) {
                        await updateDocument({ id: d.id, updates: { status: 'Aprovado' as any } });
                      }
                    }
                    createLog({
                      usuario_id: 'user-admin-1',
                      acao: `Aprovou em lote todos os documentos de ${selectedStudentForDocs.nome_completo}`,
                      tabela_afetada: 'ged_documentos',
                      registro_id: selectedStudentForDocs.id,
                      ip_address: '189.44.22.110'
                    });
                    alert(`Sucesso! Todos os documentos de ${selectedStudentForDocs.nome_completo} foram validados.`);
                    setSelectedStudentForDocs(null);
                  }}
                  className="w-full bg-[#005f5f] hover:bg-[#004d4d] text-white py-3 rounded-xl font-bold text-sm text-center cursor-pointer transition-colors shadow-md"
                >
                  Validar Todos
                </button>
              </div>
          </div>
        );
      })()}
      </SlidePanel>

      
      
      <StudentDetailsPanel 
        isOpen={detailsPanelOpen}
        onClose={() => {
          setDetailsPanelOpen(false);
          setSelectedStudentForDetails(null);
        }}
        student={selectedStudentForDetails}
      />

      <PasswordModal
        isOpen={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
        onConfirm={handlePasswordConfirm}
        targetUserId={selectedStudentForDocs?.id || ''}
      />
      <SharedDocumentsPanel
        isOpen={documentsPanelOpen}
        onClose={() => {
          setDocumentsPanelOpen(false);
          setSelectedStudentForDocs(null);
          setAccessGrant(null);
        }}
        student={selectedStudentForDocs}
        accessGrant={accessGrant}
      />

      {/* --- MODAL CENTRAL ADICIONAR ALUNO --- */}
      <Modal isOpen={addStudentOpen} onClose={handleCloseStudentModal}>
        <div className="bg-white dark:bg-slate-900 border border-gray-250 dark:border-slate-800 rounded-xl w-full p-6 shadow-2xl font-sans relative overflow-hidden">
          <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-1">
            Matricular Novo Aluno
          </h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 mb-5">
              Escolha um aluno cadastrado e defina sua empresa correspondente se necessário.
            </p>

            <div className="space-y-4">
              <div className="flex flex-col gap-1.5 relative">
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300">Selecionar Aluno *</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Buscar aluno por nome ou CPF..."
                    value={studentSearchQuery}
                    onChange={(e) => {
                      setStudentSearchQuery(e.target.value);
                      setIsStudentDropdownOpen(true);
                      setSelectedAlunoId('');
                    }}
                    onFocus={() => {
                      if (studentSearchQuery.length > 0) setIsStudentDropdownOpen(true);
                    }}
                    className="w-full border border-gray-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-850 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                  {isStudentDropdownOpen && studentSearchQuery.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-850 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {availableStudents.filter(s => {
                        const name = typeof s.nome_completo === 'string' ? s.nome_completo : '';
                        const cpf = typeof s.cpf === 'string' ? s.cpf : '';
                        const search = studentSearchQuery.toLowerCase();
                        const numericSearch = studentSearchQuery.replace(/\D/g, '');
                        return name.toLowerCase().includes(search) || cpf.replace(/\D/g, '').includes(numericSearch);
                      }).length === 0 ? (
                        <div className="p-3 text-xs text-gray-500 text-center">Nenhum aluno encontrado.</div>
                      ) : (
                        availableStudents.filter(s => {
                          const name = typeof s.nome_completo === 'string' ? s.nome_completo : '';
                          const cpf = typeof s.cpf === 'string' ? s.cpf : '';
                          const search = studentSearchQuery.toLowerCase();
                          const numericSearch = studentSearchQuery.replace(/\D/g, '');
                          return name.toLowerCase().includes(search) || cpf.replace(/\D/g, '').includes(numericSearch);
                        }).map(stud => {
                          const name = typeof stud.nome_completo === 'string' ? stud.nome_completo : 'Aluno sem nome';
                          const cpf = typeof stud.cpf === 'string' ? stud.cpf : 'CPF não informado';
                          return (
                          <button
                            type="button"
                            key={stud.id}
                            onClick={() => {
                              setSelectedAlunoId(stud.id);
                              setStudentSearchQuery(`${name} (CPF: ${cpf})`);
                              setIsStudentDropdownOpen(false);
                            }}
                            className="block w-full p-2.5 text-left hover:bg-gray-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-teal-500 cursor-pointer text-xs text-slate-800 dark:text-slate-200"
                          >
                            {name} (CPF: {cpf})
                          </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
                <div className="flex justify-end mt-1">
                  <button 
                    onClick={() => {
                      setAddStudentOpen(false);
                      setRegistrationModalOpen(true);
                    }}
                    className="text-[10px] text-[#005f5f] hover:text-[#004d4d] dark:text-teal-400 dark:hover:text-teal-300 font-bold underline cursor-pointer"
                  >
                    Não encontrou o aluno? Cadastrar novo
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300">Empresa B2B (Opcional)</label>
                <select
                  id="company-selector-select"
                  value={selectedCompanyId}
                  onChange={(e) => setSelectedCompanyId(e.target.value)}
                  className="w-full border border-gray-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-850 text-xs text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="">Particular / Sem vínculo</option>
                  {companies.map((comp) => (
                    <option key={comp.id} value={comp.id}>
                      {comp.nome_fantasia}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300">Software Operacional</label>
                <input
                  id="software-input"
                  type="text"
                  value={formSoftware}
                  onChange={(e) => setFormSoftware(e.target.value)}
                  placeholder="Ex: AeroFS, RayScan..."
                  className="w-full border border-gray-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-850 text-xs text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-gray-150 dark:border-slate-800 pt-4 mt-6">
              <button
                id="btn-close-student-modal"
                onClick={handleCloseStudentModal}
                className="px-4 py-2 border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-300 rounded font-semibold text-xs hover:bg-gray-50 dark:hover:bg-slate-850"
              >
                Cancelar
              </button>
              <button
                id="btn-confirm-add-student"
                onClick={handleAddStudentSubmit}
                disabled={isCreatingMatricula}
                className="px-4 py-2 bg-slate-900 dark:bg-teal-600 hover:bg-slate-850 hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-60 text-white font-semibold text-xs rounded shadow-sm cursor-pointer"
              >
                {isCreatingMatricula ? 'Matriculando...' : 'Matricular Aluno'}
              </button>
            </div>

            {/* Dirty Form Discard Confirmation Overlay inside the Modal */}
            {showStudentDiscardConfirm && (
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-6 animate-fade-in text-center">
                <div className="bg-white dark:bg-slate-900 border border-gray-250 dark:border-slate-800 rounded-xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
                  <div className="mx-auto w-10 h-10 bg-amber-500/10 rounded-full flex items-center justify-center text-amber-500">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">Alterações não salvas</h4>
                    <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
                      Você possui campos preenchidos na matrícula. Deseja realmente sair e perder as alterações?
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5 justify-center pt-2">
                    <button
                      onClick={() => setShowStudentDiscardConfirm(false)}
                      className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Continuar editando
                    </button>
                    <button
                      onClick={handleForceCloseStudentModal}
                      className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-semibold transition-colors shadow-sm cursor-pointer"
                    >
                      Descartar e Sair
                    </button>
                  </div>
                </div>
              </div>
            )}
        </div>
      </Modal>

      {/* Delete Matricula Confirmation Modal */}
      <Modal isOpen={!!matriculaToDelete} onClose={() => setMatriculaToDelete(null)}>
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-6 space-y-4 shadow-2xl font-sans text-center">
          <div className="mx-auto w-12 h-12 bg-rose-500/10 rounded-full flex items-center justify-center text-rose-600 dark:text-rose-400">
              <Trash2 className="w-6 h-6 animate-pulse" />
            </div>
            <div className="space-y-2">
              <h4 className="font-bold text-base text-slate-900 dark:text-white">Remover Matrícula</h4>
              <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
                Tem certeza de que deseja remover a matrícula do aluno <span className="font-semibold text-slate-850 dark:text-slate-200">{matriculaToDelete?.studentName}</span> desta turma? Esta ação não pode ser desfeita.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setMatriculaToDelete(null)}
                className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-850 dark:text-slate-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                id="btn-confirm-delete-matricula"
                disabled={isDeletingMatricula}
                onClick={async () => {
                  if (!matriculaToDelete || deleteMatriculaSubmitRef.current || isDeletingMatricula) return;
                  deleteMatriculaSubmitRef.current = true;
                  try {
                    await deleteMatricula(matriculaToDelete.id);
                  } catch (err) {
                    console.error(err);
                  } finally {
                    deleteMatriculaSubmitRef.current = false;
                    setMatriculaToDelete(null);
                  }
                }}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-60 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm cursor-pointer"
              >
                {isDeletingMatricula ? 'Removendo...' : 'Confirmar Remoção'}
              </button>
            </div>
        </div>
      </Modal>

      {/* Student Registration Modal */}
      <StudentRegistrationModal
        initialData={selectedStudentForEdit}
        isOpen={registrationModalOpen}
        onClose={() => { setRegistrationModalOpen(false); setSelectedStudentForEdit(null); }}
        onSuccess={({ studentId }) => {
          setSelectedAlunoId(studentId);
          setAddStudentOpen(true);
        }}
      />
    </div>
  );
}
export default ClassDetails;
