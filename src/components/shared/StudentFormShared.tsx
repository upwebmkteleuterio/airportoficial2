import React, { useState } from 'react';

const isRealDate = (year: number, month: number, day: number) => {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};

export const isValidFullName = (name: string) => name.trim().split(/\s+/).filter(Boolean).length >= 2;
export const isValidCPF = (cpf: string) => cpf.replace(/\D/g, '').length === 11;
export const isValidDate = (date: string) => {
  const displayMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(date);
  if (displayMatch) return isRealDate(Number(displayMatch[3]), Number(displayMatch[2]), Number(displayMatch[1]));
  const payloadMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  return payloadMatch ? isRealDate(Number(payloadMatch[1]), Number(payloadMatch[2]), Number(payloadMatch[3])) : false;
};
export const dateToDisplay = (date: string) => {
  const payloadMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  return payloadMatch ? `${payloadMatch[3]}/${payloadMatch[2]}/${payloadMatch[1]}` : date;
};
export const dateToPayload = (date: string) => {
  const displayMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(date);
  return displayMatch ? `${displayMatch[3]}-${displayMatch[2]}-${displayMatch[1]}` : date;
};
export const isValidCEP = (cep: string) => cep.replace(/\D/g, '').length === 8;
export const isValidPhone = (phone: string) => phone.replace(/\D/g, '').length >= 10;

export const validateStudentField = (name: string, value: string) => {
  switch (name) {
    case 'nome_completo':
    case 'nome_mae':
      return isValidFullName(value) ? '' : 'Digite o nome e sobrenome.';
    case 'email':
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? '' : 'Digite um e-mail válido.';
    case 'telefone':
      return isValidPhone(value) ? '' : 'Digite um telefone válido.';
    case 'data_nascimento':
      return isValidDate(value) ? '' : 'Digite uma data válida (DD/MM/AAAA).';
    case 'cpf':
      return isValidCPF(value) ? '' : 'CPF inválido.';
    case 'cep':
      return isValidCEP(value) ? '' : 'CEP inválido.';
    case 'senha_temporaria':
      return value.length >= 8 && /[A-Z]/.test(value) && /[a-z]/.test(value) && /\d/.test(value) && /[^A-Za-z0-9]/.test(value)
        ? ''
        : 'Use pelo menos 8 caracteres, com maiúscula, minúscula, número e símbolo.';
    case 'trabalha_aviacao_civil':
      return value ? '' : 'Selecione uma opção.';
    case 'trabalha_seguranca_avsec':
      return value ? '' : 'Selecione uma opção.';
    case 'rg':
    case 'orgao_expedicao_rg':
    case 'grau_ensino':
    case 'endereco':
    case 'numero':
    case 'bairro':
    case 'cidade':
    case 'estado':
      return value.trim() ? '' : 'Campo obrigatório.';
    default:
      return '';
  }
};

export function useStudentFormValidation(formData: Record<string, string>, setFormData: React.Dispatch<React.SetStateAction<any>>) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateField = (name: string, value: string) => {
    const error = validateStudentField(name, value);
    setErrors(prev => ({ ...prev, [name]: error }));
    return error;
  };

  const validateFields = (fields: string[]) => {
    const nextErrors = fields.reduce<Record<string, string>>((result, field) => {
      result[field] = validateStudentField(field, formData[field] || '');
      return result;
    }, {});
    setTouched(prev => ({ ...prev, ...fields.reduce<Record<string, boolean>>((result, field) => ({ ...result, [field]: true }), {}) }));
    setErrors(prev => ({ ...prev, ...nextErrors }));
    return fields.every(field => !nextErrors[field]);
  };

  const handleCepBlur = async () => {
    const cep = formData.cep.replace(/\D/g, '');
    if (cep.length !== 8) return;
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
    } catch {
      // The address can still be entered manually when CEP lookup is unavailable.
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    validateField(name, value);
    if (name === 'cep') void handleCepBlur();
  };

  return { errors, touched, handleBlur, validateField, validateFields, setErrors, setTouched };
}

export function PersonalInfoFields({ formData, handleInputChange, handleBlur, errors, touched, children, dateFormat = 'display' }: any) {
  const inputClass = (name: string) => `w-full rounded-lg p-2.5 bg-white dark:bg-slate-850 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#005f5f] outline-none border ${touched[name] && errors[name] ? 'border-red-500' : 'border-gray-300 dark:border-slate-700'}`;
  const labelClass = 'block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1';
  const fieldProps = (name: string) => ({
    'aria-invalid': Boolean(touched[name] && errors[name]),
    'aria-describedby': touched[name] && errors[name] ? `${name}-error` : undefined
  });
  const error = (name: string) => touched[name] && errors[name] ? <span id={`${name}-error`} className="text-red-500 text-xs mt-1 block">{errors[name]}</span> : null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {children}
      <div className="col-span-1 md:col-span-2">
        <label htmlFor="nome_completo" className={labelClass}>Nome Completo *</label>
        <input id="nome_completo" type="text" name="nome_completo" value={formData.nome_completo} onChange={handleInputChange} onBlur={handleBlur} className={inputClass('nome_completo')} placeholder="Ex: João da Silva" {...fieldProps('nome_completo')} />
        {error('nome_completo')}
      </div>
      <div>
        <label htmlFor="data_nascimento" className={labelClass}>Data de Nascimento *</label>
        <input id="data_nascimento" type={dateFormat === 'payload' ? 'date' : 'text'} inputMode={dateFormat === 'payload' ? undefined : 'numeric'} name="data_nascimento" value={formData.data_nascimento} onChange={handleInputChange} onBlur={handleBlur} className={inputClass('data_nascimento')} placeholder={dateFormat === 'payload' ? undefined : 'DD/MM/AAAA'} maxLength={dateFormat === 'payload' ? undefined : 10} {...fieldProps('data_nascimento')} />
        {error('data_nascimento')}
      </div>
      <div>
        <label htmlFor="cpf" className={labelClass}>CPF *</label>
        <input id="cpf" type="text" name="cpf" value={formData.cpf} onChange={handleInputChange} onBlur={handleBlur} className={inputClass('cpf')} placeholder="000.000.000-00" {...fieldProps('cpf')} />
        {error('cpf')}
      </div>
      <div className="col-span-1 md:col-span-2">
        <label htmlFor="nome_mae" className={labelClass}>Nome da Mãe *</label>
        <input id="nome_mae" type="text" name="nome_mae" value={formData.nome_mae} onChange={handleInputChange} onBlur={handleBlur} className={inputClass('nome_mae')} placeholder="Nome completo da mãe" {...fieldProps('nome_mae')} />
        {error('nome_mae')}
      </div>
      <div className="col-span-1 md:col-span-2">
        <label htmlFor="nome_pai" className={labelClass}>Nome do Pai (Opcional)</label>
        <input id="nome_pai" type="text" name="nome_pai" value={formData.nome_pai} onChange={handleInputChange} onBlur={handleBlur} className={inputClass('nome_pai')} placeholder="Nome completo do pai" />
      </div>
      <div>
        <label htmlFor="rg" className={labelClass}>Cédula de Identidade (RG) *</label>
        <input id="rg" type="text" name="rg" value={formData.rg} onChange={handleInputChange} onBlur={handleBlur} className={inputClass('rg')} placeholder="Número do RG" {...fieldProps('rg')} />
        {error('rg')}
      </div>
      <div>
        <label htmlFor="orgao_expedicao_rg" className={labelClass}>Órgão de Expedição *</label>
        <input id="orgao_expedicao_rg" type="text" name="orgao_expedicao_rg" value={formData.orgao_expedicao_rg} onChange={handleInputChange} onBlur={handleBlur} className={inputClass('orgao_expedicao_rg')} placeholder="Ex: SSP/SP" {...fieldProps('orgao_expedicao_rg')} />
        {error('orgao_expedicao_rg')}
      </div>
      <div className="col-span-1 md:col-span-2">
        <label htmlFor="grau_ensino" className={labelClass}>Grau de Instrução *</label>
        <select id="grau_ensino" name="grau_ensino" value={formData.grau_ensino} onChange={handleInputChange} onBlur={handleBlur} className={inputClass('grau_ensino')} {...fieldProps('grau_ensino')}>
          <option value="">Selecione...</option><option value="Ensino Médio Incompleto">Ensino Médio Incompleto</option><option value="Ensino Médio Completo">Ensino Médio Completo</option><option value="Ensino Superior Incompleto">Ensino Superior Incompleto</option><option value="Ensino Superior Completo">Ensino Superior Completo</option><option value="Pós-graduação">Pós-graduação</option>
        </select>
        {error('grau_ensino')}
      </div>
      <div className="col-span-1 md:col-span-2">
        <label htmlFor="telefone" className={labelClass}>Telefone / WhatsApp *</label>
        <input id="telefone" type="text" name="telefone" value={formData.telefone} onChange={handleInputChange} onBlur={handleBlur} className={inputClass('telefone')} placeholder="(00) 00000-0000" {...fieldProps('telefone')} />
        {error('telefone')}
      </div>
      <div className="col-span-1 md:col-span-2">
        <label htmlFor="email" className={labelClass}>E-mail *</label>
        <input id="email" type="email" name="email" value={formData.email} onChange={handleInputChange} onBlur={handleBlur} className={inputClass('email')} placeholder="seu@email.com" {...fieldProps('email')} />
        {error('email')}
      </div>
      <div className="col-span-1 md:col-span-2">
        <label htmlFor="trabalha_aviacao_civil" className={labelClass}>Trabalha na aviação civil? *</label>
        <select id="trabalha_aviacao_civil" name="trabalha_aviacao_civil" value={formData.trabalha_aviacao_civil} onChange={handleInputChange} onBlur={handleBlur} className={inputClass('trabalha_aviacao_civil')} {...fieldProps('trabalha_aviacao_civil')}>
          <option value="">Selecione...</option><option value="sim">Sim, trabalha</option><option value="nao">Não, não trabalha</option>
        </select>
        {error('trabalha_aviacao_civil')}
      </div>
      <div className="col-span-1 md:col-span-2">
        <label htmlFor="trabalha_seguranca_avsec" className={labelClass}>Trabalha com segurança Avsec? *</label>
        <select id="trabalha_seguranca_avsec" name="trabalha_seguranca_avsec" value={formData.trabalha_seguranca_avsec} onChange={handleInputChange} onBlur={handleBlur} className={inputClass('trabalha_seguranca_avsec')} {...fieldProps('trabalha_seguranca_avsec')}>
          <option value="">Selecione...</option><option value="sim">Sim, trabalha</option><option value="nao">Não, não trabalha</option>
        </select>
        {error('trabalha_seguranca_avsec')}
      </div>
    </div>
  );
}

export function AddressFields({ formData, handleInputChange, handleBlur, errors, touched }: any) {
  const inputClass = (name: string) => `w-full border ${touched[name] && errors[name] ? 'border-red-500' : 'border-gray-300 dark:border-slate-700'} rounded-lg p-2.5 bg-white dark:bg-slate-850 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#005f5f] outline-none`;
  const fields = [
    ['cep', 'CEP', '00000-000', 'col-span-1 md:col-span-4'],
    ['endereco', 'Endereço', 'Rua, Avenida, etc.', 'col-span-1 md:col-span-3'],
    ['numero', 'Número', 'Nº', ''],
    ['bairro', 'Bairro', 'Bairro', 'col-span-1 md:col-span-3'],
    ['cidade', 'Cidade', 'Cidade', 'col-span-1 md:col-span-2']
  ];
  return <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
    {fields.map(([name, label, placeholder, layout]) => <div key={name} className={layout}>
      <label htmlFor={name} className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">{label} *</label>
      <input id={name} type="text" name={name} value={formData[name]} onChange={handleInputChange} onBlur={handleBlur} className={inputClass(name)} placeholder={placeholder} aria-invalid={Boolean(touched[name] && errors[name])} aria-describedby={touched[name] && errors[name] ? `${name}-error` : undefined} />
      {touched[name] && errors[name] && <span id={`${name}-error`} className="text-red-500 text-xs mt-1 block">{errors[name]}</span>}
    </div>)}
    <div className="col-span-1 md:col-span-2">
      <label htmlFor="estado" className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Estado (UF) *</label>
      <select id="estado" name="estado" value={formData.estado} onChange={handleInputChange} onBlur={handleBlur} className={inputClass('estado')} aria-invalid={Boolean(touched.estado && errors.estado)} aria-describedby={touched.estado && errors.estado ? 'estado-error' : undefined}>
        <option value="">Selecione</option>
        {["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"].map(uf => <option key={uf} value={uf}>{uf}</option>)}
      </select>
      {touched.estado && errors.estado && <span id="estado-error" className="text-red-500 text-xs mt-1 block">{errors.estado}</span>}
    </div>
  </div>;
}
