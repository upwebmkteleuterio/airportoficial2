import React, { useState } from 'react';
import { SlidePanel } from './ui/SlidePanel';
import { User, MapPin, X, History, ExternalLink, Calendar } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { classService } from '../services/classService';
import { useClasses } from '../hooks/useClasses';
import { useCourses } from '../hooks/useCourses';
import { useCompanies } from '../hooks/useCompanies';
import { useUIStore } from '../store/uiStore';
import { Usuario } from '../types';

interface StudentDetailsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  student: Usuario | null;
}

export function StudentDetailsPanel({ isOpen, onClose, student }: StudentDetailsPanelProps) {

  const [activeTab, setActiveTab] = useState<'personal' | 'address' | 'history'>('personal');
  const { classes } = useClasses();
  const { courses } = useCourses();
  const { companies } = useCompanies();
  const { setRoute, setSelectedClassId } = useUIStore();

  const historyQuery = useQuery({
    queryKey: ['matriculas_aluno', student?.id],
    queryFn: () => student ? classService.getMatriculasByAluno(student.id) : Promise.resolve([]),
    enabled: !!student,
  });

  const getCourseDetails = (turmaId: string) => {
    const turma = classes.find(c => c.id === turmaId);
    if (!turma) return null;
    const course = courses.find(c => c.id === turma.curso_id);
    return { turma, course };
  };

  const handleOpenClass = (turmaId: string) => {
    setSelectedClassId(turmaId);
    setRoute('class-details');
    onClose();
  };

  if (!student) return null;

  const enrollmentCompanyId = historyQuery.data?.find((matricula) => matricula.empresa_b2b_id)?.empresa_b2b_id;
  const linkedCompanyId = student.empresa_id || enrollmentCompanyId;

  return (
    <SlidePanel isOpen={isOpen} onClose={onClose} maxWidth="max-w-xl" direction="right" baseZIndex={70}>
      <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-800 shrink-0">
        <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <User className="w-5 h-5 text-[#005f5f]" />
          Detalhes do Aluno
        </h3>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors text-gray-500">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex border-b border-gray-200 dark:border-slate-800 px-6 shrink-0 bg-slate-50 dark:bg-slate-850">
        <button
          onClick={() => setActiveTab('personal')}
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'personal'
              ? 'border-[#005f5f] text-[#005f5f] dark:text-teal-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-300'
          }`}
        >
          <User className="w-4 h-4" />
          Dados Pessoais
        </button>
        <button
          onClick={() => setActiveTab('address')}
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'address'
              ? 'border-[#005f5f] text-[#005f5f] dark:text-teal-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-300'
          }`}
        >
          <MapPin className="w-4 h-4" />
          Endereço
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'history'
              ? 'border-[#005f5f] text-[#005f5f] dark:text-teal-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-300'
          }`}
        >
          <History className="w-4 h-4" />
          Histórico de Turmas
        </button>

      </div>

      <div className="p-6 overflow-y-auto flex-1">
        {activeTab === 'personal' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">Nome Completo</label>
                <div className="text-sm font-medium text-slate-900 dark:text-white">{student.nome_completo || '-'}</div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">E-mail</label>
                <div className="text-sm font-medium text-slate-900 dark:text-white">{student.email || '-'}</div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">CPF</label>
                <div className="text-sm font-medium text-slate-900 dark:text-white">{student.cpf || '-'}</div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">Telefone</label>
                <div className="text-sm font-medium text-slate-900 dark:text-white">{student.telefone || '-'}</div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">Data de Nascimento</label>
                <div className="text-sm font-medium text-slate-900 dark:text-white">{student.data_nascimento || '-'}</div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">Nome da Mãe</label>
                <div className="text-sm font-medium text-slate-900 dark:text-white">{student.nome_mae || '-'}</div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">Empresa Vinculada</label>
                <div className="text-sm font-medium text-slate-900 dark:text-white">{linkedCompanyId ? companies.find(c => c.id === linkedCompanyId)?.razao_social || companies.find(c => c.id === linkedCompanyId)?.nome_fantasia || linkedCompanyId : 'Nenhuma (Particular)'}</div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">Nome do Pai</label>
                <div className="text-sm font-medium text-slate-900 dark:text-white">{student.nome_pai || '-'}</div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">Grau de Ensino</label>
                <div className="text-sm font-medium text-slate-900 dark:text-white">{student.grau_ensino || '-'}</div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">Trabalha na aviação civil?</label>
                <div className="text-sm font-medium text-slate-900 dark:text-white">{student.trabalha_aviacao_civil === 'sim' ? 'Sim' : student.trabalha_aviacao_civil === 'nao' ? 'Não' : '-'}</div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">Trabalha com segurança Avsec?</label>
                <div className="text-sm font-medium text-slate-900 dark:text-white">{student.trabalha_seguranca_avsec === 'sim' ? 'Sim' : student.trabalha_seguranca_avsec === 'nao' ? 'Não' : '-'}</div>
              </div>
            </div>
            
            <div className="pt-4 border-t border-gray-200 dark:border-slate-800">
              <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200 mb-3">Documentos de Identidade</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">RG</label>
                  <div className="text-sm font-medium text-slate-900 dark:text-white">{student.rg || '-'}</div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">Órgão Expedidor</label>
                  <div className="text-sm font-medium text-slate-900 dark:text-white">{student.orgao_expedicao_rg || '-'}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'address' && (
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">Logradouro / Rua</label>
              <div className="text-sm font-medium text-slate-900 dark:text-white">{student.endereco || '-'}</div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">Número</label>
              <div className="text-sm font-medium text-slate-900 dark:text-white">{student.numero || '-'}</div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">Complemento</label>
              <div className="text-sm font-medium text-slate-900 dark:text-white">-</div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">Bairro</label>
              <div className="text-sm font-medium text-slate-900 dark:text-white">{student.bairro || '-'}</div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">CEP</label>
              <div className="text-sm font-medium text-slate-900 dark:text-white">{student.cep || '-'}</div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">Cidade</label>
              <div className="text-sm font-medium text-slate-900 dark:text-white">{student.cidade || '-'}</div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">UF</label>
              <div className="text-sm font-medium text-slate-900 dark:text-white">{student.estado || '-'}</div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-6">
            <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200">Linha do Tempo de Turmas</h4>
            
            {historyQuery.isLoading ? (
              <div className="text-sm text-gray-500">Carregando histórico...</div>
            ) : historyQuery.data && historyQuery.data.length > 0 ? (
              <div className="relative border-l-2 border-gray-200 dark:border-slate-700 ml-3 space-y-6">
                {historyQuery.data.map(matricula => {
                  const details = getCourseDetails(matricula.turma_id);
                  if (!details || !details.turma) return null;
                  const { turma, course } = details;
                  
                  return (
                    <div key={matricula.id} className="relative pl-6">
                      <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-teal-500 border-4 border-white dark:border-slate-900" />
                      
                      <div 
                        onClick={() => handleOpenClass(turma.id)}
                        className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h5 className="font-bold text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                              {course?.nome_curso || 'Curso Desconhecido'}
                            </h5>
                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400 mt-1">
                              <span className="font-mono bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-gray-700 dark:text-slate-300">
                                {turma.id_anac}
                              </span>
                              <span>•</span>
                              <span>Turma {turma.id_interno_escola}</span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {turma.data_inicio} a {turma.data_termino}
                              </span>
                            </div>
                          </div>
                          <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-teal-500" />
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-xs">
                          <div>
                            <span className="block text-gray-500 dark:text-slate-400 mb-0.5">Turno</span>
                            <span className="font-medium text-slate-700 dark:text-slate-200">{turma.turno}</span>
                          </div>
                          <div>
                            <span className="block text-gray-500 dark:text-slate-400 mb-0.5">Horário</span>
                            <span className="font-medium text-slate-700 dark:text-slate-200">{turma.horario_aulas}</span>
                          </div>
                          <div>
                            <span className="block text-gray-500 dark:text-slate-400 mb-0.5">Cidade/UF</span>
                            <span className="font-medium text-slate-700 dark:text-slate-200">{turma.cidade}/{turma.uf}</span>
                          </div>
                          <div>
                            <span className="block text-gray-500 dark:text-slate-400 mb-0.5">Empresa na Matrícula</span>
                            <span className="font-medium text-slate-700 dark:text-slate-200">
                              {matricula.empresa_b2b_id
                                ? (companies.find(c => c.id === matricula.empresa_b2b_id)?.nome_fantasia || companies.find(c => c.id === matricula.empresa_b2b_id)?.razao_social || 'Empresa B2B')
                                : 'Avulso'}
                            </span>
                          </div>
                          <div>
                            <span className="block text-gray-500 dark:text-slate-400 mb-0.5">Presença</span>
                            <span className="font-medium text-slate-700 dark:text-slate-200">{matricula.percentual_presenca === null ? '—' : `${matricula.percentual_presenca}%`}</span>
                          </div>
                          <div>
                            <span className="block text-gray-500 dark:text-slate-400 mb-0.5">Notas</span>
                            <span className="font-medium text-slate-700 dark:text-slate-200">{matricula.nota_1_chamada ?? '—'} / {matricula.nota_2_chamada ?? '—'}</span>
                          </div>
                          <div>
                            <span className="block text-gray-500 dark:text-slate-400 mb-0.5">Resultado</span>
                            <span className="font-medium text-slate-700 dark:text-slate-200">{matricula.status_resultado ?? matricula.status_resultado_final ?? '—'}</span>
                          </div>
                          <div>
                            <span className="block text-gray-500 dark:text-slate-400 mb-0.5">Resultado final</span>
                            <span className="font-medium text-slate-700 dark:text-slate-200">{matricula.status_resultado_final ?? '—'}</span>
                          </div>
                          <div>
                            <span className="block text-gray-500 dark:text-slate-400 mb-0.5">Situação</span>
                            <span className="font-medium text-slate-700 dark:text-slate-200">{matricula.status_matricula || '-'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-sm text-gray-500 dark:text-slate-400 p-4 bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-gray-300 dark:border-slate-700 text-center">
                Este aluno não possui matrículas em turmas até o momento.
              </div>
            )}
          </div>
        )}

      </div>
    </SlidePanel>
  );
}
