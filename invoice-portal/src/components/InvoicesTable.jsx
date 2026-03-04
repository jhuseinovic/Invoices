import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import dayjs from 'dayjs';
import './InvoiceForm.css';

export default function InvoicesTable({ invoices, onClone, onNew, onMarkPaid, onSend, onCancel, onDelete, onDownload, onEdit, onResend, eurToAed = 0 }) {
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState('issueDate');
  const [dir, setDir] = useState('desc');
  const [openMenu, setOpenMenu] = useState(null); // { id, top, left }

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
    const base = q
      ? invoices.filter((i) => {
          const hay = `${i.invoiceNumber} ${i.customer?.name} ${i.customer?.email}`.toLowerCase();
          return hay.includes(q);
        })
      : invoices;
    return base.sort((a, b) => comparator(sortKey, dir)(a, b));
  }, [invoices, query, sortKey, dir]);

  function changeSort(key) {
    if (key === sortKey) {
      setDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setDir('asc');
    }
  }

  return (
    <section className="panel">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0 }}>Invoices</h2>
        </div>
        <button onClick={onNew}>+ New Invoice</button>
      </header>
      <div style={{ marginBottom: '0.75rem' }}>
        <input
          placeholder="Search by invoice #, customer, or email"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ width: '100%' }}
        />
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <Th onClick={() => changeSort('invoiceNumber')} active={sortKey === 'invoiceNumber'} dir={dir}>
                Invoice #
              </Th>
              <Th onClick={() => changeSort('issueDate')} active={sortKey === 'issueDate'} dir={dir}>
                Issue Date
              </Th>
              <Th onClick={() => changeSort('customer')} active={sortKey === 'customer'} dir={dir}>
                Customer
              </Th>
              <Th onClick={() => changeSort('total')} active={sortKey === 'total'} dir={dir}>
                Total
              </Th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((i) => {
              const rowKey = `${i.invoiceNumber}-${i.timestamp}`;
              const actions = buildActions(i, { onClone, onDownload, onSend, onDelete, onCancel, onMarkPaid, onEdit, onResend });
              return (
              <tr key={rowKey}>
                <td>{i.invoiceNumber}</td>
                <td>{dispDate(i.issueDate)}</td>
                <td>
                  <div>{i.customer?.name}</div>
                  <div style={{ color: '#64748b', fontSize: '0.85rem' }}>{i.customer?.email}</div>
                </td>
                <td>
                  <div>{fmt(i.total, i.currency)}</div>
                  {i.currency?.toUpperCase() === 'EUR' && eurToAed > 0 && (
                    <div style={{ color: '#64748b', fontSize: '0.85rem' }}>
                      ≈ {fmt((Number(i.total) || 0) * eurToAed, 'AED')} @ {eurToAed}
                    </div>
                  )}
                </td>
                <td>
                  <div>{i.status}</div>
                  {i.paidDate && <div style={{ color: '#64748b', fontSize: '0.85rem' }}>Paid: {dispDate(i.paidDate)}</div>}
                </td>
                <td>
                  {actions.length === 1 ? (
                    <button className="ghost" onClick={actions[0].onClick}>{actions[0].label}</button>
                  ) : (
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <button
                        className="ghost"
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const top = rect.bottom + window.scrollY + 4;
                          const left = rect.right + window.scrollX - 180;
                          setOpenMenu((m) => (m?.id === rowKey ? null : { id: rowKey, top, left }));
                        }}
                        aria-haspopup="menu"
                        aria-expanded={openMenu?.id === rowKey}
                      >
                        Actions ▾
                      </button>
                      {openMenu?.id === rowKey &&
                        createPortal(
                          <div
                            role="menu"
                            className="menu"
                            style={{
                              position: 'fixed',
                              top: openMenu.top,
                              left: openMenu.left,
                              minWidth: 160,
                              border: '1px solid #e2e8f0',
                              borderRadius: 8,
                              boxShadow: '0 20px 45px rgba(15, 23, 42, 0.15)',
                              zIndex: 1000,
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {actions.map((a) => (
                              <div
                                key={a.label}
                                role="menuitem"
                                className="menu-item"
                                onClick={() => {
                                  setOpenMenu(null);
                                  a.onClick();
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    setOpenMenu(null);
                                    a.onClick();
                                  }
                                }}
                                tabIndex={0}
                              >
                                {a.label}
                              </div>
                            ))}
                          </div>,
                          document.body
                        )}
                    </div>
                  )}
                </td>
              </tr>
            )})}
            {!filtered.length && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: '#64748b' }}>
                  No invoices found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Th({ children, onClick, active, dir }) {
  return (
    <th onClick={onClick} style={{ cursor: 'pointer' }}>
      {children} {active ? (dir === 'asc' ? '▲' : '▼') : ''}
    </th>
  );
}

function buildActions(i, handlers) {
  const acts = [];
  acts.push({ label: 'Clone', onClick: () => handlers.onClone(i) });
  acts.push({ label: 'Download', onClick: () => handlers.onDownload(i) });
  if (i.status === 'Draft') {
    acts.push({ label: 'Edit', onClick: () => handlers.onEdit(i) });
    acts.push({ label: 'Send', onClick: () => handlers.onSend(i) });
    acts.push({ label: 'Delete', onClick: () => handlers.onDelete(i) });
  }
  if (i.status === 'Sent') {
    acts.push({ label: 'Re-send', onClick: () => handlers.onResend(i) });
    acts.push({ label: 'Cancel', onClick: () => handlers.onCancel(i) });
    acts.push({ label: 'Mark Paid', onClick: () => handlers.onMarkPaid(i) });
  }
  return acts;
}

function comparator(key, dir) {
  const mul = dir === 'asc' ? 1 : -1;
  return (a, b) => {
    let av;
    let bv;
    switch (key) {
      case 'invoiceNumber':
        av = a.invoiceNumber || '';
        bv = b.invoiceNumber || '';
        return av.localeCompare(bv) * mul;
      case 'customer':
        av = a.customer?.name || '';
        bv = b.customer?.name || '';
        return av.localeCompare(bv) * mul;
      case 'total':
        av = a.total || 0;
        bv = b.total || 0;
        return (av - bv) * mul;
      case 'issueDate':
      default:
        av = dayjs(a.issueDate || a.timestamp).valueOf();
        bv = dayjs(b.issueDate || b.timestamp).valueOf();
        return (av - bv) * mul;
    }
  };
}

function fmt(value, currency = 'USD') {
  return new Intl.NumberFormat('en', { style: 'currency', currency }).format(value || 0);
}

function dispDate(dateStr) {
  const d = dayjs(dateStr);
  return d.isValid() ? d.format('YYYY-MM-DD') : '-';
}
