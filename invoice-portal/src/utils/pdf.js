import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import dayjs from 'dayjs';
import { CONFIG } from '../config';

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

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  cursorY = 70;
  doc.text(companyCfg.name, margin, cursorY);
  if (companyCfg.registration_no) {
    doc.text(`Registration No: ${companyCfg.registration_no}`, margin, cursorY += lineHeight);
  }
  const addressLines = (companyCfg.address || '').split('\n');
  addressLines.forEach((l, idx) => {
    doc.text(l, margin, cursorY + lineHeight * (idx + 1));
  });

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

  cursorY = Math.max(cursorY + lineHeight * (addressLines.length + 2), metaY + metaH + 16);
  doc.setFont('helvetica', 'bold');
  doc.text('Bill To', margin, cursorY);
  doc.setFont('helvetica', 'normal');
  const customer = invoice.customer;
  const customerLines = [customer.name, customer.email, customer.address].filter(Boolean);
  customerLines.forEach((line, index) => {
    doc.text(line, margin, cursorY + lineHeight * (index + 1));
  });

  cursorY += lineHeight * (customerLines.length + 2);
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

  if (invoice.notes) {
    const notesY = sumBoxY + lineHeight * (items.length + 3);
    doc.setFont('helvetica', 'bold');
    doc.text('Notes', margin, notesY);
    doc.setFont('helvetica', 'normal');
    doc.text(invoice.notes, margin, notesY + lineHeight, { maxWidth: 450 });
  }

  const pageHeight = doc.internal.pageSize.getHeight();
  const footerY = pageHeight - margin - lineHeight * 3;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, footerY - lineHeight, doc.internal.pageSize.getWidth() - margin, footerY - lineHeight);
  doc.setFont('helvetica', 'bold');
  doc.text('Payable To', margin, footerY);
  doc.setFont('helvetica', 'normal');
  doc.text(companyCfg.name, margin, footerY + lineHeight);
  doc.text(`IBAN: ${companyCfg.bank?.iban || ''}`, margin, footerY + lineHeight * 2);
  doc.text(`SWIFT: ${companyCfg.bank?.swift || ''}`, margin + 220, footerY + lineHeight * 2);
  if (companyCfg.bank?.beneficiary) {
    doc.text(`Beneficiary: ${companyCfg.bank.beneficiary}`, margin + 220, footerY + lineHeight);
  }


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
  return new Intl.NumberFormat('en', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount || 0);
}
