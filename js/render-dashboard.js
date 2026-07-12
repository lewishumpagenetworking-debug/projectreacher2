import { $, esc, fmt } from "./dom.js";
import {
  sevenDayAverage, weeklyRateOfGain, gainRateStatus, macroTargets, perKg,
  suggestedCalorieAdjustment, ratios, weeklyVolumeByMuscleGroup, volumeStatus, recoveryWarnings,
  workoutsInWeek, dailyMealTotals, remainingMacros, macroAdherence, armForearmDeltWarnings,
  trainingStreakWeeks, loggingStreakDays, weeklyComplianceRate, computeBadges,
  readinessScore, sleepStats, weekendRecoveryStatus, caffeineLoadStatus, recoveryMealCompliance, formatHoursAsHM,
  dailyChecklist, monthlyChecklist, currentBodyweightKg, weeklyRecoveryDirection,
  exercisesReadyToIncrease, nutritionConfidenceStatus, preWorkoutReadinessToday, detectFatigueReason
} from "./calculations.js";
import { runContingencyEngine } from "./contingency-engine.js";
import { DEFAULT_TRAINING_PROGRAM, MUSCLE_GROUPS } from "./program.js";
import { SUPPLEMENT_DATABASE } from "./recovery-data.js";

function pct(n) { return Math.max(0, Math.min(100, n)); }

export function renderDashboard(data) {
  const profile = data.profile;
  const latestBw = data.bodyweightLogs[data.bodyweightLogs.length - 1];
  const currentWeight = latestBw ? Number(latestBw.morningBodyweight) : (data.checkins.at(-1)?.weight ?? profile.currentWeight ?? profile.startingWeight);
  $("currentWeight").textContent = `${fmt(currentWeight)}kg`;

  renderHeroMission(data, currentWeight);
  renderDailyMonthlyChecklist(data);
  renderProgressCommandGrid(data);
  renderRecoveryDashboardCards(data);
  renderStreaks(data);
  renderBadges(data);
  renderNextObjective(data);

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
  renderMealsToday(data, currentWeight);
  renderRecoveryCards(data);
  renderScore(data, currentWeight);
  renderWeekSessions(data);
  renderNextWorkout(data);
  renderLastWorkout(data);
  renderIncreaseNextWeek(data);
  renderRatios(data);
  renderMilestones(data, currentWeight);
  renderVolumeSummary(data);
  renderArmForearmDeltSummary(data);
  renderMonthlyReviewReminder(data);
  renderDraftBanner(data);
  renderRecoveryModeSection(data);
  renderClosedLoopIntelligence(data);
}

/** Additive Dashboard card — consolidates the closed-loop intelligence read into one place without touching any existing card. */
function renderClosedLoopIntelligence(data) {
  const el = $("closedLoopIntelligence");
  if (!el) return;
  const referenceDate = new Date();
  const todayISO = referenceDate.toLocaleDateString("en-CA");

  const readyToIncrease = exercisesReadyToIncrease(data.workouts || []);
  const nextProgression = readyToIncrease[0] || null;
  const nutritionConfidence = nutritionConfidenceStatus(data.mealLogs || [], todayISO);
  const preWorkout = preWorkoutReadinessToday(data.preWorkoutLogs || [], referenceDate);
  const direction = weeklyRecoveryDirection(data, referenceDate);
  const caffeine = caffeineLoadStatus(data.stimulantLogs || [], referenceDate, currentBodyweightKg(data));
  const fatigue = detectFatigueReason(data, referenceDate);
  const triggeredRules = runContingencyEngine(data, referenceDate);
  const currentConstraint = triggeredRules[0]?.title || fatigue.primaryCause;
  const activeIntervention = (data.interventions || []).slice().reverse().find(i => i.status === "Open" || i.status === "In Progress") || null;

  el.innerHTML = `
    <div class="badge-row">
      <span class="badge">Next Progression: ${nextProgression ? esc(nextProgression) : "None ready yet"}</span>
      <span class="badge">Ready to Increase: ${readyToIncrease.length}</span>
      <span class="badge ${nutritionConfidence.status === "High" ? "status-on-target" : nutritionConfidence.status === "Low" || nutritionConfidence.status === "Incomplete Day" ? "status-under" : ""}">Nutrition Confidence: ${esc(nutritionConfidence.status)}</span>
      <span class="badge">Pre-Workout Fuel: ${preWorkout ? esc(preWorkout.readinessChoice) : "Not logged today"}</span>
      <span class="badge ${direction.direction === "Push" ? "status-on-target" : direction.direction === "Prioritise Recovery" ? "status-under" : ""}">Recovery Direction: ${esc(direction.direction)}</span>
      <span class="badge">Caffeine: ${esc(caffeine.label)}</span>
      <span class="badge">Current Constraint: ${esc(currentConstraint)}</span>
      <span class="badge">Active Intervention: ${activeIntervention ? esc(activeIntervention.issue) : "None"}</span>
      <span class="badge">Reassessment Date: ${activeIntervention?.reassessDate ? esc(activeIntervention.reassessDate) : "--"}</span>
    </div>
    ${readyToIncrease.length ? `<p class="small">Ready to increase: ${readyToIncrease.map(esc).join(", ")}</p>` : ""}
  `;
}

/** Additive Dashboard section — only shown on days with no workout logged yet, never replaces any existing card. */
function renderRecoveryModeSection(data) {
  const card = $("recoveryModeCard");
  const content = $("recoveryModeContent");
  if (!card || !content) return;
  const todayISO = new Date().toLocaleDateString("en-CA");
  const trainedToday = (data.workouts || []).some(w => w.date === todayISO);
  if (trainedToday) { card.hidden = true; return; }
  card.hidden = false;

  const direction = weeklyRecoveryDirection(data);
  const directionClass = direction.direction === "Push" ? "status-on-target" : direction.direction === "Prioritise Recovery" ? "status-under" : "";
  content.innerHTML = `
    <div class="badge-row">
      <span class="badge ${directionClass}">${esc(direction.direction)}</span>
      <span class="badge">Readiness ${direction.readinessScore} (${esc(direction.readinessStatus)})</span>
      <span class="badge">Nutrition confidence: ${esc(direction.nutritionConfidence)}</span>
      <span class="badge">Caffeine: ${esc(direction.caffeineStatus)}</span>
    </div>
    ${direction.reasons.length ? `<ul>${direction.reasons.map(r => `<li class="small">${esc(r)}</li>`).join("")}</ul>` : "<p class='small'>No non-training-day recovery concerns detected.</p>"}
    <p class="small">This week's bottleneck: ${esc(direction.weeklyBottleneck)}</p>
  `;
}

function renderDraftBanner(data) {
  const card = $("draftBannerCard");
  const statusEl = $("dashDraftStatus");
  if (!card || !statusEl) return;
  const draft = data.activeWorkoutDraft;
  const hasContent = draft && draft.exercises && Object.values(draft.exercises).some(e =>
    e.set1Weight || e.set1Reps || e.set2Weight || e.set2Reps || e.notes || e.formNote ||
    e.RPE != null || e.set1RIR != null || e.set2RIR != null);
  if (!hasContent) { card.hidden = true; return; }
  card.hidden = false;
  statusEl.innerHTML = `<p class="small">Active workout draft exists for <strong>${esc(draft.day)}</strong>, last edited ${new Date(draft.lastEditedAt).toLocaleTimeString()}. Nothing is lost — resume it any time.</p>`;
}

function renderHeroMission(data, currentWeight) {
  const headline = $("heroNextWorkoutName");
  if (!headline) return;
  const days = Object.keys(data.trainingProgram || DEFAULT_TRAINING_PROGRAM);
  const last = data.workouts.at(-1);
  let nextDay = days[0];
  if (last) {
    const idx = days.indexOf(last.day || last.programDay);
    nextDay = days[(idx + 1) % days.length] ?? days[0];
  }
  headline.textContent = nextDay || "--";

  const heroPhase = $("heroPhase");
  if (heroPhase) heroPhase.textContent = data.profile.currentPhase || "--";
  const heroWeight = $("heroWeight");
  if (heroWeight) heroWeight.textContent = `${fmt(currentWeight)}kg`;
  const heroGain = $("heroGainTarget");
  if (heroGain) heroGain.textContent = data.profile.targetWeeklyGain != null ? `+${data.profile.targetWeeklyGain}kg/wk` : "--";
  const latestRecovery = data.recoveryLogs.at(-1);
  const heroRecovery = $("heroRecovery");
  if (heroRecovery) heroRecovery.textContent = latestRecovery ? `${latestRecovery.recoveryScore ?? "--"}/5` : "--";
}

function renderProgressCommandGrid(data) {
  const el = $("progressCommandGrid");
  if (!el) return;
  const compliance = weeklyComplianceRate(data.workouts, data.trainingProgram);
  const totals = weeklyVolumeByMuscleGroup(data.workouts, data.exercises);
  const armForearmSets = (totals["biceps"] || 0) + (totals["brachialis"] || 0) + (totals["triceps"] || 0) +
    (totals["forearms"] || 0) + (totals["forearm-flexors"] || 0) + (totals["forearm-extensors"] || 0);
  const armForearmPct = pct(Math.round((armForearmSets / 24) * 100));
  const latestRecovery = data.recoveryLogs.at(-1);
  const recoveryScore = latestRecovery ? Number(latestRecovery.recoveryScore) || 0 : 0;
  const recoveryPct = pct(Math.round((recoveryScore / 5) * 100));

  const tiles = [
    { label: "Weekly Compliance", value: `${compliance}%`, pctValue: compliance, good: compliance >= 80 },
    { label: "Arm + Forearm Specialisation", value: `${armForearmSets} sets`, pctValue: armForearmPct, good: armForearmPct >= 60 },
    { label: "Recovery Readiness", value: latestRecovery ? `${latestRecovery.recoveryScore}/5` : "--", pctValue: recoveryPct, good: recoveryPct >= 60 }
  ];
  el.innerHTML = tiles.map(t => `
    <div class="card command-tile">
      <span class="tile-label">${esc(t.label)}</span>
      <span class="tile-value">${esc(t.value)}</span>
      <div class="tile-bar-wrap"><div class="tile-bar-fill ${t.good ? "fill-good" : ""}" style="width:${t.pctValue}%"></div></div>
    </div>`).join("");
}

function checklistRowHtml(item) {
  return `
    <div class="checklist-row deep-link-row" data-goto-tab="${esc(item.tab)}" data-goto-anchor="${esc(item.anchor)}">
      <span>${item.done ? "✅" : "⬜"}</span><span>${esc(item.label)}</span>
      <span class="badge ${item.done ? "status-on-target" : ""}">${item.done ? "Done" : "Pending"}</span>
    </div>`;
}

function renderDailyMonthlyChecklist(data) {
  const daily = dailyChecklist(data);
  const nextEl = $("dailyFlowNextStep");
  if (nextEl) {
    nextEl.innerHTML = daily.nextStep
      ? `<div class="next-objective-card"><p class="mission-tag">Next Step</p><p class="small">${esc(daily.nextStep.label)}</p>
         <button type="button" class="secondary" data-goto-tab="${esc(daily.nextStep.tab)}" data-goto-anchor="${esc(daily.nextStep.anchor)}">Go</button></div>`
      : `<div class="ok-banner">All sequenced steps complete for today.</div>`;
  }
  const listEl = $("dailyChecklist");
  if (listEl) {
    listEl.innerHTML = `
      <div class="workout-progress-wrap">
        <div class="workout-progress-label"><span>Daily Sequence</span><span>${daily.completedCount}/${daily.totalCount} · ${daily.pct}%</span></div>
        <div class="workout-progress-bar"><div class="workout-progress-fill" style="width:${daily.pct}%"></div></div>
      </div>
      ${daily.items.map(checklistRowHtml).join("")}`;
  }
  const monthly = monthlyChecklist(data);
  const monthlyEl = $("monthlyChecklist");
  if (monthlyEl) monthlyEl.innerHTML = monthly.items.map(checklistRowHtml).join("");
}

function glowClassFor(status) {
  if (status === "green" || status === "amber-green") return "recovery-glow-green";
  if (status === "amber") return "recovery-glow-amber";
  return "recovery-glow-red";
}

function renderRecoveryDashboardCards(data) {
  const el = $("dashRecoveryGrid");
  if (!el) return;
  const referenceDate = new Date();
  const readiness = readinessScore(data, referenceDate);
  const sStats = sleepStats(data.sleepLogs || [], referenceDate);
  const weekend = weekendRecoveryStatus(data.sleepLogs || [], referenceDate);
  const caffeine = caffeineLoadStatus(data.stimulantLogs || [], referenceDate, currentBodyweightKg(data));
  const mealCompliance = recoveryMealCompliance(data.mealLogs || [], referenceDate);

  const activeSupplements = (data.supplements || []).filter(s => s.active);
  const supplementNote = activeSupplements.length
    ? activeSupplements.slice(0, 3).map(s => {
        const evidence = SUPPLEMENT_DATABASE.find(e => e.name.toLowerCase().includes(s.supplementName.toLowerCase().split(" ")[0]));
        return `${s.supplementName}${evidence ? ` (${evidence.evidenceLevel})` : ""}`;
      }).join(", ")
    : "None marked active";

  const cards = [
    { id: "dashRecoveryStatus", cls: `command-tile ${glowClassFor(readiness.status)}`, label: "Recovery Status", value: readiness.score, sub: `${readiness.trainingMode} · ${readiness.mainBottleneck}` },
    { id: "dashSleepDebtCard", cls: "command-tile", label: "Sleep Debt", value: sStats.hasData && sStats.sleepDebtHours != null ? `${sStats.sleepDebtHours}h` : "--", sub: `Last night ${sStats.hasData ? formatHoursAsHM(sStats.lastNight) : "--"} · 7d avg ${sStats.sevenDayAverage != null ? formatHoursAsHM(sStats.sevenDayAverage) : "--"}` },
    { id: "dashFuelReadiness", cls: "command-tile", label: "Fuel Readiness", value: mealCompliance.preWorkoutComplete ? "Ready" : "Pending", sub: `Pre-workout ${mealCompliance.preWorkoutComplete ? "complete" : "not logged"} · Post-workout ${mealCompliance.postWorkoutComplete ? "complete" : "not logged"}` },
    { id: "dashCaffeineLoad", cls: "command-tile", label: "Caffeine Load", value: `${caffeine.totalMg}mg`, sub: `${caffeine.status}${caffeine.maskingWarning ? " · may be masking fatigue" : ""}` },
    { id: "dashSupplementSupport", cls: "command-tile", label: "Supplement Support", value: activeSupplements.length, sub: supplementNote }
  ];
  el.innerHTML = cards.map(c => `
    <div class="${c.cls}" id="${c.id}">
      <span class="tile-label">${esc(c.label)}</span>
      <span class="tile-value">${esc(String(c.value))}</span>
      <span class="tile-sub">${esc(c.sub)}</span>
    </div>`).join("");

  const nextObjEl = $("dashRecoveryNextObjective");
  if (nextObjEl) nextObjEl.innerHTML = `<p class="mission-tag">Next Recovery Objective</p><p class="small">${esc(readiness.nextObjective)}</p>`;

  const weekendCard = $("dashWeekendRecoveryWindow");
  if (weekendCard) {
    const isWeekendWindow = [5, 6, 0].includes(referenceDate.getDay());
    weekendCard.hidden = !isWeekendWindow;
    if (isWeekendWindow) {
      weekendCard.innerHTML = `
        <p class="mission-tag">Weekend Recovery Window</p>
        <div class="recovery-battery-wrap"><div class="recovery-battery"><div class="recovery-battery-fill" style="width:${weekend.battery}%"></div></div></div>
        <p class="small">${esc(weekend.status)} · Target 8-10h Saturday and Sunday.</p>`;
    }
  }
}

function renderStreaks(data) {
  const el = $("streakGrid");
  if (!el) return;
  const trainStreak = trainingStreakWeeks(data.workouts);
  const nutritionStreak = loggingStreakDays(data.mealLogs || [], "date");
  const recoveryStreak = loggingStreakDays(data.recoveryLogs || [], "date");
  const compliance = weeklyComplianceRate(data.workouts, data.trainingProgram);

  const tiles = [
    { number: trainStreak, label: "Mission Chain (weeks)" },
    { number: `${compliance}%`, label: "Weekly Compliance" },
    { number: nutritionStreak, label: "Nutrition Discipline (days)" },
    { number: recoveryStreak, label: "Recovery Streak (days)" }
  ];
  el.innerHTML = tiles.map(t => `
    <div class="streak-tile ${Number(t.number) > 0 ? "streak-active" : ""}">
      <div class="streak-number">${esc(String(t.number))}</div>
      <div class="streak-label">${esc(t.label)}</div>
    </div>`).join("");
}

function renderBadges(data) {
  const el = $("badgeGrid");
  if (!el) return;
  const badges = computeBadges(data);
  el.innerHTML = badges.map(b => `
    <div class="badge-tile ${b.unlocked ? "unlocked" : ""}">
      <span class="badge-tile-icon">${b.icon}</span>
      <span class="badge-tile-name ${b.unlocked ? "" : "locked-name"}">${esc(b.name)}</span>
    </div>`).join("");
}

function renderNextObjective(data) {
  const el = $("dashNextObjective");
  if (!el) return;
  const last = data.workouts.at(-1);
  const flagged = (last?.exercises || []).filter(e => e.increaseNextWeek);
  const latestMeal = data.mealLogs.at(-1);
  const latestRecovery = data.recoveryLogs.at(-1);

  let objective = "Log today's workout to unlock a next objective.";
  if (flagged.length) objective = `Add reps or load to ${flagged[0].name} next session.`;
  else if (!latestRecovery) objective = "Log today's recovery to keep your readiness score accurate.";
  else if (!latestMeal) objective = "Log a meal to track today's protein and calorie target.";

  el.innerHTML = `<p class="mission-tag">Next Objective</p><p>${esc(objective)}</p>`;
}

function renderArmForearmDeltSummary(data) {
  const el = $("armForearmDeltSummary");
  if (!el) return;
  const totals = weeklyVolumeByMuscleGroup(data.workouts, data.exercises);
  const groups = [
    ["biceps", "Biceps"], ["brachialis", "Brachialis / brachioradialis"], ["triceps", "Triceps"],
    ["forearms", "Forearms (general)"], ["forearm-flexors", "Forearm flexors"], ["forearm-extensors", "Forearm extensors"],
    ["grip", "Grip / loaded holds"], ["side delts", "Side delts"]
  ];
  el.innerHTML = groups.map(([key, label]) => {
    const sets = totals[key] || 0;
    const vs = volumeStatus(key, sets);
    const extra = vs.specialisationLabel ? ` (${vs.specialisationLabel})` : "";
    return `<div class="checklist-row"><span>${vs.isPriority ? "⭐" : ""}</span><span>${esc(label)}</span><span class="badge status-${vs.status}">${sets} sets${esc(extra)}</span></div>`;
  }).join("");

  const warnings = armForearmDeltWarnings({ workouts: data.workouts, exercises: data.exercises, recoveryLogs: data.recoveryLogs });
  const warningsEl = $("armForearmDeltWarnings");
  if (warningsEl) {
    warningsEl.innerHTML = warnings.length
      ? warnings.map(w => `<div class="warning-banner">${esc(w)}</div>`).join("")
      : "<div class='ok-banner'>No arm/forearm/delt volume warnings this week.</div>";
  }
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

function renderMealsToday(data, currentWeight) {
  const statusEl = $("dashMealStatus");
  const summaryEl = $("dashMealSummary");
  if (!statusEl || !summaryEl) return;

  const today = new Date().toLocaleDateString("en-CA");
  const totals = dailyMealTotals(data.mealLogs, today);
  const targets = macroTargets(currentWeight);
  const calorieTarget = data.nutritionLogs.at(-1)?.calories || 2800;
  const remaining = remainingMacros(totals, { calories: calorieTarget, proteinMax: targets.proteinMax, proteinMin: targets.proteinMin });
  const adherence = macroAdherence(totals, { calories: calorieTarget, proteinMin: targets.proteinMin, fibre: 14 * (calorieTarget / 1000) });

  statusEl.textContent = adherence.macroStatus;
  statusEl.className = `badge status-${adherence.macroStatus === "On target" ? "on-target" : "under"}`;
  summaryEl.innerHTML = totals.mealCount
    ? `<p class="small">${totals.calories}kcal · ${totals.protein}g protein consumed (${remaining.caloriesRemaining} kcal / ${remaining.proteinRemaining}g protein remaining) across ${totals.mealCount} meal${totals.mealCount === 1 ? "" : "s"}.</p>`
    : "<p class='small'>No meals logged yet today.</p>";
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
  const isArmDay = /Arm.*Forearm.*Delt/i.test(nextDay);
  $("nextWorkout").innerHTML = `<p><strong>${esc(nextDay)}</strong></p><p class="small">${esc(exercises)}</p>` +
    (isArmDay ? `<div class="ok-banner">Arm + Forearm + Delt Specialisation next — focus on clean reps, controlled eccentrics, forearm tension, side-delt control, elbow/wrist comfort and full contractions.</div>` : "");
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
