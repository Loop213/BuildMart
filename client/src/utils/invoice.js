import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { request } from "../api/http";
import { InvoiceDocument } from "../components/InvoiceDocument";

function getInvoiceStyles() {
  return `
    * { box-sizing: border-box; }
    body { margin: 0; background: #eef2f7; color: #111827; font-family: Arial, Helvetica, sans-serif; }
    .invoice-shell { padding: 24px; display: flex; justify-content: center; }
    .invoice-actions { max-width: 210mm; margin: 0 auto; padding: 20px 24px 0; display: flex; justify-content: flex-end; gap: 12px; }
    .invoice-actions button { border: none; border-radius: 999px; padding: 12px 18px; font-weight: 700; cursor: pointer; }
    .invoice-actions .primary { background: #111827; color: #fff; }
    .invoice-actions .secondary { background: #dbe4f0; color: #111827; }
    .invoice-page { width: 210mm; min-height: 297mm; background: #fff; padding: 18mm 16mm; box-shadow: 0 30px 80px rgba(15, 23, 42, 0.16); }
    .invoice-header, .invoice-grid, .invoice-summary-wrap, .invoice-signature-section { display: grid; gap: 18px; }
    .invoice-header { grid-template-columns: 1.4fr 0.85fr; align-items: start; }
    .invoice-company { display: flex; gap: 18px; }
    .invoice-logo { width: 72px; height: 72px; object-fit: cover; border-radius: 20px; border: 1px solid #dbe4f0; }
    .invoice-logo-fallback { display: flex; align-items: center; justify-content: center; background: #1d4ed8; color: #fff; font-weight: 800; font-size: 24px; }
    .invoice-company h1 { margin: 8px 0 10px; font-size: 30px; line-height: 1.1; }
    .invoice-company p { margin: 4px 0; color: #475569; font-size: 13px; line-height: 1.5; }
    .invoice-eyebrow { margin: 0 0 6px; color: #2563eb; font-size: 11px; letter-spacing: 0.22em; text-transform: uppercase; font-weight: 700; }
    .invoice-meta, .invoice-card { border: 1px solid #dbe4f0; border-radius: 20px; background: #f8fafc; }
    .invoice-meta { padding: 18px; display: grid; gap: 14px; }
    .invoice-meta span { display: block; margin-bottom: 6px; font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: #64748b; }
    .invoice-meta strong { font-size: 14px; word-break: break-word; }
    .invoice-grid { grid-template-columns: repeat(3, 1fr); margin-top: 22px; }
    .invoice-card { padding: 16px; }
    .invoice-strong { font-weight: 700; color: #0f172a; margin: 0 0 4px; }
    .invoice-card p { margin: 4px 0; font-size: 13px; color: #475569; line-height: 1.5; }
    .invoice-section { margin-top: 22px; }
    .invoice-section-head h2 { margin: 6px 0 0; font-size: 20px; }
    .invoice-table { width: 100%; border-collapse: collapse; border: 1px solid #dbe4f0; border-radius: 18px; overflow: hidden; }
    .invoice-table th, .invoice-table td { border-bottom: 1px solid #e2e8f0; padding: 12px 10px; text-align: left; font-size: 12px; vertical-align: top; }
    .invoice-table th { background: #f8fafc; color: #475569; text-transform: uppercase; letter-spacing: 0.08em; font-size: 11px; }
    .invoice-summary-wrap { grid-template-columns: 1fr 1fr; margin-top: 22px; }
    .invoice-summary-row { display: flex; justify-content: space-between; gap: 16px; margin: 10px 0; font-size: 13px; color: #475569; }
    .invoice-summary-row strong { color: #0f172a; }
    .invoice-summary-total { margin-top: 16px; padding-top: 16px; border-top: 1px dashed #cbd5e1; }
    .invoice-summary-total strong, .invoice-summary-total span { font-size: 16px; font-weight: 800; color: #0f172a; }
    .text-red { color: #dc2626 !important; }
    .text-green { color: #16a34a !important; }
    .invoice-signature-section { grid-template-columns: 1fr 1fr; margin-top: 24px; }
    .invoice-sign-card { min-height: 150px; }
    .invoice-signature-image, .invoice-stamp-image { max-height: 90px; max-width: 100%; object-fit: contain; margin-top: 12px; }
    .invoice-placeholder { margin-top: 12px; min-height: 90px; border: 1px dashed #cbd5e1; border-radius: 16px; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 12px; }
    .invoice-footer { margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 16px; }
    .invoice-footer p { margin: 6px 0; font-size: 12px; color: #64748b; line-height: 1.6; }
    @media print {
      body { background: #fff; }
      .invoice-actions { display: none !important; }
      .invoice-shell { padding: 0; }
      .invoice-page { box-shadow: none; width: 100%; min-height: auto; padding: 12mm; }
      @page { size: A4; margin: 8mm; }
    }
  `;
}

export async function printInvoice(orderOrId) {
  const orderId = typeof orderOrId === "string" ? orderOrId : orderOrId?._id;
  if (!orderId) {
    throw new Error("Order ID is required");
  }

  const invoice = await request(`/orders/${orderId}/invoice`);
  const invoiceWindow = window.open("", "_blank", "width=1100,height=900");
  if (!invoiceWindow) {
    throw new Error("Unable to open invoice window");
  }

  const markup = renderToStaticMarkup(createElement(InvoiceDocument, { invoice }));
  invoiceWindow.document.write(`
    <html>
      <head>
        <title>${invoice.order.invoiceNumber}</title>
        <style>${getInvoiceStyles()}</style>
      </head>
      <body>
        <div class="invoice-actions">
          <button class="secondary" onclick="window.print()">Download / Save PDF</button>
          <button class="primary" onclick="window.print()">Print Invoice</button>
        </div>
        <div class="invoice-shell">${markup}</div>
      </body>
    </html>
  `);
  invoiceWindow.document.close();
}
