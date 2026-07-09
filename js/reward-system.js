// Lightweight, purely-additive visual reward layer for Project Reacher.
// Never touches getData()/saveData() itself — callers pass in already-loaded
// data/entries and this module only reads the DOM to show/animate feedback.
import { esc } from "./dom.js";

const REDUCED_MOTION = () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function removeExisting(selector) {
  document.querySelectorAll(selector).forEach(el => el.remove());
}

/** "Mission Started" overlay shown when the user picks a training day to start. */
export function showMissionStart(day, focusPoints = []) {
  removeExisting(".mission-overlay-backdrop");
  const backdrop = document.createElement("div");
  backdrop.className = "mission-overlay-backdrop";
  backdrop.innerHTML = `
    <div class="mission-overlay-card">
      <p class="mission-tag">Mission Started</p>
      <p class="mission-overlay-title">TODAY'S MISSION</p>
      <p class="mission-overlay-day">${esc(day)}</p>
      ${focusPoints.length ? `<p class="mission-overlay-focus">Focus: ${focusPoints.map(esc).join(" · ")}</p>` : ""}
      <p class="mission-overlay-hint">Tap anywhere to begin</p>
    </div>`;
  document.body.appendChild(backdrop);
  const dismiss = () => backdrop.remove();
  backdrop.addEventListener("click", dismiss);
  setTimeout(dismiss, REDUCED_MOTION() ? 900 : 1500);
}

const SET_LOCKED_LABELS = ["SET LOCKED", "VOLUME BANKED", "CLEAN REP STANDARD", "TARGET HIT"];

/** Small floating reward label + pulse on a completed set row. */
export function celebrateSetRow(setRowEl, label) {
  if (!setRowEl) return;
  setRowEl.classList.remove("is-locked");
  // Force reflow so the animation replays if triggered again quickly.
  void setRowEl.offsetWidth;
  setRowEl.classList.add("is-locked");
  removeExisting(".reward-toast");
  const toast = document.createElement("span");
  toast.className = "reward-toast";
  toast.textContent = label || SET_LOCKED_LABELS[0];
  setRowEl.style.position = setRowEl.style.position || "relative";
  setRowEl.appendChild(toast);
  setTimeout(() => toast.remove(), 1900);
}

/** Compact shine + note when every working set for an exercise is filled in. */
export function celebrateExerciseComplete(cardEl, noteText) {
  if (!cardEl) return;
  const sweep = document.createElement("div");
  sweep.className = "exercise-complete-sweep";
  cardEl.style.position = cardEl.style.position || "relative";
  cardEl.appendChild(sweep);
  setTimeout(() => sweep.remove(), 1000);
  if (noteText) {
    let note = cardEl.querySelector(".exercise-complete-note");
    if (!note) {
      note = document.createElement("p");
      note.className = "exercise-complete-note";
      cardEl.querySelector(".exercise-header-info")?.appendChild(note);
    }
    note.textContent = noteText;
  }
}

function formatVolumeComparison(currentVolume, previousVolume) {
  if (previousVolume == null || previousVolume <= 0) return null;
  const diff = Math.round(currentVolume - previousVolume);
  if (diff > 0) return `+${diff}kg volume vs last session`;
  if (diff < 0) return `${diff}kg volume vs last session`;
  return "Same volume as last session";
}
export { formatVolumeComparison };

/** Full-screen "Operation Complete" summary shown after a workout is saved. */
export function showOperationComplete(summary) {
  removeExisting(".completion-backdrop");
  const backdrop = document.createElement("div");
  backdrop.className = "completion-backdrop";
  backdrop.innerHTML = `
    <div class="completion-modal" role="dialog" aria-modal="true" aria-labelledby="completionTitle">
      <p class="mission-tag">Operation Complete</p>
      <p class="completion-title" id="completionTitle">${esc(summary.day)}</p>
      <p class="completion-sub">${esc(summary.date)}</p>

      <div class="completion-stat-grid">
        <div class="completion-stat"><span>Exercises</span><strong>${summary.exerciseCount}</strong></div>
        <div class="completion-stat"><span>Working Sets</span><strong>${summary.setCount}</strong></div>
        <div class="completion-stat"><span>Total Volume</span><strong>${Math.round(summary.totalVolume)}kg</strong></div>
        <div class="completion-stat"><span>Progression Candidates</span><strong>${summary.progressionCandidates.length}</strong></div>
      </div>

      ${summary.musclesTrained.length ? `
      <div class="completion-section">
        <h4>Muscles Trained</h4>
        <div class="badge-row">${summary.musclesTrained.map(m => `<span class="badge">${esc(m)}</span>`).join("")}</div>
      </div>` : ""}

      ${summary.progressionCandidates.length ? `
      <div class="completion-section">
        <h4>Progression Candidates</h4>
        <ul>${summary.progressionCandidates.map(c => `<li><strong>${esc(c)}</strong> — Progression candidate</li>`).join("")}</ul>
      </div>` : ""}

      ${summary.prs.length ? `
      <div class="pr-highlight-card">
        <p class="pr-highlight-title">New Standard Set</p>
        ${summary.prs.map(pr => `<p class="small">${esc(pr.name)}: ${esc(pr.oldBest)} &rarr; <strong>${esc(pr.newBest)}</strong></p>`).join("")}
      </div>` : ""}

      <div class="next-objective-card">
        <p class="mission-tag">Next Objective</p>
        <p class="small">${esc(summary.nextObjective)}</p>
      </div>

      <div class="actions">
        <button type="button" class="completion-close-btn">Return to Dashboard</button>
      </div>
    </div>`;
  document.body.appendChild(backdrop);
  const close = () => backdrop.remove();
  backdrop.querySelector(".completion-close-btn")?.addEventListener("click", close);
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) close(); });
}
