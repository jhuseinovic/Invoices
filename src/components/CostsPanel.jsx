import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import dayjs from 'dayjs';
import './InvoiceForm.css';

export default function CostsPanel({ costs, onSaveCost, onDeleteCost, uploading, hasDrive, onReauth, eurToAed = 0 }) {
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [vendor, setVendor] = useState('');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [eurRate, setEurRate] = useState('');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState(null);
  const [query, setQuery] = useState('');
  const [editingRow, setEditingRow] = useState(null);
  const [openMenu, setOpenMenu] = useState(null); // { id, top, left }
  const [sortKey, setSortKey] = useState('date');
  const [dir, setDir] = useState('desc');

  useEffect(() => {
    if (!openMenu) return;
    const close = () => setOpenMenu(null);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    window.addEventListener('blur', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
      window.removeEventListener('blur', close);
    };
  }, [openMenu]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return costs;
    return costs.filter((c) => {
      const hay = `${c.vendor} ${c.category} ${c.notes}`.toLowerCase();
      return hay.includes(q);
    });
  }, [costs, query]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const mul = dir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      switch (sortKey) {
        case 'date': {
          const da = dayjs(a.date).valueOf() || 0;
          const db = dayjs(b.date).valueOf() || 0;
          return (da - db) * mul;
        }
        case 'vendor': {
          const av = (a.vendor || '').toLowerCase();
          const bv = (b.vendor || '').toLowerCase();
          return av.localeCompare(bv) * mul;
        }
        case 'category': {
          const av = (a.category || '').toLowerCase();
          const bv = (b.category || '').toLowerCase();
          return av.localeCompare(bv) * mul;
        }
        case 'amount': {
          const av = Number(a.amount) || 0;
          const bv = Number(b.amount) || 0;
          return (av - bv) * mul;
        }
        case 'currency': {
          const av = (a.currency || '').toLowerCase();
          const bv = (b.currency || '').toLowerCase();
          return av.localeCompare(bv) * mul;
        }
        case 'eurRate': {
          const av = Number(a.eurRate) || 0;
          const bv = Number(b.eurRate) || 0;
          return (av - bv) * mul;
        }
        default:
          return 0;
      }
    });
    return arr;
  }, [filtered, sortKey, dir]);

  function changeSort(key) {
    if (key === sortKey) {
      setDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setDir('asc');
    }
  }

  const categoryTotals = useMemo(() => {
    const totals = new Map();
    (filtered || []).forEach((c) => {
      const eur = toEURAmountCost(c, eurToAed);
      const key = c.category || 'Uncategorized';
      totals.set(key, (totals.get(key) || 0) + eur);
    });
    return Array.from(totals.entries()).sort((a, b) => b[1] - a[1]);
  }, [filtered, eurToAed]);

  async function handleSubmit(e) {
    e.preventDefault();
    await onSaveCost({
      date,
      vendor,
      category,
      amount: Number(amount) || 0,
      currency,
      eurRate: Number(eurRate) || 0,
      notes,
      file,
      rowIndex: editingRow,
    });
    setVendor('');
    setCategory('');
    setAmount('');
    setEurRate('');
    setNotes('');
    setFile(null);
    setEditingRow(null);
  }

  return (
    <>
      <section className="panel">
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>{editingRow ? 'Edit Cost' : 'Add Cost'}</h2>
          {editingRow && (
            <button
              className="ghost"
              onClick={() => {
                setEditingRow(null);
                setDate(dayjs().format('YYYY-MM-DD'));
                setVendor('');
                setCategory('');
                setAmount('');
                setCurrency('EUR');
                setNotes('');
                setFile(null);
              }}
            >
              Cancel
            </button>
          )}
        </header>
        {!hasDrive && (
          <div className="notice" style={{ background: '#fff7ed', color: '#9a3412', border: '1px solid #fed7aa', borderRadius: 12 }}>
            Drive permission not granted. File uploads are disabled. Click “Re‑authenticate Google” in Configure, or
            <button className="ghost" onClick={onReauth} style={{ marginLeft: '0.5rem' }}>Re‑authenticate now</button>
          </div>
        )}
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
            EUR Rate
            <input
              type="number"
              step="0.0001"
              value={eurRate}
              onChange={(e) => setEurRate(e.target.value)}
              placeholder="e.g., 1.15"
              disabled={currency === 'EUR'}
              title="Conversion: 1 unit in selected currency equals this many EUR"
            />
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
              disabled={!hasDrive}
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
                <Th onClick={() => changeSort('date')} active={sortKey === 'date'} dir={dir}>Date</Th>
                <Th onClick={() => changeSort('vendor')} active={sortKey === 'vendor'} dir={dir}>Vendor</Th>
                <Th onClick={() => changeSort('category')} active={sortKey === 'category'} dir={dir}>Category</Th>
                <Th onClick={() => changeSort('amount')} active={sortKey === 'amount'} dir={dir}>Amount</Th>
                <Th onClick={() => changeSort('currency')} active={sortKey === 'currency'} dir={dir}>Currency</Th>
                <Th onClick={() => changeSort('eurRate')} active={sortKey === 'eurRate'} dir={dir}>EUR Rate</Th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((c) => (
                <tr key={`${c.__rowIndex}-${c.timestamp}`}>
                  <td>{c.date}</td>
                  <td>{c.vendor}</td>
                  <td>{c.category}</td>
                  <td>{formatMoney(c.amount, c.currency)}</td>
                  <td>{c.currency}</td>
                  <td>{c.eurRate ? Number(c.eurRate).toFixed(4) : '-'}</td>
                  <td>
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <button
                        className="ghost"
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const top = rect.bottom + window.scrollY + 4;
                          const left = rect.right + window.scrollX - 160;
                          setOpenMenu((m) => (m?.id === c.__rowIndex ? null : { id: c.__rowIndex, top, left }));
                        }}
                        aria-haspopup="menu"
                        aria-expanded={openMenu?.id === c.__rowIndex}
                      >
                        Actions ▾
                      </button>
                      {openMenu?.id === c.__rowIndex &&
                        createPortal(
                          <div
                            role="menu"
                            className="menu"
                            style={{
                              position: 'fixed',
                              top: openMenu.top,
                              left: openMenu.left,
                              minWidth: 140,
                              border: '1px solid #e2e8f0',
                              borderRadius: 8,
                              boxShadow: '0 20px 45px rgba(15, 23, 42, 0.15)',
                              zIndex: 1000,
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div
                              className="menu-item"
                              role="menuitem"
                              onClick={() => {
                                setOpenMenu(null);
                                setDate(c.date || dayjs().format('YYYY-MM-DD'));
                                setVendor(c.vendor || '');
                                setCategory(c.category || '');
                                setAmount(String(c.amount || ''));
                                setCurrency(c.currency || 'EUR');
                                setEurRate(String(c.eurRate || ''));
                                setNotes(c.notes || '');
                                setFile(null);
                                setEditingRow(c.__rowIndex);
                              }}
                              tabIndex={0}
                            >
                              Edit
                            </div>
                           {c.fileLink && (
                             <div
                               className="menu-item"
                               role="menuitem"
                               onClick={() => {
                                 setOpenMenu(null);
                                 window.open(c.fileLink, '_blank', 'noopener,noreferrer');
                               }}
                               tabIndex={0}
                             >
                               Download Attachment
                             </div>
                           )}
                            <div
                              className="menu-item"
                              role="menuitem"
                              onClick={() => {
                                setOpenMenu(null);
                                onDeleteCost(c.__rowIndex);
                              }}
                              tabIndex={0}
                            >
                              Delete
                            </div>
                          </div>,
                          document.body
                        )}
                    </div>
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

      {categoryTotals.length > 0 && (
        <section className="panel" style={{ marginTop: '1rem', overflowX: 'auto' }}>
          <header>
            <h2>Costs by Category (EUR)</h2>
          </header>
          <CategoryBars data={categoryTotals} />
        </section>
      )}
    </>
  );
}

function toEURAmountCost(c, eurToAed) {
  const amt = Number(c.amount) || 0;
  const cur = (c.currency || '').toUpperCase();
  if (cur === 'EUR') return amt;
  const r = Number(c.eurRate) || 0;
  if (r > 0) return amt * r;
  if (cur === 'AED') return amt / (Number(eurToAed) || 1);
  return 0;
}

function CategoryBars({ data }) {
  const svgRef = useRef(null);
  const [width, setWidth] = useState(800);
  useEffect(() => {
    const el = svgRef.current?.parentElement;
    if (!el) return;
    const measure = () => setWidth(Math.max(300, el.getBoundingClientRect().width));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('orientationchange', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('orientationchange', measure);
    };
  }, []);
  const barHeight = 22;
  const gap = 8;
  const padding = { top: 20, right: 20, bottom: 20, left: 160 };
  const maxVal = Math.max(1, ...data.map(([, v]) => v));
  const height = padding.top + padding.bottom + data.length * (barHeight + gap);
  const scaleX = (v) => (v / maxVal) * (width - padding.left - padding.right);
  return (
    <svg
      ref={svgRef}
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Costs by Category"
    >
      <line x1={padding.left} y1={padding.top} x2={padding.left} y2={height - padding.bottom} stroke="#e2e8f0" />
      {data.map(([label, value], i) => {
        const y = padding.top + i * (barHeight + gap);
        const w = scaleX(value);
        const valueLabel = new Intl.NumberFormat('en', { style: 'currency', currency: 'EUR' }).format(value);
        const rightLimit = width - padding.right - 6;
        const prefer = padding.left + w + 6;
        const useEnd = prefer + 60 > rightLimit; // rough padding for label length
        const tx = useEnd ? rightLimit : prefer;
        const ta = useEnd ? 'end' : 'start';
        return (
          <g key={label}>
            <text x={padding.left - 6} y={y + barHeight * 0.7} fontSize="12" textAnchor="end" fill="#64748b">
              {label}
            </text>
            <rect x={padding.left} y={y} width={w} height={barHeight} fill="#ef4444" rx="4" />
            <text x={tx} y={y + barHeight * 0.7} fontSize="12" fill="#0f172a" textAnchor={ta}>
              {valueLabel}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function formatMoney(amount, currency) {
  return new Intl.NumberFormat('en', {
    style: 'currency',
    currency: currency || 'EUR',
    minimumFractionDigits: 2,
  }).format(amount || 0);
}

function Th({ children, onClick, active, dir }) {
  return (
    <th onClick={onClick} style={{ cursor: 'pointer' }}>
      {children} {active ? (dir === 'asc' ? '▲' : '▼') : ''}
    </th>
  );
}
