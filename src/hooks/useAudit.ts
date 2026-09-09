/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { auditService, type AuditCreateInput, type AuditEventCounts } from '../services/auditService';
import { AuditoriaLogView } from '../types';

interface AuditOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  action?: string;
  table?: string;
  operadorId?: string;
  targetSearch?: string;
  documentoId?: string;
  documentoTipo?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface AuditQueryData {
  data: AuditoriaLogView[];
  total: number;
}

export function useAudit(options: AuditOptions = {}) {
  const queryClient = useQueryClient();
  const isPaginated = options.page !== undefined;
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? 20;
  const search = options.search ?? '';
  const action = options.action ?? '';
  const table = options.table ?? '';
  const operadorId = options.operadorId ?? '';
  const targetSearch = options.targetSearch ?? '';
  const documentoId = options.documentoId ?? '';
  const documentoTipo = options.documentoTipo ?? '';
  const dateFrom = options.dateFrom ?? '';
  const dateTo = options.dateTo ?? '';

  const auditQuery = useQuery<AuditQueryData>({
    queryKey: isPaginated
      ? ['audit-logs', 'page', page, pageSize, { search, action, table, operadorId, targetSearch, documentoId, documentoTipo, dateFrom, dateTo }]
      : ['audit-logs', 'all'],
    queryFn: async () => {
      if (!isPaginated) {
        const data = await auditService.getAll();
        return { data: data as AuditoriaLogView[], total: data.length };
      }
      return auditService.getPage({ page, pageSize, search, action, table, operadorId, targetSearch, documentoId, documentoTipo, dateFrom, dateTo });
    },
  });

  const eventCountsQuery = useQuery<AuditEventCounts>({
    queryKey: ['audit-logs', 'event-counts', { search, action, table, operadorId, targetSearch, documentoId, documentoTipo, dateFrom, dateTo }],
    queryFn: () => auditService.getEventCounts({ search, action, table, operadorId, targetSearch, documentoId, documentoTipo, dateFrom, dateTo }),
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
    isFetching: auditQuery.isFetching,
    eventCounts: eventCountsQuery.data,
    createLog: createLogMutation.mutateAsync,
  };
}

export type { AuditOptions };
