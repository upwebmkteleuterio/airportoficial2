import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Printer, ReceiptText, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { DEFAULT_PAGE_CONFIG } from '../../utils/documentPage';
import { downloadBlob, renderDocumentToPdfBlob, sanitizeFileName } from '../../utils/documentPdf';
import { sanitizeDocumentInto } from '../../utils/documentRender';
import type { ComprovanteDados } from '../../utils/comprovanteDados';

interface ComprovanteModalProps {
  isOpen: boolean;
  onClose: () => void;
  dados: ComprovanteDados | null;
}

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char);
}

function formatDate(value: string): string {
  const [year, month, day] = value.slice(0, 10).split('-');
  return year && month && day ? `${day}/${month}/${year}` : '—';
}

function criarHtml(dados: ComprovanteDados): string {
  const stamp = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date());
  const parcelas = dados.escopo === 'VENDA' ? (dados.parcelas ?? []).map((parcela) => `<tr>
    <td style="padding:2.5mm;border-bottom:0.2mm solid #d8dee8;text-align:center">${parcela.numero}</td>
    <td style="padding:2.5mm;border-bottom:0.2mm solid #d8dee8">${escapeHtml(formatDate(parcela.vencimento))}</td>
    <td style="padding:2.5mm;border-bottom:0.2mm solid #d8dee8;text-align:right">${escapeHtml(money.format(parcela.valor))}</td>
    <td style="padding:2.5mm;border-bottom:0.2mm solid #d8dee8">${escapeHtml(parcela.situacao)}</td>
  </tr>`).join('') : '';
  const totalParcelas = dados.escopo === 'VENDA' ? `<table style="width:100%;border-collapse:collapse;margin-top:3mm;font-size:9pt">
    <thead><tr style="background:#eef3f8;color:#334155"><th style="padding:2.5mm;text-align:center">Nº</th><th style="padding:2.5mm;text-align:left">Vencimento</th><th style="padding:2.5mm;text-align:right">Valor</th><th style="padding:2.5mm;text-align:left">Situação</th></tr></thead>
    <tbody>${parcelas}</tbody><tfoot><tr><td colspan="2" style="padding:2.5mm;text-align:right;font-weight:bold">Total</td><td style="padding:2.5mm;text-align:right;font-weight:bold">${escapeHtml(money.format(dados.valor))}</td><td></td></tr></tfoot>
  </table>` : '';
  const linha = (label: string, value: string) => `<div style="margin-top:2.5mm"><span style="display:block;margin-bottom:1mm;color:#64748b;font-size:8pt;font-weight:bold;text-transform:uppercase">${label}</span><span style="font-size:10pt;color:#1e293b">${escapeHtml(value || '—')}</span></div>`;
  return `<div style="box-sizing:border-box;width:170mm;min-height:297mm;padding:20mm 0 0;background:#ffffff;color:#1e293b;font-family:Arial,Helvetica,sans-serif;font-size:10pt;line-height:1.45">
    <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:8mm;border-bottom:0.4mm solid #0f766e">
      <img src="/assets/logo-airport.png" alt="Airport Training" style="display:block;width:42mm;height:auto;max-height:28mm;object-fit:contain">
      <div style="text-align:right"><div style="color:#0f766e;font-size:22pt;font-weight:bold;letter-spacing:1pt">RECIBO</div><div style="margin-top:2mm;font-size:11pt;font-weight:bold">Nº ${escapeHtml(dados.numero)}</div><div style="margin-top:1mm;color:#64748b;font-size:9pt">Emissão: ${escapeHtml(formatDate(dados.dataEmissao))}</div></div>
    </div>
    <div style="margin-top:8mm;padding:5mm;border:0.25mm solid #d8dee8;border-radius:2mm"><div style="color:#0f766e;font-size:11pt;font-weight:bold">Pagador</div>
      ${linha('Nome', dados.pagador.nome)}${linha('Documento (CPF/CNPJ)', dados.pagador.documento)}${linha('Tipo', dados.pagador.tipo)}
    </div>
    <div style="margin-top:5mm;padding:5mm;border:0.25mm solid #d8dee8;border-radius:2mm"><div style="color:#0f766e;font-size:11pt;font-weight:bold">Referente a</div>
      ${linha('Descrição', dados.descricao)}${linha('Referência', dados.referencia)}${linha('Forma de pagamento', dados.formaPagamento)}${linha('Conta', dados.conta)}${dados.situacao ? linha('Situação', dados.situacao) : ''}${dados.observacoes ? linha('Observações', dados.observacoes) : ''}
    </div>
    <div style="margin-top:6mm;padding:5mm;background:#eff8f7;border-left:1.2mm solid #0f766e;border-radius:1mm"><div style="color:#475569;font-size:9pt;font-weight:bold;text-transform:uppercase">Valor recebido</div><div style="margin-top:1mm;color:#0f766e;font-size:24pt;font-weight:bold">${escapeHtml(money.format(dados.valor))}</div></div>
    ${totalParcelas ? `<div style="margin-top:7mm"><div style="color:#0f766e;font-size:11pt;font-weight:bold">Parcelas</div>${totalParcelas}</div>` : ''}
    <p style="margin:9mm 0 0;font-size:10pt;line-height:1.7">Para clareza e validade, a Airport Training declara ter recebido de ${escapeHtml(dados.pagador.nome)}, ${escapeHtml(dados.pagador.documento)}, a importância de ${escapeHtml(money.format(dados.valor))} referente a ${escapeHtml(dados.descricao)}.</p>
    <div style="width:85mm;margin:17mm auto 0;padding-top:2mm;border-top:0.25mm solid #64748b;text-align:center;color:#334155;font-size:9pt">Airport Training</div>
    <div style="margin-top:12mm;text-align:center;color:#94a3b8;font-size:8pt">Documento gerado eletronicamente em ${escapeHtml(stamp)}</div>
  </div>`;
}

export function ComprovanteModal({ isOpen, onClose, dados }: ComprovanteModalProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const html = useMemo(() => dados ? criarHtml(dados) : '', [dados]);

  useEffect(() => {
    if (isOpen && previewRef.current && html) sanitizeDocumentInto(previewRef.current, html);
  }, [html, isOpen]);

  const close = () => { if (!isGenerating) onClose(); };
  const baixarPdf = async () => {
    if (!html || !dados || isGenerating) return;
    setErrorMessage('');
    setIsGenerating(true);
    try {
      const blob = await renderDocumentToPdfBlob(html, DEFAULT_PAGE_CONFIG);
      downloadBlob(blob, sanitizeFileName(`Recibo_${dados.numero}_${dados.pagador.nome}`) + '.pdf');
    } catch {
      setErrorMessage('Não foi possível gerar o PDF. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };
  const imprimir = () => {
    if (!html || isGenerating) return;
    const iframe = document.createElement('iframe');
    iframe.setAttribute('title', 'Impressão do comprovante');
    Object.assign(iframe.style, { position: 'fixed', width: '0', height: '0', border: '0', right: '0', bottom: '0' });
    iframe.onload = () => {
      const printWindow = iframe.contentWindow;
      if (!printWindow) { iframe.remove(); return; }
      printWindow.addEventListener('afterprint', () => iframe.remove(), { once: true });
      printWindow.focus();
      printWindow.print();
      window.setTimeout(() => iframe.remove(), 30000);
    };
    document.body.appendChild(iframe);
    const printDocument = iframe.contentDocument;
    if (!printDocument) { iframe.remove(); return; }
    printDocument.open();
    printDocument.write(`<!doctype html><html><head><meta charset="utf-8"><title>Recibo ${escapeHtml(dados?.numero ?? '')}</title></head><body style="margin:0 20mm;background:#fff">${html}</body></html>`);
    printDocument.close();
  };

  return <Modal isOpen={isOpen} onClose={close} ariaLabelledBy="comprovante-title">
    <section data-testid="comprovante-modal" className="relative left-1/2 flex max-h-[90vh] w-[min(95vw,1000px)] max-w-none -translate-x-1/2 flex-col overflow-hidden rounded-xl bg-white shadow-xl dark:bg-slate-900">
      <header className="flex shrink-0 items-center gap-3 border-b border-gray-200 px-5 py-4 dark:border-slate-800">
        <ReceiptText className="h-5 w-5 text-teal-600" aria-hidden="true" />
        <h2 id="comprovante-title" className="flex-1 font-display text-lg font-bold text-slate-900 dark:text-white">Comprovante de pagamento</h2>
        <button type="button" onClick={close} disabled={isGenerating} aria-label="Fechar comprovante" className="rounded p-1 text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:opacity-50 dark:text-slate-400"><X className="h-5 w-5" aria-hidden="true" /></button>
      </header>
      <div className="min-h-0 flex-1 overflow-auto bg-slate-100 p-3 dark:bg-slate-950">
        <div data-testid="comprovante-preview" ref={previewRef} className="mx-auto box-border min-h-[297mm] w-[210mm] bg-white pl-[20mm] shadow-md" />
      </div>
      {errorMessage && <p role="alert" className="mx-5 mt-3 text-sm text-rose-600 dark:text-rose-400">{errorMessage}</p>}
      <footer className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-gray-200 px-5 py-4 dark:border-slate-800">
        <Button type="button" variant="secondary" onClick={close} disabled={isGenerating} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2">Fechar</Button>
        <Button type="button" variant="secondary" onClick={imprimir} disabled={isGenerating} data-testid="comprovante-imprimir" className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2" icon={<Printer className="h-4 w-4" aria-hidden="true" />}>Imprimir</Button>
        <Button type="button" onClick={() => void baixarPdf()} disabled={isGenerating || !dados} data-testid="comprovante-baixar-pdf" className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2" icon={<Download className="h-4 w-4" aria-hidden="true" />}>{isGenerating ? 'Gerando PDF...' : 'Baixar PDF'}</Button>
      </footer>
    </section>
  </Modal>;
}
