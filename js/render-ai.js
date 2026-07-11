import { $, esc } from "./dom.js";
import { getData, saveData } from "./data.js";
import {
  getApiKey, hasApiKey, setApiKey, clearApiKey, getUsageTotals, resetUsageTotals,
  testConnection, AVAILABLE_MODELS
} from "./claude-client.js";
import {
  sendToSpecialist, clearConversation, saveInsight, deleteInsight,
  acceptProposedChange, rejectProposedChange, categoryDeepLink, clearAuditLog, getPersona
} from "./ai-specialists.js";

const refreshAll = () => window.dispatchEvent(new CustomEvent("reacher:refresh"));

const PERSONA_UI = {
  performanceCoach: { messagesEl: "performanceCoachMessages", inputEl: "performanceCoachChatInput", sendBtn: "performanceCoachSendBtn", clearBtn: "performanceCoachClearBtn" },
  appearanceDirector: { messagesEl: "appearanceDirectorMessages", inputEl: "appearanceDirectorChatInput", sendBtn: "appearanceDirectorSendBtn", clearBtn: "appearanceDirectorClearBtn" },
  shared: { messagesEl: "sharedMessages", inputEl: "sharedChatInput", sendBtn: "sharedSendBtn", clearBtn: "sharedClearBtn" }
};

let busyPersona = null;

// ---- Claude Integration ----

export function renderClaudeIntegration() {
  const modelSelect = $("claudeModelSelect");
  if (modelSelect && !modelSelect.dataset.populated) {
    modelSelect.innerHTML = AVAILABLE_MODELS.map(m => `<option value="${esc(m.id)}">${esc(m.label)}</option>`).join("");
    modelSelect.dataset.populated = "true";
  }
  const data = getData();
  if (modelSelect) modelSelect.value = data.aiSettings.preferredModel || "claude-sonnet-5";

  const statusEl = $("claudeConnectionStatus");
  if (statusEl) {
    statusEl.textContent = hasApiKey() ? "API key connected on this device." : "No API key connected yet.";
  }
  const usageEl = $("claudeUsageDisplay");
  if (usageEl) {
    const u = getUsageTotals();
    usageEl.textContent = `${u.requests} request(s) · ${u.inputTokens} input tokens · ${u.outputTokens} output tokens (approximate, this device only).`;
  }
}

function connectClaudeKey() {
  const input = $("claudeApiKeyInput");
  const key = input?.value || "";
  try {
    setApiKey(key);
    input.value = "";
    renderClaudeIntegration();
    alert("API key saved to this browser only. It is never included in Export Data.");
  } catch (err) {
    alert(err.message);
  }
}

async function runTestConnection() {
  const statusEl = $("claudeConnectionStatus");
  if (!hasApiKey()) { alert("Connect an API key first."); return; }
  const model = $("claudeModelSelect")?.value || "claude-sonnet-5";
  if (statusEl) statusEl.textContent = "Testing connection...";
  const result = await testConnection(getApiKey(), model);
  if (statusEl) statusEl.textContent = result.ok ? `Connected — model responded (${result.model}).` : `Connection failed: ${result.error}`;
}

function disconnectClaude() {
  if (!confirm("Disconnect your Claude API key from this device? Your conversation history is kept — only the key is removed.")) return;
  clearApiKey();
  renderClaudeIntegration();
}

function saveModelPreference() {
  const data = getData();
  data.aiSettings.preferredModel = $("claudeModelSelect")?.value || "claude-sonnet-5";
  saveData(data);
}

// ---- AI Settings ----

export function renderAiSettings(data) {
  const s = data.aiSettings;
  if ($("aiConsentToggle")) $("aiConsentToggle").checked = !!s.consentGiven;
  if ($("aiPermTraining")) $("aiPermTraining").checked = !!s.dataCategoryPermissions.training;
  if ($("aiPermNutrition")) $("aiPermNutrition").checked = !!s.dataCategoryPermissions.nutrition;
  if ($("aiPermRecovery")) $("aiPermRecovery").checked = !!s.dataCategoryPermissions.recovery;
  if ($("aiPermSleep")) $("aiPermSleep").checked = !!s.dataCategoryPermissions.sleep;
  if ($("aiPermBodyweight")) $("aiPermBodyweight").checked = !!s.dataCategoryPermissions.bodyweight;
  if ($("aiPermAppearance")) $("aiPermAppearance").checked = !!s.dataCategoryPermissions.appearance;
  if ($("aiPermSupplements")) $("aiPermSupplements").checked = !!s.dataCategoryPermissions.supplements;
  if ($("aiAuditToggle")) $("aiAuditToggle").checked = !!s.auditLoggingEnabled;

  const auditEl = $("aiAuditLogView");
  if (auditEl) {
    auditEl.innerHTML = (data.aiAuditLog || []).slice().reverse().slice(0, 30).map(a => `
      <div class="history-item"><strong>${esc(new Date(a.timestamp).toLocaleString())}</strong> · ${esc(a.type)}${a.persona ? ` · ${esc(a.persona)}` : ""}${a.tool ? ` · ${esc(a.tool)}` : ""}${a.summary ? ` · ${esc(a.summary)}` : ""}</div>
    `).join("") || "<p class='small'>No AI activity logged yet.</p>";
  }
}

function saveAiSettings() {
  const data = getData();
  data.aiSettings.consentGiven = $("aiConsentToggle")?.checked || false;
  data.aiSettings.dataCategoryPermissions = {
    training: $("aiPermTraining")?.checked || false,
    nutrition: $("aiPermNutrition")?.checked || false,
    recovery: $("aiPermRecovery")?.checked || false,
    sleep: $("aiPermSleep")?.checked || false,
    bodyweight: $("aiPermBodyweight")?.checked || false,
    appearance: $("aiPermAppearance")?.checked || false,
    supplements: $("aiPermSupplements")?.checked || false
  };
  data.aiSettings.auditLoggingEnabled = $("aiAuditToggle")?.checked || false;
  saveData(data);
  refreshAll();
  alert("AI Settings saved.");
}

function runClearAuditLog() {
  if (!confirm("Clear the AI audit log on this device? This cannot be undone.")) return;
  clearAuditLog();
  refreshAll();
}

// ---- Chat rendering ----

function messageBubbleHtml(personaKey, msg) {
  const isUser = msg.role === "user";
  return `
    <div class="ai-message ${isUser ? "ai-message-user" : "ai-message-assistant"}">
      <p class="small" style="margin:0 0 4px;opacity:.7">${isUser ? "You" : esc(getPersona(personaKey)?.label || "Assistant")} · ${esc(new Date(msg.createdAt).toLocaleTimeString())}</p>
      <p>${esc(msg.content)}</p>
      ${!isUser ? `<button type="button" class="secondary" data-save-insight="${esc(personaKey)}" data-message="${esc(msg.content)}">Save Insight</button>` : ""}
    </div>`;
}

export function renderAiChats(data) {
  Object.entries(PERSONA_UI).forEach(([personaKey, ui]) => {
    const el = $(ui.messagesEl);
    if (!el) return;
    const conversation = data[getPersona(personaKey).conversationKey] || [];
    el.innerHTML = conversation.map(m => messageBubbleHtml(personaKey, m)).join("") || "<p class='small'>No messages yet.</p>";
    el.scrollTop = el.scrollHeight;
  });
}

async function handleSend(personaKey) {
  const ui = PERSONA_UI[personaKey];
  const input = $(ui.inputEl);
  const sendBtn = $(ui.sendBtn);
  const text = input?.value.trim();
  if (!text) return;
  if (busyPersona) return;

  if (!hasApiKey()) { alert("Connect a Claude API key first in Claude Integration."); return; }
  const data = getData();
  if (!data.aiSettings.consentGiven) { alert("Enable AI consent first in AI Settings."); return; }

  busyPersona = personaKey;
  if (sendBtn) { sendBtn.disabled = true; sendBtn.textContent = "Thinking..."; }
  input.value = "";

  try {
    await sendToSpecialist(personaKey, text);
    refreshAll();
  } catch (err) {
    alert("AI request failed: " + err.message);
    if (input) input.value = text;
  } finally {
    busyPersona = null;
    if (sendBtn) { sendBtn.disabled = false; sendBtn.textContent = "Send"; }
  }
}

function handleClearConversation(personaKey) {
  if (!confirm("Clear this conversation? This cannot be undone.")) return;
  clearConversation(personaKey);
  refreshAll();
}

// ---- Proposed Changes ----

export function renderProposedChanges(data) {
  const el = $("proposedChangesList");
  if (!el) return;
  const list = data.aiProposedChanges || [];
  el.innerHTML = list.slice().reverse().map(p => {
    const link = categoryDeepLink(p.category);
    return `
    <div class="history-item">
      <span class="badge">${esc(p.category)}</span>
      <span class="badge ${p.status === "accepted" ? "status-on-target" : p.status === "rejected" ? "status-fast" : ""}">${esc(p.status)}</span>
      <p><strong>${esc(p.summary)}</strong></p>
      <p class="small">${esc(p.rationale)}</p>
      <div class="actions">
        ${p.status === "pending" ? `
          <button type="button" data-accept-change="${p.id}">Accept</button>
          <button type="button" class="secondary" data-reject-change="${p.id}">Reject</button>
        ` : `<button type="button" class="secondary" data-goto-tab="${esc(link.tab)}" data-goto-anchor="${esc(link.anchor)}">Go make this change</button>`}
      </div>
    </div>`;
  }).join("") || "<p class='small'>No proposed changes yet.</p>";
}

// ---- Saved Insights ----

export function renderSavedInsights(data) {
  const el = $("savedInsightsList");
  if (!el) return;
  el.innerHTML = (data.aiSavedInsights || []).slice().reverse().map(i => `
    <div class="history-item">
      <p class="small" style="opacity:.7">${esc(getPersona(i.persona)?.label || i.persona)} · ${esc(new Date(i.createdAt).toLocaleDateString())}</p>
      <p>${esc(i.content)}</p>
      <div class="actions"><button type="button" class="danger" data-delete-insight="${i.id}">Delete</button></div>
    </div>`).join("") || "<p class='small'>No saved insights yet.</p>";
}

export function renderAiSpecialists(data) {
  renderClaudeIntegration();
  renderAiSettings(data);
  renderAiChats(data);
  renderProposedChanges(data);
  renderSavedInsights(data);
}

export function setupAiEventDelegation() {
  $("claudeConnectBtn")?.addEventListener("click", connectClaudeKey);
  $("claudeTestBtn")?.addEventListener("click", runTestConnection);
  $("claudeDisconnectBtn")?.addEventListener("click", disconnectClaude);
  $("claudeModelSelect")?.addEventListener("change", saveModelPreference);
  $("claudeResetUsageBtn")?.addEventListener("click", () => { resetUsageTotals(); renderClaudeIntegration(); });
  $("saveAiSettingsBtn")?.addEventListener("click", saveAiSettings);
  $("clearAuditLogBtn")?.addEventListener("click", runClearAuditLog);

  Object.entries(PERSONA_UI).forEach(([personaKey, ui]) => {
    $(ui.sendBtn)?.addEventListener("click", () => handleSend(personaKey));
    $(ui.clearBtn)?.addEventListener("click", () => handleClearConversation(personaKey));
  });

  document.addEventListener("click", (e) => {
    const saveInsightBtn = e.target.closest("[data-save-insight]");
    if (saveInsightBtn) { saveInsight(saveInsightBtn.dataset.saveInsight, saveInsightBtn.dataset.message); refreshAll(); return; }

    const deleteInsightBtn = e.target.closest("[data-delete-insight]");
    if (deleteInsightBtn) { deleteInsight(deleteInsightBtn.dataset.deleteInsight); refreshAll(); return; }

    const acceptBtn = e.target.closest("[data-accept-change]");
    if (acceptBtn) { acceptProposedChange(acceptBtn.dataset.acceptChange); refreshAll(); return; }

    const rejectBtn = e.target.closest("[data-reject-change]");
    if (rejectBtn) { rejectProposedChange(rejectBtn.dataset.rejectChange); refreshAll(); return; }
  });
}
