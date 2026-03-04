import { useState } from 'react';
import { APP_VERSION } from '../version';
import './InvoiceForm.css';

export default function ProfileDrawer({
  open,
  profile,
  eurToAed,
  driveGranted,
  scopes,
  onRateChange,
  onRateReset,
  onCompanyProfile,
  onReauth,
  onSignOut,
  onClose,
}) {
  const name = profile?.name || profile?.given_name || profile?.email?.split('@')[0] || 'User';
  const email = profile?.email || '';
  const picture =
    profile?.picture ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=111c44&color=fff`;

  return (
    <>
      <div className={`drawer-overlay${open ? ' open' : ''}`} onClick={onClose} />
      <aside className={`drawer${open ? ' open' : ''}`} aria-hidden={!open}>
        <header className="drawer-header">
          <h2 style={{ margin: 0 }}>Profile</h2>
          <button
            className="ghost flat"
            onClick={onClose}
            aria-label="Close"
            title="Close"
            style={{ width: 32, height: 32, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}
          >
            <span aria-hidden>×</span>
          </button>
        </header>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
          <img
            src={picture}
            alt={name}
            width={64}
            height={64}
            style={{ borderRadius: '50%', objectFit: 'cover' }}
          />
          <div>
            <div style={{ fontWeight: 700 }}>{name}</div>
            <div style={{ color: '#64748b', fontSize: '0.9rem' }}>{email}</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button className="ghost" onClick={onCompanyProfile}>Company Profile</button>
        </div>

        <hr className="divider" style={{ margin: '1rem 0' }} />

        <ConversionRateSection eurToAed={eurToAed} onRateChange={onRateChange} onRateReset={onRateReset} />

        <hr className="divider" style={{ margin: '1rem 0' }} />

        <PermissionsSection scopes={scopes} driveGranted={driveGranted} onReauth={onReauth} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }} />

        <div style={{ marginTop: 'auto' }}>
          <hr className="divider" style={{ margin: '1rem 0' }} />
          <button style={{ width: '100%' }} onClick={onSignOut}>Sign out</button>
          {APP_VERSION ? (
            <div style={{ textAlign: 'right', color: '#64748b', fontSize: '0.85rem', marginTop: '0.5rem' }}>
              Version {APP_VERSION}
            </div>
          ) : null}
        </div>
      </aside>
    </>
  );
}

function PermissionsSection({ scopes, driveGranted, onReauth }) {
  const [open, setOpen] = useState(false);
  const has = (s) => (scopes || []).includes(s);
  const items = [
    { label: 'Email', ok: has('https://www.googleapis.com/auth/userinfo.email') },
    { label: 'Profile', ok: has('https://www.googleapis.com/auth/userinfo.profile') },
    { label: 'OpenID', ok: (scopes || []).includes('openid') },
    { label: 'Sheets', ok: has('https://www.googleapis.com/auth/spreadsheets') },
    { label: 'Drive', ok: driveGranted || has('https://www.googleapis.com/auth/drive') },
    { label: 'Gmail Send', ok: has('https://www.googleapis.com/auth/gmail.send') },
  ];
  const approved = items.filter((i) => i.ok).length;
  return (
    <div style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <button
          className="ghost flat"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="perms-panel"
          style={{ padding: 0, border: 'none' }}
        >
          <span aria-hidden style={{ display: 'inline-block', width: 12 }}>
            {open ? '▾' : '▸'}
          </span>
          {open ? (
            'Permissions'
          ) : (
            <>
              Permissions{' '}
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '0 0.4rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: 999,
                  fontSize: '0.8rem',
                  lineHeight: 1.6,
                  background: '#f8fafc',
                  color: '#0f172a',
                  minWidth: 34,
                  justifyContent: 'center',
                }}
              >
                {approved}/{items.length}
              </span>
            </>
          )}
        </button>
        <div style={{ flex: 1 }} />
        <button className="ghost" onClick={onReauth}>Re‑authenticate</button>
      </div>
      {open && (
        <div id="perms-panel" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
          {items.map((it) => (
            <div
              key={it.label}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.35rem 0.6rem',
                border: '1px solid #e2e8f0',
                borderRadius: 999,
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: it.ok ? '#10b981' : '#ef4444',
                }}
              />
              <span>{it.label}</span>
              <span style={{ color: '#64748b' }}>{it.ok ? 'granted' : 'missing'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ConversionRateSection({ eurToAed, onRateChange, onRateReset }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <button
          className="ghost flat"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="rate-panel"
          style={{ padding: 0, border: 'none' }}
        >
          <span aria-hidden style={{ display: 'inline-block', width: 12 }}>
            {open ? '▾' : '▸'}
          </span>
          Conversion Rate
        </button>
        <div style={{ flex: 1 }} />
        <button className="ghost" onClick={onRateReset}>Reset</button>
      </div>
      {open && (
        <div id="rate-panel" style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            EUR→AED
            <input
              type="number"
              step="0.01"
              min="0"
              value={eurToAed}
              onChange={(e) => onRateChange(e.target.value)}
              style={{ width: 120 }}
              title="Conversion rate for EUR to AED"
            />
          </label>
        </div>
      )}
    </div>
  );
}
