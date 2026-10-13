/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const MAX_DIMENSION = 1400;
const QUALITY = 0.85;
const RASTER_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Não foi possível ler a imagem selecionada.'));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Não foi possível processar a imagem selecionada.'));
    image.src = src;
  });
}

/**
 * Converte um arquivo de imagem em data URL para embutir no HTML do modelo.
 * Imagens raster são reduzidas e convertidas para WebP; SVG é mantido vetorial.
 */
export async function imageFileToDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Selecione um arquivo de imagem (JPG, PNG, WEBP ou SVG).');
  }

  if (file.type === 'image/svg+xml') {
    return readAsDataUrl(file);
  }

  if (!RASTER_TYPES.has(file.type)) {
    throw new Error('Formato de imagem não suportado. Use JPG, PNG, WEBP ou SVG.');
  }

  const original = await readAsDataUrl(file);
  const image = await loadImage(original);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight));

  if (scale === 1 && file.size <= 400 * 1024) {
    return original;
  }

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext('2d');
  if (!context) return original;

  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/webp', QUALITY);
}
