import { $ } from "./dom.js";
import { getData, migrateData, exportData, importData, deleteItem } from "./data.js";
import { renderDashboard } from "./render-dashboard.js";
import {
  renderDaySelect, renderWorkoutForm, saveWorkout, renderWorkoutHistory,
  renderMiniVolumeChart, renderHistoricalSummary, renderPrTracker, setupTrainEventDelegation
} from "./render-train.js";
import {
  saveBodyweight, renderBodyweight, saveCheckin, renderCheckinHistory,
  saveMeasurements, renderMeasurementsHistory, savePhotoCheckin, renderPhotos
} from "./render-body.js";
import { saveNutrition, renderNutrition, renderSupplements } from "./render-nutrition.js";
import { saveRecovery, renderRecoveryHistory, saveStimulants, renderStimulantHistory } from "./render-recovery.js";
import {
  renderProfileForm, saveProfile, generateWeeklyCheckin, renderWeeklyCheckinSummary,
  generateMonthlyReview, renderMonthlyReview, renderProgramEditor, renderDataHealth,
  renderCloudStatus, renderVisualModeToggle, toggleVisualMode
} from "./render-more.js";
import { renderHistoricalImport } from "./historical.js";
import { initSync, onSyncStatusChange, syncNow, cloudSignIn, cloudSignUp, cloudSignOut } from "./sync.js";
import { estimateMeal, saveMeal, renderMealTracking, syncMealsToDailyNutrition, setupMealEventDelegation } from "./render-meals.js";
import { setupNavDrawer, updateMobilePageTitle } from "./nav-drawer.js";
import { renderAllVisuals, setupVisualsEventDelegation } from "./render-visuals.js";
import { setupMetricInfoDelegation } from "./metric-info.js";
import { renderLibrary, setupLibraryEventDelegation } from "./render-library.js";

export function refreshAll() {
  const data = getData();
  renderDashboard(data);
  renderDaySelect(data);
  renderWorkoutForm(data);
  renderWorkoutHistory(data);
  renderMiniVolumeChart(data);
  renderHistoricalSummary(data);
  renderPrTracker(data);
  renderBodyweight(data);
  renderCheckinHistory(data);
  renderMeasurementsHistory(data);
  renderPhotos(data);
  renderNutrition(data);
  renderSupplements(data);
  renderRecoveryHistory(data);
  renderStimulantHistory(data);
  renderProfileForm(data);
  renderWeeklyCheckinSummary(data);
  renderMonthlyReview(data);
  renderProgramEditor(data);
  renderDataHealth(data);
  renderMealTracking(data);
  renderVisualModeToggle(data);
  renderAllVisuals(data);
  renderLibrary(data);
}

function setupNav() {
  const tabs = document.querySelectorAll(".tab-panel");
  const navButtons = document.querySelectorAll(".nav-btn");
  navButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.tab;
      tabs.forEach(t => t.hidden = t.dataset.tab !== target);
      document.querySelectorAll(`.nav-btn[data-tab="${target}"]`).forEach(b => b.classList.add("active"));
      document.querySelectorAll(`.nav-btn:not([data-tab="${target}"])`).forEach(b => b.classList.remove("active"));
      updateMobilePageTitle(target);
      window.scrollTo({ top: 0, behavior: "instant" });
    });
  });
}

function setupDeleteDelegation() {
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-delete]");
    if (!btn) return;
    if (!confirm("Delete this entry? This cannot be undone unless you exported a backup.")) return;
    deleteItem(btn.dataset.delete, btn.dataset.id);
    refreshAll();
  });
}

function setupEventListeners() {
  $("daySelect").addEventListener("change", () => renderWorkoutForm(getData()));
  $("saveWorkout").addEventListener("click", saveWorkout);

  $("saveBodyweight").addEventListener("click", saveBodyweight);
  $("saveCheckin").addEventListener("click", saveCheckin);
  $("saveMeasurements").addEventListener("click", saveMeasurements);
  $("savePhotos").addEventListener("click", savePhotoCheckin);

  $("saveNutrition").addEventListener("click", saveNutrition);
  $("estimateMealBtn").addEventListener("click", estimateMeal);
  $("saveMealBtn").addEventListener("click", saveMeal);
  $("syncMealsToDailyBtn").addEventListener("click", syncMealsToDailyNutrition);
  $("saveRecovery").addEventListener("click", saveRecovery);
  $("saveStimulants").addEventListener("click", saveStimulants);

  $("saveProfile").addEventListener("click", saveProfile);
  $("generateWeeklyCheckin").addEventListener("click", generateWeeklyCheckin);
  $("generateMonthlyReview").addEventListener("click", generateMonthlyReview);
  $("visualModeToggle").addEventListener("change", toggleVisualMode);

  $("cloudSignIn").addEventListener("click", async () => {
    try {
      await cloudSignIn($("cloudEmail").value, $("cloudPassword").value);
      $("cloudPassword").value = "";
    } catch (err) {
      alert("Sign in failed: " + err.message);
    }
  });
  $("cloudSignUp").addEventListener("click", async () => {
    try {
      await cloudSignUp($("cloudEmail").value, $("cloudPassword").value);
      alert("Account created. Check your email if confirmation is required, then sign in.");
    } catch (err) {
      alert("Account creation failed: " + err.message);
    }
  });
  $("cloudSignOut").addEventListener("click", () => cloudSignOut());
  $("cloudSyncNow").addEventListener("click", () => syncNow());

  $("exportBtn").addEventListener("click", exportData);
  $("exportBtnDrawer").addEventListener("click", exportData);
  $("importBackup").addEventListener("change", (evt) => {
    const file = evt.target.files[0];
    if (!file) return;
    if (!confirm("Importing will REPLACE all current app data with the contents of this file. Existing unsaved data will be overwritten. Make sure you have exported a current backup first. Continue?")) {
      evt.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        importData(reader.result);
        refreshAll();
        alert("Backup imported.");
      } catch (err) {
        alert("Could not import this file: " + err.message);
      }
    };
    reader.readAsText(file);
    evt.target.value = "";
  });

  window.addEventListener("reacher:refresh", refreshAll);
}

migrateData();
setupNav();
setupNavDrawer();
setupEventListeners();
setupDeleteDelegation();
setupMealEventDelegation();
setupTrainEventDelegation();
setupVisualsEventDelegation();
setupMetricInfoDelegation();
setupLibraryEventDelegation();
refreshAll();
renderHistoricalImport();

onSyncStatusChange(renderCloudStatus);
initSync().catch(err => console.warn("[Project Reacher] Cloud sync init failed", err));
