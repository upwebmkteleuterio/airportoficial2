/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from '../integrations/supabase/client';
import { serviceError } from './supabaseErrors';
import type { DocumentTemplate, DocumentTemplateInput } from '../types/documentTemplates';

const TABLE = 'document_templates';

export const documentTemplateService = {
  getAll: async (): Promise<DocumentTemplate[]> => {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      throw serviceError('Não foi possível carregar os modelos de documento', error);
    }

    return (data ?? []) as DocumentTemplate[];
  },

  list: async (options: { page: number; pageSize: number; search?: string; signal?: AbortSignal }): Promise<{ items: DocumentTemplate[]; total: number }> => {
    const page = Number.isFinite(options.page) ? Math.max(1, Math.floor(options.page)) : 1;
    const pageSize = Number.isFinite(options.pageSize)
      ? Math.min(1000, Math.max(1, Math.floor(options.pageSize)))
      : 1000;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    let query = supabase.from(TABLE).select('*', { count: 'exact' });
    const term = options.search?.replace(/[%_\\(),.]/g, ' ').replace(/[^0-9A-Za-zÀ-ÿ -]/g, ' ').slice(0, 100).trim();
    if (term) query = query.ilike('nome', `%${term}%`);
    query = query.order('updated_at', { ascending: false }).range(from, to);
    if (options.signal) query = query.abortSignal(options.signal);
    const { data, count, error } = await query;
    if (error) throw serviceError('Não foi possível carregar os modelos de documento', error);
    return { items: (data ?? []) as DocumentTemplate[], total: count ?? 0 };
  },

  create: async (input: DocumentTemplateInput): Promise<DocumentTemplate> => {
    const { data, error } = await supabase
      .from(TABLE)
      .insert({
        nome: input.nome,
        descricao: input.descricao ?? null,
        entidade_principal: input.entidade_principal,
        conteudo_html: input.conteudo_html,
        configuracao: input.configuracao ?? {},
      })
      .select('*')
      .single();

    if (error) {
      throw serviceError('Não foi possível criar o modelo de documento', error);
    }

    return data as DocumentTemplate;
  },

  update: async (id: string, updates: Partial<DocumentTemplateInput>): Promise<DocumentTemplate> => {
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (updates.nome !== undefined) payload.nome = updates.nome;
    if (updates.descricao !== undefined) payload.descricao = updates.descricao ?? null;
    if (updates.entidade_principal !== undefined) payload.entidade_principal = updates.entidade_principal;
    if (updates.conteudo_html !== undefined) payload.conteudo_html = updates.conteudo_html;
    if (updates.configuracao !== undefined) payload.configuracao = updates.configuracao;

    const { data, error } = await supabase
      .from(TABLE)
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      throw serviceError('Não foi possível salvar o modelo de documento', error);
    }

    return data as DocumentTemplate;
  },

  remove: async (id: string): Promise<void> => {
    const { error } = await supabase.from(TABLE).delete().eq('id', id);

    if (error) {
      throw serviceError('Não foi possível excluir o modelo de documento', error);
    }
  },
};

export default documentTemplateService;
