export const CONFIG = {
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
  authorizedEmail: import.meta.env.VITE_AUTHORIZED_EMAIL?.toLowerCase(),
  sheetId: import.meta.env.VITE_SHEETS_ID,
  sheetTab: import.meta.env.VITE_SHEETS_TAB || 'Invoices',
  costsTab: import.meta.env.VITE_COSTS_TAB || 'Costs',
  companyTab: import.meta.env.VITE_COMPANY_TAB || 'Company',
  currency: import.meta.env.VITE_DEFAULT_CURRENCY || 'EUR',
  eurToAed: parseFloat(import.meta.env.VITE_EUR_TO_AED) || 4.0,
  companyLogo: import.meta.env.VITE_COMPANY_LOGO || false,
};

export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'openid',
  'https://www.googleapis.com/auth/drive.file',
];
