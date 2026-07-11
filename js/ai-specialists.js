// Orchestrates the two AI Specialists (+ a Shared conversation) on top of
// js/claude-client.js (transport) and js/ai-tools.js (Context Builder + read-only
// tools). Read-only by policy: the only "write" surface exposed to the model is
// propose_change, which never touches real app data itself — it only queues a
// proposal for the user to review and explicitly accept/reject in the Proposed
// Changes screen. Nothing in this file (or anywhere the AI can reach) calls
// saveData() on program/nutrition/supplement/appearance fields.
import { getData, saveData, uid } from "./data.js";
import { sendMessage } from "./claude-client.js";
import { AI_TOOLS, availableToolSchemas, buildInitialContext, runTool } from "./ai-tools.js";

const CROSS_DOMAIN_INSTRUCTION = `
Before finalising any recommendation, briefly consider cross-domain interactions between
performance and appearance where relevant, e.g.: protein source choices vs acne, calorie
surplus size vs facial fullness/puffiness, caffeine timing vs sleep quality, sleep quality
vs both recovery and skin. Only mention an interaction if it's actually relevant to the
question — don't force it in every reply.`;

const SAFETY_INSTRUCTION = `
You are read-only: you may analyse, compare, explain, recommend, identify trends, and
propose changes — but you must never claim to have already changed the user's program,
nutrition, supplements, or appearance routine. To suggest a concrete change, call the
propose_change tool; this only queues it for the user's explicit review, it does not apply
it. Never recommend illegal or unregulated performance-enhancing drugs, steroids, SARMs, or
self-prescribed peptides, and never provide dosing or sourcing for such compounds. Never
diagnose a medical or dermatological condition — if something sounds like it needs a
professional (persistent pain, severe fatigue, a skin condition that isn't resolving,
possible hair loss beyond normal shedding), say so plainly and suggest the appropriate
professional (GP/doctor, dermatologist, sports physio) rather than guessing. The user is
natural-only by choice.`;

const PERSONAS = {
  performanceCoach: {
    key: "performanceCoach", label: "Reacher Performance Coach", domain: "gym",
    conversationKey: "aiConversationsPerformance",
    systemPrompt: (data) => `You are the Reacher Performance Coach inside Project Reacher, a natural bodybuilding app.
Your focus: hypertrophy, progressive overload, exercise technique, recovery, nutrition, supplements, bodyweight trend, sleep, fatigue, and performance analysis.
Use the app's own data (via tools) and the Project Reacher Knowledge Library as your primary sources; only reason from general fitness knowledge when the user's own data doesn't cover the question. Be direct, concise, and specific — reference actual numbers from the user's data when you have them rather than generic advice.
${CROSS_DOMAIN_INSTRUCTION}
${SAFETY_INSTRUCTION}
${buildInitialContext("gym", data)}`
  },
  appearanceDirector: {
    key: "appearanceDirector", label: "Appearance Director", domain: "appearance",
    conversationKey: "aiConversationsAppearance",
    systemPrompt: (data) => `You are the Appearance Director inside Project Reacher, a natural bodybuilding app.
Your focus: skin, hair, puffiness, grooming, hairstyle suitability, product experiments, diet-skin correlations, appearance photography technique, and healthy presentation. You are not a dermatologist or doctor — you help the user notice patterns in their own logged data and make sensible, evidence-aware lifestyle observations, not clinical diagnoses.
Use the app's own data (via tools) and the Project Reacher Knowledge Library as your primary sources.
${CROSS_DOMAIN_INSTRUCTION}
${SAFETY_INSTRUCTION}
${buildInitialContext("appearance", data)}`
  },
  shared: {
    key: "shared", label: "Shared Conversation", domain: "shared",
    conversationKey: "aiConversationsShared",
    systemPrompt: (data) => `You are the combined Project Reacher AI assistant, covering both performance (hypertrophy, training, recovery, nutrition, supplements, sleep) and appearance (skin, hair, grooming, product experiments) in one conversation.
Use the app's own data (via tools) and the Project Reacher Knowledge Library as your primary sources.
${CROSS_DOMAIN_INSTRUCTION}
${SAFETY_INSTRUCTION}
${buildInitialContext("gym", data)}
${buildInitialContext("appearance", data)}`
  }
};

export function getPersona(key) { return PERSONAS[key]; }
export function listPersonas() { return Object.values(PERSONAS); }

const PROPOSE_CHANGE_TOOL = {
  name: "propose_change",
  description: "Propose a specific, concrete change to the user's training program, nutrition, supplements, recovery routine, or appearance routine, for the user to review. This NEVER applies the change automatically — it only queues it in the Proposed Changes screen for the user to explicitly accept or reject.",
  input_schema: {
    type: "object",
    properties: {
      category: { type: "string", enum: ["training", "nutrition", "supplements", "recovery", "appearance"] },
      summary: { type: "string", description: "One-sentence, concrete description of the proposed change." },
      rationale: { type: "string", description: "Why this change is being proposed, referencing the user's actual data where possible." }
    },
    required: ["category", "summary", "rationale"]
  }
};

function logAudit(data, event) {
  if (!data.aiSettings?.auditLoggingEnabled) return;
  data.aiAuditLog.push({ id: uid(), timestamp: new Date().toISOString(), ...event });
  if (data.aiAuditLog.length > 500) data.aiAuditLog = data.aiAuditLog.slice(-500);
}

function toApiHistory(conversation) {
  return conversation.map(m => ({ role: m.role, content: m.content }));
}

/**
 * Sends a user message to the given persona, running the tool-use loop, persisting the
 * turn into that persona's conversation history, and returning the assistant's reply plus
 * any changes proposed during this turn (already queued in data.aiProposedChanges).
 */
export async function sendToSpecialist(personaKey, userMessage) {
  const persona = PERSONAS[personaKey];
  if (!persona) throw new Error(`Unknown AI specialist: ${personaKey}`);

  const data = getData();
  if (!data.aiSettings?.consentGiven) {
    throw new Error("AI consent has not been granted yet. Enable it in More > AI Specialists > AI Settings before starting a conversation.");
  }

  const conversation = data[persona.conversationKey];
  const proposalsBefore = data.aiProposedChanges.length;

  const toolExecutor = async (name, input) => {
    if (name === "propose_change") {
      const proposal = {
        id: uid(), persona: personaKey, category: input?.category || "training",
        summary: input?.summary || "", rationale: input?.rationale || "",
        status: "pending", createdAt: new Date().toISOString()
      };
      data.aiProposedChanges.push(proposal);
      logAudit(data, { type: "change_proposed", persona: personaKey, category: proposal.category, summary: proposal.summary });
      return { queued: true, message: "Proposal recorded for user review — not applied automatically." };
    }
    const result = runTool(name, input, data);
    logAudit(data, { type: "tool_called", persona: personaKey, tool: name });
    return result;
  };

  const result = await sendMessage({
    systemPrompt: persona.systemPrompt(data),
    history: toApiHistory(conversation),
    userMessage,
    tools: [...availableToolSchemas(data), PROPOSE_CHANGE_TOOL],
    toolExecutor,
    model: data.aiSettings.preferredModel || "claude-sonnet-5"
  });

  const now = new Date().toISOString();
  conversation.push({ id: uid(), role: "user", content: userMessage, createdAt: now });
  conversation.push({ id: uid(), role: "assistant", content: result.finalText, createdAt: new Date().toISOString(), toolCallsLog: result.toolCallsLog });
  logAudit(data, { type: "chat_sent", persona: personaKey, toolCallCount: result.toolCallsLog.length });
  saveData(data);

  return {
    reply: result.finalText,
    newProposals: data.aiProposedChanges.slice(proposalsBefore),
    toolCallsLog: result.toolCallsLog
  };
}

export function clearConversation(personaKey) {
  const persona = PERSONAS[personaKey];
  if (!persona) return;
  const data = getData();
  data[persona.conversationKey] = [];
  saveData(data);
}

export function saveInsight(personaKey, messageContent) {
  const data = getData();
  data.aiSavedInsights.push({ id: uid(), persona: personaKey, content: messageContent, createdAt: new Date().toISOString() });
  saveData(data);
}

export function deleteInsight(id) {
  const data = getData();
  data.aiSavedInsights = data.aiSavedInsights.filter(i => i.id !== id);
  saveData(data);
}

export function acceptProposedChange(id) {
  const data = getData();
  const p = data.aiProposedChanges.find(x => x.id === id);
  if (!p) return;
  p.status = "accepted";
  p.acceptedAt = new Date().toISOString();
  logAudit(data, { type: "change_accepted", persona: p.persona, category: p.category, summary: p.summary });
  saveData(data);
}

export function rejectProposedChange(id) {
  const data = getData();
  const p = data.aiProposedChanges.find(x => x.id === id);
  if (!p) return;
  p.status = "rejected";
  p.rejectedAt = new Date().toISOString();
  logAudit(data, { type: "change_rejected", persona: p.persona, category: p.category, summary: p.summary });
  saveData(data);
}

/** Deep-link target for a proposed change's category, so accepting one can point the user at the right screen to make the edit themselves. */
export function categoryDeepLink(category) {
  return {
    training: { tab: "train", anchor: "daySelect" },
    nutrition: { tab: "nutrition", anchor: "mealName" },
    supplements: { tab: "nutrition", anchor: "supplementChecklist" },
    recovery: { tab: "recovery", anchor: "sleepBedtime" },
    appearance: { tab: "appearance", anchor: "skinCondition" }
  }[category] || { tab: "dashboard", anchor: "" };
}

export function clearAuditLog() {
  const data = getData();
  data.aiAuditLog = [];
  saveData(data);
}

export { AI_TOOLS };
