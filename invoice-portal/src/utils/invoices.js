export function parseSheetRows(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map((row, idx) => {
    const [
      timestamp,
      invoiceNumber,
      issueDate,
      dueDate,
      customerName,
      customerEmail,
      customerAddress,
      subtotal,
      taxAmount,
      total,
      currency,
      status,
      taxRate,
      itemsJson,
      notes,
      paidDate,
    ] = row;
    let items = [];
    try {
      items = itemsJson ? JSON.parse(itemsJson) : [];
    } catch {
      items = [];
    }
    return {
      __rowIndex: idx + 2,
      timestamp,
      invoiceNumber,
      issueDate,
      dueDate,
      customer: {
        name: customerName || '',
        email: customerEmail || '',
        address: customerAddress || '',
      },
      subtotal: num(subtotal),
      taxAmount: num(taxAmount),
      total: num(total),
      currency: currency || 'USD',
      status: status || 'Draft',
      taxRate: num(taxRate),
      items: Array.isArray(items) ? items : [],
      notes: notes || '',
      paidDate: paidDate || '',
    };
  });
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
