import React, { useEffect, useRef, useState } from 'react';
import { SlidePanel } from './ui/SlidePanel';
import { Modal } from './ui/Modal';
import { Upload, X, Check, ChevronRight, ChevronLeft, MapPin, User, FileCheck, Save, AlertTriangle } from 'lucide-react';
import { useUsers } from '../hooks/useUsers';
import { useCompanies } from '../hooks/useCompanies';
import { documentService } from '../services/documentService';
import { PersonalInfoFields, useStudentFormValidation, validateStudentField, dateToDisplay, dateToPayload } from './shared/StudentFormShared';
import { DocumentStatus, UserRole } from '../types';

interface StudentRegistrationModalProps {
  initialData?: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (result: { studentId: string; status: 'ativo' | 'pendente' }) => void;
}

type FileField = 'rg' | 'cpf' | 'cnh' | 'residencia' | 'ensino_medio' | 'antecedentes_federais' | 'antecedentes_estaduais';
type FormData = {
  email: string;
  telefone: string;
  empresa_id: string;
  nome_completo: string;
  data_nascimento: string;
  nome_mae: string;
  nome_pai: string;
  rg: string;
  orgao_expedicao_rg: string;
  cpf: string;
  grau_ensino: string;
  cep: string;
  endereco: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  trabalha_aviacao_civil: string;
  trabalha_seguranca_avsec: string;
  tipo_documento: string;
  senha_temporaria: string;
};
type FilesState = Record<FileField, File | null>;
type DraftFileNames = Partial<Record<FileField, string>>;
type StoredDraft = {
  formData: FormData;
  step: number;
  fileNames: DraftFileNames;
};
type FileUploadState = {
  status: 'idle' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
};
type DocumentRecord = import('../types').Documento;

const DRAFT_STORAGE_KEY = 'student-registration-draft-v1';
const fileFields: FileField[] = ['rg', 'cpf', 'cnh', 'residencia', 'ensino_medio', 'antecedentes_federais', 'antecedentes_estaduais'];

const getRequiredFileFields = (tipoDocumento: string): FileField[] => [
  ...(tipoDocumento === 'identidade_cpf' || tipoDocumento === 'identidade_sem_cpf' ? ['rg' as FileField] : []),
  ...(tipoDocumento === 'identidade_sem_cpf' ? ['cpf' as FileField] : []),
  ...(tipoDocumento === 'cnh' ? ['cnh' as FileField] : []),
  'residencia',
  'ensino_medio',
  'antecedentes_federais',
  'antecedentes_estaduais'
];

const allowedFileTypes = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);
const documentTypes: Record<FileField, string> = {
  rg: 'RG',
  cpf: 'CPF',
  cnh: 'CNH',
  residencia: 'Comprovante de Residência',
  ensino_medio: 'Certificado Ensino Médio',
  antecedentes_federais: 'Antecedentes Criminais - Justiça Federal',
  antecedentes_estaduais: 'Antecedentes Criminais - Justiça Estadual'
};

const createEmptyFiles = (): FilesState => ({
  rg: null,
  cpf: null,
  cnh: null,
  residencia: null,
  ensino_medio: null,
  antecedentes_federais: null,
  antecedentes_estaduais: null
});

const createEmptyUploadStates = (): Record<FileField, FileUploadState> => ({
  rg: { status: 'idle', progress: 0 },
  cpf: { status: 'idle', progress: 0 },
  cnh: { status: 'idle', progress: 0 },
  residencia: { status: 'idle', progress: 0 },
  ensino_medio: { status: 'idle', progress: 0 },
  antecedentes_federais: { status: 'idle', progress: 0 },
  antecedentes_estaduais: { status: 'idle', progress: 0 }
});

let draftFilesInMemory: FilesState = createEmptyFiles();

const randomIndex = (max: number) => {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    return values[0] % max;
  }
  return Math.floor(Math.random() * max);
};

const createTemporaryPassword = () => {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const numbers = '23456789';
  const symbols = '!@#$%&*+-=';
  const all = `${upper}${lower}${numbers}${symbols}`;
  const password = [
    upper[randomIndex(upper.length)],
    lower[randomIndex(lower.length)],
    numbers[randomIndex(numbers.length)],
    symbols[randomIndex(symbols.length)]
  ];

  while (password.length < 16) password.push(all[randomIndex(all.length)]);
  return password.sort(() => randomIndex(2) - 0.5).join('');
};

const createEmptyFormData = (): FormData => ({
  email: '',
  telefone: '',
  empresa_id: '',
  nome_completo: '',
  data_nascimento: '',
  nome_mae: '',
  nome_pai: '',
  rg: '',
  orgao_expedicao_rg: '',
  cpf: '',
  grau_ensino: '',
  cep: '',
  endereco: '',
  numero: '',
  bairro: '',
  cidade: '',
  estado: '',
  trabalha_aviacao_civil: '',
  trabalha_seguranca_avsec: '',
  tipo_documento: 'identidade_cpf',
  senha_temporaria: createTemporaryPassword()
});

const createFormDataFromInitialData = (initialData?: any): FormData => {
  const empty = createEmptyFormData();
  if (!initialData) return empty;

  return {
    ...empty,
    email: initialData.email || '',
    telefone: initialData.telefone || '',
    empresa_id: initialData.empresa_id || '',
    nome_completo: initialData.nome_completo || '',
    data_nascimento: dateToDisplay(initialData.data_nascimento || ''),
    nome_mae: initialData.nome_mae || '',
    nome_pai: initialData.nome_pai || '',
    rg: initialData.rg || '',
    orgao_expedicao_rg: initialData.orgao_expedicao_rg || '',
    grau_ensino: initialData.grau_ensino || '',
    cpf: initialData.cpf || '',
    endereco: initialData.endereco || '',
    numero: initialData.numero || '',
    bairro: initialData.bairro || '',
    cidade: initialData.cidade || '',
    estado: initialData.estado || '',
    cep: initialData.cep || '',
    trabalha_aviacao_civil: initialData.trabalha_aviacao_civil || '',
    trabalha_seguranca_avsec: initialData.trabalha_seguranca_avsec || '',
    tipo_documento: initialData.tipo_documento || 'identidade_cpf'
  };
};

const getDraftStorage = () => {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

const DRAFT_DB_NAME = 'aero-ged-drafts';
const DRAFT_STORE_NAME = 'files';

const openDraftDb = () => new Promise<IDBDatabase | null>((resolve) => {
  if (typeof indexedDB === 'undefined') {
    resolve(null);
    return;
  }
  const request = indexedDB.open(DRAFT_DB_NAME, 1);
  request.onupgradeneeded = () => {
    if (!request.result.objectStoreNames.contains(DRAFT_STORE_NAME)) {
      request.result.createObjectStore(DRAFT_STORE_NAME, { keyPath: 'field' });
    }
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => resolve(null);
});

const saveDraftFile = async (field: FileField, file: File) => {
  const db = await openDraftDb();
  if (!db) return;
  const transaction = db.transaction(DRAFT_STORE_NAME, 'readwrite');
  transaction.objectStore(DRAFT_STORE_NAME).put({ field, file });
  transaction.oncomplete = () => db.close();
};

const readDraftFiles = async (): Promise<FilesState> => {
  const files = createEmptyFiles();
  const db = await openDraftDb();
  if (!db) return files;
  const request = db.transaction(DRAFT_STORE_NAME, 'readonly').objectStore(DRAFT_STORE_NAME).getAll();
  return new Promise((resolve) => {
    request.onsuccess = () => {
      (request.result as Array<{ field: FileField; file: File }>).forEach(({ field, file }) => {
        files[field] = file;
      });
      db.close();
      resolve(files);
    };
    request.onerror = () => {
      db.close();
      resolve(files);
    };
  });
};

const clearDraftFiles = async () => {
  const db = await openDraftDb();
  if (!db) return;
  const transaction = db.transaction(DRAFT_STORE_NAME, 'readwrite');
  transaction.objectStore(DRAFT_STORE_NAME).clear();
  transaction.oncomplete = () => db.close();
};

const readDraft = (): StoredDraft | null => {
  const storage = getDraftStorage();
  if (!storage) return null;
  try {
    const parsed = JSON.parse(storage.getItem(DRAFT_STORAGE_KEY) || 'null');
    if (!parsed || typeof parsed !== 'object' || !parsed.formData) return null;
    const formData = createEmptyFormData();
    Object.keys(formData).forEach((key) => {
      if (key === 'senha_temporaria') return;
      const value = parsed.formData[key];
      if (typeof value === 'string') {
        formData[key as keyof FormData] = (key === 'data_nascimento' ? dateToDisplay(value) : value) as never;
      }
    });
    return {
      formData,
      step: parsed.step === 2 || parsed.step === 3 ? parsed.step : 1,
      fileNames: parsed.fileNames && typeof parsed.fileNames === 'object' ? parsed.fileNames : {}
    };
  } catch {
    return null;
  }
};

const clearStoredDraft = () => {
  getDraftStorage()?.removeItem(DRAFT_STORAGE_KEY);
  void clearDraftFiles();
  draftFilesInMemory = createEmptyFiles();
};


const hasDraftContent = (formData: FormData, files: FilesState, fileNames: DraftFileNames, initialPassword: string) => {
  const hasFormValues = Object.entries(formData).some(([key, value]) => {
    if (key === 'tipo_documento') return value !== 'identidade_cpf';
    if (key === 'senha_temporaria') return value !== initialPassword;
    return Boolean(value);
  });
  return hasFormValues || Object.values(files).some(Boolean) || Object.values(fileNames).some(Boolean);
};

const saveDraft = (formData: FormData, files: FilesState, step: number, fileNames: DraftFileNames) => {
  const storage = getDraftStorage();
  if (!storage) return;
  try {
    storage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({
      formData: { ...formData, senha_temporaria: '' },
      step,
      fileNames: fileFields.reduce<DraftFileNames>((names, field) => {
        const file = files[field];
        if (file) names[field] = file.name;
        else if (fileNames[field]) names[field] = fileNames[field];
        return names;
      }, {})
    }));
  } catch {
    // The in-memory draft remains available while the application is open.
  }
};

export function StudentRegistrationModal({ isOpen, onClose, onSuccess, initialData }: StudentRegistrationModalProps) {
  const { createUser, updateUser } = useUsers();
  const { companies } = useCompanies();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>(() => createEmptyFormData());
  const [files, setFiles] = useState<FilesState>(() => createEmptyFiles());
  const [uploadStates, setUploadStates] = useState<Record<FileField, FileUploadState>>(() => createEmptyUploadStates());
  const [uploadedDocuments, setUploadedDocuments] = useState<Partial<Record<FileField, DocumentRecord>>>({});
  const [createdUserId, setCreatedUserId] = useState<string | null>(null);
  const [draftFileNames, setDraftFileNames] = useState<DraftFileNames>({});
  const [draftToResume, setDraftToResume] = useState<StoredDraft | null>(null);
  const [showCloseConfirmation, setShowCloseConfirmation] = useState(false);
  const initialPasswordRef = useRef(formData.senha_temporaria);
  const openingRef = useRef(false);

  const { errors, touched, handleBlur, validateField, validateFields, setErrors, setTouched } = useStudentFormValidation(formData, setFormData);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }, [step]);

  useEffect(() => {
    if (!isOpen) return;

    openingRef.current = true;
    setShowCloseConfirmation(false);
    const storedDraft = initialData ? null : readDraft();
    const nextFormData = createFormDataFromInitialData(initialData);
    initialPasswordRef.current = nextFormData.senha_temporaria;
    setFormData(nextFormData);
    setStep(1);
    setFiles(createEmptyFiles());
    setUploadStates(createEmptyUploadStates());
    setUploadedDocuments({});
    setCreatedUserId(null);
    setDraftFileNames({});
    setErrors({});
    setTouched({});

    if (storedDraft && hasDraftContent(storedDraft.formData, draftFilesInMemory, storedDraft.fileNames, '')) {
      setDraftToResume(storedDraft);
    } else {
      setDraftToResume(null);
    }
  }, [isOpen, initialData, setErrors, setTouched]);

  useEffect(() => {
    if (!isOpen || initialData || draftToResume) return;
    if (openingRef.current) {
      openingRef.current = false;
      return;
    }

    draftFilesInMemory = { ...files };
    if (hasDraftContent(formData, files, draftFileNames, initialPasswordRef.current)) {
      saveDraft(formData, files, step, draftFileNames);
    } else {
      clearStoredDraft();
    }
  }, [isOpen, initialData, draftToResume, formData, files, draftFileNames, step]);

  const applyMask = (name: string, value: string) => {
    let masked = value;
    if (name === 'cpf') {
      masked = value.replace(/\D/g, '')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
        .substring(0, 14);
    } else if (name === 'cep') {
      masked = value.replace(/\D/g, '')
        .replace(/(\d{5})(\d)/, '$1-$2')
        .substring(0, 9);
    } else if (name === 'telefone') {
      masked = value.replace(/\D/g, '')
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4,5})(\d{4})/, '$1-$2')
        .substring(0, 15);
    } else if (name === 'data_nascimento') {
      masked = value.replace(/\D/g, '')
        .replace(/(\d{2})(\d)/, '$1/$2')
        .replace(/(\d{2})\/(\d{2})(\d)/, '$1/$2/$3')
        .substring(0, 10);
    }
    return masked;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const nextValue = name === 'senha_temporaria' ? value : applyMask(name, value);
    setFormData(prev => ({ ...prev, [name]: nextValue }));
    setTouched(prev => ({ ...prev, [name]: true }));
    validateField(name, nextValue);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: FileField) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    if (!allowedFileTypes.has(selectedFile.type)) {
      setUploadStates(prev => ({
        ...prev,
        [fieldName]: { status: 'error', progress: 0, error: 'Use apenas PDF, JPG, PNG ou WEBP.' }
      }));
      e.target.value = '';
      return;
    }
    setFiles(prev => ({ ...prev, [fieldName]: selectedFile }));
    setUploadStates(prev => ({ ...prev, [fieldName]: { status: 'idle', progress: 0 } }));
    setUploadedDocuments(prev => {
      const next = { ...prev };
      delete next[fieldName];
      return next;
    });
    setDraftFileNames(prev => ({ ...prev, [fieldName]: undefined }));
    void saveDraftFile(fieldName, selectedFile);
  };

  const stepFields: Record<number, string[]> = {
    1: ['nome_completo', 'data_nascimento', 'cpf', 'nome_mae', 'rg', 'orgao_expedicao_rg', 'grau_ensino', 'telefone', 'email', 'trabalha_aviacao_civil', 'trabalha_seguranca_avsec', 'senha_temporaria'],
    2: ['cep', 'endereco', 'numero', 'bairro', 'cidade', 'estado']
  };

  const validateStudentValue = (field: string, value: string) => !validateStudentField(field, value);

  const focusFirstInvalid = (fields: string[]) => {
    const firstInvalid = fields.find(field => !validateStudentValue(field, formData[field as keyof FormData]));
    if (!firstInvalid) return;
    const element = document.querySelector<HTMLElement>(`[name="${firstInvalid}"]`);
    element?.focus();
    if (element && contentRef.current) contentRef.current.scrollTo({ top: Math.max(0, element.offsetTop - 24), behavior: 'smooth' });
  };

  const validateCurrentStep = () => {
    const fields = stepFields[step] || [];
    const valid = validateFields(fields);
    if (!valid) window.requestAnimationFrame(() => focusFirstInvalid(fields));
    return valid;
  };

  const handleNext = () => {
    if (validateCurrentStep()) setStep(step + 1);
  };

  const requestStep = (targetStep: number) => {
    if (targetStep <= step) {
      setStep(targetStep);
      return;
    }
    for (let currentStep = step; currentStep < targetStep; currentStep += 1) {
      const fields = stepFields[currentStep] || [];
      if (!validateFields(fields)) {
        if (currentStep !== step) setStep(currentStep);
        window.requestAnimationFrame(() => focusFirstInvalid(fields));
        return;
      }
    }
    setStep(targetStep);
  };

  const fieldClass = (name: string) => `w-full border ${touched[name] && errors[name] ? 'border-red-500' : 'border-gray-300 dark:border-slate-700'} rounded-lg p-2.5 bg-white dark:bg-slate-850 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#005f5f] outline-none`;
  const fieldA11y = (name: string) => ({
    'aria-invalid': Boolean(touched[name] && errors[name]),
    'aria-describedby': touched[name] && errors[name] ? `${name}-error` : undefined
  });

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const continueDraft = () => {
    if (!draftToResume) return;
    initialPasswordRef.current = draftToResume.formData.senha_temporaria;
    setFormData(draftToResume.formData);
    setStep(draftToResume.step);
    setFiles({ ...draftFilesInMemory });
    setDraftFileNames(draftToResume.fileNames);
    setDraftToResume(null);
    void readDraftFiles().then(setFiles);
  };

  const startNewRegistration = () => {
    clearStoredDraft();
    const nextFormData = createEmptyFormData();
    initialPasswordRef.current = nextFormData.senha_temporaria;
    setFormData(nextFormData);
    setFiles(createEmptyFiles());
    setDraftFileNames({});
    setStep(1);
    setDraftToResume(null);
  };

  const requestClose = () => {
    if (draftToResume || hasDraftContent(formData, files, draftFileNames, initialPasswordRef.current)) {
      setShowCloseConfirmation(true);
    } else {
      onClose();
    }
  };

  const saveAndExit = () => {
    if (draftToResume) {
      saveDraft(draftToResume.formData, draftFilesInMemory, draftToResume.step, draftToResume.fileNames);
    } else {
      draftFilesInMemory = { ...files };
      saveDraft(formData, files, step, draftFileNames);
    }
    setDraftToResume(null);
    setShowCloseConfirmation(false);
    onClose();
  };

  const discardAndExit = () => {
    clearStoredDraft();
    setDraftToResume(null);
    setShowCloseConfirmation(false);
    setFiles(createEmptyFiles());
    setDraftFileNames({});
    onClose();
  };

  const uploadDocumentField = async (field: FileField, userId: string): Promise<DocumentRecord | null> => {
    const file = files[field];
    if (!file) return null;
    const existing = uploadedDocuments[field];
    setUploadStates(prev => ({ ...prev, [field]: { status: 'uploading', progress: 0 } }));
    try {
      const document = existing
        ? await documentService.createReplacement(existing, file)
        : await documentService.uploadFile({
          file,
          usuario_id: userId,
          tipo_documento: documentTypes[field],
          status: DocumentStatus.PENDENTE,
          origem_cadastro: 'interno',
          metodo_verificacao: 'manual',
          storage_area: 'temporarios',
          grupo_documento_id: `${userId}:${documentTypes[field]}`,
          onProgress: (progress) => setUploadStates(prev => ({
            ...prev,
            [field]: { status: 'uploading', progress }
          }))
        });
      setUploadStates(prev => ({ ...prev, [field]: { status: 'success', progress: 100 } }));
      return document;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha no upload.';
      setUploadStates(prev => ({ ...prev, [field]: { status: 'error', progress: 0, error: message } }));
      return null;
    }
  };

  const promoteCompleteRegistration = async (userId: string, records: Partial<Record<FileField, DocumentRecord>>) => {
    const requiredFields = getRequiredFileFields(formData.tipo_documento);
    if (!requiredFields.every(field => Boolean(records[field]))) return false;

    const officialRecords: Partial<Record<FileField, DocumentRecord>> = { ...records };
    for (const field of requiredFields) {
      const record = records[field];
      if (!record) return false;
      officialRecords[field] = record.storage_area === 'oficiais'
        ? record
        : await documentService.promoteToOfficial(record);
    }

    await updateUser({ id: userId, updates: { status: 'ativo' } });
    setUploadedDocuments(officialRecords);
    return true;
  };

  const resetAfterSuccess = (userId: string, status: 'ativo' | 'pendente') => {
    clearStoredDraft();
    setDraftToResume(null);
    setCreatedUserId(null);
    setUploadedDocuments({});
    setUploadStates(createEmptyUploadStates());
    onSuccess?.({ studentId: userId, status });
    onClose();
    const nextFormData = createEmptyFormData();
    initialPasswordRef.current = nextFormData.senha_temporaria;
    setStep(1);
    setFormData(nextFormData);
    setFiles(createEmptyFiles());
    setDraftFileNames({});
    setErrors({});
    setTouched({});
  };

  const retryUpload = async (field: FileField) => {
    if (!createdUserId || !files[field]) return;
    setIsLoading(true);
    const document = await uploadDocumentField(field, createdUserId);
    const records = document ? { ...uploadedDocuments, [field]: document } : uploadedDocuments;
    if (document) setUploadedDocuments(records);
    if (document && await promoteCompleteRegistration(createdUserId, records)) resetAfterSuccess(createdUserId, 'ativo');
    setIsLoading(false);
  };

  const handleSubmit = async () => {
    try {
      setIsLoading(true);
      let userId = createdUserId;
      if (!userId) {
        const newUser = await createUser({
          role: UserRole.ALUNO,
          nome_completo: formData.nome_completo,
          cpf: formData.cpf,
          email: formData.email,
          telefone: formData.telefone,
          password: formData.senha_temporaria,
          empresa_id: formData.empresa_id || undefined,
          termo_lgpd_aceite: true,
          data_aceite_lgpd: new Date().toISOString(),
          data_nascimento: dateToPayload(formData.data_nascimento),
          nome_mae: formData.nome_mae,
          nome_pai: formData.nome_pai,
          rg: formData.rg,
          orgao_expedicao_rg: formData.orgao_expedicao_rg,
          grau_ensino: formData.grau_ensino,
          cep: formData.cep,
          endereco: formData.endereco,
          numero: formData.numero,
          bairro: formData.bairro,
          cidade: formData.cidade,
          estado: formData.estado,
          trabalha_aviacao_civil: formData.trabalha_aviacao_civil,
          trabalha_seguranca_avsec: formData.trabalha_seguranca_avsec,
          status: 'pendente',
          origem_cadastro: 'interno',
          tipo_documento_selecionado: formData.tipo_documento
        });
        userId = newUser.id;
        setCreatedUserId(userId);
      }

      const records = { ...uploadedDocuments };
      for (const field of fileFields) {
        if (!files[field] || records[field]) continue;
        const document = await uploadDocumentField(field, userId);
        if (document) records[field] = document;
      }
      setUploadedDocuments(records);

      const hasUploadFailure = fileFields.some(field => files[field] && !records[field]);
      if (hasUploadFailure) return;

      if (await promoteCompleteRegistration(userId, records)) {
        resetAfterSuccess(userId, 'ativo');
        return;
      }

      resetAfterSuccess(userId, 'pendente');
    } catch {
      alert('Erro ao cadastrar aluno.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <SlidePanel isOpen={isOpen} onClose={requestClose} maxWidth="max-w-2xl">
        <div className="bg-white dark:bg-slate-900 w-full h-full overflow-hidden flex flex-col font-sans relative" onClick={e => e.stopPropagation()}>
          <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-850 shrink-0">
            <div>
              <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">{initialData ? 'Editar Aluno' : 'Matrícula de Novo Aluno'}</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Preencha os dados em 3 etapas para realizar o cadastro.</p>
            </div>
            <button onClick={requestClose} className="p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors" aria-label="Fechar cadastro">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 shrink-0">
            <div className="flex items-center justify-between">
              <button type="button" onClick={() => requestStep(1)} className={`flex flex-col items-center flex-1 rounded-xl py-2 transition-colors ${step === 1 ? 'bg-teal-50 dark:bg-teal-900/20 text-[#005f5f] dark:text-teal-400' : 'text-gray-400 dark:text-slate-600 hover:bg-gray-50 dark:hover:bg-slate-800'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold mb-1 border-2 ${step === 1 ? 'border-[#005f5f] dark:border-teal-400 bg-white dark:bg-slate-800' : 'border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800'}`}>1</div>
                <span className="text-[10px] uppercase font-bold tracking-wider">Dados Pessoais</span>
              </button>
              <button type="button" onClick={() => requestStep(2)} className={`flex flex-col items-center flex-1 rounded-xl py-2 transition-colors ${step === 2 ? 'bg-teal-50 dark:bg-teal-900/20 text-[#005f5f] dark:text-teal-400' : 'text-gray-400 dark:text-slate-600 hover:bg-gray-50 dark:hover:bg-slate-800'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold mb-1 border-2 ${step === 2 ? 'border-[#005f5f] dark:border-teal-400 bg-white dark:bg-slate-800' : 'border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800'}`}>2</div>
                <span className="text-[10px] uppercase font-bold tracking-wider">Endereço</span>
              </button>
              <button type="button" onClick={() => requestStep(3)} className={`flex flex-col items-center flex-1 rounded-xl py-2 transition-colors ${step === 3 ? 'bg-teal-50 dark:bg-teal-900/20 text-[#005f5f] dark:text-teal-400' : 'text-gray-400 dark:text-slate-600 hover:bg-gray-50 dark:hover:bg-slate-800'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold mb-1 border-2 ${step === 3 ? 'border-[#005f5f] dark:border-teal-400 bg-white dark:bg-slate-800' : 'border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800'}`}>3</div>
                <span className="text-[10px] uppercase font-bold tracking-wider">Documentos</span>
              </button>
            </div>
          </div>

          <div ref={contentRef} className="flex-1 min-h-0 overflow-y-auto p-6 pb-10 custom-scrollbar">
            {step === 1 && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center gap-2 mb-2 text-slate-800 dark:text-slate-200">
                  <User className="w-5 h-5 text-[#005f5f] dark:text-teal-400" />
                  <h4 className="font-bold">Dados Pessoais do Aluno</h4>
                </div>
                <PersonalInfoFields formData={formData} handleInputChange={handleInputChange} handleBlur={handleBlur} errors={errors} touched={touched}>
                  <div className="col-span-1 md:col-span-2">
                    <label htmlFor="senha_temporaria" className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Senha temporária *</label>
                    <input
                      id="senha_temporaria"
                      type="text"
                      name="senha_temporaria"
                      value={formData.senha_temporaria}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      className={`${fieldClass('senha_temporaria')} font-mono`}
                      autoComplete="new-password"
                      {...fieldA11y('senha_temporaria')}
                    />
                    <span id="temporary-password-help" className="text-[11px] text-gray-500 dark:text-slate-400 mt-1 block">Gerada automaticamente. Você pode editá-la antes de concluir o cadastro.</span>
                    {touched.senha_temporaria && errors.senha_temporaria && <span id="senha_temporaria-error" className="text-red-500 text-xs mt-1 block">{errors.senha_temporaria}</span>}
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Empresa Vinculada (Opcional)</label>
                    <select name="empresa_id" value={formData.empresa_id} onChange={handleInputChange} onBlur={handleBlur} className="w-full border border-gray-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-850 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#005f5f] outline-none">
                      <option value="">Nenhuma (Particular)</option>
                      {companies.map(empresa => <option key={empresa.id} value={empresa.id}>{empresa.razao_social}</option>)}
                    </select>
                  </div>
                </PersonalInfoFields>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center gap-2 mb-2 text-slate-800 dark:text-slate-200">
                  <MapPin className="w-5 h-5 text-[#005f5f] dark:text-teal-400" />
                  <h4 className="font-bold">Dados de Contato / Endereço</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="col-span-1 md:col-span-3">
                    <label htmlFor="cep" className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">CEP *</label>
                    <input id="cep" type="text" name="cep" value={formData.cep} onChange={handleInputChange} onBlur={handleBlur} className={`${fieldClass('cep')} md:w-1/3`} placeholder="00000-000" {...fieldA11y('cep')} />
                    {touched.cep && errors.cep && <span id="cep-error" className="text-red-500 text-xs mt-1 block">{errors.cep}</span>}
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <label htmlFor="endereco" className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Endereço Residencial *</label>
                    <input id="endereco" type="text" name="endereco" value={formData.endereco} onChange={handleInputChange} onBlur={handleBlur} className={fieldClass('endereco')} placeholder="Rua, Avenida, etc." {...fieldA11y('endereco')} />
                    {touched.endereco && errors.endereco && <span id="endereco-error" className="text-red-500 text-xs mt-1 block">{errors.endereco}</span>}
                  </div>
                  <div>
                    <label htmlFor="numero" className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Número *</label>
                    <input id="numero" type="text" name="numero" value={formData.numero} onChange={handleInputChange} onBlur={handleBlur} className={fieldClass('numero')} placeholder="Nº" {...fieldA11y('numero')} />
                    {touched.numero && errors.numero && <span id="numero-error" className="text-red-500 text-xs mt-1 block">{errors.numero}</span>}
                  </div>
                  <div className="col-span-1 md:col-span-3">
                    <label htmlFor="bairro" className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Bairro *</label>
                    <input id="bairro" type="text" name="bairro" value={formData.bairro} onChange={handleInputChange} onBlur={handleBlur} className={fieldClass('bairro')} placeholder="Bairro" {...fieldA11y('bairro')} />
                    {touched.bairro && errors.bairro && <span id="bairro-error" className="text-red-500 text-xs mt-1 block">{errors.bairro}</span>}
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <label htmlFor="cidade" className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Cidade *</label>
                    <input id="cidade" type="text" name="cidade" value={formData.cidade} onChange={handleInputChange} onBlur={handleBlur} className={fieldClass('cidade')} placeholder="Cidade" {...fieldA11y('cidade')} />
                    {touched.cidade && errors.cidade && <span id="cidade-error" className="text-red-500 text-xs mt-1 block">{errors.cidade}</span>}
                  </div>
                  <div>
                    <label htmlFor="estado" className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Estado (UF) *</label>
                    <select id="estado" name="estado" value={formData.estado} onChange={handleInputChange} onBlur={handleBlur} className={fieldClass('estado')} {...fieldA11y('estado')}>
                      <option value="">Selecione</option>
                      {['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'].map(uf => <option key={uf} value={uf}>{uf}</option>)}
                    </select>
                    {touched.estado && errors.estado && <span id="estado-error" className="text-red-500 text-xs mt-1 block">{errors.estado}</span>}
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center gap-2 mb-2 text-slate-800 dark:text-slate-200">
                  <FileCheck className="w-5 h-5 text-[#005f5f] dark:text-teal-400" />
                  <h4 className="font-bold">Anexar Documentos</h4>
                </div>
                <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">Selecione os arquivos correspondentes para cada documento. Arquivos nos formatos PDF, JPG ou PNG. O envio de documentos pode ser concluído parcialmente. Este cadastro será revisado manualmente pela escola e não passará pela IA.</p>
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 mb-4 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                  <strong>Documentação obrigatória para ativação:</strong> todos os documentos indicados nesta etapa precisam ser enviados e aprovados para que o aluno seja ativado. Se faltar algum documento, o cadastro será salvo como pendente e ficará em <strong>Aprovações Pendentes</strong> para completar a documentação.
                </div>
                <div className="mb-4">
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Tipo de Documento de Identificação</label>
                  <select name="tipo_documento" value={formData.tipo_documento} onChange={handleInputChange} className="w-full border border-gray-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-850 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#005f5f] outline-none">
                    <option value="identidade_cpf">Identidade com CPF</option>
                    <option value="identidade_sem_cpf">Identidade sem CPF</option>
                    <option value="cnh">CNH</option>
                  </select>
                </div>
                <div className="space-y-3">
                  {[
                    ...(formData.tipo_documento === 'identidade_cpf' ? [{ id: 'rg' as FileField, label: 'Anexar Identidade com CPF' }] : []),
                    ...(formData.tipo_documento === 'identidade_sem_cpf' ? [{ id: 'rg' as FileField, label: 'Anexar Identidade' }, { id: 'cpf' as FileField, label: 'Anexar CPF' }] : []),
                    ...(formData.tipo_documento === 'cnh' ? [{ id: 'cnh' as FileField, label: 'Anexar Carteira de Motorista (CNH)' }] : []),
                    { id: 'residencia' as FileField, label: 'Anexar Comprovante de Residência' },
                    { id: 'ensino_medio' as FileField, label: 'Anexar Certificado Ensino Médio' },
                    { id: 'antecedentes_federais' as FileField, label: 'Anexar Certidão de Antecedentes Criminais da Justiça Federal' },
                    { id: 'antecedentes_estaduais' as FileField, label: 'Anexar Certidão de Antecedentes Criminais da Justiça Estadual' }
                  ].map((doc) => (
                    <React.Fragment key={doc.id}>
                      {doc.id === 'antecedentes_federais' && <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-3 mb-1 mt-2 rounded-r-lg"><p className="text-xs text-blue-800 dark:text-blue-300"><strong>Aviso:</strong> Certidões de antecedentes criminais devem ser do mesmo estado de domicílio, ou seja, do mesmo estado do comprovante de residência.</p></div>}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 border border-gray-200 dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-800/50">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${files[doc.id] || uploadedDocuments[doc.id] || uploadStates[doc.id].status === 'success' ? 'bg-emerald-500' : uploadStates[doc.id].status === 'error' ? 'bg-red-500' : 'bg-gray-300 dark:bg-slate-600'}`} />
                            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{doc.label}</span>
                          </div>
                          {(files[doc.id]?.name || draftFileNames[doc.id]) && (
                            <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400" title={files[doc.id]?.name || draftFileNames[doc.id]}>
                              {files[doc.id]?.name || draftFileNames[doc.id]}
                            </p>
                          )}
                          {uploadStates[doc.id].status === 'uploading' && (
                            <div className="mt-2 flex items-center gap-2">
                              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                                <div className="h-full rounded-full bg-teal-500 transition-[width]" style={{ width: `${uploadStates[doc.id].progress}%` }} />
                              </div>
                              <span className="text-[10px] font-bold text-teal-700 dark:text-teal-400">{uploadStates[doc.id].progress}%</span>
                            </div>
                          )}
                          {uploadStates[doc.id].status === 'success' && <p className="mt-1 text-[10px] font-semibold text-emerald-600">Enviado com sucesso</p>}
                          {uploadStates[doc.id].status === 'error' && <p className="mt-1 text-[10px] font-semibold text-red-600">Falha: {uploadStates[doc.id].error}</p>}
                          {uploadStates[doc.id].status === 'idle' && files[doc.id] && <p className="mt-1 text-[10px] font-semibold text-amber-600">Pronto para envio</p>}
                          {uploadStates[doc.id].status === 'idle' && !files[doc.id] && draftFileNames[doc.id] && <p className="mt-1 text-[10px] font-semibold text-slate-500">Salvo no rascunho</p>}
                        </div>
                        <div className="flex flex-shrink-0 items-center gap-2">
                          <input type="file" id={`file-${doc.id}`} className="hidden" onChange={(e) => handleFileChange(e, doc.id)} accept=".pdf,.jpg,.jpeg,.png,.webp" />
                          <button
                            type="button"
                            onClick={() => {
                              if (files[doc.id] || uploadedDocuments[doc.id]) {
                                const confirmed = window.confirm('Ao substituir este documento, uma nova versão será enviada e a anterior ficará preservada no histórico. Deseja continuar?');
                                if (!confirmed) return;
                              }
                              document.getElementById(`file-${doc.id}`)?.click();
                            }}
                            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${files[doc.id] ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50' : 'bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
                          >
                            <Upload className="w-3.5 h-3.5" />
                            {files[doc.id] || uploadedDocuments[doc.id] ? 'Substituir arquivo' : 'Anexar arquivo'}
                          </button>
                          {createdUserId && uploadStates[doc.id].status === 'error' && (
                            <button type="button" onClick={() => void retryUpload(doc.id)} disabled={isLoading} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50">
                              Reenviar
                            </button>
                          )}
                        </div>
                      </div>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 shrink-0 flex items-center justify-between">
            <button onClick={step === 1 ? requestClose : handleBack} className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white transition-colors">{step === 1 ? 'Cancelar' : <><ChevronLeft className="w-4 h-4 inline mr-1" />Voltar</>}</button>
            {step < 3 ? (
              <button type="button" onClick={handleNext} className="px-6 py-2 bg-[#005f5f] hover:bg-[#004d4d] text-white flex items-center gap-2 rounded-lg font-semibold text-sm">
                Próximo
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button type="button" onClick={handleSubmit} disabled={isLoading} className="px-6 py-2 bg-[#005f5f] hover:bg-[#004d4d] disabled:bg-gray-400 disabled:hover:bg-gray-400 text-white flex items-center gap-2 rounded-lg font-semibold text-sm">
                {isLoading ? 'Enviando...' : 'Enviar matrícula'}
                {!isLoading && <Check className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>
      </SlidePanel>

      <Modal isOpen={Boolean(draftToResume)} onClose={requestClose}>
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-6 space-y-4 shadow-2xl font-sans">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-400 flex items-center justify-center shrink-0"><Save className="w-5 h-5" /></div>
            <div>
              <h4 className="font-bold text-base text-slate-900 dark:text-white">Continuar rascunho?</h4>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 leading-relaxed">Encontramos um cadastro não concluído. Deseja continuar de onde parou?</p>
            </div>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button onClick={startNewRegistration} className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-850 dark:text-slate-200 rounded-lg text-xs font-semibold transition-colors">Começar novo</button>
            <button onClick={continueDraft} className="flex-1 py-2 bg-[#005f5f] hover:bg-[#004d4d] text-white rounded-lg text-xs font-semibold transition-colors">Continuar rascunho</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showCloseConfirmation} onClose={() => setShowCloseConfirmation(false)}>
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-6 space-y-4 shadow-2xl font-sans">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0"><AlertTriangle className="w-5 h-5" /></div>
            <div>
              <h4 className="font-bold text-base text-slate-900 dark:text-white">Sair do cadastro?</h4>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 leading-relaxed">Há dados preenchidos neste cadastro. Escolha como deseja sair.</p>
            </div>
          </div>
          <div className="space-y-2 pt-2">
            <button onClick={() => setShowCloseConfirmation(false)} className="w-full py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-850 dark:text-slate-200 rounded-lg text-xs font-semibold transition-colors">Continuar editando</button>
            <button onClick={saveAndExit} className="w-full py-2 bg-[#005f5f] hover:bg-[#004d4d] text-white rounded-lg text-xs font-semibold transition-colors">Salvar rascunho e sair</button>
            <button onClick={discardAndExit} className="w-full py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg text-xs font-semibold transition-colors">Sair sem salvar</button>
          </div>
        </div>
      </Modal>
    </>
  );
}
