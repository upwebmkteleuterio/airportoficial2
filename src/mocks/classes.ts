/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Turma, Matricula, DiarioClasse, ClassTurno, ClassStatusPrazo } from '../types';

export const mockTurmas: Turma[] = [
  {
    id: 'turma-881',
    id_interno_escola: 442, // T-OP-442
    id_anac: 'TRM-2023-A',
    curso_id: 'curso-1', // Curso de Atualização AVSEC
    turno: ClassTurno.NOITE,
    horario_aulas: '19:00 - 22:30',
    data_inicio: '2023-10-12',
    data_termino: '2023-10-15',
    endereco_realizacao: 'Sala 3B - VCP',
    cidade: 'Campinas',
    uf: 'SP',
    qt_alunos_matriculados: 2,
    horario_prova_1_chamada: '19:30-21:00',
    horario_prova_2_chamada: '21:30-23:00',
    vigilante_sem_deslocamento: false,
    anotacoes_turma: 'Turma de atualização de operadores realizada na base de VCP de forma presencial.',
    coordenador_ioad_id: 'user-coord-ioad', // Carlos Mendes
    coordenador_iscr_id: 'user-coord-iscr', // Ana Paula Santos
    gestor_turma_id: 'user-admin-1', // Marcelo Ribeiro
    status_prazo_notas: ClassStatusPrazo.NOTA_LANCADA,
    dias_para_vencimento: 0,
    status_operacional_sn: true, // S (Sim, Verde)
    status_turma: 'Ativa',
    carga_horaria: 16,
    software_utilizado: 'ViteOS'
  },
  {
    id: 'turma-882',
    id_interno_escola: 119, // T-RX-119
    id_anac: 'ANC-2023-882',
    curso_id: 'curso-2', // Formação RX11
    turno: ClassTurno.MANHA_TARDE, // Integral
    horario_aulas: '08:00 - 17:00',
    data_inicio: '2023-10-14',
    data_termino: '2023-10-18',
    endereco_realizacao: 'Lab RX - GRU',
    cidade: 'Guarulhos',
    uf: 'SP',
    qt_alunos_matriculados: 2,
    horario_prova_1_chamada: '09:00-11:00',
    horario_prova_2_chamada: '14:00-16:00',
    vigilante_sem_deslocamento: false,
    anotacoes_turma: 'Equipamentos de raio-X do laboratório calibrados e prontos para treinamento prático.',
    coordenador_ioad_id: 'user-coord-ioad', // Carlos Mendes
    coordenador_iscr_id: 'user-coord-iscr',
    gestor_turma_id: 'user-admin-1',
    status_prazo_notas: ClassStatusPrazo.NO_PRAZO,
    dias_para_vencimento: 2,
    status_operacional_sn: false, // N (Não, Vermelho)
    status_turma: 'Ativa',
    carga_horaria: 40,
    software_utilizado: 'RayScan'
  },
  {
    id: 'turma-885',
    id_interno_escola: 42, // T-AE-042
    id_anac: 'ANC-2023-885',
    curso_id: 'curso-3', // Segurança Aéreo
    turno: ClassTurno.MANHA, // Matutino
    horario_aulas: '09:00 - 13:00',
    data_inicio: '2023-10-05',
    data_termino: '2023-10-08',
    endereco_realizacao: 'Auditório CGH',
    cidade: 'São Paulo',
    uf: 'SP',
    qt_alunos_matriculados: 2,
    horario_prova_1_chamada: '10:00-11:30',
    horario_prova_2_chamada: 'Sem prova',
    vigilante_sem_deslocamento: true,
    anotacoes_turma: 'Turma de vigilantes in-company sem deslocamento.',
    coordenador_ioad_id: 'user-coord-ioad',
    coordenador_iscr_id: 'user-coord-iscr',
    gestor_turma_id: 'user-admin-1',
    status_prazo_notas: ClassStatusPrazo.ATRASADO,
    dias_para_vencimento: -3,
    status_operacional_sn: false, // N (Não, Vermelho)
    status_turma: 'Ativa',
    carga_horaria: 16,
    software_utilizado: 'SecurePass'
  }
];

// Mapeamento de quais instrutores estão em quais turmas
export interface MockTurmaInstrutorRel {
  id: string;
  turma_id: string;
  instrutor_id: string;
  funcao: string;
}

export const mockTurmasInstrutores: MockTurmaInstrutorRel[] = [
  { id: 'rel-1', turma_id: 'turma-881', instrutor_id: 'user-coord-ioad', funcao: 'Instrutor_Tutor' },
  { id: 'rel-2', turma_id: 'turma-881', instrutor_id: 'aluno-1', funcao: 'Aplicador_de_Prova' }, // R. Alves
  { id: 'rel-3', turma_id: 'turma-882', instrutor_id: 'user-instrutor-3', funcao: 'Instrutor_Tutor' }, // Fernando Torres (F. Torres)
  { id: 'rel-4', turma_id: 'turma-882', instrutor_id: 'aluno-3', funcao: 'Convidado' }, // Insp. Santos
  { id: 'rel-5', turma_id: 'turma-882', instrutor_id: 'aluno-5', funcao: 'Aplicador_de_Prova' }, // L. Silva
  { id: 'rel-6', turma_id: 'turma-885', instrutor_id: 'user-instrutor-4', funcao: 'Instrutor_Tutor' }, // Manoel Peixoto (M. Peixoto)
  { id: 'rel-7', turma_id: 'turma-885', instrutor_id: 'aluno-4', funcao: 'Aplicador_de_Prova' } // A. Lima
];

export const mockMatriculas: Matricula[] = [
  // Alunos ANC-2023-881 (T-OP-442)
  {
    id: 'mat-1',
    codigo_re: 78901,
    tuf: 'TUF-A',
    anac_codigo: '123456',
    aluno_id: 'aluno-joao', // João Silva Ribeiro
    turma_id: 'turma-881',
    empresa_b2b_id: 'empresa-1', // GOL
    software_utilizado: 'ViteOS',
    percentual_presenca: 100,
    nota_1_chamada: 10.0,
    nota_2_chamada: 10.0,
    resultado_final: 10.0,
    status_resultado_final: 'Aprovado',
    status_matricula: 'Concluido'
  },
  {
    id: 'mat-2',
    codigo_re: 78902,
    tuf: 'TUF-B',
    anac_codigo: '123457',
    aluno_id: 'aluno-maria', // Maria Oliveira Santos
    turma_id: 'turma-881',
    empresa_b2b_id: 'empresa-2', // LATAM
    software_utilizado: 'AeroFS',
    percentual_presenca: 85,
    nota_1_chamada: 8.5,
    nota_2_chamada: undefined,
    resultado_final: undefined,
    status_resultado_final: 'Pendente',
    status_matricula: 'Ativo'
  },
  {
    id: 'mat-6',
    codigo_re: 78903,
    tuf: 'TUF-A',
    anac_codigo: '123458',
    aluno_id: 'aluno-carlos-m', // Carlos Mendes
    turma_id: 'turma-881',
    empresa_b2b_id: 'empresa-3', // Azul
    software_utilizado: 'AeroFS',
    percentual_presenca: 40,
    nota_1_chamada: 4.0,
    nota_2_chamada: undefined,
    resultado_final: 4.0,
    status_resultado_final: 'Reprovado',
    status_matricula: 'Ativo'
  },

  // Alunos ANC-2023-882 (T-RX-119)
  {
    id: 'mat-3',
    codigo_re: 2001,
    aluno_id: 'aluno-3', // Insp. Lucas Santos
    turma_id: 'turma-882',
    empresa_b2b_id: 'empresa-3', // Azul
    software_utilizado: 'RayScan',
    percentual_presenca: 100,
    status_matricula: 'Ativo'
  },
  {
    id: 'mat-4',
    codigo_re: 2002,
    aluno_id: 'aluno-4', // Aline Lima
    turma_id: 'turma-882',
    empresa_b2b_id: 'empresa-4', // Prosegur
    software_utilizado: 'RayScan',
    percentual_presenca: 90,
    status_matricula: 'Ativo'
  },

  // Alunos ANC-2023-885 (T-AE-042)
  {
    id: 'mat-5',
    codigo_re: 3001,
    aluno_id: 'aluno-5', // Bruno Oliveira
    turma_id: 'turma-885',
    empresa_b2b_id: 'empresa-4', // Prosegur
    software_utilizado: 'SecurePass',
    percentual_presenca: 75,
    nota_1_chamada: 5.0,
    nota_2_chamada: 4.5,
    resultado_final: 4.5,
    status_resultado_final: 'Reprovado',
    status_matricula: 'Concluido'
  }
,
  {
    id: 'mat-10',
    codigo_re: 78910,
    tuf: 'TUF-C',
    anac_codigo: '123490',
    aluno_id: 'aluno-1',
    turma_id: 'turma-881',
    empresa_b2b_id: 'empresa-1',
    software_utilizado: 'ViteOS',
    percentual_presenca: 100,
    nota_1_chamada: 9.0,
    status_resultado_final: 'Aprovado',
    status_matricula: 'Concluido'
  },
  {
    id: 'mat-11',
    codigo_re: 78911,
    aluno_id: 'aluno-1',
    turma_id: 'turma-882',
    empresa_b2b_id: 'empresa-1',
    percentual_presenca: 90,
    status_matricula: 'Ativo'
  },
  {
    id: 'mat-12',
    codigo_re: 78912,
    aluno_id: 'aluno-2',
    turma_id: 'turma-881',
    empresa_b2b_id: 'empresa-2',
    percentual_presenca: 80,
    status_matricula: 'Ativo'
  }
];

// Criação de diários de classe de exemplo (Frequências)
export const mockDiarioClasse: DiarioClasse[] = [
  // Presenças para Rodrigo Alves na turma-881 (4 dias de aula)
  { id: 'freq-1', matricula_id: 'mat-1', data_aula: '2023-10-12', horario_periodo: 'NOT 19:00 AS 22:30', presente: true },
  { id: 'freq-2', matricula_id: 'mat-1', data_aula: '2023-10-13', horario_periodo: 'NOT 19:00 AS 22:30', presente: true },
  { id: 'freq-3', matricula_id: 'mat-1', data_aula: '2023-10-14', horario_periodo: 'NOT 19:00 AS 22:30', presente: true },
  { id: 'freq-4', matricula_id: 'mat-1', data_aula: '2023-10-15', horario_periodo: 'NOT 19:00 AS 22:30', presente: true },

  // Presenças para Juliana Silva na turma-881 (4 dias, faltou 1)
  { id: 'freq-5', matricula_id: 'mat-2', data_aula: '2023-10-12', horario_periodo: 'NOT 19:00 AS 22:30', presente: true },
  { id: 'freq-6', matricula_id: 'mat-2', data_aula: '2023-10-13', horario_periodo: 'NOT 19:00 AS 22:30', presente: false },
  { id: 'freq-7', matricula_id: 'mat-2', data_aula: '2023-10-14', horario_periodo: 'NOT 19:00 AS 22:30', presente: true },
  { id: 'freq-8', matricula_id: 'mat-2', data_aula: '2023-10-15', horario_periodo: 'NOT 19:00 AS 22:30', presente: true },

  // Presenças para Insp. Lucas Santos na turma-882 (5 dias, 100%)
  { id: 'freq-9', matricula_id: 'mat-3', data_aula: '2023-10-14', horario_periodo: 'INT 08:00 AS 17:00', presente: true },
  { id: 'freq-10', matricula_id: 'mat-3', data_aula: '2023-10-15', horario_periodo: 'INT 08:00 AS 17:00', presente: true },
  { id: 'freq-11', matricula_id: 'mat-3', data_aula: '2023-10-16', horario_periodo: 'INT 08:00 AS 17:00', presente: true },
  { id: 'freq-12', matricula_id: 'mat-3', data_aula: '2023-10-17', horario_periodo: 'INT 08:00 AS 17:00', presente: true },
  { id: 'freq-13', matricula_id: 'mat-3', data_aula: '2023-10-18', horario_periodo: 'INT 08:00 AS 17:00', presente: true },

  // Presenças para Aline Lima na turma-882 (5 dias, 80%)
  { id: 'freq-14', matricula_id: 'mat-4', data_aula: '2023-10-14', horario_periodo: 'INT 08:00 AS 17:00', presente: true },
  { id: 'freq-15', matricula_id: 'mat-4', data_aula: '2023-10-15', horario_periodo: 'INT 08:00 AS 17:00', presente: true },
  { id: 'freq-16', matricula_id: 'mat-4', data_aula: '2023-10-16', horario_periodo: 'INT 08:00 AS 17:00', presente: false },
  { id: 'freq-17', matricula_id: 'mat-4', data_aula: '2023-10-17', horario_periodo: 'INT 08:00 AS 17:00', presente: true },
  { id: 'freq-18', matricula_id: 'mat-4', data_aula: '2023-10-18', horario_periodo: 'INT 08:00 AS 17:00', presente: true }
];
