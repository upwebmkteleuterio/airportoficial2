/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum UserRole {
  GESTOR = 'GESTOR',
  EQUIPE = 'EQUIPE',
  ALUNO = 'ALUNO',
  INSTRUTOR = 'INSTRUTOR',
  COORDENADOR = 'COORDENADOR'
}

export enum ClassTurno {
  MANHA = 'MANHÃ',
  TARDE = 'TARDE',
  NOITE = 'NOITE',
  MANHA_TARDE = 'MANHÃ/TARDE',
  TARDE_NOITE = 'TARDE/NOITE',
  MANHA_TARDE_NOITE = 'MANHÃ/TARDE E NOITE'
}

export enum ClassStatusPrazo {
  NO_PRAZO = 'No prazo',
  NOTA_LANCADA = 'Nota Lançada',
  ATRASADO = 'Atrasado',
  ENCERRADO = 'Encerrado'
}

export enum InstructorFuncao {
  INSTRUTOR_TUTOR = 'Instrutor_Tutor',
  APLICADOR_PROVA = 'Aplicador_de_Prova',
  ACOMPANHANTE_RECURSOS = 'Acompanhante_Recursos',
  CONVIDADO = 'Convidado'
}

export enum DocumentStatus {
  PENDENTE = 'Pendente',
  EM_ANALISE = 'Em Analise',
  APROVADO = 'Aprovado',
  RECUSADO = 'Recusado',
  SUBSTITUIDO = 'Substituído',
  ASSINADO = 'Assinado'
}

export enum DocumentTipo {
  RG = 'RG',
  CPF = 'CPF',
  ANTECEDENTES = 'Antecedentes Criminais',
  COMPROVANTE_RESIDENCIA = 'Comprovante de Residência',
  RECONHECIMENTO_ASSINATURA = 'Reconhecimento de Assinatura',
  OUTRO = 'Outro'
}

export interface Endereco {
  id: string;
  logradouro: string;
  cidade: string;
  estado: string;
  /** Indica se o endereço está disponível para novos cadastros. */
  ativo?: boolean;
  /** Data de criação retornada pelo banco. */
  created_at?: string;
}

// 1. Entidades de Usuários e Controle de Acesso
export interface Usuario {
  id: string;
  role: UserRole;
  nome_completo: string;
  cpf: string;
  email: string;
  telefone: string;
  termo_lgpd_aceite: boolean;
  data_aceite_lgpd: string | null;
  foto_url?: string;
  status?: "pendente" | "ativo" | "recusado";
  origem_cadastro?: 'interno' | 'b2b' | 'migracao';
  data_nascimento?: string;
  nome_mae?: string;
  nome_pai?: string;
  rg?: string;
  orgao_expedicao_rg?: string;
  grau_ensino?: string;
  cep?: string;
  endereco?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  trabalha_aviacao_civil?: string;
  trabalha_seguranca_avsec?: string;
  certificacao_avsec?: 'ISCR' | 'IOAD' | 'IOAR' | '';
  empresa_id?: string;
  tipo_documento_selecionado?: 'identidade_cpf' | 'identidade_sem_cpf' | 'cnh';
  turma_id_pendente?: string;
}

export interface Pessoa {
  id: string;
  nome: string;
  cpf?: string | null;
  ativo: boolean;
  visivel_diretorio: boolean;
  /** Papel usado para separar diretórios sem criar um perfil de login. */
  papel?: UserRole | null;
  profile_legacy_id?: string | null;
  created_at?: string;
}

export interface Empresa {
  id: string;
  nome_fantasia: string;
  cnpj: string;
  hash_link_inscricao: string;
  razao_social?: string;
  email_corporativo?: string;
  website?: string;
  token_registro_b2b: string;
  limite_vagas_corporativo: number;
  status_ativo: boolean;
  telefone?: string;
  endereco?: string;
  responsavel?: string;
  created_at?: string;
}

export interface Concessionaria {
  id: string;
  nome_concessionaria: string;
  emails_representantes: string;
  telefone_representantes: string;
}

// 2. Entidades Acadêmicas e Operacionais
export interface Curso {
  id: string;
  nome_curso: string;
  carga_horaria_total: number;
}

export interface Turma {
  id: string;
  id_interno_escola: number; // Substitui "TURMA / ID Principal"
  id_anac: string; // Ex: 79010
  curso_id: string;
  turno: ClassTurno;
  horario_aulas: string; // Ex: "(X) Manhã 08:00 às 11:50"
  data_inicio: string; // YYYY-MM-DD
  data_termino: string; // YYYY-MM-DD
  endereco_id?: string;
  endereco_realizacao: string; // Let's keep for retro-compatibility, or we can use endereco_id now. Let's use endereco_id.
  cidade: string;
  uf: string;
  concessionaria_visita_id?: string;
  qt_alunos_matriculados: number;
  horario_prova_1_chamada: string | null; // Ex: "13:30-15:00", "Sem prova" ou histórico sem valor
  horario_prova_2_chamada: string | null; // Ex: "17:00-18:30", "Sem prova" ou histórico sem valor
  data_prova_1_chamada?: string | null;
  data_prova_2_chamada?: string | null;
  vigilante_sem_deslocamento: boolean;
  anotacoes_turma: string;
  
  // Coordenadores/Gestor
  coordenador_ioad_id?: string;
  coordenador_iscr_id?: string;
  coordenador_icar_id?: string;
  aplicador_id?: string;
  gestor_turma_id?: string;


  // Campos operacionais
  status_prazo_notas?: ClassStatusPrazo;
  dias_para_vencimento?: number;
  status_operacional_sn: boolean; // S/N Vermelho/Verde do Excel
  status_turma: 'Ativa' | 'Cancelada';
  status_historico?: 'No prazo' | 'Cancelado' | 'Encerrado' | null;
  numero_vt?: number | null;
  carga_horaria?: number | null;
  software_utilizado?: string | null;
  data_lancamento_notas?: string | null;
  nota_lancada?: boolean;
  data_lancada_real?: string | null;
}

export interface TurmaInstrutor {
  id: string;
  turma_id: string;
  instrutor_id: string;
  funcao: InstructorFuncao;
}

export interface Matricula {
  id: string;
  codigo_re: number; // RE
  tuf?: string; // TUF
  anac_codigo?: string; // ANAC
  aluno_id: string;
  turma_id: string;
  empresa_b2b_id?: string;
  software_utilizado?: string; // Coluna "Softw"
  percentual_presenca: number; // Coluna "%"
  nota_1_chamada?: number; // Coluna "1ª CH"
  nota_2_chamada?: number; // Coluna "2ª CH"
  resultado_final?: number | null; // Média/nota numérica histórica da coluna "RESULTADO"
  status_resultado?: 'Aprovado' | 'Reprovado' | 'Falta' | string | null; // Resultado acadêmico textual
  status_resultado_final?: 'Aprovado' | 'Reprovado' | 'Falta' | string | null; // Resultado final textual
  status_matricula: 'Ativo' | 'Cancelado' | 'Concluido';
}

export interface DiarioClasse {
  id: string;
  matricula_id: string;
  data_aula: string; // YYYY-MM-DD
  horario_periodo: string; // Ex: "SEG 08:00 AS 11:50"
  presente: boolean;
}

// 3. Entidades de Segurança e GED
export interface Documento {
  id: string;
  /** Identidade canônica da pessoa; novos documentos devem usar este campo. */
  pessoa_id?: string | null;
  /** Legado: permanece para leitura e compatibilidade com documentos antigos. */
  usuario_id?: string | null;
  tipo_documento: string;
  url_armazenamento?: string;
  arquivo_nome: string;
  hash_sha256: string;
  status: DocumentStatus;
  origem_cadastro?: 'interno' | 'b2b' | 'migracao';
  metodo_verificacao?: 'manual' | 'ia' | 'nao_aplicavel';
  storage_area?: 'temporarios' | 'oficiais';
  grupo_documento_id?: string;
  versao?: number;
  substitui_documento_id?: string;
  esta_atual?: boolean;
  observacoes_revisor?: string;
  metadados_ia?: {
    detectou_fraude?: boolean;
    ocr_nome_correto?: boolean;
    ocr_cpf_correto?: boolean;
    motivo_rejeicao?: string;
    extraido_nome?: string;
    extraido_cpf?: string;
  };
  data_criacao: string;
}

export interface AuditoriaLog {
  id: string;
  usuario_id: string;
  acao: string;
  tabela_afetada: string;
  registro_id: string;
  ip_address?: string | null;
  data_hora: string;
  hash_sha256: string;
  /** Usuário-alvo do evento (aluno/instrutor/coordenador acessado). */
  alvo_id?: string | null;
  documento_id?: string | null;
  documento_tipo?: string | null;
  documento_hash?: string | null;
  versao?: number | null;
  /** Autorização temporária vinculada ao acesso documental. */
  autorizacao_id?: string | null;
}

export interface AuditoriaPerfilResumo {
  legacy_id: string;
  nome_completo: string;
  role: string;
  email?: string | null;
}

export interface AuditoriaDocumentoResumo {
  id: string;
  arquivo_nome: string;
  tipo_documento: string;
  versao: number;
}

export interface AuditoriaLogView extends AuditoriaLog {
  operador?: AuditoriaPerfilResumo | null;
  alvo?: AuditoriaPerfilResumo | null;
  documento?: AuditoriaDocumentoResumo | null;
}
