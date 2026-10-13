/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { DocumentPageConfig, DocumentPageMargins } from '../types/documentTemplates';

export const DEFAULT_PAGE_CONFIG: DocumentPageConfig = {
  formato: 'A4',
  margens: { top: 20, right: 20, bottom: 20, left: 20 },
};

/** Garante que uma configuração de página vinda do banco esteja completa e válida. */
export function normalizePageConfig(input: Partial<DocumentPageConfig> | null | undefined): DocumentPageConfig {
  const margins: Partial<DocumentPageMargins> = input?.margens ?? {};
  const clamp = (value: unknown, fallback: number) => {
    const numeric = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.min(60, Math.max(0, Math.round(numeric)));
  };

  return {
    formato: 'A4',
    margens: {
      top: clamp(margins.top, DEFAULT_PAGE_CONFIG.margens.top),
      right: clamp(margins.right, DEFAULT_PAGE_CONFIG.margens.right),
      bottom: clamp(margins.bottom, DEFAULT_PAGE_CONFIG.margens.bottom),
      left: clamp(margins.left, DEFAULT_PAGE_CONFIG.margens.left),
    },
  };
}
