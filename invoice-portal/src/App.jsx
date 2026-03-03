import { useEffect, useMemo, useState } from 'react';
import './App.css';
import InvoiceForm from './components/InvoiceForm';
import { CONFIG } from './config';
import {
  appendInvoice,
  fetchExistingInvoices,
  fetchUserProfile,
  initGoogleTokenClient,
  requestAccessToken,
  revokeAccessToken,
} from './services/google';
import { generateInvoicePdf } from './utils/pdf';

const REQUIRED_ENVS = ['VITE_GOOGLE_CLIENT_ID', 'VITE_SHEETS_ID', 'VITE_AUTHORIZED_EMAIL'];

function App() {
  const [auth, setAuth] = useState({ token: null, profile: null, loading: true, error: null });
  const [customers, setCustomers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  useEffect(() => {
    const missing = REQUIRED_ENVS.filter((key) => !import.meta.env[key]);
    if (missing.length) {
      setAuth({ token: null, profile: null, loading: false, error: `Missing env vars: ${missing.join(', ')}` });
      return;
    }
    initGoogleTokenClient(async (tokenResponse) => {
      try {
        const profile = await fetchUserProfile(tokenResponse.access_token);
        if (profile.email?.toLowerCase() !== CONFIG.authorizedEmail) {
          revokeAccessToken(tokenResponse.access_token);
          throw new Error('Access restricted to the configured Google account.');
        }
        setAuth({ token: tokenResponse.access_token, profile, loading: false, error: null });
      } catch (error) {
        setAuth({ token: null, profile: null, loading: false, error: error.message });
      }
    })
      .then(() => setAuth((prev) => ({ ...prev, loading: false })))
      .catch((error) => setAuth({ token: null, profile: null, loading: false, error: error.message }));
  }, []);

  useEffect(() => {
    if (!auth.token) return;
    fetchExistingInvoices(auth.token)
      .then((rows) => setCustomers(dedupeCustomers(rows)))
      .catch((error) => setStatusMessage({ type: 'error', text: error.message }));
  }, [auth.token]);

  const signedIn = Boolean(auth.token && auth.profile);

  async function handleInvoiceSubmit(invoice) {
    if (!auth.token) throw new Error('Not authenticated');
    setSaving(true);
    setStatusMessage(null);
    try {
      const row = buildSheetRow(invoice);
      await appendInvoice(auth.token, row);
      generateInvoicePdf(invoice);
      setStatusMessage({ type: 'success', text: 'Invoice saved to Google Sheets and PDF downloaded.' });
      const rows = await fetchExistingInvoices(auth.token);
      setCustomers(dedupeCustomers(rows));
    } catch (error) {
      setStatusMessage({ type: 'error', text: error.message });
      throw error;
    } finally {
      setSaving(false);
    }
  }

  function handleSignOut() {
    revokeAccessToken(auth.token);
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
        <button onClick={handleSignOut}>Sign out</button>
      </header>

      {statusMessage && <div className={`notice ${statusMessage.type}`}>{statusMessage.text}</div>}

      <InvoiceForm onSubmit={handleInvoiceSubmit} saving={saving} customerOptions={customerOptions} />
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
  ];
}

export default App;
