import { $, esc, fmt } from "./dom.js";
import {
  sevenDayAverage, weeklyRateOfGain, gainRateStatus, macroTargets, perKg,
  suggestedCalorieAdjustment, ratios, weeklyVolumeByMuscleGroup, volumeStatus, recoveryWarnings,
  workoutsInWeek
} from "./calculations.js";
import { DEFAULT_TRAINING_PROGRAM, MUSCLE_GROUPS } from "./program.js";

function pct(n) { return Math.max(0, Math.min(100, n)); }

export function renderDashboard(data) {
  const profile = data.profile;
  const latestBw = data.bodyweightLogs[data.bodyweightLogs.length - 1];
  const currentWeight = latestBw ? Number(latestBw.morningBodyweight) : (data.checkins.at(-1)?.weight ?? profile.currentWeight ?? profile.startingWeight);
  $("currentWeight").textContent = `${fmt(currentWeight)}kg`;

  const sevenDay = sevenDayAverage(data.bodyweightLogs, "morningBodyweight");
  $("sevenDayAvg").textContent = sevenDay != null ? `${fmt(sevenDay)}kg` : "--";

  const rate = weeklyRateOfGain(data.bodyweightLogs);
  $("weeklyGain").textContent = rate != null ? `${rate >= 0 ? "+" : ""}${fmt(rate, 2)}kg/wk` : "--";
  const gs = gainRateStatus(rate, profile.targetWeeklyGain);
  $("gainStatus").innerHTML = `<div class="${gs.status === 'on-track' ? 'ok-banner' : 'warning-banner'}">${esc(gs.message)} (target +${profile.targetWeeklyGain}kg/wk)</div>`;

  const progress = pct(((currentWeight - profile.startingWeight) / (profile.ambitiousTargetWeight - profile.startingWeight)) * 100);
  $("progressBar").style.width = `${progress}%`;
  $("progressText").textContent = `${fmt(progress)}%`;
  $("progressSubtext").textContent = `${fmt(currentWeight)}kg toward ambitious ${profile.ambitiousTargetWeight}kg (realistic target ${profile.realisticTargetWeightMin}-${profile.realisticTargetWeightMax}kg)`;

  renderNutritionCards(data, currentWeight);
  renderRecoveryCards(data);
  renderScore(data, currentWeight);
  renderWeekSessions(data);
  renderNextWorkout(data);
  renderLastWorkout(data);
  renderIncreaseNextWeek(data);
  renderRatios(data);
  renderMilestones(data, currentWeight);
  renderVolumeSummary(data);
  renderMonthlyReviewReminder(data);
}

function renderNutritionCards(data, currentWeight) {
  const latest = data.nutritionLogs[data.nutritionLogs.length - 1];
  const profile = data.profile;
  $("dashPhase").textContent = profile.currentPhase || "--";

  if (!latest) {
    ["dashCalories", "dashProtein", "dashProteinPerKg", "dashCarbs", "dashFats"].forEach(id => $(id).textContent = "--");
    $("nutritionRecommendation").innerHTML = "<p class='small'>Log nutrition to see recommendations.</p>";
    return;
  }
  $("dashCalories").textContent = `${latest.calories ?? "--"} kcal`;
  $("dashProtein").textContent = `${latest.protein ?? "--"}g`;
  $("dashProteinPerKg").textContent = `${fmt(perKg(latest.protein, currentWeight), 2)}g/kg`;
  $("dashCarbs").textContent = `${latest.carbs ?? "--"}g`;
  $("dashFats").textContent = `${latest.fat ?? "--"}g`;

  const targets = macroTargets(currentWeight);
  const rate = weeklyRateOfGain(data.bodyweightLogs);
  const adj = suggestedCalorieAdjustment(rate, profile.targetWeeklyGain);
  const proteinOk = latest.protein >= targets.proteinMin;
  $("nutritionRecommendation").innerHTML = `
    <p class="small">Protein target: ${targets.proteinMin}-${targets.proteinMax}g/day at ${fmt(currentWeight)}kg. ${proteinOk ? "On target." : "Below target range."}</p>
    <p class="small">Carb target: ${targets.carbsMin}-${targets.carbsMax}g/day · Fat target: ${targets.fatMin}-${targets.fatMax}g/day.</p>
    <p class="small">Suggested calorie adjustment: <strong>${esc(adj)}</strong></p>`;
}

function renderRecoveryCards(data) {
  const latestRecovery = data.recoveryLogs[data.recoveryLogs.length - 1];
  $("dashSleep").textContent = latestRecovery ? `${latestRecovery.sleepDuration ?? "--"}h` : "--";
  $("dashRecovery").textContent = latestRecovery ? `${latestRecovery.recoveryScore ?? "--"}/5` : "--";
  $("dashEnergy").textContent = latestRecovery ? `${latestRecovery.energyScore ?? "--"}/5` : "--";

  const latestStim = data.stimulantLogs[data.stimulantLogs.length - 1];
  $("dashStims").textContent = latestStim
    ? `${latestStim.caffeineMg ?? 0}mg caffeine${latestStim.nicotineUsed ? " · nicotine used" : ""}`
    : "--";

  const warnings = recoveryWarnings(data);
  $("recoveryWarnings").innerHTML = warnings.length
    ? warnings.map(w => `<div class="warning-banner">${esc(w)}</div>`).join("")
    : "<div class='ok-banner'>No recovery red flags in recent logs.</div>";
}

function renderScore(data, currentWeight) {
  const latestNutrition = data.nutritionLogs.at(-1);
  const latestRecovery = data.recoveryLogs.at(-1);
  const sessionsThisWeek = workoutsInWeek(data.workouts).length;
  if (!latestNutrition && !latestRecovery && !sessionsThisWeek) {
    $("score").textContent = "--/100";
    return;
  }
  const targets = macroTargets(currentWeight);
  let score = 0;
  score += Math.min(25, ((latestNutrition?.protein || 0) / (targets.proteinMin || 1)) * 25);
  score += Math.min(25, (sessionsThisWeek / 5) * 25);
  score += Math.min(25, ((latestRecovery?.recoveryScore || 0) / 5) * 25);
  score += Math.min(25, ((latestRecovery?.energyScore || 0) / 5) * 25);
  $("score").textContent = `${Math.round(score)}/100`;
}

function renderWeekSessions(data) {
  const el = $("weekSessions");
  if (!el) return;
  const days = Object.keys(data.trainingProgram || DEFAULT_TRAINING_PROGRAM);
  const loggedThisWeek = workoutsInWeek(data.workouts);
  el.innerHTML = days.map(day => {
    const session = loggedThisWeek.find(w => (w.day || w.programDay) === day);
    return `<div class="checklist-row">
      <span>${session ? "✅" : "⬜"}</span>
      <span>${esc(day)}</span>
      <span class="badge ${session ? 'status-on-target' : ''}">${session ? esc(session.date) : "Not logged"}</span>
    </div>`;
  }).join("");
}

function renderNextWorkout(data) {
  const days = Object.keys(data.trainingProgram || DEFAULT_TRAINING_PROGRAM);
  const last = data.workouts.at(-1);
  let nextDay = days[0];
  if (last) {
    const idx = days.indexOf(last.day || last.programDay);
    nextDay = days[(idx + 1) % days.length] ?? days[0];
  }
  const exercises = (data.trainingProgram?.[nextDay] || []).map(e => e.name).join(", ");
  $("nextWorkout").innerHTML = `<p><strong>${esc(nextDay)}</strong></p><p class="small">${esc(exercises)}</p>`;
}

function renderLastWorkout(data) {
  const last = data.workouts.at(-1);
  if (!last) { $("lastWorkout").innerHTML = "<p class='small'>No workouts logged yet.</p>"; return; }
  $("lastWorkout").innerHTML = `
    <p><strong>${esc(last.date)}</strong> · ${esc(last.day || last.programDay)}</p>
    ${(last.exercises || []).map(e => `<p class="small">${esc(e.name)}: ${e.set1Weight}kg x ${e.set1Reps}, ${e.set2Weight}kg x ${e.set2Reps}</p>`).join("")}`;
}

function renderIncreaseNextWeek(data) {
  const last = data.workouts.at(-1);
  const flagged = (last?.exercises || []).filter(e => e.increaseNextWeek);
  $("increaseNextWeek").innerHTML = flagged.length
    ? flagged.map(e => `<p class="small">✅ ${esc(e.name)} — ${esc(e.progressionRecommendation || "increase load next time")}</p>`).join("")
    : "<p class='small'>None flagged from the last session yet.</p>";
}

function renderRatios(data) {
  const latest = data.measurements.at(-1);
  if (!latest) {
    $("dashShoulderWaist").textContent = "--";
    $("dashChestWaist").textContent = "--";
    return;
  }
  const r = ratios(latest);
  $("dashShoulderWaist").textContent = r.shoulderToWaist ?? "--";
  $("dashChestWaist").textContent = r.chestToWaist ?? "--";
}

function renderMilestones(data, currentWeight) {
  const profile = data.profile;
  const bwHtml = `
    <div class="badge-row">
      <span class="badge ${currentWeight >= profile.realisticTargetWeightMin ? 'status-on-target' : 'status-under'}">Realistic min ${profile.realisticTargetWeightMin}kg</span>
      <span class="badge ${currentWeight >= profile.realisticTargetWeightMax ? 'status-on-target' : 'status-under'}">Realistic max ${profile.realisticTargetWeightMax}kg</span>
      <span class="badge ${currentWeight >= profile.ambitiousTargetWeight ? 'status-on-target' : 'status-under'}">Ambitious ${profile.ambitiousTargetWeight}kg</span>
    </div>`;
  $("bodyweightMilestones").innerHTML = bwHtml;

  $("strengthMilestones").innerHTML = (data.prs || []).map(p => `
    <div class="history-item">
      <strong>${esc(p.exerciseName)}</strong> · Current: ${esc(p.currentBest || "not set")} · Goal: ${esc(p.goal)}
    </div>`).join("") || "<p class='small'>No PR targets set.</p>";
}

function renderVolumeSummary(data) {
  const totals = weeklyVolumeByMuscleGroup(data.workouts, data.exercises);
  $("weeklyVolumeSummary").innerHTML = MUSCLE_GROUPS.map(group => {
    const sets = totals[group] || 0;
    const vs = volumeStatus(group, sets);
    return `<div class="checklist-row"><span>${vs.isPriority ? "⭐" : ""}</span><span>${esc(group)}</span><span class="badge status-${vs.status}">${sets} sets</span></div>`;
  }).join("");
}

function renderMonthlyReviewReminder(data) {
  const last = data.monthlyReviews.at(-1);
  const el = $("monthlyReviewReminder");
  if (!last) { el.innerHTML = "<p class='small'>No monthly review yet — head to More → Monthly Review to generate one.</p>"; return; }
  const daysSince = (Date.now() - new Date(last.createdAt || last.month).getTime()) / 86400000;
  el.innerHTML = daysSince >= 28
    ? "<div class='warning-banner'>It's been 4+ weeks — time for a new monthly review.</div>"
    : `<p class="small">Last review: ${esc(last.month)}. Next one due in ${Math.max(0, Math.round(28 - daysSince))} days.</p>`;
}
