import { $, esc, fmt } from "./dom.js";
import { getData, saveData, uid } from "./data.js";
import { estimateMealMacros } from "./food-estimator.js";
import { macroTargets, dailyMealTotals, remainingMacros, macroAdherence, monthlyMealSummary, loggingStreakDays } from "./calculations.js";
import { lineChart, stackedBarRows } from "./charts.js";

const refreshAll = () => window.dispatchEvent(new CustomEvent("reacher:refresh"));
const todayISO = () => new Date().toLocaleDateString("en-CA");

let selectedMonth = todayISO().slice(0, 7);
let activeFilter = "all";
let lastEstimate = null;

export function estimateMeal() {
  const description = $("mealDescription").value;
  if (!description.trim()) { alert("Describe what you ate first."); return; }
  lastEstimate = estimateMealMacros(description);

  $("mealCalories").value = lastEstimate.calories;
  $("mealProtein").value = lastEstimate.protein;
  $("mealCarbs").value = lastEstimate.carbs;
  $("mealFat").value = lastEstimate.fat;
  $("mealFibre").value = lastEstimate.fibre;

  const pill = $("mealConfidencePill");
  pill.textContent = lastEstimate.confidenceScore;
  pill.className = `confidence-pill confidence-${lastEstimate.confidenceScore.toLowerCase()}`;

  $("mealAssumptions").innerHTML = [
    lastEstimate.foodsDetected.length ? `<strong>Detected:</strong> ${esc(lastEstimate.foodsDetected.join(", "))}` : "",
    ...lastEstimate.assumptions.map(a => esc(a))
  ].filter(Boolean).join("<br>");

  $("mealEstimateResult").hidden = false;
}

export function saveMeal() {
  const data = getData();
  const now = new Date();
  const calories = Number($("mealCalories").value || 0);
  const protein = Number($("mealProtein").value || 0);
  const carbs = Number($("mealCarbs").value || 0);
  const fat = Number($("mealFat").value || 0);
  const fibre = Number($("mealFibre").value || 0);

  const userCorrected = lastEstimate
    ? (calories !== lastEstimate.calories || protein !== lastEstimate.protein || carbs !== lastEstimate.carbs || fat !== lastEstimate.fat || fibre !== lastEstimate.fibre)
    : true; // no estimate was run at all -> fully manual entry

  data.mealLogs.push({
    id: uid(),
    date: todayISO(),
    time: $("mealTime").value || now.toTimeString().slice(0, 5),
    mealName: $("mealName").value || "Meal",
    rawDescription: $("mealDescription").value,
    foodsDetected: lastEstimate?.foodsDetected || [],
    calories, protein, carbs, fat, fibre,
    confidenceScore: lastEstimate?.confidenceScore || "Manual",
    assumptions: lastEstimate?.assumptions || [],
    userCorrected,
    correctionNotes: "",
    recoveryTag: $("mealRecoveryTag")?.value || null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  });
  saveData(data);

  ["mealDescription", "mealName", "mealTime", "mealCalories", "mealProtein", "mealCarbs", "mealFat", "mealFibre"].forEach(id => $(id).value = "");
  if ($("mealRecoveryTag")) $("mealRecoveryTag").value = "";
  $("mealEstimateResult").hidden = true;
  lastEstimate = null;
  refreshAll();
  alert("Meal saved.");
}

function currentWeight(data) {
  return data.bodyweightLogs.at(-1)?.morningBodyweight ?? data.profile.currentWeight ?? data.profile.startingWeight;
}

export function renderMealTracking(data) {
  renderTodayMeals(data);
  renderMonthSelect(data);
  renderMonthlyOverview(data);
  renderMealHistory(data);
}

function renderTodayMeals(data) {
  const today = todayISO();
  const totals = dailyMealTotals(data.mealLogs, today);
  const targets = macroTargets(currentWeight(data));
  const remaining = remainingMacros(totals, { calories: data.nutritionLogs.at(-1)?.calories || 2800, proteinMax: targets.proteinMax, proteinMin: targets.proteinMin, carbsMax: targets.carbsMax, fatMax: targets.fatMax, fibre: 14 * ((data.nutritionLogs.at(-1)?.calories || 2800) / 1000) });
  const adherence = macroAdherence(totals, { calories: data.nutritionLogs.at(-1)?.calories || 2800, proteinMin: targets.proteinMin, fibre: 14 * ((data.nutritionLogs.at(-1)?.calories || 2800) / 1000) });

  const badge = $("mealDailyBadge");
  if (badge) { badge.textContent = adherence.macroStatus; badge.className = `badge status-${adherence.macroStatus === "On target" ? "on-target" : "under"}`; }

  const totalsEl = $("mealDailyTotals");
  if (totalsEl) {
    totalsEl.innerHTML = `
      <div class="badge-row">
        <span class="badge">${totals.calories} kcal</span>
        <span class="badge">${totals.protein}g protein</span>
        <span class="badge">${totals.carbs}g carbs</span>
        <span class="badge">${totals.fat}g fat</span>
        <span class="badge">${totals.fibre}g fibre</span>
        <span class="badge">${totals.mealCount} meal${totals.mealCount === 1 ? "" : "s"}</span>
      </div>`;
  }
  const remainingEl = $("mealRemaining");
  if (remainingEl) {
    const streak = loggingStreakDays(data.mealLogs, "date");
    const proteinHit = targets.proteinMin && totals.protein >= targets.proteinMin;
    const rewardLine = totals.mealCount
      ? `<p class="small exercise-complete-note">${proteinHit ? "Protein target hit. " : ""}${streak >= 2 ? `Nutrition Discipline: ${streak}-day streak.` : ""}</p>`
      : "";
    remainingEl.innerHTML = `<p class="small">Remaining today: ${remaining.caloriesRemaining}kcal · ${remaining.proteinRemaining}g protein · ${remaining.carbsRemaining}g carbs · ${remaining.fatRemaining}g fat · ${remaining.fibreRemaining}g fibre</p>${rewardLine}`;
  }

  const logEl = $("todayMealLog");
  const todaysMeals = data.mealLogs.filter(m => m.date === today).sort((a, b) => (a.time || "").localeCompare(b.time || ""));
  if (logEl) {
    logEl.innerHTML = todaysMeals.map(m => mealHistoryItem(m)).join("") || "<p class='small'>No meals logged yet today.</p>";
  }

  const chartEl = $("mealDailyChart");
  if (chartEl) {
    const rows = todaysMeals.map(m => ({
      label: `${m.time ? m.time + " " : ""}${m.mealName}`,
      total: m.calories,
      segments: [
        { value: m.protein * 4, className: "macro-protein", title: `Protein ${m.protein}g` },
        { value: m.carbs * 4, className: "macro-carbs", title: `Carbs ${m.carbs}g` },
        { value: m.fat * 9, className: "macro-fat", title: `Fat ${m.fat}g` }
      ]
    }));
    chartEl.innerHTML = stackedBarRows(rows);
  }
}

function mealHistoryItem(m) {
  return `<div class="history-item">
    <div class="section-title">
      <strong>${m.time ? esc(m.time) + " · " : ""}${esc(m.mealName)}</strong>
      <span class="confidence-pill confidence-${(m.confidenceScore || "manual").toLowerCase()}">${esc(m.confidenceScore)}${m.userCorrected ? " · edited" : ""}</span>
    </div>
    <p class="small">${esc(m.rawDescription)}</p>
    <div class="badge-row">
      <span class="badge">${m.calories}kcal</span>
      <span class="badge">P${m.protein}</span>
      <span class="badge">C${m.carbs}</span>
      <span class="badge">F${m.fat}</span>
      <span class="badge">Fibre${m.fibre}</span>
      ${m.recoveryTag ? `<span class="badge status-on-target">${esc(m.recoveryTag.replace(/-/g, " "))}</span>` : ""}
    </div>
    <div class="actions">
      <button class="secondary" data-duplicate-meal="${m.id}">Add Again Today</button>
      <button class="danger" data-delete="mealLogs" data-id="${m.id}">Delete</button>
    </div>
  </div>`;
}

function renderMonthSelect(data) {
  const select = $("mealMonthSelect");
  if (!select) return;
  const months = [...new Set(data.mealLogs.map(m => m.date.slice(0, 7)))];
  if (!months.includes(selectedMonth)) months.push(selectedMonth);
  months.sort().reverse();
  select.innerHTML = months.map(m => `<option value="${m}" ${m === selectedMonth ? "selected" : ""}>${m}</option>`).join("");
  select.onchange = () => { selectedMonth = select.value; renderMonthlyOverview(getData()); };
}

function renderMonthlyOverview(data) {
  const summary = monthlyMealSummary(data.mealLogs, selectedMonth);
  const cardsEl = $("monthlySummaryCards");
  if (cardsEl) {
    cardsEl.innerHTML = `
      <div class="badge-row">
        <span class="badge">Avg ${fmt(summary.averageCalories, 0)}kcal/day</span>
        <span class="badge">Avg ${fmt(summary.averageProtein, 0)}g protein/day</span>
        <span class="badge">Avg ${fmt(summary.averageCarbs, 0)}g carbs/day</span>
        <span class="badge">Avg ${fmt(summary.averageFat, 0)}g fat/day</span>
        <span class="badge">Avg ${fmt(summary.averageFibre, 0)}g fibre/day</span>
        <span class="badge">${summary.daysLogged} day(s) logged</span>
        <span class="badge">${summary.aiEstimatedMeals} estimated / ${summary.manuallyConfirmedMeals} confirmed</span>
        <span class="badge">${fmt(summary.consistencyScore, 0)}% of days logged</span>
      </div>
      ${summary.highestCalorieDay ? `<p class="small">Highest calorie day: ${esc(summary.highestCalorieDay.date)} (${summary.highestCalorieDay.calories}kcal) · Lowest: ${summary.lowestCalorieDay ? esc(summary.lowestCalorieDay.date) + " (" + summary.lowestCalorieDay.calories + "kcal)" : "--"} · Best protein day: ${esc(summary.bestProteinDay.date)} (${summary.bestProteinDay.protein}g)</p>` : "<p class='small'>No meals logged this month yet.</p>"}`;
  }
  const chartEl = $("monthlyCalorieChart");
  if (chartEl) {
    const points = summary.byDay.map(d => ({ label: d.date.slice(8), value: d.calories }));
    chartEl.innerHTML = lineChart(points, { labelEvery: Math.ceil(points.length / 10) || 1, formatValue: v => `${Math.round(v)}kcal` });
  }
}

function renderMealHistory(data) {
  const el = $("mealHistory");
  if (!el) return;
  const search = ($("mealSearch")?.value || "").toLowerCase();
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);

  let meals = [...data.mealLogs].sort((a, b) => (b.date + (b.time || "")).localeCompare(a.date + (a.time || "")));
  if (activeFilter === "week") meals = meals.filter(m => new Date(m.date) >= weekAgo);
  if (activeFilter === "highProtein") meals = meals.filter(m => m.protein >= 30);
  if (activeFilter === "lowConfidence") meals = meals.filter(m => m.confidenceScore === "Low");
  if (activeFilter === "corrected") meals = meals.filter(m => m.userCorrected);
  if (search) meals = meals.filter(m => (m.mealName + " " + m.rawDescription).toLowerCase().includes(search));

  el.innerHTML = meals.slice(0, 40).map(m => `<p class="small" style="margin:10px 0 0">${esc(m.date)}</p>${mealHistoryItem(m)}`).join("") || "<p class='small'>No meals match this filter.</p>";
}

export function syncMealsToDailyNutrition() {
  const data = getData();
  const today = todayISO();
  const totals = dailyMealTotals(data.mealLogs, today);
  if (totals.mealCount === 0) { alert("No meals logged today to sync."); return; }
  if (!confirm(`Replace today's nutrition log with today's meal totals (${totals.calories}kcal, ${totals.protein}g protein)? Your existing nutrition entries for other days are never touched.`)) return;

  const now = new Date();
  const existing = data.nutritionLogs.find(n => n.date === today);
  if (existing) {
    Object.assign(existing, { calories: totals.calories, protein: totals.protein, carbs: totals.carbs, fat: totals.fat, fibre: totals.fibre, updatedAt: now.toISOString(), notes: (existing.notes ? existing.notes + " " : "") + "(synced from meal log)" });
  } else {
    data.nutritionLogs.push({
      id: uid(), date: today, calories: totals.calories, protein: totals.protein, carbs: totals.carbs, fat: totals.fat, fibre: totals.fibre,
      waterLitres: null, sodiumMg: null, electrolytes: "", notes: "Synced from meal log", createdAt: now.toISOString(), updatedAt: now.toISOString()
    });
  }
  saveData(data);
  refreshAll();
  alert("Today's nutrition total updated from meal log.");
}

export function setupMealEventDelegation() {
  document.addEventListener("click", (e) => {
    const dup = e.target.closest("[data-duplicate-meal]");
    if (dup) {
      const data = getData();
      const source = data.mealLogs.find(m => m.id === dup.dataset.duplicateMeal);
      if (!source) return;
      const now = new Date();
      data.mealLogs.push({ ...source, id: uid(), date: todayISO(), time: now.toTimeString().slice(0, 5), createdAt: now.toISOString(), updatedAt: now.toISOString() });
      saveData(data);
      refreshAll();
      return;
    }
    const filterBtn = e.target.closest("#mealFilterRow button");
    if (filterBtn) {
      activeFilter = filterBtn.dataset.filter;
      document.querySelectorAll("#mealFilterRow button").forEach(b => b.classList.toggle("active", b === filterBtn));
      renderMealHistory(getData());
      return;
    }
    const gotoTab = e.target.closest("[data-goto-tab]");
    if (gotoTab) {
      document.querySelector(`.nav-btn[data-tab="${gotoTab.dataset.gotoTab}"]`)?.click();
      const anchorId = gotoTab.dataset.gotoAnchor;
      if (anchorId) {
        setTimeout(() => {
          const target = document.getElementById(anchorId);
          if (!target) return;
          target.scrollIntoView({ behavior: "smooth", block: "center" });
          target.focus?.({ preventScroll: true });
        }, 60);
      }
    }
  });

  $("mealSearch")?.addEventListener("input", () => renderMealHistory(getData()));
}
