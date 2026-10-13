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

function canvasToPdfBlob(canvas: HTMLCanvasElement): Blob {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const imageWidth = PAGE_WIDTH_MM;
  const imageHeight = (canvas.height * imageWidth) / canvas.width;
  const imageData = canvas.toDataURL('image/png');

  let heightLeft = imageHeight;
  let position = 0;
  pdf.addImage(imageData, 'PNG', 0, position, imageWidth, imageHeight);
  heightLeft -= PAGE_HEIGHT_MM;

  while (heightLeft > 1) {
    position -= PAGE_HEIGHT_MM;
    pdf.addPage();
    pdf.addImage(imageData, 'PNG', 0, position, imageWidth, imageHeight);
    heightLeft -= PAGE_HEIGHT_MM;
  }

  return pdf.output('blob');
}

/** Renderiza o HTML em uma folha A4 fora da tela e gera um PDF (uma ou mais páginas). */
export async function renderDocumentToPdfBlob(html: string, pageConfig: DocumentPageConfig): Promise<Blob> {
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
    minHeight: `${PAGE_HEIGHT_MM}mm`,
    padding: `${pageConfig.margens.top}mm ${pageConfig.margens.right}mm ${pageConfig.margens.bottom}mm ${pageConfig.margens.left}mm`,
    background: '#ffffff',
  });

  sanitizeDocumentInto(page, html);
  host.appendChild(page);
  document.body.appendChild(host);

  try {
    await waitForImages(page);
    await nextFrame();
    const canvas = await html2canvas(page, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false });
    return canvasToPdfBlob(canvas);
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
