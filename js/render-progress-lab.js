// Progress Lab (spec section 6 "Progress Lab"): a dedicated analytics tab that aggregates
// existing calculation output into a denser visual view. Presentation-only — every number
// here is produced by an existing calculations.js/charts.js function; nothing is recomputed
// or redefined. This tab is additive: it does not relocate or remove any Dashboard/Train/
// Body/Recovery/Constraint analytics, it just gives them a second, expanded home.
import { $, esc, fmt } from "./dom.js";
import {
  sevenDayAverage, weeklyRateOfGain, weeklyVolumeByMuscleGroup,
  weeklyComplianceRate, exercisesReadyToIncrease, sleepStats, readinessScore,
  dailyMealTotals, macroTargets, currentBodyweightKg,
  weeklyMuscleHeadTargets, adaptiveVolumeWarnings,
  muscleHeadRecoveryStatusMap, allMuscleHeadRecoveryForecasts, fatigueBudgetWarnings
} from "./calculations.js";
import { MUSCLE_GROUPS } from "./program.js";
import { MUSCLE_HEADS, MUSCLE_HEAD_REGIONS, headsInRegion } from "./muscle-heads.js";
import { weakPointRanking, allIntelligentWarnings } from "./hypertrophy-warnings.js";
import { allExerciseEffectivenessScores } from "./exercise-effectiveness.js";
import { allRecommendedExerciseOrders, programmeEvolutionRecommendations } from "./programme-evolution.js";
import { lineChart, donutChart, barRows } from "./charts.js";
import { parseLogDate } from "./dates.js";
import { autoCountUp } from "./motion.js";

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
  renderLabMuscleHeadTargets(data);
  renderLabWeakPointsAndWarnings(data);
  renderLabExerciseEffectiveness(data);
  renderLabSmartOrderingAndEvolution(data);
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
  const countStat = (label, value, decimals, suffix) =>
    `<div class="hero-stat"><span>${esc(label)}</span><strong data-count-target="${value}" data-count-decimals="${decimals}" data-count-suffix="${esc(suffix)}"></strong></div>`;

  el.innerHTML = `<div class="hero-stat-row">${[
    avg7 != null ? countStat("7-day avg bodyweight", avg7, 1, "kg") : stat("7-day avg bodyweight", "--"),
    stat("Weekly rate of gain", rate != null ? `${rate >= 0 ? "+" : ""}${fmt(rate, 2)}kg/wk` : "--"),
    countStat("Session compliance", compliance, 0, "%"),
    countStat("Weekly hard sets", totalSets, 0, ""),
    sStats.hasData && sStats.sevenDayAverage != null ? countStat("7-day avg sleep", sStats.sevenDayAverage, 1, "h") : stat("7-day avg sleep", "--"),
    countStat("Open constraint cases", openCases, 0, "")
  ].join("")}</div>`;
  autoCountUp(el);
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

const HEAD_TARGET_STATUS_LABEL = {
  "under": "Under target",
  "in-range": "On target",
  "above-adaptive": "Above adaptive ceiling",
  "over-recoverable": "Over recoverable limit"
};

/**
 * Hypertrophy Intelligence Engine spec's "Weekly Muscle Head Targets" + "Recovery Forecast" +
 * "Fatigue Budget": current stimulus, target stimulus, a real per-head recovery percentage
 * (Phase 3's muscleHeadRecoveryForecast — replaces Phase 2's whole-body placeholder), and
 * confidence, for every tracked muscle head. Presentation-only, like the rest of this file —
 * all numbers come straight from calculations.js.
 */
function renderLabMuscleHeadTargets(data) {
  const el = $("progressLabMuscleHeadTargets");
  const warningsEl = $("progressLabMuscleHeadWarnings");
  if (!el) return;

  const referenceDate = new Date();
  const recoveryStatusMap = muscleHeadRecoveryStatusMap(data, referenceDate);
  const recoveryByHead = Object.fromEntries(allMuscleHeadRecoveryForecasts(data, referenceDate).map(f => [f.headId, f]));
  const targets = weeklyMuscleHeadTargets(data.workouts, data.exercises, referenceDate, recoveryStatusMap);
  const warnings = [
    ...adaptiveVolumeWarnings(data.workouts, data.exercises, referenceDate, recoveryStatusMap),
    ...fatigueBudgetWarnings(data.workouts, data.exercises, referenceDate)
  ];

  if (warningsEl) {
    warningsEl.innerHTML = warnings.map(w => `<div class="warning-banner">${esc(w.message)}</div>`).join("");
  }

  const byId = Object.fromEntries(targets.map(t => [t.headId, t]));
  el.innerHTML = MUSCLE_HEAD_REGIONS.map(region => {
    const rows = headsInRegion(region).map(headId => {
      const t = byId[headId];
      if (!t) return "";
      const recovery = recoveryByHead[headId];
      const label = MUSCLE_HEADS[headId]?.label || headId;
      const recoveryLine = recovery?.daysSinceTrained == null
        ? "Not yet trained — nothing to recover from."
        : `${esc(String(recovery.recoveryPercent))}% recovered · ${esc(String(recovery.daysSinceTrained))} day${recovery.daysSinceTrained === 1 ? "" : "s"} since last trained${recovery.concernFlags.includes("pain_flagged") ? " · pain flagged recently" : ""}`;
      return `
        <div class="history-item">
          <div class="section-title">
            <strong>${esc(label)}</strong>
            <span class="badge-row"><span class="badge">${esc(HEAD_TARGET_STATUS_LABEL[t.status] || t.status)}</span><span class="badge">${esc(t.confidence)} confidence</span></span>
          </div>
          <p class="small">${esc(String(t.currentStimulus))} effective sets this week · target ${esc(String(t.targetStimulus[0]))}–${esc(String(t.targetStimulus[1]))} · recoverable ceiling ${esc(String(t.landmarks.maximumRecoverableVolume))}</p>
          <p class="small">${recoveryLine}</p>
          <p class="small">${t.landmarks.basis === "personalized" ? "Personalised from your recent progression/recovery data." : "Generic starting band — not yet enough evidence to personalise."}</p>
        </div>`;
    }).join("");
    return `<h4>${esc(region.charAt(0).toUpperCase() + region.slice(1))}</h4>${rows}`;
  }).join("");
}

/**
 * Hypertrophy Intelligence Engine spec's "Weak Point Analysis" + "Intelligent Warnings":
 * a ranked list of which muscle heads are the smallest likely fix right now (js/hypertrophy-
 * warnings.js's weakPointRanking), plus programme-level warnings (overlap, duplicate movement
 * pattern, poor ordering, recovery conflict, junk volume). Read-only and explainable, like
 * every other card on this page — nothing here edits the programme.
 */
function renderLabWeakPointsAndWarnings(data) {
  const warningsEl = $("progressLabIntelligentWarnings");
  const rankingEl = $("progressLabWeakPointRanking");
  if (!warningsEl && !rankingEl) return;

  const referenceDate = new Date();

  if (warningsEl) {
    const warnings = allIntelligentWarnings(data, referenceDate);
    warningsEl.innerHTML = warnings.length
      ? warnings.map(w => `<div class="warning-banner">${esc(w.message)}</div>`).join("")
      : "<p class='small'>No programme-level warnings right now.</p>";
  }

  if (rankingEl) {
    const ranking = weakPointRanking(data, referenceDate).filter(r => r.isWeakPoint).slice(0, 8);
    rankingEl.innerHTML = ranking.length
      ? ranking.map(r => `
        <div class="history-item">
          <div class="section-title">
            <strong>${esc(r.label)}</strong>
            <span class="badge-row">${r.isPlateaued ? "<span class='badge'>Plateaued</span>" : ""}${r.stimulusStatus === "under" && r.currentStimulus > 0 ? "<span class='badge'>Under target</span>" : ""}</span>
          </div>
          <p class="small">${esc(r.suggestion)}</p>
        </div>`).join("")
      : "<p class='small'>No standout weak points right now — every tracked muscle head is on target and not plateaued.</p>";
  }
}

const EFFECTIVENESS_METRICS = [
  { key: "growthEffectiveness", label: "Growth Effectiveness" },
  { key: "progressionReliability", label: "Progression Reliability" },
  { key: "fatigueCost", label: "Fatigue Cost" },
  { key: "adherence", label: "Adherence" },
  { key: "consistency", label: "Consistency" }
];

function effectivenessMetricLine(metric) {
  if (metric.score == null) return `<span class="badge">${esc(metric.confidence.replace(/-/g, " "))}</span>`;
  return `<span class="badge">${Math.round(metric.score * 100)}%</span> <span class="small">${esc(metric.confidence)} confidence</span>`;
}

/**
 * Personal Exercise Effectiveness (Hypertrophy Intelligence Engine spec): 5 evidence-gated
 * scores per active exercise from js/exercise-effectiveness.js. Read-only — no exercise is
 * ever reordered, hidden or flagged for removal here; that recommendation layer is a later
 * phase (Programme Evolution). Exercises with no scorable data at all yet are skipped rather
 * than shown as a wall of "insufficient data" rows.
 */
function renderLabExerciseEffectiveness(data) {
  const el = $("progressLabExerciseEffectiveness");
  if (!el) return;

  const referenceDate = new Date();
  const bundles = allExerciseEffectivenessScores(data, referenceDate);
  const scored = bundles.filter(b => EFFECTIVENESS_METRICS.some(m => b[m.key].score != null));

  if (!scored.length) {
    el.innerHTML = "<p class='small'>Not enough logged history yet to score any exercise's effectiveness.</p>";
    return;
  }

  el.innerHTML = scored.map(b => `
    <div class="history-item">
      <div class="section-title"><strong>${esc(b.name)}</strong></div>
      <div class="badge-row">
        ${EFFECTIVENESS_METRICS.map(m => `<span class="small">${esc(m.label)}: ${effectivenessMetricLine(b[m.key])}</span>`).join(" &middot; ")}
      </div>
    </div>`).join("");
}

const EVOLUTION_TYPE_LABEL = {
  "retire-candidate": "Retire candidate",
  "try-different-variant": "Try a different variant",
  "adjust-before-retiring": "Adjust before retiring",
  "high-responder": "High responder"
};

/**
 * Smart Ordering + Programme Evolution (Hypertrophy Intelligence Engine spec, js/programme-
 * evolution.js): suggested day-by-day exercise re-ordering plus which exercises are/aren't
 * earning their slot. Purely advisory, like every other card on this page — the Programme
 * Editor is still the only place exercises are actually added, removed, or reordered.
 */
function renderLabSmartOrderingAndEvolution(data) {
  const orderEl = $("progressLabSmartOrdering");
  const evolutionEl = $("progressLabProgrammeEvolution");
  if (!orderEl && !evolutionEl) return;

  const referenceDate = new Date();

  if (orderEl) {
    const suggestions = allRecommendedExerciseOrders(data, referenceDate);
    orderEl.innerHTML = suggestions.length
      ? suggestions.map(s => `
        <div class="history-item">
          <div class="section-title"><strong>${esc(s.day)}</strong></div>
          <p class="small">Current: ${s.currentOrder.map(esc).join(" &rarr; ")}</p>
          <p class="small">Suggested: ${s.recommendedOrder.map(esc).join(" &rarr; ")}</p>
        </div>`).join("")
      : "<p class='small'>Every programmed day is already in a recommended order.</p>";
  }

  if (evolutionEl) {
    const recs = programmeEvolutionRecommendations(data, referenceDate);
    evolutionEl.innerHTML = recs.length
      ? recs.map(r => `
        <div class="history-item">
          <div class="section-title">
            <strong>${esc(r.name)}</strong>
            <span class="badge-row"><span class="badge">${esc(EVOLUTION_TYPE_LABEL[r.type] || r.type)}</span></span>
          </div>
          <p class="small">${esc(r.message)}</p>
        </div>`).join("")
      : "<p class='small'>No programme evolution suggestions right now.</p>";
  }
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
