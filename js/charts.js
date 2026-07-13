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

// One row per label with a horizontal stacked bar (e.g. protein/carbs/fat segments).
// row: { label, segments: [{ value, className, title }], total }
export function stackedBarRows(rows, { max = null } = {}) {
  if (!rows.length) return "<p class='small'>Not enough data yet.</p>";
  const peak = max ?? Math.max(...rows.map(r => r.total), 1);
  return rows.map(r => `
    <div class="bar-row">
      <span>${r.label}</span>
      <div class="bar-bg stacked">
        ${r.segments.map(s => `<div class="stack-seg ${s.className}" style="width:${Math.max(0, (s.value / peak) * 100)}%" title="${s.title}"></div>`).join("")}
      </div>
      <b>${Math.round(r.total)}</b>
    </div>
  `).join("");
}

// Simple donut chart for proportional data (e.g. macro split). Not used for data that
// isn't inherently a share of a whole — bar/line stay the default for trends.
const DONUT_COLOURS = ["var(--accent)", "var(--good)", "var(--warn)", "var(--danger)", "var(--muted)"];
export function donutChart(slices, { size = 160, thickness = 22, formatValue = (v) => v } = {}) {
  const total = slices.reduce((sum, s) => sum + (Number(s.value) || 0), 0);
  if (!total) return "<p class='small'>Not enough data yet.</p>";
  const r = (size - thickness) / 2;
  const cx = size / 2, cy = size / 2;
  const circumference = 2 * Math.PI * r;
  let offset = 0;
  const segments = slices.map((s, i) => {
    const frac = (Number(s.value) || 0) / total;
    const dash = frac * circumference;
    const el = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${s.colour || DONUT_COLOURS[i % DONUT_COLOURS.length]}" stroke-width="${thickness}"
      stroke-dasharray="${dash.toFixed(1)} ${(circumference - dash).toFixed(1)}" stroke-dashoffset="${(-offset).toFixed(1)}" transform="rotate(-90 ${cx} ${cy})">
      <title>${s.label}: ${formatValue(s.value)} (${Math.round(frac * 100)}%)</title></circle>`;
    offset += dash;
    return el;
  }).join("");
  const legend = slices.map((s, i) => `<span class="donut-legend-item"><i class="swatch" style="background:${s.colour || DONUT_COLOURS[i % DONUT_COLOURS.length]}"></i>${s.label} (${Math.round(((Number(s.value) || 0) / total) * 100)}%)</span>`).join("");
  return `<svg class="chart-svg donut-svg" viewBox="0 0 ${size} ${size}" preserveAspectRatio="xMidYMid meet">${segments}</svg><div class="donut-legend">${legend}</div>`;
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
