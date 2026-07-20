// UI for the built-in evidence-graded peptide library (Peptides Node master spec, section 4).
import { $, esc } from "./dom.js";
import { PEPTIDE_LIBRARY, EVIDENCE_BADGES, evidenceBadgeInfo, findLibraryEntry, searchLibrary } from "./peptide-library.js";

let openEntryId = null;
let searchText = "";
let lastFocusedBeforeModal = null;

function evidenceBadgeHtml(code) {
  const info = evidenceBadgeInfo(code);
  return `<button type="button" class="badge evidence-badge" data-evidence-badge="${esc(code)}" aria-expanded="false" title="Evidence grade ${esc(info.label)} — tap to open the explanation">${esc(info.label)}</button>`;
}

function cardHtml(entry) {
  return `
    <button type="button" class="library-card" data-peptide-library-open="${esc(entry.id)}">
      <div class="library-card-top">
        <strong>${esc(entry.name)}</strong>
      </div>
      <span class="small library-card-tooltip">${esc(entry.category)}</span>
      ${entry.synonyms?.length ? `<span class="small">${esc(entry.synonyms.join(" · "))}</span>` : ""}
      <div class="badge-row">
        <span class="badge">${esc(entry.evidenceConfidenceOverall.split(".")[0])}</span>
      </div>
    </button>`;
}

export function renderPeptideLibraryGrid() {
  const el = $("peptideLibraryGrid");
  if (!el) return;
  const entries = searchLibrary(searchText);
  el.innerHTML = entries.length
    ? entries.map(cardHtml).join("")
    : `<p class="small">No library entries match "${esc(searchText)}".</p>`;
}

function claimListHtml(title, items, renderItem) {
  if (!items || !items.length) return "";
  return `<h4>${esc(title)}</h4><ul class="library-detail-list">${items.map(renderItem).join("")}</ul>`;
}

function renderDetailContent(entry) {
  const el = $("peptideLibraryDetailContent");
  if (!el) return;
  el.innerHTML = `
    <div class="library-detail-header">
      <div>
        <p class="eyebrow" id="peptideLibraryDetailTitle">${esc(entry.category)}</p>
        <h2>${esc(entry.name)}</h2>
        ${entry.synonyms?.length ? `<p class="small">Also known as: ${esc(entry.synonyms.join(", "))}</p>` : ""}
      </div>
      <button type="button" class="close-btn" id="peptideLibraryDetailClose" aria-label="Close">✕</button>
    </div>

    <p class="small">${esc(entry.identity)}</p>
    <p class="small">Last research review: ${esc(entry.lastResearchReviewDate)}</p>

    <h4>Route-Specific Evidence</h4>
    <ul class="library-detail-list">
      ${entry.routeEvidence.map(r => `<li>${evidenceBadgeHtml(r.badge)} <strong>${esc(r.route)}</strong> — ${esc(r.summary)}</li>`).join("")}
    </ul>

    <h4>Regulatory Status</h4>
    <p class="small">${esc(entry.regulatoryStatus)}</p>

    <h4>Anti-Doping Status</h4>
    <p class="small">${esc(entry.antiDopingStatus)}</p>

    <h4>Investigated Uses</h4>
    <ul class="library-detail-list">
      ${entry.investigatedUses.map(u => `<li>${evidenceBadgeHtml(u.badge)} <strong>${esc(u.use)}</strong> — ${esc(u.summary)}</li>`).join("")}
    </ul>

    <h4>Common Claimed Uses <span class="small">(clearly labelled — not investigated evidence)</span></h4>
    <ul class="library-detail-list">
      ${entry.claimedUses.map(c => `<li><strong>${esc(c.use)}</strong> — ${esc(c.note)}</li>`).join("")}
    </ul>

    <h4>Overall Evidence Confidence</h4>
    <p class="small">${esc(entry.evidenceConfidenceOverall)}</p>

    ${claimListHtml("Major Uncertainties", entry.majorUncertainties, i => `<li>${esc(i)}</li>`)}

    <h4>Adverse-Effect Priorities</h4>
    <ul class="library-detail-list">
      ${entry.adverseEffectPriorities.map(a => `<li>${evidenceBadgeHtml(a.badge)} <strong>${esc(a.effect)}</strong> — ${esc(a.response)}</li>`).join("")}
    </ul>

    <h4>Medically Recognised Cycle</h4>
    <p class="small">${entry.medicallyRecognisedCycleExists ? "Yes" : "No"} — ${esc(entry.medicallyRecognisedCycleNote)}</p>

    <h4>Approved Protocol</h4>
    <p class="small">${entry.approvedProtocolExists ? "Yes" : "No"} — ${esc(entry.approvedProtocolNote)}</p>

    ${entry.additionalWarning ? `<div class="warning-banner">${esc(entry.additionalWarning)}</div>` : ""}

    <div id="peptideLibraryEvidenceExplain" class="evidence-explain-box" hidden></div>

    <h4>Sources Reviewed</h4>
    <ul class="library-detail-list">
      ${entry.sources.map(s => `<li>${esc(s)}</li>`).join("")}
    </ul>

    <p class="small">This entry is reference information only. It does not recommend starting, continuing, dosing, or sourcing this compound.</p>
  `;
}

export function openPeptideLibraryDetail(id) {
  const entry = findLibraryEntry(id);
  if (!entry) return;
  openEntryId = id;
  renderDetailContent(entry);
  lastFocusedBeforeModal = document.activeElement;
  $("peptideLibraryDetailBackdrop").hidden = false;
  $("peptideLibraryDetailModal").hidden = false;
  requestAnimationFrame(() => $("peptideLibraryDetailClose")?.focus());
}

export function closePeptideLibraryDetail() {
  if (!openEntryId) return;
  openEntryId = null;
  $("peptideLibraryDetailBackdrop").hidden = true;
  $("peptideLibraryDetailModal").hidden = true;
  (lastFocusedBeforeModal || $("peptideLibrarySearch"))?.focus();
}

function toggleEvidenceExplain(code, anchorBtn) {
  const info = evidenceBadgeInfo(code);
  const box = $("peptideLibraryEvidenceExplain");
  if (!box) return;
  const alreadyOpenForThisBadge = !box.hidden && box.dataset.forCode === code;
  document.querySelectorAll('.evidence-badge[aria-expanded="true"]').forEach(b => b.setAttribute("aria-expanded", "false"));
  if (alreadyOpenForThisBadge) {
    box.hidden = true;
    box.dataset.forCode = "";
    return;
  }
  box.dataset.forCode = code;
  box.innerHTML = `<strong>Evidence grade ${esc(info.label)} — ${esc(info.meaning)}</strong><p>${esc(info.explanation)}</p>`;
  box.hidden = false;
  anchorBtn.setAttribute("aria-expanded", "true");
  box.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

export function setupPeptideLibraryEventDelegation() {
  document.addEventListener("click", (e) => {
    const openBtn = e.target.closest("[data-peptide-library-open]");
    if (openBtn) { openPeptideLibraryDetail(openBtn.dataset.peptideLibraryOpen); return; }

    if (e.target.closest("#peptideLibraryDetailClose") || e.target.closest("#peptideLibraryDetailBackdrop")) {
      closePeptideLibraryDetail();
      return;
    }

    const evidenceBtn = e.target.closest("[data-evidence-badge]");
    if (evidenceBtn) { toggleEvidenceExplain(evidenceBtn.dataset.evidenceBadge, evidenceBtn); return; }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && openEntryId) closePeptideLibraryDetail();
  });

  document.addEventListener("input", (e) => {
    if (e.target.id === "peptideLibrarySearch") {
      searchText = e.target.value;
      renderPeptideLibraryGrid();
    }
  });
}
