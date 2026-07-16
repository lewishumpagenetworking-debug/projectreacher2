// Lightweight motion utilities for the Aesthetic Protocol redesign (spec: "controlled
// motion system" — count-up metrics, chart draw-in). No animation library, no new
// dependency; respects the app's existing prefers-reduced-motion kill-switch. Purely
// presentational — never touches data, only how an already-computed value is displayed.

function reducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

const lastValues = new WeakMap();

/**
 * Animates an element's text content from its previously-displayed numeric value up (or
 * down) to `targetValue`. Skips the animation entirely — just sets the text — on first
 * render for that element and whenever the target hasn't actually changed, so repeated
 * refreshAll() calls don't replay the count-up on every unrelated data change.
 */
export function countUpText(el, targetValue, { decimals = 0, suffix = "", duration = 700 } = {}) {
  if (!el || targetValue == null || Number.isNaN(Number(targetValue))) return;
  const rounded = Number(Number(targetValue).toFixed(decimals));
  const prev = lastValues.get(el);
  if (prev === rounded) return;
  lastValues.set(el, rounded);

  if (prev == null || reducedMotion()) {
    el.textContent = `${rounded.toFixed(decimals)}${suffix}`;
    return;
  }

  const start = prev;
  const startTime = performance.now();
  function tick(now) {
    const t = Math.min(1, (now - startTime) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    const current = start + (rounded - start) * eased;
    el.textContent = `${current.toFixed(decimals)}${suffix}`;
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

/** Scans a container for [data-count-target] elements (written by a render function's
 * innerHTML pass) and count-up-animates each one. Lets HTML-templated widgets (like the
 * Progress Lab summary strip) opt into count-up without hand-wiring each element. */
export function autoCountUp(container) {
  if (!container) return;
  container.querySelectorAll("[data-count-target]").forEach(el => {
    const target = parseFloat(el.dataset.countTarget);
    if (Number.isNaN(target)) return;
    countUpText(el, target, {
      decimals: Number(el.dataset.countDecimals || 0),
      suffix: el.dataset.countSuffix || ""
    });
  });
}
