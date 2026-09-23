/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useRef } from 'react';
import {
  Plus,
  Copy,
  Check,
  Building2,
  ExternalLink,
  Trash2,
  X,
  Globe,
  Mail,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Link as LinkIcon,
  HelpCircle,
  CalendarDays,
  Info,
  MoreVertical,
  Power,
  Users,
  TrendingUp,
  Briefcase,
  Edit2,
  TriangleAlert
} from 'lucide-react';

import { useCompanies } from '../hooks/useCompanies';
import { useClasses } from '../hooks/useClasses';
import { useCourses } from '../hooks/useCourses';
import { useAudit } from '../hooks/useAudit';
import { Empresa } from '../types';

import { ConfirmDeleteModal } from '../components/ui/ConfirmDeleteModal';

import { Modal } from '../components/ui/Modal';
import { HelpModal } from '../components/ui/HelpModal';
import { RowActionMenu } from '../components/ui/RowActionMenu';
import { SlidePanel } from '../components/ui/SlidePanel';
import { StudentDetailsPanel } from '../components/StudentDetailsPanel';
import { CompanyEmployeesPanel } from '../components/CompanyEmployeesPanel';

export function Companies() {
  const {
    companies,
    createCompany,
    updateCompany,
    deleteCompany,
    isLoading,
    isDeleting,
    isCreating,
    isUpdating,
  } = useCompanies();
  const { createLog } = useAudit();

  const [addCompanyOpen, setAddCompanyOpen] = useState(false);
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);
  const [companyToDelete, setCompanyToDelete] = useState<Empresa | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [linkModalCompany, setLinkModalCompany] = useState<any | null>(null);
  const [selectedClassesForLink, setSelectedClassesForLink] = useState<string[]>([]);
  const { classes } = useClasses();
  const { courses } = useCourses();

  const [searchQuery, setSearchQuery] = useState('');
  const [employeesPanelOpen, setEmployeesPanelOpen] = useState(false);
  const [selectedCompanyForEmployees, setSelectedCompanyForEmployees] = useState<any | null>(null);
  const [employeeDetailsOpen, setEmployeeDetailsOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const companySubmitRef = useRef(false);

  // Form states
  const [formCnpj, setFormCnpj] = useState('');
  const [formRazao, setFormRazao] = useState('');
  const [formFantasia, setFormFantasia] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formSite, setFormSite] = useState('');
  const [formVagas, setFormVagas] = useState(15);
  const [formStatus, setFormStatus] = useState(true); // true = Ativo, false = Pendente Rev.
  const [formTelefone, setFormTelefone] = useState('');
  const [formEndereco, setFormEndereco] = useState('');
  const [formResponsavel, setFormResponsavel] = useState('');

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 14) value = value.slice(0, 14);
    if (value.length > 2) value = value.replace(/^(\d{2})(\d)/, '$1.$2');
    if (value.length > 5) value = value.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
    if (value.length > 8) value = value.replace(/\.(\d{3})(\d)/, '.$1/$2');
    if (value.length > 12) value = value.replace(/(\d{4})(\d)/, '$1-$2');
    setFormCnpj(value);
  };

  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    if (value.length > 2) value = value.replace(/^(\d{2})(\d)/g, '($1) $2');
    if (value.length > 9) value = value.replace(/(\d{5})(\d)/, '$1-$2');
    else if (value.length > 8) value = value.replace(/(\d{4})(\d)/, '$1-$2');
    setFormTelefone(value);
  };

  const handleCopyLink = (company: any) => {
    if (company.status_ativo === false) return;
    setLinkModalCompany(company);
    setSelectedClassesForLink([]);
  };

  const handleEditCompany = (company: Empresa) => {
    setEditingCompanyId(company.id);
    setFormCnpj(company.cnpj || '');
    setFormRazao(company.razao_social || '');
    setFormFantasia(company.nome_fantasia || '');
    setFormEmail(company.email_corporativo || '');
    setFormSite(company.website || '');
    setFormStatus(company.status_ativo);
    setFormTelefone(company.telefone || '');
    setFormEndereco(company.endereco || '');
    setFormResponsavel(company.responsavel || '');
    setAddCompanyOpen(true);
  };

  const handleGenerateAndCopyLink = () => {
    if (!linkModalCompany) return;
    const classParams = selectedClassesForLink.length > 0 ? `?classes=${selectedClassesForLink.join(',')}` : '';
    const magicLink = `${window.location.origin}/${linkModalCompany.nome_fantasia?.toLowerCase().replace(/[^a-z0-9]/g, "") || linkModalCompany.razao_social?.toLowerCase().replace(/[^a-z0-9]/g, "")}/${linkModalCompany.id}${classParams}`;
    navigator.clipboard.writeText(magicLink);
    setCopiedToken(linkModalCompany.token_registro_b2b);
    setTimeout(() => setCopiedToken(null), 1500);
  };

  const handleSaveCompany = async () => {
    if (companySubmitRef.current || isCreating || isUpdating) return;
    const editingCompany = editingCompanyId ? companies.find((company) => company.id === editingCompanyId) : undefined;
    const isMigrationCompany = Boolean(editingCompany?.hash_link_inscricao?.startsWith('migracao-'));
    if ((!isMigrationCompany && (!formCnpj || !formRazao || !formFantasia)) || (isMigrationCompany && !formFantasia.trim())) {
      alert(isMigrationCompany
        ? 'Informe pelo menos o nome fantasia da empresa de migração.'
        : 'Por favor, preencha todos os campos obrigatórios: Razão Social, Nome Fantasia e CNPJ.');
      return;
    }
    companySubmitRef.current = true;

    try {
      if (editingCompanyId) {
        await updateCompany({
          id: editingCompanyId,
          updates: {
            cnpj: formCnpj,
            razao_social: formRazao,
            nome_fantasia: formFantasia,
            email_corporativo: formEmail || undefined,
            website: formSite || undefined,
            status_ativo: formStatus,
            telefone: formTelefone || undefined,
            endereco: formEndereco || undefined,
            responsavel: formResponsavel || undefined,
          }
        });
        createLog({ usuario_id: 'user-admin-1', acao: `Atualizou empresa corporativa "${formRazao}"`, tabela_afetada: 'empresas_b2b', registro_id: editingCompanyId, ip_address: '127.0.0.1' });
      } else {
        const token = `tk_${formFantasia.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        const emailToSave = formEmail || `financeiro@${formFantasia.toLowerCase().replace(/[^a-z0-9]/g, '') || 'empresa'}.com.br`;
        await createCompany({
          cnpj: formCnpj,
          razao_social: formRazao,
          nome_fantasia: formFantasia,
          email_corporativo: emailToSave,
          website: formSite || undefined,
          token_registro_b2b: token,
          limite_vagas_corporativo: 100, // default limit
          status_ativo: formStatus,
          telefone: formTelefone || undefined,
          endereco: formEndereco || undefined,
          responsavel: formResponsavel || undefined,
        });
        createLog({ usuario_id: 'user-admin-1', acao: `Cadastrou nova empresa corporativa "${formRazao}"`, tabela_afetada: 'empresas_b2b', registro_id: formCnpj, ip_address: '127.0.0.1' });
      }

      // Clear & Close
      setFormCnpj('');
      setFormRazao('');
      setFormFantasia('');
      setFormEmail('');
      setFormSite('');
      setFormVagas(15);
      setFormStatus(true);
      setFormTelefone('');
      setFormEndereco('');
      setFormResponsavel('');
      setAddCompanyOpen(false);
    } catch (err) {
      console.error(err);
      alert('Não foi possível salvar a empresa. Verifique os dados e tente novamente.');
    } finally {
      companySubmitRef.current = false;
    }
  };

  // Filter companies
  const filteredCompanies = useMemo(() => {
    return companies.filter((comp) => {
      const razaoSocial = typeof comp.razao_social === 'string' ? comp.razao_social : '';
      const cnpj = typeof comp.cnpj === 'string' ? comp.cnpj : '';
      const nomeFantasia = typeof comp.nome_fantasia === 'string' ? comp.nome_fantasia : '';
      const matchQuery = razaoSocial.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          cnpj.includes(searchQuery) ||
                          nomeFantasia.toLowerCase().includes(searchQuery.toLowerCase());
      const hasDateFilter = Boolean(startDate || endDate);
      const companyCreatedDate = comp.created_at?.slice(0, 10);
      const matchCreatedDate = !hasDateFilter || (
        Boolean(companyCreatedDate) &&
        (!startDate || companyCreatedDate >= startDate) &&
        (!endDate || companyCreatedDate <= endDate)
      );

      return matchQuery && matchCreatedDate;
    });
  }, [companies, searchQuery, startDate, endDate]);

  return (
    <div id="companies-page" className="flex-1 flex flex-col p-6 gap-6 overflow-y-auto font-sans">
      {/* Top Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h2 className="font-display text-2xl md:text-3xl font-extrabold text-slate-950 dark:text-white leading-tight">
            Empresas Parceiras B2B
          </h2>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 font-medium">
            Gerenciamento de contratos e links de inscrição por empresa.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setIsHelpOpen(true)}
            aria-label="Ajuda sobre empresas B2B"
            title="Ajuda sobre empresas B2B"
            className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >

            <HelpCircle className="h-4 w-4" aria-hidden="true" />
            Ajuda
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingCompanyId(null);
              setFormCnpj('');
              setFormRazao('');
              setFormFantasia('');
              setFormEmail('');
              setFormSite('');
              setFormStatus(true);
              setFormTelefone('');
              setFormEndereco('');
              setFormResponsavel('');
              setAddCompanyOpen(true);
            }}
            className="flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-850 dark:bg-teal-600 dark:hover:bg-teal-500"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nova Empresa
          </button>
        </div>

      </div>

      {/* Filter and Count Bar matching screenshot */}
      <div className="flex flex-col gap-3 p-4 bg-slate-50 dark:bg-slate-850 rounded-xl border border-gray-200 dark:border-slate-800 shrink-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => setIsDateFilterOpen((isOpen) => !isOpen)}
              aria-expanded={isDateFilterOpen}
              aria-controls="company-date-filters"
              className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-750 px-3 py-1.5 rounded-lg font-bold text-xs text-slate-800 dark:text-white shadow-sm transition-colors hover:bg-gray-50 dark:hover:bg-slate-800"
            >
              <Filter className="w-3.5 h-3.5 text-gray-500" />
              <span>Filtros</span>
            </button>
            <div className="h-5 w-px bg-gray-300 dark:bg-slate-750" />
            <span className="text-xs text-gray-500 dark:text-slate-400 font-semibold">
              {filteredCompanies.length} empresas cadastradas
            </span>
            {(startDate || endDate) && (
              <button
                type="button"
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                }}
                className="flex items-center gap-1 text-xs font-semibold text-teal-700 transition-colors hover:text-teal-900 dark:text-teal-400 dark:hover:text-teal-300"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
                Limpar
              </button>
            )}
          </div>

          {/* Local Search input */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por CNPJ, Razão ou Fantasia..."
              className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-slate-750 bg-white dark:bg-slate-900 text-xs rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#005f5f]"
            />
          </div>
        </div>

        {isDateFilterOpen && (
          <div id="company-date-filters" className="flex flex-col sm:flex-row sm:items-end gap-3 border-t border-gray-200 pt-3 dark:border-slate-800">
            <span className="pb-2 text-xs font-bold text-slate-700 dark:text-slate-200">Data de cadastro:</span>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="company-start-date" className="text-xs font-semibold text-gray-600 dark:text-slate-300">
                Data inicial
              </label>
              <input
                id="company-start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#005f5f] dark:border-slate-750 dark:bg-slate-900 dark:text-white"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="company-end-date" className="text-xs font-semibold text-gray-600 dark:text-slate-300">
                Data final
              </label>
              <input
                id="company-end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#005f5f] dark:border-slate-750 dark:bg-slate-900 dark:text-white"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 dark:border-slate-750 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              Limpar datas
            </button>
          </div>
        )}
      </div>

      {/* Main Table Grid matching screenshot exactly */}
      <div className="flex-1 border border-gray-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm flex flex-col min-h-[300px]">
        <div className="overflow-x-auto flex-1 custom-scrollbar">
          <table className="w-full text-left border-collapse whitespace-nowrap text-xs">
            <thead className="sticky top-0 bg-slate-50 dark:bg-slate-850 z-10 border-b border-gray-200 dark:border-slate-800 font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
              <tr>
                <th className="px-5 py-4 w-10 text-center"></th>
                <th className="px-5 py-4">CNPJ</th>
                <th className="px-5 py-4">RAZÃO SOCIAL</th>
                <th className="px-5 py-4 text-center">LINK DE INSCRIÇÃO</th>
                <th className="px-5 py-4 text-center">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150 dark:divide-slate-800 font-sans text-slate-700 dark:text-slate-200">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-gray-500">
                      <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                      <p className="font-sans text-sm">Carregando parceiros B2B...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredCompanies.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-gray-500 font-sans">
                    <div className="flex flex-col items-center justify-center gap-2.5 max-w-sm mx-auto">
                      <div className="p-3 bg-teal-500/10 rounded-full text-teal-500">
                        <Building2 className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-slate-800 dark:text-slate-200">Nenhuma empresa parceira localizada</p>
                        <p className="text-xs text-gray-400 mt-1 leading-normal">
                          Tente ajustar os filtros de busca ou cadastre uma nova empresa B2B.
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCompanies.map((comp) => {
                  const isAtivo = comp.status_ativo;
                  const isMigrationCompany = comp.hash_link_inscricao?.startsWith('migracao-');
                  const isIncompleteMigration = isMigrationCompany && (!comp.cnpj?.trim() || !comp.razao_social?.trim());

                  return (
                    <tr
                      key={comp.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20 transition-colors h-[52px] cursor-pointer group"
                      onClick={() => {
                        setSelectedCompanyForEmployees(comp);
                        setEmployeesPanelOpen(true);
                      }}
                    >
                      {/* Action Menu Column */}
                      <td className="px-5 py-2.5 text-center relative" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center">
                          <RowActionMenu
                            ariaLabel={`Ações da empresa ${comp.nome_fantasia || comp.razao_social}`}
                            items={[
                              {
                                label: 'Editar',
                                icon: <Edit2 className="h-4 w-4" aria-hidden="true" />,
                                onClick: () => handleEditCompany(comp),
                              },
                              {
                                label: 'Remover Empresa',
                                icon: <Trash2 className="h-4 w-4" aria-hidden="true" />,
                                tone: 'danger',
                                onClick: () => setCompanyToDelete(comp),
                              },
                            ]}
                          />
                        </div>
                      </td>

                      {/* CNPJ Column */}
                      <td className="px-5 py-2.5 border-r border-gray-100/50 dark:border-slate-800/30 font-mono text-[11px] text-gray-500 dark:text-slate-400">
                        {comp.cnpj || (isIncompleteMigration ? <span className="font-sans font-semibold text-amber-700 dark:text-amber-300">Pendente</span> : '—')}
                      </td>

                      {/* Razao Social Column */}
                      <td className="px-5 py-2.5 border-r border-gray-100/50 dark:border-slate-800/30">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-950 dark:text-white text-sm">
                            {comp.razao_social || (isIncompleteMigration ? 'Dados fiscais pendentes' : '—')}
                          </span>
                          <span className="text-[10px] text-gray-400 font-semibold mt-0.5">
                            {comp.nome_fantasia || 'Sem nome fantasia'} | {comp.email_corporativo || 'Sem e-mail'}
                          </span>
                          {isIncompleteMigration && <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-300"><TriangleAlert className="h-3 w-3" aria-hidden="true" /> Migração · completar dados fiscais</span>}
                        </div>
                      </td>

                      {/* Link Gerar Column */}
                      <td className="px-5 py-2.5 border-r border-gray-100/50 dark:border-slate-800/30 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyLink(comp);
                          }}
                          disabled={!isAtivo}
                          className={`px-3 py-1.5 text-[11px] font-bold rounded flex items-center gap-1.5 mx-auto transition-colors ${
                            isAtivo
                              ? 'bg-teal-50 text-teal-700 hover:bg-teal-100 dark:bg-teal-500/10 dark:text-teal-400 dark:hover:bg-teal-500/20 border border-teal-200 dark:border-teal-800/30'
                              : 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-slate-800 dark:text-slate-500 border border-gray-200 dark:border-slate-700'
                          }`}
                        >
                          <LinkIcon className="w-3.5 h-3.5" />
                          Gerar link único
                        </button>
                      </td>

                      {/* Status Switch Column */}
                      <td className="px-5 py-2.5 border-r border-gray-100/50 dark:border-slate-800/30 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateCompany({ id: comp.id, updates: { status_ativo: !comp.status_ativo } });
                          }}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${comp.status_ativo ? 'bg-teal-500' : 'bg-gray-300 dark:bg-slate-600'}`}
                        >
                          <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${comp.status_ativo ? 'translate-x-5' : 'translate-x-1'}`} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer matching look */}
        <div className="px-5 py-4 border-t border-gray-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 font-sans text-xs bg-slate-50 dark:bg-slate-850">
          <span className="text-gray-500 font-medium">
            Exibindo 1-{filteredCompanies.length} de {companies.length} empresas
          </span>

          <div className="flex items-center border border-gray-300 dark:border-slate-750 rounded-lg bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
            <button className="p-2 hover:bg-gray-50 dark:hover:bg-slate-850 text-gray-500 dark:text-slate-400 border-r border-gray-300 dark:border-slate-750 transition-colors cursor-pointer">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button className="px-3 py-2 bg-[#005f5f]/10 dark:bg-teal-950/30 text-[#005f5f] dark:text-teal-400 font-bold border-r border-gray-300 dark:border-slate-750 transition-colors cursor-pointer">
              1
            </button>
            <button className="p-2 hover:bg-gray-50 dark:hover:bg-slate-850 text-gray-500 dark:text-slate-400 transition-colors cursor-pointer">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <HelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        title="Ajuda sobre Empresas B2B"
        description="Use esta tela para consultar e gerenciar as empresas parceiras da instituição."
        items={[
          {
            title: 'Objetivo da tela',
            description: 'Use esta tela para cadastrar e administrar as empresas parceiras B2B, acompanhar os funcionários ativos vinculados e disponibilizar links de inscrição.',
            icon: <Building2 className="h-4 w-4" aria-hidden="true" />,
          },
          {
            title: 'Nova Empresa',
            description: 'Abre o formulário para cadastrar razão social, nome fantasia, CNPJ, e-mail corporativo, telefone, endereço, responsável e status da empresa.',
            icon: <Plus className="h-4 w-4" aria-hidden="true" />,
          },
          {
            title: 'Busca e filtros',
            description: 'Pesquise por CNPJ, razão social ou nome fantasia. Em Filtros, informe uma data inicial e/ou final para consultar empresas pela data de cadastro.',
            icon: <Filter className="h-4 w-4" aria-hidden="true" />,
          },
          {
            title: 'Data de cadastro',
            description: 'A data é registrada automaticamente no banco quando a empresa é criada e fica disponível nos dados detalhados da empresa.',
            icon: <CalendarDays className="h-4 w-4" aria-hidden="true" />,
          },
          {
            title: 'Dados da empresa',
            description: 'Clique em qualquer linha para abrir o painel lateral com os dados cadastrais, a data de cadastro e os funcionários vinculados à empresa.',
            icon: <Info className="h-4 w-4" aria-hidden="true" />,
          },
          {
            title: 'Menu de ações',
            description: 'Use o menu de três pontos de cada empresa para editar os dados cadastrais ou remover o registro.',
            icon: <MoreVertical className="h-4 w-4" aria-hidden="true" />,
          },
          {
            title: 'Funcionários vinculados',
            description: 'A coluna mostra o total de alunos únicos vinculados nas matrículas B2B ativas ou concluídas, considerando somente alunos ativos.',
            icon: <Users className="h-4 w-4" aria-hidden="true" />,
          },
          {
            title: 'Gerar link único',
            description: 'Empresas ativas podem gerar um link de inscrição. O link pode ser configurado com as turmas selecionadas e copiado para compartilhamento.',
            icon: <LinkIcon className="h-4 w-4" aria-hidden="true" />,
          },
          {
            title: 'Status da empresa',
            description: 'Alterne o status entre ativa e inativa. O link de inscrição fica indisponível enquanto a empresa estiver inativa.',
            icon: <Power className="h-4 w-4" aria-hidden="true" />,
          },
          {
            title: 'Observação',
            description: 'Os filtros e a busca são aplicados juntos. Para voltar a visualizar todas as empresas, limpe a busca e as datas selecionadas.',
            icon: <Briefcase className="h-4 w-4" aria-hidden="true" />,
          },
        ]}
      />

      {/* --- SLIDE PANEL NOVA EMPRESA CORPORATIVA --- */}
      <SlidePanel isOpen={addCompanyOpen} onClose={() => setAddCompanyOpen(false)}>
        {/* Panel Header */}
        <div className="px-6 py-5 border-b border-gray-200 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-850 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-sky-950/30 flex items-center justify-center border border-blue-100 dark:border-sky-900/20">
              <Building2 className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white leading-tight">
                {editingCompanyId ? 'Editar Empresa Parceira' : 'Cadastro de Empresa Parceira'}
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
                {editingCompanyId && companies.find((company) => company.id === editingCompanyId)?.hash_link_inscricao?.startsWith('migracao-')
                  ? 'Complete os dados fiscais pendentes da migração quando estiverem disponíveis.'
                  : 'Adicione os dados fiscais básicos para habilitar faturamento em lote.'}
              </p>
            </div>
          </div>
          <button
            id="btn-close-company-modal-x"
            onClick={() => setAddCompanyOpen(false)}
            className="text-gray-500 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400 transition-colors p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 focus:outline-none"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Panel Body (Scrollable Form) */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
          <form onSubmit={(e) => e.preventDefault()} className="space-y-4 font-sans">
            {/* Razao Social Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wide">
                Razão Social {editingCompanyId && companies.find((company) => company.id === editingCompanyId)?.hash_link_inscricao?.startsWith('migracao-') ? '(opcional para migração)' : '*'}
              </label>
              <input
                id="company-razao-input"
                type="text"
                value={formRazao}
                onChange={(e) => setFormRazao(e.target.value)}
                placeholder="Ex: Aero Dynamics Gestão de Documentos S.A."
                className="w-full border border-gray-300 dark:border-slate-700 rounded px-3 py-2 bg-white dark:bg-slate-850 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
              />
              <span className="text-[10px] text-gray-400 italic">
                Nome oficial registrado legalmente.
              </span>
            </div>

            {/* Nome Fantasia Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wide">
                Nome Fantasia *
              </label>
              <input
                id="company-fantasia-input"
                type="text"
                value={formFantasia}
                onChange={(e) => setFormFantasia(e.target.value)}
                placeholder="Ex: Aero Docs"
                className="w-full border border-gray-300 dark:border-slate-700 rounded px-3 py-2 bg-white dark:bg-slate-850 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
              />
            </div>

            {/* CNPJ Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wide">
                CNPJ {editingCompanyId && companies.find((company) => company.id === editingCompanyId)?.hash_link_inscricao?.startsWith('migracao-') ? '(opcional para migração)' : '*'}
              </label>
              <div className="relative">
                <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  id="company-cnpj-input"
                  type="text"
                  value={formCnpj}
                  onChange={handleCnpjChange}
                  placeholder="00.000.000/0000-00"
                  className="w-full pl-10 pr-4 border border-gray-300 dark:border-slate-700 rounded py-2 bg-white dark:bg-slate-850 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 font-mono"
                />
              </div>
            </div>

            {/* Email Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wide">
                Email Corporativo
              </label>
              <input
                id="company-email-input"
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="Ex: financeiro@empresa.com.br"
                className="w-full border border-gray-300 dark:border-slate-700 rounded px-3 py-2 bg-white dark:bg-slate-850 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
              />
            </div>

            {/* Telefone Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wide">
                Telefone
              </label>
              <input
                id="company-telefone-input"
                type="text"
                value={formTelefone}
                onChange={handleTelefoneChange}
                placeholder="Ex: (11) 99999-9999"
                className="w-full border border-gray-300 dark:border-slate-700 rounded px-3 py-2 bg-white dark:bg-slate-850 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
              />
            </div>

            {/* Endereço Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wide">
                Endereço
              </label>
              <input
                id="company-endereco-input"
                type="text"
                value={formEndereco}
                onChange={(e) => setFormEndereco(e.target.value)}
                placeholder="Ex: Av. Paulista, 1000 - São Paulo, SP"
                className="w-full border border-gray-300 dark:border-slate-700 rounded px-3 py-2 bg-white dark:bg-slate-850 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
              />
            </div>

            {/* Responsável Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wide">
                Responsável
              </label>
              <input
                id="company-responsavel-input"
                type="text"
                value={formResponsavel}
                onChange={(e) => setFormResponsavel(e.target.value)}
                placeholder="Ex: João Silva"
                className="w-full border border-gray-300 dark:border-slate-700 rounded px-3 py-2 bg-white dark:bg-slate-850 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
              />
            </div>
          </form>
        </div>

        {/* Panel Footer (Actions) */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 flex justify-end gap-3 shadow-md relative">
          <button
            id="btn-close-company-modal"
            type="button"
            onClick={() => setAddCompanyOpen(false)}
            className="px-4 py-2 border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-300 rounded font-semibold text-xs hover:bg-gray-50 dark:hover:bg-slate-850 transition-colors"
          >
            Cancelar
          </button>
          <button
            id="btn-confirm-add-company"
            type="button"
            onClick={handleSaveCompany}
            disabled={isCreating || isUpdating}
            className="px-4 py-2 bg-teal-500 hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-60 text-slate-900 font-bold rounded text-xs transition-colors shadow-sm flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            {isCreating || isUpdating ? 'Salvando...' : 'Salvar Empresa'}
          </button>
        </div>
      </SlidePanel>

      {/* Link Config Modal */}
      <Modal 
        isOpen={!!linkModalCompany} 
        onClose={() => setLinkModalCompany(null)} 
      >
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-6 shadow-2xl">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Configurar Link de Matrícula</h3>
        <div className="space-y-4 font-sans text-left min-w-[300px]">
          <p className="text-sm text-slate-500">
            Selecione as turmas que estarão disponíveis para os funcionários da empresa <strong className="text-slate-800 dark:text-slate-200">{linkModalCompany?.nome_fantasia || linkModalCompany?.razao_social}</strong>.
          </p>
          <div className="max-h-60 overflow-y-auto space-y-2 border border-slate-200 dark:border-slate-700 rounded-lg p-2 bg-slate-50 dark:bg-slate-900/50">
            {classes.length === 0 ? (
              <p className="text-xs text-center text-slate-400 py-4">Nenhuma turma cadastrada.</p>
            ) : (
              classes.map((cls: any) => (
                <label key={cls.id} className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded cursor-pointer transition-colors">
                  <input 
                    type="checkbox" 
                    className="rounded border-slate-300 text-teal-500 focus:ring-teal-500 w-4 h-4 shrink-0"
                    checked={selectedClassesForLink.includes(cls.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedClassesForLink([...selectedClassesForLink, cls.id]);
                      } else {
                        setSelectedClassesForLink(selectedClassesForLink.filter(id => id !== cls.id));
                      }
                    }}
                  />
                  <div className="flex flex-col flex-1">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      T-OP-{cls.id_interno_escola} - {(courses?.find((c: any) => c.id === cls.curso_id)?.nome_curso || "Curso de Aviação")}
                    </span>
                    <span className="text-xs text-slate-500">{cls.turno} • {cls.horario_aulas}</span>
                  </div>
                </label>
              ))
            )}
          </div>
          
          <div className="mt-4 p-3 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Link de Compartilhamento</label>
            <div className="flex items-center justify-between gap-2 overflow-hidden bg-white dark:bg-slate-900 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded">
              <span className="text-xs truncate text-slate-700 dark:text-slate-300 flex-1">
                {window.location.origin}/{linkModalCompany?.nome_fantasia?.toLowerCase().replace(/[^a-z0-9]/g, "") || linkModalCompany?.razao_social?.toLowerCase().replace(/[^a-z0-9]/g, "")}/{linkModalCompany?.id}{selectedClassesForLink.length > 0 ? `?classes=${selectedClassesForLink.join(',')}` : ''}
              </span>
              <a 
                href={`${window.location.origin}/${linkModalCompany?.nome_fantasia?.toLowerCase().replace(/[^a-z0-9]/g, "") || linkModalCompany?.razao_social?.toLowerCase().replace(/[^a-z0-9]/g, "")}/${linkModalCompany?.id}${selectedClassesForLink.length > 0 ? '?classes=' + selectedClassesForLink.join(',') : ''}`}
                target="_blank"
                rel="noreferrer"
                className="text-slate-400 hover:text-teal-500 transition-colors p-1"
                title="Abrir página de matrícula"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button 
              onClick={() => setLinkModalCompany(null)}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            >
              Fechar
            </button>
            <button 
              onClick={handleGenerateAndCopyLink}
              className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white text-sm font-bold rounded shadow-sm flex items-center gap-2 transition-colors"
            >
              {copiedToken === linkModalCompany?.token_registro_b2b ? (
                <Check className="w-4 h-4 text-white" />
              ) : (
                <LinkIcon className="w-4 h-4" />
              )}
              {copiedToken === linkModalCompany?.token_registro_b2b ? 'Copiado!' : 'Copiar link único'}
            </button>
          </div>
        </div>
      </div>
      </Modal>

      {/* Delete Company Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={!!companyToDelete}
        onClose={() => setCompanyToDelete(null)}
        itemName={companyToDelete?.razao_social || companyToDelete?.nome_fantasia}
        isPending={isDeleting}
        onConfirm={async () => {
          if (!companyToDelete) return;
          try {
            await deleteCompany(companyToDelete.id);
            setCompanyToDelete(null);
          } catch (err) {
            console.error('Não foi possível remover a empresa', err);
          }
        }}
      />

      {/* Employees Panel */}
      <CompanyEmployeesPanel
        isOpen={employeesPanelOpen}
        onClose={() => setEmployeesPanelOpen(false)}
        company={selectedCompanyForEmployees}
        onEmployeeClick={(emp) => {
          setSelectedEmployee(emp);
          setEmployeeDetailsOpen(true);
        }}
      />

      {/* Employee Details Panel */}
      <StudentDetailsPanel
        isOpen={employeeDetailsOpen}
        onClose={() => setEmployeeDetailsOpen(false)}
        student={selectedEmployee}
      />
    </div>
  );
}

export default Companies;
