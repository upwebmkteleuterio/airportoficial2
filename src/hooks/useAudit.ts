/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { auditService, type AuditCreateInput, type AuditEventCounts } from '../services/auditService';
import { AuditoriaLog } from '../types';

interface AuditOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  action?: string;
  table?: string;
  operadorId?: string;
  alvoId?: string;
  documentoId?: string;
}

interface AuditQueryData {
  data: AuditoriaLog[];
  total: number;
}

export function useAudit(options: AuditOptions = {}) {
  const queryClient = useQueryClient();
  const isPaginated = options.page !== undefined;
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? 6;
  const search = options.search ?? '';
  const action = options.action ?? '';
  const table = options.table ?? '';
  const operadorId = options.operadorId ?? '';
  const alvoId = options.alvoId ?? '';
  const documentoId = options.documentoId ?? '';

  const auditQuery = useQuery<AuditQueryData>({
    queryKey: isPaginated
      ? ['audit-logs', 'page', page, pageSize, { search, action, table, operadorId, alvoId, documentoId }]
      : ['audit-logs', 'all'],
    queryFn: async () => {
      if (!isPaginated) {
        const data = await auditService.getAll();
        return { data, total: data.length };
      }
      return auditService.getPage({ page, pageSize, search, action, table, operadorId, alvoId, documentoId });
    },
  });

  const eventCountsQuery = useQuery<AuditEventCounts>({
    queryKey: ['audit-logs', 'event-counts'],
    queryFn: () => auditService.getEventCounts(),
  });

  const createLogMutation = useMutation({
    mutationFn: (log: AuditCreateInput) => auditService.create(log),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    }
  });

  return {
    logs: auditQuery.data?.data || [],
    total: auditQuery.data?.total || 0,
    isLoading: auditQuery.isLoading,
    eventCounts: eventCountsQuery.data,
    createLog: createLogMutation.mutateAsync,
  };
}

export type { AuditOptions };
