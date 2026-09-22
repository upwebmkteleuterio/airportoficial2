import { supabase } from '../integrations/supabase/client';
import { Documento } from '../types';
import { documentService } from './documentService';
import { serviceError } from './supabaseErrors';

export interface DocumentAccessItem {
  document: Documento;
  label: string;
  signedUrl: string | null;
}

export interface DocumentAccessGrant {
  id: string;
  target_person_id: string;
  target_user_id?: string | null;
  expires_at: string;
}

export type DocumentAuditAction =
  | 'PASTA_ABERTA'
  | 'FOTO_VISUALIZADA'
  | 'DOCUMENTO_VISUALIZADO'
  | 'DOCUMENTO_BAIXADO'
  | 'DOCUMENTO_ABERTO_NOVA_ABA';

export interface DocumentAuditEventInput {
  action: DocumentAuditAction;
  targetUserId: string;
  grantId: string;
  documentoId?: string;
}

const documentLabels: Record<string, string> = {
  rg: 'RG',
  cpf: 'CPF',
  cnh: 'CNH',
  'comprovante de residência': 'Comprovante de Residência',
  'certificado ensino médio': 'Certificado de Ensino Médio',
  'antecedentes criminais - justiça federal': 'Antecedentes Criminais — Justiça Federal',
  'antecedentes criminais - justiça estadual': 'Antecedentes Criminais — Justiça Estadual',
  'aso': 'ASO',
};

function labelForDocument(type: string) {
  const normalized = type.trim().toLowerCase();
  return documentLabels[normalized] || type;
}

function isNewer(candidate: Documento, current: Documento) {
  const candidateVersion = candidate.versao ?? 1;
  const currentVersion = current.versao ?? 1;
  if (candidateVersion !== currentVersion) return candidateVersion > currentVersion;
  return candidate.data_criacao > current.data_criacao;
}

async function invokeErrorMessage(error: unknown): Promise<string | null> {
  const response = (error as { context?: Response } | null)?.context;
  if (!response) return null;
  try {
    const payload = await response.clone().json() as { error?: string };
    return payload.error?.trim() || null;
  } catch {
    return null;
  }
}

export const documentAccessService = {
  openAccess: async (targetUserId: string, password: string): Promise<DocumentAccessGrant> => {
    const { data, error } = await supabase.functions.invoke('document-access', {
      body: { target_user_id: targetUserId, password },
    });
    if (error) {
      const serverMessage = await invokeErrorMessage(error);
      throw new Error(serverMessage || serviceError('Não foi possível confirmar o acesso documental', error).message);
    }
    const grant = (data as { grant?: DocumentAccessGrant } | null)?.grant;
    if (!grant) throw new Error('A autorização documental retornou uma resposta inválida.');
    return grant;
  },

  // Registra um evento de auditoria documental. Operador, IP, hash do documento,
  // versão e hash da auditoria são sempre derivados no servidor.
  logEvent: async ({ action, targetUserId, grantId, documentoId }: DocumentAuditEventInput): Promise<void> => {
    const { error } = await supabase.functions.invoke('document-audit', {
      body: {
        acao: action,
        alvo_id: targetUserId,
        grant_id: grantId,
        documento_id: documentoId ?? null,
      },
    });
    if (error) {
      const serverMessage = await invokeErrorMessage(error);
      throw new Error(serverMessage || serviceError('Não foi possível registrar a auditoria documental', error).message);
    }
  },

  getCurrentByPersonId: async (personId: string, profileLegacyId?: string | null): Promise<Documento[]> => {
    const documents = await documentService.getByPersonId(personId, profileLegacyId);
    const currentByGroup = new Map<string, Documento>();

    documents
      .filter((document) => document.esta_atual !== false)
      .forEach((document) => {
        const group = document.grupo_documento_id || `${document.pessoa_id || document.usuario_id}:${document.tipo_documento}`;
        const current = currentByGroup.get(group);
        if (!current || isNewer(document, current)) currentByGroup.set(group, document);
      });

    return Array.from(currentByGroup.values()).sort((left, right) => {
      const typeOrder = left.tipo_documento.localeCompare(right.tipo_documento, 'pt-BR');
      if (typeOrder !== 0) return typeOrder;
      return (right.versao ?? 1) - (left.versao ?? 1);
    });
  },

  createSignedUrl: async (document: Documento, expiresIn = 300): Promise<string | null> => {
    if (!document.url_armazenamento) return null;
    return documentService.createSignedUrl(document, expiresIn);
  },

  toItem: async (document: Documento, expiresIn = 300): Promise<DocumentAccessItem> => ({
    document,
    label: labelForDocument(document.tipo_documento),
    signedUrl: await documentAccessService.createSignedUrl(document, expiresIn),
  }),

  getCurrentItemsByPersonId: async (personId: string, profileLegacyId?: string | null, expiresIn = 300): Promise<DocumentAccessItem[]> => {
    const documents = await documentAccessService.getCurrentByPersonId(personId, profileLegacyId);
    return Promise.all(documents.map((document) => documentAccessService.toItem(document, expiresIn)));
  },

  getCurrentByUserId: async (userId: string): Promise<Documento[]> => {
    return documentAccessService.getCurrentByPersonId(userId, userId);
  },

  getCurrentItemsByUserId: async (userId: string, expiresIn = 300): Promise<DocumentAccessItem[]> => {
    return documentAccessService.getCurrentItemsByPersonId(userId, userId, expiresIn);
  },
};
