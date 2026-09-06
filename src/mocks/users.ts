/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Usuario, UserRole } from '../types';

export const mockUsuarios: Usuario[] = [
  {
    id: 'user-admin-1',
    role: UserRole.GESTOR,
    nome_completo: 'Marcelo Ribeiro',
    cpf: '000.111.222-33',
    email: 'admin@aeroged.com.br',
    telefone: '(11) 98765-4321',
    termo_lgpd_aceite: true,
    data_aceite_lgpd: '2026-01-10T14:30:00Z',
    foto_url: 'https://i.postimg.cc/151DL7VS/marcelo-fotoavatar.png'
  },
  {
    id: 'user-coord-ioad',
    role: UserRole.COORDENADOR,
    nome_completo: 'Carlos Mendes Coord',
    cpf: '888.777.666-55',
    email: 'carlos.mendes@aeroged.com.br',
    telefone: '(11) 97777-1111',
    termo_lgpd_aceite: true,
    data_aceite_lgpd: '2026-02-12T09:15:00Z'
  },
  {
    id: 'user-coord-iscr',
    role: UserRole.COORDENADOR,
    nome_completo: 'Ana Paula Santos',
    cpf: '777.666.555-44',
    email: 'ana.paula@aeroged.com.br',
    telefone: '(11) 96666-2222',
    termo_lgpd_aceite: true,
    data_aceite_lgpd: '2026-03-01T10:00:00Z'
  },
  {
    id: 'user-instrutor-1',
    role: UserRole.INSTRUTOR,
    nome_completo: 'Cmdt. Roberto Silva',
    cpf: '444.555.666-77',
    email: 'roberto.silva@aeroged.com.br',
    telefone: '(11) 95555-3333',
    termo_lgpd_aceite: true,
    data_aceite_lgpd: '2026-03-10T11:20:00Z'
  },
  {
    id: 'user-instrutor-2',
    role: UserRole.INSTRUTOR,
    nome_completo: 'Inst. Roberta Lima',
    cpf: '555.666.777-88',
    email: 'roberta.lima@aeroged.com.br',
    telefone: '(11) 94444-4444',
    termo_lgpd_aceite: true,
    data_aceite_lgpd: '2026-03-15T15:45:00Z'
  },
  {
    id: 'user-instrutor-3',
    role: UserRole.INSTRUTOR,
    nome_completo: 'Fernando Torres',
    cpf: '666.777.888-99',
    email: 'fernando.torres@aeroged.com.br',
    telefone: '(11) 93333-5555',
    termo_lgpd_aceite: true,
    data_aceite_lgpd: '2026-04-01T08:30:00Z'
  },
  {
    id: 'user-instrutor-4',
    role: UserRole.INSTRUTOR,
    nome_completo: 'Manoel Peixoto',
    cpf: '777.888.999-00',
    email: 'manoel.peixoto@aeroged.com.br',
    telefone: '(11) 92222-6666',
    termo_lgpd_aceite: true,
    data_aceite_lgpd: '2026-04-05T16:10:00Z'
  },
  // Alunos (Alunos para turmas)
  {
    id: 'aluno-1',
    role: UserRole.ALUNO,
    nome_completo: 'Rodrigo Alves',
    cpf: '123.456.789-10',
    email: 'rodrigo.alves@hotmail.com',
    telefone: '(11) 91111-2222',
    termo_lgpd_aceite: true,
    data_aceite_lgpd: '2026-05-10T14:00:00Z'
  },
  {
    id: 'aluno-2',
    empresa_id: 'empresa-1',
    role: UserRole.ALUNO,
    nome_completo: 'Juliana Silva',
    cpf: '234.567.890-12',
    email: 'juliana.silva@gmail.com',
    telefone: '(11) 92222-3333',
    termo_lgpd_aceite: false,
    data_aceite_lgpd: null
  },
  {
    id: 'aluno-3',
    empresa_id: 'empresa-1',
    role: UserRole.ALUNO,
    nome_completo: 'Insp. Lucas Santos',
    cpf: '345.678.901-23',
    email: 'lucas.santos@concessionaria.com',
    telefone: '(21) 93333-4444',
    termo_lgpd_aceite: true,
    data_aceite_lgpd: '2026-06-01T09:30:00Z'
  },
  {
    id: 'aluno-4',
    empresa_id: 'empresa-2',
    role: UserRole.ALUNO,
    nome_completo: 'Aline Lima',
    cpf: '456.789.012-34',
    email: 'aline.lima@gmail.com',
    telefone: '(11) 94444-5555',
    termo_lgpd_aceite: true,
    data_aceite_lgpd: '2026-06-15T10:00:00Z'
  },
  {
    id: 'aluno-5',
    empresa_id: 'empresa-2',
    role: UserRole.ALUNO,
    nome_completo: 'Bruno Oliveira',
    cpf: '567.890.123-45',
    email: 'bruno.oliveira@outlook.com',
    telefone: '(11) 95555-6666',
    termo_lgpd_aceite: false,
    data_aceite_lgpd: null
  },
  {
    id: 'aluno-joao',
    role: UserRole.ALUNO,
    nome_completo: 'João Silva Ribeiro',
    cpf: '111.222.333-44',
    email: 'joao.silva@outlook.com',
    telefone: '(11) 98888-1111',
    termo_lgpd_aceite: true,
    data_aceite_lgpd: '2026-05-10T14:00:00Z'
  },
  {
    id: 'aluno-maria',
    role: UserRole.ALUNO,
    nome_completo: 'Maria Oliveira Santos',
    cpf: '222.333.444-55',
    email: 'maria.oliveira@gmail.com',
    telefone: '(11) 98888-2222',
    termo_lgpd_aceite: true,
    data_aceite_lgpd: '2026-05-10T14:00:00Z'
  },
  {
    id: 'aluno-carlos-m',
    role: UserRole.ALUNO,
    nome_completo: 'Carlos Mendes',
    cpf: '333.444.555-66',
    email: 'carlos.mendes.aluno@gmail.com',
    telefone: '(11) 98888-3333',
    termo_lgpd_aceite: true,
    data_aceite_lgpd: '2026-05-10T14:00:00Z'
  }
];
