// Context Builder + read-only "tools" for the AI Specialists. Every tool function is a
// pure read of already-loaded `data` — none of them can write, and none of them are ever
// called unless the corresponding data-category permission (data.aiSettings.
// dataCategoryPermissions) has been explicitly granted by the user in AI Settings. This
// keeps "Claude only sees what it's allowed to see" enforced in one place, independent of
// whatever the model itself asks for.
import { LIBRARY_ENTRIES } from "./library-data.js";
import {
  sleepStats, weekendRecoveryStatus, readinessScore, ratios
} from "./calculations.js";

const PERMISSION_DENIED = (category) => ({ error: `Permission not granted for "${category}" data. The user can enable this in More > AI Specialists > AI Settings.` });

function recentWorkoutsData(data, { limit = 10 } = {}) {
  return data.workouts.slice(-limit).reverse().map(w => ({
    date: w.date, day: w.day || w.programDay,
    exercises: (w.exercises || []).map(e => ({
      name: e.name, set1: `${e.set1Weight ?? "-"}x${e.set1Reps ?? "-"}`, set2: `${e.set2Weight ?? "-"}x${e.set2Reps ?? "-"}`,
      increaseNextWeek: !!e.increaseNextWeek, painFlag: !!e.painFlag, technicalFailureReached: !!e.technicalFailureReached
    }))
  }));
}

function sleepSummaryData(data) {
  const stats = sleepStats(data.sleepLogs || []);
  const weekend = weekendRecoveryStatus(data.sleepLogs || []);
  const readiness = readinessScore(data);
  return { sleepStats: stats, weekendRecovery: weekend, readiness: { score: readiness.score, status: readiness.status, mainBottleneck: readiness.mainBottleneck } };
}

function mealHistoryData(data, { days = 7 } = {}) {
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - days);
  return (data.mealLogs || [])
    .filter(m => new Date(m.date) >= cutoff)
    .map(m => ({ date: m.date, time: m.time, name: m.mealName, calories: m.calories, protein: m.protein, carbs: m.carbs, fat: m.fat, recoveryTag: m.recoveryTag || null }));
}

function skinLogsData(data, { limit = 10 } = {}) {
  return data.skinLogs.slice(-limit).reverse();
}

function productExperimentsData(data, { activeOnly = false } = {}) {
  const list = data.productExperiments || [];
  return activeOnly ? list.filter(p => p.active) : list;
}

function hairLogsData(data, { limit = 10 } = {}) {
  return data.hairLogs.slice(-limit).reverse();
}

function measurementsData(data, { limit = 5 } = {}) {
  return data.measurements.slice(-limit).reverse().map(m => ({ ...m, ratios: ratios(m) }));
}

function searchLibraryData(query, { limit = 5 } = {}) {
  const q = String(query || "").toLowerCase();
  if (!q) return [];
  return LIBRARY_ENTRIES
    .filter(e => [e.title, e.shortDefinition, e.instantMeaning, e.category, ...(e.tags || [])].some(f => f && String(f).toLowerCase().includes(q)))
    .slice(0, limit)
    .map(e => ({ title: e.title, category: e.category, instantMeaning: e.instantMeaning, shortDefinition: e.shortDefinition }));
}

/**
 * Every entry: { name, description, permissionCategory (null = always allowed),
 * inputSchema (Anthropic tool input_schema), run(data, input) }
 */
export const AI_TOOLS = [
  {
    name: "get_recent_workouts", description: "Get the user's most recently logged workouts, including sets, weights, and progression flags.",
    permissionCategory: "training",
    inputSchema: { type: "object", properties: { limit: { type: "number", description: "Max workouts to return, default 10" } } },
    run: (data, input) => recentWorkoutsData(data, input)
  },
  {
    name: "get_sleep_summary", description: "Get the user's sleep statistics (7-day/weekday/weekend averages, debt, trend), weekend recovery status, and current readiness score.",
    permissionCategory: "sleep",
    inputSchema: { type: "object", properties: {} },
    run: (data) => sleepSummaryData(data)
  },
  {
    name: "get_meal_history", description: "Get the user's logged meals over a recent window, including macros and recovery tags (pre-workout/post-workout/etc).",
    permissionCategory: "nutrition",
    inputSchema: { type: "object", properties: { days: { type: "number", description: "How many days back to look, default 7" } } },
    run: (data, input) => mealHistoryData(data, input)
  },
  {
    name: "get_skin_logs", description: "Get the user's recent skin condition logs (condition, oiliness, hydration, breakouts, possible triggers).",
    permissionCategory: "appearance",
    inputSchema: { type: "object", properties: { limit: { type: "number", description: "Max logs to return, default 10" } } },
    run: (data, input) => skinLogsData(data, input)
  },
  {
    name: "get_product_experiments", description: "Get the user's skincare/haircare/grooming product experiments and their stated purpose/result.",
    permissionCategory: "appearance",
    inputSchema: { type: "object", properties: { activeOnly: { type: "boolean", description: "Only return currently-active experiments" } } },
    run: (data, input) => productExperimentsData(data, input)
  },
  {
    name: "get_hair_logs", description: "Get the user's recent hair condition logs (condition, scalp condition, shedding level, styling notes).",
    permissionCategory: "appearance",
    inputSchema: { type: "object", properties: { limit: { type: "number", description: "Max logs to return, default 10" } } },
    run: (data, input) => hairLogsData(data, input)
  },
  {
    name: "get_measurements", description: "Get the user's recent body measurements (shoulders, chest, waist, arms, forearms, etc) with computed ratios.",
    permissionCategory: "bodyweight",
    inputSchema: { type: "object", properties: { limit: { type: "number", description: "Max measurement records to return, default 5" } } },
    run: (data, input) => measurementsData(data, input)
  },
  {
    name: "search_library", description: "Search the Aesthetic Protocol Knowledge Library (training/nutrition/recovery/supplement reference articles) for a term.",
    permissionCategory: null,
    inputSchema: { type: "object", properties: { query: { type: "string", description: "Search term" } }, required: ["query"] },
    run: (data, input) => searchLibraryData(input?.query, input)
  }
];

/** Executes one tool call by name, enforcing the permission gate before running it. */
export function runTool(name, input, data) {
  const tool = AI_TOOLS.find(t => t.name === name);
  if (!tool) return { error: `Unknown tool: ${name}` };
  if (tool.permissionCategory && !data.aiSettings?.dataCategoryPermissions?.[tool.permissionCategory]) {
    return PERMISSION_DENIED(tool.permissionCategory);
  }
  try {
    return tool.run(data, input || {});
  } catch (err) {
    return { error: `Tool "${name}" failed: ${err.message}` };
  }
}

/** Anthropic Messages API tool schema array, filtered to only tools the user has actually permitted (search_library is always included). */
export function availableToolSchemas(data) {
  const perms = data.aiSettings?.dataCategoryPermissions || {};
  return AI_TOOLS
    .filter(t => !t.permissionCategory || perms[t.permissionCategory])
    .map(t => ({ name: t.name, description: t.description, input_schema: t.inputSchema }));
}

/**
 * Context Builder: a small, always-included snapshot (never the whole database) — kept
 * deliberately short since the model can call tools for anything deeper it needs.
 */
export function buildInitialContext(domain, data) {
  const p = data.profile;
  const lines = [
    `Today: ${new Date().toLocaleDateString("en-CA")}.`,
    `User: ${p.age}yo, ${p.height}, current phase "${p.currentPhase}", natural lifter only (no PEDs/SARMs/steroids/self-prescribed peptides).`
  ];
  if (domain === "gym") {
    lines.push(`Training program days: ${Object.keys(data.trainingProgram).join(", ")}.`);
    lines.push(`Target weekly bodyweight gain: ${p.targetWeeklyGain}kg/wk.`);
  } else if (domain === "appearance") {
    lines.push(`Appearance tracking available: skin logs, hair logs, product experiments (only if permitted — check tool results for permission errors).`);
  }
  return lines.join("\n");
}
