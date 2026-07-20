// Reconstitution and syringe calculation engine (Peptides Node master spec, section 6-7).
//
// This module has exactly one job: convert user-entered label quantity, user-entered
// reconstitution volume and user-entered target amount into concentration, volume and
// syringe markings. It never selects, suggests, or defaults a target dose, a diluent, or
// a syringe type — every number that goes in was typed by the user. Validation is
// informational only (spec section 7: "Warnings must not silently alter inputs") and never
// blocks a save, consistent with this app's standing non-blocking-entry rule.
//
// Pure functions only — no DOM, no storage reads. UI wiring and the append-only calculation
// audit trail (data.vialRecords[].reconstitutionVersions) live in js/peptide-product.js and
// its render layer, per the spec's instruction to keep calculation logic testable and
// separate from UI (section 21).
import { uid } from "./data.js";
import { parseLogDate } from "./dates.js";
import { scheduledDatesInRange } from "./peptides.js";

export const RECONSTITUTION_FORMULA_VERSION = "1.0.0";

export const MASS_UNITS = ["mcg", "mg"];
export const SYRINGE_TYPES = ["U100", "U40", "direct_ml", "custom"];
export const SYRINGE_TYPE_LABELS = {
  U100: "U-100 insulin syringe", U40: "U-40 insulin syringe",
  direct_ml: "Direct mL graduations", custom: "Custom scale (user-confirmed)"
};

/** Converts a mass value to micrograms. Only mcg/mg are treated as convertible mass units —
 * IU is never converted here (spec: "Do not treat IU as a generic mass conversion"). */
export function toMcg(amount, unit) {
  if (amount == null || amount === "" || Number.isNaN(Number(amount))) return null;
  const n = Number(amount);
  if (unit === "mcg") return n;
  if (unit === "mg") return n * 1000;
  return null; // IU or unrecognised unit — caller must not treat this as mass
}

/** concentration_mcg_per_ml = total_peptide_amount_mcg ÷ reconstitution_volume_ml */
export function calculateConcentration({ vialStatedAmount, vialStatedAmountUnit, numberOfEquivalentVials = 1, reconstitutionVolumeMl }) {
  const perVialMcg = toMcg(vialStatedAmount, vialStatedAmountUnit);
  const vials = Number(numberOfEquivalentVials) > 0 ? Number(numberOfEquivalentVials) : 1;
  const totalPeptideAmountMcg = perVialMcg != null ? perVialMcg * vials : null;
  const volumeMl = reconstitutionVolumeMl != null && Number(reconstitutionVolumeMl) > 0 ? Number(reconstitutionVolumeMl) : null;
  const concentrationMcgPerMl = totalPeptideAmountMcg != null && volumeMl != null ? totalPeptideAmountMcg / volumeMl : null;
  return { totalPeptideAmountMcg, reconstitutionVolumeMl: volumeMl, concentrationMcgPerMl };
}

/** administration_volume_ml = user_entered_amount_mcg ÷ concentration_mcg_per_ml */
export function calculateAdministrationVolume({ concentrationMcgPerMl, targetAmount, targetAmountUnit }) {
  const targetAmountMcg = toMcg(targetAmount, targetAmountUnit);
  const administrationVolumeMl = targetAmountMcg != null && concentrationMcgPerMl ? targetAmountMcg / concentrationMcgPerMl : null;
  return { targetAmountMcg, administrationVolumeMl };
}

/** U-100: volume × 100. U-40: volume × 40. Other syringes: volume ÷ volume-per-marking. */
export function calculateSyringeMarking({ administrationVolumeMl, syringeType, volumePerMarking }) {
  if (administrationVolumeMl == null) return { syringeMarking: null, markingUnitLabel: null };
  if (syringeType === "U100") return { syringeMarking: administrationVolumeMl * 100, markingUnitLabel: "units (U-100)" };
  if (syringeType === "U40") return { syringeMarking: administrationVolumeMl * 40, markingUnitLabel: "units (U-40)" };
  if (syringeType === "direct_ml") return { syringeMarking: administrationVolumeMl, markingUnitLabel: "mL" };
  if (syringeType === "custom") {
    const perMarking = Number(volumePerMarking);
    if (!perMarking || perMarking <= 0) return { syringeMarking: null, markingUnitLabel: null };
    return { syringeMarking: administrationVolumeMl / perMarking, markingUnitLabel: "markings (custom scale)" };
  }
  return { syringeMarking: null, markingUnitLabel: null };
}

const MIN_MEASURABLE_ML = { U100: 0.01, U40: 0.025, direct_ml: 0.01, custom: null };

/**
 * Full calculation pipeline. Returns { normalized, result, warnings }. Never throws on
 * incomplete input — missing/invalid values simply produce null results plus a warning,
 * so a draft/incomplete plan can still be saved (spec: warn, never block).
 */
export function calculateReconstitution(input) {
  const {
    vialStatedAmount, vialStatedAmountUnit, numberOfEquivalentVials = 1, reconstitutionVolumeMl,
    targetAmount, targetAmountUnit, syringeType, volumePerMarking, syringeCapacityMl
  } = input;

  const concentration = calculateConcentration({ vialStatedAmount, vialStatedAmountUnit, numberOfEquivalentVials, reconstitutionVolumeMl });
  const dose = calculateAdministrationVolume({ concentrationMcgPerMl: concentration.concentrationMcgPerMl, targetAmount, targetAmountUnit });
  const marking = calculateSyringeMarking({ administrationVolumeMl: dose.administrationVolumeMl, syringeType, volumePerMarking });

  const normalized = {
    totalPeptideAmountMcg: concentration.totalPeptideAmountMcg,
    reconstitutionVolumeMl: concentration.reconstitutionVolumeMl,
    targetAmountMcg: dose.targetAmountMcg
  };
  const result = {
    concentrationMcgPerMl: concentration.concentrationMcgPerMl,
    administrationVolumeMl: dose.administrationVolumeMl,
    syringeMarking: marking.syringeMarking,
    markingUnitLabel: marking.markingUnitLabel,
    syringeType, syringeTypeLabel: SYRINGE_TYPE_LABELS[syringeType] || null
  };

  const warnings = validateReconstitutionInputs(input, { concentration, dose, marking });

  return { formulaVersion: RECONSTITUTION_FORMULA_VERSION, normalized, result, warnings };
}

/**
 * Section 7 validation — vial/dose/syringe arithmetic only. Schedule-level checks
 * (contradictory days/frequency, route mismatch against the evidence library, untouched
 * example values) belong to the entry funnel, which has the schedule and peptide context
 * this module deliberately does not take as input (section 21 separation of concerns).
 * Every item here is informational: it never mutates a value and never blocks a save.
 */
export function validateReconstitutionInputs(input, computed) {
  const {
    vialStatedAmount, vialStatedAmountUnit, reconstitutionVolumeMl,
    targetAmount, targetAmountUnit, syringeType, volumePerMarking, syringeCapacityMl
  } = input;
  const { concentration, dose, marking } = computed || {};
  const warnings = [];
  const warn = (code, message) => warnings.push({ code, severity: "warning", message });

  if (vialStatedAmount != null && !MASS_UNITS.includes(vialStatedAmountUnit)) {
    if (vialStatedAmountUnit === "IU") warn("iu_not_convertible", "The vial amount is entered in IU. IU cannot be converted as a generic mass unit — a verified product-specific conversion is required, or record it as reference-only.");
    else warn("missing_vial_unit", "The vial amount is missing a recognised unit (mcg or mg).");
  }
  if (targetAmount != null && !MASS_UNITS.includes(targetAmountUnit)) {
    if (targetAmountUnit === "IU") warn("iu_not_convertible_target", "The target amount is entered in IU. IU cannot be converted as a generic mass unit — a verified product-specific conversion is required, or record it as reference-only.");
    else warn("missing_target_unit", "The target amount is missing a recognised unit (mcg or mg).");
  }

  [["vialStatedAmount", vialStatedAmount], ["reconstitutionVolumeMl", reconstitutionVolumeMl], ["targetAmount", targetAmount]]
    .forEach(([field, value]) => {
      if (value != null && value !== "" && Number(value) <= 0) warn(`impossible_value_${field}`, `${field} must be a positive number — a zero or negative value cannot be used in this calculation.`);
    });

  if (concentration?.totalPeptideAmountMcg != null && dose?.targetAmountMcg != null && dose.targetAmountMcg > concentration.totalPeptideAmountMcg) {
    warn("target_exceeds_vial", "The target amount entered is larger than the total peptide content of the vial(s) entered. Check both values.");
  }

  if (concentration?.totalPeptideAmountMcg != null && dose?.targetAmountMcg != null && concentration.totalPeptideAmountMcg > 0) {
    const ratio = dose.targetAmountMcg / concentration.totalPeptideAmountMcg;
    if (ratio >= 1000) warn("possible_unit_confusion", "The target amount is at least 1000x the vial's total content once normalised. Double-check that mg and mcg have not been swapped between the vial and target entries.");
  }

  if (syringeType === "custom" && (!volumePerMarking || Number(volumePerMarking) <= 0)) {
    warn("unknown_syringe_scale", "A custom syringe scale was selected but no confirmed volume-per-marking value was entered.");
  }

  if (dose?.administrationVolumeMl != null && syringeCapacityMl != null && Number(syringeCapacityMl) > 0 && dose.administrationVolumeMl > Number(syringeCapacityMl)) {
    warn("volume_exceeds_capacity", `The calculated volume (${dose.administrationVolumeMl.toFixed(3)} mL) exceeds the selected syringe's stated capacity (${syringeCapacityMl} mL).`);
  }

  if (dose?.administrationVolumeMl != null && dose.administrationVolumeMl > 0) {
    const minMl = MIN_MEASURABLE_ML[syringeType];
    if (minMl != null && dose.administrationVolumeMl < minMl) {
      warn("volume_too_small_to_measure", `The calculated volume (${dose.administrationVolumeMl.toFixed(4)} mL) is smaller than what can reliably be measured on the selected syringe.`);
    }
  }

  return warnings;
}

// ==================== Supply / inventory projection ====================

/** Expected administration count over a date range, reusing the same schedule-date logic
 * already used for adherence tracking (js/peptides.js scheduledDatesInRange). */
export function expectedAdministrationsInRange(schedule, fromDate, toDate) {
  return scheduledDatesInRange(schedule, fromDate, toDate).length;
}

/**
 * Vial/supply projection for a plan. `administrationsCount` is the number of planned
 * administrations across the whole plan (e.g. from expectedAdministrationsInRange).
 * Never recommends restocking — purely arithmetic over what the user entered.
 */
export function calculateSupplyProjection({ targetAmountMcg, administrationsCount, totalPeptideAmountMcgPerVial, numberOfVialsAvailable }) {
  if (targetAmountMcg == null || administrationsCount == null) {
    return { totalAmountRequiredMcg: null, estimatedVialsRequired: null, estimatedRemainderMcg: null, insufficientSupply: null };
  }
  const totalAmountRequiredMcg = targetAmountMcg * administrationsCount;
  let estimatedVialsRequired = null, estimatedRemainderMcg = null, insufficientSupply = null;
  if (totalPeptideAmountMcgPerVial != null && totalPeptideAmountMcgPerVial > 0) {
    estimatedVialsRequired = Math.ceil(totalAmountRequiredMcg / totalPeptideAmountMcgPerVial);
    const totalAvailableMcg = totalPeptideAmountMcgPerVial * (numberOfVialsAvailable ?? estimatedVialsRequired);
    estimatedRemainderMcg = totalAvailableMcg - totalAmountRequiredMcg;
    if (numberOfVialsAvailable != null) insufficientSupply = numberOfVialsAvailable < estimatedVialsRequired;
  }
  return { totalAmountRequiredMcg, estimatedVialsRequired, estimatedRemainderMcg, insufficientSupply };
}

/** Estimated date a vial's supply is exhausted, given a flat per-administration consumption
 * rate and a starting date. Returns null if there isn't enough information to estimate. */
export function estimatedExhaustionDate({ totalPeptideAmountMcgPerVial, targetAmountMcg, schedule, fromDate }) {
  if (!totalPeptideAmountMcgPerVial || !targetAmountMcg || !schedule || !fromDate) return null;
  const administrationsPerVial = Math.floor(totalPeptideAmountMcgPerVial / targetAmountMcg);
  if (administrationsPerVial <= 0) return null;
  const farFuture = new Date(fromDate.getTime() + 1000 * 86400000);
  const dates = scheduledDatesInRange(schedule, fromDate, farFuture);
  return dates[administrationsPerVial - 1] || null;
}

/** True if the product's stated expiry falls before the plan's intended finish date. */
export function expiryBeforeCompletion(expiryDateStr, finishDateStr) {
  const expiry = parseLogDate(expiryDateStr);
  const finish = parseLogDate(finishDateStr);
  if (!expiry || !finish) return null;
  return expiry < finish;
}

// ==================== Calculation audit trail (append-only) ====================

/**
 * Adds a new calculation version to a vial record's history. Never mutates or removes an
 * existing version — "never overwrite an earlier calculation after the cycle begins" is
 * satisfied structurally: this function only ever pushes, and the caller is responsible for
 * persisting the returned array back onto the vial record via updateVialRecord().
 */
export function addReconstitutionVersion(existingVersions, calc, { effectiveDate, roundingRule = "none", warningsAcknowledged = false, inputs } = {}) {
  const versions = existingVersions ? existingVersions.slice() : [];
  const version = {
    id: uid(),
    createdAt: new Date().toISOString(),
    effectiveDate: effectiveDate || new Date().toLocaleDateString("en-CA"),
    formulaVersion: calc.formulaVersion,
    inputs: inputs || null,
    normalized: calc.normalized,
    result: calc.result,
    roundingRule,
    warnings: calc.warnings,
    warningsAcknowledged
  };
  versions.push(version);
  return versions;
}

export function latestReconstitutionVersion(versions) {
  if (!versions || !versions.length) return null;
  return versions[versions.length - 1];
}
