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
  }, [company]);

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

        <label style={{ gridColumn: 'span 2' }}>
          IBAN
          <input value={iban} onChange={(e) => setIban(e.target.value)} />
        </label>
        <label>
          SWIFT
          <input value={swift} onChange={(e) => setSwift(e.target.value)} />
        </label>
        <label>
          Beneficiary
          <input value={beneficiary} onChange={(e) => setBeneficiary(e.target.value)} />
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
