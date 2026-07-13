// Shared category vocabularies for the Vision Board / Goals / Milestones image system.
// Kept in one place so the gallery, library, and category pickers never drift apart.

export const VISION_BOARD_CATEGORIES = [
  { id: "physique", label: "Physique" },
  { id: "lifestyle", label: "Lifestyle" },
  { id: "business", label: "Business" },
  { id: "wealth", label: "Wealth" },
  { id: "travel", label: "Travel" },
  { id: "family", label: "Family" },
  { id: "home", label: "Home" },
  { id: "vehicles", label: "Vehicles" },
  { id: "leadership", label: "Leadership" },
  { id: "legacy", label: "Legacy" }
];

export const GOAL_CATEGORIES = [
  { id: "business", label: "Business" },
  { id: "weight", label: "Weight" },
  { id: "physique", label: "Physique" },
  { id: "financial", label: "Financial" },
  { id: "skill", label: "Skill" },
  { id: "custom", label: "Custom" }
];

export const MILESTONE_CATEGORIES = [
  { id: "progress-photo", label: "Progress Photo" },
  { id: "bodyweight", label: "Bodyweight Comparison" },
  { id: "business", label: "Business Achievement" },
  { id: "workspace", label: "Workspace Improvement" },
  { id: "personal", label: "Personal Achievement" },
  { id: "custom", label: "Custom" }
];

export function categoryLabel(categoryId, builtIns, customCategories) {
  const builtIn = builtIns.find(c => c.id === categoryId);
  if (builtIn) return builtIn.label;
  const custom = (customCategories || []).find(c => c.id === categoryId);
  return custom ? custom.label : categoryId;
}
