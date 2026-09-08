import { supabase } from '../integrations/supabase/client';
import { DocumentStatus, Documento, Usuario } from '../types';
import { auditService } from './auditService';
import { classService } from './classService';
import { documentService } from './documentService';
import { userService } from './userService';
import { getRequiredDocumentTypes } from '../utils/documentRequirements';

function currentDocuments(documents: Documento[]) {
  const byType = new Map<string, Documento>();
  [...documents]
    .filter((document) => document.esta_atual !== false && document.status !== DocumentStatus.SUBSTITUIDO)
    .sort((a, b) => (b.versao ?? 1) - (a.versao ?? 1))
    .forEach((document) => {
      if (!byType.has(document.tipo_documento)) byType.set(document.tipo_documento, document);
    });
  return byType;
}

function missingDocuments(profile: Usuario, documents: Documento[]) {
  const current = currentDocuments(documents);
  return getRequiredDocumentTypes(profile.tipo_documento_selecionado)
    .filter((type) => !current.has(type) || current.get(type)?.status === DocumentStatus.RECUSADO);
}

async function getReviewerId() {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error('Sessão do revisor não encontrada.');

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('legacy_id')
    .eq('id', userData.user.id)
    .single();
  if (profileError || !profile?.legacy_id) throw new Error('Perfil do revisor não encontrado.');
  return profile.legacy_id as string;
}

async function registerAudit(reviewerId: string, action: string, userId: string, document?: Documento, reason?: string) {
  await auditService.create({
    usuario_id: reviewerId,
    acao: action,
    tabela_afetada: document ? 'documentos' : 'profiles',
    registro_id: userId,
    ip_address: null,
    documento_id: document?.id,
    documento_tipo: document?.tipo_documento,
    documento_hash: document?.hash_sha256,
    motivo: reason,
    versao: document?.versao
  });
}

const replacementLocks = new Set<string>();

export const approvalService = {
  getCurrentReviewerId: getReviewerId,

  getMissingDocuments: (profile: Usuario, documents: Documento[]) => missingDocuments(profile, documents),

  replaceDocument: async (profile: Usuario, source: Documento, file: File) => {
    if (replacementLocks.has(source.id)) throw new Error('Já existe uma substituição em andamento para este documento.');
    replacementLocks.add(source.id);
    try {
      if (profile.status !== 'pendente') throw new Error('Este cadastro não está disponível para substituição.');
      const replacement = await documentService.createReplacement(source, file);
      await userService.update(profile.id, { status: 'pendente' });
      const reviewerId = await getReviewerId();
      await registerAudit(
        reviewerId,
        `Enviou substituto para ${source.arquivo_nome}`,
        profile.id,
        replacement,
        `Substitui o documento ${source.id}`
      );
      return replacement;
    } finally {
      replacementLocks.delete(source.id);
    }
  },

  approveDocument: async (profile: Usuario, document: Documento, notes: string) => {
    if (profile.status !== 'pendente') throw new Error('Este cadastro não está pendente de aprovação.');
    if (document.esta_atual === false || document.status === DocumentStatus.SUBSTITUIDO || document.status === DocumentStatus.RECUSADO) {
      throw new Error('Somente um documento atual pendente pode ser analisado.');
    }
    const reviewerId = await getReviewerId();
    const approved = document.storage_area === 'temporarios'
      ? await documentService.promoteToOfficial(document)
      : await documentService.update(document.id, {
        status: DocumentStatus.APROVADO,
        observacoes_revisor: notes.trim() || undefined
      });
    if (document.storage_area === 'temporarios' && notes.trim()) {
      await documentService.update(approved.id, { observacoes_revisor: notes.trim() });
    }
    await registerAudit(reviewerId, `Aprovou o documento ${document.arquivo_nome}`, profile.id, approved, notes.trim() || undefined);
    return approved;
  },

  rejectDocument: async (profile: Usuario, document: Documento, reason: string) => {
    const normalizedReason = reason.trim();
    if (!normalizedReason) throw new Error('Informe o motivo da recusa.');
    if (profile.status !== 'pendente') throw new Error('Este cadastro não está pendente de aprovação.');
    if (document.esta_atual !== true || document.status !== DocumentStatus.PENDENTE) {
      throw new Error('Somente o documento atual pendente pode ser recusado.');
    }
    const reviewerId = await getReviewerId();
    const rejected = await documentService.update(document.id, {
      status: DocumentStatus.RECUSADO,
      observacoes_revisor: normalizedReason
    });
    await registerAudit(reviewerId, `Recusou o documento ${document.arquivo_nome}`, profile.id, rejected, normalizedReason);
    return rejected;
  },

  finalizeApproval: async (profile: Usuario, documents: Documento[]) => {
    if (profile.status !== 'pendente') throw new Error('Este cadastro não está pendente de aprovação.');
    const missing = missingDocuments(profile, documents);
    if (missing.length > 0) throw new Error(`Não é possível concluir. Documentos faltantes ou não aprovados: ${missing.join(', ')}.`);
    const current = currentDocuments(documents);
    const required = getRequiredDocumentTypes(profile.tipo_documento_selecionado);
    const notApproved = required.filter((type) => current.get(type)?.status !== DocumentStatus.APROVADO);
    if (notApproved.length > 0) throw new Error(`Aprove todos os documentos antes de ativar: ${notApproved.join(', ')}.`);

    await userService.update(profile.id, { status: 'ativo' });
    if (profile.origem_cadastro === 'b2b' && profile.turma_id_pendente) {
      const existing = await classService.getMatriculasByAluno(profile.id);
      if (!existing.some((matricula) => matricula.turma_id === profile.turma_id_pendente)) {
        await classService.createMatricula({
          aluno_id: profile.id,
          turma_id: profile.turma_id_pendente,
          empresa_b2b_id: profile.empresa_id,
          status_resultado_final: 'Pendente',
          status_matricula: 'Ativo'
        });
      }
    }
    const reviewerId = await getReviewerId();
    await registerAudit(reviewerId, `Concluiu aprovação e ativou o cadastro de ${profile.nome_completo}`, profile.id);
    return true;
  },

  approve: async (profile: Usuario, documents: Documento[], notes: string) => {
    if (profile.status !== 'pendente') throw new Error('Este cadastro não está pendente de aprovação.');

    const missing = missingDocuments(profile, documents);
    if (missing.length > 0) {
      throw new Error(`Não é possível aprovar. Documentos faltantes: ${missing.join(', ')}.`);
    }

    const reviewerId = await getReviewerId();
    const current = currentDocuments(documents);
    for (const type of getRequiredDocumentTypes(profile.tipo_documento_selecionado)) {
      const document = current.get(type);
      if (!document) continue;
      if (document.storage_area === 'temporarios') {
        await documentService.promoteToOfficial(document);
      }
      if (document.status !== DocumentStatus.APROVADO || notes.trim()) {
        await documentService.update(document.id, {
          status: DocumentStatus.APROVADO,
          observacoes_revisor: notes.trim() || undefined
        });
      }
      await registerAudit(reviewerId, `Aprovou o documento ${document.arquivo_nome}`, profile.id, document, notes.trim() || undefined);
    }

    if (profile.origem_cadastro === 'b2b' && profile.turma_id_pendente) {
      const existing = await classService.getMatriculasByAluno(profile.id);
      const alreadyLinked = existing.some((matricula) => matricula.turma_id === profile.turma_id_pendente);
      if (!alreadyLinked) {
        await classService.createMatricula({
          aluno_id: profile.id,
          turma_id: profile.turma_id_pendente,
          empresa_b2b_id: profile.empresa_id,
          status_resultado_final: 'Pendente',
          status_matricula: 'Ativo'
        });
      }
    }

    await userService.update(profile.id, { status: 'ativo' });
    await registerAudit(
      reviewerId,
      `Aprovou manualmente o cadastro de ${profile.nome_completo}${notes.trim() ? `. Parecer: ${notes.trim()}` : ''}`,
      profile.id
    );
    return true;
  },

  reject: async (profile: Usuario, documents: Documento[], reason: string) => {
    const normalizedReason = reason.trim();
    if (!normalizedReason) throw new Error('Informe o motivo da recusa.');
    if (profile.status !== 'pendente') throw new Error('Este cadastro não está pendente de aprovação.');

    const reviewerId = await getReviewerId();
    for (const document of [...currentDocuments(documents).values()].filter((item) => item.status !== DocumentStatus.ASSINADO)) {
      await documentService.update(document.id, {
        status: DocumentStatus.RECUSADO,
        observacoes_revisor: normalizedReason
      });
      await registerAudit(reviewerId, `Recusou o documento ${document.arquivo_nome}`, profile.id, document, normalizedReason);
    }

    await registerAudit(
      reviewerId,
      `Recusou documentos do cadastro de ${profile.nome_completo}. O aluno permanece pendente para substituição.`,
      profile.id,
      undefined,
      normalizedReason
    );
    return true;
  },

  rejectApplication: async (profile: Usuario, documents: Documento[], reason: string) => {
    await approvalService.reject(profile, documents, reason);
    await userService.update(profile.id, { status: 'recusado' });
    const reviewerId = await getReviewerId();
    await registerAudit(reviewerId, `Recusou definitivamente o cadastro de ${profile.nome_completo}`, profile.id, undefined, reason.trim());
    return true;
  }
};

export { missingDocuments };
