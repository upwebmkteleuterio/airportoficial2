/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Documento, DocumentTipo, DocumentStatus } from '../types';

export const mockDocumentos: Documento[] = [
  {
    id: 'doc-1',
    usuario_id: 'aluno-1', // Rodrigo Alves
    tipo_documento: DocumentTipo.RG,
    url_armazenamento: '/storage/docs/rodrigo_alves_rg.pdf',
    arquivo_nome: 'rodrigo_alves_rg.pdf',
    hash_sha256: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2',
    status: DocumentStatus.APROVADO,
    metadados_ia: {
      detectou_fraude: false,
      ocr_nome_correto: true,
      ocr_cpf_correto: true,
      extraido_nome: 'RODRIGO ALVES',
      extraido_cpf: '123.456.789-10'
    },
    data_criacao: '2026-05-10T14:15:00Z'
  },
  {
    id: 'doc-2',
    usuario_id: 'aluno-1',
    tipo_documento: DocumentTipo.ANTECEDENTES,
    url_armazenamento: '/storage/docs/rodrigo_alves_criminais.pdf',
    arquivo_nome: 'rodrigo_alves_criminais.pdf',
    hash_sha256: '9b8c7d6e5f4g3h2i1j0k9l8m7n6o5p4q3r2s1t0u9v8w7x6y5z4a3b2c1d0e9f8g',
    status: DocumentStatus.APROVADO,
    metadados_ia: {
      detectou_fraude: false,
      ocr_nome_correto: true,
      extraido_nome: 'RODRIGO ALVES'
    },
    data_criacao: '2026-05-10T14:20:00Z'
  },
  {
    id: 'doc-3',
    usuario_id: 'aluno-3', // Insp. Lucas Santos
    tipo_documento: DocumentTipo.RG,
    url_armazenamento: '/storage/docs/lucas_santos_rg.pdf',
    arquivo_nome: 'lucas_santos_rg.pdf',
    hash_sha256: '3f4g5h6i7j8k9l0m1n2o3p4q5r6s7t8u9v0w1x2y3z4a5b6c7d8e9f0g1h2i3j4k',
    status: DocumentStatus.EM_ANALISE,
    metadados_ia: {
      detectou_fraude: false,
      ocr_nome_correto: true,
      ocr_cpf_correto: true,
      extraido_nome: 'LUCAS SANTOS',
      extraido_cpf: '345.678.901-23'
    },
    data_criacao: '2026-06-01T09:40:00Z'
  },
  {
    id: 'doc-4',
    usuario_id: 'aluno-4', // Aline Lima
    tipo_documento: DocumentTipo.COMPROVANTE_RESIDENCIA,
    url_armazenamento: '/storage/docs/aline_lima_residencia.pdf',
    arquivo_nome: 'aline_lima_residencia.pdf',
    hash_sha256: '0z9y8x7w6v5u4t3s2r1q0p9o8n7m6l5k4j3i2h1g0f9e8d7c6b5a4z3y2x1w0v9u',
    status: DocumentStatus.PENDENTE,
    data_criacao: '2026-06-15T10:15:00Z'
  },
  {
    id: 'doc-5',
    usuario_id: 'aluno-5', // Bruno Oliveira
    tipo_documento: DocumentTipo.CPF,
    url_armazenamento: '/storage/docs/bruno_oliveira_cpf.pdf',
    arquivo_nome: 'bruno_oliveira_cpf.pdf',
    hash_sha256: 'f5e4d3c2b1a0z9y8x7w6v5u4t3s2r1q0p9o8n7m6l5k4j3i2h1g0f9e8d7c6b5a4',
    status: DocumentStatus.RECUSADO,
    metadados_ia: {
      detectou_fraude: false,
      ocr_nome_correto: false,
      ocr_cpf_correto: false,
      motivo_rejeicao: 'O documento enviado está com rasuras e não foi possível ler o CPF legível.',
      extraido_nome: 'BRUNO O.',
      extraido_cpf: '---.---.---.--'
    },
    data_criacao: '2026-06-20T11:00:00Z'
  },
  // Documentos de João Silva Ribeiro
  {
    id: 'doc-joao-rg',
    usuario_id: 'aluno-joao',
    tipo_documento: DocumentTipo.RG,
    url_armazenamento: '/storage/docs/joao_silva_rg.pdf',
    arquivo_nome: 'joao_silva_rg.pdf',
    hash_sha256: '8f7g6h5i4j3k2l1m0n9o8p7q6r5s4t3u2v1w0x9y8z7a6b5c4d3e2f1g0h1i2j3k',
    status: DocumentStatus.APROVADO,
    metadados_ia: {
      detectou_fraude: false,
      ocr_nome_correto: true,
      ocr_cpf_correto: true,
      extraido_nome: 'JOAO SILVA RIBEIRO',
      extraido_cpf: '111.222.333-44'
    },
    data_criacao: '2026-05-10T14:10:00Z'
  },
  {
    id: 'doc-joao-criminais',
    usuario_id: 'aluno-joao',
    tipo_documento: DocumentTipo.ANTECEDENTES,
    url_armazenamento: '/storage/docs/joao_silva_criminais.pdf',
    arquivo_nome: 'joao_silva_criminais.pdf',
    hash_sha256: '7g6h5i4j3k2l1m0n9o8p7q6r5s4t3u2v1w0x9y8z7a6b5c4d3e2f1g0h1i2j3k4l',
    status: DocumentStatus.APROVADO,
    metadados_ia: {
      detectou_fraude: false,
      ocr_nome_correto: true,
      extraido_nome: 'JOAO SILVA RIBEIRO'
    },
    data_criacao: '2026-05-10T14:15:00Z'
  },
  {
    id: 'doc-joao-residencia',
    usuario_id: 'aluno-joao',
    tipo_documento: DocumentTipo.COMPROVANTE_RESIDENCIA,
    url_armazenamento: '/storage/docs/joao_silva_residencia.pdf',
    arquivo_nome: 'joao_silva_residencia.pdf',
    hash_sha256: '6h5i4j3k2l1m0n9o8p7q6r5s4t3u2v1w0x9y8z7a6b5c4d3e2f1g0h1i2j3k4l5m',
    status: DocumentStatus.APROVADO,
    metadados_ia: {
      detectou_fraude: false,
      ocr_nome_correto: true,
      extraido_nome: 'JOAO SILVA RIBEIRO'
    },
    data_criacao: '2026-05-10T14:20:00Z'
  },
  // Documentos de Maria Oliveira Santos
  {
    id: 'doc-maria-rg',
    usuario_id: 'aluno-maria',
    tipo_documento: DocumentTipo.RG,
    url_armazenamento: '/storage/docs/maria_santos_rg.pdf',
    arquivo_nome: 'maria_santos_rg.pdf',
    hash_sha256: '5i4j3k2l1m0n9o8p7q6r5s4t3u2v1w0x9y8z7a6b5c4d3e2f1g0h1i2j3k4l5m6n',
    status: DocumentStatus.APROVADO,
    metadados_ia: {
      detectou_fraude: false,
      ocr_nome_correto: true,
      ocr_cpf_correto: true,
      extraido_nome: 'MARIA OLIVEIRA SANTOS',
      extraido_cpf: '222.333.444-55'
    },
    data_criacao: '2026-05-10T14:12:00Z'
  },
  {
    id: 'doc-maria-criminais',
    usuario_id: 'aluno-maria',
    tipo_documento: DocumentTipo.ANTECEDENTES,
    url_armazenamento: '/storage/docs/maria_santos_criminais.pdf',
    arquivo_nome: 'maria_santos_criminais.pdf',
    hash_sha256: '4j3k2l1m0n9o8p7q6r5s4t3u2v1w0x9y8z7a6b5c4d3e2f1g0h1i2j3k4l5m6n7o',
    status: DocumentStatus.APROVADO,
    metadados_ia: {
      detectou_fraude: false,
      ocr_nome_correto: true,
      extraido_nome: 'MARIA OLIVEIRA SANTOS'
    },
    data_criacao: '2026-05-10T14:14:00Z'
  },
  {
    id: 'doc-maria-residencia',
    usuario_id: 'aluno-maria',
    tipo_documento: DocumentTipo.COMPROVANTE_RESIDENCIA,
    url_armazenamento: undefined,
    arquivo_nome: '',
    hash_sha256: '',
    status: DocumentStatus.PENDENTE,
    data_criacao: '2026-05-10T14:16:00Z'
  }
];
