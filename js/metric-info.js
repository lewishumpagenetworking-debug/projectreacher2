import { esc } from "./dom.js";

// Short, quick-reference explanations for technical training metrics — collapsed
// by default, expanded on tap. Purely a reading aid; the values themselves are
// still read/written by the exact same input elements as before.
export const METRIC_EXPLANATIONS = {
  weight: "What load did you use for this set? Use the same unit and machine setting each time where possible.",
  reps: "How many clean reps did you complete? Only count reps that matched the exercise standard.",
  rir: "How many clean reps were left? 0 RIR means no clean reps left. 1 RIR means one clean rep left. 2 RIR means two clean reps left.",
  rpe: "How hard did that set feel? RPE 10 means no clean reps left. RPE 9 means about 1 clean rep left. RPE 8 means about 2 clean reps left.",
  formQuality: "Did the rep match the standard? Higher scores mean cleaner, more repeatable technique. Progression should only happen when form stays strong.",
  rom: "Range of Motion. Did you use the full useful range for this exercise? Progress only counts if the range stays consistent.",
  tempo: "Did you control the rep speed? Tempo includes the lowering, lifting, pauses and squeeze.",
  targetMuscle: "Did you feel the intended muscle doing the work? This helps track whether the exercise is loading the right area.",
  pain: "Any joint pain, sharp pain or warning signs? Muscle burn is normal. Joint pain or sharp pain should block progression.",
  notes: "Anything important to remember next time? Use this for setup, machine settings, stance, grip, cues or issues."
};

/**
 * Builds a <label> wrapping a metric field with a tappable info toggle.
 * Same markup shape as a plain `<label>Text<input ...></label>`, so nothing
 * about how the input is read/written changes — only what wraps it visually.
 */
export function metricLabel(metricKey, labelText, inputHtml) {
  const explanation = METRIC_EXPLANATIONS[metricKey];
  if (!explanation) return `<label>${esc(labelText)}${inputHtml}</label>`;
  return `
    <label class="metric-label">
      <span class="metric-label-row" data-metric-toggle="${esc(metricKey)}" role="button" tabindex="0" aria-expanded="false">
        <span class="metric-label-text">${esc(labelText)}</span>
        <span class="metric-chevron">▾</span>
      </span>
      <span class="metric-explanation" hidden>${esc(explanation)}</span>
      ${inputHtml}
    </label>`;
}

function toggleMetric(trigger) {
  const label = trigger.closest(".metric-label");
  const explanation = label?.querySelector(".metric-explanation");
  const chevron = trigger.querySelector(".metric-chevron");
  if (!explanation) return;
  explanation.hidden = !explanation.hidden;
  const isExpanded = !explanation.hidden;
  trigger.setAttribute("aria-expanded", String(isExpanded));
  if (chevron) chevron.textContent = isExpanded ? "▴" : "▾";
}

export function setupMetricInfoDelegation() {
  document.addEventListener("click", (e) => {
    const trigger = e.target.closest("[data-metric-toggle]");
    if (trigger) toggleMetric(trigger);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const trigger = e.target.closest("[data-metric-toggle]");
    if (!trigger) return;
    e.preventDefault();
    toggleMetric(trigger);
  });
}
