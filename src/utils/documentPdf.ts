/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import type { DocumentPageConfig } from '../types/documentTemplates';
import { sanitizeDocumentInto } from './documentRender';

const PAGE_WIDTH_MM = 210;
const PAGE_HEIGHT_MM = 297;
/** Quanto (em mm) a quebra de página pode subir para não cortar linhas de texto ou imagens. */
const MAX_BREAK_LOOKBACK_MM = 60;
/** Fração mínima da altura útil que uma página precisa ter para aceitar uma quebra segura. */
const MIN_SLICE_RATIO = 0.35;
/** Canal RGB a partir do qual um pixel é considerado fundo branco. */
const BLANK_CHANNEL_THRESHOLD = 250;

function waitForImages(root: HTMLElement): Promise<void> {
  const images = Array.from(root.querySelectorAll('img'));
  if (images.length === 0) return Promise.resolve();

  return Promise.all(images.map((image) => (
    image.complete && image.naturalWidth > 0
      ? Promise.resolve()
      : new Promise<void>((resolve) => {
        const done = () => resolve();
        image.addEventListener('load', done, { once: true });
        image.addEventListener('error', done, { once: true });
      })
  ))).then(() => undefined);
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

function isRowBlank(data: Uint8ClampedArray, row: number, width: number): boolean {
  const start = row * width * 4;
  for (let column = 0; column < width; column += 1) {
    const index = start + column * 4;
    if (
      data[index] < BLANK_CHANNEL_THRESHOLD
      || data[index + 1] < BLANK_CHANNEL_THRESHOLD
      || data[index + 2] < BLANK_CHANNEL_THRESHOLD
    ) {
      return false;
    }
  }
  return true;
}

function readPixels(canvas: HTMLCanvasElement, x: number, y: number, width: number, height: number): ImageData | null {
  if (width <= 0 || height <= 0) return null;
  const context = canvas.getContext('2d');
  if (!context) return null;
  return context.getImageData(x, y, width, height);
}

/** Última linha (exclusiva) com conteúdo, descartando o espaço em branco final. */
function contentEndY(canvas: HTMLCanvasElement, x: number, width: number): number {
  const bandHeight = 256;
  for (let bottom = canvas.height; bottom > 0; bottom -= bandHeight) {
    const top = Math.max(0, bottom - bandHeight);
    const band = readPixels(canvas, x, top, width, bottom - top);
    if (!band) return canvas.height;
    for (let row = band.height - 1; row >= 0; row -= 1) {
      if (!isRowBlank(band.data, row, band.width)) return top + row + 1;
    }
  }
  return 0;
}

/** Linha em branco mais próxima acima do corte ideal, para não partir texto nem imagens. */
function safeBreakY(canvas: HTMLCanvasElement, x: number, width: number, fromY: number, toY: number): number {
  const band = readPixels(canvas, x, fromY, width, toY - fromY);
  if (!band) return toY;
  for (let row = band.height - 1; row >= 0; row -= 1) {
    if (isRowBlank(band.data, row, band.width)) return fromY + row + 1;
  }
  return toY;
}

/**
 * Recorta o conteúdo em páginas A4 respeitando as margens configuradas em cada página.
 * A quebra tenta parar em uma linha em branco para não cortar texto no meio.
 */
function canvasToPdfBlob(canvas: HTMLCanvasElement, pageConfig: DocumentPageConfig): Blob {
  const { top, right, bottom, left } = pageConfig.margens;
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const pxPerMm = canvas.width / PAGE_WIDTH_MM;
  const contentWidthMm = Math.max(1, PAGE_WIDTH_MM - left - right);
  const contentHeightMm = Math.max(1, PAGE_HEIGHT_MM - top - bottom);
  const contentWidthPx = Math.max(1, Math.round(contentWidthMm * pxPerMm));
  const sourceX = Math.max(0, Math.min(canvas.width - 1, Math.round(left * pxPerMm)));
  const pageHeightPx = Math.max(1, Math.round(contentHeightMm * pxPerMm));
  const minSlicePx = Math.max(1, Math.round(pageHeightPx * MIN_SLICE_RATIO));
  const maxLookbackPx = Math.round(MAX_BREAK_LOOKBACK_MM * pxPerMm);
  const totalHeight = contentEndY(canvas, sourceX, contentWidthPx);

  if (totalHeight <= 0) return pdf.output('blob');

  const slice = document.createElement('canvas');
  slice.width = contentWidthPx;

  let offsetY = 0;
  let pageIndex = 0;
  while (offsetY < totalHeight) {
    let sliceHeight = Math.min(pageHeightPx, totalHeight - offsetY);

    if (totalHeight - (offsetY + sliceHeight) > 0 && sliceHeight > minSlicePx) {
      const fromY = Math.max(offsetY + minSlicePx, offsetY + sliceHeight - maxLookbackPx);
      const breakY = safeBreakY(canvas, sourceX, contentWidthPx, fromY, offsetY + sliceHeight);
      if (breakY > offsetY) sliceHeight = breakY - offsetY;
    }

    slice.height = sliceHeight;
    const sliceContext = slice.getContext('2d');
    if (!sliceContext) break;
    sliceContext.fillStyle = '#ffffff';
    sliceContext.fillRect(0, 0, contentWidthPx, sliceHeight);
    sliceContext.drawImage(
      canvas,
      sourceX,
      offsetY,
      contentWidthPx,
      sliceHeight,
      0,
      0,
      contentWidthPx,
      sliceHeight,
    );

    if (pageIndex > 0) pdf.addPage();
    pdf.addImage(slice.toDataURL('image/png'), 'PNG', left, top, contentWidthMm, sliceHeight / pxPerMm);

    pageIndex += 1;
    offsetY += sliceHeight;
  }

  return pdf.output('blob');
}

/** Renderiza o HTML em uma folha A4 fora da tela e gera um PDF (uma ou mais páginas). */
export async function renderDocumentToPdfBlob(html: string, pageConfig: DocumentPageConfig): Promise<Blob> {
  const { right, left } = pageConfig.margens;
  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  Object.assign(host.style, {
    position: 'fixed',
    left: '-10000px',
    top: '0',
    width: `${PAGE_WIDTH_MM}mm`,
    background: '#ffffff',
    pointerEvents: 'none',
  });

  const page = document.createElement('div');
  page.className = 'doc-render';
  Object.assign(page.style, {
    boxSizing: 'border-box',
    width: `${PAGE_WIDTH_MM}mm`,
    padding: `0 ${right}mm 0 ${left}mm`,
    background: '#ffffff',
  });

  sanitizeDocumentInto(page, html);
  host.appendChild(page);
  document.body.appendChild(host);

  try {
    await waitForImages(page);
    await nextFrame();
    const canvas = await html2canvas(page, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false });
    return canvasToPdfBlob(canvas, pageConfig);
  } finally {
    host.remove();
  }
}

/** Remove caracteres inválidos para nome de arquivo. */
export function sanitizeFileName(name: string): string {
  const normalized = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const cleaned = normalized.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^_+|_+$/g, '');
  return cleaned.slice(0, 120) || 'documento';
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export interface ZipEntry {
  name: string;
  blob: Blob;
}

export async function buildZipBlob(entries: ZipEntry[]): Promise<Blob> {
  const zip = new JSZip();
  const used = new Set<string>();
  entries.forEach((entry) => {
    let name = entry.name;
    let counter = 1;
    while (used.has(name)) {
      const dot = entry.name.lastIndexOf('.');
      name = dot > 0
        ? `${entry.name.slice(0, dot)}_${counter}${entry.name.slice(dot)}`
        : `${entry.name}_${counter}`;
      counter += 1;
    }
    used.add(name);
    zip.file(name, entry.blob);
  });
  return zip.generateAsync({ type: 'blob' });
}
