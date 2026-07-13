// Weekly analysis-readiness score (spec section 25). Missing data isn't weighted equally —
// scheduled sessions and session reviews carry the most diagnostic importance. Pure,
// read-only: never writes, never guesses at missing data.
import { weeklyComplianceRate, isSessionReviewComplete } from "./calculations.js";
import { parseLogDate } from "./dates.js";

const WEIGHTS = {
  scheduledSessions: 25, sessionReviews: 20, nutritionLogging: 15,
  weighIns: 15, recoveryCheckins: 15, activePlanCompliance: 5, measurementsDue: 5
};

function withinDays(dateStr, referenceDate, days) {
  const d = parseLogDate(dateStr);
  return d && (referenceDate - d) / 86400000 <= days;
}

export function computeAnalysisReadiness(data, referenceDate = new Date()) {
  const missing = [];
  let score = 0;
  let maxScore = 0;

  const dayCount = Object.keys(data.trainingProgram || {}).length;
  if (dayCount) {
    maxScore += WEIGHTS.scheduledSessions;
    const compliance = weeklyComplianceRate(data.workouts || [], data.trainingProgram || {}, referenceDate);
    score += WEIGHTS.scheduledSessions * (compliance / 100);
    if (compliance < 100) missing.push({ id: "sessions", label: `${100 - compliance}% of scheduled sessions not yet logged this week`, tab: "train", anchor: "daySelect" });
  }

  const sessionsThisWeek = (data.workouts || []).filter(w => withinDays(w.date, referenceDate, 7));
  if (sessionsThisWeek.length) {
    maxScore += WEIGHTS.sessionReviews;
    const completeCount = sessionsThisWeek.filter(w => isSessionReviewComplete(w.sessionReview)).length;
    score += WEIGHTS.sessionReviews * (completeCount / sessionsThisWeek.length);
    if (completeCount < sessionsThisWeek.length) missing.push({ id: "session-reviews", label: `${sessionsThisWeek.length - completeCount} session review(s) incomplete this week`, tab: "train", anchor: "workoutHistory" });
  }

  maxScore += WEIGHTS.nutritionLogging;
  const daysWithMeals = new Set((data.mealLogs || []).filter(m => withinDays(m.date, referenceDate, 7)).map(m => m.date)).size;
  score += WEIGHTS.nutritionLogging * Math.min(1, daysWithMeals / 7);
  if (daysWithMeals < 5) missing.push({ id: "nutrition-logging", label: `Only ${daysWithMeals}/7 days have logged meals this week`, tab: "nutrition", anchor: undefined });

  maxScore += WEIGHTS.weighIns;
  const weighIns = (data.bodyweightLogs || []).filter(b => withinDays(b.date, referenceDate, 7)).length;
  score += WEIGHTS.weighIns * Math.min(1, weighIns / 5);
  if (weighIns < 4) missing.push({ id: "weigh-ins", label: `Only ${weighIns}/7 weigh-ins logged this week`, tab: "body", anchor: "bwWeight" });

  maxScore += WEIGHTS.recoveryCheckins;
  const recoveryCheckins = (data.recoveryLogs || []).filter(r => withinDays(r.date, referenceDate, 7)).length;
  score += WEIGHTS.recoveryCheckins * Math.min(1, recoveryCheckins / 5);
  if (recoveryCheckins < 4) missing.push({ id: "recovery-checkins", label: `Only ${recoveryCheckins}/7 recovery check-ins logged this week`, tab: "recovery", anchor: undefined });

  maxScore += WEIGHTS.activePlanCompliance;
  const hasOpenCase = (data.constraintCases || []).some(c => ["active", "improving", "escalated"].includes(c.status));
  if (!hasOpenCase) {
    score += WEIGHTS.activePlanCompliance; // not applicable this week -> full credit
  } else {
    const anyComplianceLogged = sessionsThisWeek.some(w => w.sessionReview?.restPeriodsFollowed != null);
    score += WEIGHTS.activePlanCompliance * (anyComplianceLogged ? 1 : 0);
    if (!anyComplianceLogged) missing.push({ id: "plan-compliance", label: "No compliance evidence logged for the active plan this week", tab: "train", anchor: "sessionReviewSection" });
  }

  // Measurement cadence is monthly, not weekly-critical — kept at low weight and always
  // credited here; monthlyChecklist() elsewhere already surfaces when one is actually due.
  maxScore += WEIGHTS.measurementsDue;
  score += WEIGHTS.measurementsDue;

  const pct = maxScore ? Math.round((score / maxScore) * 100) : 100;
  let level;
  if (pct >= 90) level = "Ready";
  else if (pct >= 70) level = "Mostly ready";
  else if (pct >= 40) level = "Limited confidence";
  else level = "Insufficient data";

  return { pct, level, missing, score: Math.round(score), maxScore };
}
