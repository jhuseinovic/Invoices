import { CONFIG, GOOGLE_SCOPES } from '../config';

const GIS_SRC = 'https://accounts.google.com/gsi/client';
let tokenClient;

const HEADER_VALUES = [
  'Timestamp',
  'Invoice #',
  'Issue Date',
  'Due Date',
  'Customer Name',
  'Customer Email',
  'Customer Address',
  'Subtotal',
  'Tax',
  'Total',
  'Currency',
  'Status',
  'Tax Rate',
  'Items JSON',
  'Notes',
  'Paid Date',
];

const COSTS_HEADER = [
  'Timestamp',
  'Date',
  'Vendor',
  'Category',
  'Amount',
  'Currency',
  'EUR Rate',
  'Notes',
  'File ID',
  'File Name',
  'File Link',
];

function loadGisScript() {
  if (window.google?.accounts) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GIS_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services.'));
    document.head.appendChild(script);
  });
}

export async function initGoogleTokenClient(callback) {
  if (tokenClient) return tokenClient;
  await loadGisScript();
  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: CONFIG.googleClientId,
    scope: GOOGLE_SCOPES.join(' '),
    callback,
  });
  return tokenClient;
}

export function requestAccessToken(options = '') {
  if (!tokenClient) throw new Error('Token client is not initialized.');
  if (typeof options === 'string') {
    tokenClient.requestAccessToken({ prompt: options });
  } else if (options && typeof options === 'object') {
    const { prompt, scope } = options;
    const params = {};
    if (prompt) params.prompt = prompt;
    if (scope) params.scope = scope;
    tokenClient.requestAccessToken(params);
  } else {
    tokenClient.requestAccessToken({});
  }
}

export function revokeAccessToken(token) {
  if (!token) return;
  window.google.accounts.oauth2.revoke(token, () => {});
}

export async function fetchUserProfile(token) {
  const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Unable to fetch Google profile.');
  return response.json();
}

export async function ensureSheetHeader(token) {
  const { sheetId, sheetTab } = CONFIG;
  const getUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(`${sheetTab}!A1:P1`)}`;
  const getResp = await fetch(getUrl, { headers: { Authorization: `Bearer ${token}` } });
  if (getResp.status === 404) {
    throw new Error('Sheet/tab not found. Verify VITE_SHEETS_ID and VITE_SHEETS_TAB.');
  }
  if (getResp.status === 401 || getResp.status === 403) {
    throw new Error('Not authorized to access the Google Sheet.');
  }
  let needUpdate = false;
  if (getResp.ok) {
    const data = await getResp.json().catch(() => ({}));
    const existing = data.values?.[0] || [];
    if (existing.length < HEADER_VALUES.length) needUpdate = true;
    else {
      // compare first few key headers
      const keys = ['Timestamp', 'Invoice #', 'Issue Date', 'Customer Name', 'Total', 'Status', 'Paid Date'];
      needUpdate = keys.some((k) => !existing.includes(k));
    }
  } else {
    needUpdate = true;
  }
  if (!needUpdate) return true;
  const putUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(`${sheetTab}!A1:P1`)}?valueInputOption=USER_ENTERED`;
  const body = JSON.stringify({ values: [HEADER_VALUES] });
  const putResp = await fetch(putUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body,
  });
  if (!putResp.ok) {
    const error = await putResp.json().catch(() => ({}));
    throw new Error(error.error?.message || 'Unable to write header row.');
  }
  return true;
}

export async function ensureCostsHeader(token) {
  const { sheetId, costsTab } = CONFIG;
  const getUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(`${costsTab}!A1:K1`)}`;
  const getResp = await fetch(getUrl, { headers: { Authorization: `Bearer ${token}` } });
  if (getResp.status === 404) {
    throw new Error('Costs tab not found. Create it or set VITE_COSTS_TAB.');
  }
  if (getResp.status === 401 || getResp.status === 403) {
    throw new Error('Not authorized to access the Google Sheet.');
  }
  let needUpdate = false;
  if (getResp.ok) {
    const data = await getResp.json().catch(() => ({}));
    const existing = data.values?.[0] || [];
    if (existing.length < COSTS_HEADER.length) needUpdate = true;
    else {
      const keys = ['Date', 'Vendor', 'Amount', 'Currency'];
      needUpdate = keys.some((k) => !existing.includes(k));
    }
  } else {
    needUpdate = true;
  }
  if (!needUpdate) return true;
  const putUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(`${costsTab}!A1:K1`)}?valueInputOption=USER_ENTERED`;
  const body = JSON.stringify({ values: [COSTS_HEADER] });
  const putResp = await fetch(putUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body,
  });
  if (!putResp.ok) {
    const error = await putResp.json().catch(() => ({}));
    throw new Error(error.error?.message || 'Unable to write Costs header row.');
  }
  return true;
}

export async function fetchCostsRows(token) {
  const { sheetId, costsTab } = CONFIG;
  const range = encodeURIComponent(`${costsTab}!A2:K`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (response.status === 404) throw new Error('Costs tab not found.');
  if (response.status === 401 || response.status === 403) throw new Error('Not authorized to read Costs.');
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || 'Unable to read Costs.');
  }
  const data = await response.json();
  return data.values || [];
}

export async function fetchCostsRates(token) {
  const { sheetId, costsTab } = CONFIG;
  // Expect a horizontal table:
  // Row 1: currency codes in headers starting at column L (e.g., L1=GBP, M1=USD, N1=AED, ...)
  // Row 2: corresponding EUR rates (1 unit of code -> EUR), e.g., L2=1.17, M2=0.92, N2=0.25
  // If not present, returns an empty map and dashboard falls back where applicable.
  const range = encodeURIComponent(`${costsTab}!L1:ZZ2`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) return {};
  const data = await response.json().catch(() => ({}));
  const rows = data.values || [];
  const map = {};
  if (rows.length >= 2) {
    const codes = rows[0] || [];
    const rates = rows[1] || [];
    for (let i = 0; i < codes.length; i++) {
      const code = String(codes[i] || '').trim().toUpperCase();
      const rate = parseFloat(rates[i] || '');
      if (code && Number.isFinite(rate) && rate > 0) {
        map[code] = rate;
      }
    }
  }
  return map;
}

export async function appendCost(token, rowValues) {
  const { sheetId, costsTab } = CONFIG;
  const range = encodeURIComponent(`${costsTab}!A:K`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}:append?valueInputOption=USER_ENTERED`;
  const body = JSON.stringify({ values: [rowValues] });
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || 'Unable to append cost.');
  }
  return response.json();
}

export async function findOrCreateCostsFolder(token) {
  const q = encodeURIComponent("name = 'Business Costs' and mimeType = 'application/vnd.google-apps.folder' and trashed = false");
  const listUrl = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`;
  let res = await fetch(listUrl, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 401 || res.status === 403) {
    // Fallback: upload to root if we can't list files with current scope/policy
    return null;
  }
  if (!res.ok) return null;
  const data = await res.json();
  if (data.files?.length) return data.files[0].id;
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'Business Costs',
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });
  if (!createRes.ok) {
    // If folder cannot be created due to policy, fallback to root
    return null;
  }
  const created = await createRes.json();
  return created.id;
}

export async function uploadCostFile(token, file, folderId) {
  const metadata = folderId
    ? { name: file.name, parents: [folderId] }
    : { name: file.name };
  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelim = `\r\n--${boundary}--`;
  const metadataPart = `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}`;
  const fileBuffer = await file.arrayBuffer();
  const filePartHeader = `${delimiter}Content-Type: ${file.type || 'application/octet-stream'}\r\n\r\n`;
  const body = new Blob([metadataPart, filePartHeader, new Uint8Array(fileBuffer), closeDelim], {
    type: `multipart/related; boundary=${boundary}`,
  });
  const url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink';
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': body.type,
    },
    body,
  });
  if (!response.ok) {
    let msg = 'Unable to upload file to Drive.';
    try {
      const err = await response.json();
      msg = err.error?.message || msg;
    } catch {
      try {
        const txt = await response.text();
        if (txt) msg = txt;
      } catch {}
    }
    throw new Error(msg);
  }
  return response.json();
}

export async function fetchCompanyConfig(token) {
  const { sheetId, companyTab } = CONFIG;
  const range = encodeURIComponent(`${companyTab}!A1:B`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (response.status === 404) return null;
  if (response.status === 401 || response.status === 403) return null;
  if (!response.ok) return null;
  const data = await response.json();
  const rows = data.values || [];
  const map = {};
  rows.forEach((r) => {
    const k = String(r[0] || '').trim().toLowerCase().replace(/\s+/g, '_');
    const v = String(r[1] || '');
    if (k) map[k] = v;
  });
  const company = {
    name: map.name || '',
    address: map.address || '',
    bank: {
      iban: map.iban || '',
      swift: map.swift || '',
      beneficiary: map.beneficiary || '',
    },
    registration_no: map.registration_no || '',
    bookkeeping_email: map.bookkeeping_email || '',
    logo_display: (map.logo_display || 'logo').toLowerCase(), // 'logo' | 'text'
    logo_name: map.logo_name || 'logo_3d.png',
  };
  if (!company.name && !company.address && !company.bank.iban) return null;
  return company;
}
export async function fetchTokenInfo(token) {
  const url = `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${encodeURIComponent(token)}`;
  const resp = await fetch(url);
  if (!resp.ok) return null;
  const data = await resp.json().catch(() => null);
  if (!data) return null;
  const scopes = (data.scope || '').split(/\s+/).filter(Boolean);
  return { scopes };
}
export async function fetchExistingInvoices(token) {
  const { sheetId, sheetTab } = CONFIG;
  const range = encodeURIComponent(`${sheetTab}!A2:P`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (response.status === 404) {
    throw new Error('Sheet/tab not found. Verify VITE_SHEETS_ID and VITE_SHEETS_TAB.');
  }
  if (response.status === 401 || response.status === 403) {
    throw new Error('Not authorized to read the Google Sheet. Check account access and granted scopes.');
  }
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || 'Unable to read Google Sheet.');
  }
  const data = await response.json();
  return data.values || [];
}

export async function appendInvoice(token, rowValues) {
  const { sheetId, sheetTab } = CONFIG;
  const range = encodeURIComponent(`${sheetTab}!A:P`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}:append?valueInputOption=USER_ENTERED`;
  const body = JSON.stringify({ values: [rowValues] });
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || 'Unable to append invoice.');
  }
  return response.json();
}

export async function updateInvoiceStatus(token, rowNumber, status, paidDate = '') {
  const { sheetId, sheetTab } = CONFIG;
  async function updateCell(rangeA1, value) {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(rangeA1)}?valueInputOption=USER_ENTERED`;
    const body = JSON.stringify({ values: [[value]] });
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body,
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `Failed to update ${rangeA1}`);
    }
    return response.json();
  }
  // Status at column L, Paid Date at column P
  await updateCell(`${sheetTab}!L${rowNumber}:L${rowNumber}`, status);
  await updateCell(`${sheetTab}!P${rowNumber}:P${rowNumber}`, status === 'Paid' ? paidDate : '');
  return true;
}

export async function clearInvoiceRow(token, rowNumber) {
  const { sheetId, sheetTab } = CONFIG;
  const range = `${sheetTab}!A${rowNumber}:P${rowNumber}`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}:clear`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || 'Unable to delete invoice row.');
  }
  return true;
}

export async function updateInvoiceRow(token, rowNumber, rowValues) {
  const { sheetId, sheetTab } = CONFIG;
  const range = `${sheetTab}!A${rowNumber}:P${rowNumber}`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
  const body = JSON.stringify({ values: [rowValues] });
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || 'Unable to update invoice.');
  }
  return response.json();
}

export async function saveCompanyConfig(token, company) {
  const { sheetId, companyTab } = CONFIG;
  const rows = [
    ['name', company.name || ''],
    ['address', company.address || ''],
    ['iban', company.bank?.iban || ''],
    ['swift', company.bank?.swift || ''],
    ['beneficiary', company.bank?.beneficiary || ''],
    ['registration_no', company.registration_no || ''],
    ['bookkeeping_email', company.bookkeeping_email || ''],
    ['logo_display', (company.logo_display || 'logo').toLowerCase()],
    ['logo_name', company.logo_name || 'logo_3d.png'],
  ];
  const range = `${companyTab}!A1:B${rows.length}`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
  const body = JSON.stringify({ values: rows, majorDimension: 'ROWS' });
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || 'Unable to save Company profile.');
  }
  return true;
}

function base64UrlEncode(uint8Array) {
  let binary = '';
  for (let i = 0; i < uint8Array.byteLength; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export async function sendInvoiceEmail(token, { to, subject, text, fileName, fileBlob, bcc }) {
  const boundary = 'foo_bar_baz';
  const pdfBytes = new Uint8Array(await fileBlob.arrayBuffer());
  const lines = [];
  lines.push(`From: me`);
  lines.push(`To: ${to}`);
  if (bcc) {
    lines.push(`Bcc: ${bcc}`);
  }
  lines.push(`Subject: ${subject}`);
  lines.push(`MIME-Version: 1.0`);
  lines.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
  lines.push('');
  lines.push(`--${boundary}`);
  lines.push(`Content-Type: text/plain; charset="UTF-8"`);
  lines.push('');
  lines.push(text || '');
  lines.push('');
  lines.push(`--${boundary}`);
  lines.push(`Content-Type: application/pdf; name="${fileName}"`);
  lines.push(`Content-Disposition: attachment; filename="${fileName}"`);
  lines.push(`Content-Transfer-Encoding: base64`);
  lines.push('');
  // Gmail expects standard base64 here; API requires overall raw to be base64url encoded after
  // But we already base64url encoded content; switching to standard for body then overall encode:
  const standardBase64 = btoa(String.fromCharCode(...pdfBytes));
  lines.push(standardBase64);
  lines.push(`--${boundary}--`);
  const mime = lines.join('\r\n');
  const raw = base64UrlEncode(new TextEncoder().encode(mime));
  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to send email.');
  }
  return response.json();
}

export async function updateCostRow(token, rowNumber, rowValues) {
  const { sheetId, costsTab } = CONFIG;
  const range = `${costsTab}!A${rowNumber}:K${rowNumber}`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
  const body = JSON.stringify({ values: [rowValues] });
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || 'Unable to update cost.');
  }
  return response.json();
}

export async function clearCostRow(token, rowNumber) {
  const { sheetId, costsTab } = CONFIG;
  const range = `${costsTab}!A${rowNumber}:K${rowNumber}`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}:clear`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || 'Unable to delete cost row.');
  }
  return true;
}
