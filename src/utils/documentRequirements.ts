/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type DocumentSelector = 'identidade_cpf' | 'identidade_sem_cpf' | 'cnh';

const commonDocumentTypes = [
  'Comprovante de Residência',
  'Certificado Ensino Médio',
  'Antecedentes Criminais - Justiça Federal',
  'Antecedentes Criminais - Justiça Estadual'
] as const;

export function getRequiredDocumentTypes(selector: string | undefined): string[] {
  const identityTypes = selector === 'identidade_sem_cpf'
    ? ['RG', 'CPF']
    : selector === 'cnh'
      ? ['CNH']
      : ['RG'];

  return [...identityTypes, ...commonDocumentTypes];
}

export function getDocumentSelectorLabel(selector: string | undefined) {
  if (selector === 'identidade_sem_cpf') return 'Identidade sem CPF';
  if (selector === 'cnh') return 'CNH';
  return 'Identidade com CPF';
}
