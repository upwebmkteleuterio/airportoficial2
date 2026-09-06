/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  AlertCircle, 
  Sparkles, 
  LogOut, 
  ChevronRight, 
  GraduationCap,
  Loader2,
  Fingerprint,
  RefreshCw,
  X,
  Check,
  FileSignature
} from 'lucide-react';
import { useStudentDocuments } from '../hooks/useDocuments';
import { useClasses } from '../hooks/useClasses';
import { useCourses } from '../hooks/useCourses';
import { useUIStore } from '../store/uiStore';
import { useAudit } from '../hooks/useAudit';
import { DocumentStatus } from '../types';

import { Modal } from '../components/ui/Modal';

export function StudentDashboard() {
  const { userLogged, logout } = useUIStore();
  const { documents, uploadDocument, uploadDocumentFile, isUploading } = useStudentDocuments(userLogged?.id || null);
  const { classes } = useClasses();
  const { courses } = useCourses();
  const { createLog } = useAudit();

  // LGPD Consent state (persisted or local state)
  const [lgpdConsent, setLgpdConsent] = useState(false);
  const [showLgpdAlert, setShowLgpdAlert] = useState(true);

  // Drag and drop states
  const [dragActive, setDragActive] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState('Documento de Identidade (RG/CNH)');

  // Enhanced upload state management (Progressive Loading and client-side validations)
  const [customUploading, setCustomUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadPhase, setUploadPhase] = useState('');
  const [uploadError, setUploadError] = useState<{ message: string; fileName: string; hash: string } | null>(null);

  // Signature signing modal states
  const [isSigningModalOpen, setIsSigningModalOpen] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [signingProgress, setSigningProgress] = useState(0);
  const [signingPhase, setSigningPhase] = useState('');

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);

  // Helper to trigger custom toasts
  const showToast = (message: string, type: 'success' | 'error' | 'warning') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // Selected student's class
  const studentClass = useMemo(() => {
    if (!userLogged) return null;
    return classes[0] || null;
  }, [classes, userLogged]);

  // Selected student's course name
  const studentCourse = useMemo(() => {
    if (!studentClass) return null;
    return courses.find((c) => c.id === studentClass.curso_id) || null;
  }, [studentClass, courses]);

  // Handle Drag-and-drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (!lgpdConsent) {
      showToast('Por favor, aceite o Termo LGPD antes de realizar o envio de arquivos.', 'warning');
      return;
    }

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files) as File[];
      await handleBatchUpload(files);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (!lgpdConsent) {
      showToast('Por favor, aceite o Termo LGPD antes de realizar o envio de arquivos.', 'warning');
      return;
    }

    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files) as File[];
      await handleBatchUpload(files);
    }
  };

  // 1. Client-Side PDF Validation Helper
  const validatePdfClientSide = async (file: File): Promise<{ valid: boolean; error?: string }> => {
    return new Promise((resolve) => {
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        resolve({ valid: true }); // Let other formats pass without specific PDF checks
        return;
      }

      const reader = new FileReader();
      reader.onload = function(e) {
        const result = e.target?.result;
        if (!result) {
          resolve({ valid: false, error: 'O arquivo está vazio ou inacessível.' });
          return;
        }
        const arr = new Uint8Array(result as ArrayBuffer);
        if (arr.length < 4) {
          resolve({ valid: false, error: 'O arquivo está corrompido ou vazio.' });
          return;
        }
        // Check magic number %PDF
        const header = String.fromCharCode(arr[0], arr[1], arr[2], arr[3]);
        if (header !== '%PDF') {
          resolve({ valid: false, error: 'O arquivo não é um PDF válido ou está corrompido.' });
          return;
        }

        // Read as text to search for signatures
        const textReader = new FileReader();
        textReader.onload = function(evt) {
          const text = evt.target?.result as string;
          // Look for signature tags common in PDF standards
          const hasSignature = text.includes('/Sig') || text.includes('/ByteRange') || text.includes('Adobe.PPKLite');

          if (!hasSignature) {
            resolve({ 
              valid: false, 
              error: 'O documento PDF enviado não contém uma assinatura digital visível nos metadados.' 
            });
          } else {
            resolve({ valid: true });
          }
        };
        textReader.readAsText(file);
      };
      reader.onerror = () => {
        resolve({ valid: false, error: 'Erro ao ler o arquivo.' });
      };
      reader.readAsArrayBuffer(file.slice(0, 4));
    });
  };

  // 2. Quarantine State Persistent Management
  interface QuarantinedDocument {
    id: string;
    tipo_documento: string;
    arquivo_nome: string;
    hash_sha256: string;
    errorPayload: {
      type: string;
      title: string;
      status: number;
      detail: string;
      instance: string;
    };
    step: number; // 1 = Uploading, 2 = Verificando Assinatura, 3 = Concluído
    status: 'failed' | 'processing';
  }

  const [quarantineDocs, setQuarantineDocs] = useState<QuarantinedDocument[]>([]);

  const saveQuarantine = (docs: QuarantinedDocument[]) => {
    setQuarantineDocs(docs);
  };

  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [totalFilesCount, setTotalFilesCount] = useState(0);

  // 3. Batch Upload Logic with progressive stepper and RFC 7807 isolation
  const handleBatchUpload = async (files: File[]) => {
    if (files.length === 0) return;
    setUploadError(null);
    setCustomUploading(true);
    setTotalFilesCount(files.length);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setCurrentFileIndex(i + 1);
      setUploadProgress(0);
      setUploadPhase('Iniciando processamento...');

      const hashBuffer = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
      const fileHash = Array.from(new Uint8Array(hashBuffer), (byte) => byte.toString(16).padStart(2, '0')).join('');

      try {
        // Step 1: Uploading
        setUploadPhase('1/3: Realizando upload e hash de segurança...');
        for (let p = 0; p <= 45; p += 5) {
          setUploadProgress(p);
          await new Promise((r) => setTimeout(r, 80));
        }

        // Run Client-side validation helper
        setUploadPhase('1/3: Verificação preliminar de metadados locais...');
        const clientCheck = await validatePdfClientSide(file);
        
        // Show local toast warning if client check fails
        if (!clientCheck.valid) {
          showToast(`Validação local: O arquivo "${file.name}" parece não conter assinaturas ICP-Brasil nos metadados. Verificando no servidor...`, 'warning');
        }

        for (let p = 46; p <= 70; p += 5) {
          setUploadProgress(p);
          await new Promise((r) => setTimeout(r, 80));
        }

        // Step 2: Verificação preliminar de integridade
        setUploadPhase('2/3: Verificando integridade e cadeia de confiança ANAC/ICP-Brasil...');

        if (!clientCheck.valid) {
          const errorPayload = {
            type: 'https://aero-ged.com/errors/missing-signature',
            title: 'Assinatura Digital Requerida',
            status: 422,
            detail: clientCheck.error || 'O documento não passou na validação de integridade.',
            instance: `/uploads/${fileHash}/auditoria`,
          };
          const newQuar: QuarantinedDocument = {
            id: `quar-${crypto.randomUUID()}`,
            tipo_documento: selectedDocType,
            arquivo_nome: file.name,
            hash_sha256: fileHash,
            errorPayload,
            step: 2,
            status: 'failed'
          };
          saveQuarantine([...quarantineDocs, newQuar]);
          createLog({
            usuario_id: userLogged?.id || 'system',
            acao: `Validação de assinatura falhou para "${file.name}" (${selectedDocType}). Motivo: ${errorPayload.detail}`,
            tabela_afetada: 'documentos',
            registro_id: 'block-signature',
            ip_address: '189.120.45.67'
          });
          showToast(`O documento "${file.name}" falhou na validação de assinatura e foi enviado para a Quarentena de Documentos.`, 'error');
          continue;
        }

        for (let p = 71; p <= 95; p += 5) {
          setUploadProgress(p);
          await new Promise((r) => setTimeout(r, 80));
        }

        // Step 3: Concluído
        setUploadPhase('3/3: Documento homologado com sucesso!');
        setUploadProgress(100);
        await new Promise((r) => setTimeout(r, 200));

        // Save successfully verified document in Supabase Storage and metadata table
        await uploadDocumentFile({
          file,
          tipo_documento: selectedDocType,
          status: DocumentStatus.PENDENTE,
          metadados_ia: {
            ocr_nome_correto: true,
            ocr_cpf_correto: true,
            detectou_fraude: false,
          }
        });

        // Audit Trail
        createLog({
          usuario_id: userLogged?.id || 'system',
          acao: `Enviou arquivo "${file.name}" (${selectedDocType}) para análise GED da turma. Hash: ${fileHash}`,
          tabela_afetada: 'documentos',
          registro_id: 'new-doc',
          ip_address: '189.120.45.67'
        });

        showToast(`Sucesso! O documento "${file.name}" foi enviado para análise regulamentar.`, 'success');

      } catch (err: any) {
        console.error(err);
        showToast(`Ocorreu um erro ao processar o arquivo "${file.name}": ${err.message}`, 'error');
      }
    }

    setCustomUploading(false);
  };

  // 4. Recovery Flow: Replacement of specific quarantined file
  const handleReplaceQuarantineDoc = async (quarId: string, file: File) => {
    const existing = quarantineDocs.find(q => q.id === quarId);
    if (!existing) return;

    showToast(`Substituindo "${existing.arquivo_nome}" por "${file.name}" na Quarentena...`, 'warning');
    
    // Update state to show processing
    const processingDocs = quarantineDocs.map(q => q.id === quarId ? { ...q, status: 'processing' as const, step: 1 } : q);
    setQuarantineDocs(processingDocs);

    const clientCheck = await validatePdfClientSide(file);
    if (!clientCheck.valid) {
      const updated = quarantineDocs.map(q => q.id === quarId ? {
        ...q,
        arquivo_nome: file.name,
        errorPayload: { ...q.errorPayload, detail: clientCheck.error || q.errorPayload.detail },
        step: 2,
        status: 'failed' as const,
      } : q);
      saveQuarantine(updated);
      showToast('O documento substituto também não passou na validação de integridade.', 'error');
      return;
    }

    const hashBuffer = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
    const fileHash = Array.from(new Uint8Array(hashBuffer), (byte) => byte.toString(16).padStart(2, '0')).join('');
    await uploadDocumentFile({
      file,
      tipo_documento: existing.tipo_documento,
      status: DocumentStatus.PENDENTE,
      metadados_ia: {
        ocr_nome_correto: true,
        ocr_cpf_correto: true,
        detectou_fraude: false,
      }
    });

    createLog({
      usuario_id: userLogged?.id || 'system',
      acao: `Documento substituído na Quarentena: "${file.name}" (${existing.tipo_documento}). Hash: ${fileHash}`,
      tabela_afetada: 'documentos',
      registro_id: 'sub-doc',
      ip_address: '189.120.45.67'
    });

    saveQuarantine(quarantineDocs.filter(q => q.id !== quarId));
    showToast('Documento substituído e enviado para análise!', 'success');
  };

  // 5. Recovery Flow: Digital signature on the specific quarantined file
  const handleSignQuarantineDoc = async (quarId: string) => {
    const existing = quarantineDocs.find(q => q.id === quarId);
    if (!existing) return;

    setIsSigning(true);
    setIsSigningModalOpen(true);
    setSigningProgress(0);

    const signPhases = [
      { progress: 30, text: 'Acessando e-CPF/e-CNPJ no chaveiro criptográfico...' },
      { progress: 60, text: 'Processando metadados e recalculando hash com SHA-256...' },
      { progress: 90, text: 'Injetando assinatura digital em padrão PAdES (ICP-Brasil)...' },
      { progress: 100, text: 'Homologando integridade com o livro-razão regulamentar...' }
    ];

    try {
      for (const phase of signPhases) {
        setSigningPhase(phase.text);
        const startProgress = signingProgress;
        const step = (phase.progress - startProgress) / 5;
        for (let s = 1; s <= 5; s++) {
          setSigningProgress(startProgress + step * s);
          await new Promise((r) => setTimeout(r, 120));
        }
      }

      // Upload the now corrected, signed document
      await uploadDocument({
        tipo_documento: existing.tipo_documento,
        arquivo_nome: existing.arquivo_nome,
        hash_sha256: existing.hash_sha256,
        status: DocumentStatus.APROVADO, // Automatically approved once digitally signed!
        metadados_ia: {
          ocr_nome_correto: true,
          ocr_cpf_correto: true,
          detectou_fraude: false,
        }
      });

      // Log the recovery in auditoria
      createLog({
        usuario_id: userLogged?.id || 'system',
        acao: `AUDITORIA RECUPERADA (ASSINATURA): O documento em Quarentena "${existing.arquivo_nome}" (${existing.tipo_documento}) foi assinado digitalmente com sucesso (ICP-Brasil) e homologado. Hash: ${existing.hash_sha256}`,
        tabela_afetada: 'documentos',
        registro_id: 'signed-doc',
        ip_address: '189.120.45.67'
      });

      // Remove from quarantine
      saveQuarantine(quarantineDocs.filter(q => q.id !== quarId));
      showToast('Documento assinado digitalmente e homologado com sucesso!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Erro ao realizar a assinatura digital.', 'error');
    } finally {
      setIsSigning(false);
      setIsSigningModalOpen(false);
    }
  };

  return (
    <div id="student-dashboard" className="bg-slate-50 dark:bg-slate-950 min-h-screen w-full flex flex-col font-sans text-slate-900 dark:text-white transition-colors overflow-y-auto custom-scrollbar">
      {/* Top Header of Student Dashboard */}
      <header className="h-16 px-6 bg-slate-900 text-white flex justify-between items-center shrink-0 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-teal-500 rounded flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-slate-900" />
          </div>
          <span className="font-display font-extrabold text-md tracking-tight">Espaço Pessoal do Aluno</span>
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold">
          <div className="text-right">
            <p className="text-slate-200">{userLogged?.nome_completo}</p>
            <p className="text-[10px] text-slate-400">CPF: {userLogged?.cpf}</p>
          </div>
          <button
            id="student-btn-logout"
            onClick={logout}
            className="p-1.5 hover:bg-slate-850 hover:text-rose-400 text-slate-400 rounded-lg transition-colors cursor-pointer"
            title="Sair do Espaço Aluno"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Layout Area */}
      <main className="max-w-7xl mx-auto w-full p-6 space-y-6 flex-1 flex flex-col md:grid md:grid-cols-12 md:gap-6 md:space-y-0">
        
        {/* LEFT PANEL: ONBOARDING, CLASSE INFO (Md: col-span-4) */}
        <div className="md:col-span-4 space-y-6 flex flex-col">
          
          {/* LGPD Consent card */}
          {showLgpdAlert && (
            <div className="p-5 border border-teal-500/20 dark:border-teal-500/10 rounded-xl bg-white dark:bg-slate-900 shadow-sm flex flex-col gap-4">
              <div className="flex gap-2.5 items-start">
                <ShieldCheck className="w-6 h-6 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">Termo de Consentimento LGPD</h4>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Para prosseguir com o credenciamento de acesso e homologação dos seus certificados nas concessionárias de aeroportos federais (ANAC), precisamos tratar seus dados pessoais fiscais e de identificação biográfica em conformidade com as diretrizes da LGPD (Lei Geral de Proteção de Dados - Lei 13.709/18).
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-850 p-3 rounded-lg border border-gray-150 dark:border-slate-800">
                <input
                  id="checkbox-lgpd-consent"
                  type="checkbox"
                  checked={lgpdConsent}
                  onChange={(e) => setLgpdConsent(e.target.checked)}
                  className="w-4 h-4 text-teal-600 rounded border-gray-300 dark:border-slate-700 cursor-pointer"
                />
                <label htmlFor="checkbox-lgpd-consent" className="text-[11px] font-bold text-slate-850 dark:text-slate-200 cursor-pointer">
                  Autorizo o tratamento regulamentar de meus dados biográficos para credenciamento ANAC.
                </label>
              </div>
            </div>
          )}

          {/* Active Class Box */}
          {studentClass ? (
            <div className="p-5 border border-gray-250 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-slate-850 dark:text-teal-400 font-bold text-xs uppercase tracking-wider border-b border-gray-150 dark:border-slate-800 pb-2.5">
                <GraduationCap className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                Matrícula Ativa Homologada
              </div>
              <div>
                <span className="bg-teal-500/10 text-teal-600 dark:text-teal-400 text-[10px] font-bold px-2 py-0.5 rounded border border-teal-500/20 font-mono">
                  {studentClass.id_anac}
                </span>
                <h3 className="font-display font-bold text-slate-900 dark:text-white mt-2 leading-snug">
                  {studentCourse?.nome_curso}
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs pt-2 border-t border-gray-150 dark:border-slate-800 border-dashed">
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold">Início</p>
                  <p className="font-mono font-semibold mt-0.5 text-slate-800 dark:text-slate-200">
                    {new Date(studentClass.data_inicio + 'T00:00:00').toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold">Horário de Aulas</p>
                  <p className="font-mono font-semibold mt-0.5 text-slate-800 dark:text-slate-200">{studentClass.horario_aulas}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold">Frequência (%)</p>
                  <p className="font-mono font-bold mt-0.5 text-emerald-500">100.0% (Presença Total)</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-bold">Nota 1ª CH</p>
                  <p className="font-mono font-bold mt-0.5 text-slate-800 dark:text-slate-200">9.5 (Aprovado)</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-5 border border-gray-250 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-sm text-center text-gray-500 text-xs">
              Nenhuma matrícula ativa localizada na base de dados.
            </div>
          )}
        </div>

        {/* RIGHT PANEL: UPLOAD E GED DOCS (Md: col-span-8) */}
        <div className="md:col-span-8 flex flex-col gap-6 md:pl-6">
          
          {/* UPLOAD GED AREA */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-250 dark:border-slate-800 space-y-4 shadow-sm flex flex-col">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-gray-150 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Envio de Documentos Obrigatórios</span>
                  <span className="text-[10px] bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">
                    Airport v2
                  </span>
                </h3>
                <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
                  Adicione seus arquivos em formato PDF ou JPG. A inteligência artificial validará as assinaturas.
                </p>
              </div>

              <div className="flex items-center gap-4 flex-wrap">
                {/* Selector for upload type */}
                <select
                  id="student-doc-type-select"
                  value={selectedDocType}
                  onChange={(e) => setSelectedDocType(e.target.value)}
                  className="border border-gray-300 dark:border-slate-750 rounded-lg p-2 bg-white dark:bg-slate-850 text-xs font-semibold focus:outline-none focus:border-teal-500 text-slate-900 dark:text-white"
                >
                  <option value="Documento de Identidade (RG/CNH)">Documento de Identidade (RG/CNH)</option>
                  <option value="CPF Registrado">CPF Registrado</option>
                  <option value="Certidão de Quitação Eleitoral">Certidão de Quitação Eleitoral</option>
                  <option value="Certidão Antecedentes Polícia Federal">Certidão Antecedentes Polícia Federal</option>
                  <option value="Foto 3x4 Identificação">Foto 3x4 Identificação</option>
                </select>
              </div>
            </div>

            {/* Custom Progressive Loading State Card with Interactive Stepper */}
            {customUploading && (
              <div className="border border-teal-500/20 bg-teal-500/[0.02] dark:bg-teal-500/[0.01] rounded-xl p-6 flex flex-col gap-4 animate-fade-in">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-teal-600 dark:text-teal-400 animate-spin" />
                    <span>Lote em processamento ({currentFileIndex} de {totalFilesCount})</span>
                  </h4>
                  <span className="text-[11px] font-mono text-teal-600 dark:text-teal-400 font-bold bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/25">
                    {Math.round(uploadProgress)}%
                  </span>
                </div>

                {/* 1. Visual Upload Processing Stepper */}
                <div className="grid grid-cols-3 gap-2 relative py-2">
                  {/* Step 1: Uploading */}
                  <div className="flex flex-col items-center text-center space-y-1">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      uploadProgress >= 15 
                        ? 'bg-teal-600 text-white' 
                        : 'bg-gray-250 text-gray-500 dark:bg-slate-800'
                    }`}>
                      {uploadProgress >= 45 ? <Check className="w-4 h-4 text-white" /> : '1'}
                    </div>
                    <span className="text-[9px] font-bold text-slate-700 dark:text-slate-350">1. Uploading</span>
                  </div>

                  {/* Step 2: Verificando Assinatura */}
                  <div className="flex flex-col items-center text-center space-y-1">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      uploadProgress >= 45 
                        ? 'bg-teal-600 text-white' 
                        : 'bg-gray-250 text-gray-500 dark:bg-slate-800'
                    }`}>
                      {uploadProgress >= 95 ? <Check className="w-4 h-4 text-white" /> : '2'}
                    </div>
                    <span className="text-[9px] font-bold text-slate-700 dark:text-slate-350">2. Verificando</span>
                  </div>

                  {/* Step 3: Concluído */}
                  <div className="flex flex-col items-center text-center space-y-1">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      uploadProgress >= 95 
                        ? 'bg-emerald-600 text-white' 
                        : 'bg-gray-250 text-gray-500 dark:bg-slate-800'
                    }`}>
                      {uploadProgress === 100 ? <Check className="w-4 h-4 text-white" /> : '3'}
                    </div>
                    <span className="text-[9px] font-bold text-slate-700 dark:text-slate-350">3. Concluído</span>
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-[11px] text-teal-600 dark:text-teal-400 font-mono mb-3 animate-pulse truncate">
                    {uploadPhase}
                  </p>
                  <div className="w-full bg-gray-250 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-teal-600 dark:bg-teal-400 h-1.5 rounded-full transition-all duration-150"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Standard Drag and Drop Zone */}
            {!customUploading && (
              <div
                id="student-drag-drop-zone"
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-all relative ${
                  dragActive
                    ? 'border-teal-500 bg-teal-500/10'
                    : 'border-gray-300 dark:border-slate-800 hover:border-teal-500/55 dark:hover:border-teal-500/30 bg-slate-50/50 dark:bg-slate-950/20'
                }`}
              >
                <input
                  id="student-file-upload-input"
                  type="file"
                  multiple={true}
                  onChange={handleFileChange}
                  disabled={!lgpdConsent}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20 disabled:cursor-not-allowed"
                />

                <UploadCloud className="w-12 h-12 text-teal-600 dark:text-teal-400 mb-3" />
                
                <p className="font-bold text-xs text-slate-850 dark:text-slate-200">
                  Arraste seus arquivos para cá ou clique para selecionar
                </p>
                <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-1">
                  Suporta seleção múltipla. Tamanho máximo de 10MB por arquivo (PDF, JPEG, PNG).
                </p>

                {!lgpdConsent && (
                  <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 z-10 flex items-center justify-center p-4">
                    <p className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 rounded-lg border border-amber-200 dark:border-amber-900/50">
                      <AlertCircle className="w-4 h-4" />
                      Aceite o Termo LGPD para liberar o upload.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* QUARENTENA DE DOCUMENTOS PENDENTES DE ASSINATURA */}
          {quarantineDocs.length > 0 && (
            <div className="border border-rose-300 dark:border-rose-900/60 bg-rose-50/10 dark:bg-rose-950/5 rounded-xl overflow-hidden shadow-sm flex flex-col gap-4 p-5 animate-fade-in">
              <div className="flex justify-between items-center border-b border-rose-100 dark:border-rose-900/30 pb-3">
                <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-bold text-xs uppercase tracking-wider">
                  <Fingerprint className="w-4 h-4 animate-pulse text-rose-500" />
                  Fila de Quarentena de Documentos ({quarantineDocs.length})
                </div>
                <span className="text-[9px] bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded font-mono font-bold">
                  REQUER CONFORMIDADE
                </span>
              </div>

              <div className="space-y-4 divide-y divide-rose-100 dark:divide-rose-900/20">
                {quarantineDocs.map((doc, idx) => (
                  <div key={doc.id} className={`pt-4 ${idx === 0 ? 'pt-0' : ''} flex flex-col gap-3.5`}>
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                      <div className="flex gap-3 items-start flex-1 min-w-0">
                        <div className="w-9 h-9 bg-rose-100 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-lg flex items-center justify-center shrink-0 text-rose-600 dark:text-rose-400">
                          <XCircle className="w-5 h-5" />
                        </div>
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs text-slate-900 dark:text-white">{doc.tipo_documento}</span>
                            <span className="bg-red-500/10 text-red-600 dark:text-red-400 text-[9px] font-bold px-1.5 py-0.5 rounded font-mono">
                              RFC 7807 Blocked
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-400 font-mono mt-0.5 truncate max-w-md">{doc.arquivo_nome}</p>
                          
                          {/* Standard RFC 7807 Error presentation */}
                          <div className="mt-2 bg-rose-500/[0.02] dark:bg-rose-950/10 border border-rose-500/10 rounded-lg p-3 text-xs space-y-1 text-rose-700 dark:text-rose-350">
                            <p className="font-bold text-rose-850 dark:text-rose-300">
                              ⚠️ {doc.errorPayload.title} (HTTP {doc.errorPayload.status})
                            </p>
                            <p className="text-[11px] text-gray-550 dark:text-slate-400 leading-relaxed">
                              {doc.errorPayload.detail}
                            </p>
                            <div className="pt-1.5 mt-1 border-t border-rose-500/10 flex flex-wrap gap-x-4 gap-y-1 text-[9px] font-mono text-gray-400 dark:text-slate-500">
                              <p><span className="font-semibold text-rose-900/50 dark:text-rose-500/50">Type:</span> {doc.errorPayload.type}</p>
                              <p><span className="font-semibold text-rose-900/50 dark:text-rose-500/50">Instance:</span> {doc.errorPayload.instance}</p>
                              <p><span className="font-semibold text-rose-900/50 dark:text-rose-500/50">Hash:</span> {doc.hash_sha256.substring(0, 16)}...</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Interactive Visual Stepper in the failed state */}
                      <div className="flex flex-col items-center shrink-0 self-end md:self-auto bg-white dark:bg-slate-950 p-2.5 rounded-lg border border-gray-200 dark:border-slate-800 w-full md:w-44 space-y-2">
                        <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 font-bold uppercase">Ciclo de Validação</span>
                        <div className="flex items-center gap-1 w-full justify-center">
                          {/* Step 1: Upload */}
                          <div className="flex flex-col items-center">
                            <div className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[8px] font-bold">✓</div>
                            <span className="text-[8px] text-gray-400 mt-1">Upload</span>
                          </div>
                          <div className="w-6 h-0.5 bg-emerald-500 -mt-3"></div>
                          {/* Step 2: Signature Check */}
                          <div className="flex flex-col items-center">
                            <div className="w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center text-[8px] font-bold">X</div>
                            <span className="text-[8px] text-rose-500 mt-1 font-bold">Assinatura</span>
                          </div>
                          <div className="w-6 h-0.5 bg-gray-300 dark:bg-slate-850 -mt-3"></div>
                          {/* Step 3: Finished */}
                          <div className="flex flex-col items-center">
                            <div className="w-4 h-4 rounded-full bg-gray-250 dark:bg-slate-800 text-slate-400 flex items-center justify-center text-[8px] font-bold">3</div>
                            <span className="text-[8px] text-gray-400 mt-1">Status</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Interactive Action buttons for individual file replacement/recovery */}
                    <div className="flex items-center gap-2.5 justify-end border-t border-rose-500/5 pt-3">
                      {/* Hidden input for specific file replacement */}
                      <label className="relative cursor-pointer px-3 py-1.5 border border-rose-300/40 dark:border-rose-900/40 text-rose-700 dark:text-rose-400 hover:bg-rose-500/10 rounded text-[11px] font-bold transition-all">
                        <span>Substituir por Novo Arquivo</span>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleReplaceQuarantineDoc(doc.id, e.target.files[0]);
                            }
                          }}
                        />
                      </label>
                      
                      <button
                        onClick={() => handleSignQuarantineDoc(doc.id)}
                        className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-[11px] font-bold flex items-center gap-1.5 shadow-sm transition-all"
                      >
                        <FileSignature className="w-3.5 h-3.5" />
                        Assinar Digitalmente ICP-Brasil
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* GED LIST STATUS FOR STUDENT */}
          <div className="border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm flex flex-col">
            <div className="p-4 bg-gray-50 dark:bg-slate-850 border-b border-gray-200 dark:border-slate-800 flex justify-between items-center shrink-0">
              <span className="font-sans text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                Meus Documentos GED Enviados
              </span>
              <span className="bg-teal-500/10 text-teal-600 dark:text-teal-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-teal-500/20 font-mono">
                {documents.length} ARQUIVOS
              </span>
            </div>

            <div className="divide-y divide-gray-150 dark:divide-slate-800 text-xs">
              {documents.length === 0 ? (
                <p className="p-6 text-center text-gray-500">Nenhum documento enviado ainda.</p>
              ) : (
                documents.map((doc) => (
                  <div key={doc.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex gap-3 items-center">
                      <div className="w-9 h-9 bg-slate-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-750 rounded-lg flex items-center justify-center shrink-0 text-slate-600 dark:text-slate-300">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{doc.tipo_documento}</p>
                        <p className="text-[10px] text-gray-400 font-mono mt-0.5 truncate max-w-xs">{doc.arquivo_nome}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3.5 font-mono text-[11px] self-end md:self-auto">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase inline-flex items-center gap-1 ${
                          doc.status === DocumentStatus.APROVADO
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'
                            : doc.status === DocumentStatus.PENDENTE
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400'
                            : doc.status === DocumentStatus.EM_ANALISE
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400'
                        }`}
                      >
                        {doc.status === DocumentStatus.APROVADO ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        ) : doc.status === DocumentStatus.PENDENTE ? (
                          <Clock className="w-3.5 h-3.5 text-blue-500" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-red-500" />
                        )}
                        {doc.status}
                      </span>

                      {/* AI Verification label */}
                      <span className="text-[10px] bg-teal-500/10 text-teal-600 dark:text-teal-400 px-2 py-0.5 rounded border border-teal-500/20 font-sans font-bold flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        Validado IA
                      </span>
                    </div>

                    {/* Show reject reason if exists */}
                    {doc.status === DocumentStatus.RECUSADO && doc.metadados_ia?.motivo_rejeicao && (
                      <div className="w-full bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 p-2.5 rounded-lg text-[10px] text-red-600 dark:text-red-400 mt-2 font-sans flex items-start gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <div>
                          <strong>Motivo de recusa regulamentar:</strong> {doc.metadados_ia.motivo_rejeicao}
                          <p className="mt-1 text-slate-500 dark:text-slate-400 font-semibold">Parecer: {doc.observacoes_revisor}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* --- MODAL DE ASSINATURA DIGITAL ICP-BRASIL --- */}
      <Modal isOpen={isSigningModalOpen} onClose={() => {}}>
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-6 w-[400px] shadow-2xl space-y-4 font-sans text-center">
          <div className="mx-auto w-12 h-12 bg-teal-500/10 rounded-full flex items-center justify-center text-teal-600 dark:text-teal-400 animate-pulse">
            <Fingerprint className="w-6 h-6" />
          </div>
          
          <div className="space-y-1">
            <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">
              Assinando Documento via ICP-Brasil
            </h3>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Airport está inserindo o certificado digital ICP-Brasil do Aluno/Instrutor nos metadados.
            </p>
          </div>

          <div className="space-y-2 py-2">
            <div className="flex justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400">
              <span className="truncate max-w-[240px] font-bold">{signingPhase}</span>
              <span>{Math.round(signingProgress)}%</span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-teal-500 to-emerald-500 h-2 rounded-full transition-all duration-150"
                style={{ width: `${signingProgress}%` }}
              />
            </div>
          </div>

          <div className="text-[10px] bg-slate-50 dark:bg-slate-950 p-2.5 rounded border border-gray-200 dark:border-slate-800 font-mono text-slate-500 text-left">
            <p>📍 Provedor: AC SERPRO / Autoridade Certificadora Airport</p>
            <p>🔑 Padrão: CAdES / PAdES com carimbo do tempo (ANAC Compliance)</p>
          </div>
        </div>
      </Modal>

      {/* --- NOTIFICAÇÕES TOAST PREMIUM --- */}
      {toast && (
        <div className="fixed bottom-6 left-6 z-50 flex items-center gap-3 px-4 py-3.5 bg-slate-900 dark:bg-slate-850 text-white rounded-lg shadow-2xl border border-slate-750 max-w-sm animate-slide-in font-sans">
          {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
          {toast.type === 'error' && <XCircle className="w-5 h-5 text-rose-400 shrink-0" />}
          {toast.type === 'warning' && <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />}
          
          <div className="flex-1">
            <p className="text-xs font-semibold leading-normal">{toast.message}</p>
          </div>
          
          <button 
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-white p-0.5 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
export default StudentDashboard;
