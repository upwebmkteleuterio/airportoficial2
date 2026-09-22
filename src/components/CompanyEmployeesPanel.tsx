import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BadgeCheck,
  Building2,
  CalendarDays,
  ChevronRight,
  Mail,
  Phone,

  Users,
  X,
} from 'lucide-react';
import { companyService } from '../services/companyService';
import { Empresa, Usuario } from '../types';
import { AnimatedTab, AnimatedTabs } from './ui/AnimatedTabs';
import { SlidePanel } from './ui/SlidePanel';

interface CompanyEmployeesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  company: Empresa | null;
  onEmployeeClick: (employee: Usuario) => void;
}

type CompanyTab = 'company' | 'employees';

function CompanyDetail({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-gray-500 dark:text-slate-400">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-slate-900 dark:text-white break-words">{value ?? '-'}</dd>
    </div>
  );
}


function formatCreatedAt(createdAt?: string) {
  if (!createdAt) return '—';
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

export function CompanyEmployeesPanel({ isOpen, onClose, company, onEmployeeClick }: CompanyEmployeesPanelProps) {
  const [activeTab, setActiveTab] = useState<CompanyTab>('company');

  const employeesQuery = useQuery({
    queryKey: ['company-active-employees', company?.id],
    queryFn: () => company ? companyService.getActiveEmployees(company.id) : Promise.resolve([]),
    enabled: isOpen && !!company,
  });

  useEffect(() => {
    if (isOpen) setActiveTab('company');
  }, [company?.id, isOpen]);

  const employees = employeesQuery.data ?? [];
  const tabs: AnimatedTab<CompanyTab>[] = [
    { id: 'company', label: 'Dados da empresa', icon: <Building2 className="w-4 h-4" aria-hidden="true" /> },
    { id: 'employees', label: `Colaboradores (${employeesQuery.isLoading ? '…' : employees.length})`, icon: <Users className="w-4 h-4" aria-hidden="true" /> },
  ];

  return (
    <SlidePanel isOpen={isOpen} onClose={onClose} maxWidth="max-w-xl" direction="right">
      <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">

        <div className="px-6 py-4 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-[#005f5f] shrink-0" aria-hidden="true" />
              Colaboradores
            </h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 truncate" title={company?.nome_fantasia || company?.razao_social}>
              {company?.nome_fantasia || company?.razao_social || 'Empresa não identificada'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar painel de colaboradores"
            title="Fechar"
            className="p-2 text-gray-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="border-b border-gray-200 dark:border-slate-800 px-6 shrink-0 bg-slate-50 dark:bg-slate-850">
          <AnimatedTabs
            tabs={tabs}
            value={activeTab}
            onChange={setActiveTab}
            ariaLabel="Seções da empresa"
            idPrefix="company-employees-tab"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'company' && company && (
            <div id="company-employees-tab-company-panel" role="tabpanel" aria-labelledby="company-employees-tab-company" tabIndex={0} className="space-y-6 focus:outline-none">
              <div className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                <div className="w-11 h-11 rounded-full bg-blue-50 dark:bg-sky-950/30 flex items-center justify-center border border-blue-100 dark:border-sky-900/20 shrink-0">
                  <Building2 className="w-5 h-5 text-sky-600 dark:text-sky-400" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-slate-900 dark:text-white truncate">{company.nome_fantasia || company.razao_social}</h4>
                  <p className="text-xs text-gray-500 dark:text-slate-400">CNPJ: {company.cnpj || '-'}</p>
                </div>
                <BadgeCheck className={`w-5 h-5 ml-auto shrink-0 ${company.status_ativo ? 'text-teal-500' : 'text-gray-400'}`} aria-label={company.status_ativo ? 'Empresa ativa' : 'Empresa inativa'} />
              </div>

              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <CompanyDetail label="Razão Social" value={company.razao_social} />
                <CompanyDetail label="Nome Fantasia" value={company.nome_fantasia} />
                <CompanyDetail label="CNPJ" value={company.cnpj} />
                <CompanyDetail label="E-mail corporativo" value={company.email_corporativo} />
                <CompanyDetail label="Telefone" value={company.telefone} />
                <CompanyDetail label="Responsável" value={company.responsavel} />
                <CompanyDetail label="Endereço" value={company.endereco} />
                <div>
                  <dt className="flex items-center gap-1 text-xs font-semibold text-gray-500 dark:text-slate-400">
                    <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                    Data de cadastro
                  </dt>
                  <dd className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
                    {formatCreatedAt(company.created_at)}
                  </dd>
                </div>
                <div>

                  <dt className="text-xs font-semibold text-gray-500 dark:text-slate-400">Status</dt>
                  <dd className={`mt-1 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${company.status_ativo ? 'bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400' : 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                    {company.status_ativo ? 'Ativa' : 'Inativa'}
                  </dd>
                </div>
              </dl>
            </div>
          )}

          {activeTab === 'employees' && (
            <div id="company-employees-tab-employees-panel" role="tabpanel" aria-labelledby="company-employees-tab-employees" tabIndex={0} className="h-full focus:outline-none">
            {employeesQuery.isLoading ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-slate-400 gap-3">
                <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" aria-label="Carregando colaboradores" />
                <p className="text-sm">Carregando colaboradores...</p>
              </div>
            ) : employeesQuery.isError ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-16 h-16 bg-red-50 dark:bg-red-950/30 rounded-full flex items-center justify-center mb-4 text-red-500">
                  <Users className="w-8 h-8" aria-hidden="true" />
                </div>
                <p className="text-slate-700 dark:text-slate-200 font-medium">Não foi possível carregar os colaboradores</p>
                <p className="text-sm text-slate-500 mt-1">Tente fechar e abrir o painel novamente.</p>
              </div>
            ) : employees.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 text-slate-400">
                  <Users className="w-8 h-8" aria-hidden="true" />
                </div>
                <p className="text-slate-600 dark:text-slate-300 font-medium">Nenhum colaborador encontrado</p>
                <p className="text-sm text-slate-500 mt-1">Esta empresa ainda não possui funcionários vinculados em matrículas ativas ou concluídas.</p>
              </div>

            ) : (
              <div className="space-y-3">
                {employees.map((employee) => (
                  <button
                    key={employee.id}
                    type="button"
                    onClick={() => onEmployeeClick(employee)}
                    className="w-full text-left bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-4 flex items-center justify-between cursor-pointer hover:border-teal-500 dark:hover:border-teal-500 transition-colors group"
                  >
                    <span className="min-w-0">
                      <span className="block font-semibold text-slate-900 dark:text-white text-sm truncate">{employee.nome_completo}</span>
                      <span className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-slate-400 flex-wrap">
                        <span className="flex items-center gap-1"><Mail className="w-3 h-3" aria-hidden="true" />{employee.email || 'E-mail não informado'}</span>
                        <span className="flex items-center gap-1"><Phone className="w-3 h-3" aria-hidden="true" />{employee.telefone || 'Telefone não informado'}</span>
                      </span>
                    </span>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-teal-500 shrink-0 ml-3" aria-hidden="true" />
                  </button>
                ))}
              </div>
            )}
            </div>
          )}
        </div>
      </div>
    </SlidePanel>
  );
}
