import { useEffect, useMemo, useState } from 'react';
import './App.css';
import InvoiceForm from './components/InvoiceForm';
import Dashboard from './components/Dashboard';
import InvoicesTable from './components/InvoicesTable';
import CostsPanel from './components/CostsPanel';
import CompanyProfile from './components/CompanyProfile';
import { CONFIG } from './config';
import {
  appendInvoice,
  fetchExistingInvoices,
  fetchUserProfile,
  initGoogleTokenClient,
  requestAccessToken,
  revokeAccessToken,
} from './services/google';
import { generateInvoicePdf, generateInvoicePdfBlob } from './utils/pdf';
import { getSavedSession, saveSession, clearSession } from './utils/session';
import { parseSheetRows } from './utils/invoices';
import { parseCostsRows } from './utils/costs';
import {
  updateInvoiceStatus,
  ensureSheetHeader,
  clearInvoiceRow,
  ensureCostsHeader,
  fetchCostsRows,
  appendCost,
  findOrCreateCostsFolder,
  uploadCostFile,
  fetchCompanyConfig,
  updateInvoiceRow,
  saveCompanyConfig,
  sendInvoiceEmail,
} from './services/google';

const REQUIRED_ENVS = ['VITE_GOOGLE_CLIENT_ID', 'VITE_SHEETS_ID', 'VITE_AUTHORIZED_EMAIL'];

function App() {
  const [auth, setAuth] = useState({ token: null, profile: null, loading: true, error: null });
  const [customers, setCustomers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [view, setView] = useState('dashboard'); // 'dashboard' | 'invoices' | 'new'
  const [draftInvoice, setDraftInvoice] = useState(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [costs, setCosts] = useState([]);
  const [uploadingCost, setUploadingCost] = useState(false);
  const [company, setCompany] = useState(CONFIG.company);
  const [editingRow, setEditingRow] = useState(null);
  const [companySaving, setCompanySaving] = useState(false);

  useEffect(() => {
    if (!statusMessage) return;
    const ms = statusMessage.type === 'error' ? 7000 : 4000;
    const t = setTimeout(() => setStatusMessage(null), ms);
    return () => clearTimeout(t);
  }, [statusMessage]);

  useEffect(() => {
    const missing = REQUIRED_ENVS.filter((key) => !import.meta.env[key]);
    if (missing.length) {
      setAuth({ token: null, profile: null, loading: false, error: `Missing env vars: ${missing.join(', ')}` });
      return;
    }
    (async () => {
      const saved = getSavedSession();
      if (saved?.token) {
        try {
          const profile = await fetchUserProfile(saved.token);
          if (profile.email?.toLowerCase() === CONFIG.authorizedEmail) {
            setAuth({ token: saved.token, profile, loading: false, error: null });
          } else {
            clearSession();
          }
        } catch {
          clearSession();
        }
      }
      initGoogleTokenClient(async (tokenResponse) => {
        try {
          const profile = await fetchUserProfile(tokenResponse.access_token);
          if (profile.email?.toLowerCase() !== CONFIG.authorizedEmail) {
            revokeAccessToken(tokenResponse.access_token);
            throw new Error('Access restricted to the configured Google account.');
          }
          saveSession({ token: tokenResponse.access_token, profile });
          setAuth({ token: tokenResponse.access_token, profile, loading: false, error: null });
        } catch (error) {
          setAuth({ token: null, profile: null, loading: false, error: error.message });
        }
      })
        .then(() => setAuth((prev) => ({ ...prev, loading: false })))
        .catch((error) => setAuth({ token: null, profile: null, loading: false, error: error.message }));
    })();
  }, []);

  useEffect(() => {
    if (!auth.token) return;
    (async () => {
      try {
        setDataLoading(true);
        await ensureSheetHeader(auth.token);
        const rows = await fetchExistingInvoices(auth.token);
        setCustomers(dedupeCustomers(rows));
        setInvoices(parseSheetRows(rows));
        await ensureCostsHeader(auth.token);
        const costRows = await fetchCostsRows(auth.token);
        setCosts(parseCostsRows(costRows));
        const companyCfg = await fetchCompanyConfig(auth.token);
        if (companyCfg) setCompany(companyCfg);
      } catch (error) {
        setStatusMessage({ type: 'error', text: error.message });
      } finally {
        setDataLoading(false);
      }
    })();
  }, [auth.token]);

  const signedIn = Boolean(auth.token && auth.profile);

  async function handleInvoiceSubmit(invoice) {
    if (!auth.token) throw new Error('Not authenticated');
    setSaving(true);
    setStatusMessage(null);
    try {
      const row = buildSheetRow(invoice);
      if (editingRow) {
        await updateInvoiceRow(auth.token, editingRow, row);
      } else {
        await appendInvoice(auth.token, row);
      }
      generateInvoicePdf(invoice, company);
      setStatusMessage({ type: 'success', text: editingRow ? 'Invoice updated and PDF downloaded.' : 'Invoice saved to Google Sheets and PDF downloaded.' });
      const rows = await fetchExistingInvoices(auth.token);
      setCustomers(dedupeCustomers(rows));
      setInvoices(parseSheetRows(rows));
      setEditingRow(null);
      setDraftInvoice(null);
      setView('invoices');
    } catch (error) {
      setStatusMessage({ type: 'error', text: error.message });
      throw error;
    } finally {
      setSaving(false);
    }
  }

  function handleSignOut() {
    revokeAccessToken(auth.token);
    clearSession();
    setAuth({ token: null, profile: null, loading: false, error: null });
  }

  const customerOptions = useMemo(() => customers, [customers]);

  if (auth.loading) {
    return (
      <div className="auth-card">
        <h1>Loading…</h1>
      </div>
    );
  }

  if (!signedIn) {
    return (
      <div className="auth-card">
        <h1>Secure Invoice Console</h1>
        <p>Sign in with the authorized Google account to continue.</p>
        <button onClick={() => requestAccessToken('consent')}>Sign in with Google</button>
        {auth.error && <div className="notice error">{auth.error}</div>}
      </div>
    );
  }

  return (
    <main>
      <header className="app-header">
        <div>
          <h1>Invoice Generator</h1>
          <p>Signed in as {auth.profile.email}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="ghost" onClick={() => setView('company')}>Company Profile</button>
          <button onClick={handleSignOut}>Sign out</button>
        </div>
      </header>

      {statusMessage && (
        <div
          style={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 12,
            display: 'flex',
            justifyContent: 'center',
            zIndex: 2000,
            pointerEvents: 'none',
          }}
        >
          <div className={`notice ${statusMessage.type}`} style={{ pointerEvents: 'auto', boxShadow: '0 12px 30px rgba(15,23,42,0.18)' }}>
            {statusMessage.text}
          </div>
        </div>
      )}

      <nav className="nav">
        <button className={view === 'dashboard' ? 'active' : ''} onClick={() => setView('dashboard')}>
          Dashboard
        </button>
        <button className={view === 'invoices' ? 'active' : ''} onClick={() => setView('invoices')}>
          Invoices
        </button>
        <button className={view === 'costs' ? 'active' : ''} onClick={() => setView('costs')}>
          Costs
        </button>
        <button className={view === 'new' ? 'active' : ''} onClick={() => setView('new')}>
          New Invoice
        </button>
      </nav>

      {dataLoading && (
        <div className="loading">
          <span className="spinner" /> Loading invoices…
        </div>
      )}

      {view === 'dashboard' && <Dashboard invoices={invoices} costs={costs} />}

      {view === 'invoices' && (
        <InvoicesTable
          invoices={invoices}
          onNew={() => setView('new')}
          onClone={(inv) => {
            const today = new Date();
            const due = new Date(today);
            due.setDate(due.getDate() + 14);
            const cloned = {
              ...inv,
              invoiceNumber: '',
              issueDate: today.toISOString().slice(0, 10),
              dueDate: due.toISOString().slice(0, 10),
              status: 'Draft',
            };
            setDraftInvoice(cloned);
            setView('new');
          }}
          onEdit={(inv) => {
            setDraftInvoice({
              invoiceNumber: inv.invoiceNumber,
              issueDate: inv.issueDate,
              dueDate: inv.dueDate,
              currency: inv.currency,
              customer: inv.customer,
              items: inv.items,
              taxRate: inv.taxRate,
              notes: inv.notes,
              status: inv.status,
              summary: {
                subtotal: inv.subtotal,
                taxAmount: inv.taxAmount,
                total: inv.total,
              },
            });
            setEditingRow(inv.__rowIndex);
            setView('new');
          }}
          onMarkPaid={async (inv) => {
            try {
              const paidDate = new Date().toISOString().slice(0, 10);
              await updateInvoiceStatus(auth.token, inv.__rowIndex, 'Paid', paidDate);
              const rows = await fetchExistingInvoices(auth.token);
              setCustomers(dedupeCustomers(rows));
              setInvoices(parseSheetRows(rows));
              setStatusMessage({ type: 'success', text: `Marked ${inv.invoiceNumber} as Paid` });
            } catch (error) {
              setStatusMessage({ type: 'error', text: error.message });
            }
          }}
          onSend={async (inv) => {
            try {
              if (!inv.customer?.email) {
                setStatusMessage({ type: 'error', text: 'Customer email is missing' });
                return;
              }
              const invoice = {
                invoiceNumber: inv.invoiceNumber,
                issueDate: inv.issueDate,
                dueDate: inv.dueDate,
                currency: inv.currency,
                customer: inv.customer,
                items: inv.items,
                taxRate: inv.taxRate,
                notes: inv.notes,
                status: inv.status,
                summary: {
                  subtotal: inv.subtotal,
                  taxAmount: inv.taxAmount,
                  total: inv.total,
                },
              };
              const { blob, filename } = await generateInvoicePdfBlob(invoice, company);
              const subject = `Invoice ${inv.invoiceNumber} from ${company.name}`;
              const text = `Dear ${inv.customer?.name || ''},\n\nPlease find attached invoice ${inv.invoiceNumber} totaling ${new Intl.NumberFormat('en', { style: 'currency', currency: inv.currency }).format(inv.total)}.\n\nBest regards,\n${company.name}`;
              await sendInvoiceEmail(auth.token, {
                to: inv.customer.email,
                subject,
                text,
                fileName: filename,
                fileBlob: blob,
                bcc: company.bookkeeping_email || undefined,
              });
              await updateInvoiceStatus(auth.token, inv.__rowIndex, 'Sent', '');
              const rows = await fetchExistingInvoices(auth.token);
              setInvoices(parseSheetRows(rows));
              setStatusMessage({ type: 'success', text: `Sent ${inv.invoiceNumber} via email and marked as Sent` });
            } catch (error) {
              setStatusMessage({ type: 'error', text: error.message });
            }
          }}
          onResend={async (inv) => {
            try {
              if (!inv.customer?.email) {
                setStatusMessage({ type: 'error', text: 'Customer email is missing' });
                return;
              }
              const invoice = {
                invoiceNumber: inv.invoiceNumber,
                issueDate: inv.issueDate,
                dueDate: inv.dueDate,
                currency: inv.currency,
                customer: inv.customer,
                items: inv.items,
                taxRate: inv.taxRate,
                notes: inv.notes,
                status: inv.status,
                summary: {
                  subtotal: inv.subtotal,
                  taxAmount: inv.taxAmount,
                  total: inv.total,
                },
              };
              const { blob, filename } = await generateInvoicePdfBlob(invoice, company);
              const subject = `Reminder: Invoice ${inv.invoiceNumber} from ${company.name}`;
              const text = `Dear ${inv.customer?.name || ''},\n\nThis is a friendly reminder for invoice ${inv.invoiceNumber} due on ${inv.dueDate}. The total is ${new Intl.NumberFormat('en', { style: 'currency', currency: inv.currency }).format(inv.total)}.\n\nThe invoice is attached for your convenience.\n\nBest regards,\n${company.name}`;
              await sendInvoiceEmail(auth.token, {
                to: inv.customer.email,
                subject,
                text,
                fileName: filename,
                fileBlob: blob,
                bcc: company.bookkeeping_email || undefined,
              });
              setStatusMessage({ type: 'success', text: `Reminder sent for ${inv.invoiceNumber}` });
            } catch (error) {
              setStatusMessage({ type: 'error', text: error.message });
            }
          }}
          onCancel={async (inv) => {
            try {
              await updateInvoiceStatus(auth.token, inv.__rowIndex, 'Cancelled', '');
              const rows = await fetchExistingInvoices(auth.token);
              setInvoices(parseSheetRows(rows));
              setStatusMessage({ type: 'success', text: `Cancelled ${inv.invoiceNumber}` });
            } catch (error) {
              setStatusMessage({ type: 'error', text: error.message });
            }
          }}
          onDelete={async (inv) => {
            try {
              await clearInvoiceRow(auth.token, inv.__rowIndex);
              const rows = await fetchExistingInvoices(auth.token);
              setCustomers(dedupeCustomers(rows));
              setInvoices(parseSheetRows(rows));
              setStatusMessage({ type: 'success', text: `Deleted ${inv.invoiceNumber}` });
            } catch (error) {
              setStatusMessage({ type: 'error', text: error.message });
            }
          }}
          onDownload={(inv) => {
            try {
              const invoice = {
                invoiceNumber: inv.invoiceNumber,
                issueDate: inv.issueDate,
                dueDate: inv.dueDate,
                currency: inv.currency,
                customer: inv.customer,
                items: inv.items,
                taxRate: inv.taxRate,
                notes: inv.notes,
                status: inv.status,
                summary: {
                  subtotal: inv.subtotal,
                  taxAmount: inv.taxAmount,
                  total: inv.total,
                },
              };
              generateInvoicePdf(invoice, company);
            } catch (error) {
              setStatusMessage({ type: 'error', text: error.message });
            }
          }}
        />
      )}

      {view === 'new' && (
        <InvoiceForm
          onSubmit={handleInvoiceSubmit}
          saving={saving}
          customerOptions={customerOptions}
          initialInvoice={draftInvoice}
        />
      )}

      {view === 'costs' && (
        <CostsPanel
          costs={costs}
          uploading={uploadingCost}
          onAddCost={async ({ date, vendor, category, amount, currency, notes, file }) => {
            try {
              setUploadingCost(true);
              let fileId = '';
              let fileName = '';
              let fileLink = '';
              if (file) {
                const folderId = await findOrCreateCostsFolder(auth.token);
                const uploaded = await uploadCostFile(auth.token, file, folderId);
                fileId = uploaded.id || '';
                fileName = file.name || '';
                fileLink = uploaded.webViewLink || '';
              }
              const row = [
                new Date().toISOString(),
                date,
                vendor,
                category,
                amount,
                currency,
                notes || '',
                fileId,
                fileName,
                fileLink,
              ];
              await appendCost(auth.token, row);
              const costRows = await fetchCostsRows(auth.token);
              setCosts(parseCostsRows(costRows));
              setStatusMessage({ type: 'success', text: 'Cost saved.' });
            } catch (error) {
              setStatusMessage({ type: 'error', text: error.message });
              throw error;
            } finally {
              setUploadingCost(false);
            }
          }}
        />
      )}

      {view === 'company' && (
        <CompanyProfile
          company={company}
          saving={companySaving}
          onSave={async (next) => {
            try {
              setCompanySaving(true);
              await saveCompanyConfig(auth.token, next);
              setCompany(next);
              setStatusMessage({ type: 'success', text: 'Company profile saved.' });
            } catch (error) {
              setStatusMessage({ type: 'error', text: error.message });
            } finally {
              setCompanySaving(false);
            }
          }}
        />
      )}
    </main>
  );
}

function dedupeCustomers(rows) {
  const map = new Map();
  rows.forEach((row) => {
    const [,, , , customerName, customerEmail, customerAddress] = row;
    const key = `${(customerName || '').toLowerCase()}|${(customerEmail || '').toLowerCase()}`;
    if (!customerName) return;
    if (!map.has(key)) {
      map.set(key, {
        name: customerName,
        email: customerEmail || '',
        address: customerAddress || '',
      });
    }
  });
  return Array.from(map.values());
}

function buildSheetRow(invoice) {
  return [
    new Date().toISOString(),
    invoice.invoiceNumber,
    invoice.issueDate,
    invoice.dueDate,
    invoice.customer.name,
    invoice.customer.email,
    invoice.customer.address,
    invoice.summary.subtotal,
    invoice.summary.taxAmount,
    invoice.summary.total,
    invoice.currency,
    invoice.status,
    invoice.taxRate,
    JSON.stringify(invoice.items),
    invoice.notes,
    invoice.status === 'Paid' ? new Date().toISOString().slice(0, 10) : '',
  ];
}

export default App;
