import { supabase } from '../integrations/supabase/client';
import { AuditoriaLog } from '../types';
import { serviceError } from './supabaseErrors';

export interface AuditPageOptions {
  page: number;
  pageSize: number;
  search?: string;
  action?: string;
  table?: string;
  operadorId?: string;
  alvoId?: string;
  documentoId?: string;
}

export interface AuditPage {
  data: AuditoriaLog[];
  total: number;
}

export type AuditCreateInput = Omit<AuditoriaLog, 'id' | 'data_hora' | 'hash_sha256'> & {
  hash_sha256?: string;
  documento_id?: string;
  documento_hash?: string;
  motivo?: string;
  versao?: number;
};

export interface AuditEventCounts {
  pastasAbertas: number;
  fotosVisualizadas: number;
  documentosVisualizados: number;
  downloads: number;
}

const auditSelect = [
  '*',
  'operador:profiles!auditoria_logs_usuario_id_fkey(legacy_id, nome_completo, role)',
  'alvo:profiles!auditoria_logs_alvo_id_fkey(legacy_id, nome_completo, role)',
  'documento:documentos!auditoria_logs_documento_id_fkey(id, arquivo_nome, tipo_documento, versao)',
].join(', ');

export const auditService = {
  getAll: async (): Promise<AuditoriaLog[]> => {
    const { data, error } = await supabase
      .from('auditoria_logs')
      .select(auditSelect)
      .order('data_hora', { ascending: false });
    if (error) throw serviceError('Não foi possível carregar os logs de auditoria', error);
    return (data ?? []) as unknown as AuditoriaLog[];
  },

  getPage: async ({ page, pageSize, search, action, table, operadorId, alvoId, documentoId }: AuditPageOptions): Promise<AuditPage> => {
    const from = Math.max(0, page - 1) * pageSize;
    const to = from + pageSize - 1;
    let query = supabase
      .from('auditoria_logs')
      .select(auditSelect, { count: 'exact' })
      .order('data_hora', { ascending: false })
      .order('id', { ascending: false })
      .range(from, to);

    const term = search?.trim();
    if (term) {
      const escapedTerm = term.replace(/[%,()]/g, ' ');
      query = query.or(
        `usuario_id.ilike.%${escapedTerm}%,acao.ilike.%${escapedTerm}%,ip_address.ilike.%${escapedTerm}%`
      );
    }
    if (action) query = query.eq('acao', action);
    if (table) query = query.eq('tabela_afetada', table);
    if (operadorId) query = query.eq('usuario_id', operadorId);
    if (alvoId) query = query.eq('alvo_id', alvoId);
    if (documentoId) query = query.eq('documento_id', documentoId);

    const { data, count, error } = await query;
    if (error) throw serviceError('Não foi possível carregar os logs de auditoria', error);
    return { data: (data ?? []) as unknown as AuditoriaLog[], total: count ?? 0 };
  },

  getEventCounts: async (): Promise<AuditEventCounts> => {
    const countFor = async (acao: string) => {
      const { count, error } = await supabase
        .from('auditoria_logs')
        .select('id', { count: 'exact', head: true })
        .eq('acao', acao);
      if (error) throw serviceError('Não foi possível carregar os indicadores de auditoria', error);
      return count ?? 0;
    };

    const [pastasAbertas, fotosVisualizadas, documentosVisualizados, downloads, aberturasNovaAba] = await Promise.all([
      countFor('PASTA_ABERTA'),
      countFor('FOTO_VISUALIZADA'),
      countFor('DOCUMENTO_VISUALIZADO'),
      countFor('DOCUMENTO_BAIXADO'),
      countFor('DOCUMENTO_ABERTO_NOVA_ABA'),
    ]);
    return { pastasAbertas, fotosVisualizadas, documentosVisualizados, downloads: downloads + aberturasNovaAba };
  },

  create: async ({ usuario_id: _actorId, ip_address: _ipAddress, hash_sha256: _clientHash, documento_id, documento_hash, motivo, versao, ...log }: AuditCreateInput): Promise<AuditoriaLog> => {
    const { data, error } = await supabase.functions.invoke('audit-log', {
      body: {
        ...log,
        documento_id,
        documento_hash,
        motivo,
        versao
      }
    });
    if (error) throw serviceError('Não foi possível registrar o log de auditoria', error);
    const createdLog = (data as { log?: AuditoriaLog } | null)?.log;
    if (!createdLog) throw new Error('Não foi possível registrar o log de auditoria: resposta inválida');
    return createdLog;
  }
};
