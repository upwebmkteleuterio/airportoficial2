import React, { useEffect, useRef, useState } from 'react';
import { SlidePanel } from './ui/SlidePanel';
import { Button } from './ui/Button';
import { Upload, X, Check, ChevronRight, ChevronLeft, FileText, MapPin, User, FileCheck } from 'lucide-react';
import { useUsers } from '../hooks/useUsers';
import { useCompanies } from '../hooks/useCompanies';
import { useStudentFormValidation } from './shared/StudentFormShared';
import { DocumentStatus, Usuario, UserRole } from '../types';
import { avatarService } from '../services/avatarService';
import { documentService } from '../services/documentService';
import { newServiceId } from '../services/supabaseErrors';

interface StaffRegistrationModalProps {
  initialData?: any;
  personId?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (studentId: string) => void;
  onError?: (error: unknown) => void;
}

const GRAUS_ENSINO = [
  'Fundamental Incompleto',
  'Fundamental Completo',
  'Ensino Médio Incompleto',
  'Ensino Médio Completo',
  'Ensino Superior Incompleto',
  'Ensino Superior Completo',
  'Pós-graduação',
  'Mestrado',
  'Doutorado'
];

type FileField = 'rg' | 'cpf' | 'cnh' | 'residencia' | 'ensino_medio' | 'antecedentes_federais' | 'antecedentes_estaduais';
type FileUploadState = {
  status: 'idle' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
};
type DocumentRecord = import('../types').Documento;
type FilesState = Record<FileField, File | null>;
type DocumentRow = { id: FileField; label: string; existing?: DocumentRecord | null };
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
const getActiveFileFields = (tipoDocumento: string): FileField[] => [
  ...(tipoDocumento === 'identidade_cpf' || tipoDocumento === 'identidade_sem_cpf' ? ['rg' as FileField] : []),
  ...(tipoDocumento === 'identidade_sem_cpf' ? ['cpf' as FileField] : []),
  ...(tipoDocumento === 'cnh' ? ['cnh' as FileField] : []),
  'residencia' as FileField,
  'ensino_medio' as FileField,
  'antecedentes_federais' as FileField,
  'antecedentes_estaduais' as FileField
];

const documentLabels: Record<FileField, string> = {
  rg: 'Anexar Identidade',
  cpf: 'Anexar CPF',
  cnh: 'Anexar Carteira de Motorista (CNH)',
  residencia: 'Anexar Comprovante de Residência',
  ensino_medio: 'Anexar Certificado Ensino Médio',
  antecedentes_federais: 'Anexar Certidão de Antecedentes Criminais da Justiça Federal',
  antecedentes_estaduais: 'Anexar Certidão de Antecedentes Criminais da Justiça Estadual'
};

const getDocumentRows = (tipoDocumento: string, existingDocuments: Partial<Record<FileField, DocumentRecord>> = {}): DocumentRow[] => getActiveFileFields(tipoDocumento).map((id) => ({
  id,
  label: id === 'rg' && tipoDocumento === 'identidade_cpf' ? 'Anexar Identidade com CPF' : documentLabels[id],
  existing: existingDocuments[id] || null,
}));

const createEmptyFiles = (): FilesState => ({
  rg: null,
  cpf: null,
  cnh: null,
  residencia: null,
  ensino_medio: null,
  antecedentes_federais: null,
  antecedentes_estaduais: null
});

// Prioriza a versão marcada como atual (esta_atual), depois a maior versão e por fim a mais recente.
const isBetterDocument = (candidate: DocumentRecord, current: DocumentRecord) => {
  const candidateIsCurrent = candidate.esta_atual === true;
  const currentIsCurrent = current.esta_atual === true;
  if (candidateIsCurrent !== currentIsCurrent) return candidateIsCurrent;
  if ((candidate.versao ?? 1) !== (current.versao ?? 1)) return (candidate.versao ?? 1) > (current.versao ?? 1);
  return candidate.data_criacao > current.data_criacao;
};
const createEmptyUploadStates = (): Record<FileField, FileUploadState> => ({
  rg: { status: 'idle', progress: 0 },
  cpf: { status: 'idle', progress: 0 },
  cnh: { status: 'idle', progress: 0 },
  residencia: { status: 'idle', progress: 0 },
  ensino_medio: { status: 'idle', progress: 0 },
  antecedentes_federais: { status: 'idle', progress: 0 },
  antecedentes_estaduais: { status: 'idle', progress: 0 }
});

export function StaffRegistrationModal({ isOpen, onClose, onSuccess, onError, initialData, personId, role }: StaffRegistrationModalProps & { role: UserRole }) {
  const { createUser, updateUser } = useUsers({ enabled: false });
  const { companies } = useCompanies();
  const [step, setStep] = useState(1);
  const [isEditMode, setIsEditMode] = useState(false);
  const [documentTabMode, setDocumentTabMode] = useState<'viewer' | 'editor'>('viewer');
  const [isLoading, setIsLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState('');
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const submitRef = useRef(false);

  // Step 1: Personal Data
  useEffect(() => {

    if (isOpen) {
      setAvatarFile(null);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
      setAvatarPreviewUrl(initialData?.foto_url || '');
      if (initialData) {

        setFormData({
          email: initialData.email || '',
          senha_inicial: '',
          telefone: initialData.telefone || '',
          empresa_id: (initialData as any).empresa_id || '',
          nome_completo: initialData.nome_completo || '',
          data_nascimento: initialData.data_nascimento || '',
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
          tipo_documento: initialData.tipo_documento_selecionado || initialData.tipo_documento || 'identidade_cpf',
          foto_url: initialData.foto_url || '',
          certificacao_avsec: initialData.certificacao_avsec || ''
        });
      } else {
        setFormData({
          email: '',
          senha_inicial: '',
          telefone: '',
          empresa_id: '',
          nome_completo: '',
          data_nascimento: '',
          nome_mae: '',
          nome_pai: '',
          rg: '',
          orgao_expedicao_rg: '',
          grau_ensino: '',
          cpf: '',
          endereco: '',
          numero: '',
          bairro: '',
          cidade: '',
          estado: '',
          trabalha_aviacao_civil: '',
          trabalha_seguranca_avsec: '',
          tipo_documento: 'identidade_cpf',
          cep: '',
          foto_url: '',
          certificacao_avsec: ''
        });
      }
      setIsEditMode(Boolean(initialData));
      setDocumentTabMode(initialData ? 'viewer' : 'editor');
      setStep(1);
      setFiles(createEmptyFiles());
      setUploadStates(createEmptyUploadStates());
      setUploadedDocuments({});
      setIsLoadingDocuments(Boolean(initialData?.id));
      // The id is used as the upload target, but the profile still needs to be saved once per opening.
      setSavedUserId(null);
    }
  }, [isOpen, initialData]);


  const [formData, setFormData] = useState({
    email: '',
    senha_inicial: '',
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
    
    // Step 2: Address
    cep: '',
    endereco: '',
    numero: '',
    bairro: '',
    cidade: '',
    estado: '',
    trabalha_aviacao_civil: '',
    trabalha_seguranca_avsec: '',
    tipo_documento: 'identidade_cpf',
    foto_url: '',
    certificacao_avsec: ''
  });

  // Step 3: Documents. They are optional, but selected files are uploaded on save.
  const [files, setFiles] = useState<FilesState>(() => createEmptyFiles());
  const [uploadStates, setUploadStates] = useState<Record<FileField, FileUploadState>>(() => createEmptyUploadStates());
  const [uploadedDocuments, setUploadedDocuments] = useState<Partial<Record<FileField, DocumentRecord>>>({});
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [savedUserId, setSavedUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!avatarFile) return;
    const localPreviewUrl = URL.createObjectURL(avatarFile);
    setAvatarPreviewUrl(localPreviewUrl);
    return () => URL.revokeObjectURL(localPreviewUrl);
  }, [avatarFile]);

  useEffect(() => {
    const storedPath = initialData?.foto_url;
    if (!isOpen || avatarFile || typeof storedPath !== 'string' || !storedPath.startsWith('avatars/')) return;
    let active = true;
    avatarService.createSignedUrl(storedPath).then((signedUrl) => {
      if (active && !avatarFile) setAvatarPreviewUrl(signedUrl);
    }).catch((error) => {
      console.error('Não foi possível carregar a foto de perfil', error);
    });
    return () => {
      active = false;
    };
  }, [isOpen, initialData, avatarFile]);

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
    }
    return masked;
  };

  

  const { errors, touched, handleBlur, setErrors, setTouched } = useStudentFormValidation(formData, setFormData);

  const handleCepBlur = async () => {
    const cep = formData.cep.replace(/\D/g, '');
    if (cep.length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await response.json();
        if (!data.erro) {
          setFormData(prev => ({
            ...prev,
            endereco: data.logradouro || prev.endereco,
            bairro: data.bairro || prev.bairro,
            cidade: data.localidade || prev.cidade,
            estado: data.uf || prev.estado
          }));
        }
      } catch (error) {
        console.error("Failed to fetch CEP", error);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    // Don't mask dates from type="date"
    if (name === 'data_nascimento') {
      setFormData(prev => ({ ...prev, [name]: value }));
    } else {
      setFormData(prev => ({ ...prev, [name]: applyMask(name, value) }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: FileField) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    if (!allowedFileTypes.has(selectedFile.type.toLowerCase())) {
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
  };

  const isValidFullName = (name: string) => name.trim().split(/\s+/).length >= 2;
  const isValidCPF = (cpf: string) => cpf.replace(/\D/g, '').length === 11;
  const isValidDate = (date: string) => date.length === 10;
  const isValidCEP = (cep: string) => cep.replace(/\D/g, '').length === 8;
  const isValidPhone = (phone: string) => phone.replace(/\D/g, '').length >= 10;
  const isStrongInitialPassword = (password: string) =>
    password.length >= 8 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password);

  const isStep1Valid = () => {
    return isValidFullName(formData.nome_completo || '') &&
           isValidCPF(formData.cpf || '') &&
           isValidPhone(formData.telefone || '') &&
           (formData.email || '').includes('@') &&
           (Boolean(initialData) || isStrongInitialPassword(formData.senha_inicial));
  };

  const isStep2Valid = () => {
    return isValidCEP(formData.cep) && 
           formData.endereco.trim().length > 0 && 
           formData.numero.trim().length > 0 && 
           formData.bairro.trim().length > 0 && 
           formData.cidade.trim().length > 0 && 
           formData.estado.trim().length > 0;
  };

  const handleNext = () => {
    if (step === 1 && isStep1Valid()) setStep(2);
    else if (step === 2 && isStep2Valid()) setStep(3);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const uploadDocumentField = async (field: FileField, userId: string): Promise<DocumentRecord | null> => {
    const file = files[field];
    if (!file) return null;
    const existing = uploadedDocuments[field];
    const isInstructorRegistration = role === UserRole.INSTRUTOR;
    setUploadStates(prev => ({ ...prev, [field]: { status: 'uploading', progress: 0 } }));
    try {
      const document = existing
        ? await documentService.createReplacement(existing, file, undefined, isInstructorRegistration ? {
          status: DocumentStatus.APROVADO,
          origem_cadastro: 'interno',
          metodo_verificacao: 'nao_aplicavel',
          storage_area: 'oficiais',
        } : undefined)
        : await documentService.uploadFile({
          file,
          pessoa_id: personId || userId,
          usuario_id: userId,
          tipo_documento: documentTypes[field],
          status: isInstructorRegistration ? DocumentStatus.APROVADO : DocumentStatus.PENDENTE,
          origem_cadastro: 'interno',
          metodo_verificacao: isInstructorRegistration ? 'nao_aplicavel' : 'manual',
          storage_area: isInstructorRegistration ? 'oficiais' : 'temporarios',
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

  // Debug/edição: o objeto do usuário (tabela "usuarios") nunca contém "documents".
  // Os documentos anexados são lidos diretamente da tabela "documentos" e mapeados
  // por tipo_documento para os campos do formulário (ícone verde + substituição).
  useEffect(() => {
    if (!isOpen || !initialData?.id) return;
    let cancelled = false;
    const userId = initialData.id as string;
    const loadDocuments = async () => {
      console.debug('[staff-docs] edição aberta, buscando documentos no banco', { userId });
      try {
        const documents = await documentService.getByPersonId(personId || userId, userId);
        const byField: Partial<Record<FileField, DocumentRecord>> = {};
        for (const document of documents) {
          const field = (Object.keys(documentTypes) as FileField[]).find(key => documentTypes[key] === document.tipo_documento);
          if (!field) continue;
          const current = byField[field];
          if (!current || isBetterDocument(document, current)) {
            byField[field] = document;
          }
        }
        console.debug('[staff-docs] documentos mapeados para o formulário', {
          userId,
          totalBanco: documents.length,
          camposPreenchidos: Object.keys(byField),
          detalhes: documents.map(document => ({
            tipo: document.tipo_documento,
            versao: document.versao ?? 1,
            status: document.status,
            estaAtual: document.esta_atual
          }))
        });
        if (!cancelled) setUploadedDocuments(byField);
      } catch (error) {
        console.error('[staff-docs] falha ao carregar documentos salvos', { userId, error });
      } finally {
        if (!cancelled) setIsLoadingDocuments(false);
      }
    };
    void loadDocuments();
    return () => { cancelled = true; };
  }, [isOpen, initialData]);

  const resetAfterSuccess = (userId: string) => {
    onSuccess?.(userId);
    onClose();
    setSavedUserId(null);
    setUploadedDocuments({});
    setUploadStates(createEmptyUploadStates());
    setStep(1);
    setAvatarFile(null);
    if (avatarInputRef.current) avatarInputRef.current.value = '';
    setAvatarPreviewUrl('');
    setFormData({
      foto_url: '',
      email: '', senha_inicial: '', telefone: '', empresa_id: '',
      nome_completo: '', data_nascimento: '', nome_mae: '', nome_pai: '',
      rg: '', orgao_expedicao_rg: '', cpf: '', grau_ensino: '',
      cep: '', endereco: '', numero: '', bairro: '', cidade: '', estado: '',
      trabalha_aviacao_civil: '', trabalha_seguranca_avsec: '', tipo_documento: 'identidade_cpf',
      certificacao_avsec: ''
    });
    setFiles(createEmptyFiles());
    setErrors({});
    setTouched({});
  };

  const retryUpload = async (field: FileField) => {
    if (!savedUserId || !files[field]) return;
    setIsLoading(true);
    const document = await uploadDocumentField(field, savedUserId);
    if (document) {
      const records = { ...uploadedDocuments, [field]: document };
      setUploadedDocuments(records);
      const hasPendingFailure = getActiveFileFields(formData.tipo_documento).some(candidate => files[candidate] && !records[candidate]);
      if (!hasPendingFailure) resetAfterSuccess(savedUserId);
    }
    setIsLoading(false);
  };

  const handleSubmit = async () => {
    if (submitRef.current || isLoading) return;
    submitRef.current = true;
    let avatarPath: string | undefined;
    try {
      setIsLoading(true);
      const userId = savedUserId || initialData?.id || newServiceId('user');
      let savedUser: Usuario;
      const existingAvatarPath = typeof formData.foto_url === 'string' && formData.foto_url.startsWith('avatars/')
        ? formData.foto_url
        : undefined;

      if (savedUserId && avatarFile) {
        const uploadedAvatar = await avatarService.upload(avatarFile, userId);
        avatarPath = uploadedAvatar.path;
        await updateUser({ id: userId, updates: { foto_url: avatarPath } });
        setAvatarFile(null);
      }

      if (!savedUserId) {
        if (avatarFile) {
          const uploadedAvatar = await avatarService.upload(avatarFile, userId);
          avatarPath = uploadedAvatar.path;
        }
        if (initialData && !personId) {
          const editableValues = {
            nome_completo: formData.nome_completo,
            cpf: formData.cpf,
            email: formData.email,
            telefone: formData.telefone,
            empresa_id: formData.empresa_id,
            data_nascimento: formData.data_nascimento,
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
            certificacao_avsec: formData.certificacao_avsec,
            tipo_documento_selecionado: formData.tipo_documento,
          };
          const updatePayload: Record<string, unknown> = {};
          Object.entries(editableValues).forEach(([field, value]) => {
            const previousValue = initialData[field];
            const isDefaultDocumentType = field === 'tipo_documento_selecionado' && previousValue === undefined && value === 'identidade_cpf';
            if (!isDefaultDocumentType && (previousValue !== undefined || value !== '') && value !== (previousValue ?? '')) updatePayload[field] = value;
          });
          if (avatarPath) updatePayload.foto_url = avatarPath;
          // Supabase rejects an empty update object. Keep the existing profile as
          // the saved target when the edit only adds documents (or has no changes).
          savedUser = Object.keys(updatePayload).length > 0
            ? await updateUser({ id: initialData.id, updates: updatePayload as Partial<Usuario> })
            : ({ id: initialData.id } as Usuario);
        } else {
          savedUser = await createUser({
            id: userId,
            person_id: personId,
            role,
            status: 'ativo',
            origem_cadastro: 'interno',
            password: formData.senha_inicial,
            foto_url: avatarPath ?? existingAvatarPath,
            nome_completo: formData.nome_completo,
            cpf: formData.cpf,
            email: formData.email,
            telefone: formData.telefone,
            empresa_id: formData.empresa_id || undefined,
            termo_lgpd_aceite: true,
            data_aceite_lgpd: new Date().toISOString(),
            data_nascimento: formData.data_nascimento,
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
            certificacao_avsec: formData.certificacao_avsec as Usuario['certificacao_avsec'],
            tipo_documento_selecionado: formData.tipo_documento as Usuario['tipo_documento_selecionado'],
          });
        }
        setSavedUserId(savedUser.id);
        if (avatarFile) setAvatarFile(null);
      } else {
        savedUser = { id: userId } as Usuario;
      }

      const records = { ...uploadedDocuments };
      for (const field of getActiveFileFields(formData.tipo_documento)) {
        if (!files[field]) continue;
        const document = await uploadDocumentField(field, savedUser.id);
        if (document) records[field] = document;
      }
      setUploadedDocuments(records);

      const hasUploadFailure = getActiveFileFields(formData.tipo_documento).some(field => files[field] && !records[field]);
      if (hasUploadFailure) {
        throw new Error('O cadastro foi salvo, mas um ou mais documentos selecionados não puderam ser enviados. Tente novamente.');
      }
      resetAfterSuccess(savedUser.id);
    } catch (error) {
      if (avatarPath) {
        try {
          await avatarService.remove(avatarPath);
        } catch (cleanupError) {
          console.error('Não foi possível limpar o avatar após falha no cadastro', cleanupError);
        }
      }
      console.error(error);
      if (onError) {
        onError(error);
      } else {
        alert(error instanceof Error
          ? error.message
          : `Erro ao salvar ${role === UserRole.INSTRUTOR ? 'o instrutor' : 'o coordenador'}.`);
      }
    } finally {
      submitRef.current = false;
      setIsLoading(false);
    }
  };

  return (
    <SlidePanel isOpen={isOpen} onClose={onClose} maxWidth="max-w-2xl">
      <div className="bg-white dark:bg-slate-900 w-full h-full overflow-hidden flex flex-col font-sans relative" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-850 shrink-0">
          <div>
            <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              {initialData ? (role === UserRole.INSTRUTOR ? 'Editar Instrutor' : 'Editar Coordenador') : (role === UserRole.INSTRUTOR ? 'Cadastro de Instrutor' : 'Cadastro de Coordenador')}
            </h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
              No modo de edição, você pode ir direto para a aba desejada e salvar sem seguir etapas.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs / Steps Indicator */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className={`flex flex-col items-center flex-1 rounded-xl py-2 transition-colors ${step === 1 ? 'bg-teal-50 dark:bg-teal-900/20 text-[#005f5f] dark:text-teal-400' : 'text-gray-400 dark:text-slate-600 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold mb-1 border-2 ${step === 1 ? 'border-[#005f5f] dark:border-teal-400 bg-white dark:bg-slate-800' : 'border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800'}`}>
                1
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider">Dados Pessoais</span>
            </button>
            <button
              type="button"
              onClick={() => setStep(2)}
              className={`flex flex-col items-center flex-1 rounded-xl py-2 transition-colors ${step === 2 ? 'bg-teal-50 dark:bg-teal-900/20 text-[#005f5f] dark:text-teal-400' : 'text-gray-400 dark:text-slate-600 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold mb-1 border-2 ${step === 2 ? 'border-[#005f5f] dark:border-teal-400 bg-white dark:bg-slate-800' : 'border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800'}`}>
                2
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider">Endereço</span>
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className={`flex flex-col items-center flex-1 rounded-xl py-2 transition-colors ${step === 3 ? 'bg-teal-50 dark:bg-teal-900/20 text-[#005f5f] dark:text-teal-400' : 'text-gray-400 dark:text-slate-600 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold mb-1 border-2 ${step === 3 ? 'border-[#005f5f] dark:border-teal-400 bg-white dark:bg-slate-800' : 'border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800'}`}>
                3
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider">Documentos</span>
            </button>
          </div>
        </div>

        {/* Content */}

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-2 mb-2 text-slate-800 dark:text-slate-200">
                <User className="w-5 h-5 text-[#005f5f] dark:text-teal-400" />
                <h4 className="font-bold">Dados Pessoais</h4>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-1 md:col-span-2 flex items-center gap-4 mb-2">
                <div className="w-16 h-16 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center overflow-hidden shrink-0 border border-gray-300 dark:border-slate-700">
                  {avatarPreviewUrl || formData.foto_url ? (
                    <img src={avatarPreviewUrl || formData.foto_url} alt="Foto" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-gray-400" />
                  )}
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Foto de Perfil</label>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                    className="block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-[#005f5f] hover:file:bg-teal-100 cursor-pointer"
                  />
                  {avatarFile && (
                    <span className="text-[11px] text-gray-500 dark:text-slate-400 mt-1 block truncate">
                      {avatarFile.name} será compactada antes do envio.
                    </span>
                  )}
                </div>

              </div>
              <div className="col-span-1 md:col-span-2">
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  name="nome_completo"
                  value={formData.nome_completo}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  className="w-full border border-gray-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-850 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#005f5f] outline-none"
                  placeholder="Ex: João da Silva"
                />
                {touched.nome_completo && errors.nome_completo && (
                  <span className="text-red-500 text-xs mt-1 block">{errors.nome_completo}</span>
                )}
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">CPF *</label>
                <input
                  type="text"
                  name="cpf"
                  value={formData.cpf}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  className="w-full border border-gray-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-850 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#005f5f] outline-none"
                  placeholder="000.000.000-00"
                />
                {touched.cpf && errors.cpf && (
                  <span className="text-red-500 text-xs mt-1 block">{errors.cpf}</span>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">E-mail *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  className="w-full border border-gray-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-850 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#005f5f] outline-none"
                  placeholder="exemplo@email.com"
                />
                {touched.email && errors.email && (
                  <span className="text-red-500 text-xs mt-1 block">{errors.email}</span>
                )}
              </div>

              {!initialData && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Senha inicial *</label>
                  <input
                    type="password"
                    name="senha_inicial"
                    value={formData.senha_inicial}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    autoComplete="new-password"
                    className="w-full border border-gray-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-850 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#005f5f] outline-none"
                    placeholder="Crie uma senha forte"
                  />
                  <span className={`text-[11px] mt-1 block ${formData.senha_inicial && !isStrongInitialPassword(formData.senha_inicial) ? 'text-red-500' : 'text-gray-500 dark:text-slate-400'}`}>
                    Use pelo menos 8 caracteres, incluindo maiúscula, minúscula, número e símbolo.
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Telefone / WhatsApp *</label>
                <input
                  type="text"
                  name="telefone"
                  value={formData.telefone}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  className="w-full border border-gray-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-850 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#005f5f] outline-none"
                  placeholder="(00) 00000-0000"
                />
                {touched.telefone && errors.telefone && (
                  <span className="text-red-500 text-xs mt-1 block">{errors.telefone}</span>
                )}
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Certificação Avsec (Opcional)</label>
                <select
                  name="certificacao_avsec"
                  value={formData.certificacao_avsec || ''}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-850 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#005f5f] outline-none"
                >
                  <option value="">Nenhuma</option>
                  <option value="ISCR">ISCR</option>
                  <option value="IOAD">IOAD</option>
                  <option value="IOAR">IOAR</option>
                </select>
              </div>
            </div>
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
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">CEP *</label>
                  <input
                    type="text"
                    name="cep"
                    value={formData.cep}
                    onChange={handleInputChange} onBlur={handleBlur}
                    className="w-full md:w-1/3 border border-gray-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-850 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#005f5f] outline-none"
                    placeholder="00000-000"
                  />
                  {touched.cep && errors.cep && (
                    <span className="text-red-500 text-xs mt-1 block">{errors.cep}</span>
                  )}
                </div>

                <div className="col-span-1 md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Endereço Residencial *</label>
                  <input
                    type="text"
                    name="endereco"
                    value={formData.endereco}
                    onChange={handleInputChange} onBlur={handleBlur}
                    className="w-full border border-gray-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-850 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#005f5f] outline-none"
                    placeholder="Rua, Avenida, etc."
                  />
                  {touched.endereco && errors.endereco && (
                    <span className="text-red-500 text-xs mt-1 block">{errors.endereco}</span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Número *</label>
                  <input
                    type="text"
                    name="numero"
                    value={formData.numero}
                    onChange={handleInputChange} onBlur={handleBlur}
                    className="w-full border border-gray-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-850 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#005f5f] outline-none"
                    placeholder="Nº"
                  />
                  {touched.numero && errors.numero && (
                    <span className="text-red-500 text-xs mt-1 block">{errors.numero}</span>
                  )}
                </div>

                <div className="col-span-1 md:col-span-3">
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Bairro *</label>
                  <input
                    type="text"
                    name="bairro"
                    value={formData.bairro}
                    onChange={handleInputChange} onBlur={handleBlur}
                    className="w-full border border-gray-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-850 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#005f5f] outline-none"
                    placeholder="Bairro"
                  />
                  {touched.bairro && errors.bairro && (
                    <span className="text-red-500 text-xs mt-1 block">{errors.bairro}</span>
                  )}
                </div>

                <div className="col-span-1 md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Cidade *</label>
                  <input
                    type="text"
                    name="cidade"
                    value={formData.cidade}
                    onChange={handleInputChange} onBlur={handleBlur}
                    className="w-full border border-gray-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-850 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#005f5f] outline-none"
                    placeholder="Cidade"
                  />
                  {touched.cidade && errors.cidade && (
                    <span className="text-red-500 text-xs mt-1 block">{errors.cidade}</span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Estado (UF) *</label>
                  <select
                    name="estado"
                    value={formData.estado}
                    onChange={handleInputChange} onBlur={handleBlur}
                    className="w-full border border-gray-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-850 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#005f5f] outline-none"
                  >
                    <option value="">Selecione</option>
                    <option value="AC">AC</option>
                    <option value="AL">AL</option>
                    <option value="AP">AP</option>
                    <option value="AM">AM</option>
                    <option value="BA">BA</option>
                    <option value="CE">CE</option>
                    <option value="DF">DF</option>
                    <option value="ES">ES</option>
                    <option value="GO">GO</option>
                    <option value="MA">MA</option>
                    <option value="MT">MT</option>
                    <option value="MS">MS</option>
                    <option value="MG">MG</option>
                    <option value="PA">PA</option>
                    <option value="PB">PB</option>
                    <option value="PR">PR</option>
                    <option value="PE">PE</option>
                    <option value="PI">PI</option>
                    <option value="RJ">RJ</option>
                    <option value="RN">RN</option>
                    <option value="RS">RS</option>
                    <option value="RO">RO</option>
                    <option value="RR">RR</option>
                    <option value="SC">SC</option>
                    <option value="SP">SP</option>
                    <option value="SE">SE</option>
                    <option value="TO">TO</option>
                  </select>
                  {touched.estado && errors.estado && (
                    <span className="text-red-500 text-xs mt-1 block">{errors.estado}</span>
                  )}
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
              <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">
                Selecione os arquivos que deseja anexar. O envio pode ser concluído parcialmente; {role === UserRole.INSTRUTOR ? 'os documentos do instrutor são aprovados automaticamente.' : 'os documentos ficam pendentes para conferência manual.'}
              </p>

              <div className="mb-4">
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Tipo de Documento de Identificação</label>
                <select
                  name="tipo_documento"
                  value={formData.tipo_documento}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-850 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#005f5f] outline-none"
                >
                  <option value="identidade_cpf">Identidade com CPF</option>
                  <option value="identidade_sem_cpf">Identidade sem CPF</option>
                  <option value="cnh">CNH</option>
                </select>
              </div>

              {isEditMode && (
                <div className="mb-4 rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-xs text-teal-800 dark:border-teal-900/40 dark:bg-teal-900/15 dark:text-teal-300">
                  Você está vendo os documentos já anexados. Eles não aparecem em preview aqui; para substituir, use "Alterar arquivo" e salve a nova versão.
                </div>
              )}
              {isLoadingDocuments && (
                <div className="mb-4 flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-xs font-semibold text-gray-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" aria-hidden="true" />
                  Carregando documentos salvos no banco...
                </div>
              )}
              <div className="space-y-3">
                {getDocumentRows(formData.tipo_documento, uploadedDocuments).map((doc: DocumentRow) => {
                  const existing = doc.existing;
                  const fileName = files[doc.id]?.name || existing?.arquivo_nome || '';
                  const hasExisting = Boolean(existing);
                  return (
                  <React.Fragment key={doc.id}>
                    {doc.id === 'antecedentes_federais' && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-3 mb-1 mt-2 rounded-r-lg">
                        <p className="text-xs text-blue-800 dark:text-blue-300"><strong>Aviso:</strong> Certidões de antecedentes devem ser do mesmo estado de domicílio do comprovante de residência.</p>
                      </div>
                    )}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 border border-gray-200 dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-800/50">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${hasExisting || uploadStates[doc.id].status === 'success' ? 'bg-emerald-500' : uploadStates[doc.id].status === 'error' ? 'bg-red-500' : 'bg-gray-300 dark:bg-slate-600'}`} />
                          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{doc.label}</span>
                        </div>
                        {fileName && <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400" title={fileName}>{fileName}</p>}
                        {hasExisting && existing && (
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600 dark:bg-slate-800 dark:text-slate-300">v{existing.versao ?? 1}</span>
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">{existing.status}</span>
                            <span>Documento salvo no banco</span>
                          </div>
                        )}
                        {uploadStates[doc.id].status === 'uploading' && (
                          <div className="mt-2 flex items-center gap-2">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"><div className="h-full rounded-full bg-teal-500 transition-[width]" style={{ width: `${uploadStates[doc.id].progress}%` }} /></div>
                            <span className="text-[10px] font-bold text-teal-700 dark:text-teal-400">{uploadStates[doc.id].progress}%</span>
                          </div>
                        )}
                        {uploadStates[doc.id].status === 'success' && <p className="mt-1 text-[10px] font-semibold text-emerald-600">Nova versão enviada com sucesso</p>}
                        {uploadStates[doc.id].status === 'error' && <p className="mt-1 text-[10px] font-semibold text-red-600">Falha: {uploadStates[doc.id].error}</p>}
                        {uploadStates[doc.id].status === 'idle' && files[doc.id] && <p className="mt-1 text-[10px] font-semibold text-amber-600">Pronto para envio</p>}
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-2">
                        <input type="file" id={`file-${doc.id}`} className="hidden" onChange={(e) => handleFileChange(e, doc.id)} accept=".pdf,.jpg,.jpeg,.png,.webp" />
                        <button
                          type="button"
                          onClick={() => {
                            if (hasExisting) {
                              const confirmed = window.confirm('Ao substituir este documento, uma nova versão será enviada e a anterior ficará preservada no histórico. Deseja continuar?');
                              if (!confirmed) return;
                            }
                            document.getElementById(`file-${doc.id}`)?.click();
                          }}
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${files[doc.id] ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50' : 'bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
                        >
                          <Upload className="w-3.5 h-3.5" />
                          {hasExisting ? 'Substituir arquivo' : 'Anexar arquivo'}
                        </button>
                        {savedUserId && uploadStates[doc.id].status === 'error' && (
                          <button type="button" onClick={() => void retryUpload(doc.id)} disabled={isLoading} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50">Reenviar</button>
                        )}
                      </div>
                    </div>
                  </React.Fragment>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 shrink-0 flex items-center justify-between">
          <button
            onClick={step === 1 ? onClose : handleBack}
            className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            {step === 1 ? 'Cancelar' : 'Voltar'}
          </button>
          
          {step < 3 ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={step === 1 ? !isStep1Valid() : !isStep2Valid()}
              className="px-6 py-2 bg-[#005f5f] hover:bg-[#004d4d] disabled:bg-gray-400 disabled:hover:bg-gray-400 text-white flex items-center gap-2 rounded-lg font-semibold text-sm"
            >
              Próximo
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={isLoading}
              className="px-6 py-2 bg-[#005f5f] hover:bg-[#004d4d] disabled:bg-gray-400 disabled:hover:bg-gray-400 text-white flex items-center gap-2 rounded-lg font-semibold text-sm"
            >
              {isLoading ? 'Salvando...' : (initialData ? 'Salvar e concluir' : 'Concluir cadastro')}
              {!isLoading && <Check className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>
    </SlidePanel>
  );
}
