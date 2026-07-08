// Exercise database + editable training program template.
// This is the STRUCTURED, EDITABLE DEFAULT used when a user has no saved program yet
// (or as reference metadata for progression/volume logic). Once saved, the user's
// copy lives in localStorage under data.trainingProgram / data.exercises and this
// file is never read again for that user's edits.

let seq = 0;
const eid = (name) => `ex_${name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")}`;

function exercise({
  name, category, primaryMuscle, secondaryMuscles = [], movementPattern, equipment,
  repRangeMin, repRangeMax, targetRIRSet1, targetRIRSet2, failureRule, notes = "",
  active = true, optional = false
}) {
  return {
    id: eid(name), name, category, primaryMuscle, secondaryMuscles, movementPattern, equipment,
    repRangeMin, repRangeMax, targetRIRSet1, targetRIRSet2, failureRule, notes, active, optional
  };
}

export const EXERCISE_DATABASE = [
  exercise({ name: "Hack Squat", category: "compound", primaryMuscle: "quads", secondaryMuscles: ["glutes"], movementPattern: "squat", equipment: "machine", repRangeMin: 6, repRangeMax: 10, targetRIRSet1: 1, targetRIRSet2: 0, failureRule: "Set 1 ~1 RIR, Set 2 technical failure." }),
  exercise({ name: "Romanian Deadlift", category: "compound", primaryMuscle: "hamstrings", secondaryMuscles: ["glutes", "lower back"], movementPattern: "hinge", equipment: "barbell", repRangeMin: 8, repRangeMax: 10, targetRIRSet1: 1, targetRIRSet2: 0, failureRule: "Set 1 ~1 RIR, Set 2 technical failure." }),
  exercise({ name: "Leg Press", category: "compound", primaryMuscle: "quads", secondaryMuscles: ["glutes", "hamstrings"], movementPattern: "squat", equipment: "machine", repRangeMin: 10, repRangeMax: 15, targetRIRSet1: 1, targetRIRSet2: 0, failureRule: "Set 1 ~1 RIR, Set 2 technical failure." }),
  exercise({ name: "Leg Curl", category: "isolation", primaryMuscle: "hamstrings", movementPattern: "knee flexion", equipment: "machine", repRangeMin: 10, repRangeMax: 15, targetRIRSet1: 0, targetRIRSet2: 0, failureRule: "Both sets to technical failure." }),
  exercise({ name: "Standing Calf Raise", category: "isolation", primaryMuscle: "calves", movementPattern: "plantarflexion", equipment: "machine", repRangeMin: 12, repRangeMax: 20, targetRIRSet1: 0, targetRIRSet2: 0, failureRule: "Both sets to technical failure, controlled stretch and squeeze." }),

  exercise({ name: "Incline DB Press", category: "compound", primaryMuscle: "upper chest", secondaryMuscles: ["front delts", "triceps"], movementPattern: "horizontal push", equipment: "dumbbell", repRangeMin: 6, repRangeMax: 10, targetRIRSet1: 1, targetRIRSet2: 0, failureRule: "Set 1 ~1 RIR, Set 2 technical failure." }),
  exercise({ name: "Smith Incline Press", category: "compound", primaryMuscle: "upper chest", secondaryMuscles: ["front delts", "triceps"], movementPattern: "horizontal push", equipment: "smith machine", repRangeMin: 6, repRangeMax: 10, targetRIRSet1: 1, targetRIRSet2: 0, failureRule: "Set 1 ~1 RIR, Set 2 technical failure." }),
  exercise({ name: "Seated DB Shoulder Press", category: "compound", primaryMuscle: "shoulders", secondaryMuscles: ["triceps"], movementPattern: "vertical push", equipment: "dumbbell", repRangeMin: 8, repRangeMax: 10, targetRIRSet1: 1, targetRIRSet2: 0, failureRule: "Set 1 ~1 RIR, Set 2 technical failure." }),
  exercise({ name: "Machine Chest Press", category: "compound", primaryMuscle: "chest", secondaryMuscles: ["front delts", "triceps"], movementPattern: "horizontal push", equipment: "machine", repRangeMin: 8, repRangeMax: 12, targetRIRSet1: 1, targetRIRSet2: 0, failureRule: "Set 1 ~1 RIR, Set 2 technical failure. Safe failure pressing." }),
  exercise({ name: "Close Grip Chest Press", category: "compound", primaryMuscle: "chest", secondaryMuscles: ["triceps"], movementPattern: "horizontal push", equipment: "machine", repRangeMin: 8, repRangeMax: 12, targetRIRSet1: 1, targetRIRSet2: 0, failureRule: "Set 1 ~1 RIR, Set 2 technical failure.", notes: "Counted as indirect triceps volume." }),

  exercise({ name: "Cable Lateral Raise", category: "isolation", primaryMuscle: "side delts", movementPattern: "abduction", equipment: "cable", repRangeMin: 12, repRangeMax: 15, targetRIRSet1: 0, targetRIRSet2: 0, failureRule: "Both sets to technical failure." }),
  exercise({ name: "Face Pull", category: "isolation", primaryMuscle: "rear delts", secondaryMuscles: ["rotator cuff"], movementPattern: "horizontal pull", equipment: "cable", repRangeMin: 12, repRangeMax: 15, targetRIRSet1: 0, targetRIRSet2: 0, failureRule: "Both sets to technical failure. Shoulder health." }),
  exercise({ name: "Rear Delt Fly", category: "isolation", primaryMuscle: "rear delts", movementPattern: "horizontal abduction", equipment: "machine", repRangeMin: 12, repRangeMax: 15, targetRIRSet1: 0, targetRIRSet2: 0, failureRule: "Both sets to technical failure." }),

  exercise({ name: "Neutral Grip Lat Pulldown", category: "compound", primaryMuscle: "lats", secondaryMuscles: ["biceps"], movementPattern: "vertical pull", equipment: "cable", repRangeMin: 8, repRangeMax: 12, targetRIRSet1: 1, targetRIRSet2: 0, failureRule: "Set 1 ~1 RIR, Set 2 technical failure.", notes: "Weighted pull-up replacement." }),
  exercise({ name: "Wide Grip Lat Pulldown", category: "compound", primaryMuscle: "lats", secondaryMuscles: ["biceps"], movementPattern: "vertical pull", equipment: "cable", repRangeMin: 8, repRangeMax: 12, targetRIRSet1: 1, targetRIRSet2: 0, failureRule: "Set 1 ~1 RIR, Set 2 technical failure.", notes: "Lat width." }),
  exercise({ name: "Single Arm Lat Pulldown", category: "isolation", primaryMuscle: "lats", movementPattern: "vertical pull", equipment: "cable", repRangeMin: 10, repRangeMax: 12, targetRIRSet1: 0, targetRIRSet2: 0, failureRule: "Both sets to technical failure. Lat isolation." }),
  exercise({ name: "Chest Supported Row", category: "compound", primaryMuscle: "back thickness", secondaryMuscles: ["lats", "biceps"], movementPattern: "horizontal pull", equipment: "machine", repRangeMin: 8, repRangeMax: 12, targetRIRSet1: 1, targetRIRSet2: 0, failureRule: "Set 1 ~1 RIR, Set 2 technical failure." }),
  exercise({ name: "Seated Cable Row", category: "compound", primaryMuscle: "back thickness", secondaryMuscles: ["lats", "biceps"], movementPattern: "horizontal pull", equipment: "cable", repRangeMin: 8, repRangeMax: 12, targetRIRSet1: 1, targetRIRSet2: 0, failureRule: "Set 1 ~1 RIR, Set 2 technical failure." }),
  exercise({ name: "Shrugs", category: "isolation", primaryMuscle: "traps", movementPattern: "elevation", equipment: "dumbbell", repRangeMin: 10, repRangeMax: 15, targetRIRSet1: 0, targetRIRSet2: 0, failureRule: "Both sets to technical failure." }),

  exercise({ name: "Hammer Curl", category: "isolation", primaryMuscle: "biceps", secondaryMuscles: ["brachialis"], movementPattern: "elbow flexion", equipment: "dumbbell", repRangeMin: 10, repRangeMax: 12, targetRIRSet1: 0, targetRIRSet2: 0, failureRule: "Both sets to technical failure. Brachialis / arm thickness." }),
  exercise({ name: "EZ Curl", category: "isolation", primaryMuscle: "biceps", movementPattern: "elbow flexion", equipment: "ez bar", repRangeMin: 10, repRangeMax: 12, targetRIRSet1: 0, targetRIRSet2: 0, failureRule: "Both sets to technical failure." }),
  exercise({ name: "Overhead Triceps Extension", category: "isolation", primaryMuscle: "triceps (long head)", movementPattern: "elbow extension", equipment: "cable", repRangeMin: 10, repRangeMax: 15, targetRIRSet1: 0, targetRIRSet2: 0, failureRule: "Both sets to technical failure.", notes: "Main long-head triceps builder — excellent stretch reported. Do not remove or replace." }),
  exercise({ name: "Reverse-Grip Bar Extension", category: "isolation", primaryMuscle: "triceps", movementPattern: "elbow extension", equipment: "cable/bar", repRangeMin: 10, repRangeMax: 15, targetRIRSet1: 0, targetRIRSet2: 0, failureRule: "Both sets to technical failure.", notes: "Added on Specialisation Day to give a second direct triceps isolation movement per week alongside Overhead Triceps Extension on Push Day." }),

  exercise({ name: "Manual Neck Isometrics", category: "isolation", primaryMuscle: "neck", movementPattern: "isometric", equipment: "bodyweight", repRangeMin: null, repRangeMax: null, targetRIRSet1: null, targetRIRSet2: null, failureRule: "3 x 20-30 sec holds.", notes: "Home-based alternative." }),

  // Optional future exercises
  exercise({ name: "Straight Arm Pulldown", category: "isolation", primaryMuscle: "lats", movementPattern: "shoulder extension", equipment: "cable", repRangeMin: 12, repRangeMax: 15, targetRIRSet1: 0, targetRIRSet2: 0, failureRule: "Both sets to technical failure.", active: false, optional: true }),
  exercise({ name: "Cable Fly", category: "isolation", primaryMuscle: "chest", movementPattern: "horizontal adduction", equipment: "cable", repRangeMin: 12, repRangeMax: 15, targetRIRSet1: 0, targetRIRSet2: 0, failureRule: "Both sets to technical failure.", active: false, optional: true }),
  exercise({ name: "Farmer's Carry", category: "compound", primaryMuscle: "traps", secondaryMuscles: ["forearms", "core"], movementPattern: "carry", equipment: "dumbbell", repRangeMin: null, repRangeMax: null, targetRIRSet1: null, targetRIRSet2: null, failureRule: "Timed/distance carry.", active: false, optional: true }),
  exercise({ name: "Trap Bar Hold", category: "isolation", primaryMuscle: "traps", secondaryMuscles: ["forearms"], movementPattern: "isometric carry", equipment: "trap bar", repRangeMin: null, repRangeMax: null, targetRIRSet1: null, targetRIRSet2: null, failureRule: "Timed hold.", active: false, optional: true }),
  exercise({ name: "Triceps Pushdown", category: "isolation", primaryMuscle: "triceps", movementPattern: "elbow extension", equipment: "cable", repRangeMin: 10, repRangeMax: 15, targetRIRSet1: 0, targetRIRSet2: 0, failureRule: "Both sets to technical failure.", active: false, optional: true }),
  exercise({ name: "Incline Curl", category: "isolation", primaryMuscle: "biceps", movementPattern: "elbow flexion", equipment: "dumbbell", repRangeMin: 10, repRangeMax: 12, targetRIRSet1: 0, targetRIRSet2: 0, failureRule: "Both sets to technical failure.", active: false, optional: true }),
  exercise({ name: "Spider Curl", category: "isolation", primaryMuscle: "biceps", movementPattern: "elbow flexion", equipment: "ez bar", repRangeMin: 10, repRangeMax: 12, targetRIRSet1: 0, targetRIRSet2: 0, failureRule: "Both sets to technical failure.", active: false, optional: true }),
  exercise({ name: "Reverse Curl", category: "isolation", primaryMuscle: "forearms", secondaryMuscles: ["biceps"], movementPattern: "elbow flexion", equipment: "ez bar", repRangeMin: 10, repRangeMax: 15, targetRIRSet1: 0, targetRIRSet2: 0, failureRule: "Both sets to technical failure.", active: false, optional: true }),
  exercise({ name: "Seated Calf Raise", category: "isolation", primaryMuscle: "calves", movementPattern: "plantarflexion", equipment: "machine", repRangeMin: 12, repRangeMax: 20, targetRIRSet1: 0, targetRIRSet2: 0, failureRule: "Both sets to technical failure.", active: false, optional: true })
];

function progExercise(name, reps, note) {
  return { id: eid(name), name, repRange: reps, note };
}

// The live 5-day program. Day 3 keeps Overhead Triceps Extension (long-head builder,
// kept for the stretch it gives). Day 5 gains Reverse-Grip Bar Extension as the second
// direct triceps isolation movement of the week; Close Grip Chest Press stays as indirect
// triceps work. This only changes the TEMPLATE for future sessions — it never touches
// exercises already recorded in past workout logs.
export const DEFAULT_TRAINING_PROGRAM = {
  "Day 1 - Upper Width": [
    progExercise("Incline DB Press", "6-10", "Set 1: 1 RIR | Set 2: technical failure"),
    progExercise("Neutral Grip Lat Pulldown", "8-12", "Weighted pull-up replacement"),
    progExercise("Chest Supported Row", "8-12", "Upper back thickness"),
    progExercise("Cable Lateral Raise", "12-15", "Both sets to technical failure"),
    progExercise("Face Pull", "12-15", "Rear delts / shoulder health"),
    progExercise("Hammer Curl", "10-12", "Brachialis / arm thickness")
  ],
  "Day 2 - Lower Mass": [
    progExercise("Hack Squat", "6-10", "Quads / total leg size"),
    progExercise("Romanian Deadlift", "8-10", "Hamstrings / glutes"),
    progExercise("Leg Press", "10-15", "High-output leg mass"),
    progExercise("Leg Curl", "10-15", "Both sets to technical failure"),
    progExercise("Standing Calf Raise", "12-20", "Controlled stretch and squeeze")
  ],
  "Day 3 - Push": [
    progExercise("Smith Incline Press", "6-10", "Upper chest priority"),
    progExercise("Seated DB Shoulder Press", "8-10", "Shoulder mass"),
    progExercise("Machine Chest Press", "8-12", "Safe failure pressing"),
    progExercise("Cable Lateral Raise", "12-15", "Width builder"),
    progExercise("Overhead Triceps Extension", "10-15", "Long-head triceps — main long-head builder, excellent stretch")
  ],
  "Day 4 - Pull": [
    progExercise("Wide Grip Lat Pulldown", "8-12", "Lat width"),
    progExercise("Seated Cable Row", "8-12", "Mid-back thickness"),
    progExercise("Shrugs", "10-15", "Traps"),
    progExercise("Rear Delt Fly", "12-15", "Rear delts"),
    progExercise("EZ Curl", "10-12", "Biceps")
  ],
  "Day 5 - Specialisation": [
    progExercise("Incline DB Press", "8-12", "Upper chest frequency"),
    progExercise("Single Arm Lat Pulldown", "10-12", "Lat isolation"),
    progExercise("Cable Lateral Raise", "12-15", "Side delt priority"),
    progExercise("Close Grip Chest Press", "8-12", "Triceps / pressing power (indirect triceps)"),
    progExercise("Hammer Curl", "10-12", "Arm thickness"),
    progExercise("Reverse-Grip Bar Extension", "10-15", "Second direct triceps isolation movement of the week"),
    progExercise("Manual Neck Isometrics", "3 x 20-30 sec", "Home-based alternative")
  ]
};

export const DEFAULT_SUPPLEMENTS = [
  { id: uidLike("creatine"), supplementName: "Creatine monohydrate", targetDose: "3-5 g/day", timing: "Any time, daily", active: true },
  { id: uidLike("protein"), supplementName: "Whey/casein", targetDose: "As needed to hit protein target", timing: "Any time", active: true },
  { id: uidLike("citrulline"), supplementName: "Citrulline malate", targetDose: "6-8 g", timing: "Pre-workout", active: true },
  { id: uidLike("beta-alanine"), supplementName: "Beta-alanine", targetDose: "3-5 g/day", timing: "Any time, daily", active: true },
  { id: uidLike("magnesium"), supplementName: "Magnesium glycinate", targetDose: "200-350 mg", timing: "Pre-bed", active: true },
  { id: uidLike("glycine"), supplementName: "Glycine", targetDose: "3 g", timing: "Pre-bed", active: true },
  { id: uidLike("vitamin-d"), supplementName: "Vitamin D", targetDose: "As needed", timing: "With a meal", active: false },
  { id: uidLike("omega-3"), supplementName: "Omega-3", targetDose: "Optional", timing: "With a meal", active: false }
];

export const DEFAULT_PRS = [
  { exercise: "Incline DB Press", goal: "40 kg x 8" },
  { exercise: "Seated DB Shoulder Press", goal: "35 kg x 8" },
  { exercise: "Hack Squat", goal: "180 kg x 8-10" },
  { exercise: "Romanian Deadlift", goal: "140-160 kg x 6-8" },
  { exercise: "Wide Grip Lat Pulldown", goal: "Progressive overload target" },
  { exercise: "Chest Supported Row", goal: "Progressive overload target" },
  { exercise: "Cable Lateral Raise", goal: "Progressive overload target" },
  { exercise: "Overhead Triceps Extension", goal: "Progressive overload target" },
  { exercise: "Reverse-Grip Bar Extension", goal: "Progressive overload target" }
].map(p => ({
  id: eid(p.exercise) + "_pr",
  exerciseId: eid(p.exercise),
  exerciseName: p.exercise,
  currentBest: "",
  goal: p.goal,
  dateAchieved: null,
  notes: ""
}));

function uidLike(s) { return `supp_${s}_${(seq++)}`; }

// Muscle-group volume mapping, used by the weekly volume tracker.
export const MUSCLE_GROUPS = [
  "shoulders", "upper chest", "chest general", "lats/back width", "back thickness",
  "biceps", "triceps", "traps", "neck", "quads", "hamstrings/glutes", "calves", "core"
];

export const PRIORITY_MUSCLES = ["shoulders", "upper chest", "lats/back width", "biceps", "triceps", "traps", "neck"];

// Maps EXERCISE_DATABASE primaryMuscle -> volume tracker muscle group bucket.
export const MUSCLE_GROUP_MAP = {
  "quads": "quads",
  "hamstrings": "hamstrings/glutes",
  "glutes": "hamstrings/glutes",
  "calves": "calves",
  "upper chest": "upper chest",
  "chest": "chest general",
  "shoulders": "shoulders",
  "side delts": "shoulders",
  "rear delts": "shoulders",
  "lats": "lats/back width",
  "back thickness": "back thickness",
  "traps": "traps",
  "biceps": "biceps",
  "brachialis": "biceps",
  "triceps": "triceps",
  "triceps (long head)": "triceps",
  "neck": "neck",
  "forearms": "core",
  "core": "core"
};
