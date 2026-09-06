import React, { useState } from 'react';
import { CalendarDays, Edit, Edit2, HelpCircle, Info, MapPin, MoreVertical, Plus, Power, Trash2, X } from 'lucide-react';
import { useAddresses } from '../hooks/useAddresses';
import { Endereco } from '../types';
import { Button } from '../components/ui/Button';
import { ConfirmDeleteModal } from '../components/ui/ConfirmDeleteModal';
import { HelpModal } from '../components/ui/HelpModal';
import { RowActionMenu } from '../components/ui/RowActionMenu';
import { BRAZIL_STATES } from '../utils/states';

function formatCreatedAt(createdAt?: string) {

  if (!createdAt) return '—';
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

export default function Addresses() {
  const {
    addresses,
    createAddress,
    updateAddress,
    deleteAddress,
    isLoading,
    isCreating,
    isUpdating,
    isDeleting,
  } = useAddresses();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Endereco>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState<Endereco | null>(null);

  const openModal = (address?: Endereco) => {
    if (address) {

      setEditingId(address.id);
      setFormData(address);
    } else {
      setEditingId(null);
      setFormData({ logradouro: '', cidade: '', estado: '' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isCreating || isUpdating) return;
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({});
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.logradouro || !formData.cidade || !formData.estado) return;

    if (editingId) {
      const { id: _id, created_at: _createdAt, ...updates } = formData;
      await updateAddress({ id: editingId, updates });
    } else {
      await createAddress({
        logradouro: formData.logradouro,
        cidade: formData.cidade,
        estado: formData.estado,
        ...(formData.ativo !== undefined ? { ativo: formData.ativo } : {}),
      });
    }
    closeModal();
  };

  const handleToggleActive = async (address: Endereco) => {
    await updateAddress({ id: address.id, updates: { ativo: address.ativo === false } });
  };

  const handleConfirmDelete = async () => {
    if (!addressToDelete) return;
    try {
      await deleteAddress(addressToDelete.id);
      setAddressToDelete(null);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-6 gap-6 overflow-y-auto">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 shrink-0">
        <div>
          <h2 className="font-display text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white leading-tight">Endereços</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Cadastre e gerencie os endereços onde ocorrem as turmas.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" type="button" onClick={() => setIsHelpOpen(true)} icon={<HelpCircle className="w-4 h-4" aria-hidden="true" />} aria-label="Ajuda">
            Ajuda
          </Button>
          <Button onClick={() => openModal()} icon={<Plus className="w-4 h-4" />}>
            Novo Endereço
          </Button>
        </div>
      </div>

      <div className="flex-1 border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm flex flex-col min-h-[350px]">
        <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
          <table className="w-full text-left border-collapse whitespace-nowrap text-xs">
            <thead className="sticky top-0 bg-slate-50 dark:bg-slate-850 z-10 border-b border-gray-200 dark:border-slate-800 font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3 w-10 text-center border-r border-gray-200/50 dark:border-slate-800/50" aria-label="Ações"></th>
                <th className="px-4 py-3 border-r border-gray-200/50 dark:border-slate-800/50">Logradouro / Nome</th>
                <th className="px-4 py-3 border-r border-gray-200/50 dark:border-slate-800/50">Cidade</th>
                <th className="px-4 py-3 border-r border-gray-200/50 dark:border-slate-800/50 text-center">Estado</th>
                <th className="px-4 py-3 border-r border-gray-200/50 dark:border-slate-800/50">Data de criação</th>
                <th className="px-4 py-3 border-r border-gray-200/50 dark:border-slate-800/50 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150 dark:divide-slate-800 text-gray-700 dark:text-slate-200 font-mono">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-gray-500">
                      <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" aria-label="Carregando" />
                      <p className="font-sans text-sm">Carregando endereços...</p>
                    </div>
                  </td>
                </tr>
              ) : addresses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-500 font-sans">
                    <div className="flex flex-col items-center justify-center gap-2.5 max-w-sm mx-auto">
                      <div className="p-3 bg-teal-500/10 rounded-full text-teal-500">
                        <MapPin className="w-6 h-6" aria-hidden="true" />
                      </div>
                      <div>
                        <p className="font-bold text-xs text-slate-850 dark:text-slate-200">Nenhum endereço encontrado</p>
                        <p className="text-[10px] text-gray-400 mt-0.5 leading-normal">Adicione um novo endereço para começar.</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                addresses.map((address) => {
                  const isActive = address.ativo !== false;
                  return (
                    <tr key={address.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${!isActive ? 'opacity-60' : ''}`}>
                      <td className="px-4 py-2 text-center border-r border-gray-200/30 dark:border-slate-800/30">
                        <div className="flex items-center justify-center">
                          <RowActionMenu
                            ariaLabel={`Ações para ${address.logradouro}`}
                            items={[
                              {
                                label: 'Editar',
                                icon: <Edit2 className="h-4 w-4" aria-hidden="true" />,
                                onClick: () => openModal(address),
                              },
                              {
                                label: 'Excluir',
                                icon: <Trash2 className="h-4 w-4" aria-hidden="true" />,
                                tone: 'danger',
                                onClick: () => setAddressToDelete(address),
                              },
                            ]}
                          />
                        </div>
                      </td>

                      <td className="px-4 py-2 border-r border-gray-200/30 dark:border-slate-800/30 font-sans font-semibold text-slate-800 dark:text-slate-200">{address.logradouro}</td>
                      <td className="px-4 py-2 border-r border-gray-200/30 dark:border-slate-800/30">{address.cidade}</td>
                      <td className="px-4 py-2 border-r border-gray-200/30 dark:border-slate-800/30 text-center">{address.estado}</td>
                      <td className="px-4 py-2 border-r border-gray-200/30 dark:border-slate-800/30">{formatCreatedAt(address.created_at)}</td>
                      <td className="px-4 py-2 border-r border-gray-200/30 dark:border-slate-800/30 text-center">
                        <button
                          type="button"
                          onClick={() => void handleToggleActive(address)}
                          disabled={isUpdating}
                          aria-label={`${isActive ? 'Desativar' : 'Ativar'} endereço ${address.logradouro}`}
                          title={isActive ? 'Desativar endereço' : 'Ativar endereço'}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 ${isActive ? 'bg-teal-500' : 'bg-gray-300 dark:bg-slate-600'}`}
                        >
                          <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${isActive ? 'translate-x-5' : 'translate-x-1'}`} />
                        </button>
                        <span className="sr-only">{isActive ? 'Ativo' : 'Inativo'}</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <HelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        title="Ajuda sobre Endereços"
        description="Use esta tela para manter os locais disponíveis para as turmas sempre organizados."
        items={[
          {
            title: 'Objetivo da tela',
            description: 'Cadastre e gerencie os endereços onde ocorrem as turmas.',
            icon: <MapPin className="h-4 w-4" aria-hidden="true" />,
          },
          {
            title: 'Novo Endereço',
            description: 'Abre o formulário para cadastrar logradouro ou local, cidade e estado.',
            icon: <Plus className="h-4 w-4" aria-hidden="true" />,
          },
          {
            title: 'Menu de três pontos',
            description: 'Reúne as ações Editar e Excluir para cada endereço.',
            icon: <MoreVertical className="h-4 w-4" aria-hidden="true" />,
          },
          {
            title: 'Botão de status',
            description: 'Alterne o endereço entre ativo e inativo. Endereços inativos não aparecem no cadastro de novas turmas.',
            icon: <Power className="h-4 w-4" aria-hidden="true" />,
          },
          {
            title: 'Data de criação',
            description: 'A coluna mostra quando o endereço foi cadastrado.',
            icon: <CalendarDays className="h-4 w-4" aria-hidden="true" />,
          },
          {
            title: 'Observação',
            description: 'Endereços inativos continuam visíveis nesta tela para controle administrativo.',
            icon: <Info className="h-4 w-4" aria-hidden="true" />,
          },
        ]}
      />

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-labelledby="address-form-title">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-800">
              <h2 id="address-form-title" className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                {editingId ? <Edit className="w-5 h-5 text-teal-600" aria-hidden="true" /> : <Plus className="w-5 h-5 text-teal-600" aria-hidden="true" />}
                {editingId ? 'Editar Endereço' : 'Cadastrar Novo Endereço'}
              </h2>
              <button type="button" onClick={closeModal} disabled={isCreating || isUpdating} aria-label="Fechar formulário" title="Fechar" className="text-gray-500 hover:text-gray-700 dark:hover:text-white disabled:opacity-50">
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label htmlFor="address-logradouro" className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase mb-1">Logradouro / Local</label>
                <input id="address-logradouro" type="text" required value={formData.logradouro || ''} onChange={e => setFormData({ ...formData, logradouro: e.target.value })} className="w-full border border-gray-300 dark:border-slate-700 rounded px-3 py-2 bg-transparent dark:text-white focus:outline-none focus:border-teal-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="address-city" className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase mb-1">Cidade</label>
                  <input id="address-city" type="text" required value={formData.cidade || ''} onChange={e => setFormData({ ...formData, cidade: e.target.value })} className="w-full border border-gray-300 dark:border-slate-700 rounded px-3 py-2 bg-transparent dark:text-white focus:outline-none focus:border-teal-500" />
                </div>
                <div>
                  <label htmlFor="address-state" className="block text-xs font-bold text-gray-700 dark:text-slate-300 uppercase mb-1">Estado (UF)</label>
                  <div className="relative">
                    <select id="address-state" required value={formData.estado || ''} onChange={e => setFormData({ ...formData, estado: e.target.value })} className="w-full appearance-none border border-gray-300 dark:border-slate-700 rounded px-3 py-2 bg-transparent dark:text-white focus:outline-none focus:border-teal-500">
                      <option value="" disabled>Selecione</option>
                      {BRAZIL_STATES.map(uf => <option key={uf} value={uf} className="bg-white dark:bg-slate-850 text-slate-900 dark:text-white">{uf}</option>)}
                    </select>
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-slate-400">▼</span>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="secondary" type="button" onClick={closeModal} disabled={isCreating || isUpdating}>Cancelar</Button>
                <Button type="submit" disabled={isCreating || isUpdating}>{isCreating || isUpdating ? 'Salvando...' : editingId ? 'Atualizar' : 'Salvar'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDeleteModal
        isOpen={addressToDelete !== null}
        onClose={() => !isDeleting && setAddressToDelete(null)}
        onConfirm={handleConfirmDelete}
        itemName={addressToDelete?.logradouro}
        isPending={isDeleting}
      />
    </div>
  );
}
