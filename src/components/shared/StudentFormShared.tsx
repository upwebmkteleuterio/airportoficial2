import React, { useState } from 'react';

export const isValidFullName = (name: string) => name.trim().split(/\s+/).length >= 2;
export const isValidCPF = (cpf: string) => cpf.replace(/\D/g, '').length === 11;
export const isValidDate = (date: string) => date.length === 10;
export const isValidCEP = (cep: string) => cep.replace(/\D/g, '').length === 8;
export const isValidPhone = (phone: string) => phone.replace(/\D/g, '').length >= 10;

export function useStudentFormValidation(formData: any, setFormData: any) {
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});

  const validateField = (name: string, value: string) => {
    let error = '';
    switch (name) {
      case 'nome_completo':
      case 'nome_mae':
        if (!isValidFullName(value)) error = 'Digite o nome e sobrenome.';
        break;
      case 'email':
        if (!value.includes('@')) error = 'Digite um e-mail válido.';
        break;
      case 'telefone':
        if (!isValidPhone(value)) error = 'Digite um telefone válido.';
        break;
      case 'data_nascimento':
        if (!isValidDate(value)) error = 'Data inválida.';
        break;
      case 'rg':
      case 'orgao_expedicao_rg':
      case 'grau_ensino':
      case 'endereco':
      case 'numero':
      case 'bairro':
      case 'cidade':
      case 'estado':
        if (value.trim().length === 0) error = 'Campo obrigatório.';
        break;
      case 'cpf':
        if (!isValidCPF(value)) error = 'CPF inválido.';
        break;
      case 'cep':
        if (!isValidCEP(value)) error = 'CEP inválido.';
        break;
    }
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const handleCepBlur = async () => {
    const cep = formData.cep.replace(/\D/g, '');
    if (cep.length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await response.json();
        if (!data.erro) {
          setFormData((prev: any) => ({
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

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    validateField(name, value);
    
    if (name === 'cep') {
      handleCepBlur();
    }
  };

  return { errors, touched, handleBlur, setErrors, setTouched };
}

export function PersonalInfoFields({ 
  formData, 
  handleInputChange, 
  handleBlur, 
  errors, 
  touched, 
  children 
}: any) {
  const inputClass = "w-full border border-gray-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-850 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#005f5f] outline-none";
  const labelClass = "block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1";
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {children}
      <div className="col-span-1 md:col-span-2">
        <label className={labelClass}>Nome Completo *</label>
        <input
          type="text"
          name="nome_completo"
          value={formData.nome_completo}
          onChange={handleInputChange}
          onBlur={handleBlur}
          className={inputClass}
          placeholder="Ex: João da Silva"
        />
        {touched.nome_completo && errors.nome_completo && (
          <span className="text-red-500 text-xs mt-1 block">{errors.nome_completo}</span>
        )}
      </div>
      
      <div>
        <label className={labelClass}>Data de Nascimento *</label>
        <input
          type="date"
          name="data_nascimento"
          value={formData.data_nascimento}
          onChange={handleInputChange}
          onBlur={handleBlur}
          className={inputClass}
        />
        {touched.data_nascimento && errors.data_nascimento && (
          <span className="text-red-500 text-xs mt-1 block">{errors.data_nascimento}</span>
        )}
      </div>
      
      <div>
        <label className={labelClass}>CPF *</label>
        <input
          type="text"
          name="cpf"
          value={formData.cpf}
          onChange={handleInputChange}
          onBlur={handleBlur}
          className={inputClass}
          placeholder="000.000.000-00"
        />
        {touched.cpf && errors.cpf && (
          <span className="text-red-500 text-xs mt-1 block">{errors.cpf}</span>
        )}
      </div>

      <div className="col-span-1 md:col-span-2">
        <label className={labelClass}>Nome da Mãe *</label>
        <input
          type="text"
          name="nome_mae"
          value={formData.nome_mae}
          onChange={handleInputChange}
          onBlur={handleBlur}
          className={inputClass}
          placeholder="Nome completo da mãe"
        />
        {touched.nome_mae && errors.nome_mae && (
          <span className="text-red-500 text-xs mt-1 block">{errors.nome_mae}</span>
        )}
      </div>

      <div className="col-span-1 md:col-span-2">
        <label className={labelClass}>Nome do Pai (Opcional)</label>
        <input
          type="text"
          name="nome_pai"
          value={formData.nome_pai}
          onChange={handleInputChange}
          onBlur={handleBlur}
          className={inputClass}
          placeholder="Nome completo do pai"
        />
        {touched.nome_pai && errors.nome_pai && (
          <span className="text-red-500 text-xs mt-1 block">{errors.nome_pai}</span>
        )}
      </div>

      <div>
        <label className={labelClass}>Cédula de Identidade (RG) *</label>
        <input
          type="text"
          name="rg"
          value={formData.rg}
          onChange={handleInputChange}
          onBlur={handleBlur}
          className={inputClass}
          placeholder="Número do RG"
        />
        {touched.rg && errors.rg && (
          <span className="text-red-500 text-xs mt-1 block">{errors.rg}</span>
        )}
      </div>

      <div>
        <label className={labelClass}>Órgão de Expedição *</label>
        <input
          type="text"
          name="orgao_expedicao_rg"
          value={formData.orgao_expedicao_rg}
          onChange={handleInputChange}
          onBlur={handleBlur}
          className={inputClass}
          placeholder="Ex: SSP/SP"
        />
        {touched.orgao_expedicao_rg && errors.orgao_expedicao_rg && (
          <span className="text-red-500 text-xs mt-1 block">{errors.orgao_expedicao_rg}</span>
        )}
      </div>

      <div className="col-span-1 md:col-span-2">
        <label className={labelClass}>Grau de Instrução *</label>
        <select
          name="grau_ensino"
          value={formData.grau_ensino}
          onChange={handleInputChange}
          onBlur={handleBlur}
          className={inputClass}
        >
          <option value="">Selecione...</option>
          <option value="Ensino Médio Incompleto">Ensino Médio Incompleto</option>
          <option value="Ensino Médio Completo">Ensino Médio Completo</option>
          <option value="Ensino Superior Incompleto">Ensino Superior Incompleto</option>
          <option value="Ensino Superior Completo">Ensino Superior Completo</option>
          <option value="Pós-graduação">Pós-graduação</option>
        </select>
        {touched.grau_ensino && errors.grau_ensino && (
          <span className="text-red-500 text-xs mt-1 block">{errors.grau_ensino}</span>
        )}
      </div>

      <div className="col-span-1 md:col-span-2">
        <label className={labelClass}>Telefone / WhatsApp *</label>
        <input
          type="text"
          name="telefone"
          value={formData.telefone}
          onChange={handleInputChange}
          onBlur={handleBlur}
          className={inputClass}
          placeholder="(00) 00000-0000"
        />
        {touched.telefone && errors.telefone && (
          <span className="text-red-500 text-xs mt-1 block">{errors.telefone}</span>
        )}
      </div>

      <div className="col-span-1 md:col-span-2">
        <label className={labelClass}>E-mail *</label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleInputChange}
          onBlur={handleBlur}
          className={inputClass}
          placeholder="seu@email.com"
        />
        {touched.email && errors.email && (
          <span className="text-red-500 text-xs mt-1 block">{errors.email}</span>
        )}
      </div>

      <div className="col-span-1 md:col-span-2">
        <label className={labelClass}>Trabalha na aviação civil?</label>
        <select
          name="trabalha_aviacao_civil"
          value={formData.trabalha_aviacao_civil}
          onChange={handleInputChange}
          onBlur={handleBlur}
          className={inputClass}
        >
          <option value="">Selecione...</option>
          <option value="sim">Sim, trabalha</option>
          <option value="nao">Não, não trabalha</option>
        </select>
        {touched.trabalha_aviacao_civil && errors.trabalha_aviacao_civil && (
          <span className="text-red-500 text-xs mt-1 block">{errors.trabalha_aviacao_civil}</span>
        )}
      </div>

      <div className="col-span-1 md:col-span-2">
        <label className={labelClass}>Trabalha com segurança Avsec?</label>
        <select
          name="trabalha_seguranca_avsec"
          value={formData.trabalha_seguranca_avsec}
          onChange={handleInputChange}
          onBlur={handleBlur}
          className={inputClass}
        >
          <option value="">Selecione...</option>
          <option value="sim">Sim, trabalha</option>
          <option value="nao">Não, não trabalha</option>
        </select>
        {touched.trabalha_seguranca_avsec && errors.trabalha_seguranca_avsec && (
          <span className="text-red-500 text-xs mt-1 block">{errors.trabalha_seguranca_avsec}</span>
        )}
      </div>
    </div>
  );
}

export function AddressFields({ formData, handleInputChange, handleBlur, errors, touched }: any) {
  const inputClass = "w-full border border-gray-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-850 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#005f5f] outline-none";
  const labelClass = "block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1";

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="col-span-1 md:col-span-4">
        <label className={labelClass}>CEP *</label>
        <input
          type="text"
          name="cep"
          value={formData.cep}
          onChange={handleInputChange}
          onBlur={handleBlur}
          className={inputClass}
          placeholder="00000-000"
        />
        {touched.cep && errors.cep && (
          <span className="text-red-500 text-xs mt-1 block">{errors.cep}</span>
        )}
      </div>

      <div className="col-span-1 md:col-span-3">
        <label className={labelClass}>Endereço *</label>
        <input
          type="text"
          name="endereco"
          value={formData.endereco}
          onChange={handleInputChange}
          onBlur={handleBlur}
          className={inputClass}
          placeholder="Rua, Avenida, etc."
        />
        {touched.endereco && errors.endereco && (
          <span className="text-red-500 text-xs mt-1 block">{errors.endereco}</span>
        )}
      </div>

      <div>
        <label className={labelClass}>Número *</label>
        <input
          type="text"
          name="numero"
          value={formData.numero}
          onChange={handleInputChange}
          onBlur={handleBlur}
          className={inputClass}
          placeholder="Nº"
        />
        {touched.numero && errors.numero && (
          <span className="text-red-500 text-xs mt-1 block">{errors.numero}</span>
        )}
      </div>

      <div className="col-span-1 md:col-span-3">
        <label className={labelClass}>Bairro *</label>
        <input
          type="text"
          name="bairro"
          value={formData.bairro}
          onChange={handleInputChange}
          onBlur={handleBlur}
          className={inputClass}
          placeholder="Bairro"
        />
        {touched.bairro && errors.bairro && (
          <span className="text-red-500 text-xs mt-1 block">{errors.bairro}</span>
        )}
      </div>

      <div className="col-span-1 md:col-span-2">
        <label className={labelClass}>Cidade *</label>
        <input
          type="text"
          name="cidade"
          value={formData.cidade}
          onChange={handleInputChange}
          onBlur={handleBlur}
          className={inputClass}
          placeholder="Cidade"
        />
        {touched.cidade && errors.cidade && (
          <span className="text-red-500 text-xs mt-1 block">{errors.cidade}</span>
        )}
      </div>

      <div className="col-span-1 md:col-span-2">
        <label className={labelClass}>Estado (UF) *</label>
        <select
          name="estado"
          value={formData.estado}
          onChange={handleInputChange}
          onBlur={handleBlur}
          className={inputClass}
        >
          <option value="">Selecione</option>
          {["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"].map(uf => (
            <option key={uf} value={uf}>{uf}</option>
          ))}
        </select>
        {touched.estado && errors.estado && (
          <span className="text-red-500 text-xs mt-1 block">{errors.estado}</span>
        )}
      </div>
    </div>
  );
}
