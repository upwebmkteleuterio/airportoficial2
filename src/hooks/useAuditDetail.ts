import { useCallback, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { documentAccessService, DocumentAccessGrant, DocumentAccessItem } from '../services/documentAccessService';
import { documentService } from '../services/documentService';
import { userService } from '../services/userService';
import { AuditoriaLogView, Documento, Usuario } from '../types';

interface UseAuditDetailOptions {
  isOpen: boolean;
  log: AuditoriaLogView | null;
}

const errorMessage = (error: unknown, fallback: string) => (
  error instanceof Error && error.message.trim() ? error.message : fallback
);

export function useAuditDetail({ isOpen, log }: UseAuditDetailOptions) {
  const queryClient = useQueryClient();
  const [accessGrant, setAccessGrant] = useState<DocumentAccessGrant | null>(null);
  const [authorizedItem, setAuthorizedItem] = useState<DocumentAccessItem | null>(null);
  const [authorizedLogId, setAuthorizedLogId] = useState<string | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);

  const operatorId = log?.usuario_id || log?.operador?.legacy_id || '';
  const targetUserId = log?.alvo_id || log?.alvo?.legacy_id || '';
  const targetPersonId = log?.alvo_pessoa_id || '';
  const accessTargetId = targetPersonId || targetUserId;
  const documentId = log?.documento_id || log?.documento?.id || '';

  const operatorQuery = useQuery<Usuario | undefined>({
    queryKey: ['audit-detail', 'operator', operatorId],
    queryFn: () => userService.getById(operatorId),
    enabled: isOpen && Boolean(operatorId),
    retry: 1,
  });

  const targetQuery = useQuery<Usuario | undefined>({
    queryKey: ['audit-detail', 'target', targetUserId],
    queryFn: () => userService.getById(targetUserId),
    enabled: isOpen && Boolean(targetUserId),
    retry: 1,
  });

  const documentQuery = useQuery<Documento | undefined>({
    queryKey: ['audit-detail', 'document', documentId],
    queryFn: () => documentService.getById(documentId),
    enabled: isOpen && Boolean(documentId),
    retry: 1,
  });

  const clearAuthorization = useCallback(() => {
    setAccessGrant(null);
    setAuthorizedItem(null);
    setAuthorizedLogId(null);
    setAccessError(null);
  }, []);

  useEffect(() => {
    clearAuthorization();
    queryClient.removeQueries({ queryKey: ['audit-document-access'] });
  }, [clearAuthorization, isOpen, log?.id, queryClient]);

  useEffect(() => {
    if (!accessGrant || !authorizedLogId) return;

    const expiresAt = new Date(accessGrant.expires_at).getTime();
    if (!Number.isFinite(expiresAt)) return;

    const timeoutId = window.setTimeout(() => {
      setAccessGrant(null);
      setAuthorizedItem(null);
      setAuthorizedLogId(null);
      setAccessError('A autorização expirou. Confirme sua senha novamente para visualizar o documento.');
      queryClient.removeQueries({ queryKey: ['audit-document-access', authorizedLogId] });
    }, Math.max(0, expiresAt - Date.now()));

    return () => window.clearTimeout(timeoutId);
  }, [accessGrant, authorizedLogId, queryClient]);

  const authorizeDocument = useCallback(async (grant: DocumentAccessGrant) => {
    if (!log?.id || !accessTargetId || !documentId) {
      throw new Error('Este registro não possui um documento e alvo válidos.');
    }

    setAccessError(null);
    try {
      const item = await queryClient.fetchQuery<DocumentAccessItem | null>({
        queryKey: ['audit-document-access', log.id, accessTargetId, documentId, grant.id],
        queryFn: async () => {
          const document = await documentService.getById(documentId);
          const belongsToPerson = Boolean(
            targetPersonId && grant.target_person_id === targetPersonId && document?.pessoa_id === grant.target_person_id,
          );
          const expectedPersonId = targetPersonId || grant.target_person_id;
          const belongsToLegacyUser = Boolean(
            targetUserId && grant.target_user_id === targetUserId && document?.usuario_id === grant.target_user_id &&
            (!expectedPersonId || !document.pessoa_id || document.pessoa_id === expectedPersonId),
          );
          if (!document || (!belongsToPerson && !belongsToLegacyUser)) return null;
          return documentAccessService.toItem(document);
        },
        retry: 1,
      });

      if (!item) {
        throw new Error('O documento deste registro não está disponível para este usuário.');
      }
      if (!item.signedUrl) {
        throw new Error('Não foi possível gerar uma URL segura para este documento.');
      }

      await documentAccessService.logEvent({
        action: 'DOCUMENTO_VISUALIZADO',
        targetUserId: accessTargetId,
        grantId: grant.id,
        documentoId: documentId,
      });

      setAccessGrant(grant);
      setAuthorizedItem(item);
      setAuthorizedLogId(log.id);
    } catch (error) {
      const message = errorMessage(error, 'Não foi possível liberar o documento com segurança.');
      queryClient.removeQueries({ queryKey: ['audit-document-access', log.id] });
      setAccessError(message);
      throw new Error(message);
    }
  }, [accessTargetId, documentId, log?.id, queryClient, targetPersonId, targetUserId]);

  const revokeAuthorization = useCallback(() => {
    clearAuthorization();
    if (log?.id) {
      queryClient.removeQueries({ queryKey: ['audit-document-access', log.id] });
    }
  }, [clearAuthorization, log?.id, queryClient]);

  const isAuthorizedForCurrentLog = authorizedLogId === log?.id && Boolean(accessGrant && authorizedItem);

  return {
    operator: operatorQuery.data,
    target: targetQuery.data,
    document: documentQuery.data,
    operatorQuery,
    targetQuery,
    documentQuery,
    targetUserId,
    targetPersonId,
    accessTargetId,
    documentId,
    accessGrant: isAuthorizedForCurrentLog ? accessGrant : null,
    documentItem: isAuthorizedForCurrentLog ? authorizedItem : null,
    accessError,
    authorizeDocument,
    revokeAuthorization,
  };
}

export type { UseAuditDetailOptions };