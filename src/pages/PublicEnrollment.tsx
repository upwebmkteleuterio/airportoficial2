import React, { useState, useEffect } from 'react';
import { Plane, User, MapPin, FileCheck, Check, ChevronRight, ChevronLeft, Building2 } from 'lucide-react';
import { useClasses } from '../hooks/useClasses';
import { useCourses } from '../hooks/useCourses';
import { useCompanies } from '../hooks/useCompanies';
import { supabase } from '../integrations/supabase/client';
import { PersonalInfoFields, AddressFields, useStudentFormValidation, isValidFullName, isValidDate, isValidCPF, isValidCEP, isValidPhone } from '../components/shared/StudentFormShared';

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

const allowedFileTypes = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);

export default function PublicEnrollment() {
  const { classes } = useClasses();
  const { courses } = useCourses();
  const { companies } = useCompanies();

  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [fileError, setFileError] = useState('');

  const [companyId, setCompanyId] = useState<string | null>(null);
  const [availableClassIds, setAvailableClassIds] = useState<string[]>([]);

  useEffect(() => {
    // Parse URL: /enroll/:companyId?classes=1,2,3
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    const cid = pathParts[pathParts.length - 1];
    setCompanyId(cid);

    const params = new URLSearchParams(window.location.search);
    const classesParam = params.get('classes');
    if (classesParam) {
      setAvailableClassIds(classesParam.split(','));
    }
  }, []);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    telefone: '',
    nome_completo: '',
    cpf: '',
    data_nascimento: '',
    nome_mae: '',
    nome_pai: '',
    rg: '',
    orgao_expedicao_rg: '',
    grau_ensino: '',
    cep: '',
    endereco: '',
    numero: '',
    bairro: '',
    cidade: '',
    estado: '',
    turma_id: '',
    trabalha_aviacao_civil: '',
    trabalha_seguranca_avsec: '',
    tipo_documento: 'identidade_cpf'
  });

  const [files, setFiles] = useState<{ [key: string]: File | null }>({
    rg_frente: null,
    rg_verso: null,
    cpf_documento: null,
    comprovante_residencia: null,
    historico_escolar: null,
    certidao_antecedentes_federais: null,
    certidao_antecedentes_estaduais: null,
    cnh_documento: null
  });

  

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, key: string) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!allowedFileTypes.has(selectedFile.type.toLowerCase())) {
      setFileError('Formato inválido. Selecione um arquivo PDF, JPG, JPEG, PNG ou WEBP.');
      e.target.value = '';
      return;
    }

    setFileError('');
    setFiles({ ...files, [key]: selectedFile });
  };

  const currentCompany = companies.find(c => c.id === companyId);
  const availableClasses = classes.filter(c => availableClassIds.includes(c.id));

  const handleNext = () => setStep(s => s + 1);
  const handlePrev = () => setStep(s => s - 1);

  const isStep0Valid = () => {
    return formData.email.includes('@') && isValidPhone(formData.telefone);
  };
  
  const isStep1Valid = () => {
    return isValidFullName(formData.nome_completo) &&
           isValidDate(formData.data_nascimento) &&
           isValidFullName(formData.nome_mae) &&
           formData.rg.trim().length > 0 &&
           formData.orgao_expedicao_rg.trim().length > 0 &&
           isValidCPF(formData.cpf) &&
           formData.grau_ensino.trim().length > 0 &&
           formData.trabalha_aviacao_civil.trim().length > 0 &&
           formData.trabalha_seguranca_avsec.trim().length > 0;
  };
  
  const isStep2Valid = () => {
    return isValidCEP(formData.cep) &&
           formData.endereco.trim().length > 0 &&
           formData.numero.trim().length > 0 &&
           formData.bairro.trim().length > 0 &&
           formData.cidade.trim().length > 0 &&
           formData.estado.trim().length > 0;
  };

  const isStep3Valid = () => {
    // Basic check for files if required, but for now we just allow next
    return true;
  };
  
  const isStepValid = (currentStep: number) => {
    if (currentStep === 0) return isStep0Valid();
    if (currentStep === 1) return isStep1Valid();
    if (currentStep === 2) return isStep2Valid();
    if (currentStep === 3) return isStep3Valid();
    if (currentStep === 4) return formData.turma_id !== '';
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 4) {
      handleNext();
      return;
    }

    if (!companyId || !availableClassIds.includes(formData.turma_id)) {
      setErrorMessage('Este link não possui uma turma válida para o cadastro.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        options: {
          data: {
            nome_completo: formData.nome_completo,
            cpf: formData.cpf,
            telefone: formData.telefone,
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
            origem_cadastro: 'b2b',
            empresa_id: companyId,
            turma_id_pendente: formData.turma_id,
            tipo_documento_selecionado: formData.tipo_documento
          }
        }
      });

      if (error) throw error;
      if (!data.user) throw new Error('Não foi possível concluir o cadastro.');
      setSuccess(true);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Não foi possível concluir o cadastro.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center border border-gray-100">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Cadastro Enviado!</h2>
          <p className="text-slate-600 mb-6">
            Seus dados foram enviados com sucesso e estão em análise pela nossa equipe. 
            Você receberá um e-mail assim que sua matrícula for aprovada.
          </p>
          <a href="/" className="inline-block px-6 py-3 bg-teal-500 hover:bg-teal-600 text-white font-bold rounded-lg transition-colors">
            Voltar para o Início
          </a>
        </div>
      </div>
    );
  }

  const renderStepIcon = (index: number, current: number, icon: React.ReactNode) => {
    if (index < current) return <div className="w-8 h-8 rounded-full bg-teal-500 text-white flex items-center justify-center shadow-sm"><Check className="w-4 h-4" /></div>;
    if (index === current) return <div className="w-8 h-8 rounded-full bg-teal-500 text-white flex items-center justify-center shadow-md ring-4 ring-teal-500/20">{icon}</div>;
    return <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">{icon}</div>;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-10 px-4">
      {/* Header */}
      <div className="mb-8 flex flex-col items-center">
        <img 
          src="https://i.postimg.cc/9MrTVGJ3/logo-airpot.png" 
          alt="Airport Logo" 
          className="h-14 w-auto object-contain mb-4"
        />
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Portal de Matrícula</h1>
        {currentCompany && (
          <div className="mt-3 flex items-center gap-2 px-4 py-2 bg-slate-200 rounded-full text-slate-700 font-semibold text-sm">
            <Building2 className="w-4 h-4" />
            <span>Colaborador de: {currentCompany.nome_fantasia || currentCompany.razao_social}</span>
          </div>
        )}
      </div>

      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Progress bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-8 py-6">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-200 -z-10 rounded-full overflow-hidden">
              <div className="h-full bg-teal-500 transition-all duration-300" style={{ width: `${(step / 4) * 100}%` }} />
            </div>
            
            <div className="flex flex-col items-center gap-2 bg-slate-50 px-2">
              {renderStepIcon(0, step, <User className="w-4 h-4" />)}
              <span className="text-[10px] font-bold text-slate-500 uppercase">Conta</span>
            </div>
            <div className="flex flex-col items-center gap-2 bg-slate-50 px-2">
              {renderStepIcon(1, step, <User className="w-4 h-4" />)}
              <span className="text-[10px] font-bold text-slate-500 uppercase">Pessoal</span>
            </div>
            <div className="flex flex-col items-center gap-2 bg-slate-50 px-2">
              {renderStepIcon(2, step, <MapPin className="w-4 h-4" />)}
              <span className="text-[10px] font-bold text-slate-500 uppercase">Endereço</span>
            </div>
            <div className="flex flex-col items-center gap-2 bg-slate-50 px-2">
              {renderStepIcon(3, step, <FileCheck className="w-4 h-4" />)}
              <span className="text-[10px] font-bold text-slate-500 uppercase">Documentos</span>
            </div>
            <div className="flex flex-col items-center gap-2 bg-slate-50 px-2">
              {renderStepIcon(4, step, <Check className="w-4 h-4" />)}
              <span className="text-[10px] font-bold text-slate-500 uppercase">Turma</span>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-8">
          <form onSubmit={handleSubmit}>
            
            {step === 0 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Crie sua Conta</h3>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">E-mail</label>
                  <input required type="email" name="email" value={formData.email} onChange={handleChange} onBlur={handleBlur}
                      className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-teal-500 focus:border-teal-500" placeholder="seu@email.com" />
                    {touched.email && errors.email && (
                      <span className="text-red-500 text-xs mt-1 block">{errors.email}</span>
                    )}
                  </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Senha</label>
                  <input required type="password" name="password" value={formData.password} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-teal-500 focus:border-teal-500" placeholder="••••••••" />
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Dados Pessoais</h3>
                <PersonalInfoFields 
                  formData={formData} 
                  handleInputChange={handleChange} 
                  handleBlur={handleBlur}
                  errors={errors}
                  touched={touched}
                  dateFormat="payload"
                />
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Endereço</h3>
                <AddressFields
                  formData={formData}
                  handleInputChange={handleChange}
                  handleBlur={handleBlur}
                  errors={errors}
                  touched={touched}
                />
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Envio de Documentos</h3>
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Tipo de Documento de Identificação</label>
                  <select
                    name="tipo_documento"
                    value={formData.tipo_documento}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-teal-500 focus:border-teal-500 bg-white"
                  >
                    <option value="identidade_cpf">Identidade com CPF</option>
                    <option value="identidade_sem_cpf">Identidade sem CPF</option>
                    <option value="cnh">CNH</option>
                  </select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                  ...(formData.tipo_documento === 'identidade_cpf' ? ['rg_frente', 'rg_verso'] : []),
                  ...(formData.tipo_documento === 'identidade_sem_cpf' ? ['rg_frente', 'rg_verso', 'cpf_documento'] : []),
                  ...(formData.tipo_documento === 'cnh' ? ['cnh_documento'] : []),
                  'comprovante_residencia',
                  'historico_escolar',
                  'certidao_antecedentes_federais',
                  'certidao_antecedentes_estaduais'
                ].map(key => (
                    <React.Fragment key={key}>
                      {key === 'certidao_antecedentes_federais' && (
                        <div className="md:col-span-2 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 mt-2 rounded-r-lg">
                          <p className="text-sm text-blue-800 dark:text-blue-300">
                            <strong>Aviso:</strong> Certidões de antecedentes criminais devem ser do mesmo estado de domicílio, ou seja, do mesmo estado do comprovante de residência.
                          </p>
                        </div>
                      )}
                    <div className="border border-dashed border-slate-300 rounded-lg p-4 bg-slate-50 flex flex-col items-center justify-center text-center">
                      <FileCheck className={`w-8 h-8 mb-2 ${files[key] ? 'text-teal-500' : 'text-slate-400'}`} />
                      <span className="text-sm font-semibold text-slate-700 capitalize text-center">
                        {key === 'certidao_antecedentes_federais' 
                          ? 'Certidão de Antecedentes Criminais - Justiça Federal' 
                          : key === 'certidao_antecedentes_estaduais'
                            ? 'Certidão de Antecedentes Criminais - Justiça Estadual'
                            : key.replace(/_/g, ' ')}
                      </span>
                      <input
                        type="file"
                        id={`file-${key}`}
                        className="hidden"
                        onChange={(e) => handleFileChange(e, key)}
                        accept=".pdf,.jpg,.jpeg,.png,.webp"
                      />
                      <label htmlFor={`file-${key}`} className="mt-3 cursor-pointer px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded text-xs font-bold hover:bg-slate-100 transition-colors shadow-sm">
                        {files[key] ? 'Alterar Arquivo' : 'Selecionar Arquivo'}
                      </label>
                      {files[key] && <span className="text-xs text-slate-500 mt-2 truncate w-full px-4">{files[key]?.name}</span>}
                    </div>
                    </React.Fragment>
                  ))}
                </div>
                {fileError && (
                  <p role="alert" className="text-red-500 text-xs mt-2">{fileError}</p>
                )}
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Escolha a Turma</h3>
                {availableClasses.length === 0 ? (
                  <p className="text-slate-500 p-4 bg-slate-50 rounded-lg text-center">Nenhuma turma disponível neste link. Entre em contato com sua empresa.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {availableClasses.map(cls => (
                      <div 
                        key={cls.id} 
                        onClick={() => {
                          if (formData.turma_id === cls.id) {
                            setFormData({ ...formData, turma_id: '' });
                          } else {
                            setFormData({ ...formData, turma_id: cls.id });
                          }
                        }}
                        className={`flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all ${formData.turma_id === cls.id ? 'border-teal-500 bg-teal-50/50 shadow-md' : 'border-slate-200 hover:border-teal-300 hover:bg-slate-50'}`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <span className="font-bold text-slate-800 text-base leading-tight pr-2">
                            {(courses.find(c => c.id === cls.curso_id)?.nome_curso || "Curso de Aviação")}
                          </span>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${formData.turma_id === cls.id ? 'border-teal-500 bg-teal-500' : 'border-slate-300 bg-white'}`}>
                            {formData.turma_id === cls.id && <Check className="w-3 h-3 text-white" />}
                          </div>
                        </div>
                        
                        <div className="space-y-2 mt-2">
                          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded px-2 py-1 w-fit">
                            <span>Turno: {cls.turno}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span>{cls.horario_aulas}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span>Início: {cls.data_inicio ? new Date(cls.data_inicio).toLocaleDateString('pt-BR') : 'A definir'}</span>
                            <span>•</span>
                            <span>Término: {cls.data_termino ? new Date(cls.data_termino).toLocaleDateString('pt-BR') : 'A definir'}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {(errorMessage || fileError) && (
              <div role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {errorMessage || fileError}
              </div>
            )}

            {/* Form Footer */}
            <div className="flex justify-between mt-8 pt-6 border-t border-slate-200">
              <button type="button" onClick={handlePrev} disabled={step === 0 || isLoading} className="px-4 py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-white text-slate-700 border border-gray-300 hover:bg-gray-50">
                <ChevronLeft className="w-4 h-4" />
                Voltar
              </button>
              
              {step < 4 ? (
                <button type="submit" disabled={!isStepValid(step)} className="px-4 py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-slate-900 text-white hover:bg-slate-800">
                  Avançar
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button type="submit" disabled={isLoading || availableClasses.length === 0 || !formData.turma_id} className="px-4 py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-slate-900 text-white hover:bg-slate-800">
                  {isLoading ? 'Enviando...' : 'Finalizar Cadastro'}
                  {!isLoading && <Check className="w-4 h-4" />}
                </button>
              )}
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}
