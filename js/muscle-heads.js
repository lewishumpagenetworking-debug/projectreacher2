// Muscle Head Allocation Engine (Hypertrophy Intelligence Engine spec). A canonical taxonomy
// of muscle heads/sub-structures tracked independently of — and additively layered on top of —
// the coarser MUSCLE_GROUPS bucket system already in program.js. Nothing here replaces or
// changes MUSCLE_GROUPS/volumeGroup/primaryMuscle; every exercise's per-head contribution is
// optional extra context.
//
// Contribution weights are deliberately coarse (1.0 / 0.5 / 0.25) rather than fabricated
// precise decimals — this app has no EMG or biomechanical measurement to justify finer numbers,
// and inventing false precision would be worse than being honestly approximate:
//   1.0  = primary emphasis (the main driver of growth for this head from this exercise)
//   0.5  = significant secondary emphasis (meaningfully trained, but not the primary driver)
//   0.25 = minor/indirect contribution (some stimulus, not a reason to select the exercise for this head)

export const MUSCLE_HEADS = {
  front_delts: { label: "Front Delts", region: "shoulders" },
  lateral_delts: { label: "Lateral Delts", region: "shoulders" },
  rear_delts: { label: "Rear Delts", region: "shoulders" },

  chest_upper: { label: "Upper/Clavicular Chest", region: "chest" },
  chest_mid: { label: "Mid/Sternal Chest", region: "chest" },
  chest_lower: { label: "Lower Chest Fibres", region: "chest" },

  lat_width: { label: "Lat Width", region: "back" },
  back_thickness: { label: "Mid-Back Thickness", region: "back" },
  upper_back: { label: "Upper Back", region: "back" },
  traps: { label: "Traps", region: "back" },

  biceps_long_head: { label: "Biceps Long Head", region: "biceps" },
  biceps_short_head: { label: "Biceps Short Head", region: "biceps" },
  brachialis: { label: "Brachialis", region: "biceps" },

  triceps_long_head: { label: "Triceps Long Head", region: "triceps" },
  triceps_lateral_head: { label: "Triceps Lateral Head", region: "triceps" },
  triceps_medial_head: { label: "Triceps Medial Head", region: "triceps" },

  brachioradialis: { label: "Brachioradialis", region: "forearms" },
  wrist_flexors: { label: "Wrist Flexors", region: "forearms" },
  wrist_extensors: { label: "Wrist Extensors", region: "forearms" },

  quads: { label: "Quads", region: "legs" },
  hamstrings: { label: "Hamstrings", region: "legs" },
  glutes: { label: "Glutes", region: "legs" },
  calves: { label: "Calves", region: "legs" },

  // Aesthetic Protocol v2 Deterministic Training Rulebook directive — the app's taxonomy had
  // no tracked structure for core or neck work until this directive required weekly Core/Neck
  // targets. Purely additive: nothing above changes shape or meaning.
  core: { label: "Core", region: "core" },
  neck: { label: "Neck", region: "neck" }
};

export const MUSCLE_HEAD_IDS = Object.keys(MUSCLE_HEADS);

export const MUSCLE_HEAD_REGIONS = [...new Set(MUSCLE_HEAD_IDS.map(id => MUSCLE_HEADS[id].region))];

export function headsInRegion(region) {
  return MUSCLE_HEAD_IDS.filter(id => MUSCLE_HEADS[id].region === region);
}

export function isValidHeadId(id) {
  return Object.prototype.hasOwnProperty.call(MUSCLE_HEADS, id);
}
