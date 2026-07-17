import { $ } from "./dom.js";
import { getData, migrateData, exportData, importData, fullRestoreFromBackup, deleteItem } from "./data.js";
import { renderDashboard } from "./render-dashboard.js";
import {
  renderDaySelect, renderWorkoutForm, saveWorkout, renderWorkoutHistory,
  renderMiniVolumeChart, renderHistoricalSummary, renderPrTracker, setupTrainEventDelegation,
  startMission, renderFarmersCarryAnalytics
} from "./render-train.js";
import {
  saveBodyweight, renderBodyweight, saveCheckin, renderCheckinHistory,
  saveMeasurements, renderMeasurementsHistory, savePhotoCheckin, renderPhotos, renderBodyMilestoneVision,
  renderPhotoCompare, renderPhotoCompareResult
} from "./render-body.js";
import {
  saveSkinLog, saveHairLog, saveProductExperiment, saveAppearanceCheckin,
  renderAppearance, setupAppearanceEventDelegation
} from "./render-appearance.js";
import { renderAiSpecialists, setupAiEventDelegation } from "./render-ai.js";
import { saveNutrition, renderNutrition, renderSupplements } from "./render-nutrition.js";
import {
  saveRecovery, renderRecoveryHistory, saveStimulants, renderStimulantHistory,
  saveSleepLog, saveHydrationLog, renderRecoveryCommandCentre, setupRecoveryEventDelegation, saveIntervention
} from "./render-recovery.js";
import {
  renderProfileForm, saveProfile, generateWeeklyCheckin, renderWeeklyCheckinSummary,
  generateMonthlyReview, renderMonthlyReview, renderProgramEditor, renderDataHealth,
  renderCloudStatus, renderVisualModeToggle, toggleVisualMode
} from "./render-more.js";
import { renderHistoricalImport } from "./historical.js";
import { initSync, onSyncStatusChange, syncNow, cloudSignIn, cloudSignUp, cloudSignOut } from "./sync.js";
import { estimateMeal, saveMeal, renderMealTracking, syncMealsToDailyNutrition, setupMealEventDelegation, saveFoodTemplateFromCurrentMeal, savePreWorkoutLog, savePostWorkoutLog, renderPreWorkoutReadinessGate, renderPrePostWorkoutHistory, renderTrainingNutritionCorrelation, logPreWorkoutReadinessChoice } from "./render-meals.js";
import { setupNavDrawer, updateMobilePageTitle } from "./nav-drawer.js";
import { renderAllVisuals, setupVisualsEventDelegation } from "./render-visuals.js";
import { setupMetricInfoDelegation, hydrateStaticMetricLabels } from "./metric-info.js";
import { renderLibrary, setupLibraryEventDelegation } from "./render-library.js";
import { renderReviewCentre, setupReviewEventDelegation } from "./render-reviews.js";
import { renderTasks, setupTasksEventDelegation } from "./render-tasks.js";
import { setupDashboardChartEventDelegation } from "./render-dashboard.js";
import { renderReminders, setupRemindersEventDelegation, startReminderScheduler } from "./render-reminders.js";
import { renderVisionBoard, renderTargetPhysiqueBoard, setupVisionBoardEventDelegation } from "./render-vision-board.js";
import { renderGoals, setupGoalsEventDelegation } from "./render-goals.js";
import { renderMilestonesTimeline, setupMilestonesEventDelegation } from "./render-milestones.js";
import { renderImageLibrary, setupImageLibraryEventDelegation } from "./render-image-library.js";
import { renderSessionNutritionCards, renderBodyweightReviewNotice } from "./render-session-nutrition.js";
import { renderConstraintPage, completeWeeklyReview } from "./render-constraint.js";
import { renderProgressTaskList, renderPageTasks } from "./render-task-list.js";
import { renderProgressLab, setupProgressLabEventDelegation } from "./render-progress-lab.js";
import { renderSessionImages, setupSessionImagesEventDelegation } from "./render-session-images.js";
import { renderCustomSessionsList, setupCustomSessionBuilderEventDelegation } from "./render-custom-sessions.js";

export function refreshAll() {
  const data = getData();
  renderDashboard(data);
  renderDaySelect(data);
  renderWorkoutForm(data);
  renderSessionNutritionCards(data, $("daySelect")?.value || Object.keys(data.trainingProgram)[0]);
  renderSessionImages(data, $("daySelect")?.value || Object.keys(data.trainingProgram)[0]);
  renderBodyweightReviewNotice(data);
  renderWorkoutHistory(data);
  renderMiniVolumeChart(data);
  renderHistoricalSummary(data);
  renderPrTracker(data);
  renderFarmersCarryAnalytics(data);
  renderBodyweight(data);
  renderCheckinHistory(data);
  renderMeasurementsHistory(data);
  renderPhotos(data);
  renderPhotoCompare(data);
  renderBodyMilestoneVision(data);
  renderAppearance(data);
  renderAiSpecialists(data);
  renderNutrition(data);
  renderSupplements(data);
  renderRecoveryHistory(data);
  renderStimulantHistory(data);
  renderRecoveryCommandCentre(data);
  renderProfileForm(data);
  renderWeeklyCheckinSummary(data);
  renderMonthlyReview(data);
  renderProgramEditor(data);
  renderDataHealth(data);
  renderMealTracking(data);
  renderPreWorkoutReadinessGate(data);
  renderPrePostWorkoutHistory(data);
  renderTrainingNutritionCorrelation(data);
  renderVisualModeToggle(data);
  renderAllVisuals(data);
  renderLibrary(data);
  renderReviewCentre(data);
  renderConstraintPage(data);
  renderProgressLab(data);
  renderProgressTaskList(data);
  renderPageTasks(data, "train", "trainPageTasks");
  renderPageTasks(data, "body", "bodyPageTasks");
  renderPageTasks(data, "nutrition", "nutritionPageTasks");
  renderPageTasks(data, "recovery", "recoveryPageTasks");
  renderTasks(data);
  renderReminders(data);
  renderGoals(data);
  renderMilestonesTimeline(data);
  renderImageLibrary(data);
  renderVisionBoard(data);
  renderTargetPhysiqueBoard(data);
  renderCustomSessionsList(data);
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

const COLLECTION_LABELS = {
  workouts: "Workouts", checkins: "Check-ins", measurements: "Measurements",
  bodyweightLogs: "Bodyweight logs", nutritionLogs: "Nutrition logs", recoveryLogs: "Recovery logs",
  stimulantLogs: "Stimulant logs", supplementLogs: "Supplement logs", mealLogs: "Meal logs",
  progressPhotos: "Progress photos", monthlyReviews: "Monthly reviews", motivationalVisuals: "Motivational visuals",
  sleepLogs: "Sleep logs", hydrationLogs: "Hydration logs",
  skinLogs: "Skin logs", hairLogs: "Hair logs", productExperiments: "Product experiments",
  appearanceCheckins: "Appearance check-ins", aiConversationsPerformance: "Performance Coach conversations",
  aiConversationsAppearance: "Appearance Director conversations", aiConversationsShared: "Shared AI conversations",
  aiSavedInsights: "Saved AI insights",
  foodTemplates: "Food templates", preWorkoutLogs: "Pre-workout logs", postWorkoutLogs: "Post-workout logs",
  interventions: "Interventions", reviews: "Reviews", savedMeals: "Saved meals (My Meals)", tasks: "Tasks",
  reminders: "Reminders", images: "Vision images", imageCategories: "Custom image categories",
  goals: "Goals", milestones: "Milestones",
  customSessions: "Custom sessions", externalConstraintLogs: "External constraint logs"
};

function formatImportSummary(summary) {
  const lines = ["Historical data imported into your current app:"];
  Object.entries(summary.collections || {}).forEach(([key, c]) => {
    if (!c.foundInImport) return;
    const label = COLLECTION_LABELS[key] || key;
    const bits = [`${c.foundInImport} found`];
    if (c.added) bits.push(`${c.added} added`);
    if (c.enriched) bits.push(`${c.enriched} updated with extra detail`);
    if (c.skippedDuplicate) bits.push(`${c.skippedDuplicate} already present`);
    lines.push(`${label}: ${bits.join(", ")}`);
  });
  if (summary.exercisesAdded) lines.push(`Exercises restored from the import: ${summary.exercisesAdded}`);
  if (summary.programDaysAdded) lines.push(`Training program days restored: ${summary.programDaysAdded}`);
  if (summary.sessionNutritionDaysAdded) lines.push(`Session nutrition targets restored: ${summary.sessionNutritionDaysAdded} day(s)`);
  if (summary.prsAdded) lines.push(`PR reference goals added: ${summary.prsAdded}`);
  if (summary.prLegacyGoalsPreserved) lines.push(`Conflicting PR goals from the file kept as a legacy reference (your current goals were not changed): ${summary.prLegacyGoalsPreserved}`);
  lines.push(`Day 6 present: ${summary.day6Preserved ? "yes" : "no"}`);
  if (summary.activeDraftAction === "kept-current") lines.push("Active workout draft: kept your current unsaved draft.");
  if (summary.activeDraftAction === "restored-from-import") lines.push("Active workout draft: restored from the imported file.");
  if (summary.errors && summary.errors.length) lines.push(`Errors: ${summary.errors.join("; ")}`);
  lines.push("Your current app, program, and features were not changed or downgraded.");
  return lines.join("\n");
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

function setupReadinessGateDelegation() {
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-readiness-choice]");
    if (!btn) return;
    logPreWorkoutReadinessChoice(btn.dataset.readinessChoice);
  });
}

function setupEventListeners() {
  $("daySelect").addEventListener("change", () => {
    const data = getData();
    renderWorkoutForm(data);
    renderSessionNutritionCards(data, $("daySelect").value);
    renderSessionImages(data, $("daySelect").value);
    startMission(data);
  });
  $("saveWorkout").addEventListener("click", saveWorkout);

  $("saveBodyweight").addEventListener("click", saveBodyweight);
  $("saveCheckin").addEventListener("click", saveCheckin);
  $("saveMeasurements").addEventListener("click", saveMeasurements);
  $("savePhotos").addEventListener("click", savePhotoCheckin);
  $("photoCompareA").addEventListener("change", () => renderPhotoCompareResult(getData()));
  $("photoCompareB").addEventListener("change", () => renderPhotoCompareResult(getData()));

  $("saveSkinLog")?.addEventListener("click", saveSkinLog);
  $("saveHairLog")?.addEventListener("click", saveHairLog);
  $("saveProductExperiment")?.addEventListener("click", saveProductExperiment);
  $("saveAppearanceCheckin")?.addEventListener("click", saveAppearanceCheckin);

  $("saveNutrition").addEventListener("click", saveNutrition);
  $("estimateMealBtn").addEventListener("click", estimateMeal);
  $("saveMealBtn").addEventListener("click", () => saveMeal(false));
  $("saveMealDraftBtn")?.addEventListener("click", () => saveMeal(true));
  $("saveFoodTemplateBtn")?.addEventListener("click", saveFoodTemplateFromCurrentMeal);
  $("savePreWorkoutLogBtn")?.addEventListener("click", savePreWorkoutLog);
  $("savePostWorkoutLogBtn")?.addEventListener("click", savePostWorkoutLog);
  $("syncMealsToDailyBtn").addEventListener("click", syncMealsToDailyNutrition);
  $("saveRecovery").addEventListener("click", saveRecovery);
  $("saveStimulants").addEventListener("click", saveStimulants);
  $("saveSleepLog")?.addEventListener("click", saveSleepLog);
  $("saveHydrationLog")?.addEventListener("click", saveHydrationLog);
  $("saveInterventionBtn")?.addEventListener("click", saveIntervention);
  $("completeWeeklyReviewBtn")?.addEventListener("click", completeWeeklyReview);

  $("saveProfile").addEventListener("click", saveProfile);
  $("saveGymProfile")?.addEventListener("click", saveProfile);
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
    const fullRestore = $("fullRestoreToggle")?.checked;

    if (fullRestore) {
      const confirmed = confirm(
        "FULL RESTORE (ADVANCED): This replaces your entire current app with the uploaded file, exactly as exported. " +
        "It can remove newer features (like Day 6) if this file predates them. A safety backup of your current data " +
        "is taken first, but this is not the normal way to import a backup — most people want the default merge " +
        "instead. Are you sure you want to fully restore from this file?"
      );
      if (!confirmed) { evt.target.value = ""; return; }
    } else if (!confirm("Import historical data into your current app. This adds workouts, meals and logs — it will never change your current program, features, or app version. Continue?")) {
      evt.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        if (fullRestore) {
          await fullRestoreFromBackup(reader.result);
          refreshAll();
          alert("Full restore complete. Your app now matches the uploaded file exactly (a safety backup of your previous data was saved first).");
          if ($("fullRestoreToggle")) $("fullRestoreToggle").checked = false;
        } else {
          const { summary } = await importData(reader.result);
          refreshAll();
          alert(formatImportSummary(summary));
        }
      } catch (err) {
        alert("Could not import this file: " + err.message);
      }
    };
    reader.readAsText(file);
    evt.target.value = "";
  });

  $("clearCacheBtn")?.addEventListener("click", clearAppCacheAndReload);

  window.addEventListener("reacher:refresh", refreshAll);
}

/**
 * "Force update" button: clears any cached app FILES (Cache Storage, any service
 * worker) and reloads via a cache-busting URL so the browser fetches the latest
 * deployed code — never touches localStorage, so all saved app data (workouts,
 * meals, logs, drafts) is completely unaffected.
 */
async function clearAppCacheAndReload() {
  const confirmed = confirm(
    "This reloads the app to fetch the latest version and clears any cached app files. " +
    "Your saved data (workouts, meals, logs) is NOT deleted — it stays exactly as it is. " +
    "As an extra precaution, consider clicking Export first if you haven't recently. Continue?"
  );
  if (!confirmed) return;

  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(r => r.unregister()));
    }
  } catch (err) {
    console.warn("[Project Reacher] Cache/service worker cleanup failed (continuing to reload anyway).", err);
  }

  const url = new URL(window.location.href);
  url.hash = "";
  url.searchParams.set("_refresh", Date.now().toString());
  window.location.replace(url.toString());
}

migrateData();
setupNav();
setupNavDrawer();
setupEventListeners();
setupDeleteDelegation();
setupReadinessGateDelegation();
setupMealEventDelegation();
setupTrainEventDelegation();
setupVisualsEventDelegation();
setupMetricInfoDelegation();
hydrateStaticMetricLabels();
setupLibraryEventDelegation();
setupReviewEventDelegation();
setupTasksEventDelegation();
setupDashboardChartEventDelegation();
setupProgressLabEventDelegation();
setupSessionImagesEventDelegation();
setupCustomSessionBuilderEventDelegation();
setupRemindersEventDelegation();
startReminderScheduler();
setupVisionBoardEventDelegation();
setupGoalsEventDelegation();
setupMilestonesEventDelegation();
setupImageLibraryEventDelegation();
setupRecoveryEventDelegation();
setupAppearanceEventDelegation();
setupAiEventDelegation();
refreshAll();
renderHistoricalImport();

onSyncStatusChange(renderCloudStatus);
initSync().catch(err => console.warn("[Project Reacher] Cloud sync init failed", err));
