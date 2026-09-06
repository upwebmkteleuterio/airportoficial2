import { supabase } from '../integrations/supabase/client';
import { serviceError } from './supabaseErrors';

const AVATAR_BUCKET = 'documents';
const AVATAR_PREFIX = 'avatars';
const MAX_INPUT_SIZE = 10 * 1024 * 1024;
const MAX_DIMENSION = 640;
const JPEG_QUALITY = 0.82;
const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

export interface AvatarUploadResult {
  path: string;
  file: File;
}

function validateAvatar(file: File) {
  if (!allowedImageTypes.has(file.type.toLowerCase())) {
    throw new Error('Formato inválido. Envie uma imagem JPG, PNG ou WEBP.');
  }
  if (file.size > MAX_INPUT_SIZE) {
    throw new Error('A foto deve ter no máximo 10 MB.');
  }
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const sourceUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(sourceUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(sourceUrl);
      reject(new Error('Não foi possível ler a foto selecionada.'));
    };
    image.src = sourceUrl;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Não foi possível compactar a foto.'));
    }, type, quality);
  });
}

async function compressAvatar(file: File): Promise<File> {
  validateAvatar(file);
  const image = await loadImage(file);
  if (!image.naturalWidth || !image.naturalHeight) {
    throw new Error('A foto selecionada não possui dimensões válidas.');
  }

  const scale = Math.min(1, MAX_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Seu navegador não conseguiu preparar a foto.');

  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  // WebP is preferred for size; JPEG is a supported fallback for browsers without WebP export.
  let contentType = 'image/webp';
  let blob = await canvasToBlob(canvas, contentType, JPEG_QUALITY);
  if (blob.type !== contentType) {
    contentType = 'image/jpeg';
    blob = await canvasToBlob(canvas, contentType, JPEG_QUALITY);
  }

  const extension = contentType === 'image/webp' ? 'webp' : 'jpg';
  return new File([blob], `avatar.${extension}`, { type: contentType, lastModified: Date.now() });
}

export const avatarService = {
  upload: async (file: File, userId: string): Promise<AvatarUploadResult> => {
    if (!userId.trim()) throw new Error('Não foi possível identificar o usuário da foto.');

    const compressedFile = await compressAvatar(file);
    const storagePath = `${AVATAR_PREFIX}/${userId}/${crypto.randomUUID()}-${compressedFile.name}`;
    const { error } = await supabase.storage.from(AVATAR_BUCKET).upload(storagePath, compressedFile, {
      cacheControl: '3600',
      contentType: compressedFile.type,
      upsert: false,
    });

    if (error) {
      throw serviceError('Não foi possível enviar a foto de perfil', error);
    }

    return { path: storagePath, file: compressedFile };
  },

  createSignedUrl: async (path: string, expiresIn = 300): Promise<string> => {
    if (!path.startsWith(`${AVATAR_PREFIX}/`)) {
      throw new Error('Caminho de avatar inválido.');
    }
    const { data, error } = await supabase.storage
      .from(AVATAR_BUCKET)
      .createSignedUrl(path, expiresIn);
    if (error || !data?.signedUrl) {
      throw serviceError('Não foi possível abrir a foto de perfil', error ?? new Error('URL temporária ausente'));
    }
    return data.signedUrl;
  },

  remove: async (path: string): Promise<void> => {

    if (!path.startsWith(`${AVATAR_PREFIX}/`)) return;
    const { error } = await supabase.storage.from(AVATAR_BUCKET).remove([path]);
    if (error) throw serviceError('Não foi possível limpar a foto de perfil', error);
  },
};

export { compressAvatar };
export default avatarService;
