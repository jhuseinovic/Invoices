import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import dayjs from 'dayjs';
import { CONFIG } from '../config';

export function generateInvoicePdf(invoice) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 40;
  const lineHeight = 18;
  const startY = margin;
  let cursorY = startY;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('INVOICE', margin, cursorY);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  cursorY += lineHeight * 1.5;
  doc.text(CONFIG.company.name, margin, cursorY);
  doc.text(CONFIG.company.address, margin, cursorY + lineHeight);
  doc.text(`IBAN: ${CONFIG.company.bank.iban}`, margin, cursorY + lineHeight * 2);
  doc.text(`SWIFT: ${CONFIG.company.bank.swift}`, margin, cursorY + lineHeight * 3);

  const rightX = 400;
  doc.text(`Invoice #: ${invoice.invoiceNumber}`, rightX, startY + lineHeight);
  doc.text(`Issue date: ${dayjs(invoice.issueDate).format('YYYY-MM-DD')}`, rightX, startY + lineHeight * 2);
  doc.text(`Due date: ${dayjs(invoice.dueDate).format('YYYY-MM-DD')}`, rightX, startY + lineHeight * 3);
  doc.text(`Currency: ${invoice.currency}`, rightX, startY + lineHeight * 4);

  cursorY += lineHeight * 5;
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
    headStyles: { fillColor: [0, 0, 0] },
  });

  const endY = doc.lastAutoTable.finalY + lineHeight;
  doc.setFont('helvetica', 'bold');
  doc.text('Summary', margin, endY);
  doc.setFont('helvetica', 'normal');
  const summaryLines = [
    ['Subtotal', formatMoney(invoice.summary.subtotal, invoice.currency)],
    [`Tax (${invoice.taxRate}% )`, formatMoney(invoice.summary.taxAmount, invoice.currency)],
    ['Total', formatMoney(invoice.summary.total, invoice.currency)],
  ];
  summaryLines.forEach((line, index) => {
    doc.text(line[0], margin, endY + lineHeight * (index + 1));
    doc.text(line[1], 300, endY + lineHeight * (index + 1));
  });

  if (invoice.notes) {
    const notesY = endY + lineHeight * (summaryLines.length + 2);
    doc.setFont('helvetica', 'bold');
    doc.text('Notes', margin, notesY);
    doc.setFont('helvetica', 'normal');
    doc.text(invoice.notes, margin, notesY + lineHeight, { maxWidth: 450 });
  }

  const filename = `Invoice-${invoice.invoiceNumber}.pdf`;
  doc.save(filename);
  return filename;
}

function formatMoney(amount, currency) {
  return new Intl.NumberFormat('en', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount || 0);
}
