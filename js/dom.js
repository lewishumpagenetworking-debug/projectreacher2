export const $ = (id) => document.getElementById(id);

const escapeMap = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export function esc(value) {
  if (value == null) return "";
  return String(value).replace(/[&<>"']/g, (c) => escapeMap[c]);
}

export function fmt(n, digits = 1) {
  if (n == null || Number.isNaN(n)) return "--";
  return Number(n).toFixed(digits);
}
