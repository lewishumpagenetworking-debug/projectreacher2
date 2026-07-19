// Per-peptide export (Peptide Recovery Tracking, spec section 40). Bundles everything
// linked to a single peptide record — the plan the user built, not a recommendation this
// app is making — into a file they fully control.
import { getPeptideRecord, getSchedulesForPeptide, getLogsForPeptide, displayStatusLabel } from "./peptides.js";
import { getReportsForPeptide, getMarkersForReport } from "./bloodwork.js";
import { getSourcesForPeptide, getVialsForPeptide } from "./peptide-product.js";
import { getReferencesForPeptide } from "./peptide-references.js";
import { getHistoryFor } from "./change-history.js";

function downloadBlob(content, mimeType, filename) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function slugify(name) {
  return (name || "peptide").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "peptide";
}

function buildPeptideBundle(data, peptideId) {
  const record = getPeptideRecord(data, peptideId);
  if (!record) return null;
  const schedules = getSchedulesForPeptide(data, peptideId);
  const logs = getLogsForPeptide(data, peptideId);
  const bloodworkReports = getReportsForPeptide(data, peptideId).map(r => ({ ...r, markers: getMarkersForReport(data, r.id) }));
  const sources = getSourcesForPeptide(data, peptideId);
  const vials = getVialsForPeptide(data, peptideId);
  const references = getReferencesForPeptide(data, peptideId);
  const history = [
    ...getHistoryFor(data, "peptideRecord", peptideId),
    ...logs.flatMap(l => getHistoryFor(data, "administrationLog", l.id))
  ];
  return { record, schedules, logs, bloodworkReports, sources, vials, references, history };
}

export function exportPeptideAsJson(data, peptideId) {
  const bundle = buildPeptideBundle(data, peptideId);
  if (!bundle) return;
  downloadBlob(JSON.stringify(bundle, null, 2), "application/json", `${slugify(bundle.record.name)}-export-${new Date().toISOString().slice(0, 10)}.json`);
}

export function exportPeptideAsMarkdown(data, peptideId) {
  const bundle = buildPeptideBundle(data, peptideId);
  if (!bundle) return;
  const { record, schedules, logs, bloodworkReports, sources, vials, references, history } = bundle;
  const lines = [];
  lines.push(`# ${record.name || "Untitled Peptide"}`, "");
  lines.push(`Status: ${displayStatusLabel(record, new Date())}`);
  lines.push(`Cycle: ${record.startDate || "--"} to ${record.plannedEndDate || "--"}${record.actualEndDate ? ` (actual end: ${record.actualEndDate})` : ""}`, "");
  if (record.purposeNote) lines.push(`Purpose: ${record.purposeNote}`, "");

  lines.push("## Administration Schedule", "");
  if (!schedules.length) lines.push("No schedule recorded.", "");
  schedules.forEach(s => lines.push(`- ${s.name || "Schedule"}: ${s.plannedAmount ?? "?"}${s.plannedAmountUnit || ""} at ${s.plannedTime || "unspecified time"}`));
  lines.push("");

  lines.push("## Administration Log", "");
  if (!logs.length) lines.push("No administrations logged.", "");
  logs.slice().sort((a, b) => (a.date || "").localeCompare(b.date || "")).forEach(l =>
    lines.push(`- ${l.date || "?"} ${l.exactTime || ""}: ${l.status}${l.amount != null ? ` — ${l.amount}${l.amountUnit || ""}` : ""}`));
  lines.push("");

  lines.push("## Product & Vials", "");
  sources.forEach(s => lines.push(`- Source: ${s.supplierName || "?"}${s.batchNumber ? ` (batch ${s.batchNumber})` : ""}`));
  vials.forEach(v => lines.push(`- Vial ${v.label || ""}: ${v.statedAmount ?? "?"}${v.statedAmountUnit || ""}, status ${v.status}`));
  if (!sources.length && !vials.length) lines.push("No product/vial detail recorded.");
  lines.push("");

  lines.push("## Bloodwork", "");
  if (!bloodworkReports.length) lines.push("No bloodwork linked.", "");
  bloodworkReports.forEach(r => {
    lines.push(`- ${r.testDate || "?"} ${r.title || ""}`);
    r.markers.forEach(m => lines.push(`  - ${m.markerName}: ${m.result ?? "?"}${m.unit || ""}`));
  });
  lines.push("");

  lines.push("## Sources & References", "");
  if (!references.length) lines.push("No references linked.", "");
  references.forEach(r => lines.push(`- [${r.sourceType}] ${r.title || "Untitled"}${r.creator ? ` — ${r.creator}` : ""}${r.url ? ` (${r.url})` : ""} — External reference, not an application recommendation.`));
  lines.push("");

  lines.push("## Change History", "");
  if (!history.length) lines.push("No edits recorded.", "");
  history.forEach(h => lines.push(`- ${(h.changedAt || "").slice(0, 10)}: ${h.field} changed from "${h.previousValue ?? ""}" to "${h.newValue ?? ""}"`));
  lines.push("");

  if (record.notes) lines.push("## Notes", "", record.notes, "");

  downloadBlob(lines.join("\n"), "text/markdown", `${slugify(record.name)}-report-${new Date().toISOString().slice(0, 10)}.md`);
}
