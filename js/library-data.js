// Static content for the Project Reacher Knowledge Library — a searchable,
// beginner-friendly sports-science glossary layered on top of the existing app.
// Single source of truth for Library articles, tooltips and quick explanations.
// Read-only reference data; nothing here touches user-entered save data.

export const LIBRARY_CATEGORIES = [
  "Training Principles",
  "Exercise Technique",
  "Hypertrophy Science",
  "Progression & Performance",
  "Nutrition Basics",
  "Macros",
  "Micronutrients",
  "Meal Timing",
  "Recovery",
  "Sleep & Fatigue",
  "Stimulants",
  "Supplements",
  "Body Composition",
  "Measurements & Ratios",
  "Mini-Cuts / Fat Loss",
  "High-Responder Tracking",
  "App Metrics & Scores",
  "Acronyms & Definitions",
  "Injury & Safety Basics",
  "Project Reacher System"
];

export const LEARNING_PATHS = [
  {
    id: "beginner-start-here",
    title: "Beginner: Start Here",
    slugs: ["what-is-project-reacher", "hypertrophy", "progressive-overload", "rpe", "rir",
      "technical-muscular-form-failure", "calories-energy-balance", "protein", "carbohydrates",
      "recovery", "seven-day-average", "weekly-verdicts"]
  },
  {
    id: "training-execution",
    title: "Training Execution Path",
    slugs: ["valid-rep-standard", "form-quality-controls-progression", "range-of-motion",
      "tempo-eccentric-concentric-isometric", "mind-muscle-connection",
      "technical-muscular-form-failure", "progression-methods", "logbook-progression"]
  },
  {
    id: "nutrition-path",
    title: "Nutrition Path",
    slugs: ["calories-energy-balance", "lean-bulk-dirty-bulk", "protein", "carbohydrates", "fats",
      "fibre", "meal-timing", "macro-tracking-ai-estimation", "confidence-score"]
  },
  {
    id: "recovery-path",
    title: "Recovery Path",
    slugs: ["recovery", "fixed-sleep-constraint", "fatigue", "soreness-doms", "readiness-rhr",
      "stimulants-tolerance", "deload-readiness", "recovery-resilience-score"]
  },
  {
    id: "physique-path",
    title: "Project Reacher Physique Path",
    slugs: ["what-physique-are-we-building", "shoulder-to-waist-ratio", "why-these-muscle-groups",
      "why-waist-control-matters", "waist-control-score", "lean-gain-quality-score"]
  }
];

// Fills in consistent optional-field defaults so each authored entry below only
// has to specify what's actually different about it.
function E(o) {
  return {
    slug: o.slug,
    title: o.title,
    acronym: o.acronym || null,
    category: o.category,
    difficulty: o.difficulty || "Basic",
    instantMeaning: o.instantMeaning,
    shortDefinition: o.shortDefinition,
    beginnerExplanation: o.beginnerExplanation,
    sportsScienceExplanation: o.sportsScienceExplanation || null,
    whyItMatters: o.whyItMatters,
    projectReacherApplication: o.projectReacherApplication,
    practicalAction: o.practicalAction || [],
    commonMistakes: o.commonMistakes || [],
    relatedTerms: o.relatedTerms || [],
    tags: o.tags || [],
    synonyms: o.synonyms || [],
    readingTimeMin: o.readingTimeMin || 1,
    cautionNuance: o.cautionNuance || null,
    quickExplain: o.quickExplain || o.shortDefinition,
    tooltipVersion: o.tooltipVersion || o.instantMeaning,
    evidenceTier: o.evidenceTier || null,
    sourceNotes: o.sourceNotes || []
  };
}

export const LIBRARY_ENTRIES = [
  // ============ HYPERTROPHY SCIENCE ============
  E({
    slug: "hypertrophy", title: "Hypertrophy", category: "Hypertrophy Science", difficulty: "Basic",
    instantMeaning: "Muscle growth.",
    shortDefinition: "Hypertrophy is the process of a muscle getting bigger over time in response to training stress.",
    beginnerExplanation: "Hypertrophy means making a muscle bigger over time through hard training, enough food, and enough recovery.",
    sportsScienceExplanation: "Growth is driven mainly by mechanical tension from hard sets taken close to failure, accumulated across enough weekly volume, repeated consistently for months.",
    whyItMatters: "It's the entire point of the training side of Project Reacher — everything else (RPE, ROM, volume, protein) exists to make hypertrophy happen reliably.",
    projectReacherApplication: "The goal isn't just to gain scale weight — it's to grow shoulders, upper chest, lats, arms, traps and legs while keeping waist gain controlled.",
    practicalAction: ["Train each muscle with enough hard sets weekly.", "Progress load or reps over time.", "Eat and sleep enough to recover from it."],
    commonMistakes: ["Chasing soreness or pump instead of progressive overload.", "Changing exercises too often to build real trend data."],
    relatedTerms: ["progressive-overload", "mechanical-tension", "training-volume-effective-reps"],
    tags: ["muscle growth", "hypertrophy", "training goal"], synonyms: ["muscle growth", "muscle building"],
    readingTimeMin: 2, evidenceTier: "Consensus"
  }),
  E({
    slug: "mechanical-tension", title: "Mechanical Tension", category: "Hypertrophy Science", difficulty: "Intermediate",
    instantMeaning: "Force on the muscle.",
    shortDefinition: "Mechanical tension is the strain placed on muscle fibres while lifting a challenging load through a full range of motion.",
    beginnerExplanation: "Mechanical tension is the hard strain placed on muscle fibres during challenging reps — it's the main trigger your body reads as 'grow this muscle.'",
    sportsScienceExplanation: "Tension is highest when a muscle is loaded near its length-tension optimum under control, particularly in the lengthened position, for reps taken close to failure.",
    whyItMatters: "It's currently understood to be the primary driver of hypertrophy — more important than how sore you get or how big the pump feels.",
    projectReacherApplication: "Stable lifts, full ROM and genuinely hard reps create more useful tension than sloppy momentum reps or ego-loading with a shortened range.",
    practicalAction: ["Prioritise control and full range over adding weight sloppily.", "Take working sets genuinely close to failure."],
    commonMistakes: ["Bouncing weight or using momentum to move more load.", "Cutting range short to lift heavier."],
    relatedTerms: ["hypertrophy", "range-of-motion", "valid-rep-standard"],
    tags: ["mechanical tension", "muscle fibres"], readingTimeMin: 2, evidenceTier: "Good"
  }),
  E({
    slug: "pump-metabolic-stress-muscle-damage", title: "Pump, Metabolic Stress and Muscle Damage", category: "Hypertrophy Science", difficulty: "Intermediate",
    instantMeaning: "Secondary growth signals — useful, not the main driver.",
    shortDefinition: "The pump (blood/metabolite buildup), metabolic stress and muscle damage (micro-tears) are secondary contributors to hypertrophy, well behind mechanical tension.",
    beginnerExplanation: "A big pump or being sore afterwards feels like progress, but neither reliably means the muscle grew — they're side effects, not proof.",
    sportsScienceExplanation: "Metabolic stress and muscle damage may contribute modestly to hypertrophy independent of tension, but chasing them directly (e.g. high-rep burnout sets, deliberately provoking soreness) is a weak and fatiguing strategy on its own.",
    whyItMatters: "Novices often judge a session by soreness or pump instead of by whether load/reps/form actually progressed — that's the wrong feedback signal.",
    projectReacherApplication: "Use RPE, RIR, reps and form quality to judge a set — not how sore you are the next day or how big the muscle looked mid-set.",
    practicalAction: ["Judge sessions by logged performance trends, not by soreness."],
    commonMistakes: ["Assuming no soreness means no progress.", "Assuming a big pump means the set was effective."],
    relatedTerms: ["mechanical-tension", "soreness-doms"],
    tags: ["pump", "DOMS", "metabolic stress", "muscle damage"], synonyms: ["pump", "muscle damage"],
    readingTimeMin: 2, evidenceTier: "Mixed"
  }),
  E({
    slug: "time-under-tension", title: "Time Under Tension", acronym: "TUT", category: "Hypertrophy Science", difficulty: "Intermediate",
    instantMeaning: "Total time a muscle is under load during a set.",
    shortDefinition: "Time under tension is the cumulative duration a muscle spends working during a set, shaped by rep count and tempo.",
    beginnerExplanation: "It's simply how long the muscle is working across a set — more reps or slower tempo both increase it.",
    whyItMatters: "It's a useful lens for understanding tempo and rep range, but it's a byproduct of good execution, not a target to chase on its own.",
    projectReacherApplication: "Controlled tempo through Project Reacher's rep ranges naturally produces reasonable time under tension — no need to count seconds manually.",
    practicalAction: ["Control tempo rather than rushing reps to hit a number."],
    commonMistakes: ["Deliberately slowing every rep to an extreme, sacrificing load and total volume."],
    relatedTerms: ["tempo-eccentric-concentric-isometric"], tags: ["TUT", "tempo"], readingTimeMin: 1, evidenceTier: "Mixed"
  }),
  E({
    slug: "mind-muscle-connection", title: "Mind-Muscle Connection", acronym: "MMC", category: "Hypertrophy Science", difficulty: "Basic",
    instantMeaning: "Feeling the target muscle work.",
    shortDefinition: "Mind-muscle connection is deliberately focusing on and feeling the target muscle doing the work during a rep.",
    beginnerExplanation: "It's the difference between just moving the weight and actually feeling the intended muscle doing the job.",
    whyItMatters: "Good mind-muscle connection usually means better exercise execution and more consistent target-muscle loading, which supports real hypertrophy.",
    projectReacherApplication: "Project Reacher logs a Target Muscle Connection score per exercise so you can flag when a lift stops feeling like it's hitting the right area.",
    practicalAction: ["Slow down and consciously feel the target muscle on isolation work.", "Reduce load slightly if you can't feel the target muscle working."],
    commonMistakes: ["Using so much weight that other muscles or momentum take over the rep."],
    relatedTerms: ["target-muscle-loading", "mechanical-tension"], tags: ["mind-muscle connection", "target muscle"],
    readingTimeMin: 1, evidenceTier: "Good"
  }),

  // ============ PROGRESSION & PERFORMANCE ============
  E({
    slug: "progressive-overload", title: "Progressive Overload", category: "Progression & Performance", difficulty: "Basic",
    instantMeaning: "Gradually doing more over time.",
    shortDefinition: "Progressive overload means gradually increasing the demand placed on a muscle over time — via load, reps, or quality of execution.",
    beginnerExplanation: "You must give the muscle a slightly harder challenge over time, or it has no reason to keep adapting.",
    whyItMatters: "Without it, training stalls — the body only adapts to a demand it hasn't already met.",
    projectReacherApplication: "More weight only counts as real progress if form, ROM and target-muscle loading stayed consistent — the app should not celebrate a heavier but sloppier rep.",
    practicalAction: ["Add a small amount of load or reps once you consistently hit the top of the rep range with good form."],
    commonMistakes: ["Adding weight while range of motion or form quietly gets worse.", "Chasing weekly increases even when recovery or form doesn't support it."],
    relatedTerms: ["hypertrophy", "progression-methods", "form-quality-controls-progression"],
    tags: ["progressive overload", "progression"], readingTimeMin: 2, evidenceTier: "Consensus"
  }),
  E({
    slug: "rpe", title: "RPE", acronym: "Rate of Perceived Exertion", category: "Progression & Performance", difficulty: "Basic",
    instantMeaning: "How hard the set felt.",
    shortDefinition: "RPE is a 1–10 rating of how hard a set felt, based on how close you were to failure.",
    beginnerExplanation: "RPE 10 means no clean reps left. RPE 9 means about one clean rep left. RPE 8 means about two clean reps left.",
    whyItMatters: "It tells the app — and you — whether a set was actually hard enough to drive progress, independent of the exact weight on the bar.",
    projectReacherApplication: "Compound Set 1 is usually around RPE 9; Set 2 is usually RPE 10 / technical failure. Logging RPE honestly is what lets progression recommendations be trusted.",
    practicalAction: ["Rate RPE immediately after the set, before you second-guess it.", "Be honest even when it's a low number — it's diagnostic, not a grade."],
    commonMistakes: ["Always logging RPE 9-10 regardless of how the set actually felt.", "Confusing RPE with how tired you feel overall rather than that specific set."],
    relatedTerms: ["rir", "technical-muscular-form-failure"], tags: ["RPE", "exertion", "effort"],
    readingTimeMin: 2, evidenceTier: "Good"
  }),
  E({
    slug: "rir", title: "RIR", acronym: "Reps in Reserve", category: "Progression & Performance", difficulty: "Basic",
    instantMeaning: "Clean reps left in the tank.",
    shortDefinition: "RIR is the number of additional clean reps you believe you could have completed before failure.",
    beginnerExplanation: "0 RIR means no clean reps left. 1 RIR means one clean rep left. 2 RIR means two clean reps left.",
    whyItMatters: "It's the flip side of RPE and helps the app judge whether a set was hard enough without needing you to train to failure every time.",
    projectReacherApplication: "RIR helps the app know whether a set was hard enough to count as a real working set, without becoming reckless about pushing every set to failure.",
    practicalAction: ["Log RIR straight after the set while it's fresh in memory."],
    commonMistakes: ["Underestimating RIR out of caution, which makes the app under-recommend progression."],
    relatedTerms: ["rpe", "technical-muscular-form-failure"], tags: ["RIR", "reps in reserve"],
    readingTimeMin: 2, evidenceTier: "Good"
  }),
  E({
    slug: "technical-muscular-form-failure", title: "Technical Failure vs Muscular Failure vs Form Failure", category: "Progression & Performance", difficulty: "Intermediate",
    instantMeaning: "Different ways a set can end.",
    shortDefinition: "Technical failure is the point a rep can no longer be completed with valid form; muscular failure is the point the muscle simply can't produce more force; form failure is when technique breaks down before either of those.",
    beginnerExplanation: "Technical failure = can't do another clean rep. Muscular failure = the muscle physically can't move the weight at all. Form failure = technique broke down and the rep no longer counts, even if you 'moved' the weight.",
    whyItMatters: "Only reps up to technical failure should count toward progression — grinding past that with broken form adds fatigue without adding useful stimulus.",
    projectReacherApplication: "Project Reacher's failure rules per exercise (e.g. 'Set 2 to technical failure') are written this way deliberately — the app should stop counting reps once form breaks, not once the weight physically stops moving.",
    practicalAction: ["Stop the set at technical failure, not at all-out muscular failure.", "If form is breaking down early, that's form failure — reduce load next session."],
    commonMistakes: ["Grinding out ugly reps past technical failure and counting them.", "Confusing form failure (technique problem) with muscular failure (genuine capacity limit)."],
    relatedTerms: ["rpe", "rir", "valid-rep-standard"], tags: ["failure", "technical failure", "muscular failure", "form failure"],
    synonyms: ["muscular failure", "form failure", "technical failure"], readingTimeMin: 3, evidenceTier: "Good"
  }),
  E({
    slug: "progression-methods", title: "Progression Methods: Load, Rep and Double Progression", category: "Progression & Performance", difficulty: "Intermediate",
    instantMeaning: "Different ways to make a lift progressively harder.",
    shortDefinition: "Load progression adds weight; rep progression adds reps at the same weight; double progression alternates — build up reps to the top of the range, then add weight and drop back to the bottom of the range.",
    beginnerExplanation: "Double progression is the simplest system to follow: at a given weight, keep adding reps until you hit the top of the target rep range with good form, then add a small amount of weight and start climbing the rep range again.",
    whyItMatters: "It gives clear, unambiguous rules for when to add weight instead of guessing, which is exactly what a logbook-based app needs.",
    projectReacherApplication: "This is the logic behind Project Reacher's progression recommendation on each exercise card — hit the top of the rep range on both sets with good form, and the app suggests a load increase.",
    practicalAction: ["Use double progression as the default rule for most compound and isolation work."],
    commonMistakes: ["Adding weight before consistently hitting the top of the rep range."],
    relatedTerms: ["progressive-overload", "logbook-progression"], tags: ["double progression", "load progression", "rep progression"],
    synonyms: ["load progression", "rep progression", "double progression"], readingTimeMin: 2, evidenceTier: "Good"
  }),
  E({
    slug: "logbook-progression", title: "Logbook Progression", category: "Progression & Performance", difficulty: "Intermediate",
    instantMeaning: "Deciding today's numbers from last time's logged numbers.",
    shortDefinition: "Logbook progression means using your previously logged sets — not memory or guesswork — to decide what to aim for this session.",
    beginnerExplanation: "Instead of guessing what weight to use, you look at exactly what you did last time and try to beat it in a defined way (usually one more rep, or the same reps with better form).",
    whyItMatters: "Guesswork drifts. A logbook keeps progression honest and comparable week to week.",
    projectReacherApplication: "Every exercise card in the Train tab shows the last logged session so you can chase a specific, comparable target instead of an arbitrary number.",
    practicalAction: ["Check the last logged session for an exercise before choosing today's working weight."],
    commonMistakes: ["Training 'by feel' every session with no reference point, so progress can't be judged."],
    relatedTerms: ["progression-methods", "progressive-overload"], tags: ["logbook", "progression"], readingTimeMin: 1, evidenceTier: "Implementation"
  }),
  E({
    slug: "adaptation-overreaching-deload-plateau", title: "Adaptation, Overreaching, Deload and Plateau", category: "Progression & Performance", difficulty: "Advanced",
    instantMeaning: "How the body responds to training stress over time.",
    shortDefinition: "Adaptation is the body getting better in response to training stress; overreaching is short-term excess fatigue from too much stress without enough recovery; a deload is a deliberate reduced-load period to let fatigue dissipate; a plateau is a stretch of training with no measurable progress.",
    beginnerExplanation: "Training works by stressing the body slightly beyond what it's used to, then recovering into a stronger state. Push too hard for too long without recovery and performance drops (overreaching); a short easier week (deload) can fix that; if progress stalls for weeks despite good execution, that's a plateau worth investigating.",
    whyItMatters: "Not every stall means 'train harder' — sometimes it means the opposite, or it means a variable outside training (sleep, calories) is the actual bottleneck.",
    projectReacherApplication: "If Set 2 performance keeps dropping across sessions despite consistent effort, that's a signal to check recovery data and consider a deload rather than pushing volume further.",
    practicalAction: ["Track performance trend over several weeks, not single sessions, before deciding you're plateaued.", "Consider a deload if drop-off is consistent across multiple exercises."],
    commonMistakes: ["Treating every bad session as a plateau.", "Adding more volume as the default fix for a stall, when fatigue is the actual cause."],
    relatedTerms: ["deload-readiness", "deload-readiness"], tags: ["plateau", "deload", "overreaching", "adaptation"],
    synonyms: ["overreaching", "deload", "plateau", "adaptation"], readingTimeMin: 3, evidenceTier: "Good"
  }),
  E({
    slug: "periodisation-meso-microcycle", title: "Periodisation, Mesocycle and Microcycle", category: "Progression & Performance", difficulty: "Advanced",
    instantMeaning: "Structured planning of training over time.",
    shortDefinition: "Periodisation is the deliberate planning of training variables over time; a mesocycle is a multi-week training block (often 4–8 weeks); a microcycle is typically one training week within it.",
    beginnerExplanation: "Rather than training randomly, you plan in blocks — a few weeks of a consistent approach (mesocycle), made up of individual training weeks (microcycles), before adjusting the plan.",
    whyItMatters: "It gives structure to when to push, when to hold steady and when to deload, instead of reacting week to week with no plan.",
    projectReacherApplication: "A lean-bulk phase in Project Reacher (e.g. 'Lean Bulk 1') functions as a mesocycle — a sustained multi-week block reviewed and adjusted at weekly (microcycle) and monthly checkpoints.",
    practicalAction: ["Think in multi-week blocks rather than judging progress from any single session."],
    commonMistakes: ["Changing the whole program every week based on one good or bad session."],
    relatedTerms: ["adaptation-overreaching-deload-plateau"], tags: ["periodisation", "mesocycle", "microcycle"],
    synonyms: ["mesocycle", "microcycle"], readingTimeMin: 2, evidenceTier: "Good"
  }),

  // ============ TRAINING PRINCIPLES ============
  E({
    slug: "training-volume-effective-reps", title: "Training Volume, Effective Reps and Junk Volume", category: "Training Principles", difficulty: "Intermediate",
    instantMeaning: "How many hard sets a muscle gets, and whether they actually count.",
    shortDefinition: "Training volume is the total hard sets performed for a muscle group over a period, usually a week; effective reps are the reps close enough to failure to drive growth; junk volume is sets/reps too far from failure to meaningfully contribute.",
    beginnerExplanation: "Not every set counts equally. A set stopped 5+ reps short of failure adds fatigue with little growth benefit — that's junk volume. The reps near the end of a hard set are the ones doing most of the work.",
    whyItMatters: "More sets isn't automatically better if they aren't hard enough — quality of effort matters as much as quantity of sets.",
    projectReacherApplication: "Project Reacher's two-hard-working-sets structure is designed to maximise effective reps per exercise rather than padding volume with easy sets.",
    practicalAction: ["Prioritise finishing every working set close to the target RPE/RIR over adding more sets."],
    commonMistakes: ["Adding extra sets that are stopped far from failure just to feel like you did more."],
    relatedTerms: ["rpe", "why-two-hard-working-sets"], tags: ["volume", "effective reps", "junk volume", "SFR"],
    synonyms: ["effective reps", "junk volume", "stimulus to fatigue ratio"], readingTimeMin: 2, evidenceTier: "Good"
  }),
  E({
    slug: "frequency", title: "Frequency", category: "Training Principles", difficulty: "Basic",
    instantMeaning: "How often a muscle is trained per week.",
    shortDefinition: "Training frequency is how many times per week a given muscle group is trained.",
    beginnerExplanation: "Hitting a muscle twice a week generally allows more total quality volume than hitting it once, without either session becoming excessive.",
    whyItMatters: "Frequency interacts with volume and recovery — it's a lever for fitting enough hard sets in without any single session becoming unmanageable.",
    projectReacherApplication: "The weekly training split spreads pushing, pulling and leg work across multiple sessions so each muscle gets repeated quality stimulus.",
    practicalAction: ["Judge frequency by whether you can still train each muscle with good form and effort at each session, not just by hitting a number."],
    commonMistakes: ["Chasing high frequency while recovery (sleep, food) can't support it, leading to declining set quality."],
    relatedTerms: ["training-volume-effective-reps"], tags: ["frequency"], readingTimeMin: 1, evidenceTier: "Good"
  }),
  E({
    slug: "working-warmup-hard-sets", title: "Warm-Up Sets vs Working Sets vs Hard Sets", category: "Training Principles", difficulty: "Basic",
    instantMeaning: "Not every set on a lift is the same kind of set.",
    shortDefinition: "Warm-up sets prepare the joints/muscles and rehearse the movement at light load; working sets are the sets logged toward the exercise's target; hard sets are working sets taken close enough to failure to count as effective volume.",
    beginnerExplanation: "Warm-ups don't count toward progress — they're preparation. Working sets are what you log. A working set only becomes a 'hard set' if it was actually taken close to failure.",
    whyItMatters: "Confusing a warm-up for a working set, or a half-effort working set for a hard set, quietly inflates your perceived training volume without the growth stimulus to match.",
    projectReacherApplication: "Project Reacher's set-logging form has a separate warm-up checkbox so warm-ups are tracked but never counted toward progression logic.",
    practicalAction: ["Use warm-ups to rehearse the movement, not to pre-fatigue the muscle.", "Only judge progression from logged working sets."],
    commonMistakes: ["Doing too many warm-up sets, arriving fatigued at the actual working sets."],
    relatedTerms: ["training-volume-effective-reps", "technical-muscular-form-failure"], tags: ["warm-up", "working sets", "hard sets"],
    synonyms: ["warm-up sets", "working sets", "hard sets"], readingTimeMin: 1, evidenceTier: "Implementation"
  }),
  E({
    slug: "exercise-selection-specificity", title: "Exercise Selection and Specificity", category: "Training Principles", difficulty: "Intermediate",
    instantMeaning: "Choosing exercises that actually match the goal.",
    shortDefinition: "Exercise selection is choosing movements that load the intended muscle effectively; specificity is the principle that adaptation matches the demands you actually train.",
    beginnerExplanation: "The right exercises for the goal matter more than an impressive-looking exercise list — pick movements you can load and feel working the target area consistently.",
    whyItMatters: "The wrong exercise for your levers or goals wastes training time even with perfect effort.",
    projectReacherApplication: "Every exercise in the Project Reacher program was chosen for a specific target muscle relevant to the shoulders/chest/back/arms proportions goal — see each exercise's own Library article for why it's included.",
    practicalAction: ["If an exercise never lets you feel the target muscle working, consider substituting it (see Exercise Substitutions)."],
    commonMistakes: ["Swapping proven exercises frequently, losing comparable logbook data."],
    relatedTerms: ["exercise-substitutions", "target-muscle-loading"], tags: ["exercise selection", "specificity"],
    readingTimeMin: 1, evidenceTier: "Good"
  }),
  E({
    slug: "tempo-eccentric-concentric-isometric", title: "Tempo, Eccentric, Concentric and Isometric", category: "Training Principles", difficulty: "Intermediate",
    instantMeaning: "The phases and speed of a rep.",
    shortDefinition: "The eccentric is the lowering/lengthening phase, the concentric is the lifting/shortening phase, and an isometric is a held position with no movement; tempo is the overall speed and control across all of these.",
    beginnerExplanation: "Tempo covers the lowering, lifting, pauses and squeeze of a rep. Control on the way down (eccentric) matters just as much as the lifting part (concentric).",
    whyItMatters: "Rushing the eccentric or bouncing out of the bottom position turns a controlled rep into a momentum rep, cutting the useful tension out of it.",
    projectReacherApplication: "Tempo is scored 1-5 in the Technique Guide panel — a low tempo score should hold back progression recommendations even if reps and weight look good.",
    practicalAction: ["Control the eccentric rather than letting the weight drop.", "Keep a brief pause or squeeze at peak contraction where the exercise allows it."],
    commonMistakes: ["Racing through the eccentric to rest sooner.", "Using momentum out of the bottom position to move heavier weight."],
    relatedTerms: ["time-under-tension", "range-of-motion"], tags: ["tempo", "eccentric", "concentric", "isometric"],
    synonyms: ["eccentric", "concentric", "isometric"], readingTimeMin: 2, evidenceTier: "Good"
  }),
  E({
    slug: "range-of-motion", title: "Range of Motion", acronym: "ROM", category: "Training Principles", difficulty: "Basic",
    instantMeaning: "How much of the movement you actually use.",
    shortDefinition: "Range of Motion is how much of an exercise's full useful movement path is used on each rep, including full stretch and full contraction where relevant.",
    beginnerExplanation: "Did you use the full useful range for this exercise? Progress only counts if the range stays consistent — a heavier weight with a shorter range isn't real progress.",
    whyItMatters: "Cutting range short is one of the easiest ways to fake progress on paper while actually reducing the training stimulus.",
    projectReacherApplication: "ROM is logged 1-5 per exercise in the Technique Guide; the app should treat a load increase with a dropping ROM score as suspect, not as genuine progress.",
    practicalAction: ["Keep range of motion consistent session to session before adding load.", "If equipment forces a shorter range, note it and judge progress relative to that same setup."],
    commonMistakes: ["Gradually shortening range over weeks to keep adding weight."],
    relatedTerms: ["mechanical-tension", "tempo-eccentric-concentric-isometric"], tags: ["ROM", "range of motion", "lengthened partials"],
    synonyms: ["lengthened partials", "full ROM"], readingTimeMin: 1, evidenceTier: "Good"
  }),
  E({
    slug: "rest-periods", title: "Rest Periods", category: "Training Principles", difficulty: "Basic",
    instantMeaning: "How long you rest between sets.",
    shortDefinition: "Rest periods are the recovery time taken between working sets, typically 1.5-3 minutes for hypertrophy-focused compound and isolation work.",
    beginnerExplanation: "Enough rest lets you hit the next set with enough strength to make it count — cutting rest too short just to save time makes every set weaker than it should be.",
    whyItMatters: "Under-resting can quietly turn a working set into a junk-volume set because you can't produce enough effort to reach a useful RPE.",
    projectReacherApplication: "Rest 1.5-3 minutes on compounds, especially before the second hard working set, so Set 2 genuinely reflects near-failure effort rather than accumulated fatigue from rushing.",
    practicalAction: ["Rest long enough that Set 2 performance doesn't collapse compared to Set 1."],
    commonMistakes: ["Cutting rest short and mistaking the resulting drop-off for a recovery or fatigue problem."],
    relatedTerms: ["deload-readiness"], tags: ["rest periods"], readingTimeMin: 1, evidenceTier: "Good"
  }),

  // ============ EXERCISE TECHNIQUE (cues) ============
  E({
    slug: "valid-rep-standard", title: "Valid Rep Standard", category: "Exercise Technique", difficulty: "Intermediate",
    instantMeaning: "A rep that actually counts.",
    shortDefinition: "A valid rep matches the exercise's standard: proper range of motion, controlled tempo, no uncontrolled momentum, and the target muscle genuinely loaded.",
    beginnerExplanation: "Not every rep that moves the weight is a 'real' rep for progress purposes — a valid rep has to look and feel like the previous good reps you've logged.",
    whyItMatters: "Progression tracking is meaningless if this week's 'reps' aren't comparable to last week's.",
    projectReacherApplication: "The app should only count progression when reps are comparable to previous weeks — this is the standard behind form quality, ROM and tempo scoring.",
    practicalAction: ["Ask after each rep: did that match how I'd want every rep on this exercise to look?"],
    commonMistakes: ["Letting rep quality quietly decay as fatigue builds late in a set, then logging the same rep count as if nothing changed."],
    relatedTerms: ["technical-muscular-form-failure", "range-of-motion"], tags: ["valid rep", "rep standard"],
    readingTimeMin: 2, evidenceTier: "Implementation"
  }),
  E({
    slug: "bracing-neutral-spine", title: "Bracing and Neutral Spine", category: "Exercise Technique", difficulty: "Intermediate",
    instantMeaning: "Core setup cues for safe, strong lifting.",
    shortDefinition: "Bracing is tightening the core (as if about to be tapped in the stomach) to stabilise the spine under load; neutral spine is keeping the back's natural curve rather than rounding or over-arching.",
    beginnerExplanation: "Before a heavy rep, take a breath and tighten your midsection like you're about to take a hit — that's bracing. Keep your back in its natural shape rather than rounding forward or arching hard.",
    whyItMatters: "A braced, neutral spine transfers force efficiently and protects the lower back under load.",
    projectReacherApplication: "Relevant on Romanian Deadlift, Hack Squat and any loaded standing/hinge movement in the program.",
    practicalAction: ["Brace before the rep starts, not partway through it."],
    commonMistakes: ["Rounding the lower back on hinge movements to squeeze out extra reps."],
    relatedTerms: ["hip-hinge-knee-tracking"], tags: ["bracing", "neutral spine", "core"],
    synonyms: ["neutral spine"], readingTimeMin: 1, evidenceTier: "Good"
  }),
  E({
    slug: "scapula-setup-cues", title: "Shoulder & Scapula Setup Cues", category: "Exercise Technique", difficulty: "Advanced",
    instantMeaning: "Positioning the shoulder blades correctly before pressing or pulling.",
    shortDefinition: "Scapular retraction (pulling shoulder blades together), scapular depression (pulling them down away from the ears) and shoulder packing (retract + depress together) are setup cues that put the shoulder joint in a stronger, safer position.",
    beginnerExplanation: "Before a press or pull, gently pull your shoulder blades back and down rather than letting your shoulders round forward and ride up toward your ears.",
    whyItMatters: "A packed shoulder position reduces unwanted joint strain and lets the intended muscles do the work instead of the shoulder joint itself.",
    projectReacherApplication: "Especially relevant on Incline DB Press, Seated DB Shoulder Press, Machine Chest Press, and all pulling exercises (rows, pulldowns).",
    practicalAction: ["Set the shoulder position before the first rep and re-check it if it drifts mid-set."],
    commonMistakes: ["Letting shoulders shrug up toward the ears on pressing movements.", "Losing scapular retraction on rowing movements, turning it into an arm-only pull."],
    relatedTerms: ["bracing-neutral-spine"], tags: ["scapular retraction", "scapular depression", "shoulder packing"],
    synonyms: ["scapular retraction", "scapular depression", "shoulder packing"], readingTimeMin: 2, evidenceTier: "Good"
  }),
  E({
    slug: "hip-hinge-knee-tracking", title: "Hip Hinge and Knee Tracking", category: "Exercise Technique", difficulty: "Intermediate",
    instantMeaning: "Lower-body movement setup cues.",
    shortDefinition: "A hip hinge is bending primarily at the hips with a soft knee bend (used on Romanian Deadlift); knee tracking is keeping the knees aligned over the toes rather than caving inward on squatting movements.",
    beginnerExplanation: "On a Romanian Deadlift, push your hips back rather than squatting down. On Hack Squat or Leg Press, keep your knees tracking in the same direction as your toes throughout the rep.",
    whyItMatters: "Good hip hinge mechanics protect the lower back on RDLs; good knee tracking protects the knees on squat-pattern movements.",
    projectReacherApplication: "Directly relevant to Romanian Deadlift (hip hinge) and Hack Squat / Leg Press (knee tracking).",
    practicalAction: ["Cue 'push the hips back' on RDLs.", "Cue 'knees out' if they collapse inward on squat-pattern lifts."],
    commonMistakes: ["Turning a Romanian Deadlift into a squat by bending the knees too much.", "Letting knees cave inward under heavier loads."],
    relatedTerms: ["bracing-neutral-spine"], tags: ["hip hinge", "knee tracking"], synonyms: ["hip hinge", "knee tracking"],
    readingTimeMin: 1, evidenceTier: "Good"
  }),
  E({
    slug: "grip-types", title: "Grip Types", category: "Exercise Technique", difficulty: "Basic",
    instantMeaning: "How your hands hold the bar/handle changes what gets emphasised.",
    shortDefinition: "Different grip types (neutral, wide, close, reverse) change joint positioning and which muscles get emphasised on the same basic movement pattern.",
    beginnerExplanation: "Neutral Grip Lat Pulldown, Wide Grip Lat Pulldown and Reverse-Grip Bar Extension all use grip variation deliberately to shift the emphasis or feel of the movement.",
    whyItMatters: "Grip choice is one of the simplest ways to vary stimulus or reduce joint strain without changing the whole exercise.",
    projectReacherApplication: "The program deliberately includes both neutral and wide grip lat pulldown variants for different lat emphasis and joint comfort.",
    practicalAction: ["Keep grip type consistent for a given exercise across sessions so progress stays comparable."],
    commonMistakes: ["Switching grip type randomly session to session, making logged progress hard to compare."],
    relatedTerms: [], tags: ["grip types"], readingTimeMin: 1, evidenceTier: "Good"
  }),
  E({
    slug: "consistency-cues", title: "Consistency Cues: Range, Tempo and Setup", category: "Exercise Technique", difficulty: "Intermediate",
    instantMeaning: "Doing the exercise the same way every time.",
    shortDefinition: "Range consistency, tempo control and a stable setup together mean an exercise is performed the same way session to session, which is what makes logged progress meaningful.",
    beginnerExplanation: "Same seat height, same range, same rep speed, same grip — the more consistent the setup, the more you can trust that a heavier weight this week really is progress.",
    whyItMatters: "Inconsistent setup is one of the most common hidden reasons logged 'progress' isn't real.",
    projectReacherApplication: "Note machine settings (seat height, pin position) in the exercise Notes field so setup stays repeatable session to session.",
    practicalAction: ["Log machine settings in the Notes field the first time you use a new setting."],
    commonMistakes: ["Not noting machine settings, then unknowingly using an easier or harder setup next time."],
    relatedTerms: ["valid-rep-standard", "range-of-motion"], tags: ["range consistency", "tempo control", "stable setup"],
    synonyms: ["range consistency", "stable setup"], readingTimeMin: 1, evidenceTier: "Implementation"
  }),
  E({
    slug: "target-muscle-loading", title: "Target Muscle Loading", category: "Exercise Technique", difficulty: "Basic",
    instantMeaning: "Whether the exercise is actually working the muscle it's meant to.",
    shortDefinition: "Target muscle loading is whether the intended muscle is genuinely doing the work of the exercise, versus other muscles compensating.",
    beginnerExplanation: "Did you feel the intended muscle doing the work? This helps track whether the exercise is loading the right area rather than being taken over by a stronger assisting muscle.",
    whyItMatters: "An exercise that no longer loads its target muscle isn't contributing to that muscle's growth, even if the weight moves.",
    projectReacherApplication: "Logged as Target Muscle Connection 1-5 per exercise — a consistently low score is a signal to check form, reduce load, or consider a substitution.",
    practicalAction: ["If a 'chest' exercise starts feeling like all triceps, that's worth investigating before adding more weight."],
    commonMistakes: ["Increasing weight even as target-muscle feel drops, because the number on the app went up."],
    relatedTerms: ["mind-muscle-connection", "exercise-selection-specificity"], tags: ["target muscle", "target muscle connection"],
    readingTimeMin: 1, evidenceTier: "Implementation"
  }),
  E({
    slug: "momentum-cheating", title: "Momentum / Cheating", category: "Exercise Technique", difficulty: "Basic",
    instantMeaning: "Using body swing to move weight the muscle can't.",
    shortDefinition: "Momentum (or 'cheat reps') is using body swing, bouncing, or jerking to move a weight the target muscle alone can't control through the full range.",
    beginnerExplanation: "If you have to swing, jerk or bounce to get the weight moving, the target muscle isn't doing that part of the work — it doesn't count as a valid rep.",
    whyItMatters: "Momentum reps inflate the numbers on paper without providing the mechanical tension that drives growth.",
    projectReacherApplication: "A form quality score of 5 assumes controlled reps without momentum — momentum reps should be scored lower, not just noted.",
    practicalAction: ["If you need to swing to start the rep, that's a signal to reduce the load."],
    commonMistakes: ["Mistaking a heavier momentum-assisted rep for genuine strength progress."],
    relatedTerms: ["valid-rep-standard", "technical-muscular-form-failure"], tags: ["momentum", "cheat reps"], readingTimeMin: 1, evidenceTier: "Good"
  }),
  E({
    slug: "warm-up-ramping", title: "Warm-Up Ramping", category: "Exercise Technique", difficulty: "Basic",
    instantMeaning: "Building up to working weight gradually.",
    shortDefinition: "Warm-up ramping is gradually increasing load across a few light sets to prepare the joints and rehearse the movement before the first working set.",
    beginnerExplanation: "Start light and add weight over 2-3 short sets rather than jumping straight to your working weight cold.",
    whyItMatters: "It reduces injury risk and improves the quality of the first working set.",
    projectReacherApplication: "Warm-up sets are tracked separately in the logging form via the Warm-Up checkbox so they never distort progression tracking.",
    practicalAction: ["Ramp in 2-3 short sets on compound lifts before the first working set."],
    commonMistakes: ["Doing so many warm-up sets that fatigue builds before the working sets even start."],
    relatedTerms: ["working-warmup-hard-sets"], tags: ["warm-up ramping"], readingTimeMin: 1, evidenceTier: "Good"
  }),
  E({
    slug: "exercise-substitutions", title: "Exercise Substitutions", category: "Exercise Technique", difficulty: "Basic",
    instantMeaning: "Swapping an exercise for a similar one when needed.",
    shortDefinition: "An exercise substitution replaces one movement with another that trains a similar pattern or muscle, used when equipment, injury, or persistent poor target-muscle feel makes the original a poor fit.",
    beginnerExplanation: "If an exercise consistently causes pain, feels wrong, or the equipment isn't available, swap it for one that hits the same muscle in a similar way rather than skipping it.",
    whyItMatters: "The 'best' exercise on paper is worthless if you can't execute it well or safely.",
    projectReacherApplication: "Program notes list intended purpose per exercise (e.g. 'Neutral Grip Lat Pulldown — weighted pull-up replacement') so a sensible substitute keeps the same training purpose.",
    practicalAction: ["Substitute along the same movement pattern and target muscle, not at random."],
    commonMistakes: ["Switching exercises frequently for variety alone, losing comparable logbook data."],
    relatedTerms: ["exercise-selection-specificity"], tags: ["exercise substitutions"], readingTimeMin: 1, evidenceTier: "Implementation"
  }),

  // ============ PROGRAM EXERCISES ============
  E({
    slug: "hack-squat", title: "Hack Squat", category: "Exercise Technique", difficulty: "Basic",
    instantMeaning: "Supported quad-focused squat.",
    shortDefinition: "A machine squat where the back is supported, targeting the quads with reduced balance demand.",
    beginnerExplanation: "A machine squat where the back is supported, making it easier to push the legs hard without balance limiting the set.",
    whyItMatters: "Lets you push quads close to failure without the technical difficulty and fatigue cost of a free-weight squat.",
    projectReacherApplication: "Useful for building powerful, proportionate legs while managing systemic fatigue — Set 1 ~1 RIR, Set 2 to technical failure.",
    practicalAction: ["Keep knees tracking over the toes through the full range."],
    commonMistakes: ["Cutting depth short as the weight gets heavy."],
    relatedTerms: ["hip-hinge-knee-tracking", "range-of-motion"], tags: ["hack squat", "quads", "legs"], readingTimeMin: 1, evidenceTier: "Implementation"
  }),
  E({
    slug: "romanian-deadlift", title: "Romanian Deadlift", acronym: "RDL", category: "Exercise Technique", difficulty: "Intermediate",
    instantMeaning: "Hip-hinge hamstring/glute builder.",
    shortDefinition: "A hip-hinge movement that loads the hamstrings and glutes through a controlled stretch, with the bar or dumbbells tracking close to the legs.",
    beginnerExplanation: "Push your hips back rather than squatting down, feeling a stretch through the hamstrings before driving the hips forward.",
    whyItMatters: "One of the most effective hamstring-length-under-tension movements available.",
    projectReacherApplication: "Set 1 ~1 RIR, Set 2 technical failure. Keep a neutral spine and braced core throughout.",
    practicalAction: ["Stop lowering the weight once you feel your lower back start to round."],
    commonMistakes: ["Rounding the lower back to reach further down.", "Turning it into a squat by bending the knees too much."],
    relatedTerms: ["hip-hinge-knee-tracking", "bracing-neutral-spine"], tags: ["RDL", "hamstrings", "glutes"], readingTimeMin: 1, evidenceTier: "Implementation"
  }),
  E({
    slug: "leg-press", title: "Leg Press", category: "Exercise Technique", difficulty: "Basic",
    instantMeaning: "Machine-supported quad/glute/hamstring compound.",
    shortDefinition: "A seated, machine-supported pressing movement for the quads, glutes and hamstrings with minimal balance demand.",
    beginnerExplanation: "A machine squat pattern done seated, letting you push the legs hard with less technical skill required.",
    whyItMatters: "Useful for accumulating leg volume with lower fatigue cost than free-weight squats.",
    projectReacherApplication: "Set 1 ~1 RIR, Set 2 technical failure. Keep full range without locking the knees hard at the top.",
    practicalAction: ["Lower until the knees reach a comfortable full range without the lower back lifting off the pad."],
    commonMistakes: ["Letting the lower back round off the pad at the bottom to chase extra depth."],
    relatedTerms: ["hack-squat", "range-of-motion"], tags: ["leg press", "quads", "legs"], readingTimeMin: 1, evidenceTier: "Implementation"
  }),
  E({
    slug: "leg-curl", title: "Leg Curl", category: "Exercise Technique", difficulty: "Basic",
    instantMeaning: "Isolated hamstring flexion.",
    shortDefinition: "A machine isolation exercise that flexes the knee to directly target the hamstrings.",
    beginnerExplanation: "Curling the lower leg toward the glutes against machine resistance, isolating the hamstrings.",
    whyItMatters: "Directly targets the hamstrings in a way compound hinge movements don't fully replicate.",
    projectReacherApplication: "Both sets to technical failure — a pure isolation finisher for the hamstrings.",
    practicalAction: ["Control the negative rather than letting the weight stack drop."],
    commonMistakes: ["Using hip movement to help swing the weight up."],
    relatedTerms: ["romanian-deadlift"], tags: ["leg curl", "hamstrings"], readingTimeMin: 1, evidenceTier: "Implementation"
  }),
  E({
    slug: "standing-calf-raise", title: "Standing Calf Raise", category: "Exercise Technique", difficulty: "Basic",
    instantMeaning: "Calf isolation through a full stretch and squeeze.",
    shortDefinition: "A standing plantarflexion exercise loading the calves through a full stretch at the bottom and full squeeze at the top.",
    beginnerExplanation: "Rise onto your toes under load, pausing briefly at the top squeeze and the bottom stretch.",
    whyItMatters: "Calves respond well to full range of motion and controlled tempo, more than to heavy partial reps.",
    projectReacherApplication: "Both sets to technical failure, controlled stretch and squeeze — don't bounce out of the bottom position.",
    practicalAction: ["Pause briefly at full stretch before driving up."],
    commonMistakes: ["Bouncing out of the bottom stretch instead of controlling it."],
    relatedTerms: ["range-of-motion", "tempo-eccentric-concentric-isometric"], tags: ["calves", "calf raise"], readingTimeMin: 1, evidenceTier: "Implementation"
  }),
  E({
    slug: "incline-db-press", title: "Incline Dumbbell Press", category: "Exercise Technique", difficulty: "Basic",
    instantMeaning: "Primary upper-chest builder.",
    shortDefinition: "A dumbbell press on an incline bench targeting the upper chest and front delts.",
    beginnerExplanation: "Pressing dumbbells up and slightly together on an incline bench, emphasising the upper chest.",
    whyItMatters: "Upper chest fullness is a key part of the broad, proportionate upper-body look Project Reacher targets.",
    projectReacherApplication: "Set 1 ~1 RIR, Set 2 technical failure. Pack the shoulders before each rep.",
    practicalAction: ["Lower the dumbbells under control to a comfortable stretch before pressing back up."],
    commonMistakes: ["Flaring the elbows so far that the shoulder takes over from the chest."],
    relatedTerms: ["scapula-setup-cues", "why-these-muscle-groups"], tags: ["incline press", "upper chest"], readingTimeMin: 1, evidenceTier: "Implementation"
  }),
  E({
    slug: "smith-incline-press", title: "Smith Incline Press", category: "Exercise Technique", difficulty: "Basic",
    instantMeaning: "Fixed-path upper-chest press.",
    shortDefinition: "An incline press performed on a Smith machine, fixing the bar path so the focus stays on pressing effort rather than stabilisation.",
    beginnerExplanation: "Same upper-chest target as the dumbbell version, but the fixed bar path removes balance demand, letting you push closer to failure safely.",
    whyItMatters: "Useful for genuinely reaching technical failure safely without needing a spotter.",
    projectReacherApplication: "Set 1 ~1 RIR, Set 2 technical failure. Complements Incline DB Press across the week.",
    practicalAction: ["Set the bench angle and bar stop consistently and note it for next session."],
    commonMistakes: ["Using a bench angle so steep it shifts emphasis to front delts instead of upper chest."],
    relatedTerms: ["incline-db-press"], tags: ["smith machine", "upper chest"], readingTimeMin: 1, evidenceTier: "Implementation"
  }),
  E({
    slug: "seated-db-shoulder-press", title: "Seated Dumbbell Shoulder Press", category: "Exercise Technique", difficulty: "Basic",
    instantMeaning: "Primary shoulder-width builder.",
    shortDefinition: "A seated overhead dumbbell press targeting the shoulders, with triceps assisting.",
    beginnerExplanation: "Pressing dumbbells overhead from shoulder height while seated for back support.",
    whyItMatters: "Shoulder size and roundness is one of the biggest drivers of the broad-shoulders, narrow-waist look.",
    projectReacherApplication: "Set 1 ~1 RIR, Set 2 technical failure. Pairs with Cable Lateral Raise for shoulder-width emphasis.",
    practicalAction: ["Lower to roughly ear level rather than flaring the elbows out wide at the bottom."],
    commonMistakes: ["Arching the lower back excessively to grind out extra reps."],
    relatedTerms: ["why-these-muscle-groups", "cable-lateral-raise"], tags: ["shoulder press", "delts"], readingTimeMin: 1, evidenceTier: "Implementation"
  }),
  E({
    slug: "machine-chest-press", title: "Machine Chest Press", category: "Exercise Technique", difficulty: "Basic",
    instantMeaning: "Supported mid-chest press to safe failure.",
    shortDefinition: "A machine-guided horizontal press targeting the mid chest, with a fixed and supported path.",
    beginnerExplanation: "Same pressing pattern as a bench press, but the machine supports the path so you can safely push to technical failure.",
    whyItMatters: "Lets Set 2 reach genuine technical failure safely without a spotter.",
    projectReacherApplication: "Set 1 ~1 RIR, Set 2 technical failure — described in the program as 'safe failure pressing.'",
    practicalAction: ["Set the seat height so the handles align with mid-chest height."],
    commonMistakes: ["Seat set too high or low, shifting emphasis away from the intended chest area."],
    relatedTerms: ["incline-db-press"], tags: ["chest press", "chest"], readingTimeMin: 1, evidenceTier: "Implementation"
  }),
  E({
    slug: "close-grip-chest-press", title: "Close Grip Chest Press", category: "Exercise Technique", difficulty: "Basic",
    instantMeaning: "Chest press with extra triceps emphasis.",
    shortDefinition: "A machine chest press performed with a narrower hand position, shifting some emphasis onto the triceps.",
    beginnerExplanation: "Same movement as the machine chest press, but a closer grip means the triceps do more of the work alongside the chest.",
    whyItMatters: "Adds indirect triceps volume on top of a chest-focused movement, which is efficient for arm size.",
    projectReacherApplication: "Set 1 ~1 RIR, Set 2 technical failure. Counted as indirect triceps volume in the weekly split.",
    practicalAction: ["Keep elbows tucked closer to the body than on the standard-grip press."],
    commonMistakes: ["Gripping so narrow it becomes uncomfortable at the wrists."],
    relatedTerms: ["machine-chest-press", "overhead-triceps-extension"], tags: ["close grip press", "triceps"], readingTimeMin: 1, evidenceTier: "Implementation"
  }),
  E({
    slug: "cable-lateral-raise", title: "Cable Lateral Raise", category: "Exercise Technique", difficulty: "Basic",
    instantMeaning: "Side delt isolation for shoulder width.",
    shortDefinition: "A cable isolation exercise that raises the arm out to the side, targeting the side delts.",
    beginnerExplanation: "Raising the arm against cable resistance out to the side, targeting the side delts specifically.",
    whyItMatters: "One of the highest-value movements for shoulder width, which drives the visual shoulder-to-waist ratio.",
    projectReacherApplication: "Both sets to technical failure. Cable tension (unlike dumbbells) stays consistent through the whole range, including the bottom.",
    practicalAction: ["Lead with the elbow, not the hand, and avoid using the traps to shrug the weight up."],
    commonMistakes: ["Swinging the torso to generate momentum instead of isolating the side delt."],
    relatedTerms: ["why-these-muscle-groups", "shoulder-to-waist-ratio"], tags: ["lateral raise", "side delts", "shoulders"], readingTimeMin: 1, evidenceTier: "Implementation"
  }),
  E({
    slug: "face-pull", title: "Face Pull", category: "Exercise Technique", difficulty: "Basic",
    instantMeaning: "Rear delt and rotator cuff health movement.",
    shortDefinition: "A cable pull to face height targeting the rear delts and rotator cuff, supporting shoulder health.",
    beginnerExplanation: "Pulling a rope attachment toward your face with elbows high, targeting the rear delts and rotator cuff.",
    whyItMatters: "Balances out heavy pressing volume and supports long-term shoulder joint health.",
    projectReacherApplication: "Both sets to technical failure. Framed in the program specifically as a shoulder-health movement.",
    practicalAction: ["Externally rotate at the end range rather than just pulling straight back."],
    commonMistakes: ["Using too much weight, turning it into a row instead of a rear-delt movement."],
    relatedTerms: ["rear-delt-fly"], tags: ["face pull", "rear delts", "shoulder health"], readingTimeMin: 1, evidenceTier: "Implementation"
  }),
  E({
    slug: "rear-delt-fly", title: "Rear Delt Fly", category: "Exercise Technique", difficulty: "Basic",
    instantMeaning: "Isolated rear delt work.",
    shortDefinition: "A machine isolation exercise for the rear delts, performed with a horizontal abduction motion.",
    beginnerExplanation: "Opening the arms out and back against machine resistance, isolating the rear delts.",
    whyItMatters: "Rear delt development rounds out overall shoulder shape from the back.",
    projectReacherApplication: "Both sets to technical failure, complementing Face Pull for rear delt volume.",
    practicalAction: ["Keep a slight bend in the elbows and lead with them, not the hands."],
    commonMistakes: ["Using the upper back/traps to move the weight instead of the rear delts."],
    relatedTerms: ["face-pull"], tags: ["rear delt fly", "rear delts"], readingTimeMin: 1, evidenceTier: "Implementation"
  }),
  E({
    slug: "neutral-grip-lat-pulldown", title: "Neutral Grip Lat Pulldown", category: "Exercise Technique", difficulty: "Basic",
    instantMeaning: "Weighted pull-up alternative for lat thickness.",
    shortDefinition: "A cable pulldown with palms facing each other, targeting the lats with biceps assisting.",
    beginnerExplanation: "Pulling a neutral-grip handle down to the chest, built as a controllable weighted pull-up replacement.",
    whyItMatters: "Lets you load the lats progressively without needing bodyweight pull-up strength first.",
    projectReacherApplication: "Set 1 ~1 RIR, Set 2 technical failure — noted in the program as a weighted pull-up replacement.",
    practicalAction: ["Pull with the elbows down and back, not just the hands down."],
    commonMistakes: ["Leaning back excessively and turning it into a row."],
    relatedTerms: ["wide-grip-lat-pulldown", "why-these-muscle-groups"], tags: ["lat pulldown", "lats", "back"], readingTimeMin: 1, evidenceTier: "Implementation"
  }),
  E({
    slug: "wide-grip-lat-pulldown", title: "Wide Grip Lat Pulldown", category: "Exercise Technique", difficulty: "Basic",
    instantMeaning: "Lat-width-focused pulldown.",
    shortDefinition: "A cable pulldown with a wide overhand grip, emphasising lat width.",
    beginnerExplanation: "Pulling a wide bar down to the upper chest, emphasising the outer lats for width.",
    whyItMatters: "Lat width is a major driver of the visual V-taper Project Reacher is targeting.",
    projectReacherApplication: "Set 1 ~1 RIR, Set 2 technical failure — noted in the program specifically for lat width.",
    practicalAction: ["Focus on driving the elbows down and out rather than just pulling with the arms."],
    commonMistakes: ["Gripping so wide that range of motion at the top gets cut short."],
    relatedTerms: ["neutral-grip-lat-pulldown", "why-these-muscle-groups"], tags: ["lat pulldown", "lats", "back width"], readingTimeMin: 1, evidenceTier: "Implementation"
  }),
  E({
    slug: "single-arm-lat-pulldown", title: "Single-Arm Lat Pulldown", category: "Exercise Technique", difficulty: "Basic",
    instantMeaning: "Unilateral lat isolation.",
    shortDefinition: "A single-arm cable pulldown that isolates one lat at a time, increasing mind-muscle connection.",
    beginnerExplanation: "Pulling one handle down at a time, making it easier to feel and isolate a single lat.",
    whyItMatters: "Removes the ability to favour a stronger side, and can improve lat feel for lifters who struggle to feel their back working.",
    projectReacherApplication: "Both sets to technical failure — a lat isolation finisher after the bilateral pulldown variants.",
    practicalAction: ["Keep the torso still and avoid rotating to help pull the weight."],
    commonMistakes: ["Twisting the torso to add momentum instead of isolating the lat."],
    relatedTerms: ["neutral-grip-lat-pulldown", "mind-muscle-connection"], tags: ["lat pulldown", "lats", "unilateral"], readingTimeMin: 1, evidenceTier: "Implementation"
  }),
  E({
    slug: "chest-supported-row", title: "Chest-Supported Row", category: "Exercise Technique", difficulty: "Basic",
    instantMeaning: "Back-thickness row with strict form.",
    shortDefinition: "A row performed with the chest supported on a pad, removing the lower back from the movement and isolating the back muscles.",
    beginnerExplanation: "Rowing with your chest braced against a pad, so momentum from the lower back can't help move the weight.",
    whyItMatters: "Strict isolation of the back-thickness muscles without lower-back involvement or momentum.",
    projectReacherApplication: "Set 1 ~1 RIR, Set 2 technical failure. Targets back thickness alongside lats and biceps.",
    practicalAction: ["Squeeze the shoulder blades together at the top of each rep."],
    commonMistakes: ["Using only the arms and skipping the scapular squeeze at the top."],
    relatedTerms: ["seated-cable-row", "scapula-setup-cues"], tags: ["row", "back thickness"], readingTimeMin: 1, evidenceTier: "Implementation"
  }),
  E({
    slug: "seated-cable-row", title: "Seated Cable Row", category: "Exercise Technique", difficulty: "Basic",
    instantMeaning: "Classic back-thickness builder.",
    shortDefinition: "A seated horizontal cable row targeting back thickness, lats and biceps.",
    beginnerExplanation: "Pulling a handle toward the torso while seated, driving the elbows back.",
    whyItMatters: "A staple back-thickness movement that complements the more isolated Chest-Supported Row.",
    projectReacherApplication: "Set 1 ~1 RIR, Set 2 technical failure.",
    practicalAction: ["Avoid leaning far back to use body momentum on the pull."],
    commonMistakes: ["Rounding the lower back to reach further forward at the start of the rep."],
    relatedTerms: ["chest-supported-row"], tags: ["cable row", "back thickness"], readingTimeMin: 1, evidenceTier: "Implementation"
  }),
  E({
    slug: "shrugs", title: "Shrugs", category: "Exercise Technique", difficulty: "Basic",
    instantMeaning: "Direct trap builder.",
    shortDefinition: "A dumbbell elevation exercise directly targeting the trapezius (traps).",
    beginnerExplanation: "Lifting the shoulders straight up toward the ears against dumbbell resistance.",
    whyItMatters: "Trap and neck development contributes to the powerful upper-body look the program targets.",
    projectReacherApplication: "Both sets to technical failure. Pairs with Manual Neck Isometrics for the traps/neck area.",
    practicalAction: ["Lift straight up rather than rolling the shoulders in a circle."],
    commonMistakes: ["Using momentum or bent elbows to swing the weight up."],
    relatedTerms: ["why-these-muscle-groups", "manual-neck-isometrics"], tags: ["shrugs", "traps"], readingTimeMin: 1, evidenceTier: "Implementation"
  }),
  E({
    slug: "hammer-curl", title: "Hammer Curl", category: "Exercise Technique", difficulty: "Basic",
    instantMeaning: "Arm-thickness builder via the brachialis.",
    shortDefinition: "A dumbbell curl performed with a neutral grip, emphasising the brachialis alongside the biceps.",
    beginnerExplanation: "Curling dumbbells with palms facing each other rather than facing up, shifting emphasis onto a muscle underneath the biceps that adds arm thickness.",
    whyItMatters: "The brachialis contributes meaningfully to overall arm thickness, not just the biceps peak.",
    projectReacherApplication: "Both sets to technical failure. Framed in the program as a brachialis / arm-thickness movement.",
    practicalAction: ["Keep the wrist neutral throughout rather than rotating toward a standard curl."],
    commonMistakes: ["Swinging the shoulder to generate momentum instead of curling with the arm."],
    relatedTerms: ["why-these-muscle-groups", "ez-curl"], tags: ["hammer curl", "biceps", "brachialis"], readingTimeMin: 1, evidenceTier: "Implementation"
  }),
  E({
    slug: "ez-curl", title: "EZ Curl", category: "Exercise Technique", difficulty: "Basic",
    instantMeaning: "Standard biceps builder with a wrist-friendly bar.",
    shortDefinition: "A biceps curl performed with an EZ (cambered) bar, which is easier on the wrists than a straight bar.",
    beginnerExplanation: "Curling an angled bar that lets the wrists sit in a more natural position than a straight barbell.",
    whyItMatters: "Direct biceps volume for arm size, with reduced wrist strain versus a straight bar.",
    projectReacherApplication: "Both sets to technical failure.",
    practicalAction: ["Keep elbows pinned at your sides through the whole rep."],
    commonMistakes: ["Letting the elbows drift forward to help swing the weight up."],
    relatedTerms: ["hammer-curl", "why-these-muscle-groups"], tags: ["EZ curl", "biceps"], readingTimeMin: 1, evidenceTier: "Implementation"
  }),
  E({
    slug: "overhead-triceps-extension", title: "Overhead Triceps Extension", category: "Exercise Technique", difficulty: "Basic",
    instantMeaning: "Main long-head triceps builder.",
    shortDefinition: "A cable extension performed overhead, stretching and loading the long head of the triceps in particular.",
    beginnerExplanation: "Extending the arms overhead against cable resistance, getting a strong stretch on the back of the upper arm.",
    whyItMatters: "The overhead position gives the triceps' long head an especially deep stretch under load, which is valuable for growth.",
    projectReacherApplication: "Both sets to technical failure. Program notes flag this as the main long-head triceps builder — 'do not remove or replace.'",
    practicalAction: ["Keep elbows pointed forward and relatively still through the rep."],
    commonMistakes: ["Letting the elbows flare wide, turning it into a shoulder-dominant movement."],
    relatedTerms: ["why-these-muscle-groups", "reverse-grip-bar-extension"], tags: ["triceps", "overhead extension"], readingTimeMin: 1, evidenceTier: "Implementation"
  }),
  E({
    slug: "reverse-grip-bar-extension", title: "Reverse-Grip Bar Extension", category: "Exercise Technique", difficulty: "Basic",
    instantMeaning: "Second direct triceps isolation movement.",
    shortDefinition: "A cable pushdown-style extension performed with an underhand grip, adding a second angle of direct triceps work.",
    beginnerExplanation: "Extending the arms down against cable resistance with palms facing up, giving the triceps a slightly different loading angle than a standard pushdown.",
    whyItMatters: "A second weekly triceps isolation angle alongside Overhead Triceps Extension helps balance overall arm development.",
    projectReacherApplication: "Both sets to technical failure. Added on Specialisation Day alongside Overhead Triceps Extension on Push Day.",
    practicalAction: ["Keep the elbows tucked and stationary, letting only the forearm move."],
    commonMistakes: ["Using the shoulders to help push the weight down."],
    relatedTerms: ["overhead-triceps-extension"], tags: ["triceps", "reverse grip extension"], readingTimeMin: 1, evidenceTier: "Implementation"
  }),
  E({
    slug: "manual-neck-isometrics", title: "Manual Neck Isometrics", category: "Exercise Technique", difficulty: "Basic",
    instantMeaning: "Home-friendly neck strengthening.",
    shortDefinition: "Isometric neck holds performed by resisting with your own hand against your head, needing no equipment.",
    beginnerExplanation: "Pressing your head into your hand (front, back and sides) and holding, without any range of motion — a simple bodyweight way to train the neck.",
    whyItMatters: "Neck size and strength contribute to the powerful, proportionate upper-body look, and this needs no equipment.",
    projectReacherApplication: "3 x 20-30 second holds per direction, noted in the program as a home-based alternative.",
    practicalAction: ["Apply steady, controlled pressure rather than a sudden jerk."],
    commonMistakes: ["Applying pressure too aggressively, risking strain rather than a controlled hold."],
    relatedTerms: ["why-these-muscle-groups", "shrugs"], tags: ["neck training", "isometrics"], readingTimeMin: 1, evidenceTier: "Implementation"
  }),

  // ============ MACROS ============
  E({
    slug: "protein", title: "Protein", category: "Macros", difficulty: "Basic",
    instantMeaning: "Building and repair nutrient.",
    shortDefinition: "Protein provides amino acids the body uses to repair and build tissue, including muscle, and supports satiety and recovery.",
    beginnerExplanation: "Protein provides amino acids the body uses to repair and build tissue, including muscle. It also helps you feel full and supports recovery between sessions.",
    sportsScienceExplanation: "Adequate protein drives muscle protein synthesis (MPS). A daily range of roughly 1.6-2.2 g/kg bodyweight covers essentially all of the benefit for a lifter in a caloric surplus; going meaningfully above that range shows diminishing returns and can displace carbs or fat unnecessarily.",
    whyItMatters: "It's a core building block for the entire hypertrophy goal — without enough protein, hard training has less to build with.",
    projectReacherApplication: "140 g/day is already sufficient at the current ~72-73 kg bodyweight (roughly 1.9-1.95 g/kg). As bodyweight rises toward 78-80 kg, 150-160 g/day may become a more useful target — but more protein is not automatically better if it displaces carbs or total calories needed for performance.",
    practicalAction: ["Spread protein across 3-5 meals/day for convenience and satiety.", "Recalculate the target as bodyweight increases rather than fixing it forever."],
    commonMistakes: ["Chasing very high protein intakes (250g+) that offer no extra benefit at this bodyweight and crowd out carbs.", "Assuming more protein always means more muscle."],
    relatedTerms: ["muscle-protein-synthesis", "calories-energy-balance"], tags: ["protein", "amino acids", "MPS"],
    readingTimeMin: 3, evidenceTier: "Consensus", sourceNotes: ["General sports-nutrition protein intake ranges for resistance-trained individuals."]
  }),
  E({
    slug: "carbohydrates", title: "Carbohydrates", category: "Macros", difficulty: "Basic",
    instantMeaning: "Training fuel.",
    shortDefinition: "Carbohydrates are the body's preferred fuel for hard lifting and help refill muscle glycogen between sessions.",
    beginnerExplanation: "Carbs are the body's preferred fuel for hard lifting and help refill glycogen — the stored fuel your muscles burn through during training.",
    sportsScienceExplanation: "Adequate carb intake supports training volume and intensity, particularly on high-output lower-body and high-volume sessions, and contributes to the fullness/pump some lifters use as a subjective (not diagnostic) recovery cue.",
    whyItMatters: "Under-fuelling carbs during a lean bulk can quietly reduce training performance even if calories and protein are on target.",
    projectReacherApplication: "Adequate carbs help performance, especially on lower-body and high-volume sessions — don't sacrifice carbs to make room for excess protein.",
    practicalAction: ["Prioritise carbs around training days, especially leg days."],
    commonMistakes: ["Cutting carbs low to 'clean up' the diet while lean bulking, then wondering why performance drops."],
    relatedTerms: ["glycogen", "protein"], tags: ["carbs", "carbohydrates", "glycogen"], readingTimeMin: 2, evidenceTier: "Consensus"
  }),
  E({
    slug: "fats", title: "Fats", category: "Macros", difficulty: "Basic",
    instantMeaning: "Essential energy and hormone-support nutrient.",
    shortDefinition: "Dietary fats support normal hormone function, cell health, energy intake and absorption of fat-soluble vitamins.",
    beginnerExplanation: "Fats help support normal hormone function, cell health, and provide a dense energy source.",
    whyItMatters: "Driving fat intake too low for extended periods can impair hormone function and overall health, even during a bulk where fat isn't the priority macro.",
    projectReacherApplication: "Keep fats sufficient (roughly 0.6-1g/kg as a reasonable floor) while using carbs as the main lever to support training performance during a lean bulk.",
    practicalAction: ["Don't let fat intake drop to near-zero even when prioritising protein and carbs."],
    commonMistakes: ["Cutting fat too aggressively to 'save' calories for carbs or protein."],
    relatedTerms: ["protein", "carbohydrates"], tags: ["fats", "dietary fat"], readingTimeMin: 2, evidenceTier: "Consensus"
  }),
  E({
    slug: "fibre", title: "Fibre", category: "Macros", difficulty: "Basic",
    instantMeaning: "Digestion-support carbohydrate.",
    shortDefinition: "Fibre is a type of carbohydrate that supports digestion, gut health and fullness, with a practical target of roughly 14g per 1,000 kcal consumed.",
    beginnerExplanation: "Fibre helps digestion, gut health, and fullness.",
    whyItMatters: "Good digestion and gut comfort make it easier to consistently hit a calorie and protein target during a bulk.",
    projectReacherApplication: "Useful for health and digestion, but avoid loading up on high-fibre foods right before training, where it can cause discomfort.",
    practicalAction: ["Aim for roughly 14g fibre per 1,000 kcal.", "Keep the pre-workout meal lower in fibre than other meals."],
    commonMistakes: ["Eating a large high-fibre meal right before a heavy training session."],
    relatedTerms: ["water"], tags: ["fibre"], readingTimeMin: 1, evidenceTier: "Good"
  }),
  E({
    slug: "alcohol", title: "Alcohol", category: "Macros", difficulty: "Basic",
    instantMeaning: "Non-essential energy source that can hurt recovery.",
    shortDefinition: "Alcohol is a non-essential source of calories that, used frequently, can impair recovery, sleep and food/training consistency.",
    beginnerExplanation: "Alcohol isn't forbidden, but it isn't a useful nutrient — it's extra calories that can also disrupt sleep and next-day training or eating.",
    whyItMatters: "Frequent alcohol use compounds with an already-tight sleep budget and can undo consistency gains elsewhere.",
    projectReacherApplication: "Not banned, but shouldn't dominate calories during an active physique phase, and is worth weighing against the fixed sleep constraint specifically.",
    practicalAction: ["If drinking, plan for the calories and expect a possible knock-on effect on next day's training/recovery data."],
    commonMistakes: ["Not accounting for alcohol calories at all when tracking."],
    relatedTerms: ["fixed-sleep-constraint"], tags: ["alcohol"], readingTimeMin: 1, evidenceTier: "Good"
  }),

  // ============ NUTRITION BASICS ============
  E({
    slug: "calories-energy-balance", title: "Calories, Energy Balance and Maintenance Calories", category: "Nutrition Basics", difficulty: "Basic",
    instantMeaning: "Food energy in vs. energy out.",
    shortDefinition: "Calories are the energy from food; energy balance is calories in versus calories out; maintenance calories is the intake at which bodyweight stays roughly stable.",
    beginnerExplanation: "Calories are the energy you get from food. To gain muscle efficiently you need enough calories above maintenance, but too many can become unnecessary fat gain.",
    whyItMatters: "Energy balance is the single biggest lever over bodyweight trend, independent of any single food choice.",
    projectReacherApplication: "Lean bulk calories should be adjusted based on the weekly bodyweight and waist trend, not fixed forever — see Suggested Calorie Adjustment logic in the Weekly Review.",
    practicalAction: ["Judge calorie adequacy from the 7-day average bodyweight trend, not daily fluctuation."],
    commonMistakes: ["Reacting to a single day's scale weight instead of the weekly trend."],
    relatedTerms: ["seven-day-average", "lean-bulk-dirty-bulk"], tags: ["calories", "energy balance", "maintenance calories", "surplus", "deficit"],
    synonyms: ["calorie surplus", "calorie deficit", "maintenance calories", "energy balance"], readingTimeMin: 2, evidenceTier: "Consensus"
  }),
  E({
    slug: "lean-bulk-dirty-bulk", title: "Lean Bulk vs Dirty Bulk", category: "Nutrition Basics", difficulty: "Basic",
    instantMeaning: "Controlled vs. uncontrolled muscle-gain phases.",
    shortDefinition: "A lean bulk means eating slightly above maintenance to build muscle without gaining fat too quickly; a dirty bulk eats well above maintenance with little regard for fat gain.",
    beginnerExplanation: "A lean bulk means eating slightly above maintenance so you can build muscle without gaining fat too quickly. A dirty bulk trades that control away for faster scale-weight gain, most of which ends up being fat.",
    whyItMatters: "Excess fat gain during a bulk works against the visible, defined physique goal and typically requires a longer cut to reverse later.",
    projectReacherApplication: "The target is roughly +0.25 kg/week, adjusted by waist control and training performance — meaningfully faster than that is drifting toward a dirty bulk.",
    practicalAction: ["Watch weekly rate of gain against the +0.25 kg/week target and adjust calories if it consistently overshoots."],
    commonMistakes: ["Treating 'eating big' as inherently better for muscle gain than a controlled surplus."],
    relatedTerms: ["calories-energy-balance", "weekly-rate-of-gain"], tags: ["lean bulk", "dirty bulk"], synonyms: ["dirty bulk"],
    readingTimeMin: 2, evidenceTier: "Good"
  }),
  E({
    slug: "body-recomposition", title: "Body Recomposition", category: "Nutrition Basics", difficulty: "Intermediate",
    instantMeaning: "Gaining muscle and losing fat at the same time.",
    shortDefinition: "Body recomposition is simultaneously building muscle and losing fat, typically near maintenance calories.",
    beginnerExplanation: "Instead of a clear bulk or cut, bodyweight might barely move while the mix of muscle and fat underneath shifts favourably.",
    whyItMatters: "It's realistic mainly for newer lifters or those returning after time off — the rate of simultaneous gain and loss slows the more trained someone becomes.",
    projectReacherApplication: "At 20 years old and relatively early in training, some recomposition is plausible, but a structured lean bulk is still the primary strategy for this phase.",
    practicalAction: ["Track measurements and photos alongside bodyweight, since the scale alone won't show recomposition."],
    cautionNuance: "Don't expect large recomposition once a lifter is more advanced — it slows down with training experience.",
    relatedTerms: ["lean-gain-quality-score"], tags: ["body recomposition", "recomp"], readingTimeMin: 1, evidenceTier: "Mixed"
  }),
  E({
    slug: "water", title: "Water", category: "Nutrition Basics", difficulty: "Basic",
    instantMeaning: "Hydration for performance and recovery.",
    shortDefinition: "Adequate water intake supports training performance, recovery and accurate bodyweight tracking.",
    beginnerExplanation: "Being under-hydrated can hurt training performance and also makes daily scale weight swing around more, muddying the bodyweight trend.",
    whyItMatters: "Hydration is a hidden variable behind both performance and bodyweight-tracking noise.",
    projectReacherApplication: "Consistent daily hydration habits make the 7-day average bodyweight trend more reliable.",
    practicalAction: ["Keep daily water intake roughly consistent so bodyweight swings reflect real trend, not hydration noise."],
    commonMistakes: ["Comparing today's scale weight to yesterday's without accounting for hydration/sodium differences."],
    relatedTerms: ["seven-day-average", "sodium-electrolytes"], tags: ["water", "hydration"], readingTimeMin: 1, evidenceTier: "Consensus"
  }),
  E({
    slug: "glycogen", title: "Glycogen", category: "Nutrition Basics", difficulty: "Intermediate",
    instantMeaning: "Stored carb fuel in muscle.",
    shortDefinition: "Glycogen is the stored form of carbohydrate in muscle and liver, used as fuel during training.",
    beginnerExplanation: "Think of glycogen as your muscles' fuel tank, filled up by eating carbs and drawn down during hard training.",
    whyItMatters: "Low glycogen from consistently low carb intake can reduce training output, especially on high-volume days.",
    projectReacherApplication: "Adequate carbs, especially around leg day, keep glycogen stores topped up for consistent performance.",
    practicalAction: ["Don't judge morning scale weight swings from glycogen/water shifts as fat gain or loss."],
    relatedTerms: ["carbohydrates"], tags: ["glycogen"], readingTimeMin: 1, evidenceTier: "Consensus"
  }),
  E({
    slug: "muscle-protein-synthesis", title: "Muscle Protein Synthesis", acronym: "MPS", category: "Nutrition Basics", difficulty: "Intermediate",
    instantMeaning: "The process that builds new muscle protein.",
    shortDefinition: "Muscle protein synthesis is the biological process of building new muscle protein, stimulated by resistance training and adequate protein/amino acid intake.",
    beginnerExplanation: "It's the actual 'building' process behind muscle growth — training and protein both stimulate it, and it needs both to be elevated together to drive net muscle gain.",
    whyItMatters: "It's the mechanistic link between 'lift hard' + 'eat enough protein' and actually getting bigger.",
    projectReacherApplication: "Reinforces why both consistent hard training and adequate protein intake are non-negotiable — neither alone is enough.",
    practicalAction: ["Don't rely on protein alone without hard training, or hard training alone without enough protein."],
    relatedTerms: ["protein", "hypertrophy"], tags: ["MPS", "muscle protein synthesis"], readingTimeMin: 1, evidenceTier: "Consensus"
  }),
  E({
    slug: "satiety", title: "Satiety", category: "Nutrition Basics", difficulty: "Basic",
    instantMeaning: "How full and satisfied a meal leaves you.",
    shortDefinition: "Satiety is the feeling of fullness and satisfaction after eating, influenced heavily by protein and fibre content.",
    beginnerExplanation: "Higher-protein, higher-fibre meals tend to keep you fuller for longer, which makes hitting calorie targets consistently easier.",
    whyItMatters: "Poor satiety makes a surplus feel harder to manage and a future cut feel much harder.",
    projectReacherApplication: "Choosing higher-protein, higher-fibre meal options makes it easier to stay consistent with the plan day to day.",
    practicalAction: ["Build meals around a protein source and some fibre-containing carbs/vegetables for better satiety."],
    relatedTerms: ["protein", "fibre"], tags: ["satiety", "fullness"], readingTimeMin: 1, evidenceTier: "Good"
  }),
  E({
    slug: "food-quality", title: "Food Quality: Whole Foods vs Processed Foods", category: "Nutrition Basics", difficulty: "Basic",
    instantMeaning: "Minimally processed food vs highly processed food.",
    shortDefinition: "Whole foods are minimally processed (meat, eggs, rice, vegetables, fruit); processed foods are more refined and often calorie-dense with less micronutrient density.",
    beginnerExplanation: "Both can fit a bulk calorically, but whole foods generally deliver more micronutrients and satiety per calorie than heavily processed foods.",
    whyItMatters: "Food quality affects micronutrient status, satiety and digestion, even when calories and macros are matched.",
    projectReacherApplication: "Building the bulk mostly around whole foods, with some processed convenience foods where useful, supports both performance and micronutrient status.",
    practicalAction: ["Anchor most meals around whole-food protein, carb and vegetable sources."],
    commonMistakes: ["Assuming 'hitting macros' means food quality doesn't matter at all."],
    relatedTerms: ["micronutrients"], tags: ["whole foods", "processed foods", "food quality"],
    synonyms: ["whole foods", "processed foods"], readingTimeMin: 1, evidenceTier: "Good"
  }),
  E({
    slug: "macro-tracking-ai-estimation", title: "Macro Tracking and AI Macro Estimation", category: "Nutrition Basics", difficulty: "Basic",
    instantMeaning: "Estimated macros from a meal description.",
    shortDefinition: "Macro tracking is logging calories/protein/carbs/fat/fibre per meal; AI macro estimation is Project Reacher's local estimate of those macros from a meal description when exact values aren't known.",
    beginnerExplanation: "The app estimates calories, protein, carbs, fat and fibre from what you typed about a meal when you don't have exact packaging numbers.",
    whyItMatters: "Consistent tracking, even estimated, is far more useful for spotting trends than no tracking at all.",
    projectReacherApplication: "Use the estimate as a starting point, then correct it when portion sizes or exact macros are known — see Confidence Score for how sure the app is about a given estimate.",
    practicalAction: ["Correct an estimated meal entry once you know the real numbers, rather than leaving the estimate uncorrected."],
    cautionNuance: "This is a local, rule-based keyword estimate — not a live AI vision or nutrition-database lookup.",
    relatedTerms: ["confidence-score"], tags: ["macro tracking", "AI macro estimation"], synonyms: ["AI macro estimation"],
    readingTimeMin: 2, evidenceTier: "Implementation"
  }),

  // ============ MEAL TIMING ============
  E({
    slug: "meal-timing", title: "Meal Timing: Pre/Post-Workout and Training vs Rest Days", category: "Meal Timing", difficulty: "Intermediate",
    instantMeaning: "When you eat, on top of what you eat.",
    shortDefinition: "Nutrient timing covers pre-workout meals (fuel for the session), post-workout meals (kick-starting recovery), and adjusting intake between training days and rest days.",
    beginnerExplanation: "A pre-workout meal is mostly about having enough carbs/energy on board to train well. A post-workout meal starts the recovery process. Neither has to be perfectly timed to the minute — daily totals matter far more.",
    whyItMatters: "Total daily calories and protein matter far more than exact timing, but a poorly timed pre-workout meal (too heavy, too soon, too fibrous) can genuinely hurt a session.",
    projectReacherApplication: "Favour a carb-containing, moderate-protein, lower-fibre meal 1-3 hours before training; total daily protein matters more than a strict post-workout window.",
    practicalAction: ["Eat a lighter, carb-inclusive meal before training rather than skipping or overeating right before a session."],
    commonMistakes: ["Overclaiming a narrow 'anabolic window' that must be hit within minutes of finishing a set."],
    relatedTerms: ["carbohydrates", "protein"], tags: ["meal timing", "pre-workout meal", "post-workout meal", "training-day nutrition", "rest-day nutrition"],
    synonyms: ["pre-workout meal", "post-workout meal", "training-day nutrition", "rest-day nutrition", "nutrient timing"],
    readingTimeMin: 2, evidenceTier: "Good"
  }),
  E({
    slug: "confidence-score", title: "Confidence Score (Meal Tracking)", category: "Meal Timing", difficulty: "Basic",
    instantMeaning: "How sure the app is about an estimated meal.",
    shortDefinition: "The confidence score/pill shows how reliable a given meal's AI-estimated macros are likely to be, based on how specific the meal description was.",
    beginnerExplanation: "A high-confidence estimate came from a clear, specific meal description; a low-confidence one came from something vague, and is worth double-checking.",
    whyItMatters: "Not all estimates are equally trustworthy — the confidence score tells you where to spend correction effort.",
    projectReacherApplication: "Manually correct low-confidence meal entries when you know the real portion/brand, so downstream weekly nutrition trends stay accurate.",
    practicalAction: ["Add more detail (brand, portion size, cooking method) to raise estimate confidence for repeat meals."],
    relatedTerms: ["macro-tracking-ai-estimation"], tags: ["confidence score", "manually corrected meal entries"],
    synonyms: ["manually corrected meal entries"], readingTimeMin: 1, evidenceTier: "Implementation"
  }),

  // ============ MICRONUTRIENTS ============
  E({
    slug: "micronutrients", title: "Micronutrients", category: "Micronutrients", difficulty: "Basic",
    instantMeaning: "Vitamins and minerals.",
    shortDefinition: "Micronutrients are vitamins and minerals needed in smaller amounts that support the body's day-to-day function.",
    beginnerExplanation: "Micronutrients are nutrients needed in smaller amounts that help the body run properly.",
    whyItMatters: "They support the system behind performance and recovery, even though they don't directly add muscle the way calories and protein do.",
    projectReacherApplication: "A varied, mostly whole-food diet during the bulk should cover most micronutrient needs without needing to obsess over each one individually.",
    practicalAction: ["Eat a varied diet with vegetables, fruit and diverse protein sources rather than relying on the same few foods."],
    commonMistakes: ["Assuming a multivitamin can fully substitute for a poor-quality diet."],
    relatedTerms: ["food-quality", "vitamins-minerals"], tags: ["micronutrients", "vitamins", "minerals"], readingTimeMin: 1, evidenceTier: "Consensus"
  }),
  E({
    slug: "vitamins-minerals", title: "Vitamins and Minerals (Overview)", category: "Micronutrients", difficulty: "Basic",
    instantMeaning: "Two broad micronutrient categories.",
    shortDefinition: "Vitamins are organic compounds the body needs in small amounts (e.g. vitamin D); minerals are inorganic elements the body needs (e.g. magnesium, zinc, iron).",
    beginnerExplanation: "Both support processes like energy production, immune function, bone health, hormone function and recovery.",
    whyItMatters: "Deficiencies in either category can quietly impair recovery, energy, or training performance.",
    projectReacherApplication: "Rather than supplementing broadly, aim for a varied diet first and use bloodwork to identify any specific gap worth addressing.",
    practicalAction: ["Get bloodwork done periodically if energy, recovery or performance seem off for no clear reason."],
    relatedTerms: ["micronutrients", "deficiency-bloodwork"], tags: ["vitamins", "minerals"], readingTimeMin: 1, evidenceTier: "Consensus"
  }),
  E({
    slug: "vitamin-d", title: "Vitamin D", category: "Micronutrients", difficulty: "Basic",
    instantMeaning: "Sunlight vitamin, relevant to bone and hormone health.",
    shortDefinition: "Vitamin D supports bone health, immune function and normal hormone regulation, and is commonly low in people who get limited sun exposure.",
    beginnerExplanation: "It's made in skin from sunlight, so people who spend most of their time indoors are commonly a bit low.",
    whyItMatters: "Low vitamin D status is common and can affect general wellbeing and hormone function.",
    projectReacherApplication: "Worth checking via bloodwork given a training/business schedule that may limit outdoor time; supplementing is low-risk if levels are actually low.",
    practicalAction: ["Get vitamin D checked via bloodwork before assuming supplementation is needed."],
    relatedTerms: ["vitamins-minerals", "deficiency-bloodwork"], tags: ["vitamin D"], readingTimeMin: 1, evidenceTier: "Consensus"
  }),
  E({
    slug: "magnesium-zinc", title: "Magnesium and Zinc", category: "Micronutrients", difficulty: "Basic",
    instantMeaning: "Two minerals commonly discussed for recovery and sleep.",
    shortDefinition: "Magnesium supports muscle relaxation, sleep quality and nervous system function; zinc supports immune function and normal hormone regulation.",
    beginnerExplanation: "Both are involved in recovery-adjacent processes, and both are commonly under-consumed relative to needs.",
    whyItMatters: "Low intake of either can compound with an already tight sleep schedule to make recovery feel worse than it should.",
    projectReacherApplication: "Worth prioritising food sources (nuts, seeds, shellfish, leafy greens) first; magnesium glycinate is a reasonable supplement option, especially around sleep.",
    practicalAction: ["Include magnesium/zinc-rich foods regularly rather than relying only on a multivitamin."],
    cautionNuance: "Do not treat either as a testosterone-boosting supplement — that claim is not well supported.",
    relatedTerms: ["magnesium-glycinate-glycine"], tags: ["magnesium", "zinc"], synonyms: ["magnesium", "zinc"],
    readingTimeMin: 1, evidenceTier: "Mixed"
  }),
  E({
    slug: "iron-calcium-potassium", title: "Iron, Calcium and Potassium", category: "Micronutrients", difficulty: "Basic",
    instantMeaning: "Minerals for blood, bone and muscle function.",
    shortDefinition: "Iron supports oxygen transport in blood, calcium supports bone and muscle contraction, potassium supports fluid balance and muscle/nerve function.",
    beginnerExplanation: "All three support basic physiological functions that underpin training capacity and recovery.",
    whyItMatters: "Deficiency in any of these (iron especially) can present as fatigue that's easy to mistake for a training or sleep problem.",
    projectReacherApplication: "If fatigue or performance drop for no clear reason despite good training/sleep/nutrition habits, bloodwork covering these is a reasonable next step.",
    practicalAction: ["Eat a varied diet including red meat/legumes (iron), dairy or fortified alternatives (calcium), and fruit/vegetables (potassium)."],
    relatedTerms: ["deficiency-bloodwork"], tags: ["iron", "calcium", "potassium"], synonyms: ["iron", "calcium", "potassium"],
    readingTimeMin: 1, evidenceTier: "Consensus"
  }),
  E({
    slug: "sodium-electrolytes", title: "Sodium and Electrolyte Balance", category: "Micronutrients", difficulty: "Basic",
    instantMeaning: "Salt and fluid balance minerals.",
    shortDefinition: "Sodium and other electrolytes (potassium, magnesium) regulate fluid balance and muscle/nerve function, and directly affect day-to-day scale-weight fluctuation.",
    beginnerExplanation: "A higher-sodium meal pulls in extra water, which shows up on the scale the next day — that's water, not fat.",
    whyItMatters: "Understanding this stops sodium-driven weight swings from being misread as sudden fat gain.",
    projectReacherApplication: "This is part of why Project Reacher uses a 7-day average bodyweight trend instead of any single day's number.",
    practicalAction: ["Don't panic over a single high scale-weight day after a salty meal — check the 7-day trend instead."],
    relatedTerms: ["seven-day-average", "water"], tags: ["sodium", "electrolytes", "electrolyte balance"],
    synonyms: ["sodium", "electrolytes"], readingTimeMin: 1, evidenceTier: "Consensus"
  }),
  E({
    slug: "omega-3s", title: "Omega-3s", category: "Micronutrients", difficulty: "Basic",
    instantMeaning: "Anti-inflammatory essential fats.",
    shortDefinition: "Omega-3 fatty acids (EPA/DHA) support general health, joint comfort and cardiovascular health.",
    beginnerExplanation: "Found in oily fish, and commonly supplemented if fish intake is low.",
    whyItMatters: "Useful general health support, and may help with joint comfort during heavier training phases.",
    projectReacherApplication: "A reasonable low-priority addition to the supplement stack if oily fish intake is low, well behind training, food, sleep and creatine in priority.",
    practicalAction: ["Prioritise 1-2 oily fish meals a week before considering a supplement."],
    relatedTerms: ["fats"], tags: ["omega-3", "fish oil"], readingTimeMin: 1, evidenceTier: "Good"
  }),
  E({
    slug: "deficiency-bloodwork", title: "Deficiency and Bloodwork", category: "Micronutrients", difficulty: "Intermediate",
    instantMeaning: "How to actually know if something is low.",
    shortDefinition: "A deficiency is a below-normal level of a nutrient or hormone; bloodwork is the only reliable way to confirm one rather than guessing from symptoms alone.",
    beginnerExplanation: "Fatigue, poor recovery or low motivation could be from many causes — sleep, calories, training load, or an actual nutrient deficiency. Bloodwork is what actually tells you which.",
    whyItMatters: "Guessing at supplements without bloodwork risks wasting money or masking a real underlying issue.",
    projectReacherApplication: "If recovery markers stay poor for weeks despite good training/food/sleep habits, periodic bloodwork is a more useful next step than adding more supplements.",
    practicalAction: ["Use bloodwork to confirm a suspected deficiency before supplementing specifically for it."],
    cautionNuance: "This app cannot diagnose a deficiency or hormone status — only bloodwork with a professional can.",
    relatedTerms: ["high-responder"], tags: ["deficiency", "bloodwork"], synonyms: ["bloodwork"], readingTimeMin: 1, evidenceTier: "Consensus"
  }),

  // ============ RECOVERY ============
  E({
    slug: "recovery", title: "Recovery", category: "Recovery", difficulty: "Basic",
    instantMeaning: "How well your body bounces back between sessions.",
    shortDefinition: "Recovery is the body's process of repairing and adapting after training stress, shaped by sleep, nutrition, stress and training load.",
    beginnerExplanation: "Training breaks the body down slightly; recovery is what builds it back up stronger. Without enough recovery, training stress just accumulates as fatigue.",
    whyItMatters: "Under-recovery is one of the most common hidden reasons progress stalls, even when training and diet look fine on paper.",
    projectReacherApplication: "Recovery should be judged through performance, soreness, motivation, resting heart rate, appetite and trend data — not any single number.",
    practicalAction: ["Log recovery scores consistently so a real trend, not a single bad day, drives any decisions."],
    commonMistakes: ["Reacting to one poor recovery log instead of looking at the trend across several sessions."],
    relatedTerms: ["fatigue", "fixed-sleep-constraint"], tags: ["recovery"], readingTimeMin: 2, evidenceTier: "Consensus"
  }),
  E({
    slug: "recovery-energy-soreness-scores", title: "Recovery Score, Energy Score and Soreness Score", category: "Recovery", difficulty: "Basic",
    instantMeaning: "The 1-5 ratings logged after each recovery check-in.",
    shortDefinition: "Recovery Score, Energy Score and Soreness Score are 1-5 self-ratings logged per recovery entry, used together to judge overall training readiness.",
    beginnerExplanation: "Recovery Score is how recovered you generally feel; Energy Score is how much energy/drive you have; Soreness Score is how sore muscles still feel from recent training.",
    whyItMatters: "Together they're the main inputs the app uses to flag recovery red flags in the Weekly Review.",
    projectReacherApplication: "Consistently low Recovery/Energy scores, or high Soreness scores, trigger a warning banner suggesting volume or intensity may need a temporary reduction.",
    practicalAction: ["Log these honestly and consistently, even on 'boring' good days, so the trend is meaningful."],
    relatedTerms: ["recovery", "deload-readiness"], tags: ["recovery score", "energy score", "soreness score"],
    synonyms: ["recovery score", "energy score", "soreness score"], readingTimeMin: 1, evidenceTier: "Implementation"
  }),
  E({
    slug: "appetite-motivation-stress", title: "Recovery Signals: Appetite, Motivation and Stress", category: "Recovery", difficulty: "Intermediate",
    instantMeaning: "Softer signals worth watching alongside the hard numbers.",
    shortDefinition: "Appetite, motivation and stress are qualitative recovery signals — sudden appetite loss, low training motivation, or elevated life stress can all indicate under-recovery even before performance drops.",
    beginnerExplanation: "If you're suddenly not hungry, dreading training you normally enjoy, or under unusual stress, that's useful recovery information even without a number attached.",
    whyItMatters: "These signals often show up before objective performance actually drops, giving an earlier warning than waiting for weights to fall.",
    projectReacherApplication: "Worth noting in the Notes field on a check-in even outside of the standard scored fields — context helps interpret a dip in the numbers.",
    practicalAction: ["Note unusual stress or appetite changes even when the numeric scores still look fine."],
    relatedTerms: ["recovery-energy-soreness-scores"], tags: ["appetite", "motivation", "stress"], synonyms: ["appetite", "motivation", "stress"],
    readingTimeMin: 1, evidenceTier: "Good"
  }),
  E({
    slug: "joint-stress", title: "Joint Stress", category: "Recovery", difficulty: "Basic",
    instantMeaning: "Cumulative strain on joints from training.",
    shortDefinition: "Joint stress is the cumulative mechanical strain on joints and connective tissue from repeated heavy training.",
    beginnerExplanation: "Muscles typically recover faster than tendons and joints — joint stress can build up quietly even while muscle recovery looks fine.",
    whyItMatters: "Ignoring building joint stress is a common path to a nagging injury that then derails training for weeks.",
    projectReacherApplication: "Pain flags on any exercise should be taken seriously even if muscular recovery scores look otherwise fine.",
    practicalAction: ["Treat a nagging ache in the same joint across multiple sessions as a signal to deload that movement, not push through."],
    relatedTerms: ["pain-vs-discomfort", "tendon-irritation-technique-breakdown"], tags: ["joint stress"], readingTimeMin: 1, evidenceTier: "Good"
  }),

  // ============ SLEEP & FATIGUE ============
  E({
    slug: "sleep-quality", title: "Sleep and Sleep Quality", category: "Sleep & Fatigue", difficulty: "Basic",
    instantMeaning: "How much you sleep, and how good that sleep is.",
    shortDefinition: "Sleep duration is total hours slept; sleep quality reflects how restorative that sleep was, independent of raw hours.",
    beginnerExplanation: "Two nights of the same length can leave you feeling very differently recovered — quality (fewer wake-ups, consistent timing, a wind-down routine) matters alongside duration.",
    whyItMatters: "When duration is fixed and can't easily be extended, improving quality is the main lever left.",
    projectReacherApplication: "Logged as sleep duration and a 1-5 sleep quality score per recovery entry — both are tracked so quality trends are visible even while duration stays capped.",
    practicalAction: ["Try a consistent wind-down routine and consistent sleep/wake times to improve quality within a fixed duration."],
    relatedTerms: ["fixed-sleep-constraint"], tags: ["sleep", "sleep quality"], synonyms: ["sleep quality"], readingTimeMin: 1, evidenceTier: "Consensus"
  }),
  E({
    slug: "fixed-sleep-constraint", title: "Fixed Sleep Constraint", category: "Sleep & Fatigue", difficulty: "Intermediate",
    instantMeaning: "Sleep is limited, so recovery must be monitored differently.",
    shortDefinition: "A fixed sleep constraint is a real-world limit on sleep duration (here, 5-6 hours/night due to business workload) that training and recovery decisions have to be planned around rather than wished away.",
    beginnerExplanation: "The user cannot currently extend sleep to 8 hours, so the app watches recovery through performance, energy, soreness, mood, appetite and trend data instead of assuming sleep alone will fix everything.",
    whyItMatters: "Repeatedly telling someone with a genuine constraint to 'just sleep more' isn't useful — the app instead needs to detect when the constraint is genuinely limiting progress.",
    projectReacherApplication: "If strength and recovery stay strong, the plan can continue as-is. If several recovery markers drop together, training volume may need to be reduced temporarily rather than pushing through.",
    practicalAction: ["Focus on sleep quality levers (consistency, wind-down, reduced late stimulant use) within the available window.", "Watch multi-week trends in recovery/performance rather than expecting sleep hours themselves to change."],
    cautionNuance: "This is a monitoring strategy, not a substitute for more sleep if circumstances ever allow it.",
    relatedTerms: ["sleep-quality", "recovery"], tags: ["fixed sleep constraint", "sleep"], readingTimeMin: 2, evidenceTier: "Implementation"
  }),
  E({
    slug: "fatigue", title: "Fatigue: Central and Peripheral", category: "Sleep & Fatigue", difficulty: "Advanced",
    instantMeaning: "Two different sources of feeling 'tired' in training.",
    shortDefinition: "Central fatigue is nervous-system-level tiredness affecting drive and coordination; peripheral fatigue is fatigue local to the working muscle itself.",
    beginnerExplanation: "Central fatigue can make even light training feel mentally heavy; peripheral fatigue is the specific muscle feeling worked/weak from recent training.",
    whyItMatters: "They respond to different fixes — central fatigue often needs sleep/stress management, peripheral fatigue often just needs time and normal recovery.",
    projectReacherApplication: "Widespread low performance across unrelated exercises suggests central fatigue; a single muscle underperforming suggests local (peripheral) fatigue from recent volume there.",
    practicalAction: ["If everything feels heavy, look at sleep/stress first; if one specific area underperforms, look at recent volume for that muscle."],
    relatedTerms: ["recovery", "deload-readiness"], tags: ["fatigue", "central fatigue", "peripheral fatigue"],
    synonyms: ["central fatigue", "peripheral fatigue"], readingTimeMin: 2, evidenceTier: "Good"
  }),
  E({
    slug: "soreness-doms", title: "Soreness / DOMS", acronym: "Delayed Onset Muscle Soreness", category: "Sleep & Fatigue", difficulty: "Basic",
    instantMeaning: "Muscle soreness after training.",
    shortDefinition: "DOMS is delayed-onset muscle soreness, typically peaking 24-72 hours after unfamiliar or high-stress training.",
    beginnerExplanation: "The stiff, sore feeling a day or two after training, especially after something new or unusually hard.",
    whyItMatters: "Soreness is not a reliable measure of how effective a session was — plenty of highly effective sessions produce little soreness once you're used to a movement.",
    projectReacherApplication: "Soreness Score is logged, but progression decisions should be based on RPE/RIR/reps/form, not on how sore you felt.",
    practicalAction: ["Don't chase soreness as a goal, and don't worry if a hard session produces less soreness than expected."],
    commonMistakes: ["Assuming no soreness means the session was ineffective."],
    relatedTerms: ["pump-metabolic-stress-muscle-damage"], tags: ["DOMS", "soreness"], synonyms: ["DOMS"], readingTimeMin: 1, evidenceTier: "Good"
  }),
  E({
    slug: "readiness-rhr", title: "Readiness and Resting Heart Rate", category: "Sleep & Fatigue", difficulty: "Intermediate",
    instantMeaning: "How prepared your body is to train hard today.",
    shortDefinition: "Readiness is an overall sense of how prepared the body is to train hard; resting heart rate (RHR), if tracked, can be a supporting signal — an elevated RHR versus your normal baseline can suggest incomplete recovery.",
    beginnerExplanation: "Readiness combines sleep, soreness, motivation and energy into a general sense of 'can I push hard today.'",
    whyItMatters: "Training at the planned intensity on a genuinely low-readiness day often produces a worse, higher-risk session than adjusting slightly.",
    projectReacherApplication: "Low readiness across several logged signals is one of the inputs behind the app's recovery warning banners.",
    practicalAction: ["On a low-readiness day, consider keeping the same exercises but adjusting expectations rather than skipping entirely."],
    relatedTerms: ["recovery-energy-soreness-scores"], tags: ["readiness", "resting heart rate"], synonyms: ["resting heart rate"],
    readingTimeMin: 1, evidenceTier: "Good"
  }),
  E({
    slug: "deload-readiness", title: "Deload Readiness, Performance Drop-Off and Set 2 Drop-Off", category: "Sleep & Fatigue", difficulty: "Intermediate",
    instantMeaning: "Signals that it might be time to back off.",
    shortDefinition: "Performance drop-off is a decline in logged reps/weight versus recent sessions; Set 2 drop-off specifically is when the second working set falls well short of the first, more than expected; deload readiness is the overall signal that a lighter week may be warranted.",
    beginnerExplanation: "If your second working set is consistently much weaker than expected relative to your first, or several exercises show declining numbers over consecutive sessions, that's a sign accumulated fatigue may need a deload.",
    whyItMatters: "Recognising this early prevents a small dip from turning into weeks of poor sessions or an injury.",
    projectReacherApplication: "The app flags repeated below-range performance across recent logged sessions of an exercise as a fatigue signal worth reviewing.",
    practicalAction: ["If drop-off is consistent across multiple exercises over 2+ weeks, consider a deload week at reduced volume/intensity."],
    relatedTerms: ["adaptation-overreaching-deload-plateau", "rest-periods"], tags: ["deload readiness", "performance drop-off", "set 2 drop-off"],
    synonyms: ["performance drop-off", "set 2 drop-off"], readingTimeMin: 2, evidenceTier: "Implementation"
  }),

  // ============ STIMULANTS ============
  E({
    slug: "caffeine", title: "Caffeine", category: "Stimulants", difficulty: "Basic",
    instantMeaning: "The main pre-training performance stimulant.",
    shortDefinition: "Caffeine is a stimulant that can improve focus, perceived energy and short-term training performance, dosed and timed carefully.",
    beginnerExplanation: "A moderate dose 30-60 minutes before training can genuinely improve focus and output — but more isn't automatically better, and using it too late in the day can eat into sleep.",
    sportsScienceExplanation: "Typical effective doses are roughly 3-6 mg/kg bodyweight; tolerance builds with regular use, reducing benefit over time; caffeine's half-life (~5 hours) means afternoon/evening doses can measurably impair sleep onset and quality.",
    whyItMatters: "Used well it's genuinely useful; used carelessly (too late, too high a dose, too often) it quietly erodes the already-tight sleep budget.",
    projectReacherApplication: "Track caffeine timing relative to training and to bedtime — with a fixed 5-6 hour sleep window, late-day caffeine is a higher-cost mistake than it would be for someone sleeping 8 hours.",
    practicalAction: ["Keep caffeine intake earlier in the day where possible.", "Track dose so tolerance build-up is visible rather than just 'needing more' over time."],
    commonMistakes: ["Assuming more caffeine always means more performance.", "Using caffeine late in the day without connecting it to that night's poor sleep."],
    relatedTerms: ["stimulants-tolerance", "fixed-sleep-constraint"], tags: ["caffeine", "stimulants", "pre-workout"],
    synonyms: ["caffeine dose", "pre-workout timing"], readingTimeMin: 2, evidenceTier: "Good"
  }),
  E({
    slug: "nicotine", title: "Nicotine", category: "Stimulants", difficulty: "Intermediate",
    instantMeaning: "A stimulant that can mask fatigue rather than fix it.",
    shortDefinition: "Nicotine is a stimulant that can produce a subjective focus/performance boost, but carries dependence risk and does not aid recovery.",
    beginnerExplanation: "It can feel focusing or performance-enhancing before training, but it isn't doing anything to help the body actually recover — and it comes with real dependence and health risks.",
    whyItMatters: "It's easy to mistake feeling 'switched on' from nicotine for being genuinely recovered and ready, which can lead to pushing through a session the body wasn't actually ready for.",
    projectReacherApplication: "The app does not promote nicotine use. Its use before training is logged as a stimulant like caffeine so its relationship with recovery data can be tracked honestly, not to encourage it.",
    practicalAction: ["If used, be honest that it's masking fatigue rather than resolving it, and weigh it against recovery trend data, not just how a session felt."],
    cautionNuance: "This app does not recommend starting or continuing nicotine use. It carries dependence and health risks and is not a recovery tool.",
    relatedTerms: ["masked-fatigue"], tags: ["nicotine", "stimulants"], readingTimeMin: 2, evidenceTier: "Low"
  }),
  E({
    slug: "stimulants-tolerance", title: "Stimulants and Tolerance", category: "Stimulants", difficulty: "Basic",
    instantMeaning: "Needing more over time for the same effect.",
    shortDefinition: "Tolerance is the reduced response to a given dose of a stimulant after repeated regular use, driving many users to increase dose over time.",
    beginnerExplanation: "The same coffee that used to feel like a big lift can stop doing much after weeks of daily use — that's tolerance building.",
    whyItMatters: "Escalating dose to chase the original effect increases sleep and dependence risk without necessarily improving performance further.",
    projectReacherApplication: "Occasional lower-stimulant days (or periodic breaks) can help keep the effective dose lower and the sleep cost smaller.",
    practicalAction: ["Consider periodic breaks from daily stimulant use to reset tolerance."],
    relatedTerms: ["caffeine"], tags: ["tolerance", "stimulants"], readingTimeMin: 1, evidenceTier: "Good"
  }),
  E({
    slug: "masked-fatigue", title: "Masked Fatigue and Performance vs Recovery", category: "Stimulants", difficulty: "Intermediate",
    instantMeaning: "Feeling ready while still under-recovered.",
    shortDefinition: "Masked fatigue is when a stimulant makes you feel more switched on without actually improving underlying recovery — performance can look fine short-term while recovery quietly degrades.",
    beginnerExplanation: "Stimulants can make you feel more switched on without actually fixing recovery underneath.",
    whyItMatters: "Relying on stimulants to push through consistently poor recovery data risks accumulating fatigue and eventually injury, even while sessions still 'feel' okay.",
    projectReacherApplication: "The app should compare stimulant use against sleep, performance and recovery trends — a good session on high stimulant use with declining recovery scores is a flag, not a green light.",
    practicalAction: ["If recovery scores are trending down, don't let a stimulant-boosted 'good session' override that signal."],
    cautionNuance: "Late-day stimulant use compounds this by also cutting into the sleep needed to actually recover.",
    relatedTerms: ["caffeine", "nicotine", "recovery"], tags: ["masked fatigue", "late-day stimulant impact"],
    synonyms: ["late-day stimulant impact"], readingTimeMin: 2, evidenceTier: "Good"
  }),

  // ============ SUPPLEMENTS ============
  E({
    slug: "supplement-hierarchy", title: "Supplement Hierarchy", category: "Supplements", difficulty: "Basic",
    instantMeaning: "What actually matters, in order.",
    shortDefinition: "The supplement hierarchy ranks where effort is best spent: training, food and sleep quality/consistency first; creatine as the strongest core supplement; protein powders as convenience; caffeine managed carefully; a handful of situational extras after that.",
    beginnerExplanation: "1) Training, food, sleep quality and consistency come first — no supplement replaces these. 2) Creatine is the strongest evidence-based supplement. 3) Whey/casein are just convenient protein, not magic. 4) Caffeine helps but needs managing. 5) Citrulline, beta-alanine, magnesium, glycine, omega-3, vitamin D and electrolytes may help depending on context. 6) Ashwagandha is optional, framed cautiously. HMB is not necessary.",
    whyItMatters: "Supplement marketing routinely inverts this order — this hierarchy keeps effort and money pointed at what actually moves the needle.",
    projectReacherApplication: "Before adding any new supplement, check whether training consistency, calorie/protein targets, and sleep quality are actually being hit first.",
    practicalAction: ["Fix training, food and sleep consistency before adding supplements.", "Start with creatine if adding just one supplement."],
    commonMistakes: ["Adding several supplements at once while training/food/sleep basics are still inconsistent."],
    relatedTerms: ["creatine-monohydrate"], tags: ["supplement hierarchy", "evidence-based supplements", "optional supplements"],
    synonyms: ["evidence-based supplements", "optional supplements"], readingTimeMin: 2, evidenceTier: "Consensus"
  }),
  E({
    slug: "creatine-monohydrate", title: "Creatine Monohydrate", category: "Supplements", difficulty: "Basic",
    instantMeaning: "The single strongest evidence-based supplement.",
    shortDefinition: "Creatine monohydrate increases available cellular energy for short, intense efforts and supports strength and muscle gain when combined with training.",
    beginnerExplanation: "It helps muscles produce a bit more short-burst energy, which over time supports slightly better strength and size gains from training.",
    whyItMatters: "It's one of the most well-studied and consistently effective supplements in all of sports nutrition.",
    projectReacherApplication: "A reasonable daily addition to the plan — most useful when taken consistently every day rather than only on training days.",
    practicalAction: ["Take roughly 3-5g daily, consistently, rather than only around workouts.", "Drink enough water alongside it."],
    commonMistakes: ["Doing an unnecessary 'loading phase' — consistent daily dosing works without it.", "Stopping and restarting frequently instead of just taking it daily."],
    relatedTerms: ["supplement-hierarchy"], tags: ["creatine"], readingTimeMin: 2, evidenceTier: "Consensus"
  }),
  E({
    slug: "whey-casein-protein", title: "Whey and Casein Protein", category: "Supplements", difficulty: "Basic",
    instantMeaning: "Convenient protein powders, not magic.",
    shortDefinition: "Whey is a fast-digesting milk protein, useful for convenient protein intake around training; casein is a slow-digesting milk protein, sometimes used before bed for a slower amino acid release overnight.",
    beginnerExplanation: "Both are just convenient ways to hit a daily protein target — neither is inherently better for muscle growth than an equivalent amount of protein from food.",
    whyItMatters: "They exist to solve a logistics problem (hitting protein targets conveniently), not to provide a unique growth benefit food doesn't.",
    projectReacherApplication: "Useful for closing a protein gap on busy days, especially relevant given 140g/day is currently the target and total daily protein is what matters most.",
    practicalAction: ["Use whey/casein to close gaps toward the daily protein target, not as a replacement for whole-food meals generally."],
    commonMistakes: ["Believing protein powder builds muscle faster than the same grams of protein from food."],
    relatedTerms: ["protein"], tags: ["whey protein", "casein protein"], synonyms: ["whey protein", "casein protein"],
    readingTimeMin: 1, evidenceTier: "Consensus"
  }),
  E({
    slug: "citrulline-malate", title: "Citrulline Malate", category: "Supplements", difficulty: "Intermediate",
    instantMeaning: "A pump/endurance-focused pre-workout ingredient.",
    shortDefinition: "Citrulline malate may modestly improve blood flow and reduce fatigue during higher-rep training, commonly dosed around 6-8g pre-workout.",
    beginnerExplanation: "Sometimes used for the 'pump' feeling and to push out a few extra reps on higher-rep sets.",
    whyItMatters: "Effects are generally modest — it's a reasonable optional addition, not a core priority.",
    projectReacherApplication: "Optional; only worth considering once training, food, sleep, creatine and caffeine are already dialled in.",
    practicalAction: ["Dose roughly 6-8g, 30-60 minutes pre-workout, if using it."],
    relatedTerms: ["supplement-hierarchy"], tags: ["citrulline malate"], readingTimeMin: 1, evidenceTier: "Mixed"
  }),
  E({
    slug: "beta-alanine", title: "Beta-Alanine", category: "Supplements", difficulty: "Intermediate",
    instantMeaning: "A supplement for higher-rep set endurance.",
    shortDefinition: "Beta-alanine buffers muscle acidity, potentially helping performance in sets lasting roughly 1-4 minutes (higher-rep training).",
    beginnerExplanation: "Most useful for higher-rep isolation work where muscular burn is the limiting factor, less relevant for low-rep heavy compounds.",
    whyItMatters: "A common, mild, harmless tingling sensation (paresthesia) is a normal side effect, not a warning sign.",
    projectReacherApplication: "Optional; may help slightly on the program's higher-rep isolation work (e.g. calf raises, lateral raises).",
    practicalAction: ["Dose roughly 3.2-6.4g/day, split across the day to reduce tingling if it's bothersome."],
    relatedTerms: ["supplement-hierarchy"], tags: ["beta-alanine"], readingTimeMin: 1, evidenceTier: "Good"
  }),
  E({
    slug: "magnesium-glycinate-glycine", title: "Magnesium Glycinate and Glycine", category: "Supplements", difficulty: "Intermediate",
    instantMeaning: "Sleep-adjacent supplement options.",
    shortDefinition: "Magnesium glycinate is a well-absorbed magnesium form sometimes used to support sleep and muscle relaxation; glycine is an amino acid with some evidence for improving sleep quality.",
    beginnerExplanation: "Both are sometimes taken before bed with the goal of improving sleep quality — relevant given the fixed sleep duration constraint, where quality is the main lever left.",
    whyItMatters: "Given sleep duration can't easily be extended, anything that reasonably improves sleep quality is worth considering.",
    projectReacherApplication: "A reasonable, low-risk addition to try given the fixed sleep constraint — track subjective sleep quality score to see if it actually helps.",
    practicalAction: ["Trial one at a time (not both simultaneously) so you can tell whether it's actually helping sleep quality."],
    cautionNuance: "Evidence for sleep benefits is promising but not as strong as creatine's evidence for performance.",
    relatedTerms: ["fixed-sleep-constraint", "magnesium-zinc"], tags: ["magnesium glycinate", "glycine"],
    synonyms: ["magnesium glycinate", "glycine"], readingTimeMin: 2, evidenceTier: "Mixed"
  }),
  E({
    slug: "multivitamin", title: "Multivitamin", category: "Supplements", difficulty: "Basic",
    instantMeaning: "A broad micronutrient safety net.",
    shortDefinition: "A multivitamin provides a broad, low-dose spread of vitamins and minerals as a general safety net against small dietary gaps.",
    beginnerExplanation: "Not a performance supplement — more of an insurance policy against a diet that isn't perfectly varied every day.",
    whyItMatters: "Low priority compared to training, food, sleep and creatine, but a reasonable, low-risk addition.",
    projectReacherApplication: "Optional; more useful as a backstop than as a core part of the plan.",
    practicalAction: ["Don't rely on a multivitamin to compensate for a genuinely poor diet."],
    relatedTerms: ["micronutrients", "supplement-hierarchy"], tags: ["multivitamin"], readingTimeMin: 1, evidenceTier: "Mixed"
  }),
  E({
    slug: "ashwagandha", title: "Ashwagandha", category: "Supplements", difficulty: "Intermediate",
    instantMeaning: "A stress-adaptogen supplement with mixed evidence.",
    shortDefinition: "Ashwagandha is an adaptogenic herb with some evidence for reducing perceived stress and possibly modestly supporting strength/recovery, though evidence quality is mixed.",
    beginnerExplanation: "Marketed heavily for stress and testosterone support — the stress-related evidence is more consistent than the hormone claims, which are often overstated.",
    whyItMatters: "It's genuinely optional and should be framed cautiously rather than as a must-have.",
    projectReacherApplication: "Lowest-priority optional addition; not a substitute for addressing the fixed sleep constraint directly.",
    practicalAction: ["Treat it as optional and low-priority rather than essential to the stack."],
    cautionNuance: "Do not use ashwagandha (or any supplement) as a substitute for addressing sleep, training or nutrition consistency, and do not treat it as a confirmed testosterone booster without bloodwork.",
    relatedTerms: ["supplement-hierarchy"], tags: ["ashwagandha"], readingTimeMin: 1, evidenceTier: "Mixed"
  }),

  // ============ BODY COMPOSITION ============
  E({
    slug: "bodyweight-vs-physique", title: "Bodyweight and Scale Weight vs Physique", category: "Body Composition", difficulty: "Basic",
    instantMeaning: "The scale doesn't show the full picture.",
    shortDefinition: "Bodyweight is the number on the scale; physique (measurements, photos, visible muscle/fat) is what actually reflects progress toward the goal — the two can diverge, especially during recomposition.",
    beginnerExplanation: "Two people at the same bodyweight can look completely different — the scale alone can't tell muscle from fat, or where either is distributed.",
    whyItMatters: "Over-focusing on scale weight alone can lead to poor decisions (e.g. cutting too early because the scale 'stalled' while the physique was actually still improving).",
    projectReacherApplication: "Track bodyweight trend alongside measurements and progress photos — Project Reacher's targets are ultimately about proportions (shoulder-to-waist ratio, arm/chest/neck size), not a specific scale number alone.",
    practicalAction: ["Review measurements and photos monthly alongside the weekly bodyweight trend."],
    commonMistakes: ["Judging progress from the scale alone and ignoring measurements/photos."],
    relatedTerms: ["seven-day-average", "progress-photos"], tags: ["bodyweight", "scale weight"], readingTimeMin: 1, evidenceTier: "Consensus"
  }),
  E({
    slug: "abs-visibility", title: "Abs Visibility", category: "Body Composition", difficulty: "Basic",
    instantMeaning: "How visible ab definition is at a given body fat level.",
    shortDefinition: "Abs visibility depends primarily on body fat percentage and genetics, and to a lesser extent on ab muscle development itself.",
    beginnerExplanation: "Visible abs mostly come from being lean enough — the ab muscle itself doesn't need to be huge to show, just the fat layer over it needs to be thin enough.",
    whyItMatters: "It's a useful visual gauge of body fat trend during a lean bulk without needing precise body fat testing.",
    projectReacherApplication: "Already visible without direct core training or cardio at the current starting point — worth monitoring as a simple leanness indicator as the bulk progresses, alongside waist measurement.",
    practicalAction: ["Use abs visibility as a rough leanness check during the bulk, not as a training target requiring direct ab work."],
    relatedTerms: ["fat-gain-warning", "body-fat-estimates"], tags: ["abs visibility", "abs"], readingTimeMin: 1, evidenceTier: "Good"
  }),
  E({
    slug: "fat-gain-warning", title: "Fat Gain Warning", category: "Body Composition", difficulty: "Basic",
    instantMeaning: "A signal that surplus calories are becoming excessive.",
    shortDefinition: "A fat gain warning is a pattern where waist/measurements are rising disproportionately to strength/muscle gains, suggesting the calorie surplus may be too large.",
    beginnerExplanation: "If the waist is growing faster than strength and other measurements, that's a sign more of the surplus is becoming fat than muscle.",
    whyItMatters: "Catching this early allows a small calorie adjustment instead of needing a longer corrective mini-cut later.",
    projectReacherApplication: "Feeds into the Waist Control Score concept and the decision of whether a mini-cut is worth considering.",
    practicalAction: ["Compare waist trend against strength trend, not waist alone, before concluding fat gain is excessive."],
    relatedTerms: ["waist-control-score", "mini-cut"], tags: ["fat gain warning"], readingTimeMin: 1, evidenceTier: "Implementation"
  }),
  E({
    slug: "body-fat-estimates", title: "Body Fat Percentage Estimates", category: "Body Composition", difficulty: "Intermediate",
    instantMeaning: "Estimated, not exact, body fat level.",
    shortDefinition: "Body fat percentage estimates (from visual assessment, calipers, or scale-based bioimpedance) are useful trend indicators but carry meaningful error margins, often several percentage points.",
    beginnerExplanation: "Any body fat number outside a lab-grade method (like a DEXA scan) should be treated as a rough estimate, not a precise measurement.",
    whyItMatters: "Overreacting to small changes in an inherently noisy number leads to unnecessary diet changes.",
    projectReacherApplication: "Use body fat estimates as a general trend indicator alongside waist measurement and photos, not as a precise number to optimise to the decimal point.",
    practicalAction: ["Track the trend over months, not week to week changes in an estimated body fat number."],
    cautionNuance: "This app cannot measure body fat directly — any body fat entry is a self-reported estimate.",
    relatedTerms: ["abs-visibility"], tags: ["body fat percentage"], readingTimeMin: 1, evidenceTier: "Mixed"
  }),
  E({
    slug: "ffmi-natural-ceiling", title: "FFMI and Natural Ceiling", acronym: "Fat-Free Mass Index", category: "Body Composition", difficulty: "Advanced",
    instantMeaning: "A rough gauge of how much natural muscle is realistic.",
    shortDefinition: "FFMI (Fat-Free Mass Index) adjusts lean bodyweight for height, giving a rough reference for how much muscle a natural lifter can realistically carry; a 'natural ceiling' is the approximate upper limit of that muscle gain without performance-enhancing drugs.",
    beginnerExplanation: "It's a way of sanity-checking long-term goals — FFMI norms suggest most drug-free lifters plateau within a fairly predictable, genetics-influenced range.",
    whyItMatters: "It sets realistic expectations so goals stay motivating rather than becoming a source of frustration against an unrealistic (often drug-assisted) benchmark.",
    projectReacherApplication: "The realistic long-term target here is roughly 83-87 kg at ~10-15% body fat over several years, with an ambitious upper milestone of 89 kg — presented as directional targets based on natural potential, not guarantees.",
    practicalAction: ["Treat these numbers as multi-year directional targets, not a deadline or a guarantee."],
    cautionNuance: "FFMI is a rough population-level heuristic with real individual variation — it does not predict any one person's outcome precisely.",
    relatedTerms: ["high-responder"], tags: ["FFMI", "natural ceiling"], synonyms: ["natural ceiling"], readingTimeMin: 2, evidenceTier: "Mixed"
  }),

  // ============ MEASUREMENTS & RATIOS ============
  E({
    slug: "seven-day-average", title: "7-Day Average", category: "Measurements & Ratios", difficulty: "Basic",
    instantMeaning: "Your real weight trend, not the daily noise.",
    shortDefinition: "The 7-day average smooths daily bodyweight fluctuation (from food, water, salt and digestion) into a more reliable trend line.",
    beginnerExplanation: "Daily bodyweight jumps around from food, water, salt and digestion. A 7-day average smooths that noise into a number you can actually trust.",
    whyItMatters: "Reacting to a single day's number is one of the most common tracking mistakes — it's mostly noise, not signal.",
    projectReacherApplication: "The app uses the 7-day average to decide whether calories should increase, decrease, or stay the same — not the most recent single entry.",
    practicalAction: ["Weigh daily under consistent conditions, but only judge trend from the 7-day average."],
    commonMistakes: ["Panicking (or celebrating) over a single day's scale reading."],
    relatedTerms: ["weekly-rate-of-gain", "sodium-electrolytes"], tags: ["7-day average", "bodyweight trend"], readingTimeMin: 1, evidenceTier: "Consensus"
  }),
  E({
    slug: "weekly-rate-of-gain", title: "Weekly Rate of Gain", category: "Measurements & Ratios", difficulty: "Basic",
    instantMeaning: "How fast bodyweight is trending up per week.",
    shortDefinition: "Weekly rate of gain is the week-over-week change in 7-day average bodyweight, compared against a target rate (here, roughly +0.25 kg/week).",
    beginnerExplanation: "It tells you whether the current calorie intake is producing gain at roughly the intended pace, too slow, or too fast.",
    whyItMatters: "It's the single clearest signal for whether calories need adjusting during a lean bulk.",
    projectReacherApplication: "Meaningfully faster than +0.25 kg/week for multiple consecutive weeks suggests reducing calories slightly; meaningfully slower suggests a small increase.",
    practicalAction: ["Only adjust calories after 2+ weeks of a consistent rate trend, not a single week's number."],
    relatedTerms: ["seven-day-average", "calories-energy-balance"], tags: ["weekly rate of gain"], readingTimeMin: 1, evidenceTier: "Implementation"
  }),
  E({
    slug: "body-measurements", title: "Body Measurements: Waist, Shoulder, Chest, Arm, Neck, Thigh and Calf", category: "Measurements & Ratios", difficulty: "Basic",
    instantMeaning: "Tape-measure tracking of key physique landmarks.",
    shortDefinition: "Regular tape measurements of waist, shoulders, chest, arms, neck, thighs and calves track physique change with more detail than bodyweight alone.",
    beginnerExplanation: "Measure the same spot, the same way, at the same time of day (ideally morning, unflexed unless noted) each time for the numbers to be comparable.",
    whyItMatters: "Measurements can reveal muscle gain in target areas and fat gain around the waist even when the scale trend looks unremarkable.",
    projectReacherApplication: "Waist trend in particular feeds Project Reacher's fat-gain monitoring; shoulder/chest/arm/neck trend feeds progress toward the target proportions.",
    practicalAction: ["Measure consistently — same tape tension, same body position, same time of day."],
    commonMistakes: ["Measuring inconsistently (different time of day, flexed vs relaxed) and mistaking the noise for real change."],
    relatedTerms: ["shoulder-to-waist-ratio"], tags: ["waist measurement", "shoulder measurement", "chest measurement", "arm measurement", "neck measurement", "thigh measurement", "calf measurement"],
    synonyms: ["waist measurement", "shoulder measurement", "chest measurement", "arm measurement", "neck measurement", "thigh measurement", "calf measurement"],
    readingTimeMin: 2, evidenceTier: "Good"
  }),
  E({
    slug: "shoulder-to-waist-ratio", title: "Shoulder-to-Waist and Chest-to-Waist Ratio", category: "Measurements & Ratios", difficulty: "Basic",
    instantMeaning: "The proportions behind the V-taper look.",
    shortDefinition: "Shoulder-to-waist and chest-to-waist ratio compare shoulder/chest circumference to waist circumference — the core proportions behind the visually broad, tapered physique Project Reacher targets.",
    beginnerExplanation: "A wider shoulder/chest measurement relative to a controlled waist measurement is what creates the classic 'V-taper' look, more than either number alone.",
    whyItMatters: "It reframes the goal around proportion rather than just getting bigger everywhere, including the waist.",
    projectReacherApplication: "Target shoulder-to-waist ratio is roughly 1.6-1.7 — presented as a directional target based on typical proportion goals, not a guarantee.",
    practicalAction: ["Track both shoulder/chest growth and waist control together, not shoulder size alone."],
    cautionNuance: "Present these as directional targets, not guarantees — the goal is proportion and visual outcome, not chasing an exact number.",
    relatedTerms: ["body-measurements", "waist-control-score"], tags: ["shoulder-to-waist ratio", "chest-to-waist ratio"],
    synonyms: ["chest-to-waist ratio"], readingTimeMin: 2, evidenceTier: "Implementation"
  }),
  E({
    slug: "progress-photos", title: "Progress Photos and Same-Lighting Photos", category: "Measurements & Ratios", difficulty: "Basic",
    instantMeaning: "Visual tracking that catches what numbers miss.",
    shortDefinition: "Progress photos, taken consistently (same lighting, pose, time of day), visually track physique change that measurements and bodyweight alone can miss.",
    beginnerExplanation: "Take photos in consistent lighting and poses so they're genuinely comparable month to month — different lighting or angle can make identical physiques look very different.",
    whyItMatters: "Photos often reveal muscle/fat distribution changes weeks before they show up clearly in the numbers.",
    projectReacherApplication: "Best reviewed monthly alongside measurements — day-to-day photo comparison is too noisy to be useful.",
    practicalAction: ["Use the same location, lighting and poses every time.", "Compare monthly, not day to day."],
    commonMistakes: ["Comparing photos taken in different lighting or after different amounts of water/food, mistaking the difference for real change."],
    relatedTerms: ["bodyweight-vs-physique"], tags: ["progress photos", "same-lighting photos"], synonyms: ["same-lighting photos"],
    readingTimeMin: 1, evidenceTier: "Good"
  }),

  // ============ MINI-CUTS / FAT LOSS ============
  E({
    slug: "mini-cut", title: "Mini-Cut, Fat Loss Phase and Diet Break", category: "Mini-Cuts / Fat Loss", difficulty: "Intermediate",
    instantMeaning: "A short, controlled break from bulking to manage fat gain.",
    shortDefinition: "A mini-cut is a short (typically 2-6 week), controlled calorie deficit used to reduce fat gain accumulated during a longer bulk, before returning to a surplus.",
    beginnerExplanation: "Mini-cuts are short, controlled phases used to reduce fat gain during a longer bulk — the goal is to return to a better gaining position, not to abandon the bulk altogether.",
    whyItMatters: "Used well, it prevents a bulk from turning into a long, hard-to-reverse fat-gain phase without sacrificing the overall muscle-building timeline.",
    projectReacherApplication: "Consider a mini-cut when waist/body fat is rising disproportionately to strength and muscle gains — not automatically every time bodyweight increases.",
    practicalAction: ["Use a controlled deficit (not an extreme one) for a defined short period, then return to the lean bulk."],
    commonMistakes: ["Mini-cutting reflexively any time the scale goes up, even when the gain looks lean.", "Letting a mini-cut drag on far past a few weeks."],
    cautionNuance: "This is a strategic pause, not a signal to abandon the muscle-building goal.",
    relatedTerms: ["fat-gain-warning", "cut-responsiveness-score"], tags: ["mini-cut", "fat loss phase", "diet break", "controlled deficit"],
    synonyms: ["fat loss phase", "diet break", "controlled deficit", "when to mini-cut"], readingTimeMin: 2, evidenceTier: "Good"
  }),
  E({
    slug: "rate-of-loss-strength-retention", title: "Rate of Loss and Strength Retention", category: "Mini-Cuts / Fat Loss", difficulty: "Intermediate",
    instantMeaning: "Losing fat fast without losing the muscle you built.",
    shortDefinition: "Rate of loss is how quickly bodyweight drops during a deficit; strength retention is maintaining logged lifting performance despite that deficit — the goal during any cut, including a mini-cut.",
    beginnerExplanation: "A moderate rate of loss with lifting performance holding steady is a sign the deficit is losing mostly fat; a fast drop paired with falling numbers on the bar is a warning sign of muscle loss.",
    whyItMatters: "The whole point of a natural, muscle-focused approach is to lose fat without giving back hard-earned strength and size.",
    projectReacherApplication: "Track logged lifts through any mini-cut — if strength drops noticeably, the deficit or duration is likely too aggressive.",
    practicalAction: ["Keep the deficit moderate and monitor strength on key lifts throughout any cut phase."],
    relatedTerms: ["mini-cut"], tags: ["rate of loss", "strength retention"], synonyms: ["rate of loss", "strength retention"],
    readingTimeMin: 1, evidenceTier: "Good"
  }),
  E({
    slug: "recomp-vs-cut", title: "Recomp vs Cut", category: "Mini-Cuts / Fat Loss", difficulty: "Intermediate",
    instantMeaning: "Two different strategies for improving body composition.",
    shortDefinition: "Recomposition tries to gain muscle and lose fat near maintenance calories; a cut deliberately runs a calorie deficit specifically to lose fat, generally at some cost to the pace of muscle gain.",
    beginnerExplanation: "A recomp is slower and gentler; a cut is more deliberate and faster at reducing fat, but pauses meaningful muscle-building progress while it's happening.",
    whyItMatters: "Picking the wrong one for your situation wastes time — a cut when a small mini-cut would've done, or endless recomp attempts when a clear surplus is what's actually needed.",
    projectReacherApplication: "The primary current strategy is a lean bulk, with a mini-cut (not a full cut) as the tool if fat gain gets disproportionate.",
    practicalAction: ["Default to the lean bulk plan; reserve a full cut for after a longer bulk phase, not as a frequent reaction."],
    relatedTerms: ["mini-cut", "body-recomposition"], tags: ["recomp", "cut"], readingTimeMin: 1, evidenceTier: "Good"
  }),

  // ============ HIGH-RESPONDER TRACKING ============
  E({
    slug: "high-responder", title: "High Responder / Strong Natural Response", category: "High-Responder Tracking", difficulty: "Intermediate",
    instantMeaning: "Someone progressing faster than average, naturally.",
    shortDefinition: "A high responder gains strength or muscle faster than typical natural lifters while keeping fat gain controlled — a data trend, not a medical diagnosis.",
    beginnerExplanation: "Some naturally lean, fast-progressing lifters see quicker strength and muscle gains than average — this describes that pattern without claiming to know why.",
    whyItMatters: "Recognising a genuinely strong trend can justify slightly more assertive progression, but it must never be used as an excuse to skip recovery or form standards.",
    projectReacherApplication: "The app can lean into progression slightly more assertively if strength, measurements, waist control and recovery data all consistently support it — never based on a single good week.",
    practicalAction: ["Let several consecutive weeks of strong, consistent data — not a single great session — inform whether progression should be more assertive."],
    commonMistakes: ["Assuming fast early progress (common for any new or returning lifter) proves 'high responder' status long-term."],
    cautionNuance: "This is a trend, not a diagnosis. Confirmed testosterone status requires bloodwork with a professional, not app data. Being a high responder does not mean recovery rules can be ignored, and it never means someone will gain more than expected 'no matter what.'",
    relatedTerms: ["ffmi-natural-ceiling", "deficiency-bloodwork"], tags: ["high responder", "strong natural response"],
    synonyms: ["strong natural response", "above-average response"], readingTimeMin: 2, evidenceTier: "Implementation"
  }),

  // ============ APP METRICS & SCORES ============
  E({
    slug: "reacher-score", title: "Reacher Score", acronym: "Reacher Similarity Score", category: "App Metrics & Scores", difficulty: "Basic",
    instantMeaning: "The Dashboard's overall weekly snapshot, out of 100.",
    shortDefinition: "The Reacher Score is the Dashboard's combined snapshot (out of 100) built from recent protein intake, sessions trained this week, and recovery/energy scores.",
    beginnerExplanation: "It's a quick single-number pulse-check pulling together nutrition, training consistency and recovery for the current week — not a precise scientific score.",
    whyItMatters: "It gives a fast, single glance at whether the week is broadly on track without having to check every tab individually.",
    projectReacherApplication: "A dropping score is a prompt to check which specific input (protein, sessions, recovery, energy) is driving it, rather than treating the number itself as the problem.",
    practicalAction: ["Use a low score as a starting point to check the underlying inputs, not as a verdict on its own."],
    cautionNuance: "This is an app-specific heuristic built from a few tracked inputs, not a validated scientific instrument.",
    relatedTerms: ["weekly-verdicts", "lean-gain-quality-score"], tags: ["reacher score", "reacher similarity score", "dashboard score"],
    synonyms: ["reacher similarity score"], readingTimeMin: 1, evidenceTier: "Implementation"
  }),
  E({
    slug: "lean-gain-quality-score", title: "Lean Gain Quality Score", category: "App Metrics & Scores", difficulty: "Intermediate",
    instantMeaning: "Is the weight gain productive?",
    shortDefinition: "Lean Gain Quality is a concept checking whether bodyweight is increasing in a way that looks like muscle gain rather than mainly fat gain.",
    beginnerExplanation: "This score checks whether bodyweight is increasing in a way that looks like muscle gain rather than mainly fat gain.",
    whyItMatters: "A surplus that's technically 'working' on the scale can still be a poor outcome if most of it is fat.",
    projectReacherApplication: "In practice this is read from the combination of weekly rate of gain, waist trend, strength progress and measurements shown across the Dashboard and Weekly Review — a high-quality gain means strength/measurements are climbing while waist stays controlled. A low-quality gain means waist is climbing disproportionately to strength.",
    practicalAction: ["If waist is rising faster than strength/measurements, treat that as a low lean-gain-quality signal and consider a small calorie reduction or a mini-cut."],
    cautionNuance: "This is an app heuristic built from tracked trends, not a medical body composition test.",
    relatedTerms: ["fat-gain-warning", "weekly-rate-of-gain"], tags: ["lean gain quality score"], readingTimeMin: 2, evidenceTier: "Implementation"
  }),
  E({
    slug: "strength-response-score", title: "Strength Response Score", category: "App Metrics & Scores", difficulty: "Intermediate",
    instantMeaning: "Is strength climbing the way it should be?",
    shortDefinition: "A concept describing whether logged strength (weight × reps trend on key lifts) is progressing at a healthy rate relative to time and calorie surplus.",
    beginnerExplanation: "Are your logged lifts actually going up over the weeks, roughly matching what you'd expect from a well-run lean bulk?",
    whyItMatters: "Strength trend is one of the most reliable proxies for real muscle-building progress available without lab equipment.",
    projectReacherApplication: "Read from the PR Tracker and per-exercise logbook history — flat or declining strength across multiple exercises for multiple weeks despite good adherence is worth investigating (recovery, calories, or program fit).",
    practicalAction: ["Check the PR Tracker periodically to confirm the overall strength trend is still climbing, not just individual sessions."],
    cautionNuance: "This is an app-specific heuristic, not a lab-grade strength test.",
    relatedTerms: ["logbook-progression", "deload-readiness"], tags: ["strength response score"], readingTimeMin: 1, evidenceTier: "Implementation"
  }),
  E({
    slug: "waist-control-score", title: "Waist Control Score", category: "App Metrics & Scores", difficulty: "Intermediate",
    instantMeaning: "Is the waist staying in check during the bulk?",
    shortDefinition: "A concept describing whether waist measurement is growing slower than shoulder/chest/arm measurements during a bulk, preserving the target proportions.",
    beginnerExplanation: "The waist should grow much more slowly than the shoulders, chest and arms during a well-run lean bulk.",
    whyItMatters: "It directly protects the shoulder-to-waist ratio that defines the visual goal, not just muscle mass in isolation.",
    projectReacherApplication: "Read from waist trend versus shoulder/chest/arm trend in Measurements — a rapidly closing gap between waist growth and muscle growth is the trigger to consider adjusting calories or a mini-cut.",
    practicalAction: ["Compare waist growth rate to shoulder/chest/arm growth rate monthly, not just track waist alone."],
    cautionNuance: "This is an app heuristic based on tracked measurement trends, not a body composition test.",
    relatedTerms: ["shoulder-to-waist-ratio", "fat-gain-warning", "mini-cut"], tags: ["waist control score"], readingTimeMin: 1, evidenceTier: "Implementation"
  }),
  E({
    slug: "recovery-resilience-score", title: "Recovery Resilience Score", category: "App Metrics & Scores", difficulty: "Intermediate",
    instantMeaning: "How well recovery holds up under the current training load.",
    shortDefinition: "A concept describing whether recovery, energy and soreness scores stay stable under the current training volume/intensity, especially given the fixed sleep constraint.",
    beginnerExplanation: "It's about whether your recovery data stays steady week to week, or whether it's trending downward under the current plan.",
    whyItMatters: "Given a fixed, non-negotiable sleep constraint, this is one of the most important things to monitor — recovery capacity here is inherently more limited than for someone sleeping 8 hours.",
    projectReacherApplication: "Read from the Recovery tab's logged Recovery/Energy/Soreness scores and the Weekly Review's recovery warnings — persistent decline should trigger a temporary volume reduction rather than pushing through.",
    practicalAction: ["Treat a multi-week downward recovery trend as a stronger signal than any single bad day."],
    cautionNuance: "This is an app heuristic built from self-reported scores, not a physiological measurement.",
    relatedTerms: ["fixed-sleep-constraint", "deload-readiness"], tags: ["recovery resilience score"], readingTimeMin: 1, evidenceTier: "Implementation"
  }),
  E({
    slug: "cut-responsiveness-score", title: "Cut Responsiveness Score", category: "App Metrics & Scores", difficulty: "Intermediate",
    instantMeaning: "How well the body handles a deficit when one is used.",
    shortDefinition: "A concept describing how well strength and energy hold up during a mini-cut or fat-loss phase, informing how aggressive future deficits can safely be.",
    beginnerExplanation: "Some people lose fat quickly with minimal strength loss; others lose strength fast even in a mild deficit. Tracking this during any cut phase informs how to run the next one.",
    whyItMatters: "It personalises future cut/mini-cut decisions instead of guessing the right deficit size each time.",
    projectReacherApplication: "Read from strength and energy trends specifically during any mini-cut window — a mini-cut that tanks strength badly suggests a gentler deficit or shorter duration next time.",
    practicalAction: ["Compare strength retention across any mini-cuts you run over time to calibrate future deficit size."],
    cautionNuance: "This is an app heuristic based on tracked performance during deficit phases, not a metabolic test.",
    relatedTerms: ["mini-cut", "rate-of-loss-strength-retention"], tags: ["cut responsiveness score"], readingTimeMin: 1, evidenceTier: "Implementation"
  }),
  E({
    slug: "weekly-verdicts", title: "Weekly Check-In Verdicts", category: "App Metrics & Scores", difficulty: "Basic",
    instantMeaning: "The Weekly Review's per-area summary judgements.",
    shortDefinition: "The Weekly Review generates a Weekly Verdict alongside sub-verdicts for Bodyweight, Nutrition, Training, Recovery and Stimulant use, each summarising whether that area looked on-track, under, or over target for the week.",
    beginnerExplanation: "Instead of one vague 'good week / bad week' judgement, the app breaks it down by area so you know specifically what to adjust, if anything.",
    whyItMatters: "A single overall impression can hide that, say, training was great but nutrition tracking was inconsistent — breaking it down avoids fixing the wrong thing.",
    projectReacherApplication: "Generated from that week's logged bodyweight, nutrition, training sessions, recovery scores and stimulant logs — read each sub-verdict, not just the headline one.",
    practicalAction: ["Check which specific sub-verdict is weakest before deciding what to change next week."],
    relatedTerms: ["reacher-score", "suggested-edits"], tags: ["weekly verdict", "bodyweight verdict", "nutrition verdict", "training verdict", "recovery verdict", "stimulant verdict"],
    synonyms: ["bodyweight verdict", "nutrition verdict", "training verdict", "recovery verdict", "stimulant verdict"],
    readingTimeMin: 2, evidenceTier: "Implementation"
  }),
  E({
    slug: "suggested-edits", title: "Suggested Edits", category: "App Metrics & Scores", difficulty: "Basic",
    instantMeaning: "The app's proposed adjustments, always for you to approve.",
    shortDefinition: "Suggested edits are proposed changes (e.g. a calorie adjustment, a load increase) that the app recommends based on logged data, requiring your review and approval before anything changes.",
    beginnerExplanation: "The app doesn't silently change your plan — it suggests a specific change and explains why, and you decide whether to accept it.",
    whyItMatters: "Keeps you in control of the plan while still benefiting from data-driven recommendations.",
    projectReacherApplication: "Progression recommendations on exercise cards and calorie adjustment suggestions in the Weekly Review both work this way — suggested, never auto-applied.",
    practicalAction: ["Read the reasoning behind a suggested edit, not just the recommendation itself, before accepting it."],
    relatedTerms: ["ai-coach-recommendations"], tags: ["suggested edits"], readingTimeMin: 1, evidenceTier: "Implementation"
  }),
  E({
    slug: "ai-coach-recommendations", title: "AI Coach Recommendations", category: "App Metrics & Scores", difficulty: "Basic",
    instantMeaning: "Rule-based coaching advice generated from your own logged data.",
    shortDefinition: "Project Reacher's exercise-level coaching advice is generated locally from your logged entries and each exercise's guide content using deterministic rules — it is not a live AI chat calling an external model.",
    beginnerExplanation: "When the app gives advice like a next-set cue or a progression decision, it's built from clear if/then rules applied to your own logged numbers, not from a live conversation with an AI.",
    whyItMatters: "It's important to understand what kind of 'AI' this is — honest, rule-based logic you can inspect and trust, not a black box.",
    projectReacherApplication: "Used in the Train tab's exercise advice and in the Library's own Ask-About-This feature — both are local and rule-based, clearly labelled as such. On arm, forearm and side-delt isolation work it will not recommend reducing volume unless recovery, pain or performance data actually supports it — arms and forearms are a deliberate priority, not something to quietly deprioritise.",
    practicalAction: ["Treat these recommendations as a structured second opinion drawn from your own data, and still apply your own judgement.", "Watch elbow, wrist and shoulder pain flags closely on Day 6 — the advice will hold or reduce load on a specific exercise if pain is logged, without dropping the day's overall priority."],
    cautionNuance: "This app has no server-side AI API key and does not send your data to a live AI model for coaching advice — everything is computed locally in your browser from your own logged data and the app's built-in guide content.",
    relatedTerms: ["suggested-edits", "data-sufficiency"], tags: ["AI coach", "AI recommendations"], readingTimeMin: 2, evidenceTier: "Implementation"
  }),
  E({
    slug: "data-sufficiency", title: "Data Sufficiency", category: "App Metrics & Scores", difficulty: "Basic",
    instantMeaning: "Whether there's enough logged history to trust a trend.",
    shortDefinition: "Data sufficiency is whether enough logged sessions/entries exist for a given metric or recommendation to be meaningfully reliable.",
    beginnerExplanation: "A trend based on one or two logged sessions is much less reliable than one based on several weeks — the app's confidence in any recommendation should scale with how much data actually backs it.",
    whyItMatters: "Early in tracking, or after a long gap, any score or recommendation should be treated with more caution.",
    projectReacherApplication: "Scores and verdicts that show '--' or a placeholder are usually a data-sufficiency issue — log consistently for a few weeks before expecting reliable trend-based recommendations.",
    practicalAction: ["Give any score or recommendation less weight in the first few weeks of logging a new metric."],
    relatedTerms: ["ai-coach-recommendations"], tags: ["data sufficiency"], readingTimeMin: 1, evidenceTier: "Implementation"
  }),

  // ============ ACRONYMS & DEFINITIONS ============
  E({
    slug: "acr-rpe", title: "RPE", acronym: "Rate of Perceived Exertion", category: "Acronyms & Definitions",
    instantMeaning: "How hard it felt.", shortDefinition: "Rate of Perceived Exertion — a 1-10 rating of set effort.",
    beginnerExplanation: "See the full RPE article for the training-principle details.", whyItMatters: "Used throughout Train tab logging.",
    projectReacherApplication: "Appears in: Train tab, workout logs, weekly review.", practicalAction: ["See the RPE article for full detail."],
    relatedTerms: ["rpe"], tags: ["RPE", "acronym"], readingTimeMin: 1
  }),
  E({
    slug: "acr-rir", title: "RIR", acronym: "Reps in Reserve", category: "Acronyms & Definitions",
    instantMeaning: "Clean reps left.", shortDefinition: "Reps in Reserve — how many more clean reps you could have done.",
    beginnerExplanation: "See the full RIR article for detail.", whyItMatters: "Used alongside RPE for effort tracking.",
    projectReacherApplication: "Appears in: Train tab, workout logs.", practicalAction: ["See the RIR article for full detail."],
    relatedTerms: ["rir"], tags: ["RIR", "acronym"], readingTimeMin: 1
  }),
  E({
    slug: "acr-rom", title: "ROM", acronym: "Range of Motion", category: "Acronyms & Definitions",
    instantMeaning: "How much of the movement you used.", shortDefinition: "Range of Motion — the portion of a lift's full movement path used.",
    beginnerExplanation: "See the full Range of Motion article for detail.", whyItMatters: "Consistency here is required for real progression.",
    projectReacherApplication: "Appears in: Train tab Technique Guide.", practicalAction: ["See the Range of Motion article."],
    relatedTerms: ["range-of-motion"], tags: ["ROM", "acronym"], readingTimeMin: 1
  }),
  E({
    slug: "acr-pr-pb", title: "PR / PB", acronym: "Personal Record / Personal Best", category: "Acronyms & Definitions",
    instantMeaning: "Your best logged lift.", shortDefinition: "Personal Record / Personal Best — the heaviest weight or most reps logged for an exercise.",
    beginnerExplanation: "Tracked automatically from your logbook history.", whyItMatters: "Gives a clear long-term progress marker beyond week-to-week noise.",
    projectReacherApplication: "Appears in: PR Tracker on the Train tab.", practicalAction: ["Check the PR Tracker periodically rather than chasing a PR every session."],
    relatedTerms: ["strength-response-score"], tags: ["PR", "PB", "acronym"], synonyms: ["personal record", "personal best"], readingTimeMin: 1
  }),
  E({
    slug: "acr-doms", title: "DOMS", acronym: "Delayed Onset Muscle Soreness", category: "Acronyms & Definitions",
    instantMeaning: "Post-training muscle soreness.", shortDefinition: "Delayed Onset Muscle Soreness — soreness peaking 24-72 hours after training.",
    beginnerExplanation: "See the Soreness / DOMS article for full detail.", whyItMatters: "Not a reliable measure of how effective a session was.",
    projectReacherApplication: "Appears in: Recovery tab (Soreness Score).", practicalAction: ["See the Soreness / DOMS article."],
    relatedTerms: ["soreness-doms"], tags: ["DOMS", "acronym"], readingTimeMin: 1
  }),
  E({
    slug: "acr-mps", title: "MPS", acronym: "Muscle Protein Synthesis", category: "Acronyms & Definitions",
    instantMeaning: "The process that builds new muscle protein.", shortDefinition: "Muscle Protein Synthesis — the biological process that builds new muscle tissue.",
    beginnerExplanation: "See the full Muscle Protein Synthesis article for detail.", whyItMatters: "Stimulated by training plus adequate protein.",
    projectReacherApplication: "Appears in: Protein and Nutrition Basics articles.", practicalAction: ["See the Muscle Protein Synthesis article."],
    relatedTerms: ["muscle-protein-synthesis"], tags: ["MPS", "acronym"], readingTimeMin: 1
  }),
  E({
    slug: "acr-tdee-bmr-neat", title: "TDEE, BMR and NEAT", acronym: "Total Daily Energy Expenditure / Basal Metabolic Rate / Non-Exercise Activity Thermogenesis", category: "Acronyms & Definitions",
    instantMeaning: "Different pieces of your total daily calorie burn.",
    shortDefinition: "TDEE is total daily calories burned; BMR is calories burned at complete rest; NEAT is calories burned from everyday non-exercise movement.",
    beginnerExplanation: "TDEE = BMR + NEAT + exercise + digestion. Maintenance calories are essentially your TDEE.",
    whyItMatters: "Understanding the components helps explain why activity level (not just training) affects how many calories are needed.",
    projectReacherApplication: "Appears conceptually behind: maintenance calorie targets used in Nutrition.", practicalAction: ["Track the bodyweight trend rather than trying to calculate TDEE precisely — the trend tells you the real number."],
    relatedTerms: ["calories-energy-balance"], tags: ["TDEE", "BMR", "NEAT", "acronym"], synonyms: ["TDEE", "BMR", "NEAT"], readingTimeMin: 1
  }),
  E({
    slug: "acr-eaa-bcaa", title: "EAA and BCAA", acronym: "Essential Amino Acids / Branched-Chain Amino Acids", category: "Acronyms & Definitions",
    instantMeaning: "Building-block components of protein.",
    shortDefinition: "EAAs are the amino acids the body can't make itself and must get from food; BCAAs are a subset of three EAAs (leucine, isoleucine, valine).",
    beginnerExplanation: "Whole protein sources already contain the full set of EAAs, including BCAAs — a standalone BCAA/EAA supplement is rarely necessary if daily protein target is being met.",
    whyItMatters: "Useful to know so marketing for isolated amino acid products can be evaluated against 'am I already hitting my protein target?'",
    projectReacherApplication: "Appears in: Protein article.", practicalAction: ["Prioritise hitting the daily protein target over adding a separate EAA/BCAA supplement."],
    relatedTerms: ["protein"], tags: ["EAA", "BCAA", "acronym"], synonyms: ["EAA", "BCAA"], readingTimeMin: 1, evidenceTier: "Good"
  }),
  E({
    slug: "acr-cns", title: "CNS", acronym: "Central Nervous System", category: "Acronyms & Definitions",
    instantMeaning: "The nervous system driving central fatigue.", shortDefinition: "Central Nervous System — the brain and spinal cord, relevant to central fatigue and overall drive/coordination.",
    beginnerExplanation: "See the Fatigue article for how central fatigue differs from muscle-level (peripheral) fatigue.", whyItMatters: "Explains why some fatigue is mental/systemic rather than muscle-specific.",
    projectReacherApplication: "Appears in: Fatigue article.", practicalAction: ["See the Fatigue article."],
    relatedTerms: ["fatigue"], tags: ["CNS", "acronym"], readingTimeMin: 1
  }),
  E({
    slug: "acr-sfr", title: "SFR", acronym: "Stimulus-to-Fatigue Ratio", category: "Acronyms & Definitions",
    instantMeaning: "How much growth stimulus a set gives per unit of fatigue.", shortDefinition: "Stimulus-to-Fatigue Ratio — how much useful growth stimulus an exercise/set provides relative to the fatigue it costs.",
    beginnerExplanation: "See the Training Volume article for full detail.", whyItMatters: "Helps judge whether extra sets/exercises are worth the added fatigue.",
    projectReacherApplication: "Appears in: Training Volume article.", practicalAction: ["See the Training Volume, Effective Reps and Junk Volume article."],
    relatedTerms: ["training-volume-effective-reps"], tags: ["SFR", "acronym"], readingTimeMin: 1
  }),
  E({
    slug: "acr-1rm-e1rm", title: "1RM and e1RM", acronym: "One Rep Max / Estimated One Rep Max", category: "Acronyms & Definitions",
    instantMeaning: "The heaviest single rep you could lift.",
    shortDefinition: "1RM is the actual heaviest weight liftable for one rep; e1RM is a formula-based estimate of that number from a submaximal set (e.g. 8 reps at a given weight).",
    beginnerExplanation: "You don't need to actually test a 1RM to estimate it — formulas can approximate it from a normal working set.",
    whyItMatters: "Testing a true 1RM carries injury risk and isn't necessary for hypertrophy-focused training.",
    projectReacherApplication: "Project Reacher's rep-range-based logging avoids needing 1RM testing at all — progress is tracked via logged working sets instead.",
    practicalAction: ["Skip 1RM testing — track working-set progression instead."], relatedTerms: ["logbook-progression"],
    tags: ["1RM", "e1RM", "acronym"], synonyms: ["1RM", "e1RM"], readingTimeMin: 1
  }),
  E({
    slug: "acr-amrap", title: "AMRAP", acronym: "As Many Reps As Possible", category: "Acronyms & Definitions",
    instantMeaning: "A set taken to genuine technical failure.", shortDefinition: "As Many Reps As Possible — performing every valid rep possible at a given weight, until technical failure.",
    beginnerExplanation: "Similar in spirit to Project Reacher's 'Set 2 to technical failure' rule.", whyItMatters: "A useful way to gauge true effort on a final set.",
    projectReacherApplication: "Appears in: exercise failure rules (e.g. 'both sets to technical failure').", practicalAction: ["Stop at technical failure, not at all-out muscular failure with broken form."],
    relatedTerms: ["technical-muscular-form-failure"], tags: ["AMRAP", "acronym"], readingTimeMin: 1
  }),
  E({
    slug: "acr-hiit-liss", title: "HIIT and LISS", acronym: "High-Intensity Interval Training / Low-Intensity Steady State", category: "Acronyms & Definitions",
    instantMeaning: "Two styles of cardio.", shortDefinition: "HIIT alternates short bursts of high effort with rest; LISS is sustained lower-intensity activity like walking.",
    beginnerExplanation: "Neither is currently a core part of the plan given the goal is hypertrophy-focused and abs are already visible without direct cardio.",
    whyItMatters: "Excess cardio, especially HIIT, adds recovery cost that competes with the fixed sleep constraint and lifting recovery.",
    projectReacherApplication: "Not currently prioritised — training recovery capacity is limited by the fixed sleep constraint, so added cardio volume should be introduced cautiously if at all.",
    practicalAction: ["If adding cardio, favour light LISS (e.g. walking) over frequent HIIT, to limit added recovery cost."],
    relatedTerms: ["fixed-sleep-constraint"], tags: ["HIIT", "LISS", "acronym"], synonyms: ["HIIT", "LISS"], readingTimeMin: 1
  }),
  E({
    slug: "acr-bmi-ffmi", title: "BMI and FFMI", acronym: "Body Mass Index / Fat-Free Mass Index", category: "Acronyms & Definitions",
    instantMeaning: "Two different height-adjusted bodyweight measures.",
    shortDefinition: "BMI is total bodyweight adjusted for height, without accounting for muscle vs fat; FFMI adjusts lean (fat-free) bodyweight for height, making it far more relevant for a lifter.",
    beginnerExplanation: "BMI famously misclassifies muscular people as 'overweight' since it can't distinguish muscle from fat — FFMI is the more useful number for a lifter.",
    whyItMatters: "Relying on BMI alone would give a misleading picture of progress as muscle is added.",
    projectReacherApplication: "See the FFMI and Natural Ceiling article for how this applies to long-term goal-setting.",
    practicalAction: ["Ignore BMI for tracking purposes; use measurements, photos and bodyweight trend instead."],
    relatedTerms: ["ffmi-natural-ceiling"], tags: ["BMI", "FFMI", "acronym"], synonyms: ["BMI"], readingTimeMin: 1
  }),

  // ============ INJURY & SAFETY BASICS ============
  E({
    slug: "pain-vs-discomfort", title: "Pain vs Discomfort", category: "Injury & Safety Basics", difficulty: "Basic",
    instantMeaning: "Burn is not the same as pain.",
    shortDefinition: "Muscle burn and general training discomfort are normal; sharp pain, joint pain, nerve symptoms or worsening pain are warning signs that should stop a set.",
    beginnerExplanation: "Muscle burn and effort are normal. Sharp pain, joint pain, nerve symptoms, or worsening pain are warning signs.",
    whyItMatters: "Confusing the two is one of the most common paths to a training injury that could have been avoided.",
    projectReacherApplication: "Pain flags should block progression recommendations — the app should never suggest increasing load on an exercise currently flagged for pain.",
    practicalAction: ["Stop, reduce load, adjust setup, or substitute the exercise.", "Seek professional advice if pain persists."],
    commonMistakes: ["Pushing through sharp or joint pain because 'it's just soreness.'"],
    cautionNuance: "This app cannot diagnose an injury. Persistent or sharp pain warrants a professional opinion, not app-based troubleshooting.",
    relatedTerms: ["joint-stress", "when-to-stop-a-set"], tags: ["pain vs discomfort", "joint pain", "muscle burn"],
    synonyms: ["joint pain", "muscle burn", "joint pain vs muscle discomfort"], readingTimeMin: 2, evidenceTier: "Consensus"
  }),
  E({
    slug: "tendon-irritation-technique-breakdown", title: "Tendon Irritation and Technique Breakdown", category: "Injury & Safety Basics", difficulty: "Intermediate",
    instantMeaning: "Two early warning signs worth catching quickly.",
    shortDefinition: "Tendon irritation is a nagging ache around a tendon (elbow, shoulder, knee) that tends to build gradually with repeated load; technique breakdown is when form quietly degrades under fatigue before a rep visibly fails.",
    beginnerExplanation: "Tendons recover slower than muscles, so a nagging tendon ache can build for weeks before it becomes a real problem — catch it early. Technique breakdown is form quietly getting worse before you'd call the rep a failure.",
    whyItMatters: "Both are early, catchable signals that — ignored — tend to turn into longer injury layoffs.",
    projectReacherApplication: "A dropping form quality score alongside a specific nagging ache on the same exercise across sessions is a clear signal to reduce load or substitute, not push through.",
    practicalAction: ["Reduce load or take extra rest days for an exercise showing a persistent tendon ache.", "Lower weight if form quality is trending down across sessions on the same lift."],
    relatedTerms: ["pain-vs-discomfort", "joint-stress"], tags: ["tendon irritation", "technique breakdown"],
    synonyms: ["tendon irritation", "technique breakdown"], readingTimeMin: 2, evidenceTier: "Good"
  }),
  E({
    slug: "when-to-stop-a-set", title: "When to Stop a Set or Reduce Load", category: "Injury & Safety Basics", difficulty: "Basic",
    instantMeaning: "Clear rules for ending a set early.",
    shortDefinition: "A set should stop the moment form breaks down to an invalid rep, or immediately at any sharp/joint pain — load should be reduced next session if this happens repeatedly.",
    beginnerExplanation: "It's always fine to stop a set a rep or two short of the plan if form is breaking down or something feels wrong — that's not failure, that's good judgement.",
    whyItMatters: "Grinding out a planned rep count regardless of warning signs is a common way minor issues become real injuries.",
    projectReacherApplication: "Log what happened honestly (lower reps, pain flag, form note) rather than logging the planned numbers anyway — the data stays useful either way.",
    practicalAction: ["Stop immediately at sharp/joint pain.", "Reduce load next session if a set had to be cut short for form reasons more than once."],
    relatedTerms: ["pain-vs-discomfort", "technical-muscular-form-failure"], tags: ["when to stop a set", "when to reduce load"],
    synonyms: ["when to reduce load"], readingTimeMin: 1, evidenceTier: "Good"
  }),
  E({
    slug: "when-to-substitute-or-seek-advice", title: "When to Substitute an Exercise or Seek Professional Advice", category: "Injury & Safety Basics", difficulty: "Basic",
    instantMeaning: "Knowing when self-management isn't enough.",
    shortDefinition: "Substitute an exercise when it repeatedly causes pain, poor target-muscle feel, or equipment access issues; seek professional advice when pain is sharp, persistent, worsening, or affects daily activity.",
    beginnerExplanation: "A single uncomfortable session might just need a form check or a lighter load; pain that keeps coming back, or that affects things outside the gym, needs a professional opinion, not more app troubleshooting.",
    whyItMatters: "Knowing the line between 'adjust the plan' and 'get this checked out' protects long-term training consistency.",
    projectReacherApplication: "The app can suggest substitutions for a persistently poor-feeling exercise, but it cannot and should not attempt to diagnose or treat pain.",
    practicalAction: ["Substitute the exercise if the issue is specific to that movement.", "See a professional if pain is sharp, persistent, worsening, or affects daily life."],
    cautionNuance: "This app is not a medical or physiotherapy service and cannot assess injuries.",
    relatedTerms: ["exercise-substitutions", "pain-vs-discomfort"], tags: ["when to substitute an exercise", "when to seek professional advice"],
    synonyms: ["when to seek professional advice"], readingTimeMin: 1, evidenceTier: "Consensus"
  }),
  E({
    slug: "joint-specific-cautions", title: "Joint-Specific Training Cautions: Neck, Lower Back, Shoulder, Elbow/Wrist", category: "Injury & Safety Basics", difficulty: "Intermediate",
    instantMeaning: "Extra care areas given this program's exercise selection.",
    shortDefinition: "Neck (isometrics), lower back (RDL, hinge work), shoulder (heavy pressing/pulling) and elbow/wrist (curls, extensions) are the joints most loaded by this specific program and worth extra attention to setup and load management.",
    beginnerExplanation: "Neck training should stay controlled and never jerky. Lower-back safety on RDLs depends on bracing and a neutral spine. Shoulders take a lot of pressing/pulling volume across the week, so warm-up and form quality matter. Elbows/wrists can get irritated from high-volume curl and extension work if grip or range gets sloppy.",
    whyItMatters: "Knowing which joints carry the most cumulative load in this specific program helps catch irritation before it becomes a real problem.",
    projectReacherApplication: "Watch pain flags and form quality trends specifically on Manual Neck Isometrics, Romanian Deadlift, the pressing/pulling exercises, and the curl/extension exercises.",
    practicalAction: ["Apply neck isometric pressure gradually, never with a jerk.", "Brace properly on every RDL rep.", "Warm up shoulders before heavy pressing.", "Keep wrists neutral on curls/extensions."],
    relatedTerms: ["bracing-neutral-spine", "hip-hinge-knee-tracking", "scapula-setup-cues"], tags: ["neck training caution", "lower-back caution", "shoulder caution", "elbow wrist irritation"],
    synonyms: ["neck training caution", "lower-back caution", "shoulder caution", "elbow / wrist irritation"], readingTimeMin: 2, evidenceTier: "Good"
  }),

  // ============ PROJECT REACHER SYSTEM ============
  E({
    slug: "what-is-project-reacher", title: "What is Project Reacher?", category: "Project Reacher System", difficulty: "Basic",
    instantMeaning: "A tracking app for a natural, proportion-focused physique goal.",
    shortDefinition: "Project Reacher is a training, nutrition and recovery tracking app built around one specific natural bodybuilding goal — building broad, proportionate, Alan Ritchson / Jack Reacher-style shoulders, chest, back and arms over a controlled waist, entirely drug-free.",
    beginnerExplanation: "It logs your workouts, meals, bodyweight, measurements and recovery, then uses that data to give you specific, personalised feedback instead of generic advice.",
    whyItMatters: "Generic fitness advice doesn't account for your specific starting point, constraints (like a fixed sleep schedule) or goal — this app is built around exactly those specifics.",
    projectReacherApplication: "Every feature — Train, Nutrition, Recovery, Weekly/Monthly Review, and this Library — exists to support that one specific, natural, proportion-focused goal, including a dedicated Saturday Day 6 — Arm + Forearm + Delt Specialisation session, since arms are already a strong feature the plan wants to preserve and amplify while bringing lagging forearms up and emphasising side delts for shoulder-to-waist ratio.",
    practicalAction: ["Use the Library whenever a term or app metric is unclear, then get back to logging."],
    relatedTerms: ["what-physique-are-we-building", "how-to-adapt-training-to-your-own-style"], tags: ["project reacher", "overview"],
    readingTimeMin: 2, evidenceTier: "Implementation"
  }),
  E({
    slug: "what-physique-are-we-building", title: "What Physique Are We Building?", category: "Project Reacher System", difficulty: "Basic",
    instantMeaning: "Broad shoulders, full upper chest, wide back, developed arms, controlled waist.",
    shortDefinition: "The target physique is a natural, athletic build emphasising shoulder width, upper chest fullness, lat width, arm size and trap/neck development, over a controlled waist — directionally similar to the Alan Ritchson / Jack Reacher look.",
    beginnerExplanation: "It's not about maximum size everywhere — it's about proportion: a wide upper body tapering to a controlled waist.",
    whyItMatters: "Having a clear visual target shapes exercise selection, progression priorities and calorie/waist management decisions throughout the app.",
    projectReacherApplication: "See the Shoulder-to-Waist Ratio and Why These Muscle Groups articles for the specific measurement targets and exercise reasoning behind this goal.",
    practicalAction: ["Judge overall progress by proportion (ratios, photos) alongside — not instead of — bodyweight and strength."],
    cautionNuance: "These are directional targets based on typical natural genetic potential, not guarantees for any individual.",
    relatedTerms: ["shoulder-to-waist-ratio", "why-these-muscle-groups"], tags: ["physique goal"], readingTimeMin: 1, evidenceTier: "Implementation"
  }),
  E({
    slug: "why-these-muscle-groups", title: "Why These Muscle Groups: Shoulders, Chest, Back, Arms, Traps & Neck", category: "Project Reacher System", difficulty: "Intermediate",
    instantMeaning: "The specific muscles driving the target look, and why each matters.",
    shortDefinition: "Broad shoulders and lat width drive the V-taper; upper chest fullness and traps/neck add upper-body power and presence; arm size fills out the overall proportion — each is deliberately prioritised in exercise selection.",
    beginnerExplanation: "Shoulders (delts) create width at the top of the frame. Upper chest adds visible fullness above the pecs' lower mass. Lats/back width widen the frame from behind and create the V-taper with the waist. Arms fill out the silhouette from the front and side. Traps and neck add a powerful, proportionate look to the upper body.",
    whyItMatters: "Training everything equally would dilute effort away from the muscle groups that actually drive this specific visual goal.",
    projectReacherApplication: "This is why Cable Lateral Raise, Incline DB Press, Lat Pulldown variants, curls/extensions and Shrugs/Neck Isometrics all get deliberate, dedicated program slots rather than being afterthoughts. Day 6 — Arm + Forearm + Delt Specialisation adds a dedicated Saturday session for biceps, brachialis/brachioradialis, triceps, forearm flexors/extensors, grip and side delts, since arms are already a strong feature worth amplifying, forearms are lagging and need to catch up, and side-delt width directly supports the shoulder-to-waist ratio.",
    practicalAction: ["Prioritise consistent effort and progression specifically on these movements over adding unrelated exercises."],
    relatedTerms: ["cable-lateral-raise", "incline-db-press", "wide-grip-lat-pulldown", "shrugs"], tags: ["shoulders", "chest", "back", "arms", "traps", "neck", "forearms", "day 6"],
    readingTimeMin: 2, evidenceTier: "Implementation"
  }),
  E({
    slug: "why-waist-control-matters", title: "Why Waist Control Matters", category: "Project Reacher System", difficulty: "Basic",
    instantMeaning: "A controlled waist is what makes the upper-body width actually show.",
    shortDefinition: "Waist control preserves the shoulder-to-waist ratio that defines the visual goal — the same shoulder width looks far more dramatic over a controlled waist than a wide one.",
    beginnerExplanation: "Broad shoulders matter less visually if the waist grows just as fast — proportion, not just size, is what creates the look.",
    whyItMatters: "It's the reason the app tracks waist trend so closely during what is otherwise a muscle-gaining phase.",
    projectReacherApplication: "See Waist Control Score and Mini-Cut for how the app monitors and responds to waist trend during the bulk.",
    practicalAction: ["Treat waist trend as a genuine priority metric during the bulk, not an afterthought."],
    relatedTerms: ["waist-control-score", "shoulder-to-waist-ratio", "mini-cut"], tags: ["waist control"], readingTimeMin: 1, evidenceTier: "Implementation"
  }),
  E({
    slug: "why-hack-squat-useful", title: "Why Hack Squat is Useful for This Goal", category: "Project Reacher System", difficulty: "Basic",
    instantMeaning: "Efficient, safe, high-effort leg training that fits the overall recovery budget.",
    shortDefinition: "Hack Squat lets legs be trained hard and close to failure with lower technical demand and lower systemic fatigue cost than a free-weight squat, which matters given a fixed, limited sleep/recovery budget.",
    beginnerExplanation: "It gives most of the leg-building benefit of squatting with less balance/stability skill required and less total-body fatigue, leaving more recovery capacity for the upper-body-focused goal.",
    whyItMatters: "Given the fixed sleep constraint, minimising unnecessary systemic fatigue while still training legs hard is a deliberate trade-off.",
    projectReacherApplication: "Chosen specifically over a barbell back squat for this reason, while still allowing genuinely hard leg training (Set 1 ~1 RIR, Set 2 technical failure).",
    practicalAction: ["Trust the exercise choice — it's deliberate, not a shortcut."], relatedTerms: ["hack-squat", "fixed-sleep-constraint"],
    tags: ["hack squat", "leg training"], readingTimeMin: 1, evidenceTier: "Implementation"
  }),
  E({
    slug: "why-two-hard-working-sets", title: "Why Two Hard Working Sets Can Work", category: "Project Reacher System", difficulty: "Intermediate",
    instantMeaning: "Fewer, harder sets can be as effective as more, easier ones — with less time and fatigue cost.",
    shortDefinition: "Two genuinely hard working sets (Set 1 ~1 RIR, Set 2 to technical failure) per exercise can deliver most of the effective-reps benefit of a higher-volume approach, at a lower total time and fatigue cost.",
    beginnerExplanation: "It's not about doing less — it's about making the sets you do count for more, so total training time and fatigue stay manageable.",
    whyItMatters: "Given a demanding schedule and a fixed sleep budget, an efficient approach that still drives real progress is more sustainable than chasing maximum volume.",
    projectReacherApplication: "This is why most exercises in the program are logged as exactly two working sets rather than three to five.",
    practicalAction: ["Make both working sets genuinely hard (per the target RPE/RIR) rather than adding easier extra sets."],
    relatedTerms: ["training-volume-effective-reps", "working-warmup-hard-sets"], tags: ["two working sets", "training efficiency"],
    readingTimeMin: 2, evidenceTier: "Good"
  }),
  E({
    slug: "form-quality-controls-progression", title: "Why Form Quality Controls Progression", category: "Project Reacher System", difficulty: "Intermediate",
    instantMeaning: "A heavier, sloppier lift is not real progress.",
    shortDefinition: "Progression recommendations in Project Reacher are gated on form quality, ROM, tempo and pain — a load increase is only suggested when reps hit the target range with good form, sufficient effort, consistent ROM, controlled tempo and no pain.",
    beginnerExplanation: "The app deliberately won't tell you to add weight just because you hit more reps — it also checks whether those reps actually looked right.",
    whyItMatters: "Without this gate, progression tracking would reward exactly the kind of technique breakdown that leads to injury and wasted training time.",
    projectReacherApplication: "Do not expect a load-increase recommendation unless: reps hit the target range, RPE/RIR shows sufficient effort, form quality is high, ROM is consistent, tempo is controlled, and no pain/discomfort is logged.",
    practicalAction: ["If a load-increase recommendation isn't appearing despite good reps, check whether form, ROM, tempo or pain flags are holding it back."],
    relatedTerms: ["valid-rep-standard", "progressive-overload"], tags: ["form quality", "progression gating"], readingTimeMin: 2, evidenceTier: "Implementation"
  }),
  E({
    slug: "why-weekly-reviews-matter", title: "Why Weekly Reviews Matter", category: "Project Reacher System", difficulty: "Basic",
    instantMeaning: "A regular checkpoint to catch trends early.",
    shortDefinition: "The Weekly Review aggregates the week's training, nutrition, bodyweight and recovery data into a single checkpoint, catching drift early rather than only noticing it after a month.",
    beginnerExplanation: "It's much easier to make a small correction after one off-track week than to notice a problem after a month of it compounding.",
    whyItMatters: "Daily data is noisy; monthly is too slow to react to. Weekly is the sweet spot for a lean bulk that needs regular small adjustments.",
    projectReacherApplication: "Generates the Weekly Verdicts and any suggested calorie/training adjustments for the coming week.",
    practicalAction: ["Actually read the weekly verdicts and reasoning, not just the headline score."],
    relatedTerms: ["weekly-verdicts"], tags: ["weekly review"], readingTimeMin: 1, evidenceTier: "Implementation"
  }),
  E({
    slug: "why-meal-tracking-matters", title: "Why Meal Tracking Matters", category: "Project Reacher System", difficulty: "Basic",
    instantMeaning: "You can't manage what you don't measure.",
    shortDefinition: "Meal tracking gives visibility into whether actual intake matches the calorie/protein targets driving the lean bulk, without which calorie adjustments are just guesswork.",
    beginnerExplanation: "It's very easy to underestimate intake without tracking — meal tracking closes that gap so calorie/protein decisions are based on real data.",
    whyItMatters: "Without it, the Weekly Review's nutrition verdict and calorie suggestions would have nothing reliable to work from.",
    projectReacherApplication: "AI Macro Estimation makes tracking faster even without exact numbers — correct estimates when real data is available for better long-term accuracy.",
    practicalAction: ["Log meals even roughly rather than skipping tracking on busy days."],
    relatedTerms: ["macro-tracking-ai-estimation", "confidence-score"], tags: ["meal tracking"], readingTimeMin: 1, evidenceTier: "Implementation"
  }),
  E({
    slug: "why-sleep-monitored-not-preached", title: "Why Sleep is Monitored but Not Over-Preached", category: "Project Reacher System", difficulty: "Intermediate",
    instantMeaning: "The app works within the sleep constraint instead of repeating unhelpful advice.",
    shortDefinition: "Given a genuine, fixed 5-6 hour sleep constraint from business workload, repeatedly telling the user to 'sleep 8 hours' isn't useful — instead the app monitors recovery through other signals and adjusts training within that real constraint.",
    beginnerExplanation: "The advice 'just sleep more' isn't actionable for everyone — so instead of repeating it, the app watches how the body is coping through performance, energy, soreness and other trend data.",
    whyItMatters: "Advice that ignores real constraints isn't useful advice — it just adds noise.",
    projectReacherApplication: "See the Fixed Sleep Constraint article for exactly how recovery is monitored around this limitation.",
    practicalAction: ["Focus effort on sleep quality levers within the available window, and on monitoring recovery trend, rather than chasing more sleep hours that aren't currently available."],
    relatedTerms: ["fixed-sleep-constraint"], tags: ["sleep philosophy"], readingTimeMin: 1, evidenceTier: "Implementation"
  }),
  E({
    slug: "why-ai-recommendations-require-approval", title: "Why AI Recommendations Require Approval", category: "Project Reacher System", difficulty: "Basic",
    instantMeaning: "The app suggests; you decide.",
    shortDefinition: "Every AI Coach or progression recommendation is a suggestion requiring your review and approval — nothing is auto-applied to your training or nutrition targets.",
    beginnerExplanation: "The app can be wrong, or miss context it doesn't have — keeping you as the final decision-maker is safer and keeps you learning the underlying principles, not just following orders.",
    whyItMatters: "It also matches the honest nature of these recommendations — locally computed, rule-based suggestions from your own data, not infallible AI judgements.",
    projectReacherApplication: "Progression suggestions, calorie adjustments and Library 'Ask AI about this' answers are all informational — you choose what to actually change.",
    practicalAction: ["Read the reasoning behind a recommendation before accepting or rejecting it."],
    relatedTerms: ["ai-coach-recommendations", "suggested-edits"], tags: ["AI approval", "human in the loop"], readingTimeMin: 1, evidenceTier: "Implementation"
  }),
  E({
    slug: "how-to-use-train-tab", title: "How to Use the Train Tab", category: "Project Reacher System", difficulty: "Basic",
    instantMeaning: "Select your day, log your sets, check the guide if unsure.",
    shortDefinition: "Pick the current training day, log each exercise's sets (weight, reps, RIR/RPE, form scores), expand the Technique Guide if unsure of form, and save the workout.",
    beginnerExplanation: "Each exercise card shows your last logged session so you know what to aim to beat — log honestly, including any pain flags.",
    whyItMatters: "Accurate Train tab logging is the foundation every other feature (progression, verdicts, scores) depends on.",
    projectReacherApplication: "Use the expandable metric labels (chevron/info toggles) on any field you're unsure about, right there in the logging form.",
    practicalAction: ["Log sets immediately after completing them, not from memory at the end of the session."],
    relatedTerms: ["logbook-progression", "valid-rep-standard"], tags: ["how to use train tab"], readingTimeMin: 1, evidenceTier: "Implementation"
  }),
  E({
    slug: "how-to-use-meal-tab", title: "How to Use the Meal Tab", category: "Project Reacher System", difficulty: "Basic",
    instantMeaning: "Describe the meal, review the estimate, correct if needed.",
    shortDefinition: "Describe what you ate, let AI Macro Estimation suggest calories/macros, check the confidence score, correct the numbers if you know the real values, then save.",
    beginnerExplanation: "The more specific the meal description (brand, portion, cooking method), the more reliable the estimate will be.",
    whyItMatters: "Good meal-tab habits are what make the Weekly Review's nutrition verdict trustworthy.",
    projectReacherApplication: "Use Sync Meals to Daily Nutrition to roll logged meals up into the day's nutrition totals.",
    practicalAction: ["Correct low-confidence estimates when you know the real numbers."],
    relatedTerms: ["macro-tracking-ai-estimation", "confidence-score"], tags: ["how to use meal tab"], readingTimeMin: 1, evidenceTier: "Implementation"
  }),
  E({
    slug: "how-to-use-weekly-review", title: "How to Use the Weekly Review", category: "Project Reacher System", difficulty: "Basic",
    instantMeaning: "Generate it, read every verdict, act on what's weakest.",
    shortDefinition: "Generate the Weekly Check-In, read each sub-verdict (bodyweight, nutrition, training, recovery, stimulant), and act on whichever area is weakest rather than only the headline verdict.",
    beginnerExplanation: "It's built from that week's logged data, so consistent daily/session logging makes the review far more useful.",
    whyItMatters: "This is the app's main weekly decision-support checkpoint for the whole plan.",
    projectReacherApplication: "See Weekly Check-In Verdicts for what each sub-verdict actually means.",
    practicalAction: ["Generate it on a consistent day each week (e.g. Sunday night) for a reliable routine."],
    relatedTerms: ["weekly-verdicts", "why-weekly-reviews-matter"], tags: ["how to use weekly review"], readingTimeMin: 1, evidenceTier: "Implementation"
  }),
  E({
    slug: "how-to-interpret-ai-coach", title: "How to Interpret AI Coach Recommendations", category: "Project Reacher System", difficulty: "Basic",
    instantMeaning: "Read the reasoning, not just the verdict.",
    shortDefinition: "Every AI Coach recommendation comes with a stated reason drawn from your logged data — read that reasoning to judge whether it fits your own sense of the session, not just the headline suggestion.",
    beginnerExplanation: "If a recommendation doesn't match how the session actually felt, that's worth a second look — the app only knows what you logged.",
    whyItMatters: "These are local, rule-based outputs from your own data, not an infallible external judgement.",
    projectReacherApplication: "See AI Coach Recommendations for exactly how these are generated.",
    practicalAction: ["Cross-check a surprising recommendation against your own memory of the session before accepting it."],
    relatedTerms: ["ai-coach-recommendations"], tags: ["interpreting AI coach"], readingTimeMin: 1, evidenceTier: "Implementation"
  }),
  E({
    slug: "how-to-decide-increase-weight", title: "How to Decide Whether to Increase Weight", category: "Project Reacher System", difficulty: "Intermediate",
    instantMeaning: "Top of the rep range, good form, no pain — then add a small increment.",
    shortDefinition: "Increase load when both working sets hit the top of the target rep range with good form quality, consistent ROM, controlled tempo, and no pain — then add a small increment and drop back toward the bottom of the rep range.",
    beginnerExplanation: "This is double progression in practice — see the Progression Methods article for the full underlying logic.",
    whyItMatters: "Following a clear rule removes guesswork and prevents adding weight before it's genuinely earned.",
    projectReacherApplication: "The app's own progression recommendation on each exercise card follows exactly this logic — use it as a starting check, then apply your own judgement.",
    practicalAction: ["Don't add weight based on how a single easy-feeling rep felt — check the full criteria first."],
    relatedTerms: ["progression-methods", "form-quality-controls-progression"], tags: ["deciding to increase weight"], readingTimeMin: 1, evidenceTier: "Implementation"
  }),
  E({
    slug: "what-counts-as-good-progress", title: "What Counts as Good Progress", category: "Project Reacher System", difficulty: "Basic",
    instantMeaning: "Multiple signals moving the right direction together, not just one number.",
    shortDefinition: "Good progress means strength trending up, measurements moving toward target proportions, waist staying controlled relative to that, and recovery holding up — not any single metric alone.",
    beginnerExplanation: "A single great session, or a single week of fast scale-weight gain, doesn't tell the whole story — look for several signals agreeing over several weeks.",
    whyItMatters: "Judging progress from one noisy metric leads to overreacting to normal week-to-week variation.",
    projectReacherApplication: "Cross-check the Reacher Score, Weekly Verdicts, PR Tracker and measurement trends together rather than picking just one.",
    practicalAction: ["Review progress monthly across strength, measurements, waist and recovery together, not weekly on any single metric."],
    relatedTerms: ["reacher-score", "lean-gain-quality-score"], tags: ["good progress"], readingTimeMin: 1, evidenceTier: "Implementation"
  }),
  E({
    slug: "how-to-know-calories-should-increase", title: "How to Know if Calories Should Increase", category: "Project Reacher System", difficulty: "Intermediate",
    instantMeaning: "Weekly rate of gain consistently below target, with training performance still fine.",
    shortDefinition: "Consider increasing calories if the 7-day average weight trend runs consistently below the ~+0.25 kg/week target for 2+ weeks, especially if training performance is also flat or declining.",
    beginnerExplanation: "A slow gain rate over several weeks, not just one, is the signal — plus checking that low energy/performance isn't a separate recovery issue instead.",
    whyItMatters: "Under-eating during a bulk quietly limits both training performance and muscle-building potential.",
    projectReacherApplication: "The Weekly Review's suggested calorie adjustment uses this exact logic — read the reasoning it gives before accepting.",
    practicalAction: ["Wait for a 2+ week trend before adjusting calories, not a single low week."],
    relatedTerms: ["weekly-rate-of-gain", "calories-energy-balance"], tags: ["increasing calories"], readingTimeMin: 1, evidenceTier: "Implementation"
  }),
  E({
    slug: "how-to-know-volume-should-increase", title: "How to Know if Volume Should Increase", category: "Project Reacher System", difficulty: "Intermediate",
    instantMeaning: "Only once recovery clearly supports it.",
    shortDefinition: "Consider adding volume (an extra set or exercise) only once current volume is consistently well-recovered from — stable or improving Recovery/Energy scores, no persistent soreness, and strength still climbing.",
    beginnerExplanation: "More volume is not automatically better, especially given a fixed, limited sleep budget — it should be added deliberately, not by default.",
    whyItMatters: "Adding volume before recovery capacity supports it is a common cause of stalling progress or injury.",
    projectReacherApplication: "Check Recovery Resilience trends and Deload Readiness signals before adding volume, not just whether a muscle 'feels like it could use more.'",
    practicalAction: ["Add one small increment (e.g. one extra set) at a time and monitor recovery for 1-2 weeks before adding more."],
    relatedTerms: ["recovery-resilience-score", "training-volume-effective-reps"], tags: ["increasing volume"], readingTimeMin: 1, evidenceTier: "Implementation"
  }),
  E({
    slug: "how-to-know-recovery-limiting", title: "How to Know if Recovery is Limiting Progress", category: "Project Reacher System", difficulty: "Intermediate",
    instantMeaning: "Multiple recovery signals trending down together, alongside stalling performance.",
    shortDefinition: "Recovery is likely the limiting factor if Recovery/Energy scores trend down, soreness stays elevated, and performance (reps/weight) flattens or drops across multiple exercises simultaneously.",
    beginnerExplanation: "One bad session rarely means recovery is the bottleneck — a pattern across several sessions and several signals together is the real signal.",
    whyItMatters: "Correctly identifying recovery (versus calories, or just needing to push harder) as the bottleneck changes what the right fix actually is.",
    projectReacherApplication: "See the Weekly Review's recovery warnings, built from exactly this kind of multi-signal pattern in the Recovery tab data.",
    practicalAction: ["If several recovery signals and performance are declining together, consider a deload before adding more training stress."],
    relatedTerms: ["deload-readiness", "recovery-resilience-score"], tags: ["recovery limiting progress"], readingTimeMin: 1, evidenceTier: "Implementation"
  }),
  E({
    slug: "how-to-adapt-training-to-your-own-style", title: "How to Adapt Training to Your Own Style", category: "Project Reacher System", difficulty: "Advanced",
    instantMeaning: "Methods can change; the underlying principles don't.",
    shortDefinition: "Over time, exercises, rep ranges and set counts can reasonably be adapted to individual preference and response — as long as progressive overload, form quality, recovery, calories, protein and waist control remain the guiding principles.",
    beginnerExplanation: "The specific program here is one valid way to apply the principles, not the only way — the goal is to eventually understand the principles well enough to adapt intelligently.",
    whyItMatters: "A program followed blindly forever, without understanding why it works, can't be adapted when life circumstances (schedule, injury, access to equipment) inevitably change.",
    projectReacherApplication: "Use the Library to understand the 'why' behind each program choice — that understanding is what makes safe, sensible adaptation possible later.",
    practicalAction: ["Before changing an exercise or rep range, check which underlying principle it's meant to serve, and preserve that."],
    relatedTerms: ["what-is-project-reacher", "exercise-selection-specificity"], tags: ["adapting training", "training philosophy"],
    readingTimeMin: 2, evidenceTier: "Consensus"
  }),
];
