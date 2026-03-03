import { CONFIG, GOOGLE_SCOPES } from '../config';

const GIS_SRC = 'https://accounts.google.com/gsi/client';
let tokenClient;

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

export function requestAccessToken(prompt = '') {
  if (!tokenClient) throw new Error('Token client is not initialized.');
  tokenClient.requestAccessToken({ prompt });
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

export async function fetchExistingInvoices(token) {
  const { sheetId, sheetTab } = CONFIG;
  const range = encodeURIComponent(`${sheetTab}!A2:O`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (response.status === 404) return [];
  if (!response.ok) throw new Error('Unable to read Google Sheet.');
  const data = await response.json();
  return data.values || [];
}

export async function appendInvoice(token, rowValues) {
  const { sheetId, sheetTab } = CONFIG;
  const range = encodeURIComponent(`${sheetTab}!A:O`);
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
