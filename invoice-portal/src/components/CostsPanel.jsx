import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import './InvoiceForm.css';

export default function CostsPanel({ costs, onAddCost, uploading }) {
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [vendor, setVendor] = useState('');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState(null);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return costs;
    return costs.filter((c) => {
      const hay = `${c.vendor} ${c.category} ${c.notes}`.toLowerCase();
      return hay.includes(q);
    });
  }, [costs, query]);

  async function handleSubmit(e) {
    e.preventDefault();
    await onAddCost({
      date,
      vendor,
      category,
      amount: Number(amount) || 0,
      currency,
      notes,
      file,
    });
    setVendor('');
    setCategory('');
    setAmount('');
    setNotes('');
    setFile(null);
  }

  return (
    <>
      <section className="panel">
        <header>
          <h2>Add Cost</h2>
        </header>
        <form onSubmit={handleSubmit} className="grid two">
          <label>
            Date
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </label>
          <label>
            Vendor
            <input value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="Vendor or merchant" required />
          </label>
          <label>
            Category
            <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Category" />
          </label>
          <label>
            Amount
            <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </label>
          <label>
            Currency
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} required>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="USD">USD</option>
              <option value="AED">AED</option>
              <option value="BAM">BAM</option>
              <option value="ZAR">ZAR</option>
              <option value="AUD">AUD</option>
            </select>
          </label>
          <label>
            Notes
            <input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
          <label>
            Receipt / Invoice
            <input
              type="file"
              accept="image/*,application/pdf"
              capture="environment"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </label>
          <div style={{ alignSelf: 'end' }}>
            <button type="submit" disabled={uploading}>
              {uploading ? (<><span className="btn-spinner" />Saving…</>) : 'Save Cost'}
            </button>
          </div>
        </form>
      </section>

      <section className="panel" style={{ marginTop: '1rem' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>Costs</h2>
          <input
            placeholder="Search vendor, category, notes"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ width: 280 }}
          />
        </header>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Vendor</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Currency</th>
                <th>Notes</th>
                <th>Attachment</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={`${c.__rowIndex}-${c.timestamp}`}>
                  <td>{c.date}</td>
                  <td>{c.vendor}</td>
                  <td>{c.category}</td>
                  <td>{formatMoney(c.amount, c.currency)}</td>
                  <td>{c.currency}</td>
                  <td>{c.notes}</td>
                  <td>
                    {c.fileLink ? (
                      <a href={c.fileLink} target="_blank" rel="noreferrer">Open</a>
                    ) : (
                      '-'
                    )}
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: '#64748b' }}>No costs found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function formatMoney(amount, currency) {
  return new Intl.NumberFormat('en', {
    style: 'currency',
    currency: currency || 'EUR',
    minimumFractionDigits: 2,
  }).format(amount || 0);
}
