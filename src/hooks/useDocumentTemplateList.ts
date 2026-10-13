/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { documentTemplateService } from '../services/documentTemplateService';
import type { DocumentTemplateEntity } from '../types/documentTemplates';

interface DocumentTemplateListOptions {
  page: number;
  pageSize: number;
  search: string;
  entity?: DocumentTemplateEntity | '';
}

export function useDocumentTemplateList({ page, pageSize, search, entity = '' }: DocumentTemplateListOptions) {
  const query = useQuery({
    queryKey: ['document-templates', 'page', { page, pageSize, search, entity }],
    queryFn: ({ signal }) => documentTemplateService.list({ page, pageSize, search, entity: entity || null, signal }),
    placeholderData: keepPreviousData,
  });

  return {
    templates: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    refetch: query.refetch,
  };
}
