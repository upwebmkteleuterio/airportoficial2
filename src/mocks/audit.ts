/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AuditoriaLog } from '../types';

export const mockAuditoriaLogs: AuditoriaLog[] = [
  {
    id: 'log-1',
    usuario_id: 'user-admin-1', // Marcelo Ribeiro
    acao: 'Aprovou Documento RG de Rodrigo Alves (Aprovado)',
    tabela_afetada: 'ged_documentos',
    registro_id: 'doc-1',
    ip_address: '189.120.45.67',
    data_hora: '2026-05-11T10:30:22Z',
    hash_sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
  },
  {
    id: 'log-2',
    usuario_id: 'user-admin-1',
    acao: 'Lançou notas da turma ANC-2023-881',
    tabela_afetada: 'matriculas',
    registro_id: 'turma-881',
    ip_address: '189.120.45.67',
    data_hora: '2026-05-15T16:00:45Z',
    hash_sha256: '8b7f81ef6a7f805a8d42d3d0408ca4ff184e9ff1360098dfc5c56d11f77d3f82'
  },
  {
    id: 'log-3',
    usuario_id: 'aluno-1', // Rodrigo Alves
    acao: 'Aceitou Termo de Consentimento LGPD',
    tabela_afetada: 'users',
    registro_id: 'aluno-1',
    ip_address: '177.89.201.12',
    data_hora: '2026-05-10T14:00:00Z',
    hash_sha256: '4fc1518f9df0d8a9f4fb89a94154fa91572d42d3710b7b1ca29828dc0155b9e0'
  },
  {
    id: 'log-4',
    usuario_id: 'user-admin-1',
    acao: 'Criou Nova Turma ID ANC-2023-882 (Formação RX11)',
    tabela_afetada: 'turmas',
    registro_id: 'turma-882',
    ip_address: '189.120.45.67',
    data_hora: '2026-05-20T09:12:10Z',
    hash_sha256: '9bc3e6e88dbdbde19ff4514fa14972f3d53e99092425027bc95995f5173d12aa'
  },
  {
    id: 'log-5',
    usuario_id: 'user-admin-1',
    acao: 'Rejeitou Documento CPF de Bruno Oliveira devido a ilegibilidade',
    tabela_afetada: 'ged_documentos',
    registro_id: 'doc-5',
    ip_address: '189.120.45.67',
    data_hora: '2026-06-21T09:45:00Z',
    hash_sha256: '0f1d5e6a8b7c89d20ff4531fa14972e3d53e99082425027bc95995f5173c12bb'
  }
];
