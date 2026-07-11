import { $, esc } from "./dom.js";
import { getData, saveData, uid } from "./data.js";
import { resizeImage } from "./render-body.js";

const refreshAll = () => window.dispatchEvent(new CustomEvent("reacher:refresh"));
const todayISO = () => new Date().toLocaleDateString("en-CA");

export function saveSkinLog() {
  const data = getData();
  const now = new Date().toISOString();
  data.skinLogs.push({
    id: uid(),
    date: todayISO(),
    skinCondition: $("skinCondition").value === "" ? null : Number($("skinCondition").value),
    oiliness: $("skinOiliness").value === "" ? null : Number($("skinOiliness").value),
    hydration: $("skinHydration").value === "" ? null : Number($("skinHydration").value),
    breakouts: $("skinBreakouts").value === "" ? null : Number($("skinBreakouts").value),
    triggers: $("skinTriggers").value,
    notes: $("skinNotes").value,
    createdAt: now, updatedAt: now
  });
  saveData(data);
  ["skinCondition", "skinOiliness", "skinHydration", "skinBreakouts", "skinTriggers", "skinNotes"].forEach(id => $(id).value = "");
  refreshAll();
  alert("Skin log saved.");
}

export function renderSkinLogHistory(data) {
  const el = $("skinLogHistory");
  if (!el) return;
  el.innerHTML = data.skinLogs.slice().reverse().slice(0, 20).map(s => `
    <div class="history-item">
      <strong>${esc(s.date)}</strong> · Condition ${s.skinCondition ?? "-"}/5 · Oiliness ${s.oiliness ?? "-"}/5 · Hydration ${s.hydration ?? "-"}/5 · Breakouts ${s.breakouts ?? "-"}
      ${s.triggers ? `<br>Possible triggers: ${esc(s.triggers)}` : ""}
      ${s.notes ? `<br>${esc(s.notes)}` : ""}
      <div class="actions"><button class="danger" data-delete="skinLogs" data-id="${s.id}">Delete</button></div>
    </div>`).join("") || "<p class='small'>No skin logs yet.</p>";
}

export function saveHairLog() {
  const data = getData();
  const now = new Date().toISOString();
  data.hairLogs.push({
    id: uid(),
    date: todayISO(),
    hairCondition: $("hairCondition").value === "" ? null : Number($("hairCondition").value),
    scalpCondition: $("hairScalpCondition").value === "" ? null : Number($("hairScalpCondition").value),
    sheddingLevel: $("hairShedding").value === "" ? null : Number($("hairShedding").value),
    stylingNotes: $("hairStylingNotes").value,
    notes: $("hairNotes").value,
    createdAt: now, updatedAt: now
  });
  saveData(data);
  ["hairCondition", "hairScalpCondition", "hairShedding", "hairStylingNotes", "hairNotes"].forEach(id => $(id).value = "");
  refreshAll();
  alert("Hair log saved.");
}

export function renderHairLogHistory(data) {
  const el = $("hairLogHistory");
  if (!el) return;
  el.innerHTML = data.hairLogs.slice().reverse().slice(0, 20).map(h => `
    <div class="history-item">
      <strong>${esc(h.date)}</strong> · Condition ${h.hairCondition ?? "-"}/5 · Scalp ${h.scalpCondition ?? "-"}/5 · Shedding ${h.sheddingLevel ?? "-"}/5
      ${h.stylingNotes ? `<br>Styling: ${esc(h.stylingNotes)}` : ""}
      ${h.notes ? `<br>${esc(h.notes)}` : ""}
      <div class="actions"><button class="danger" data-delete="hairLogs" data-id="${h.id}">Delete</button></div>
    </div>`).join("") || "<p class='small'>No hair logs yet.</p>";
}

export function saveProductExperiment() {
  const data = getData();
  const name = $("productName").value.trim();
  if (!name) { alert("Enter a product name."); return; }
  const now = new Date().toISOString();
  data.productExperiments.push({
    id: uid(),
    name,
    category: $("productCategory").value,
    startDate: $("productStartDate").value || todayISO(),
    endDate: null,
    statedPurpose: $("productPurpose").value,
    result: "",
    active: true,
    createdAt: now, updatedAt: now
  });
  saveData(data);
  ["productName", "productStartDate", "productPurpose"].forEach(id => $(id).value = "");
  refreshAll();
  alert("Product experiment started.");
}

export function renderProductExperimentHistory(data) {
  const el = $("productExperimentHistory");
  if (!el) return;
  el.innerHTML = data.productExperiments.slice().reverse().map(p => `
    <div class="history-item">
      <strong>${esc(p.name)}</strong> · ${esc(p.category)} · Started ${esc(p.startDate)} ${p.endDate ? `· Ended ${esc(p.endDate)}` : ""}
      <span class="badge ${p.active ? "status-on-target" : ""}">${p.active ? "Active" : "Ended"}</span>
      ${p.statedPurpose ? `<br>Purpose: ${esc(p.statedPurpose)}` : ""}
      ${p.result ? `<br>Result: ${esc(p.result)}` : ""}
      <div class="actions">
        ${p.active ? `<button class="secondary" data-end-experiment="${p.id}">End Experiment</button>` : ""}
        <button class="danger" data-delete="productExperiments" data-id="${p.id}">Delete</button>
      </div>
    </div>`).join("") || "<p class='small'>No product experiments logged yet.</p>";
}

function endProductExperiment(id) {
  const result = prompt("Any result/notes for this experiment? (optional)") || "";
  const data = getData();
  const exp = data.productExperiments.find(p => p.id === id);
  if (!exp) return;
  exp.active = false;
  exp.endDate = todayISO();
  exp.result = result;
  exp.updatedAt = new Date().toISOString();
  saveData(data);
  refreshAll();
}

export async function saveAppearanceCheckin() {
  const skinFile = $("appearanceSkinPhoto").files[0];
  const hairFile = $("appearanceHairPhoto").files[0];
  const notes = $("appearanceCheckinNotes").value;
  if (!skinFile && !hairFile && !notes.trim()) { alert("Add a photo or a note."); return; }

  const [skinPhoto, hairPhoto] = await Promise.all([
    skinFile ? resizeImage(skinFile, 600, 0.6) : null,
    hairFile ? resizeImage(hairFile, 600, 0.6) : null
  ]);

  const data = getData();
  const now = new Date().toISOString();
  data.appearanceCheckins.push({
    id: uid(), date: todayISO(), skinPhoto, hairPhoto, notes,
    createdAt: now, updatedAt: now
  });
  saveData(data);
  ["appearanceSkinPhoto", "appearanceHairPhoto", "appearanceCheckinNotes"].forEach(id => $(id).value = "");
  refreshAll();
  alert("Appearance check-in saved.");
}

export function renderAppearanceCheckinHistory(data) {
  const el = $("appearanceCheckinHistory");
  if (!el) return;
  el.innerHTML = data.appearanceCheckins.slice().reverse().map(c => `
    <div class="history-item">
      <strong>${esc(c.date)}</strong>
      <div class="badge-row">
        ${c.skinPhoto ? `<img src="${c.skinPhoto}" alt="skin" style="width:70px;border-radius:8px">` : ""}
        ${c.hairPhoto ? `<img src="${c.hairPhoto}" alt="hair" style="width:70px;border-radius:8px">` : ""}
      </div>
      ${c.notes ? `<p class="small">${esc(c.notes)}</p>` : ""}
      <div class="actions"><button class="danger" data-delete="appearanceCheckins" data-id="${c.id}">Delete</button></div>
    </div>`).join("") || "<p class='small'>No appearance check-ins yet.</p>";
}

export function renderAppearance(data) {
  renderSkinLogHistory(data);
  renderHairLogHistory(data);
  renderProductExperimentHistory(data);
  renderAppearanceCheckinHistory(data);
}

export function setupAppearanceEventDelegation() {
  document.addEventListener("click", (e) => {
    const endBtn = e.target.closest("[data-end-experiment]");
    if (endBtn) { endProductExperiment(endBtn.dataset.endExperiment); }
  });
}
