export const CONFIG = {
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
  authorizedEmail: import.meta.env.VITE_AUTHORIZED_EMAIL?.toLowerCase(),
  sheetId: import.meta.env.VITE_SHEETS_ID,
  sheetTab: import.meta.env.VITE_SHEETS_TAB || 'Invoices',
  company: {
    name: 'Huseinovic Consultancies FZE LLC',
    address: import.meta.env.VITE_COMPANY_ADDRESS || '<<add company address>>',
    bank: {
      iban: 'GB27 REVO 0099 7000 0006 57',
      swift: 'REVOGB21',
      beneficiary: 'JOHN HUSEINOVIC',
    },
  },
  currency: import.meta.env.VITE_DEFAULT_CURRENCY || 'USD',
};

export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'openid',
];
