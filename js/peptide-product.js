// Product/Source tracking + Vial & Solution record + reusable Equipment Profiles
// (Peptide Recovery Tracking, Phase 4, spec sections 11-14).
//
// Hard rule throughout: this module stores exactly what the user types and nothing else.
// It never recommends a solution, a volume, a dose, a needle length/gauge, an injection
// site, or converts a target dose into syringe units — every "concentration" or
// "amount per syringe unit" value is a neutral record of a number the user already
// worked out themselves, not something this app calculated for them.
import { uid } from "./data.js";

export const VIAL_STATUSES = ["unopened", "in_use", "finished", "discarded", "archived"];
export const VIAL_STATUS_LABELS = {
  unopened: "Unopened", in_use: "In use", finished: "Finished", discarded: "Discarded", archived: "Archived"
};

// ==================== PEPTIDE SOURCE (product/supplier) ====================

export function getSourcesForPeptide(data, peptideId) {
  return (data.peptideSources || []).filter(s => s.peptideId === peptideId);
}

export function createPeptideSource(data, fields) {
  const now = new Date().toISOString();
  const source = {
    id: uid(), peptideId: null, supplierName: "", manufacturer: "", productUrl: "", purchaseDate: null,
    orderReference: "", batchNumber: "", lotNumber: "", expiryDate: null, countryOfOrigin: "",
    storageLocation: "", storageTemperatureText: "", openedDate: null, discardedDate: null, notes: "",
    createdAt: now, updatedAt: now,
    ...fields
  };
  data.peptideSources.push(source);
  return source;
}

export function updatePeptideSource(data, id, patch) {
  const source = (data.peptideSources || []).find(s => s.id === id);
  if (!source) return null;
  Object.assign(source, patch, { updatedAt: new Date().toISOString() });
  return source;
}

export function deletePeptideSource(data, id) {
  data.peptideSources = (data.peptideSources || []).filter(s => s.id !== id);
}

// ==================== VIAL RECORD ====================

export function getVialsForPeptide(data, peptideId) {
  return (data.vialRecords || []).filter(v => v.peptideId === peptideId);
}

export function createVialRecord(data, fields) {
  const now = new Date().toISOString();
  const vial = {
    id: uid(), peptideId: null, label: "", sequenceNumber: null, statedAmount: null, statedAmountUnit: "mcg",
    numberOfVials: null, status: "unopened", openedDate: null, discardedDate: null,
    solutionType: "", solutionBrand: "", solutionVolume: null, solutionVolumeUnit: "mL",
    preparationDate: null, preparedBy: "", preparationNotes: "", storageNotes: "",
    solutionExpiryOrDiscardDate: null,
    userEnteredConcentration: null, concentrationUnit: "", userEnteredAmountPerSyringeUnit: null,
    concentrationNotes: "", concentrationDateEntered: null, notes: "",
    createdAt: now, updatedAt: now,
    ...fields
  };
  data.vialRecords.push(vial);
  return vial;
}

export function updateVialRecord(data, id, patch) {
  const vial = (data.vialRecords || []).find(v => v.id === id);
  if (!vial) return null;
  Object.assign(vial, patch, { updatedAt: new Date().toISOString() });
  return vial;
}

export function deleteVialRecord(data, id) {
  data.vialRecords = (data.vialRecords || []).filter(v => v.id !== id);
}

// ==================== EQUIPMENT PROFILES (reusable across peptides) ====================

export function getEquipmentProfiles(data) {
  return data.equipmentProfiles || [];
}

export function createEquipmentProfile(data, fields) {
  const profile = {
    id: uid(), name: "", syringeType: "", syringeCapacity: "", syringeUnitScale: "",
    needleLength: "", needleGauge: "", needleType: "", brand: "", source: "", notes: "",
    createdAt: new Date().toISOString(),
    ...fields
  };
  data.equipmentProfiles.push(profile);
  return profile;
}

export function updateEquipmentProfile(data, id, patch) {
  const profile = (data.equipmentProfiles || []).find(p => p.id === id);
  if (!profile) return null;
  Object.assign(profile, patch);
  return profile;
}

export function deleteEquipmentProfile(data, id) {
  data.equipmentProfiles = (data.equipmentProfiles || []).filter(p => p.id !== id);
}
