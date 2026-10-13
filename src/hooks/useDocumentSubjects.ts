import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import { searchDocumentSubjects } from '../services/documentDataService';
import type { DocumentTemplateEntity } from '../types/documentTemplates';

const normalizeTerm = (value: string) =>
  value.replace(/[^0-9A-Za-zÀ-ÿ .@/-]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100);

export function useDocumentSubjects(options: {
  entity: DocumentTemplateEntity | null;
  search: string;
  turmaId?: string | null;
  enabled?: boolean;
}) {
  const term = normalizeTerm(options.search);
  const canSearch = Boolean(options.entity)
    && (term.length >= 3 || Boolean(options.turmaId))
    && options.enabled !== false;
  const query = useInfiniteQuery({
    queryKey: ['document-subjects', options.entity, options.turmaId ?? null, term],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => searchDocumentSubjects({
      entity: options.entity as DocumentTemplateEntity,
      search: term,
      turmaId: options.turmaId,
      offset: pageParam,
      limit: 1000,
    }),
    getNextPageParam: (last) => (last.hasMore ? last.offset + last.limit : undefined),
    placeholderData: keepPreviousData,
    enabled: canSearch,
  });

  return {
    items: query.data?.pages.flatMap((page) => page.items) ?? [],
    total: query.data?.pages[0]?.total ?? 0,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    refetch: query.refetch,
    canSearch,
    term,
  };
}
