import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import dayjs from 'dayjs';
import { CONFIG } from '../config';
const LOGO_MAP = import.meta.glob('../assets/*.{png,jpg,jpeg,webp}', { eager: true, import: 'default', query: '?inline' });

function createInvoiceDoc(invoice, companyOverride) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 40;
  const lineHeight = 18;
  const startY = margin;
  let cursorY = startY;
  const companyCfg = companyOverride || CONFIG.company;

  doc.setFillColor(17, 28, 68);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 54, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.text('INVOICE', margin, 36);
  doc.setTextColor(15, 23, 42);
  const logoData = CONFIG.companyLogo && LOGO_MAP[`../assets/${CONFIG.companyLogo}`] ? LOGO_MAP[`../assets/${CONFIG.companyLogo}`] : null;
  const headerY = 90;
  let logoW = 120;
  let logoH = 120;
  if (CONFIG.companyLogo && logoData) {
    try {
      doc.addImage(logoData, 'PNG', margin-10, headerY-30, logoW, logoH);
    } catch (e) {
      void e;
    }
  }

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');

  const metaX = 360;
  const metaY = 70;
  const metaW = doc.internal.pageSize.getWidth() - metaX - margin;
  const metaH = 100;
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(metaX, metaY, metaW, metaH, 8, 8);
  doc.setFont('helvetica', 'bold');
  doc.text('Invoice Details', metaX + 12, metaY + 18);
  doc.setFont('helvetica', 'normal');
  doc.text(`Invoice #: ${invoice.invoiceNumber}`, metaX + 12, metaY + 36);
  doc.text(`Issue date: ${dayjs(invoice.issueDate).format('YYYY-MM-DD')}`, metaX + 12, metaY + 36 + lineHeight);
  doc.text(`Due date: ${dayjs(invoice.dueDate).format('YYYY-MM-DD')}`, metaX + 12, metaY + 36 + lineHeight * 2);
  doc.text(`Currency: ${invoice.currency}`, metaX + 12, metaY + 36 + lineHeight * 3);

  const hasLogo = Boolean(CONFIG.companyLogo && logoData);
  const billX = hasLogo ? (margin - 10 + logoW + 50) : margin;
  const billY = headerY;
  doc.setFont('helvetica', 'bold');
  doc.text('Bill To', billX, billY);
  doc.setFont('helvetica', 'normal');
  const customer = invoice.customer;
  const customerLines = [customer.name, customer.email, customer.address].filter(Boolean);
  customerLines.forEach((line, index) => {
    doc.text(line, billX, billY + lineHeight * (index + 1));
  });

  const billBottom = billY + lineHeight * (customerLines.length + 1);
  const headerBottom = Math.max(hasLogo ? (headerY - 30 + logoH) : headerY, metaY + metaH, billBottom);
  cursorY = headerBottom + 16;

  cursorY += lineHeight * (0 + 2);
  const tableBody = invoice.items.map((item, idx) => [
    idx + 1,
    item.description,
    item.quantity,
    formatMoney(item.rate, invoice.currency),
    formatMoney(item.quantity * item.rate, invoice.currency),
  ]);

  autoTable(doc, {
    startY: cursorY,
    head: [['#', 'Description', 'Qty', 'Rate', 'Amount']],
    body: tableBody,
    theme: 'striped',
    styles: { fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: [17, 28, 68], halign: 'left', valign: 'middle', textColor: 255 },
    columnStyles: {
      0: { halign: 'center', cellWidth: 28 },
      2: { halign: 'right', cellWidth: 50 },
      3: { halign: 'right', cellWidth: 80 },
      4: { halign: 'right', cellWidth: 90 },
    },
  });

  const endY = doc.lastAutoTable.finalY + lineHeight;
  const sumBoxW = 220;
  const sumBoxX = doc.internal.pageSize.getWidth() - margin - sumBoxW;
  const sumBoxY = endY;
  const items = [
    ['Subtotal', formatMoney(invoice.summary.subtotal, invoice.currency)],
    [`Tax (${invoice.taxRate}% )`, formatMoney(invoice.summary.taxAmount, invoice.currency)],
    ['Total', formatMoney(invoice.summary.total, invoice.currency)],
  ];
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(sumBoxX, sumBoxY, sumBoxW, lineHeight * (items.length + 2), 8, 8);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary', sumBoxX + 12, sumBoxY + lineHeight);
  doc.setFont('helvetica', 'normal');
  items.forEach((line, idx) => {
    const y = sumBoxY + lineHeight * (idx + 2);
    doc.text(line[0], sumBoxX + 12, y);
    doc.text(line[1], sumBoxX + sumBoxW - 12, y, { align: 'right' });
  });

  let notesBottom = 0;
  if (invoice.notes) {
    const notesY = sumBoxY + lineHeight * (items.length + 3);
    doc.setFont('helvetica', 'bold');
    doc.text('Notes', margin, notesY);
    doc.setFont('helvetica', 'normal');
    doc.text(invoice.notes, margin, notesY + lineHeight, { maxWidth: 450 });
    notesBottom = notesY + lineHeight;
  }

  const contentBottom = Math.max(sumBoxY + lineHeight * (items.length + 2), notesBottom);
  const addrLines = (companyCfg.address || '').split('\n').filter(Boolean);
  const payableLines = 3 + (companyCfg.bank?.beneficiary ? 1 : 0);
  const payableHeight = lineHeight * payableLines;
  const companyDetailsHeight = 8 + lineHeight + (companyCfg.registration_no ? lineHeight : 0) + addrLines.length * lineHeight;
  const footerBlockHeight = payableHeight + companyDetailsHeight;

  const pageHeight = doc.internal.pageSize.getHeight();
  let footerY = pageHeight - margin - footerBlockHeight;
  const minFooterY = contentBottom + lineHeight * 2;
  if (footerY < minFooterY) footerY = minFooterY;

  doc.setDrawColor(226, 232, 240);
  doc.line(margin, footerY - lineHeight, doc.internal.pageSize.getWidth() - margin, footerY - lineHeight);
  doc.setFont('helvetica', 'bold');
  // const profileName = invoice.billFrom?.bankName || companyCfg.name;
  doc.text('Payable To', margin, footerY);
  doc.setFont('helvetica', 'normal');
  doc.text(companyCfg.name, margin, footerY + lineHeight);
  const bank = invoice.billFrom?.bank || companyCfg.bank;
  doc.text(`IBAN: ${bank?.iban || ''}`, margin, footerY + lineHeight * 2);
  doc.text(`SWIFT: ${bank?.swift || ''}`, margin + 220, footerY + lineHeight * 2);
  if (bank?.beneficiary) {
    doc.text(`Beneficiary: ${bank.beneficiary}`, margin + 220, footerY + lineHeight);
  }

  const detailsY = footerY + payableHeight + 8;
  doc.setFont('helvetica', 'bold');
  doc.text('Company Details', margin, detailsY);
  doc.setFont('helvetica', 'normal');
  let y = detailsY + lineHeight;
  if (companyCfg.registration_no) {
    doc.text(`Registration No: ${companyCfg.registration_no}`, margin, y);
    y += lineHeight;
  }
  addrLines.forEach((l, idx) => {
    if (l) doc.text(l, margin, y + lineHeight * idx);
  });

  const filename = `Invoice-${invoice.invoiceNumber}.pdf`;
  return { doc, filename };
}

export function generateInvoicePdf(invoice, companyOverride) {
  const { doc, filename } = createInvoiceDoc(invoice, companyOverride);
  doc.save(filename);
  return filename;
}

export async function generateInvoicePdfBlob(invoice, companyOverride) {
  const { doc, filename } = createInvoiceDoc(invoice, companyOverride);
  const blob = new Blob([doc.output('arraybuffer')], { type: 'application/pdf' });
  return { blob, filename };
}

function formatMoney(amount, currency) {
  const value = Number(amount) || 0;
  const nf = new Intl.NumberFormat('en', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  });
  try {
    const parts = nf.formatToParts(value);
    let out = '';
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (p.type === 'currency') {
        const next = parts[i + 1];
        const needsSpace =
          next && (next.type === 'integer' || next.type === 'group' || next.type === 'minusSign' || next.type === 'plusSign');
        out += p.value + (needsSpace ? ' ' : '');
      } else {
        out += p.value;
      }
    }
    return out;
  } catch {
    const formatted = nf.format(value);
    return formatted.replace(/^([^\d\s])(?=\d)/, '$1 ');
  }
}
