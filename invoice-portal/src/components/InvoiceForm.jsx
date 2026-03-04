import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { CONFIG } from '../config';
import './InvoiceForm.css';

const EMPTY_ITEM = { description: '', quantity: 1, rate: 0 };

export default function InvoiceForm({ onSubmit, saving, customerOptions, initialInvoice }) {
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [issueDate, setIssueDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [dueDate, setDueDate] = useState(dayjs().add(14, 'day').format('YYYY-MM-DD'));
  const [currency, setCurrency] = useState(CONFIG.currency);
  const [customer, setCustomer] = useState({ name: '', email: '', address: '' });

  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);
  const [taxRate, setTaxRate] = useState(0);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('Draft');

  useEffect(() => {
    if (!initialInvoice) return;
    setInvoiceNumber(initialInvoice.invoiceNumber || '');
    setIssueDate(initialInvoice.issueDate || dayjs().format('YYYY-MM-DD'));
    setDueDate(initialInvoice.dueDate || dayjs().add(14, 'day').format('YYYY-MM-DD'));
    setCurrency(initialInvoice.currency || CONFIG.currency);
    setCustomer(initialInvoice.customer || { name: '', email: '', address: '' });
    setItems(initialInvoice.items?.length ? initialInvoice.items : [{ ...EMPTY_ITEM }]);
    setTaxRate(
      typeof initialInvoice.taxRate === 'number' ? initialInvoice.taxRate : (Number(initialInvoice.taxRate) || 5),
    );
    setNotes(initialInvoice.notes || '');
    setStatus(initialInvoice.status || 'Draft');
  }, [initialInvoice]);

  useEffect(() => {
    if (!customer.name) {
      setInvoiceNumber('');
      return;
    }
    const slug = slugify(customer.name);
    const date = dayjs(issueDate).format('YYYYMMDD');
    setInvoiceNumber(`${slug}-${date}`);
  }, [customer.name, issueDate]);

  const subtotal = items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.rate) || 0), 0);
  const taxAmount = subtotal * (Number(taxRate) / 100 || 0);
  const total = subtotal + taxAmount;

  const customerNames = useMemo(() => customerOptions.map((c) => c.name), [customerOptions]);

  function handleItemChange(index, field, value) {
    const next = [...items];
    next[index] = { ...next[index], [field]: field === 'description' ? value : Number(value) };
    setItems(next);
  }

  function addLineItem() {
    setItems((prev) => [...prev, { ...EMPTY_ITEM }]);
  }

  function removeLineItem(idx) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleCustomerNameChange(value) {
    setCustomer((prev) => ({ ...prev, name: value }));
    const match = customerOptions.find((c) => c.name === value);
    if (match) setCustomer({ ...match });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const payload = {
      invoiceNumber,
      issueDate,
      dueDate,
      currency,
      customer,
      items: items.filter((item) => item.description.trim()),
      taxRate: Number(taxRate) || 0,
      notes,
      status,
      summary: {
        subtotal,
        taxAmount,
        total,
      },
    };
    try {
      await onSubmit(payload);
      setItems([{ ...EMPTY_ITEM }]);
      setNotes('');
      setStatus('Draft');
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <form className="invoice-form" onSubmit={handleSubmit}>
      <section className="panel">
        <header>
          <h2>Invoice Details</h2>
        </header>
        <div className="grid two invoice-details">
          <label>
            Invoice #
            <input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} required />
          </label>
          <label>
            Status
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option>Draft</option>
              <option>Sent</option>
              <option>Paid</option>
            </select>
          </label>
          <label>
            Issue Date
            <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} required />
          </label>
          <label>
            Due Date
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
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
            Tax
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <input type="number" min="0" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
              <span>%</span>
            </div>
          </label>
        </div>
      </section>

      <section className="panel">
        <header>
          <h2>Customer</h2>
          <p>Select prior customers, or enter a new one.</p>
        </header>
        <div className="grid one">
          <label>
            Company / Client Name
            <input
              list="customer-list"
              value={customer.name}
              onChange={(e) => handleCustomerNameChange(e.target.value)}
              placeholder="Acme Corp"
              required
            />
            <datalist id="customer-list">
              {customerNames.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </label>
          <label>
            Contact Email
            <input type="email" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} />
          </label>
          <label>
            Address
            <textarea value={customer.address} onChange={(e) => setCustomer({ ...customer, address: e.target.value })} />
          </label>
        </div>
      </section>

      <section className="panel">
        <header>
          <h2>Line Items</h2>
        </header>
        <div className="line-items">
          {items.map((item, idx) => (
            <div className="line" key={`item-${idx}`}>
              <input
                placeholder="Description"
                value={item.description}
                onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                required
              />
              <input
                type="number"
                min="0"
                placeholder="Qty"
                value={item.quantity}
                onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
              />
              <input
                type="number"
                min="0"
                placeholder="Rate"
                value={item.rate}
                onChange={(e) => handleItemChange(idx, 'rate', e.target.value)}
              />
              {items.length > 1 && (
                <button type="button" className="ghost" onClick={() => removeLineItem(idx)}>
                  Remove
                </button>
              )}
            </div>
          ))}
          <button type="button" className="ghost" onClick={addLineItem}>
            + Add line item
          </button>
        </div>
      </section>

      <section className="panel">
        <header>
          <h2>Notes</h2>
        </header>
        <textarea
          className="textarea-plain"
          placeholder="Payment terms, thank you message, etc."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </section>

      <section className="panel summary">
        <div>
          <p>Subtotal: <strong>{formatCurrency(subtotal, currency)}</strong></p>
          <p>Tax: <strong>{formatCurrency(taxAmount, currency)}</strong></p>
          <p>Total: <strong>{formatCurrency(total, currency)}</strong></p>
        </div>
        <button type="submit" disabled={saving}>
          {saving ? (<><span className="btn-spinner" />Saving…</>) : 'Generate PDF & Save'}
        </button>
      </section>
    </form>
  );
}

function formatCurrency(value, currency) {
  return new Intl.NumberFormat('en', { style: 'currency', currency }).format(value || 0);
}

function slugify(value) {
  const cleaned = (value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return cleaned || 'invoice';
}
