/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const ALLOWED_TAGS = new Set([
  'P', 'BR', 'HR', 'STRONG', 'B', 'EM', 'I', 'U', 'S', 'STRIKE', 'DEL', 'SUB', 'SUP',
  'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'PRE', 'CODE', 'SPAN', 'DIV', 'A',
  'TABLE', 'THEAD', 'TBODY', 'TFOOT', 'TR', 'TH', 'TD', 'COLGROUP', 'COL', 'IMG',
]);

const ALLOWED_ATTRS = new Set([
  'style', 'colspan', 'rowspan', 'colwidth', 'src', 'alt', 'href', 'title', 'width', 'height', 'align', 'class', 'target', 'rel',
]);

const SAFE_URL = /^(https?:|data:image\/|blob:|\/)/i;

function sanitizeStyle(value: string): string {
  const lower = value.toLowerCase();
  if (lower.includes('javascript:') || lower.includes('expression(') || lower.includes('url(http')) {
    return '';
  }
  return value;
}

function sanitizeNode(node: Node): Node | null {
  if (node.nodeType === Node.TEXT_NODE) {
    return document.createTextNode(node.nodeValue ?? '');
  }
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const element = node as HTMLElement;
  const tag = element.tagName.toUpperCase();

  if (!ALLOWED_TAGS.has(tag)) {
    const fragment = document.createDocumentFragment();
    element.childNodes.forEach((child) => {
      const clean = sanitizeNode(child);
      if (clean) fragment.appendChild(clean);
    });
    return fragment;
  }

  const clean = document.createElement(tag);
  Array.from(element.attributes).forEach((attribute) => {
    const name = attribute.name.toLowerCase();
    if (name.startsWith('on') || !ALLOWED_ATTRS.has(name)) return;
    if ((name === 'src' || name === 'href') && !SAFE_URL.test(attribute.value.trim())) return;
    if (name === 'style') {
      const style = sanitizeStyle(attribute.value);
      if (style) clean.setAttribute('style', style);
      return;
    }
    clean.setAttribute(name, attribute.value);
  });

  element.childNodes.forEach((child) => {
    const childClean = sanitizeNode(child);
    if (childClean) clean.appendChild(childClean);
  });

  return clean;
}

/**
 * Substitui o conteúdo do contêiner pelo HTML informado após sanitização por allowlist.
 * Não usa innerHTML: os nós são criados via DOM e apenas os permitidos são mantidos.
 */
export function sanitizeDocumentInto(container: HTMLElement, html: string): void {
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  const fragment = document.createDocumentFragment();
  parsed.body.childNodes.forEach((node) => {
    const clean = sanitizeNode(node);
    if (clean) fragment.appendChild(clean);
  });
  container.replaceChildren(fragment);
}
