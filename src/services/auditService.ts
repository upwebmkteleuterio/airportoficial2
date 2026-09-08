import { supabase } from '../integrations/supabase/client';
import { AuditoriaLog, AuditoriaLogView } from '../types';
import { serviceError } from './supabaseErrors';

export interface AuditPageOptions {
  page: number;
  pageSize: number;
  search?: string;
  action?: string;
  table?: string;
  operadorId?: string;
  targetSearch?: string;
  documentoId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface AuditPage {
  data: AuditoriaLogView[];
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
  periodoInicio: string;
}

interface AuditRpcRow extends AuditoriaLog {
  operador_legacy_id: string | null;
  operador_nome_completo: string | null;
  operador_role: string | null;
  operador_email: string | null;
  alvo_legacy_id: string | null;
  alvo_nome_completo: string | null;
  alvo_role: string | null;
  alvo_email: string | null;
  documento_arquivo_nome: string | null;
  documento_tipo_documento: string | null;
  documento_versao: number | null;
  total_count: number | string | null;
}

const mapAuditRow = (row: AuditRpcRow): AuditoriaLogView => ({
  id: row.id,
  usuario_id: row.usuario_id,
  acao: row.acao,
  tabela_afetada: row.tabela_afetada,
  registro_id: row.registro_id,
  ip_address: row.ip_address,
  data_hora: row.data_hora,
  hash_sha256: row.hash_sha256,
  alvo_id: row.alvo_id,
  documento_id: row.documento_id,
  documento_tipo: row.documento_tipo,
  documento_hash: row.documento_hash,
  versao: row.versao,
  autorizacao_id: row.autorizacao_id,
  operador: row.operador_legacy_id || row.operador_email || row.operador_nome_completo || row.operador_role
    ? {
        legacy_id: row.operador_legacy_id ?? row.usuario_id,
        nome_completo: row.operador_nome_completo ?? '',
        role: row.operador_role ?? '',
        email: row.operador_email,
      }
    : null,
  alvo: row.alvo_legacy_id || row.alvo_email || row.alvo_nome_completo || row.alvo_role
    ? {
        legacy_id: row.alvo_legacy_id ?? row.alvo_id ?? '',
        nome_completo: row.alvo_nome_completo ?? '',
        role: row.alvo_role ?? '',
        email: row.alvo_email,
      }
    : null,
  documento: row.documento_id || row.documento_arquivo_nome || row.documento_tipo_documento
    ? {
        id: row.documento_id ?? '',
        arquivo_nome: row.documento_arquivo_nome ?? '',
        tipo_documento: row.documento_tipo_documento ?? row.documento_tipo ?? '',
        versao: row.documento_versao ?? row.versao ?? 1,
      }
    : null,
});

const normalizedAction = (action?: string) => action?.split(' | ', 1)[0] ?? '';

export const auditService = {
  getAll: async (): Promise<AuditoriaLog[]> => {
    const { data, error } = await supabase
      .from('auditoria_logs')
      .select('*')
      .order('data_hora', { ascending: false });
    if (error) throw serviceError('Não foi possível carregar os logs de auditoria', error);
    return (data ?? []) as AuditoriaLog[];
  },

  getPage: async ({ page, pageSize, search, action, table, operadorId, targetSearch, documentoId, dateFrom, dateTo }: AuditPageOptions): Promise<AuditPage> => {
    const { data, error } = await supabase.rpc('get_auditoria_logs_page', {
      p_page: page,
      p_page_size: pageSize,
      p_search: search?.trim() || null,
      p_action: normalizedAction(action) || null,
      p_table: table?.trim() || null,
      p_operador_id: operadorId?.trim() || null,
      p_target_search: targetSearch?.trim() || null,
      p_documento_id: documentoId?.trim() || null,
      p_date_from: dateFrom || null,
      p_date_to: dateTo || null,
    });
    if (error) throw serviceError('Não foi possível carregar os logs de auditoria', error);

    const rows = (data ?? []) as AuditRpcRow[];
    return {
      data: rows.map(mapAuditRow),
      total: rows.length > 0 ? Number(rows[0].total_count ?? 0) : 0,
    };
  },

  getEventCounts: async ({ search, action, table, operadorId, targetSearch, documentoId, dateFrom, dateTo }: Omit<AuditPageOptions, 'page' | 'pageSize'> = {}): Promise<AuditEventCounts> => {
    const { data, error } = await supabase.rpc('get_auditoria_event_counts', {
      p_search: search?.trim() || null,
      p_action: normalizedAction(action) || null,
      p_table: table?.trim() || null,
      p_operador_id: operadorId?.trim() || null,
      p_target_search: targetSearch?.trim() || null,
      p_documento_id: documentoId?.trim() || null,
      p_date_from: dateFrom || null,
      p_date_to: dateTo || null,
    });
    if (error) throw serviceError('Não foi possível carregar os indicadores de auditoria', error);

    const row = data?.[0];
    return {
      pastasAbertas: Number(row?.pastas_abertas ?? 0),
      fotosVisualizadas: Number(row?.fotos_visualizadas ?? 0),
      documentosVisualizados: Number(row?.documentos_visualizados ?? 0),
      downloads: Number(row?.downloads ?? 0),
      periodoInicio: row?.periodo_inicio ?? '',
    };
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
