export function parseCostsRows(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map((row, idx) => {
    const [
      timestamp,
      date,
      vendor,
      category,
      amount,
      currency,
      notes,
      fileId,
      fileName,
      fileLink,
    ] = row;
    return {
      __rowIndex: idx + 2,
      timestamp,
      date,
      vendor: vendor || '',
      category: category || '',
      amount: num(amount),
      currency: currency || 'EUR',
      notes: notes || '',
      fileId: fileId || '',
      fileName: fileName || '',
      fileLink: fileLink || '',
    };
  });
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
