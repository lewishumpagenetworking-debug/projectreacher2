// Wires up the previously-dead "Historical Data Imported" UI to reacherHistoricalData.json.
// Read-only reference data from the user's old spreadsheet — never written back to,
// never merged into localStorage (keeps localStorage lean; this file is a static asset).
import { lineChart, barRows } from "./charts.js";

const $ = (id) => document.getElementById(id);
let historicalCache = null;

export async function loadHistoricalImport() {
  if (historicalCache) return historicalCache;
  try {
    const res = await fetch("reacherHistoricalData.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    historicalCache = await res.json();
  } catch (err) {
    console.warn("[Project Reacher] Could not load reacherHistoricalData.json", err);
    historicalCache = { records: [], exerciseSummary: [], weeklyVolume: [], generatedFrom: "", homeWeightAssumption: "" };
  }
  return historicalCache;
}

export async function renderHistoricalImport() {
  const data = await loadHistoricalImport();
  renderInsights(data);
  renderWeeklyVolume(data);
  renderExerciseSelect(data);
  renderExerciseSummaryBars(data);
}

function renderInsights(data) {
  const el = $("insights");
  if (!el) return;
  el.innerHTML = `<p class="small">Imported from <strong>${data.generatedFrom || "previous tracker"}</strong>. ${data.homeWeightAssumption || ""}</p>`;
  const pillRow = document.querySelector(".pill-row");
  if (pillRow) {
    pillRow.innerHTML = `
      <span>${data.records.length} logged exercise rows</span>
      <span>${data.weeklyVolume.length} training weeks</span>
      <span>Home-stack weights estimated</span>`;
  }
}

function renderWeeklyVolume(data) {
  const el = $("weeklyVolumeChart");
  if (!el) return;
  const points = data.weeklyVolume.map(w => ({ label: w.date.slice(5), value: w.volume }));
  el.innerHTML = lineChart(points, { labelEvery: Math.ceil(points.length / 8) || 1, formatValue: v => `${Math.round(v)}kg` });
}

function renderExerciseSelect(data) {
  const select = $("exerciseSelect");
  if (!select) return;
  const names = [...new Set(data.exerciseSummary.map(e => e.exercise))].sort();
  select.innerHTML = names.map(n => `<option value="${n}">${n}</option>`).join("");
  select.onchange = () => renderExerciseTrend(data, select.value);
  if (names.length) renderExerciseTrend(data, names[0]);
}

function renderExerciseTrend(data, exerciseName) {
  const chartEl = $("exerciseTrendChart");
  const tableEl = $("exerciseTable");
  if (!chartEl && !tableEl) return;
  const rows = data.records
    .filter(r => r.exerciseNorm === exerciseName)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  if (chartEl) {
    const points = rows.map(r => ({ label: r.date.slice(5), value: r.weight || 0 }));
    chartEl.innerHTML = lineChart(points, { labelEvery: Math.ceil(points.length / 8) || 1, formatValue: v => `${v}kg` });
  }
  if (tableEl) {
    tableEl.innerHTML = rows.slice(-8).reverse().map(r => `
      <div class="history-item">
        <strong>${r.date}</strong> · ${r.weight ?? "-"}${r.weightType === "kg" ? "kg" : ""} · Set 1: ${r.set1 ?? "-"} · Set 2: ${r.set2 ?? "-"}
        ${r.notes ? `<br>${r.notes}` : ""}
      </div>`).join("") || "<p class='small'>No rows for this exercise.</p>";
  }
}

function renderExerciseSummaryBars(data) {
  const el = $("exerciseSummaryBars");
  if (!el) return;
  const top = [...data.exerciseSummary]
    .filter(e => e.volumeChange > 0)
    .sort((a, b) => b.volumeChange - a.volumeChange)
    .slice(0, 8)
    .map(e => ({ label: e.exercise, value: e.volumeChange }));
  el.innerHTML = barRows(top, { formatValue: v => `+${Math.round(v)}kg` });
}
