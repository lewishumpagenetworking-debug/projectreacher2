// Progress Lab (spec section 6 "Progress Lab"): a dedicated analytics tab that aggregates
// existing calculation output into a denser visual view. Presentation-only — every number
// here is produced by an existing calculations.js/charts.js function; nothing is recomputed
// or redefined. This tab is additive: it does not relocate or remove any Dashboard/Train/
// Body/Recovery/Constraint analytics, it just gives them a second, expanded home.
import { $, esc, fmt } from "./dom.js";
import {
  sevenDayAverage, weeklyRateOfGain, weeklyVolumeByMuscleGroup,
  weeklyComplianceRate, exercisesReadyToIncrease, sleepStats, readinessScore,
  dailyMealTotals, macroTargets, currentBodyweightKg
} from "./calculations.js";
import { MUSCLE_GROUPS } from "./program.js";
import { lineChart, donutChart, barRows } from "./charts.js";
import { parseLogDate } from "./dates.js";

const CHART_PREF_KEY = "reacherChartPrefs";
function getChartPref(widgetId, fallback) {
  try {
    const all = JSON.parse(localStorage.getItem(CHART_PREF_KEY) || "{}");
    return all[widgetId] || fallback;
  } catch { return fallback; }
}
function setChartPref(widgetId, value) {
  try {
    const all = JSON.parse(localStorage.getItem(CHART_PREF_KEY) || "{}");
    all[widgetId] = value;
    localStorage.setItem(CHART_PREF_KEY, JSON.stringify(all));
  } catch { /* view preference only */ }
}

let lastLabData = null;

export function renderProgressLab(data) {
  const root = $("progressLabRoot");
  if (!root) return;
  lastLabData = data;

  renderLabSummaryStrip(data);
  renderLabWeightChart(data);
  renderLabVolumeChart(data);
  renderLabNutritionChart(data);
  renderLabProgressionList(data);
  renderLabMeasurementsChart(data);
  renderLabSleepRecovery(data);
  renderLabConstraintHistory(data);
}

function renderLabSummaryStrip(data) {
  const el = $("progressLabSummaryStrip");
  if (!el) return;

  const rate = weeklyRateOfGain(data.bodyweightLogs);
  const avg7 = sevenDayAverage(data.bodyweightLogs, "morningBodyweight");
  const compliance = weeklyComplianceRate(data.workouts, data.trainingProgram, new Date());
  const totals = weeklyVolumeByMuscleGroup(data.workouts, data.exercises);
  const totalSets = Object.values(totals).reduce((sum, n) => sum + n, 0);
  const sStats = sleepStats(data.sleepLogs || []);
  const openCases = (data.constraintCases || []).filter(c => ["observing", "active", "improving", "escalated"].includes(c.status)).length;

  const stat = (label, value) => `<div class="hero-stat"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`;
  el.innerHTML = `<div class="hero-stat-row">${[
    stat("7-day avg bodyweight", avg7 != null ? `${fmt(avg7)}kg` : "--"),
    stat("Weekly rate of gain", rate != null ? `${rate >= 0 ? "+" : ""}${fmt(rate, 2)}kg/wk` : "--"),
    stat("Session compliance", `${compliance}%`),
    stat("Weekly hard sets", `${totalSets}`),
    stat("7-day avg sleep", sStats.hasData && sStats.sevenDayAverage != null ? `${fmt(sStats.sevenDayAverage)}h` : "--"),
    stat("Open constraint cases", `${openCases}`)
  ].join("")}</div>`;
}

const LAB_WEIGHT_RANGES = [
  { key: "7", label: "7d", days: 7 },
  { key: "30", label: "30d", days: 30 },
  { key: "90", label: "90d", days: 90 },
  { key: "all", label: "All", days: null }
];

function renderLabWeightChart(data) {
  const toggleEl = $("progressLabWeightRange");
  const chartEl = $("progressLabWeightChart");
  if (!toggleEl || !chartEl) return;
  const activeRange = getChartPref("progressLabWeightRange", "90");

  toggleEl.innerHTML = LAB_WEIGHT_RANGES.map(r =>
    `<button type="button" class="${r.key === activeRange ? "active" : ""}" data-lab-weight-range="${r.key}">${esc(r.label)}</button>`
  ).join("");

  const range = LAB_WEIGHT_RANGES.find(r => r.key === activeRange) || LAB_WEIGHT_RANGES[1];
  const cutoff = range.days ? Date.now() - range.days * 86400000 : null;
  const points = (data.bodyweightLogs || [])
    .filter(b => {
      if (!cutoff) return true;
      const d = parseLogDate(b.date);
      return d && d.getTime() >= cutoff;
    })
    .map(b => ({ label: (b.date || "").slice(5), value: Number(b.morningBodyweight) }))
    .filter(p => !Number.isNaN(p.value));

  chartEl.innerHTML = lineChart(points, { labelEvery: Math.ceil(points.length / 8) || 1, formatValue: v => `${fmt(v)}kg` });
}

function setLabWeightRange(rangeKey) {
  setChartPref("progressLabWeightRange", rangeKey);
  if (lastLabData) renderLabWeightChart(lastLabData);
}

const LAB_VOLUME_CHART_TYPES = [
  { key: "bar", label: "Bar" },
  { key: "donut", label: "Pie" }
];

function renderLabVolumeChart(data) {
  const toggleEl = $("progressLabVolumeChartType");
  const chartEl = $("progressLabVolumeChart");
  if (!toggleEl || !chartEl) return;
  const activeType = getChartPref("progressLabVolume", "bar");

  toggleEl.innerHTML = LAB_VOLUME_CHART_TYPES.map(t =>
    `<button type="button" class="${t.key === activeType ? "active" : ""}" data-lab-volume-type="${t.key}">${esc(t.label)}</button>`
  ).join("");

  const totals = weeklyVolumeByMuscleGroup(data.workouts, data.exercises);
  const rows = MUSCLE_GROUPS.map(group => ({ label: group, value: totals[group] || 0 }));
  if (!rows.some(r => r.value > 0)) {
    chartEl.innerHTML = "<p class='small'>No sets logged this week yet.</p>";
    return;
  }
  chartEl.innerHTML = activeType === "donut"
    ? donutChart(rows.map(r => ({ label: r.label, value: r.value })), { formatValue: v => `${v} sets` })
    : barRows(rows, { formatValue: v => `${v} sets` });
}

function setLabVolumeChartType(typeKey) {
  setChartPref("progressLabVolume", typeKey);
  if (lastLabData) renderLabVolumeChart(lastLabData);
}

function renderLabNutritionChart(data) {
  const chartEl = $("progressLabNutritionChart");
  if (!chartEl) return;
  const weightKg = currentBodyweightKg(data);
  const targets = { calories: data.profile?.dailyCalorieTarget || 2800, ...macroTargets(weightKg) };

  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const iso = d.toLocaleDateString("en-CA");
    const totals = dailyMealTotals(data.mealLogs || [], iso);
    days.push({ label: iso.slice(5), value: totals.mealCount ? totals.calories : 0, mealCount: totals.mealCount });
  }

  if (!days.some(d => d.mealCount)) {
    chartEl.innerHTML = "<p class='small'>No meals logged in the last 7 days.</p>";
    return;
  }
  chartEl.innerHTML = barRows(days, { max: targets.calories || undefined, formatValue: v => `${Math.round(v)}kcal` });
}

function renderLabProgressionList(data) {
  const el = $("progressLabProgressionList");
  if (!el) return;

  const ready = exercisesReadyToIncrease(data.workouts, data.exercises);
  const recentPrs = (data.prs || [])
    .filter(p => p.dateAchieved)
    .sort((a, b) => new Date(b.dateAchieved) - new Date(a.dateAchieved))
    .slice(0, 5);

  const readyHtml = ready.length
    ? ready.slice(0, 8).map(r => `<div class="checklist-row"><span>⬆️</span><span>${esc(r.name)}</span><span class="badge status-on-target">Increase Load</span></div>`).join("")
    : "<p class='small'>No exercises currently flagged to increase load.</p>";

  const prHtml = recentPrs.length
    ? recentPrs.map(p => `<div class="history-item"><strong>${esc(p.exerciseName)}</strong> · ${esc(p.currentBest || p.goal)} <span class="small">(${esc(p.dateAchieved)})</span></div>`).join("")
    : "<p class='small'>No PRs logged yet.</p>";

  el.innerHTML = `<h3>Ready to progress</h3>${readyHtml}<h3>Recent PRs</h3>${prHtml}`;
}

function renderLabMeasurementsChart(data) {
  const chartEl = $("progressLabMeasurementsChart");
  if (!chartEl) return;
  const points = (data.measurements || [])
    .map(m => ({ label: (m.date || "").slice(5), value: Number(m.waist) }))
    .filter(p => p.label && !Number.isNaN(p.value));

  chartEl.innerHTML = points.length
    ? lineChart(points, { labelEvery: Math.ceil(points.length / 8) || 1, formatValue: v => `${fmt(v)}cm` })
    : "<p class='small'>No waist measurements logged yet.</p>";
}

function renderLabSleepRecovery(data) {
  const el = $("progressLabSleepRecovery");
  if (!el) return;
  const sStats = sleepStats(data.sleepLogs || []);
  const readiness = readinessScore(data);

  el.innerHTML = `
    <div class="badge-row">
      <span class="badge">Readiness: ${readiness.score}/100 (${esc(readiness.trainingMode)})</span>
      ${sStats.hasData ? `<span class="badge">Last night: ${fmt(sStats.lastNight)}h</span>` : ""}
      ${sStats.hasData && sStats.trend ? `<span class="badge">Sleep trend: ${esc(sStats.trend)}</span>` : ""}
    </div>
    <p class="small">${esc(readiness.mainBottleneck)}${readiness.secondaryBottleneck ? ` · ${esc(readiness.secondaryBottleneck)}` : ""}</p>`;
}

function renderLabConstraintHistory(data) {
  const el = $("progressLabConstraintHistory");
  if (!el) return;
  const closed = (data.constraintCases || []).filter(c => ["resolved", "dismissed"].includes(c.status)).slice(-6).reverse();

  el.innerHTML = closed.length
    ? closed.map(c => `<div class="history-item"><strong class="constraint-cause-title">${esc(c.rankedCauses?.[0]?.title || c.primaryRuleId)}</strong> · <span class="badge">${esc(c.status)}</span> <span class="small">Category: ${esc(c.outcomeType || "--")}</span></div>`).join("")
    : "<p class='small'>No closed constraint cases yet — see the Constraint tab for anything currently active.</p>";
}

export function setupProgressLabEventDelegation() {
  document.addEventListener("click", (e) => {
    const rangeBtn = e.target.closest("[data-lab-weight-range]");
    if (rangeBtn) { setLabWeightRange(rangeBtn.dataset.labWeightRange); return; }
    const typeBtn = e.target.closest("[data-lab-volume-type]");
    if (typeBtn) { setLabVolumeChartType(typeBtn.dataset.labVolumeType); return; }
  });
}
