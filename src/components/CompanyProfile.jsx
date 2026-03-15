import { useEffect, useState } from 'react';
import './InvoiceForm.css';

export default function CompanyProfile({ company, onSave, saving }) {
  const [name, setName] = useState(company?.name || '');
  const [address, setAddress] = useState(company?.address || '');
  const [iban, setIban] = useState(company?.bank?.iban || '');
  const [swift, setSwift] = useState(company?.bank?.swift || '');
  const [beneficiary, setBeneficiary] = useState(company?.bank?.beneficiary || '');
  const [registrationNo, setRegistrationNo] = useState(company?.registration_no || '');
  const [bookkeepingEmail, setBookkeepingEmail] = useState(company?.bookkeeping_email || '');
  const [logoDisplay, setLogoDisplay] = useState((company?.logo_display || 'logo').toLowerCase());
  const [logoName, setLogoName] = useState(company?.logo_name || 'logo_3d.png');
  const [profiles, setProfiles] = useState(Array.isArray(company?.profiles) ? company.profiles : []);
  const [selectedKey, setSelectedKey] = useState(
    (Array.isArray(company?.profiles) && company.profiles[0]?.key) || ''
  );

  useEffect(() => {
    setName(company?.name || '');
    setAddress(company?.address || '');
    setIban(company?.bank?.iban || '');
    setSwift(company?.bank?.swift || '');
    setBeneficiary(company?.bank?.beneficiary || '');
    setRegistrationNo(company?.registration_no || '');
    setBookkeepingEmail(company?.bookkeeping_email || '');
    setLogoDisplay((company?.logo_display || 'logo').toLowerCase());
    setLogoName(company?.logo_name || 'logo_3d.png');
    setProfiles(Array.isArray(company?.profiles) ? company.profiles : []);
    try {
      const first = Array.isArray(company?.profiles) ? company.profiles[0]?.key : '';
      setSelectedKey(first || '');
    } catch (e) { void e }
  }, [company]);

  const selectedProfile = profiles.find((pr) => pr.key === selectedKey) || profiles[0] || null;

  return (
    <section className="panel">
      <header>
        <h2>Company Profile</h2>
      </header>
      <div className="grid two">
        <label style={{ gridColumn: 'span 2' }}>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          Registration No
          <input value={registrationNo} onChange={(e) => setRegistrationNo(e.target.value)} />
        </label>
        <label className="grid one" style={{ gridColumn: '1 / -1' }}>
          Address
          <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={4} />
        </label>

        <label style={{ gridColumn: '1 / -1' }}>
          Bookkeeping Email (BCC)
          <input type="email" value={bookkeepingEmail} onChange={(e) => setBookkeepingEmail(e.target.value)} />
        </label>
        <label>
          Header Display
          <select value={logoDisplay} onChange={(e) => setLogoDisplay(e.target.value)}>
            <option value="logo">Logo + text</option>
            <option value="text">Text only</option>
          </select>
        </label>
        <label>
          Logo file name
          <input value={logoName} onChange={(e) => setLogoName(e.target.value)} placeholder="e.g. logo_3d.png" />
        </label>

        <section style={{ gridColumn: '1 / -1' }}>
          <h3>Bank Profiles</h3>
          <p>Create multiple bank profiles and select one per invoice.</p>
          <div className="grid two" style={{ alignItems: 'end', marginBottom: '0.5rem' }}>
            <label>
              Select Profile
              <select value={selectedKey} onChange={(e) => setSelectedKey(e.target.value)}>
                {profiles.map((p) => (
                  <option key={p.key} value={p.key}>{p.alias || p.bankName || p.key}</option>
                ))}
              </select>
            </label>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="ghost"
                onClick={() => {
                  setProfiles((prev) => prev.filter((pr) => pr.key !== selectedKey));
                  const nextFirst = profiles.find((pr) => pr.key !== selectedKey)?.key || '';
                  setSelectedKey(nextFirst);
                }}
                disabled={!selectedProfile}
              >
                Remove Selected
              </button>
            </div>
          </div>
          {selectedProfile ? (
            <div className="grid three" style={{ alignItems: 'end', marginBottom: '0.5rem' }}>
              <label>
                Alias
                <input
                  value={selectedProfile.alias || ''}
                  onChange={(e) => {
                    const next = profiles.map((pr) => pr.key === selectedKey ? { ...pr, alias: e.target.value } : pr);
                    setProfiles(next);
                  }}
                />
              </label>
              <label>
                Bank Name
                <input
                  value={selectedProfile.bankName || ''}
                  onChange={(e) => {
                    const next = profiles.map((pr) => pr.key === selectedKey ? { ...pr, bankName: e.target.value } : pr);
                    setProfiles(next);
                  }}
                />
              </label>
              <label>
                IBAN
                <input
                  value={selectedProfile.bank?.iban || ''}
                  onChange={(e) => {
                    const next = profiles.map((pr) =>
                      pr.key === selectedKey ? { ...pr, bank: { ...pr.bank, iban: e.target.value } } : pr
                    );
                    setProfiles(next);
                  }}
                />
              </label>
              <label>
                SWIFT
                <input
                  value={selectedProfile.bank?.swift || ''}
                  onChange={(e) => {
                    const next = profiles.map((pr) =>
                      pr.key === selectedKey ? { ...pr, bank: { ...pr.bank, swift: e.target.value } } : pr
                    );
                    setProfiles(next);
                  }}
                />
              </label>
              <label>
                Beneficiary
                <input
                  value={selectedProfile.bank?.beneficiary || ''}
                  onChange={(e) => {
                    const next = profiles.map((pr) =>
                      pr.key === selectedKey ? { ...pr, bank: { ...pr.bank, beneficiary: e.target.value } } : pr
                    );
                    setProfiles(next);
                  }}
                />
              </label>
            </div>
          ) : (
            <p style={{ color: '#64748b' }}>No profiles yet. Add one below.</p>
          )}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" className="ghost" onClick={() => {
              const key = `profile-${Date.now()}`;
              setProfiles((prev) => [...prev, { key, alias: '', bankName: '', bank: { iban: '', swift: '', beneficiary: '' } }]);
              setSelectedKey(key);
            }}>+ Add Profile</button>
          </div>
        </section>

        <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={() =>
              onSave({
                name,
                address,
                registration_no: registrationNo,
                bookkeeping_email: bookkeepingEmail,
                logo_display: logoDisplay,
                logo_name: logoName,
                profiles,
                bank: { iban, swift, beneficiary },
              })
            }
            disabled={saving}
          >
            {saving ? (<><span className="btn-spinner" />Saving…</>) : 'Save Company Profile'}
          </button>
        </div>
      </div>
    </section>
  );
}
