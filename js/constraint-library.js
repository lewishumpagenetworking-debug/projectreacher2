// Local knowledge library: a structured, versioned, queryable array of ConstraintRule
// objects. This is read-only reference data + a pure evaluate() function per rule — no
// external AI API, no network call, fully deterministic. Ported from and supersedes the
// 5 rules previously in contingency-engine.js (now retired); see constraint-engine.js for
// the evidence-scoring/ranking engine that runs these rules against real data.
import { parseLogDate } from "./dates.js";
import {
  average, dailyMealTotals, exerciseProgressionStatus, nutritionConfidenceStatus, calorieAdherence,
  weeklyRateOfGain, readinessScore, weeklyComplianceRate, volumeStatus, sleepStats, weeklyVolumeByMuscleGroup
} from "./calculations.js";

export const CONSTRAINT_LIBRARY_VERSION = "1.0.0";

export const CONSTRAINT_CATEGORIES = {
  PERFORMANCE_PROGRESSION: "performance-progression",
  BODYWEIGHT_PROGRESSION: "bodyweight-progression",
  NUTRITION: "nutrition",
  RECOVERY: "recovery",
  PROGRAMME_DESIGN: "programme-design",
  EXECUTION_TECHNIQUE: "execution-technique",
  ADHERENCE: "adherence",
  BODY_COMPOSITION: "body-composition",
  DATA_QUALITY: "data-quality"
};

function round1(n) { return Math.round(n * 10) / 10; }

/** No evidence at all found (rule never got the chance to fire either way). */
const NOT_APPLICABLE = { fired: false, considered: false, supportPoints: 0, contradictPoints: 0, dataSufficient: true, evidenceDetail: [], contradictingDetail: [], missingData: [] };

/**
 * Fills in every ConstraintRule field with a sensible default, mirroring the
 * Supp()-factory pattern in js/recovery-data.js. `evaluate(data, referenceDate)` must
 * return { fired, considered, supportPoints, contradictPoints, dataSufficient,
 * evidenceDetail: string[], contradictingDetail: string[], missingData: string[] }.
 */
function Rule(overrides) {
  return {
    id: "", category: CONSTRAINT_CATEGORIES.DATA_QUALITY, title: "", description: "",
    appliesTo: [], requiredSignals: [], supportingSignals: [], contradictingSignals: [],
    minimumDataRequirements: [], confidenceModifiers: [], impactLevel: "medium",
    recommendedActions: [], monitoringMetrics: [], reassessmentWindow: "Next weekly review",
    escalationRules: [], educationalExplanation: "", version: CONSTRAINT_LIBRARY_VERSION,
    evaluate: () => NOT_APPLICABLE,
    ...overrides
  };
}

function workoutVolume(w) {
  return (w.exercises || []).reduce((sum, e) =>
    sum + (Number(e.set1Weight) || 0) * (Number(e.set1Reps) || 0) + (Number(e.set2Weight) || 0) * (Number(e.set2Reps) || 0), 0);
}

export const CONSTRAINT_RULES = [
  Rule({
    id: "progression-stalled",
    category: CONSTRAINT_CATEGORIES.PERFORMANCE_PROGRESSION,
    title: "Progression stalled on repeated exercises",
    description: "An exercise has held or reduced load for 3 consecutive logged sessions.",
    appliesTo: ["training"],
    requiredSignals: ["3+ comparable logged sessions for the same exercise"],
    supportingSignals: ["Progression was attempted (increaseNextWeek flagged)"],
    contradictingSignals: ["Reps, execution, ROM or RIR improved across the same window"],
    minimumDataRequirements: ["At least 3 logged sessions of the same exercise"],
    impactLevel: "medium",
    recommendedActions: ["Short deload", "Form/setup check", "Exercise substitution"],
    monitoringMetrics: ["Load", "Reps", "RIR"],
    reassessmentWindow: "Next weekly review",
    escalationRules: ["If unresolved after 2 weekly reviews, consider a programme-design change"],
    educationalExplanation: "Three or more flat/reducing sessions on the same movement is the standard threshold before considering the exercise plateaued rather than just a single off day.",
    evaluate(data) {
      const byName = Object.fromEntries((data.exercises || []).map(e => [e.name, e]));
      const byExercise = {};
      (data.workouts || []).forEach(w => (w.exercises || []).forEach(e => {
        (byExercise[e.name] ||= []).push({ ...e, date: w.date });
      }));
      const stalled = [];
      let considered = false;
      Object.entries(byExercise).forEach(([name, entries]) => {
        const sorted = entries.slice().sort((a, b) => (parseLogDate(a.date) || 0) - (parseLogDate(b.date) || 0));
        const recent = sorted.slice(-3);
        if (recent.length < 3) return;
        considered = true;
        const statuses = recent.map((e, i) => exerciseProgressionStatus(e, byName[name], { previousEntry: recent[i - 1] || null }).status);
        if (statuses.every(s => ["Reduce Load", "Hold Load"].includes(s))) stalled.push(name);
      });
      if (!stalled.length) {
        return { ...NOT_APPLICABLE, considered, missingData: considered ? [] : ["Fewer than 3 comparable sessions logged for any exercise"] };
      }
      return {
        fired: true, considered: true, supportPoints: 3, contradictPoints: 0, dataSufficient: true,
        evidenceDetail: [`${stalled.join(", ")} have held or reduced load for 3 consecutive logged sessions.`],
        contradictingDetail: [], missingData: []
      };
    }
  }),

  Rule({
    id: "bodyweight-flat-data-incomplete",
    category: CONSTRAINT_CATEGORIES.DATA_QUALITY,
    title: "Bodyweight flat — nutrition data incomplete",
    description: "Bodyweight has moved under 0.3kg over 21+ days, but nutrition logging isn't complete enough to justify a calorie change.",
    appliesTo: ["bodyweight", "nutrition"],
    requiredSignals: ["21+ days of bodyweight history", "Nutrition confidence below High"],
    minimumDataRequirements: ["At least 2 bodyweight logs spanning 21+ days"],
    impactLevel: "medium",
    recommendedActions: ["Complete nutrition tracking (every meal, full macros) for several days before reassessing"],
    monitoringMetrics: ["Nutrition logging completeness"],
    reassessmentWindow: "Next weekly review",
    escalationRules: [],
    educationalExplanation: "A calorie decision without complete intake data is a guess, not a controlled change — data quality must be repaired first.",
    evaluate(data, referenceDate = new Date()) {
      const dated = (data.bodyweightLogs || []).map(b => ({ ...b, d: parseLogDate(b.date) })).filter(x => x.d).sort((a, b) => a.d - b.d);
      if (dated.length < 2) return { ...NOT_APPLICABLE, considered: false, missingData: ["Fewer than 2 bodyweight logs"] };
      const cutoff = new Date(referenceDate); cutoff.setDate(cutoff.getDate() - 21);
      if (dated[0].d > cutoff) return { ...NOT_APPLICABLE, considered: false, missingData: ["Fewer than 21 days of bodyweight history"] };
      const inWindow = dated.filter(x => x.d >= cutoff);
      if (inWindow.length < 2) return { ...NOT_APPLICABLE, considered: false, missingData: ["Fewer than 21 days of bodyweight history"] };
      const change = Number(inWindow.at(-1).morningBodyweight) - Number(inWindow[0].morningBodyweight);
      if (change >= 0.3) return { ...NOT_APPLICABLE, considered: true };
      const todayISO = referenceDate.toLocaleDateString("en-CA");
      const confidence = nutritionConfidenceStatus(data.mealLogs || [], todayISO);
      if (confidence.status === "High") return { ...NOT_APPLICABLE, considered: true };
      return {
        fired: true, considered: true, supportPoints: 2, contradictPoints: 0, dataSufficient: false,
        evidenceDetail: [`Bodyweight has moved only ${round1(change)}kg over the last 21 days, and today's nutrition data confidence is ${confidence.status}.`],
        contradictingDetail: [], missingData: ["Reliable calorie/macro logging"]
      };
    }
  }),

  Rule({
    id: "bodyweight-flat-calorie-deficit",
    category: CONSTRAINT_CATEGORIES.BODYWEIGHT_PROGRESSION,
    title: "Bodyweight flat for 21+ days",
    description: "Bodyweight has moved under 0.3kg over 21+ days despite a lean-bulk target, with reliable nutrition data.",
    appliesTo: ["bodyweight", "nutrition"],
    requiredSignals: ["21+ days of bodyweight history", "Nutrition confidence High"],
    contradictingSignals: ["Rolling average still trending upward"],
    minimumDataRequirements: ["At least 2 bodyweight logs spanning 21+ days", "High-confidence nutrition logging"],
    impactLevel: "high",
    recommendedActions: ["Propose a 150-200kcal increase and re-check the 7-day average in 2 weeks", "Tighten adherence to the existing target before increasing it further"],
    monitoringMetrics: ["7-day bodyweight rolling average", "Calorie adherence"],
    reassessmentWindow: "2 weeks",
    escalationRules: ["If still flat after the calorie increase and 2 more weeks, review training and recovery factors"],
    educationalExplanation: "Rolling averages over 14-21 days filter out glycogen/water noise, so a genuinely flat multi-week average with high-confidence logging is the strongest evidence for a real calorie shortfall.",
    evaluate(data, referenceDate = new Date()) {
      const dated = (data.bodyweightLogs || []).map(b => ({ ...b, d: parseLogDate(b.date) })).filter(x => x.d).sort((a, b) => a.d - b.d);
      if (dated.length < 2) return { ...NOT_APPLICABLE, considered: false, missingData: ["Fewer than 2 bodyweight logs"] };
      const cutoff = new Date(referenceDate); cutoff.setDate(cutoff.getDate() - 21);
      if (dated[0].d > cutoff) return { ...NOT_APPLICABLE, considered: false, missingData: ["Fewer than 21 days of bodyweight history"] };
      const inWindow = dated.filter(x => x.d >= cutoff);
      if (inWindow.length < 2) return { ...NOT_APPLICABLE, considered: false, missingData: ["Fewer than 21 days of bodyweight history"] };
      const change = Number(inWindow.at(-1).morningBodyweight) - Number(inWindow[0].morningBodyweight);
      if (change >= 0.3) return { ...NOT_APPLICABLE, considered: true };
      const todayISO = referenceDate.toLocaleDateString("en-CA");
      const confidence = nutritionConfidenceStatus(data.mealLogs || [], todayISO);
      if (confidence.status !== "High") return { ...NOT_APPLICABLE, considered: true };
      const targetCalories = data.nutritionLogs?.at(-1)?.calories || 2800;
      const todayTotals = dailyMealTotals(data.mealLogs || [], todayISO);
      const adherencePct = calorieAdherence(todayTotals.calories, targetCalories);
      const adherenceHigh = adherencePct != null && adherencePct >= 90;
      return {
        fired: true, considered: true, supportPoints: adherenceHigh ? 3 : 2, contradictPoints: 0, dataSufficient: true,
        evidenceDetail: [`Bodyweight has moved only ${round1(change)}kg over the last 21 days despite a lean-bulk target, with high nutrition confidence${adherenceHigh ? " and high calorie adherence" : ""}.`],
        contradictingDetail: [], missingData: []
      };
    }
  }),

  Rule({
    id: "bodyweight-rate-too-fast",
    category: CONSTRAINT_CATEGORIES.BODYWEIGHT_PROGRESSION,
    title: "Bodyweight gain faster than target",
    description: "Weekly rate of gain has exceeded 0.45kg/week, well above a typical lean-bulk target.",
    appliesTo: ["bodyweight", "nutrition"],
    requiredSignals: ["Weekly rate of gain above 0.45kg/week"],
    minimumDataRequirements: ["Enough bodyweight logs to compute a weekly rate of gain"],
    impactLevel: "medium",
    recommendedActions: ["Review calorie surplus size", "Confirm the rate against several weeks, not one abnormal week"],
    monitoringMetrics: ["Weekly rate of gain", "Waist measurement trend"],
    reassessmentWindow: "2 weeks",
    escalationRules: [],
    educationalExplanation: "A single fast week is usually water/glycogen noise; only a sustained rate above target across two or more weeks justifies a calorie reduction.",
    evaluate(data) {
      const rate = weeklyRateOfGain(data.bodyweightLogs || []);
      if (rate == null) return { ...NOT_APPLICABLE, considered: false, missingData: ["Not enough bodyweight logs to compute a weekly rate"] };
      if (rate <= 0.45) return { ...NOT_APPLICABLE, considered: true };
      return {
        fired: true, considered: true, supportPoints: 2, contradictPoints: 0, dataSufficient: true,
        evidenceDetail: [`Current weekly rate of gain is ${round1(rate)}kg/week, above the 0.45kg/week upper bound for a controlled lean bulk.`],
        contradictingDetail: [], missingData: []
      };
    }
  }),

  Rule({
    id: "pre-workout-carbs-low",
    category: CONSTRAINT_CATEGORIES.NUTRITION,
    title: "Pre-workout carbs consistently low",
    description: "Pre-workout carbohydrate intake is repeatedly low, coinciding with below-average session volume.",
    appliesTo: ["nutrition", "training"],
    requiredSignals: ["3+ of the last 6 pre-workout logs under 30g carbs", "Those sessions' volume below 90% of the overall average"],
    minimumDataRequirements: ["At least 4 pre-workout logs", "At least 3 total workouts with logged volume"],
    impactLevel: "medium",
    recommendedActions: ["Add 30-80g carbs 60-120 minutes before training and compare volume over 2 weeks"],
    monitoringMetrics: ["Session volume", "Pre-workout carbohydrate intake"],
    reassessmentWindow: "2 weeks",
    escalationRules: [],
    educationalExplanation: "Low pre-workout glycogen availability is a common, easily-corrected explanation for underperformance before assuming a training or recovery cause.",
    evaluate(data) {
      const preLogs = (data.preWorkoutLogs || []).filter(p => p.carbsG != null).slice(-6);
      if (preLogs.length < 4) return { ...NOT_APPLICABLE, considered: false, missingData: ["Fewer than 4 pre-workout logs"] };
      const lowLogs = preLogs.filter(p => p.carbsG < 30);
      if (lowLogs.length < 3) return { ...NOT_APPLICABLE, considered: true };
      const allVolumes = (data.workouts || []).map(workoutVolume).filter(v => v > 0);
      if (allVolumes.length < 3) return { ...NOT_APPLICABLE, considered: false, missingData: ["Fewer than 3 workouts with logged volume"] };
      const overallAverage = average(allVolumes);
      const volumeByDate = Object.fromEntries((data.workouts || []).map(w => [w.date, workoutVolume(w)]));
      const lowCarbSessionVolumes = lowLogs.map(p => volumeByDate[p.date]).filter(v => v != null);
      if (lowCarbSessionVolumes.length < 2) return { ...NOT_APPLICABLE, considered: true };
      const lowCarbAverage = average(lowCarbSessionVolumes);
      if (overallAverage == null || lowCarbAverage == null || lowCarbAverage >= overallAverage * 0.9) {
        return { ...NOT_APPLICABLE, considered: true, contradictingDetail: ["Session volume on low-carb days is not actually below average."] };
      }
      return {
        fired: true, considered: true, supportPoints: 2, contradictPoints: 0, dataSufficient: true,
        evidenceDetail: [`${lowLogs.length} of the last ${preLogs.length} pre-workout logs had under 30g carbs, and those sessions averaged ${round1(lowCarbAverage)}kg volume vs. a ${round1(overallAverage)}kg overall average.`],
        contradictingDetail: [], missingData: []
      };
    }
  }),

  Rule({
    id: "protein-skin-correlation",
    category: CONSTRAINT_CATEGORIES.NUTRITION,
    title: "Possible protein/dairy-skin pattern",
    description: "Average protein intake on breakout days is notably higher than on other logged days.",
    appliesTo: ["nutrition"],
    requiredSignals: ["3+ high-severity breakout days logged", "3+ protein readings on both breakout and non-breakout days"],
    minimumDataRequirements: ["At least 3 skin logs with breakouts >= 3", "At least 3 meal-logged days in each group"],
    impactLevel: "low",
    recommendedActions: ["Propose a controlled 2-week substitution test of the suspected protein source, not an immediate permanent removal"],
    monitoringMetrics: ["Skin log severity", "Protein source intake"],
    reassessmentWindow: "2 weeks",
    escalationRules: [],
    educationalExplanation: "This is a pattern worth watching, not a proven cause — some people report a link between very high dairy/whey intake and breakouts, but correlation here is not causation.",
    evaluate(data) {
      const skinLogs = data.skinLogs || [];
      const mealLogs = data.mealLogs || [];
      const breakoutDates = [...new Set(skinLogs.filter(s => Number(s.breakouts) >= 3).map(s => s.date))];
      if (breakoutDates.length < 3) return { ...NOT_APPLICABLE, considered: false, missingData: ["Fewer than 3 high-severity breakout days logged"] };
      const otherDates = [...new Set(mealLogs.map(m => m.date))].filter(d => !breakoutDates.includes(d));
      const proteinFor = (dates) => dates.map(d => dailyMealTotals(mealLogs, d).protein).filter(v => v > 0);
      const onBreakoutDays = proteinFor(breakoutDates);
      const onOtherDays = proteinFor(otherDates);
      if (onBreakoutDays.length < 3 || onOtherDays.length < 3) return { ...NOT_APPLICABLE, considered: false, missingData: ["Fewer than 3 protein readings in one of the two groups"] };
      const avgBreakout = average(onBreakoutDays);
      const avgOther = average(onOtherDays);
      if (avgBreakout == null || avgOther == null || avgBreakout <= avgOther * 1.2) return { ...NOT_APPLICABLE, considered: true };
      return {
        fired: true, considered: true, supportPoints: 1, contradictPoints: 0, dataSufficient: true,
        evidenceDetail: [`Average protein intake on breakout days (${round1(avgBreakout)}g) is notably higher than on other logged days (${round1(avgOther)}g).`],
        contradictingDetail: [], missingData: []
      };
    }
  }),

  Rule({
    id: "sleep-deficit-pattern",
    category: CONSTRAINT_CATEGORIES.RECOVERY,
    title: "Sustained sleep deficit",
    description: "Average sleep over the last 7 logged nights is below 6 hours.",
    appliesTo: ["recovery", "training"],
    requiredSignals: ["7-day average sleep below 6 hours"],
    minimumDataRequirements: ["At least 4 sleep logs in the last 7 days"],
    impactLevel: "high",
    recommendedActions: ["Prioritise sleep duration before any other change", "Reduce non-essential evening stimulant use"],
    monitoringMetrics: ["7-day average sleep duration", "Readiness score"],
    reassessmentWindow: "Next weekly review",
    escalationRules: ["If sleep debt persists 2+ weeks, treat as the primary constraint over training or nutrition changes"],
    educationalExplanation: "Sleep debt degrades recovery capacity, technique quality and session output — it is usually a higher-leverage fix than a training or nutrition change.",
    evaluate(data, referenceDate = new Date()) {
      const stats = sleepStats(data.sleepLogs || [], referenceDate);
      if (!stats.hasData || stats.sevenDayCount < 4) return { ...NOT_APPLICABLE, considered: false, missingData: ["Fewer than 4 sleep logs in the last 7 days"] };
      if (stats.sevenDayAverage == null || stats.sevenDayAverage >= 6) return { ...NOT_APPLICABLE, considered: true };
      return {
        fired: true, considered: true, supportPoints: 3, contradictPoints: 0, dataSufficient: true,
        evidenceDetail: [`7-day average sleep is ${round1(stats.sevenDayAverage)}h, below the 6h threshold.`],
        contradictingDetail: [], missingData: []
      };
    }
  }),

  Rule({
    id: "accumulated-fatigue",
    category: CONSTRAINT_CATEGORIES.RECOVERY,
    title: "Accumulated fatigue trend",
    description: "Readiness has been red or red-amber on 3+ of the last 7 days.",
    appliesTo: ["recovery", "training"],
    requiredSignals: ["Readiness red/red-amber on 3+ of the last 7 days"],
    minimumDataRequirements: ["At least 3 recovery check-ins in the last 7 days"],
    impactLevel: "high",
    recommendedActions: ["Consider a short deload", "Reduce session frequency or volume for the coming week"],
    monitoringMetrics: ["Daily readiness score"],
    reassessmentWindow: "Next weekly review",
    escalationRules: ["If red readiness persists into a second week, escalate to a training-volume reduction"],
    educationalExplanation: "Repeated red/red-amber readiness days across a week is a stronger signal than any single bad day, and points to systemic rather than local fatigue.",
    evaluate(data, referenceDate = new Date()) {
      const recentLogs = (data.recoveryLogs || []).filter(r => {
        const d = parseLogDate(r.date);
        return d && (referenceDate - d) / 86400000 <= 7;
      });
      if (recentLogs.length < 3) return { ...NOT_APPLICABLE, considered: false, missingData: ["Fewer than 3 recovery check-ins in the last 7 days"] };
      let redDays = 0;
      recentLogs.forEach(log => {
        const d = parseLogDate(log.date);
        const status = readinessScore(data, d || referenceDate).status;
        if (["red", "red-amber"].includes(status)) redDays++;
      });
      if (redDays < 3) return { ...NOT_APPLICABLE, considered: true };
      return {
        fired: true, considered: true, supportPoints: 3, contradictPoints: 0, dataSufficient: true,
        evidenceDetail: [`Readiness was red or red-amber on ${redDays} of the last ${recentLogs.length} logged days.`],
        contradictingDetail: [], missingData: []
      };
    }
  }),

  Rule({
    id: "insufficient-volume",
    category: CONSTRAINT_CATEGORIES.PROGRAMME_DESIGN,
    title: "Muscle group under target volume",
    description: "One or more muscle groups are receiving under-target weekly set volume.",
    appliesTo: ["training"],
    requiredSignals: ["volumeStatus 'under' for a tracked muscle group this week"],
    minimumDataRequirements: ["At least one logged workout this week"],
    impactLevel: "medium",
    recommendedActions: ["Add sets to the under-volume muscle group", "Review exercise selection for that group"],
    monitoringMetrics: ["Weekly set volume by muscle group"],
    reassessmentWindow: "Next weekly review",
    escalationRules: [],
    educationalExplanation: "Weekly set volume below the target range is a direct, correctable input rather than a symptom — worth checking before assuming a recovery or nutrition cause.",
    evaluate(data, referenceDate = new Date()) {
      const totals = weeklyVolumeByMuscleGroup(data.workouts || [], data.exercises || [], referenceDate);
      if (!Object.keys(totals).length) return { ...NOT_APPLICABLE, considered: false, missingData: ["No workouts logged this week"] };
      const underGroups = Object.entries(totals).filter(([group, sets]) => volumeStatus(group, sets).status === "under").map(([group]) => group);
      if (!underGroups.length) return { ...NOT_APPLICABLE, considered: true };
      return {
        fired: true, considered: true, supportPoints: 2, contradictPoints: 0, dataSufficient: true,
        evidenceDetail: [`Under-target weekly volume: ${underGroups.join(", ")}.`],
        contradictingDetail: [], missingData: []
      };
    }
  }),

  Rule({
    id: "missed-sessions",
    category: CONSTRAINT_CATEGORIES.ADHERENCE,
    title: "Low weekly session compliance",
    description: "Weekly training compliance is below 70% of the scheduled programme.",
    appliesTo: ["training", "adherence"],
    requiredSignals: ["Weekly compliance rate below 70%"],
    minimumDataRequirements: ["A defined training programme for the week"],
    impactLevel: "high",
    recommendedActions: ["Identify and address the specific barrier to attendance before any programme change"],
    monitoringMetrics: ["Weekly compliance rate"],
    reassessmentWindow: "Next weekly review",
    escalationRules: [],
    educationalExplanation: "Low adherence explains poor outcomes on its own — no programme, nutrition or recovery change should be made until sessions are actually being completed.",
    evaluate(data, referenceDate = new Date()) {
      if (!Object.keys(data.trainingProgram || {}).length) return { ...NOT_APPLICABLE, considered: false, missingData: ["No training programme defined"] };
      const rate = weeklyComplianceRate(data.workouts || [], data.trainingProgram || {}, referenceDate);
      if (rate >= 70) return { ...NOT_APPLICABLE, considered: true };
      return {
        fired: true, considered: true, supportPoints: 3, contradictPoints: 0, dataSufficient: true,
        evidenceDetail: [`Weekly compliance is ${rate}%, below the 70% threshold.`],
        contradictingDetail: [], missingData: []
      };
    }
  }),

  Rule({
    id: "pain-review",
    category: CONSTRAINT_CATEGORIES.EXECUTION_TECHNIQUE,
    title: "Repeated pain flagged",
    description: "Pain/discomfort flagged 2+ times on the same exercise within the last 14 days.",
    appliesTo: ["training", "safety"],
    requiredSignals: ["painFlag set 2+ times on the same exercise in 14 days"],
    minimumDataRequirements: ["At least one workout in the last 14 days"],
    impactLevel: "high",
    recommendedActions: ["Hold progression on the flagged exercise(s)", "Review form/setup", "Consider substitution or professional review if it persists"],
    monitoringMetrics: ["Pain flag frequency per exercise"],
    reassessmentWindow: "Next weekly review",
    escalationRules: ["Sharp or persistent pain triggers the immediate safety escalation path instead of waiting for weekly review"],
    educationalExplanation: "Repeated pain on the same movement suggests a form, load or joint issue rather than normal training soreness.",
    evaluate(data, referenceDate = new Date()) {
      const recentWorkouts = (data.workouts || []).filter(w => {
        const d = parseLogDate(w.date);
        return d && (referenceDate - d) / 86400000 <= 14;
      });
      if (!recentWorkouts.length) return { ...NOT_APPLICABLE, considered: false, missingData: ["No workouts logged in the last 14 days"] };
      const painByExercise = {};
      recentWorkouts.forEach(w => (w.exercises || []).forEach(e => {
        if (e.painFlag) painByExercise[e.name] = (painByExercise[e.name] || 0) + 1;
      }));
      const flagged = Object.entries(painByExercise).filter(([, count]) => count >= 2);
      if (!flagged.length) return { ...NOT_APPLICABLE, considered: true };
      return {
        fired: true, considered: true, supportPoints: 3, contradictPoints: 0, dataSufficient: true,
        evidenceDetail: [`Pain/discomfort flagged 2+ times in the last 14 days on: ${flagged.map(([n, c]) => `${n} (${c}x)`).join(", ")}.`],
        contradictingDetail: [], missingData: []
      };
    }
  }),

  Rule({
    id: "technique-degradation",
    category: CONSTRAINT_CATEGORIES.EXECUTION_TECHNIQUE,
    title: "Declining technique quality",
    description: "Logged form quality on an exercise is trending down across its last 3 comparable sessions.",
    appliesTo: ["training"],
    requiredSignals: ["formQuality logged for 3+ comparable sessions of the same exercise", "Each session's formQuality lower than the previous"],
    minimumDataRequirements: ["At least 3 sessions of the same exercise with formQuality logged"],
    impactLevel: "medium",
    recommendedActions: ["Reduce load slightly and rebuild technique before continuing to progress load"],
    monitoringMetrics: ["formQuality rating"],
    reassessmentWindow: "Next weekly review",
    escalationRules: [],
    educationalExplanation: "A consistent downward trend in self-rated form quality — not one off session — is what distinguishes real technical degradation from ordinary session-to-session variation.",
    evaluate(data) {
      const byExercise = {};
      (data.workouts || []).forEach(w => (w.exercises || []).forEach(e => {
        if (e.formQuality != null) (byExercise[e.name] ||= []).push({ ...e, date: w.date });
      }));
      const declining = [];
      let considered = false;
      Object.entries(byExercise).forEach(([name, entries]) => {
        const sorted = entries.slice().sort((a, b) => (parseLogDate(a.date) || 0) - (parseLogDate(b.date) || 0));
        const recent = sorted.slice(-3);
        if (recent.length < 3) return;
        considered = true;
        const qualities = recent.map(e => Number(e.formQuality));
        if (qualities[0] > qualities[1] && qualities[1] > qualities[2]) declining.push(name);
      });
      if (!declining.length) return { ...NOT_APPLICABLE, considered, missingData: considered ? [] : ["Fewer than 3 sessions with formQuality logged for any exercise"] };
      return {
        fired: true, considered: true, supportPoints: 2, contradictPoints: 0, dataSufficient: true,
        evidenceDetail: [`Form quality has declined across the last 3 logged sessions on: ${declining.join(", ")}.`],
        contradictingDetail: [], missingData: []
      };
    }
  }),

  Rule({
    id: "waist-increasing-quickly",
    category: CONSTRAINT_CATEGORIES.BODY_COMPOSITION,
    title: "Waist increasing faster than expected",
    description: "Waist has grown 2cm+ between the first and most recent logged measurement.",
    appliesTo: ["body-composition"],
    requiredSignals: ["Waist increased 2cm+ across logged measurements"],
    minimumDataRequirements: ["At least 2 waist measurements logged"],
    impactLevel: "medium",
    recommendedActions: ["Review calorie surplus size", "Confirm the change against several measurements, not one reading"],
    monitoringMetrics: ["Waist measurement", "Weekly rate of bodyweight gain"],
    reassessmentWindow: "Next monthly review",
    escalationRules: [],
    educationalExplanation: "A rapidly growing waist alongside a lean-bulk target usually points to a surplus larger than intended rather than a training issue.",
    evaluate(data) {
      const dated = (data.measurements || []).map(m => ({ ...m, d: parseLogDate(m.date) })).filter(x => x.d && x.waist != null).sort((a, b) => a.d - b.d);
      if (dated.length < 2) return { ...NOT_APPLICABLE, considered: false, missingData: ["Fewer than 2 waist measurements logged"] };
      const waistChange = Number(dated.at(-1).waist) - Number(dated[0].waist);
      if (waistChange < 2) return { ...NOT_APPLICABLE, considered: true };
      return {
        fired: true, considered: true, supportPoints: 2, contradictPoints: 0, dataSufficient: true,
        evidenceDetail: [`Waist has increased ${round1(waistChange)}cm between the first and most recent logged measurement.`],
        contradictingDetail: [], missingData: []
      };
    }
  }),

  Rule({
    id: "insufficient-history",
    category: CONSTRAINT_CATEGORIES.DATA_QUALITY,
    title: "Insufficient training history for reliable analysis",
    description: "Fewer than 4 workouts have been logged in total — too little history for a confident diagnosis.",
    appliesTo: ["data-quality"],
    requiredSignals: ["Fewer than 4 workouts logged overall"],
    minimumDataRequirements: [],
    impactLevel: "low",
    recommendedActions: ["Continue logging sessions normally — no change is justified from this little history"],
    monitoringMetrics: ["Total workouts logged"],
    reassessmentWindow: "Next weekly review",
    escalationRules: [],
    educationalExplanation: "Early in tracking, evidence should be collected, not acted on — most rules in this library require several comparable sessions before they can fire at all.",
    evaluate(data) {
      const count = (data.workouts || []).length;
      if (count >= 4) return { ...NOT_APPLICABLE, considered: true };
      return {
        fired: true, considered: true, supportPoints: 1, contradictPoints: 0, dataSufficient: false,
        evidenceDetail: [`Only ${count} workout(s) logged in total.`],
        contradictingDetail: [], missingData: ["More logged training history"]
      };
    }
  })
];

export function getConstraintRuleById(id) {
  return CONSTRAINT_RULES.find(r => r.id === id) || null;
}
