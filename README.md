

# Invoice Creator
A React single-page app deployed on S3 + CloudFront that lets you:
- Sign in with Google (restricted to your Gmail account).
- Generate invoices, export PDFs, and log entries into Google Sheets.
- Store all customer data client-side without an additional database.

Key directories:
- `src/` – React components, Google API service helpers, PDF generator.
- `infra/site.yaml` – CloudFormation template for the S3 static site bucket.
- `deploy.sh` – Helper script to deploy the stack and upload the build.
- `.env.example` – Environment variables required for Google auth + Sheets.

---

## Local Development

```bash
cd invoice-portal
cp .env.example .env # fill with your values
npm install
npm run dev
```

To build and deploy:
```bash
npm run build
../deploy.sh <stack-name> <unique-site-bucket>
```

## License
Proprietary – John Huseinovic.
