// Review document import: turns an uploaded GPT review file into a DRAFT review object
// (findings / proposedUpdates / knowledgeNotes / proposedTasks) that is never written to
// real app data directly. The caller (js/render-reviews.js) always routes the result
// through an explicit user approval screen before anything is applied — see
// applyApprovedReview() in that file. This module only reads and interprets; it never
// calls saveData().

// ==================== FIELD MAPPING REGISTRY ====================
// Each entry maps one or more metric/goal key aliases (as they might appear in a GPT
// review, in any casing/spacing) onto a real path inside the app's data object. Add new
// entries here rather than special-casing individual review formats.
const METRIC_FIELD_MAP = [
  { keys: ["daily_calorie_target", "calorie_target", "calories", "daily_calories", "target_calories"], path: ["profile", "dailyCalorieTarget"], label: "Daily Calorie Target", unit: "kcal" },
  { keys: ["weekly_weight_gain", "target_weekly_gain", "weight_gain_target", "weekly_gain"], path: ["profile", "targetWeeklyGain"], label: "Weekly Weight Gain Target", unit: "kg" },
  { keys: ["protein_target", "protein_target_g", "protein_goal", "daily_protein_target"], path: ["profile", "proteinTargetOverrideG"], label: "Protein Target Override", unit: "g" },
  { keys: ["caffeine_cutoff", "caffeine_cutoff_hours", "caffeine_cutoff_time"], path: ["profile", "caffeineCutoffHours"], label: "Caffeine Cutoff", unit: "hours before bed" },
  { keys: ["sleep_target", "sleep_target_hours", "recommended_sleep_target"], path: ["profile", "sleepTargetHours"], label: "Sleep Target", unit: "hours" },
  { keys: ["realistic_target_weight_min", "realistic_min_weight"], path: ["profile", "realisticTargetWeightMin"], label: "Realistic Target Weight (Min)", unit: "kg" },
  { keys: ["realistic_target_weight_max", "realistic_max_weight"], path: ["profile", "realisticTargetWeightMax"], label: "Realistic Target Weight (Max)", unit: "kg" },
  { keys: ["ambitious_target_weight", "ambitious_weight"], path: ["profile", "ambitiousTargetWeight"], label: "Ambitious Target Weight", unit: "kg" },
  { keys: ["target_body_fat_min", "body_fat_min"], path: ["profile", "targetBodyFatMin"], label: "Target Body Fat (Min)", unit: "%" },
  { keys: ["target_body_fat_max", "body_fat_max"], path: ["profile", "targetBodyFatMax"], label: "Target Body Fat (Max)", unit: "%" },
  { keys: ["current_phase", "phase", "training_phase"], path: ["profile", "currentPhase"], label: "Current Phase", unit: "" },
  { keys: ["functional_track_length", "track_length", "track_length_metres"], path: ["profile", "functionalTrackLengthMetres"], label: "Functional Track Length", unit: "m" }
];

function normalizeKey(str) {
  return String(str || "").trim().toLowerCase().replace(/[\s\-]+/g, "_").replace(/[^a-z0-9_]/g, "");
}

/** Finds the field-map entry for a metric/goal key or free-text label, or null if unmapped. */
export function findFieldMapping(metricKeyOrLabel) {
  const norm = normalizeKey(metricKeyOrLabel);
  if (!norm) return null;
  let hit = METRIC_FIELD_MAP.find(m => m.keys.includes(norm));
  if (hit) return hit;
  // Loose fallback: the normalized text contains (or is contained by) one of the known aliases.
  hit = METRIC_FIELD_MAP.find(m => m.keys.some(k => norm.includes(k) || k.includes(norm)));
  return hit || null;
}

export function getValueAtPath(data, path) {
  return path.reduce((obj, key) => (obj == null ? undefined : obj[key]), data);
}

/** Writes a value at a dotted path inside `data`, creating intermediate objects if needed. Only ever called on approved updates. */
export function setValueAtPath(data, path, value) {
  let obj = data;
  for (let i = 0; i < path.length - 1; i++) {
    if (obj[path[i]] == null || typeof obj[path[i]] !== "object") obj[path[i]] = {};
    obj = obj[path[i]];
  }
  obj[path[path.length - 1]] = value;
}

// ==================== SUPPORTED FILE TYPES ====================
const SUPPORTED_EXTENSIONS = ["json", "md", "txt"];
const UNSUPPORTED_EXTENSIONS = ["docx", "pdf"];

export function fileExtension(filename) {
  return (filename.split(".").pop() || "").toLowerCase();
}

/** Reads a File object as text via FileReader — the only file-reading capability available in a static, backend-less app. */
export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read the file — it may be corrupted."));
    reader.readAsText(file);
  });
}

/**
 * Parses an uploaded review document into a DRAFT review (never applied automatically).
 * Structured JSON (the preferred format) is parsed exactly; Markdown/plain text falls
 * back to a flexible heading/keyword parser. .docx/.pdf are explicitly unsupported —
 * this is a static app with no backend and no bundler, so there is no safe way to parse
 * binary document formats client-side; the user is told clearly and asked to export as
 * .txt/.md/.json instead, rather than the app silently failing or guessing at content.
 */
export async function parseReviewFile(file, currentData) {
  const ext = fileExtension(file.name);
  if (UNSUPPORTED_EXTENSIONS.includes(ext)) {
    throw new Error(`"${ext.toUpperCase()}" files aren't supported yet — Aesthetic Protocol runs entirely in your browser with no server to process Word or PDF documents. Please export your GPT review as .txt, .md or .json and upload that instead.`);
  }
  if (!SUPPORTED_EXTENSIONS.includes(ext)) {
    throw new Error(`Unsupported file type ".${ext}". Supported formats: ${SUPPORTED_EXTENSIONS.map(e => "." + e).join(", ")}.`);
  }

  const text = await readFileAsText(file);
  if (!text || !text.trim()) throw new Error("No review data detected in this file — it appears to be empty.");

  let draft;
  if (ext === "json") {
    let parsedJson;
    try { parsedJson = JSON.parse(text); } catch { throw new Error("This JSON file is corrupted or not valid JSON. Check the file and try again."); }
    draft = parsePreferredJsonSchema(parsedJson, currentData);
  } else {
    draft = parseFlexibleText(text, currentData);
  }

  if (!draft.periodStart || !draft.periodEnd) {
    throw new Error("Missing review period — this document doesn't state a start and end date. Add a period (e.g. \"2026-07-06 to 2026-07-12\") and re-upload.");
  }
  draft.sourceFilename = file.name;
  return draft;
}

// ==================== PREFERRED JSON SCHEMA ====================
export function parsePreferredJsonSchema(obj, currentData) {
  const reviewType = ["weekly", "monthly"].includes(obj.review_type) ? obj.review_type : "weekly";
  const periodStart = obj.period?.start_date || obj.period_start || null;
  const periodEnd = obj.period?.end_date || obj.period_end || null;

  const findings = [
    ...(Array.isArray(obj.achievements) ? obj.achievements : []).map(text => ({ findingType: "achievement", category: "general", title: String(text).slice(0, 80), description: String(text), severity: "info" })),
    ...(Array.isArray(obj.warnings) ? obj.warnings : []).map(text => ({ findingType: "warning", category: "general", title: String(text).slice(0, 80), description: String(text), severity: "warning" }))
  ];

  const knowledgeNotes = (Array.isArray(obj.knowledge_notes) ? obj.knowledge_notes : []).map(n => ({
    category: n.category || "general",
    note: n.note || String(n),
    approvalStatus: "pending"
  }));

  const metricUpdates = (Array.isArray(obj.metric_updates) ? obj.metric_updates : [])
    .map(u => buildProposedUpdate({
      key: u.metric_key, currentValue: u.current_value, proposedValue: u.proposed_value,
      unit: u.unit, direction: u.direction, reason: u.reason, sourceText: JSON.stringify(u)
    }, currentData));

  const goalUpdates = (Array.isArray(obj.goal_updates) ? obj.goal_updates : [])
    .map(u => buildProposedUpdate({
      key: u.goal_key, currentValue: u.current_value, proposedValue: u.proposed_value,
      unit: u.unit, direction: u.action, reason: u.reason, sourceText: JSON.stringify(u)
    }, currentData));

  const proposedTasks = (Array.isArray(obj.next_period_actions) ? obj.next_period_actions : []).map(a => ({
    title: a.title || String(a),
    category: a.category || "general",
    priority: ["high", "medium", "low"].includes(a.priority) ? a.priority : "medium"
  }));

  return {
    reviewType, periodStart, periodEnd,
    summary: obj.summary || "",
    overallScore: typeof obj.overall_score === "number" ? obj.overall_score : null,
    findings,
    proposedUpdates: [...metricUpdates, ...goalUpdates],
    knowledgeNotes,
    proposedTasks,
    parseMethod: "structured-json"
  };
}

/** Builds one proposed-update record with a field mapping + confidence, from a JSON entry that already has an explicit key. */
function buildProposedUpdate({ key, currentValue, proposedValue, unit, direction, reason, sourceText }, currentData) {
  const mapping = findFieldMapping(key);
  const actualCurrentValue = mapping ? getValueAtPath(currentData, mapping.path) : undefined;

  let actionType = "no_change";
  const dir = String(direction || "").toLowerCase();
  if (dir.includes("increase")) actionType = "increase";
  else if (dir.includes("decrease")) actionType = "decrease";
  else if (dir.includes("maintain")) actionType = "maintain";
  else if (dir.includes("replace")) actionType = "replace";
  else if (proposedValue != null && currentValue != null && proposedValue !== currentValue) actionType = proposedValue > currentValue ? "increase" : "decrease";

  if (!mapping) {
    return {
      metricKey: key || "(unlabelled)", label: key || "Unrecognised metric", path: null,
      currentValue: currentValue ?? null, proposedValue: proposedValue ?? null, unit: unit || "",
      actionType: "unsupported", reason: reason || "", sourceText, confidence: "Unmapped", approvalStatus: "pending", userEditedValue: null
    };
  }

  let confidence = "High";
  if (actualCurrentValue == null) confidence = "Medium"; // mapped field exists but app has no value yet to cross-check against
  else if (currentValue != null && String(actualCurrentValue) !== String(currentValue)) confidence = "Medium"; // app's live value has moved since the review was written

  return {
    metricKey: key, label: mapping.label, path: mapping.path,
    currentValue: actualCurrentValue ?? currentValue ?? null,
    proposedValue: proposedValue ?? null, unit: unit || mapping.unit || "",
    actionType, reason: reason || "", sourceText, confidence, approvalStatus: "pending", userEditedValue: null
  };
}

// ==================== FLEXIBLE MARKDOWN / TEXT PARSER ====================
// Used when the uploaded file isn't the preferred JSON schema. Deliberately heuristic —
// section 3.4 of the spec explicitly asks for "adapt, not depend exclusively on" one
// format. Anything it can't confidently map is still surfaced in the preview with
// confidence "Unmapped" or "Low Confidence" rather than silently dropped.
const HEADING_BUCKETS = {
  achievements: ["achievements", "wins", "what went well", "positives", "strengths"],
  warnings: ["warnings", "risks", "concerns", "weaknesses", "issues"],
  notes: ["notes", "knowledge notes", "learnings", "observations"],
  actions: ["next period actions", "next week actions", "actions", "to do", "todo", "priorities", "next steps", "goals for next week"]
};

function matchHeadingBucket(line) {
  const clean = line.replace(/^#+\s*/, "").replace(/[:*]+$/, "").trim().toLowerCase();
  for (const [bucket, aliases] of Object.entries(HEADING_BUCKETS)) {
    if (aliases.some(a => clean === a || clean.startsWith(a))) return bucket;
  }
  return null;
}

function isBulletLine(line) {
  return /^\s*[-*•]\s+/.test(line) || /^\s*\d+[.)]\s+/.test(line);
}
function stripBullet(line) {
  return line.replace(/^\s*[-*•]\s+/, "").replace(/^\s*\d+[.)]\s+/, "").trim();
}

function extractPeriod(text) {
  const isoRange = text.match(/(\d{4}-\d{2}-\d{2})\s*(?:to|[-–—]|through)\s*(\d{4}-\d{2}-\d{2})/i);
  if (isoRange) return { periodStart: isoRange[1], periodEnd: isoRange[2] };

  // "6–12 July 2026" or "6-12 July 2026" style day range.
  const dayRange = text.match(/(\d{1,2})\s*[-–—]\s*(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (dayRange) {
    const [, d1, d2, monthName, year] = dayRange;
    const monthIdx = new Date(`${monthName} 1, 2000`).getMonth();
    if (!Number.isNaN(monthIdx)) {
      const pad = (n) => String(n).padStart(2, "0");
      return {
        periodStart: `${year}-${pad(monthIdx + 1)}-${pad(d1)}`,
        periodEnd: `${year}-${pad(monthIdx + 1)}-${pad(d2)}`
      };
    }
  }
  return { periodStart: null, periodEnd: null };
}

function extractOverallScore(text) {
  const m = text.match(/(?:overall\s*)?score\s*[:\-]?\s*(\d{1,3})(?:\s*\/\s*100)?/i);
  if (!m) return null;
  const val = Number(m[1]);
  return Number.isFinite(val) ? Math.min(100, val) : null;
}

function detectReviewType(text) {
  if (/\bmonthly review\b/i.test(text)) return "monthly";
  if (/\bweekly review\b/i.test(text)) return "weekly";
  return "weekly";
}

/**
 * Matches a single metric-change line in several common phrasings:
 *   "Daily Calorie Target: 2800 -> 2900 kcal — reason: ..."
 *   "Increase daily calories by 100 kcal because ..."
 *   "Maintain weekly weight gain at 0.25kg — the target remains appropriate."
 */
function parseMetricLine(line) {
  const arrowMatch = line.match(/^([^:]+):\s*([\d.]+)\s*(?:->|→|to)\s*([\d.]+)\s*([a-zA-Z%]*)\s*(?:[-—–]\s*(?:reason:?\s*)?(.*))?$/i);
  if (arrowMatch) {
    const [, label, current, proposed, unit, reason] = arrowMatch;
    return { label: label.trim(), currentValue: Number(current), proposedValue: Number(proposed), unit: (unit || "").trim(), direction: null, reason: (reason || "").trim() };
  }

  const incDecMatch = line.match(/^(increase|decrease)\s+(.+?)\s+by\s+([\d.]+)\s*([a-zA-Z%]*)\s*(?:because|due to|[-—–])?\s*(.*)$/i);
  if (incDecMatch) {
    const [, dir, label, amount, unit, reason] = incDecMatch;
    return { label: label.trim(), currentValue: null, proposedValue: null, changeAmount: Number(amount), unit: (unit || "").trim(), direction: dir.toLowerCase(), reason: (reason || "").trim() };
  }

  const maintainMatch = line.match(/^maintain\s+(.+?)\s+at\s+([\d.]+)\s*([a-zA-Z%]*)\s*(?:[-—–]\s*(.*))?$/i);
  if (maintainMatch) {
    const [, label, value, unit, reason] = maintainMatch;
    return { label: label.trim(), currentValue: Number(value), proposedValue: Number(value), unit: (unit || "").trim(), direction: "maintain", reason: (reason || "").trim() };
  }

  return null;
}

function buildFlexibleUpdate(parsed, currentData) {
  const mapping = findFieldMapping(parsed.label);
  const actualCurrentValue = mapping ? getValueAtPath(currentData, mapping.path) : undefined;

  let proposedValue = parsed.proposedValue;
  if (proposedValue == null && parsed.changeAmount != null && actualCurrentValue != null) {
    proposedValue = parsed.direction === "decrease" ? actualCurrentValue - parsed.changeAmount : actualCurrentValue + parsed.changeAmount;
  }

  if (!mapping) {
    return {
      metricKey: parsed.label, label: parsed.label, path: null,
      currentValue: parsed.currentValue, proposedValue, unit: parsed.unit || "",
      actionType: "requires_clarification", reason: parsed.reason || "", sourceText: parsed.label,
      confidence: "Unmapped", approvalStatus: "pending", userEditedValue: null
    };
  }

  return {
    metricKey: parsed.label, label: mapping.label, path: mapping.path,
    currentValue: actualCurrentValue ?? parsed.currentValue ?? null,
    proposedValue: proposedValue ?? null, unit: parsed.unit || mapping.unit || "",
    actionType: parsed.direction || (proposedValue != null && actualCurrentValue != null ? (proposedValue > actualCurrentValue ? "increase" : proposedValue < actualCurrentValue ? "decrease" : "maintain") : "requires_clarification"),
    reason: parsed.reason || "", sourceText: parsed.label,
    confidence: "Medium", // free-text parsing is inherently less certain than the structured schema
    approvalStatus: "pending", userEditedValue: null
  };
}

export function parseFlexibleText(text, currentData) {
  const { periodStart, periodEnd } = extractPeriod(text);
  const lines = text.split(/\r?\n/);
  const findings = [];
  const knowledgeNotes = [];
  const proposedUpdates = [];
  const proposedTasks = [];
  let currentBucket = null;

  lines.forEach(rawLine => {
    const line = rawLine.trim();
    if (!line) return;

    const bucket = matchHeadingBucket(line);
    if (bucket) { currentBucket = bucket; return; }
    if (/^#{1,6}\s/.test(line)) { currentBucket = null; return; } // an unrecognised heading ends the current bucket

    if (!isBulletLine(line) && currentBucket !== "actions") {
      // Also try to catch inline metric-change sentences outside of bulleted lists.
      const metric = parseMetricLine(line);
      if (metric) proposedUpdates.push(buildFlexibleUpdate(metric, currentData));
      return;
    }

    const content = isBulletLine(line) ? stripBullet(line) : line;
    if (!content) return;

    if (currentBucket === "achievements") {
      findings.push({ findingType: "achievement", category: "general", title: content.slice(0, 80), description: content, severity: "info" });
    } else if (currentBucket === "warnings") {
      findings.push({ findingType: "warning", category: "general", title: content.slice(0, 80), description: content, severity: "warning" });
    } else if (currentBucket === "notes") {
      knowledgeNotes.push({ category: "general", note: content, approvalStatus: "pending" });
    } else if (currentBucket === "actions") {
      proposedTasks.push({ title: content, category: "general", priority: "medium" });
    } else {
      const metric = parseMetricLine(content);
      if (metric) proposedUpdates.push(buildFlexibleUpdate(metric, currentData));
    }
  });

  return {
    reviewType: detectReviewType(text),
    periodStart, periodEnd,
    summary: lines.slice(0, 3).join(" ").slice(0, 400),
    overallScore: extractOverallScore(text),
    findings, proposedUpdates, knowledgeNotes, proposedTasks,
    parseMethod: "flexible-text"
  };
}
