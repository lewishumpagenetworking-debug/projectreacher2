import { $ } from "./dom.js";

const TAB_TITLES = {
  dashboard: "Dashboard", train: "Train", body: "Body", appearance: "Appearance",
  nutrition: "Nutrition", recovery: "Recovery", constraint: "Constraint", "progress-lab": "Progress Lab", library: "Library", more: "More"
};

let isOpen = false;
let lastFocused = null;

function drawer() { return $("navDrawer"); }
function backdrop() { return $("navBackdrop"); }

export function openDrawer() {
  if (isOpen) return;
  isOpen = true;
  lastFocused = document.activeElement;
  backdrop().hidden = false;
  drawer().classList.add("open");
  drawer().setAttribute("aria-hidden", "false");
  $("menuBtn").setAttribute("aria-expanded", "true");
  document.body.classList.add("drawer-open");
  requestAnimationFrame(() => drawer().querySelector(".nav-btn")?.focus());
}

export function closeDrawer() {
  if (!isOpen) return;
  isOpen = false;
  backdrop().hidden = true;
  drawer().classList.remove("open");
  drawer().setAttribute("aria-hidden", "true");
  $("menuBtn").setAttribute("aria-expanded", "false");
  document.body.classList.remove("drawer-open");
  (lastFocused || $("menuBtn"))?.focus();
}

export function updateMobilePageTitle(tab) {
  const el = $("mobilePageTitle");
  if (el) el.textContent = TAB_TITLES[tab] || "";
}

export function setupNavDrawer() {
  $("menuBtn").addEventListener("click", openDrawer);
  $("closeDrawerBtn").addEventListener("click", closeDrawer);
  backdrop().addEventListener("click", closeDrawer);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen) closeDrawer();
  });

  // Any nav item click closes the drawer — harmless no-op if it's already closed
  // (e.g. a click on the desktop sidebar, which shares the same .nav-btn class).
  document.addEventListener("click", (e) => {
    if (e.target.closest(".nav-drawer .nav-btn")) closeDrawer();
  });

  // Simple left-swipe-to-close, only while the drawer is open.
  let touchStartX = null;
  drawer().addEventListener("touchstart", (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
  drawer().addEventListener("touchend", (e) => {
    if (touchStartX == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (dx < -60) closeDrawer();
    touchStartX = null;
  }, { passive: true });

  updateMobilePageTitle("dashboard");
}
