import React from 'react';

export default function Charts({ incomeMonthly, costsMonthly, currency }) {
  const width = 800;
  const height = 260;
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const months = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
  const maxVal = Math.max(
    1,
    ...incomeMonthly,
    ...costsMonthly,
  );
  const scaleX = (i) => padding.left + (i / 11) * (width - padding.left - padding.right);
  const scaleY = (v) => padding.top + (1 - v / maxVal) * (height - padding.top - padding.bottom);
  const incomePoints = incomeMonthly.map((v, i) => [scaleX(i), scaleY(v)]);
  const costsPoints = costsMonthly.map((v, i) => [scaleX(i), scaleY(v)]);
  const toPath = (pts) =>
    pts.map((p, idx) => `${idx ? 'L' : 'M'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');

  return (
    <section className="panel" style={{ overflowX: 'auto' }}>
      <header>
        <h2>Annual Income vs Costs ({currency})</h2>
      </header>
      <svg width={width} height={height} role="img" aria-label="Income and costs line chart">
        {/* axes */}
        <line x1={padding.left} y1={padding.top} x2={padding.left} y2={height - padding.bottom} stroke="#e2e8f0" />
        <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} stroke="#e2e8f0" />
        {/* month ticks */}
        {months.map((m, i) => (
          <text key={m} x={scaleX(i)} y={height - padding.bottom + 18} fontSize="10" textAnchor="middle" fill="#64748b">
            {m}
          </text>
        ))}
        {/* lines */}
        <path d={toPath(incomePoints)} fill="none" stroke="#111c44" strokeWidth="2" />
        <path d={toPath(costsPoints)} fill="none" stroke="#ef4444" strokeWidth="2" />
        {/* legend */}
        <rect x={width - 180} y={padding.top} width="10" height="10" fill="#111c44" />
        <text x={width - 165} y={padding.top + 9} fontSize="12">Income</text>
        <rect x={width - 110} y={padding.top} width="10" height="10" fill="#ef4444" />
        <text x={width - 95} y={padding.top + 9} fontSize="12">Costs</text>
      </svg>
    </section>
  );
}
