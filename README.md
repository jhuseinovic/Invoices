# Invoice Portal (React + Vite)

Single‑page app to generate invoices as PDFs and log them to Google Sheets. Authenticates with Google Identity Services and restricts access to a configured email. Built with React and Vite; deployable as a static site to S3.

## Features
- Google sign‑in with OAuth2 token client
- Email allowlist check
- Append invoice rows to Google Sheets
- Generate professional PDF via jsPDF + autotable
- Customer memory from prior sheet rows

## Stack
- React 19, Vite 7, @vitejs/plugin-react
- jsPDF, jspdf-autotable, dayjs
- AWS S3 static hosting (optional)

## Prerequisites
1. Google Cloud project with an OAuth 2.0 Client ID (Web).
2. Enabled Google Sheets API.
3. A Google Sheet to store invoices with a tab for data (default: `Invoices`).
4. The email address that is allowed to use the console.

## Setup
1. Copy env template and fill values:
   ```
   cp .env.example .env
   ```
   Required keys:
   - VITE_GOOGLE_CLIENT_ID
   - VITE_AUTHORIZED_EMAIL
   - VITE_SHEETS_ID
   Optional keys:
   - VITE_SHEETS_TAB (default: Invoices)
   - VITE_COMPANY_ADDRESS
   - VITE_DEFAULT_CURRENCY (default: EUR)

2. Install dependencies:
   ```
   npm install
   ```

3. Start dev server:
   ```
   npm run dev
   ```

## Usage
1. Open the app and sign in with the authorized Google account.
2. Fill invoice details, customer, and line items.
3. Submit to:
   - Append a row to Google Sheets
   - Download a PDF locally

## Deployment (AWS S3)
Static hosting is provided via an S3 bucket created by CloudFormation.

```
./deploy.sh <stack-name> <bucket-name>
```

- The bucket name must be globally unique.
- The script builds the app and syncs `dist/` to the bucket website endpoint.

## Project Structure
- [src/main.jsx](src/main.jsx): React entry
- [src/App.jsx](src/App.jsx): Auth, data flow, orchestration
- [src/components/InvoiceForm.jsx](src/components/InvoiceForm.jsx): Form UI and calculations
- [src/services/google.js](src/services/google.js): GIS token client and Sheets calls
- [src/utils/pdf.js](src/utils/pdf.js): PDF generation
- [src/config.js](src/config.js): Configuration and scopes
- [infra/site.yaml](infra/site.yaml), [deploy.sh](deploy.sh): S3 static site infra and deploy

## Notes
- This is a pure client‑side app; no server, database or API proxy is used.
- Ensure the OAuth consent configuration permits the allowed user and scopes.
