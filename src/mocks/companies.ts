/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Empresa } from '../types';

export const mockEmpresas: Empresa[] = [
  {
    id: 'empresa-1',
    nome_fantasia: 'GOL Linhas Aéreas',
    razao_social: 'VRG Linhas Aéreas S.A.',
    cnpj: '07.575.651/0001-59',
    hash_link_inscricao: 'gol-avsec-2026-xyz',
    token_registro_b2b: 'tk_gol',
    limite_vagas_corporativo: 20,
    status_ativo: true,
    email_corporativo: 'treinamento@voegol.com.br',
    website: 'https://www.voegol.com.br'
  },
  {
    id: 'empresa-2',
    nome_fantasia: 'LATAM Airlines',
    razao_social: 'TAM Linhas Aéreas S.A.',
    cnpj: '02.012.862/0001-60',
    hash_link_inscricao: 'latam-avsec-2026-abc',
    token_registro_b2b: 'tk_latam',
    limite_vagas_corporativo: 15,
    status_ativo: true,
    email_corporativo: 'capacitacao@latam.com',
    website: 'https://www.latamairlines.com'
  },
  {
    id: 'empresa-3',
    nome_fantasia: 'Azul Linhas Aéreas',
    razao_social: 'Azul Linhas Aéreas Brasileiras S.A.',
    cnpj: '09.296.295/0001-60',
    hash_link_inscricao: 'azul-avsec-2026-efg',
    token_registro_b2b: 'tk_azul',
    limite_vagas_corporativo: 25,
    status_ativo: true,
    email_corporativo: 'azulacademy@voeazul.com.br',
    website: 'https://www.voeazul.com.br'
  },
  {
    id: 'empresa-4',
    nome_fantasia: 'Prosegur Brasil',
    razao_social: 'Prosegur Brasil S.A. Transportadora de Valores e Segurança',
    cnpj: '17.227.185/0001-04',
    hash_link_inscricao: 'prosegur-avsec-2026-mno',
    token_registro_b2b: 'tk_prosegur',
    limite_vagas_corporativo: 30,
    status_ativo: true,
    email_corporativo: 'avsec@prosegur.com.br',
    website: 'https://www.prosegur.com.br'
  }
];
