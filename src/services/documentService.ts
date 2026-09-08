import { supabase } from '../integrations/supabase/client';
import { DocumentStatus, Documento } from '../types';
import { newServiceId, serviceError } from './supabaseErrors';

type UploadDocumentInput = Omit<Documento, 'id' | 'data_criacao' | 'url_armazenamento' | 'hash_sha256' | 'usuario_id' | 'arquivo_nome'> & {
  file: File;
  usuario_id: string;
  onProgress?: (progress: number) => void;
};

const allowedUploadTypes = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);
type ReplacementOptions = Partial<Pick<Documento, 'status' | 'origem_cadastro' | 'metodo_verificacao' | 'storage_area'>>;
const replacementLocks = new Set<string>();

function safeFileName(fileName: string) {
  return fileName.trim().replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120) || 'documento';
}

function validateUploadType(file: File) {
  if (!allowedUploadTypes.has(file.type.toLowerCase())) {
    throw new Error('Formato inválido. Envie apenas PDF, JPG, JPEG, PNG ou WEBP.');
  }
}

async function sha256(file: File) {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function uploadWithProgress(path: string, file: File, onProgress?: (progress: number) => void) {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) throw new Error('Sessão expirada. Faça login novamente.');

  const clientConfig = supabase as unknown as { supabaseUrl: string; supabaseKey: string };
  const encodedPath = path.split('/').map((segment) => encodeURIComponent(segment)).join('/');
  const uploadUrl = `${clientConfig.supabaseUrl}/storage/v1/object/documents/${encodedPath}`;

  await new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('POST', uploadUrl);
    request.setRequestHeader('Authorization', `Bearer ${accessToken}`);
    request.setRequestHeader('apikey', clientConfig.supabaseKey);
    request.setRequestHeader('x-upsert', 'false');
    request.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        onProgress?.(100);
        resolve();
      } else {
        reject(new Error(`Falha no upload (${request.status})`));
      }
    };
    request.onerror = () => reject(new Error('Falha de conexão durante o upload.'));
    request.onabort = () => reject(new Error('Upload cancelado.'));
    request.send(file);
  });
}

export const documentService = {
  getAll: async (): Promise<Documento[]> => {
    const { data, error } = await supabase
      .from('documentos')
      .select('*');
    if (error) throw serviceError('Não foi possível carregar os documentos', error);
    return (data ?? []) as Documento[];
  },

  getByUserId: async (userId: string): Promise<Documento[]> => {
    const { data, error } = await supabase
      .from('documentos')
      .select('*')
      .eq('usuario_id', userId);
    if (error) throw serviceError(`Não foi possível carregar os documentos do usuário ${userId}`, error);
    return (data ?? []) as Documento[];
  },

  getByUserIds: async (userIds: string[]): Promise<Documento[]> => {
    if (userIds.length === 0) return [];
    const { data, error } = await supabase
      .from('documentos')
      .select('*')
      .in('usuario_id', userIds);
    if (error) throw serviceError('Não foi possível carregar os documentos da fila', error);
    return (data ?? []) as Documento[];
  },

  getById: async (id: string): Promise<Documento | undefined> => {
    const { data, error } = await supabase
      .from('documentos')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw serviceError(`Não foi possível carregar o documento ${id}`, error);
    return (data ?? undefined) as Documento | undefined;
  },

  getFilterOptions: async (limit = 200): Promise<Pick<Documento, 'id' | 'arquivo_nome' | 'tipo_documento'>[]> => {
    const { data, error } = await supabase
      .from('documentos')
      .select('id, arquivo_nome, tipo_documento')
      .order('data_criacao', { ascending: false })
      .limit(limit);
    if (error) throw serviceError('Não foi possível carregar os documentos', error);
    return (data ?? []) as Pick<Documento, 'id' | 'arquivo_nome' | 'tipo_documento'>[];
  },

  createSignedUrl: async (document: Documento, expiresIn = 300): Promise<string | null> => {
    if (!document.url_armazenamento) return null;
    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(document.url_armazenamento, expiresIn);
    if (error) throw serviceError('Não foi possível abrir o documento', error);
    return data.signedUrl;
  },

  create: async (doc: Omit<Documento, 'id' | 'data_criacao'> & { id?: string }): Promise<Documento> => {
    const newDoc = {
      ...doc,
      id: doc.id || newServiceId('doc'),
      data_criacao: new Date().toISOString()
    };
    const { data, error } = await supabase
      .from('documentos')
      .insert(newDoc)
      .select()
      .single();
    if (error) throw serviceError('Não foi possível criar o documento', error);
    return data as Documento;
  },

  uploadFile: async ({ file, usuario_id, onProgress, ...metadata }: UploadDocumentInput): Promise<Documento> => {
    validateUploadType(file);
    const documentId = newServiceId('doc');
    const storageArea = metadata.storage_area || 'temporarios';
    const storagePath = `${usuario_id}/${storageArea}/${documentId}-${safeFileName(file.name)}`;
    const hash = await sha256(file);
    try {
      await uploadWithProgress(storagePath, file, onProgress);
    } catch (uploadError) {
      throw serviceError('Não foi possível enviar o arquivo', uploadError);
    }

    const { data, error } = await supabase
      .from('documentos')
      .insert({
        ...metadata,
        id: documentId,
        usuario_id,
        url_armazenamento: storagePath,
        arquivo_nome: file.name,
        hash_sha256: hash,
        data_criacao: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      await supabase.storage.from('documents').remove([storagePath]);
      throw serviceError('Não foi possível registrar o documento', error);
    }
    return data as Documento;
  },

  createReplacement: async (source: Documento, file: File, onProgress?: (progress: number) => void, options: ReplacementOptions = {}): Promise<Documento> => {
    validateUploadType(file);
    if (source.status !== DocumentStatus.RECUSADO || source.esta_atual === false) {
      throw new Error('Somente a versão recusada atual pode receber uma substituição.');
    }
    if (replacementLocks.has(source.id)) {
      throw new Error('Já existe uma substituição em andamento para este documento.');
    }
    replacementLocks.add(source.id);

    try {
      const documentId = newServiceId('doc');
    const version = (source.versao ?? 1) + 1;
    const groupId = source.grupo_documento_id || `${source.usuario_id}:${source.tipo_documento}`;
    const storageArea = options.storage_area || 'temporarios';
    const storagePath = `${source.usuario_id}/${storageArea}/${documentId}-${safeFileName(file.name)}`;
    const hash = await sha256(file);
    try {
      await uploadWithProgress(storagePath, file, onProgress);
    } catch (uploadError) {
      throw serviceError('Não foi possível enviar o documento substituto', uploadError);
    }

    const { data: replacement, error: insertError } = await supabase
      .from('documentos')
      .insert({
        id: documentId,
        usuario_id: source.usuario_id,
        tipo_documento: source.tipo_documento,
        url_armazenamento: storagePath,
        arquivo_nome: file.name,
        hash_sha256: hash,
        status: options.status || DocumentStatus.PENDENTE,
        origem_cadastro: options.origem_cadastro || source.origem_cadastro,
        metodo_verificacao: options.metodo_verificacao || 'manual',
        storage_area: storageArea,
        grupo_documento_id: groupId,
        versao: version,
        substitui_documento_id: source.id,
        esta_atual: true,
        data_criacao: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      await supabase.storage.from('documents').remove([storagePath]);
      throw serviceError('Não foi possível registrar o documento substituto', insertError);
    }

    const { data: markedOld, error: markOldError } = await supabase
      .from('documentos')
      .update({ esta_atual: false })
      .eq('id', source.id)
      .eq('status', DocumentStatus.RECUSADO)
      .eq('esta_atual', true)
      .select('id')
      .maybeSingle();

    if (markOldError || !markedOld) {
      await supabase.from('documentos').delete().eq('id', documentId);
      await supabase.storage.from('documents').remove([storagePath]);
      throw serviceError('Não foi possível preservar a relação de substituição', markOldError);
    }

      return replacement as Documento;
    } finally {
      replacementLocks.delete(source.id);
    }
  },

  promoteToOfficial: async (document: Documento): Promise<Documento> => {
    if (!document.url_armazenamento || document.storage_area === 'oficiais') return document;
    const officialPath = document.url_armazenamento.replace('/temporarios/', '/oficiais/');
    const { error: moveError } = await supabase.storage
      .from('documents')
      .move(document.url_armazenamento, officialPath);
    if (moveError) throw serviceError('Não foi possível mover o documento para a área oficial', moveError);

    const { data, error } = await supabase
      .from('documentos')
      .update({
        url_armazenamento: officialPath,
        storage_area: 'oficiais',
        status: DocumentStatus.APROVADO,
        esta_atual: true
      })
      .eq('id', document.id)
      .select()
      .single();

    if (error) {
      await supabase.storage.from('documents').move(officialPath, document.url_armazenamento);
      throw serviceError('Não foi possível atualizar o documento oficial', error);
    }
    return data as Documento;
  },

  update: async (id: string, updates: Partial<Documento>): Promise<Documento> => {
    const { data, error } = await supabase
      .from('documentos')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw serviceError(`Não foi possível atualizar o documento ${id}`, error);
    if (!data) throw new Error(`Não foi possível atualizar o documento ${id}: documento não encontrado`);
    return data as Documento;
  },

  delete: async (id: string): Promise<boolean> => {
    const { error } = await supabase
      .from('documentos')
      .delete()
      .eq('id', id);
    if (error) throw serviceError(`Não foi possível excluir o documento ${id}`, error);
    return true;
  }
};
