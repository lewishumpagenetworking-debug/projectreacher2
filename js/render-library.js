import { $, esc } from "./dom.js";
import { getData, saveData } from "./data.js";
import { LIBRARY_ENTRIES, LIBRARY_CATEGORIES, LEARNING_PATHS } from "./library-data.js";

const refreshAll = () => window.dispatchEvent(new CustomEvent("reacher:refresh"));
const RECENTLY_VIEWED_MAX = 8;
const ENTRIES_BY_SLUG = Object.fromEntries(LIBRARY_ENTRIES.map(e => [e.slug, e]));
const AI_MODES = ["Quick Explain", "Deep Dive", "Coach Mode", "Quiz Mode"];

const CATEGORY_ICONS = {
  "Training Principles": "🎯", "Exercise Technique": "🏋", "Hypertrophy Science": "🔬",
  "Progression & Performance": "📈", "Nutrition Basics": "🍽", "Macros": "🥩",
  "Micronutrients": "🧪", "Meal Timing": "⏱", "Recovery": "😴", "Sleep & Fatigue": "🌙",
  "Stimulants": "☕", "Supplements": "💊", "Body Composition": "⚖", "Measurements & Ratios": "📐",
  "Mini-Cuts / Fat Loss": "🔻", "High-Responder Tracking": "🧬", "App Metrics & Scores": "📊",
  "Acronyms & Definitions": "🔤", "Injury & Safety Basics": "⚠", "Project Reacher System": "🪖"
};
function categoryIcon(category) { return CATEGORY_ICONS[category] || "📘"; }

// UI-only view state — deliberately not persisted, so it resets each session
// rather than needing its own save/migration handling.
let searchText = "";
let activeCategory = "All";
let activeDifficulty = "All";
let quickExplainMode = false;
let openSlug = null;
let openAiMode = "Quick Explain";
let lastFocusedBeforeModal = null;

function matchesQuery(entry, query) {
  if (!query) return true;
  const q = query.toLowerCase();
  const haystacks = [
    entry.title, entry.acronym, entry.shortDefinition, entry.instantMeaning,
    entry.category, ...(entry.tags || []), ...(entry.synonyms || []), ...(entry.relatedTerms || [])
  ];
  return haystacks.some(h => h && String(h).toLowerCase().includes(q));
}

function filteredEntries() {
  return LIBRARY_ENTRIES.filter(e =>
    matchesQuery(e, searchText.trim()) &&
    (activeCategory === "All" || e.category === activeCategory) &&
    (activeDifficulty === "All" || e.difficulty === activeDifficulty)
  );
}

function difficultyBadgeClass(d) {
  if (d === "Advanced") return "status-fast";
  if (d === "Intermediate") return "status-under";
  return "status-on-target";
}

function evidenceBadgeClass(tier) {
  if (tier === "Consensus" || tier === "Good") return "status-on-target";
  if (tier === "Mixed" || tier === "Implementation") return "status-under";
  if (tier === "Low") return "status-fast";
  return "";
}

function cardHtml(entry, isFavorite) {
  if (quickExplainMode) {
    return `
      <button type="button" class="library-card library-card-compact" data-library-open="${esc(entry.slug)}">
        <strong>${esc(entry.title)}</strong>
        <span class="small">${esc(entry.instantMeaning)}</span>
      </button>`;
  }
  return `
    <button type="button" class="library-card" data-library-open="${esc(entry.slug)}">
      <div class="library-card-top">
        <strong><span class="library-card-icon" aria-hidden="true">${categoryIcon(entry.category)}</span>${esc(entry.title)}</strong>
        ${isFavorite ? '<span class="library-fav-star" aria-hidden="true">★</span>' : ""}
      </div>
      <span class="small library-card-tooltip">${esc(entry.tooltipVersion)}</span>
      <div class="badge-row">
        <span class="badge">${esc(entry.category)}</span>
        <span class="badge ${difficultyBadgeClass(entry.difficulty)}">${esc(entry.difficulty)}</span>
        <span class="badge">${entry.readingTimeMin} min</span>
      </div>
    </button>`;
}

function renderCategoryChips() {
  const el = $("libraryCategoryChips");
  if (!el) return;
  const cats = ["All", ...LIBRARY_CATEGORIES];
  el.innerHTML = cats.map(c => `
    <button type="button" class="library-chip ${c === activeCategory ? "active" : ""}" data-library-category="${esc(c)}" role="tab" aria-selected="${c === activeCategory}">${c === "All" ? "" : categoryIcon(c) + " "}${esc(c)}</button>
  `).join("");
}

function renderDifficultyChips() {
  const el = $("libraryDifficultyChips");
  if (!el) return;
  const diffs = ["All", "Basic", "Intermediate", "Advanced"];
  el.innerHTML = diffs.map(d => `
    <button type="button" class="library-chip ${d === activeDifficulty ? "active" : ""}" data-library-difficulty="${esc(d)}" role="tab" aria-selected="${d === activeDifficulty}">${esc(d)}</button>
  `).join("");
}

function renderLearningPaths() {
  const el = $("libraryLearningPaths");
  if (!el) return;
  el.innerHTML = LEARNING_PATHS.map(path => `
    <div class="library-path">
      <div class="library-path-title">${esc(path.title)}</div>
      <div class="library-chip-row">
        ${path.slugs.map((slug, i) => {
          const e = ENTRIES_BY_SLUG[slug];
          if (!e) return "";
          return `<button type="button" class="library-chip library-path-step" data-library-open="${esc(slug)}">${i + 1}. ${esc(e.title)}</button>`;
        }).join("")}
      </div>
    </div>
  `).join("");
}

function renderRecentlyViewed(data) {
  const card = $("libraryRecentlyViewedCard");
  const el = $("libraryRecentlyViewed");
  if (!card || !el) return;
  const recent = (data.libraryRecentlyViewed || []).map(slug => ENTRIES_BY_SLUG[slug]).filter(Boolean);
  card.hidden = recent.length === 0;
  el.innerHTML = recent.map(e => `<button type="button" class="library-chip" data-library-open="${esc(e.slug)}">${esc(e.title)}</button>`).join("");
}

function renderResults(data) {
  const el = $("libraryResults");
  const countEl = $("libraryResultCount");
  if (!el) return;
  const results = filteredEntries();
  const favorites = new Set(data.libraryFavorites || []);
  if (countEl) countEl.textContent = `${results.length} entr${results.length === 1 ? "y" : "ies"}`;
  el.innerHTML = results.length
    ? results.map(e => cardHtml(e, favorites.has(e.slug))).join("")
    : `<p class="small">No terms matched "${esc(searchText)}". Try a shorter or different search term.</p>`;
}

export function renderLibrary(data) {
  if (!$("libraryResults")) return;
  const searchInput = $("librarySearch");
  if (searchInput && searchInput.value !== searchText) searchInput.value = searchText;
  renderCategoryChips();
  renderDifficultyChips();
  renderLearningPaths();
  renderRecentlyViewed(data);
  renderResults(data);
  const toggle = $("libraryQuickExplainToggle");
  if (toggle) {
    toggle.setAttribute("aria-pressed", String(quickExplainMode));
    toggle.classList.toggle("active", quickExplainMode);
  }
}

function relatedChips(entry) {
  const related = (entry.relatedTerms || []).map(slug => ENTRIES_BY_SLUG[slug]).filter(Boolean);
  if (!related.length) return "";
  return `<div class="library-chip-row">${related.map(r => `<button type="button" class="library-chip" data-library-open="${esc(r.slug)}">${esc(r.title)}</button>`).join("")}</div>`;
}

function listBlock(title, items) {
  if (!items || !items.length) return "";
  return `<h4>${esc(title)}</h4><ul class="library-detail-list">${items.map(i => `<li>${esc(i)}</li>`).join("")}</ul>`;
}

// Deterministic, local answer generator for the Library's "Ask AI about this" — same
// approach as calculations.js's localExerciseAdvice: no server, no external API key,
// so this reuses the article's own fields rather than making a live model call.
function generateLocalAnswer(entry, mode) {
  if (mode === "Deep Dive") {
    return entry.sportsScienceExplanation
      ? entry.sportsScienceExplanation
      : `No deeper sports-science detail is recorded for "${entry.title}" yet — the beginner explanation above is the fullest available: ${entry.beginnerExplanation}`;
  }
  if (mode === "Coach Mode") {
    const action = entry.practicalAction?.[0] ? ` Right now: ${entry.practicalAction[0]}` : "";
    return `Think of it like this — ${entry.beginnerExplanation}${action}`;
  }
  if (mode === "Quiz Mode") {
    return `Quick check: in your own words, what is "${entry.title}"? (Hint: ${entry.instantMeaning}) Then check — ${entry.shortDefinition}`;
  }
  const action = entry.practicalAction?.[0] ? ` Practical action: ${entry.practicalAction[0]}` : "";
  return `${entry.instantMeaning} ${entry.shortDefinition}${action}`;
}

function renderDetailContent(entry, data) {
  const isFavorite = (data.libraryFavorites || []).includes(entry.slug);
  const el = $("libraryDetailContent");
  el.innerHTML = `
    <div class="library-detail-header">
      <div>
        <p class="eyebrow" id="libraryDetailTitle">${esc(entry.category)}${entry.acronym ? ` · ${esc(entry.acronym)}` : ""}</p>
        <h2>${esc(entry.title)}</h2>
      </div>
      <button type="button" class="close-btn" id="libraryDetailClose" aria-label="Close">✕</button>
    </div>

    <div class="badge-row">
      <span class="badge ${difficultyBadgeClass(entry.difficulty)}">${esc(entry.difficulty)}</span>
      <span class="badge">${entry.readingTimeMin} min read</span>
      ${entry.evidenceTier ? `<span class="badge ${evidenceBadgeClass(entry.evidenceTier)}">${esc(entry.evidenceTier)}</span>` : ""}
    </div>

    <div class="library-quick-explain-box">
      <strong>Quick Explain</strong>
      <p>${esc(entry.instantMeaning)}</p>
      <p>${esc(entry.shortDefinition)}</p>
      ${entry.practicalAction?.[0] ? `<p class="small">Do this: ${esc(entry.practicalAction[0])}</p>` : ""}
    </div>

    <h4>In Plain English</h4>
    <p>${esc(entry.beginnerExplanation)}</p>

    <h4>Why It Matters</h4>
    <p>${esc(entry.whyItMatters)}</p>

    <h4>Project Reacher Application</h4>
    <p>${esc(entry.projectReacherApplication)}</p>

    ${listBlock("Practical Action", entry.practicalAction)}
    ${listBlock("Common Mistakes", entry.commonMistakes)}
    ${entry.cautionNuance ? `<div class="warning-banner">${esc(entry.cautionNuance)}</div>` : ""}

    ${entry.sportsScienceExplanation ? `
      <button type="button" class="technique-btn" data-library-toggle-deepdive aria-expanded="false">
        <span class="technique-btn-icon">🔬</span><span class="technique-btn-label">Deep Dive</span>
      </button>
      <div class="form-guide library-deep-dive" hidden>
        <p>${esc(entry.sportsScienceExplanation)}</p>
        ${entry.sourceNotes?.length ? `<p class="small">${esc(entry.sourceNotes.join(" "))}</p>` : ""}
      </div>` : ""}

    <h4>Related Terms</h4>
    ${relatedChips(entry) || '<p class="small">No related terms linked.</p>'}

    <div class="library-ai-box">
      <h4>Ask AI About This</h4>
      <p class="small">Local, rule-based answers generated from this article — not a live AI chat.</p>
      <div class="library-chip-row" id="libraryAiModes">
        ${AI_MODES.map(m => `<button type="button" class="library-chip ${m === openAiMode ? "active" : ""}" data-library-ai-mode="${esc(m)}">${esc(m)}</button>`).join("")}
      </div>
      <div class="ai-answer" id="libraryAiAnswer"><p>${esc(generateLocalAnswer(entry, openAiMode))}</p></div>
    </div>

    <div class="actions">
      <button type="button" class="secondary" id="libraryFavoriteBtn" data-library-favorite="${esc(entry.slug)}" aria-pressed="${isFavorite}">${isFavorite ? "★ Favourited" : "☆ Add to Favourites"}</button>
    </div>
  `;
}

function pushRecentlyViewed(data, slug) {
  const list = (data.libraryRecentlyViewed || []).filter(s => s !== slug);
  list.unshift(slug);
  data.libraryRecentlyViewed = list.slice(0, RECENTLY_VIEWED_MAX);
  saveData(data);
}

export function openLibraryDetail(slug) {
  const entry = ENTRIES_BY_SLUG[slug];
  if (!entry) return;
  const data = getData();
  pushRecentlyViewed(data, slug);
  openSlug = slug;
  openAiMode = "Quick Explain";
  renderDetailContent(entry, data);
  renderRecentlyViewed(data);

  lastFocusedBeforeModal = document.activeElement;
  $("libraryDetailBackdrop").hidden = false;
  $("libraryDetailModal").hidden = false;
  requestAnimationFrame(() => $("libraryDetailClose")?.focus());
}

export function closeLibraryDetail() {
  if (!openSlug) return;
  openSlug = null;
  $("libraryDetailBackdrop").hidden = true;
  $("libraryDetailModal").hidden = true;
  (lastFocusedBeforeModal || $("librarySearch"))?.focus();
}

function toggleFavorite(slug) {
  const data = getData();
  const set = new Set(data.libraryFavorites || []);
  if (set.has(slug)) set.delete(slug); else set.add(slug);
  data.libraryFavorites = [...set];
  saveData(data);
  const btn = $("libraryFavoriteBtn");
  if (btn) {
    const isFav = set.has(slug);
    btn.textContent = isFav ? "★ Favourited" : "☆ Add to Favourites";
    btn.setAttribute("aria-pressed", String(isFav));
  }
  renderResults(data);
}

export function setupLibraryEventDelegation() {
  document.addEventListener("input", (e) => {
    if (e.target.id !== "librarySearch") return;
    searchText = e.target.value;
    renderResults(getData());
  });

  document.addEventListener("click", (e) => {
    const catBtn = e.target.closest("[data-library-category]");
    if (catBtn) { activeCategory = catBtn.dataset.libraryCategory; renderCategoryChips(); renderResults(getData()); return; }

    const diffBtn = e.target.closest("[data-library-difficulty]");
    if (diffBtn) { activeDifficulty = diffBtn.dataset.libraryDifficulty; renderDifficultyChips(); renderResults(getData()); return; }

    const quickToggle = e.target.closest("#libraryQuickExplainToggle");
    if (quickToggle) { quickExplainMode = !quickExplainMode; renderLibrary(getData()); return; }

    const openBtn = e.target.closest("[data-library-open]");
    if (openBtn) { openLibraryDetail(openBtn.dataset.libraryOpen); return; }

    const closeBtn = e.target.closest("#libraryDetailClose");
    if (closeBtn) { closeLibraryDetail(); return; }

    const backdrop = e.target.closest("#libraryDetailBackdrop");
    if (backdrop) { closeLibraryDetail(); return; }

    const deepDiveBtn = e.target.closest("[data-library-toggle-deepdive]");
    if (deepDiveBtn) {
      const panel = deepDiveBtn.nextElementSibling;
      if (!panel) return;
      panel.hidden = !panel.hidden;
      deepDiveBtn.setAttribute("aria-expanded", String(!panel.hidden));
      return;
    }

    const aiModeBtn = e.target.closest("[data-library-ai-mode]");
    if (aiModeBtn && openSlug) {
      openAiMode = aiModeBtn.dataset.libraryAiMode;
      document.querySelectorAll("#libraryAiModes .library-chip").forEach(b => b.classList.toggle("active", b.dataset.libraryAiMode === openAiMode));
      const answerEl = $("libraryAiAnswer");
      if (answerEl) answerEl.innerHTML = `<p>${esc(generateLocalAnswer(ENTRIES_BY_SLUG[openSlug], openAiMode))}</p>`;
      return;
    }

    const favBtn = e.target.closest("[data-library-favorite]");
    if (favBtn) { toggleFavorite(favBtn.dataset.libraryFavorite); return; }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && openSlug) closeLibraryDetail();
  });
}
