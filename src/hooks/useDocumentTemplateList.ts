/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { documentTemplateService } from '../services/documentTemplateService';

interface DocumentTemplateListOptions {
  page: number;
  pageSize: number;
  search: string;
}

export function useDocumentTemplateList({ page, pageSize, search }: DocumentTemplateListOptions) {
  const query = useQuery({
    queryKey: ['document-templates', 'page', { page, pageSize, search }],
    queryFn: ({ signal }) => documentTemplateService.list({ page, pageSize, search, signal }),
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
