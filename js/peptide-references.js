// Sources & Reference Library (Peptide Recovery Tracking, Phase 4, spec sections 33-34).
// Reference material is stored strictly separately from a peptide's own protocol fields —
// nothing in this module, and nothing that calls it, ever copies a reference's content
// into the user's actual schedule/cycle/administration data. The user links a reference
// to a peptide manually and that is the only association that exists.
import { uid } from "./data.js";

export const REFERENCE_SOURCE_TYPES = ["video", "article", "podcast", "clinician_document", "laboratory_document", "user_note", "other"];
export const REFERENCE_SOURCE_TYPE_LABELS = {
  video: "Video", article: "Article", podcast: "Podcast", clinician_document: "Clinician document",
  laboratory_document: "Laboratory document", user_note: "User note", other: "Other"
};

export const EXTERNAL_REFERENCE_LABEL = "External reference — not an application recommendation";

export function getReferencesForPeptide(data, peptideId) {
  return (data.referenceSources || []).filter(r => r.peptideId === peptideId);
}

export function createReferenceSource(data, fields) {
  const reference = {
    id: uid(), peptideId: null, sourceType: "other", creator: "", title: "", publicationDate: null,
    url: "", timestamp: "", dateAccessed: null, quotation: "", summary: "", notes: "",
    createdAt: new Date().toISOString(),
    ...fields
  };
  data.referenceSources.push(reference);
  return reference;
}

export function updateReferenceSource(data, id, patch) {
  const reference = (data.referenceSources || []).find(r => r.id === id);
  if (!reference) return null;
  Object.assign(reference, patch);
  return reference;
}

export function deleteReferenceSource(data, id) {
  data.referenceSources = (data.referenceSources || []).filter(r => r.id !== id);
}
