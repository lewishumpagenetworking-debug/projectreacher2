// Minimal dependency-free SVG chart helpers, styled by the existing .chart-svg/.line/.axis/.dot rules in style.css.

export function lineChart(points, { width = 600, height = 200, pad = 28, labelEvery = 1, formatLabel = (v) => v, formatValue = (v) => v } = {}) {
  if (!points.length) return "<p class='small'>Not enough data yet.</p>";
  const values = points.map(p => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = points.length > 1 ? (width - pad * 2) / (points.length - 1) : 0;

  const coords = points.map((p, i) => {
    const x = pad + i * stepX;
    const y = height - pad - ((p.value - min) / range) * (height - pad * 2);
    return { x, y, p };
  });

  const path = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  const dots = coords.map(c => `<circle class="dot" cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="4"><title>${formatLabel(c.p.label)}: ${formatValue(c.p.value)}</title></circle>`).join("");
  const labels = coords
    .filter((_, i) => i % labelEvery === 0 || i === coords.length - 1)
    .map(c => `<text class="chart-label" x="${c.x.toFixed(1)}" y="${height - 6}" text-anchor="middle">${formatLabel(c.p.label)}</text>`)
    .join("");

  return `
    <svg class="chart-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">
      <line class="axis" x1="${pad}" y1="${height - pad}" x2="${width - pad}" y2="${height - pad}" />
      <path class="line" d="${path}" fill="none" />
      ${dots}
      ${labels}
    </svg>`;
}

export function barRows(rows, { max = null, formatValue = (v) => v } = {}) {
  if (!rows.length) return "<p class='small'>Not enough data yet.</p>";
  const peak = max ?? Math.max(...rows.map(r => r.value), 1);
  return rows.map(r => `
    <div class="bar-row">
      <span>${r.label}</span>
      <div class="bar-bg"><div style="width:${Math.max(2, Math.min(100, (r.value / peak) * 100))}%"></div></div>
      <b>${formatValue(r.value)}</b>
    </div>
  `).join("");
}
