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

// Form guidance content, keyed by exercise id. Merged onto EXERCISE_DATABASE entries
// below — additive only, never replaces an existing field on an exercise object.
const EXERCISE_GUIDES = {
  hack_squat: {
    targetMuscleCue: "Quads, glutes secondary",
    setupCues: ["Back fixed against the pad", "Feet in the same position every session"],
    executionCues: ["Descend to the deepest safe range without hips lifting off the pad", "Drive through the midfoot"],
    tempoDescription: "3 second descent, controlled drive up",
    eccentricSeconds: 3, pauseBottomSeconds: 0, concentricSeconds: null, pauseTopSeconds: 0,
    rangeOfMotionStandard: "Deepest safe range without hips lifting off the pad",
    validRepCriteria: ["Depth matches previous sessions", "No bounce out of the bottom", "No aggressive lockout"],
    commonMistakes: ["Cutting depth", "Bouncing out of the bottom", "Knees collapsing inward", "Changing foot position to fake progression"],
    safetyNotes: ["Keep knees tracking with toes", "Stop if depth causes lower-back rounding"],
    progressionCriteria: ["Both sets hit top of rep range", "Same depth as last session", "Form quality 4+"],
    todayFocusCue: "Same depth as last session"
  },
  romanian_deadlift: {
    targetMuscleCue: "Hamstrings and glutes",
    setupCues: ["Soft knees", "Lats tight", "Bar/weights close to the body"],
    executionCues: ["Hinge hips back until hamstrings are fully stretched", "Keep spine neutral, no rounding"],
    tempoDescription: "3-4 second lowering, controlled hip drive up",
    eccentricSeconds: 4, pauseBottomSeconds: 0, concentricSeconds: null, pauseTopSeconds: 0,
    rangeOfMotionStandard: "Hamstrings fully stretched without spinal rounding",
    validRepCriteria: ["Neutral spine throughout", "Hamstrings loaded, not a squat pattern"],
    commonMistakes: ["Bending the knees too much", "Rounding the back", "Letting the weight drift forward"],
    safetyNotes: ["Stop the descent the moment the lower back wants to round"],
    progressionCriteria: ["Both sets hit top of rep range", "Neutral spine maintained", "Form quality 4+"],
    todayFocusCue: "Hamstring stretch, not lower-back fatigue"
  },
  incline_db_press: {
    targetMuscleCue: "Upper chest",
    setupCues: ["Shoulder blades retracted", "Slight arch", "Consistent bench angle"],
    executionCues: ["Lower dumbbells under control", "Elbows 30-60 degrees from torso", "Press up and slightly in"],
    tempoDescription: "2-3 second descent, controlled press",
    eccentricSeconds: 3, pauseBottomSeconds: 0, concentricSeconds: null, pauseTopSeconds: 0,
    rangeOfMotionStandard: "Same depth every rep, no shoulder takeover",
    validRepCriteria: ["Same depth as previous reps", "Stable scapula throughout"],
    commonMistakes: ["Turning it into a shoulder press", "Cutting the depth short", "Bouncing at the bottom"],
    safetyNotes: ["Stop if front-of-shoulder pain appears at the bottom position"],
    progressionCriteria: ["Both sets hit top of rep range", "Stable scapula", "Form quality 4+"],
    todayFocusCue: "Upper chest stretch and press path"
  },
  smith_incline_press: {
    targetMuscleCue: "Upper chest",
    setupCues: ["Consistent bench angle", "Bar path to the upper chest"],
    executionCues: ["Lower under control", "Press without shrugging"],
    tempoDescription: "Controlled 2-3 second descent",
    eccentricSeconds: 3, pauseBottomSeconds: 0, concentricSeconds: null, pauseTopSeconds: 0,
    rangeOfMotionStandard: "Consistent depth, chest stays the prime mover",
    validRepCriteria: ["Chest remains the prime mover", "No shoulder pain", "Consistent depth"],
    commonMistakes: ["Bench angle too steep", "Shoulders dominating the press", "Unstable setup"],
    safetyNotes: ["Reset the bench angle if it drifted from last session"],
    progressionCriteria: ["Both sets hit top of rep range", "Consistent depth", "Form quality 4+"],
    todayFocusCue: "Same bench angle and bar path"
  },
  seated_db_shoulder_press: {
    targetMuscleCue: "Front/side delts",
    setupCues: ["Torso stable", "Elbows slightly forward"],
    executionCues: ["Controlled lower", "Strong press overhead without excessive back arch"],
    tempoDescription: "Controlled lower, strong press",
    eccentricSeconds: null, pauseBottomSeconds: 0, concentricSeconds: null, pauseTopSeconds: 0,
    rangeOfMotionStandard: "Consistent bottom position, no excessive lumbar extension",
    validRepCriteria: ["No bouncing", "No excessive lumbar extension"],
    commonMistakes: ["Flaring too wide", "Arching hard through the lower back", "Inconsistent lowering depth"],
    safetyNotes: ["Stop if lower-back discomfort appears from arching"],
    progressionCriteria: ["Both sets hit top of rep range", "Controlled bottom position", "Form quality 4+"],
    todayFocusCue: "Controlled bottom position"
  },
  machine_chest_press: {
    targetMuscleCue: "Chest, triceps",
    setupCues: ["Seat height consistent", "Scapula stable"],
    executionCues: ["Press through the chest without shoulders rolling forward"],
    tempoDescription: "Controlled eccentric, strong press",
    eccentricSeconds: null, pauseBottomSeconds: 0, concentricSeconds: null, pauseTopSeconds: 0,
    rangeOfMotionStandard: "Controlled bottom position, no partial reps",
    validRepCriteria: ["Controlled bottom", "No shoulder roll"],
    commonMistakes: ["Seat too high or too low", "Shoulders rolling forward", "Partial reps"],
    safetyNotes: ["Recheck seat height matches last session before loading up"],
    progressionCriteria: ["Both sets hit top of rep range", "Stable chest pressure", "Form quality 4+"],
    todayFocusCue: "Stable chest pressure"
  },
  cable_lateral_raise: {
    targetMuscleCue: "Lateral delts",
    setupCues: ["Slight lean if needed", "Cable positioned behind or beside the body"],
    executionCues: ["Lead with the elbow", "Raise in the scapular plane"],
    tempoDescription: "Controlled raise, 2-3 second lowering",
    eccentricSeconds: 3, pauseBottomSeconds: 0, concentricSeconds: null, pauseTopSeconds: 0,
    rangeOfMotionStandard: "Raise in the scapular plane, delt drives the movement",
    validRepCriteria: ["Delt drives the movement", "No swinging", "Traps controlled"],
    commonMistakes: ["Using traps to muscle the weight up", "Swinging the torso", "Going too heavy to keep form"],
    safetyNotes: [],
    progressionCriteria: ["Both sets to technical failure with control", "Form quality 4+"],
    todayFocusCue: "Delt tension over load"
  },
  neutral_grip_lat_pulldown: {
    targetMuscleCue: "Lats",
    setupCues: ["Chest up", "Stable torso"],
    executionCues: ["Pull elbows down toward the ribs"],
    tempoDescription: "Controlled pull, slow return",
    eccentricSeconds: null, pauseBottomSeconds: 0, concentricSeconds: null, pauseTopSeconds: 0,
    rangeOfMotionStandard: "Full stretch at the top, no row-like swing",
    validRepCriteria: ["Lats initiate the pull", "Full stretch at the top", "No row-like swing"],
    commonMistakes: ["Leaning too far back", "Pulling with the biceps", "Cutting the stretch short"],
    safetyNotes: [],
    progressionCriteria: ["Both sets hit top of rep range", "Full stretch maintained", "Form quality 4+"],
    todayFocusCue: "Elbows to ribs"
  },
  wide_grip_lat_pulldown: {
    targetMuscleCue: "Upper lats, back width",
    setupCues: ["Wide but comfortable grip", "Chest tall"],
    executionCues: ["Depress the scapula first", "Pull to the upper chest"],
    tempoDescription: "Controlled pull and return",
    eccentricSeconds: null, pauseBottomSeconds: 0, concentricSeconds: null, pauseTopSeconds: 0,
    rangeOfMotionStandard: "Controlled, no excessive torso swing",
    validRepCriteria: ["Controlled throughout", "No excessive torso swing"],
    commonMistakes: ["Pulling behind the neck", "Jerking the weight down", "Using momentum"],
    safetyNotes: ["Never pull the bar behind the neck"],
    progressionCriteria: ["Both sets hit top of rep range", "Form quality 4+"],
    todayFocusCue: "Stretch at the top"
  },
  single_arm_lat_pulldown: {
    targetMuscleCue: "Lats",
    setupCues: ["Reach high for a full lat stretch"],
    executionCues: ["Pull the elbow toward the hip", "Slight controlled torso rotation is fine"],
    tempoDescription: "Controlled stretch and pull",
    eccentricSeconds: null, pauseBottomSeconds: 0, concentricSeconds: null, pauseTopSeconds: 0,
    rangeOfMotionStandard: "Clear lat stretch and contraction",
    validRepCriteria: ["Lat stretch and contraction both clear"],
    commonMistakes: ["Turning it into a bicep curl", "Rushing the return"],
    safetyNotes: [],
    progressionCriteria: ["Both sets to technical failure", "Form quality 4+"],
    todayFocusCue: "Elbow to hip"
  },
  chest_supported_row: {
    targetMuscleCue: "Mid-back, lats secondary",
    setupCues: ["Chest fixed on the pad"],
    executionCues: ["Pull elbows back", "Squeeze the mid-back"],
    tempoDescription: "Controlled pull, controlled eccentric",
    eccentricSeconds: null, pauseBottomSeconds: 0, concentricSeconds: null, pauseTopSeconds: 0,
    rangeOfMotionStandard: "Chest stays on the pad the entire set",
    validRepCriteria: ["Chest stays on the pad", "No bouncing"],
    commonMistakes: ["Shrugging", "Lifting the chest off the pad", "Using momentum"],
    safetyNotes: [],
    progressionCriteria: ["Both sets hit top of rep range", "Chest stayed on pad", "Form quality 4+"],
    todayFocusCue: "Chest glued to the pad"
  },
  seated_cable_row: {
    targetMuscleCue: "Back thickness",
    setupCues: ["Neutral spine", "Chest tall"],
    executionCues: ["Pull elbows back without excessive torso rocking"],
    tempoDescription: "Controlled row and stretch",
    eccentricSeconds: null, pauseBottomSeconds: 0, concentricSeconds: null, pauseTopSeconds: 0,
    rangeOfMotionStandard: "Full controlled stretch forward, minimal torso movement",
    validRepCriteria: ["Minimal torso movement", "Full controlled stretch"],
    commonMistakes: ["Rocking back heavily", "Shrugging", "Short reps"],
    safetyNotes: [],
    progressionCriteria: ["Both sets hit top of rep range", "Form quality 4+"],
    todayFocusCue: "Controlled stretch forward"
  },
  face_pull: {
    targetMuscleCue: "Rear delts, upper back",
    setupCues: ["Cable set around face height"],
    executionCues: ["Pull toward the upper face", "Elbows high", "Rotate slightly outward"],
    tempoDescription: "Controlled pull and return",
    eccentricSeconds: null, pauseBottomSeconds: 0, concentricSeconds: null, pauseTopSeconds: 0,
    rangeOfMotionStandard: "Rear delts/upper back doing the work, no lower-back lean",
    validRepCriteria: ["Rear delts/upper back working", "No lower-back lean"],
    commonMistakes: ["Pulling too low", "Leaning back", "Turning it into a row"],
    safetyNotes: [],
    progressionCriteria: ["Both sets to technical failure", "Form quality 4+"],
    todayFocusCue: "Elbows high"
  },
  rear_delt_fly: {
    targetMuscleCue: "Rear delts",
    setupCues: ["Slight elbow bend"],
    executionCues: ["Move from the rear delts, not the traps"],
    tempoDescription: "Controlled both ways",
    eccentricSeconds: null, pauseBottomSeconds: 0, concentricSeconds: null, pauseTopSeconds: 0,
    rangeOfMotionStandard: "Rear delt tension throughout, no swinging",
    validRepCriteria: ["No swinging", "Rear delt tension"],
    commonMistakes: ["Too much weight", "Shrugging", "Using momentum"],
    safetyNotes: [],
    progressionCriteria: ["Both sets to technical failure", "Form quality 4+"],
    todayFocusCue: "Rear delt isolation"
  },
  shrugs: {
    targetMuscleCue: "Traps",
    setupCues: ["Weights stable", "Torso upright"],
    executionCues: ["Elevate shoulders straight up", "Pause", "Lower under control"],
    tempoDescription: "Raise, pause, slow lower",
    eccentricSeconds: null, pauseBottomSeconds: 0, concentricSeconds: null, pauseTopSeconds: 1,
    rangeOfMotionStandard: "Straight up elevation, pause at the top",
    validRepCriteria: ["No leg drive", "No shoulder rolling"],
    commonMistakes: ["Rolling the shoulders", "Bouncing", "Using the legs to help"],
    safetyNotes: [],
    progressionCriteria: ["Both sets to technical failure", "Form quality 4+"],
    todayFocusCue: "Pause at the top"
  },
  hammer_curl: {
    targetMuscleCue: "Brachialis, biceps",
    setupCues: ["Elbows tucked", "Wrists neutral", "Chest tall"],
    executionCues: ["Curl without swinging", "Lower slowly"],
    tempoDescription: "2 second curl, brief squeeze, 4 second lowering",
    eccentricSeconds: 4, pauseBottomSeconds: 0, concentricSeconds: 2, pauseTopSeconds: 1,
    rangeOfMotionStandard: "Full controlled lowering every rep",
    validRepCriteria: ["No hip swing", "No torso lean-back", "Full controlled lowering"],
    commonMistakes: ["Swinging", "Elbows drifting forward", "Dropping the eccentric"],
    safetyNotes: [],
    progressionCriteria: ["Both sets to technical failure", "Form quality 4+"],
    todayFocusCue: "Slow 4 second lowering"
  },
  ez_curl: {
    targetMuscleCue: "Biceps",
    setupCues: ["Elbows tucked", "Shoulders down", "Wrists comfortable on the bar"],
    executionCues: ["Curl by bending the elbows", "Squeeze at the top", "Lower slowly"],
    tempoDescription: "2 second curl, brief squeeze, 4 second lowering",
    eccentricSeconds: 4, pauseBottomSeconds: 0, concentricSeconds: 2, pauseTopSeconds: 1,
    rangeOfMotionStandard: "Full lowering every rep",
    validRepCriteria: ["No torso swing", "Elbows controlled", "Full lowering"],
    commonMistakes: ["Ego loading", "Leaning back", "Cutting the eccentric short"],
    safetyNotes: [],
    progressionCriteria: ["Both sets to technical failure", "Form quality 4+"],
    todayFocusCue: "Biceps squeeze and slow negative"
  },
  overhead_triceps_extension: {
    targetMuscleCue: "Triceps, long head",
    setupCues: ["Elbows forward/up", "Upper arms stable"],
    executionCues: ["Lower behind the head for a deep stretch", "Extend without flaring wildly"],
    tempoDescription: "Controlled lowering into a deep stretch, strong extension",
    eccentricSeconds: null, pauseBottomSeconds: 0, concentricSeconds: null, pauseTopSeconds: 0,
    rangeOfMotionStandard: "Deep stretch behind the head every rep",
    validRepCriteria: ["Stretch achieved", "Upper arms stable", "No press-like movement"],
    commonMistakes: ["Elbows flaring out", "Cutting the stretch short", "Turning it into a press"],
    safetyNotes: [],
    progressionCriteria: ["Both sets to technical failure", "Deep stretch maintained", "Form quality 4+"],
    todayFocusCue: "Deep long-head stretch"
  },
  reverse_grip_bar_extension: {
    targetMuscleCue: "Triceps",
    setupCues: ["Elbows pinned", "Wrists controlled"],
    executionCues: ["Extend down smoothly", "Squeeze triceps at the bottom"],
    tempoDescription: "Controlled extension, slow return",
    eccentricSeconds: null, pauseBottomSeconds: 1, concentricSeconds: null, pauseTopSeconds: 0,
    rangeOfMotionStandard: "Full contraction at the bottom",
    validRepCriteria: ["Full contraction", "No shoulder movement"],
    commonMistakes: ["Elbows drifting", "Shoulders moving", "Wrists collapsing"],
    safetyNotes: [],
    progressionCriteria: ["Both sets to technical failure", "Form quality 4+"],
    todayFocusCue: "Elbow pin and contraction"
  },
  close_grip_chest_press: {
    targetMuscleCue: "Chest, triceps",
    setupCues: ["Grip/seat consistent with last session"],
    executionCues: ["Press with elbows controlled", "Avoid shoulder roll"],
    tempoDescription: "Controlled descent and press",
    eccentricSeconds: null, pauseBottomSeconds: 0, concentricSeconds: null, pauseTopSeconds: 0,
    rangeOfMotionStandard: "Controlled full range, no partial reps",
    validRepCriteria: ["Controlled full range", "No shoulder discomfort"],
    commonMistakes: ["Grip too narrow", "Shoulder dominance", "Partial reps"],
    safetyNotes: ["Stop if shoulder discomfort appears"],
    progressionCriteria: ["Both sets hit top of rep range", "Form quality 4+"],
    todayFocusCue: "Triceps/chest lockout control"
  },
  leg_press: {
    targetMuscleCue: "Quads, glutes",
    setupCues: ["Feet in the same position every session"],
    executionCues: ["Knees track with the toes", "Lower under control"],
    tempoDescription: "Controlled descent, strong press",
    eccentricSeconds: null, pauseBottomSeconds: 0, concentricSeconds: null, pauseTopSeconds: 0,
    rangeOfMotionStandard: "Consistent depth, no hard knee lockout",
    validRepCriteria: ["No hip tuck", "No bouncing", "No hard knee lockout"],
    commonMistakes: ["Shallow reps", "Bouncing out of the bottom", "Knees caving in"],
    safetyNotes: ["Never fully lock out and relax the knees under load"],
    progressionCriteria: ["Both sets hit top of rep range", "Consistent depth", "Form quality 4+"],
    todayFocusCue: "Consistent depth"
  },
  leg_curl: {
    targetMuscleCue: "Hamstrings",
    setupCues: ["Hips pinned to the pad"],
    executionCues: ["Curl fully", "Squeeze the hamstrings"],
    tempoDescription: "Curl smoothly, slow eccentric",
    eccentricSeconds: null, pauseBottomSeconds: 0, concentricSeconds: null, pauseTopSeconds: 0,
    rangeOfMotionStandard: "Hips stay down, controlled return",
    validRepCriteria: ["Hips stay down", "Controlled return"],
    commonMistakes: ["Hips lifting off the pad", "Jerking the weight", "Short range of motion"],
    safetyNotes: [],
    progressionCriteria: ["Both sets to technical failure", "Form quality 4+"],
    todayFocusCue: "Hamstring squeeze"
  },
  standing_calf_raise: {
    targetMuscleCue: "Calves",
    setupCues: ["Feet stable"],
    executionCues: ["Full stretch at the bottom", "Full raise at the top"],
    tempoDescription: "Pause stretched at the bottom, raise, pause at the top, controlled lower",
    eccentricSeconds: null, pauseBottomSeconds: 1, concentricSeconds: null, pauseTopSeconds: 1,
    rangeOfMotionStandard: "Full stretch and full raise every rep",
    validRepCriteria: ["No bouncing", "Full range of motion"],
    commonMistakes: ["Partial reps", "Bouncing", "Rushing the tempo"],
    safetyNotes: [],
    progressionCriteria: ["Both sets to technical failure", "Full range maintained", "Form quality 4+"],
    todayFocusCue: "Pause at the stretch and the top"
  },
  manual_neck_isometrics: {
    targetMuscleCue: "Neck",
    setupCues: ["Neutral spine", "Apply gentle, even pressure"],
    executionCues: ["Resist the pressure without jerking"],
    tempoDescription: "20-30 second controlled holds",
    eccentricSeconds: null, pauseBottomSeconds: null, concentricSeconds: null, pauseTopSeconds: null,
    rangeOfMotionStandard: "Isometric — no movement, just controlled resistance",
    validRepCriteria: ["No pain, dizziness, nerve symptoms, or headache during or after"],
    commonMistakes: ["Applying too much pressure", "Jerking into position", "Poor neck alignment"],
    safetyNotes: ["Stop immediately if pain, dizziness, nerve symptoms, or headache occur"],
    progressionCriteria: ["Hold duration maintained with no symptoms"],
    todayFocusCue: "Controlled tension only"
  }
};

// Merge guidance onto the matching database entries — additive only, never overwrites
// a field the exercise() factory already set (e.g. name, category, repRangeMin).
EXERCISE_DATABASE.forEach(ex => {
  const guide = EXERCISE_GUIDES[ex.id.replace(/^ex_/, "")];
  if (guide) Object.assign(ex, guide);
});

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
