import dayjs from 'dayjs';
import Charts from './Charts';
import './InvoiceForm.css';

export default function Dashboard({ invoices, costs, eurToAed }) {
  const totalProfit = sum(invoices.map((i) => i.total));
  const annualProfit = sum(
    invoices.filter((i) => year(i.issueDate) === dayjs().year()).map((i) => i.total),
  );
  const last = latestInvoice(invoices);
  const lastPaid = latestPaid(invoices);
  const rateNum = Number(eurToAed) || 0;
  const totalAED = toAED(invoices, rateNum);
  const annualAED = toAED(invoices.filter((i) => year(i.issueDate) === dayjs().year()), rateNum);
  const lastAmountAED = toAED(last ? [last] : [], rateNum);
  const totalCosts = sum(costs.map((c) => toEURAmountCost(c, rateNum)));
  const annualCosts = sum(costs.filter((c) => year(c.date) === dayjs().year()).map((c) => toEURAmountCost(c, rateNum)));

  return (
    <section className="panel">
      <header>
        <h2 style={{ margin: 0 }}>Dashboard</h2>
      </header>
      <div className="dashboard-cards">
        <Card title="Total Profit" value={fmt(totalProfit, last?.currency)} subValue={`≈ ${fmt(totalAED, 'AED')}`} />
        <Card title="Annual Profit" value={fmt(annualProfit, last?.currency)} subValue={`≈ ${fmt(annualAED, 'AED')}`} />
        <Card title="Last Invoiced Amount" value={fmt(last?.total || 0, last?.currency)} subValue={`≈ ${fmt(lastAmountAED, 'AED')}`} />
        <Card title="Last Invoiced Date" value={dispDate(last?.issueDate)} />
        <Card title="Last Paid Date" value={dispDate(lastPaid?.paidDate)} />
      </div>
      <div className="dashboard-cards" style={{ marginTop: '1rem', marginBottom: '1rem' }}>
        <Card title="Total Costs" value={fmt(totalCosts, 'EUR')} />
        <Card title="Annual Costs" value={fmt(annualCosts, 'EUR')} />
      </div>
      <Charts
        incomeMonthly={monthlySumsEUR(invoices, rateNum)}
        costsMonthly={monthlySumsCostsEUR(costs, rateNum)}
        currency="EUR"
      />
    </section>
  );
}

function Card({ title, value, subValue }) {
  return (
    <div className="card">
      <div className="card-title">{title}</div>
      <div className="card-value">{value}</div>
      {subValue ? <div className="card-subvalue">{subValue}</div> : null}
    </div>
  );
}

function fmt(value, currency = 'USD') {
  return new Intl.NumberFormat('en', { style: 'currency', currency }).format(value || 0);
}

function sum(arr) {
  return arr.reduce((a, b) => a + (Number(b) || 0), 0);
}

function year(dateStr) {
  const d = dayjs(dateStr);
  return d.isValid() ? d.year() : null;
}

function latestInvoice(invoices) {
  if (!invoices?.length) return null;
  return [...invoices].sort((a, b) => {
    const da = dayjs(a.issueDate || a.timestamp);
    const db = dayjs(b.issueDate || b.timestamp);
    return db.valueOf() - da.valueOf();
  })[0];
}

function dispDate(dateStr) {
  const d = dayjs(dateStr);
  return d.isValid() ? d.format('YYYY-MM-DD') : '-';
}

function latestPaid(invoices) {
  const paid = (invoices || []).filter((i) => i.status === 'Paid' && i.paidDate);
  if (!paid.length) return null;
  return paid.sort((a, b) => {
    const da = dayjs(a.paidDate);
    const db = dayjs(b.paidDate);
    return db.valueOf() - da.valueOf();
  })[0];
}

function toAED(invoices, rate) {
  const r = Number(rate) || 0;
  if (!r) return 0;
  return invoices.reduce((sum, i) => {
    if (!i) return sum;
    if ((i.currency || '').toUpperCase() === 'EUR') return sum + (Number(i.total) || 0) * r;
    if ((i.currency || '').toUpperCase() === 'AED') return sum + (Number(i.total) || 0);
    return sum;
  }, 0);
}

function toEURAmount(amount, currency, eurToAed) {
  const amt = Number(amount) || 0;
  const cur = (currency || '').toUpperCase();
  if (cur === 'EUR') return amt;
  if (cur === 'AED') return amt / (Number(eurToAed) || 1);
  return 0;
}

function monthlySumsEUR(invoices, eurToAed) {
  const arr = Array(12).fill(0);
  invoices.forEach((i) => {
    const d = dayjs(i.issueDate);
    if (!d.isValid() || d.year() !== dayjs().year()) return;
    const m = d.month();
    const val = toEURAmount(i.total, i.currency, eurToAed);
    arr[m] += val;
  });
  return arr;
}

function monthlySumsCostsEUR(costs, eurToAed) {
  const arr = Array(12).fill(0);
  costs.forEach((c) => {
    const d = dayjs(c.date);
    if (!d.isValid() || d.year() !== dayjs().year()) return;
    const m = d.month();
    arr[m] += toEURAmountCost(c, eurToAed);
  });
  return arr;
}

function toEURAmountCost(c, eurToAed) {
  const amt = Number(c.amount) || 0;
  const cur = (c.currency || '').toUpperCase();
  if (cur === 'EUR') return amt;
  const r = Number(c.eurRate) || 0;
  if (r > 0) return amt * r;
  if (cur === 'AED') return amt / (Number(eurToAed) || 1);
  return 0;
}
