import React, { useEffect, useState } from 'react';
import { SlidePanel } from './ui/SlidePanel';
import { User, MapPin, X, History, ExternalLink, Calendar } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { classService } from '../services/classService';
import { avatarService } from '../services/avatarService';
import { useClasses } from '../hooks/useClasses';
import { useCourses } from '../hooks/useCourses';
import { useCompanies } from '../hooks/useCompanies';
import { useUIStore } from '../store/uiStore';
import { Usuario } from '../types';
import { AnimatedTab, AnimatedTabs } from './ui/AnimatedTabs';

interface StaffDetailsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  staff: Usuario | null;
}

type StaffTab = 'personal' | 'address' | 'history';

export function StaffDetailsPanel({ isOpen, onClose, staff }: StaffDetailsPanelProps) {

  const [activeTab, setActiveTab] = useState<StaffTab>('personal');
  const [avatarUrl, setAvatarUrl] = useState('');
  const { classes } = useClasses();
  const { courses } = useCourses();
  const { companies } = useCompanies();
  const { setRoute, setSelectedClassId } = useUIStore();

  useEffect(() => {
    const storedAvatar = staff?.foto_url;
    let active = true;
    setAvatarUrl('');

    if (!isOpen || !storedAvatar) return () => {
      active = false;
    };

    if (!storedAvatar.startsWith('avatars/')) {
      setAvatarUrl(storedAvatar);
      return () => {
        active = false;
      };
    }

    avatarService.createSignedUrl(storedAvatar).then((signedUrl) => {
      if (active) setAvatarUrl(signedUrl);
    }).catch((error) => {
      console.error('Não foi possível carregar a foto de perfil', error);
    });

    return () => {
      active = false;
    };
  }, [isOpen, staff?.foto_url]);

  const historyQuery = useQuery({
    queryKey: ['turmas_instrutor', staff?.id],
    queryFn: () => staff ? classService.getTurmasByInstrutor(staff.id) : Promise.resolve([]),
    enabled: !!staff,
  });

  const avatarLabel = staff?.foto_url ? 'Avatar carregado do banco' : 'Avatar padrão';

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


  if (!staff) return null;

  return (
    <SlidePanel isOpen={isOpen} onClose={onClose} maxWidth="max-w-xl" direction="right" baseZIndex={70}>
      <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-800 shrink-0">
        <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <User className="w-5 h-5 text-[#005f5f]" />
          Detalhes do Instrutor/Coordenador
        </h3>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors text-gray-500">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="border-b border-gray-200 dark:border-slate-800 px-6 shrink-0 bg-slate-50 dark:bg-slate-850">
        <AnimatedTabs
          tabs={[
            { id: 'personal', label: 'Dados Pessoais', icon: <User className="w-4 h-4" aria-hidden="true" /> },
            { id: 'address', label: 'Endereço', icon: <MapPin className="w-4 h-4" aria-hidden="true" /> },
            { id: 'history', label: 'Histórico de Turmas', icon: <History className="w-4 h-4" aria-hidden="true" /> },
          ] satisfies readonly AnimatedTab<StaffTab>[]}
          value={activeTab}
          onChange={setActiveTab}
          ariaLabel="Seções dos detalhes do instrutor ou coordenador"
          idPrefix="staff-details-tab"
        />
      </div>

      <div className="p-6 overflow-y-auto flex-1">
        {activeTab === 'personal' && (
          <div id="staff-details-tab-personal-panel" role="tabpanel" aria-labelledby="staff-details-tab-personal" tabIndex={0} className="space-y-6 focus:outline-none">
            <div className="flex justify-center mb-6">
              <div className="w-24 h-24 rounded-full bg-slate-200 dark:bg-slate-800 border-2 border-gray-300 dark:border-slate-700 flex items-center justify-center overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Foto" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-10 h-10 text-gray-400" />
                )}
              </div>
            </div>
            <p className="text-[10px] text-center text-gray-400 dark:text-slate-500 mb-4">{avatarLabel}</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">Nome Completo</label>
                <div className="text-sm font-medium text-slate-900 dark:text-white">{staff.nome_completo || '-'}</div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">E-mail</label>
                <div className="text-sm font-medium text-slate-900 dark:text-white">{staff.email || '-'}</div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">CPF</label>
                <div className="text-sm font-medium text-slate-900 dark:text-white">{staff.cpf || '-'}</div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">Telefone</label>
                <div className="text-sm font-medium text-slate-900 dark:text-white">{staff.telefone || '-'}</div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">Certificação Avsec</label>
                <div className="text-sm font-medium text-slate-900 dark:text-white">{staff.certificacao_avsec || '-'}</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'address' && (
          <div id="staff-details-tab-address-panel" role="tabpanel" aria-labelledby="staff-details-tab-address" tabIndex={0} className="grid grid-cols-2 gap-4 focus:outline-none">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">Logradouro / Rua</label>
              <div className="text-sm font-medium text-slate-900 dark:text-white">{staff.endereco || '-'}</div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">Número</label>
              <div className="text-sm font-medium text-slate-900 dark:text-white">{staff.numero || '-'}</div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">Complemento</label>
              <div className="text-sm font-medium text-slate-900 dark:text-white">-</div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">Bairro</label>
              <div className="text-sm font-medium text-slate-900 dark:text-white">{staff.bairro || '-'}</div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">CEP</label>
              <div className="text-sm font-medium text-slate-900 dark:text-white">{staff.cep || '-'}</div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">Cidade</label>
              <div className="text-sm font-medium text-slate-900 dark:text-white">{staff.cidade || '-'}</div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">UF</label>
              <div className="text-sm font-medium text-slate-900 dark:text-white">{staff.estado || '-'}</div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div id="staff-details-tab-history-panel" role="tabpanel" aria-labelledby="staff-details-tab-history" tabIndex={0} className="space-y-6 focus:outline-none">
            <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200">Linha do Tempo de Turmas</h4>
            
            {historyQuery.isLoading ? (
              <div className="text-sm text-gray-500">Carregando histórico...</div>
            ) : historyQuery.data && historyQuery.data.length > 0 ? (
              <div className="relative border-l-2 border-gray-200 dark:border-slate-700 ml-3 space-y-6">
                {historyQuery.data.map(rel => {
                  const details = getCourseDetails(rel.turma_id);
                  if (!details || !details.turma) return null;
                  const { turma, course } = details;
                  
                  return (
                    <div key={rel.id} className="relative pl-6">
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
                            <span className="block text-gray-500 dark:text-slate-400 mb-0.5">Função</span>
                            <span className="font-medium text-slate-700 dark:text-slate-200">{rel.funcao}</span>
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
