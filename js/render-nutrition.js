import { $, esc, fmt } from "./dom.js";
import { getData, saveData, uid } from "./data.js";
import { macroTargets, perKg, fibreTarget, calorieAdherence } from "./calculations.js";

export function saveNutrition() {
  const data = getData();
  const now = new Date().toISOString();
  data.nutritionLogs.push({
    id: uid(),
    date: new Date().toLocaleDateString("en-CA"),
    calories: Number($("nCalories").value || 0),
    protein: Number($("nProtein").value || 0),
    carbs: Number($("nCarbs").value || 0),
    fat: Number($("nFat").value || 0),
    fibre: Number($("nFibre").value || 0),
    waterLitres: $("nWater").value === "" ? null : Number($("nWater").value),
    sodiumMg: $("nSodium").value === "" ? null : Number($("nSodium").value),
    electrolytes: $("nElectrolytes").value,
    notes: $("nNotes").value,
    createdAt: now, updatedAt: now
  });
  saveData(data);
  ["nCalories", "nProtein", "nCarbs", "nFat", "nFibre", "nWater", "nSodium", "nElectrolytes", "nNotes"].forEach(id => $(id).value = "");
  window.dispatchEvent(new CustomEvent("reacher:refresh"));
  alert("Nutrition log saved.");
}

export function renderNutrition(data) {
  const currentWeight = data.bodyweightLogs.at(-1)?.morningBodyweight ?? data.profile.currentWeight ?? data.profile.startingWeight;
  const latest = data.nutritionLogs.at(-1);
  const dash = $("macroDashboard");
  if (dash) {
    if (!latest) {
      dash.innerHTML = "<p class='small'>Log nutrition to see macro calculations.</p>";
    } else {
      const targets = macroTargets(currentWeight);
      const fibreT = fibreTarget(latest.calories);
      dash.innerHTML = `
        <div class="badge-row">
          <span class="badge">${fmt(perKg(latest.protein, currentWeight), 2)}g/kg protein</span>
          <span class="badge">${fmt(perKg(latest.carbs, currentWeight), 2)}g/kg carbs</span>
          <span class="badge">${fmt(perKg(latest.fat, currentWeight), 2)}g/kg fat</span>
        </div>
        <p class="small">Protein target ${targets.proteinMin}-${targets.proteinMax}g · Carb target ${targets.carbsMin}-${targets.carbsMax}g · Fat target ${targets.fatMin}-${targets.fatMax}g · Fibre target ~${fibreT ?? "--"}g</p>
        <p class="small">Calorie adherence vs 2800kcal reference: ${calorieAdherence(latest.calories, 2800) ?? "--"}%</p>`;
    }
  }
  const history = $("nutritionHistory");
  if (history) {
    history.innerHTML = data.nutritionLogs.slice().reverse().slice(0, 20).map(n => `
      <div class="history-item">
        <strong>${esc(n.date)}</strong> · ${n.calories}kcal · P${n.protein} C${n.carbs} F${n.fat} · Fibre ${n.fibre ?? "-"}g
        ${n.notes ? `<br>${esc(n.notes)}` : ""}
        <div class="actions"><button class="danger" data-delete="nutritionLogs" data-id="${n.id}">Delete</button></div>
      </div>`).join("") || "<p class='small'>No nutrition logs yet.</p>";
  }
}

export function renderSupplements(data) {
  const checklist = $("supplementChecklist");
  if (checklist) {
    const today = new Date().toLocaleDateString("en-CA");
    const takenToday = new Set(data.supplementLogs.filter(l => l.date === today && l.taken).map(l => l.supplementId));
    checklist.innerHTML = data.supplements.map(s => `
      <div class="checklist-row">
        <input type="checkbox" data-supp-toggle="${s.id}" ${takenToday.has(s.id) ? "checked" : ""}>
        <span>${esc(s.supplementName)} <span class="small">(${esc(s.targetDose)} · ${esc(s.timing)})</span></span>
        <span class="badge ${takenToday.has(s.id) ? "status-on-target" : ""}">${takenToday.has(s.id) ? "Taken" : "Pending"}</span>
      </div>`).join("");

    checklist.querySelectorAll("[data-supp-toggle]").forEach(cb => {
      cb.addEventListener("change", () => {
        const d = getData();
        const supp = d.supplements.find(s => s.id === cb.dataset.suppToggle);
        const today = new Date().toLocaleDateString("en-CA");
        let log = d.supplementLogs.find(l => l.supplementId === supp.id && l.date === today);
        if (!log) {
          log = { id: uid(), date: today, supplementId: supp.id, supplementName: supp.supplementName, targetDose: supp.targetDose, actualDose: supp.targetDose, timing: supp.timing, taken: false, notes: "" };
          d.supplementLogs.push(log);
        }
        log.taken = cb.checked;
        saveData(d);
        window.dispatchEvent(new CustomEvent("reacher:refresh"));
      });
    });
  }

  const history = $("supplementHistory");
  if (history) {
    history.innerHTML = data.supplementLogs.slice().reverse().slice(0, 20).map(l => `
      <div class="history-item">${esc(l.date)} · ${esc(l.supplementName)} · ${l.taken ? "Taken" : "Skipped"}</div>
    `).join("") || "<p class='small'>No supplement history yet.</p>";
  }
}
