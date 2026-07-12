// Direct-browser Anthropic API client — the user's own API key, used from their own
// browser, at their own cost. This is a DELIBERATE, EXPLICITLY-CHOSEN deviation from
// "never expose the key client-side": Project Reacher is a static site with no backend,
// so there is no server to hold a secret. The trade-off (the key sits in this browser's
// localStorage, visible to anyone with device/browser access, same trust boundary as the
// user's own workout data) was explained to and chosen by the user over building/hosting
// a real backend. If a backend is ever stood up, only this file needs to change — every
// caller (js/ai-specialists.js) just calls sendMessage() and doesn't know how the network
// call happens.
//
// The API key lives in its OWN isolated localStorage key — never inside the main
// `projectReacher` object — so it can never end up in an exported/imported backup file.

const API_KEY_STORAGE_KEY = "projectReacher_claude_api_key";
const USAGE_STORAGE_KEY = "projectReacher_claude_usage";
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const MAX_TOOL_ITERATIONS = 6;

export const AVAILABLE_MODELS = [
  { id: "claude-sonnet-5", label: "Claude Sonnet 5 (recommended)" },
  { id: "claude-opus-4-8", label: "Claude Opus 4.8 (most capable)" },
  { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5 (fastest)" },
  { id: "claude-fable-5", label: "Claude Fable 5" }
];

export function getApiKey() {
  try { return localStorage.getItem(API_KEY_STORAGE_KEY) || ""; } catch { return ""; }
}
export function hasApiKey() { return !!getApiKey(); }
export function setApiKey(key) {
  if (!key || !key.trim()) throw new Error("API key cannot be empty.");
  localStorage.setItem(API_KEY_STORAGE_KEY, key.trim());
}
export function clearApiKey() {
  localStorage.removeItem(API_KEY_STORAGE_KEY);
}

export function getUsageTotals() {
  try {
    return JSON.parse(localStorage.getItem(USAGE_STORAGE_KEY) || "null") || { inputTokens: 0, outputTokens: 0, requests: 0 };
  } catch {
    return { inputTokens: 0, outputTokens: 0, requests: 0 };
  }
}
export function resetUsageTotals() {
  localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify({ inputTokens: 0, outputTokens: 0, requests: 0 }));
}
function accumulateUsage(usage) {
  const totals = getUsageTotals();
  totals.inputTokens += usage?.input_tokens || 0;
  totals.outputTokens += usage?.output_tokens || 0;
  totals.requests += 1;
  localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify(totals));
  return totals;
}

async function callAnthropic({ apiKey, model, system, messages, tools }) {
  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
      "anthropic-dangerous-direct-browser-access": "true"
    },
    body: JSON.stringify({
      model,
      max_tokens: 1536,
      system,
      messages,
      ...(tools && tools.length ? { tools } : {})
    })
  });

  if (!res.ok) {
    let detail = "";
    try { detail = (await res.json())?.error?.message || ""; } catch { /* ignore parse failure */ }
    const err = new Error(detail || `Anthropic API request failed (HTTP ${res.status}).`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

/** Minimal round-trip to confirm the key/model actually work, without a full conversation. */
export async function testConnection(apiKey, model = "claude-sonnet-5") {
  try {
    const response = await callAnthropic({
      apiKey, model, system: "Reply with exactly one word: OK.",
      messages: [{ role: "user", content: "Connection test." }]
    });
    accumulateUsage(response.usage);
    return { ok: true, model: response.model };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Structured, non-tool-use meal estimate: one round-trip, JSON-only response. Used by
 * the Nutrition tab as a strictly-better-than-local-keyword-matching estimator when the
 * user has connected an API key. Callers must catch and fall back to the local
 * food-estimator.js on any failure (missing key, network error, bad JSON) — this
 * function never silently returns a guessed estimate on error, it throws.
 */
export async function estimateMealMacrosViaClaude(description, model = "claude-sonnet-5") {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("No Claude API key connected.");

  const system = `You are a nutrition estimation assistant inside a fitness app. Given a free-text meal description, estimate calories and macros. Respond with ONLY a single JSON object and nothing else — no markdown fences, no commentary — in exactly this shape:
{"foodsDetected": string[], "calories": number, "protein": number, "carbs": number, "fat": number, "fibre": number, "confidenceScore": "High" | "Medium" | "Low", "assumptions": string[], "clarifyingQuestion": string | null}
Rules: protein/carbs/fibre/fat are in grams. Use "confidenceScore": "Low" whenever the description is vague, missing quantities, or missing preparation method, and in that case set "clarifyingQuestion" to ONE short question that would most improve the estimate (e.g. asking for a quantity or cooking method). Otherwise set "clarifyingQuestion" to null. List every assumption you made (serving size, cooking method, brand) in "assumptions". Never claim exact accuracy — these are estimates.`;

  const response = await callAnthropic({ apiKey, model, system, messages: [{ role: "user", content: description }] });
  accumulateUsage(response.usage);

  const text = (response.content || []).filter(b => b.type === "text").map(b => b.text).join("").trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Claude did not return a parseable estimate.");
  let parsed;
  try { parsed = JSON.parse(jsonMatch[0]); } catch { throw new Error("Claude's estimate response was not valid JSON."); }

  return {
    foodsDetected: Array.isArray(parsed.foodsDetected) ? parsed.foodsDetected : [],
    calories: Number(parsed.calories) || 0,
    protein: Number(parsed.protein) || 0,
    carbs: Number(parsed.carbs) || 0,
    fat: Number(parsed.fat) || 0,
    fibre: Number(parsed.fibre) || 0,
    confidenceScore: ["High", "Medium", "Low"].includes(parsed.confidenceScore) ? parsed.confidenceScore : "Low",
    assumptions: Array.isArray(parsed.assumptions) ? parsed.assumptions : [],
    clarifyingQuestion: parsed.clarifyingQuestion || null,
    source: "claude"
  };
}

/**
 * Sends a message, running the full tool-use loop (Claude asks for a tool -> we execute
 * it via `toolExecutor` -> result goes back to Claude -> repeat) until Claude returns a
 * final text answer or MAX_TOOL_ITERATIONS is hit. `toolExecutor(name, input)` is
 * supplied by the caller (js/ai-specialists.js) so this file has zero knowledge of what
 * the actual tools do — it only knows how to speak the Anthropic API's tool-use protocol.
 */
export async function sendMessage({ systemPrompt, history, userMessage, tools = [], toolExecutor, model }) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("No Claude API key connected. Add one in More > AI Specialists > Claude Integration.");

  const messages = [...history, { role: "user", content: userMessage }];
  const toolCallsLog = [];
  let lastResponse = null;

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const response = await callAnthropic({ apiKey, model, system: systemPrompt, messages, tools });
    lastResponse = response;
    accumulateUsage(response.usage);

    if (response.stop_reason !== "tool_use") {
      const finalText = (response.content || []).filter(b => b.type === "text").map(b => b.text).join("\n").trim();
      messages.push({ role: "assistant", content: response.content });
      return { finalText, messages, toolCallsLog, usage: response.usage, stopReason: response.stop_reason };
    }

    messages.push({ role: "assistant", content: response.content });
    const toolUseBlocks = response.content.filter(b => b.type === "tool_use");
    const toolResultContent = [];
    for (const block of toolUseBlocks) {
      let result;
      try {
        result = await toolExecutor(block.name, block.input);
      } catch (err) {
        result = { error: err.message };
      }
      toolCallsLog.push({ name: block.name, input: block.input, result });
      toolResultContent.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(result) });
    }
    messages.push({ role: "user", content: toolResultContent });
  }

  const fallbackText = (lastResponse?.content || []).filter(b => b.type === "text").map(b => b.text).join("\n").trim();
  return {
    finalText: fallbackText || "I ran out of tool-call turns before finishing — try asking a more specific question.",
    messages, toolCallsLog, usage: lastResponse?.usage, stopReason: "max_iterations"
  };
}
