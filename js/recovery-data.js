// Static reference content for the Recovery Command Centre — supplement evidence
// database, medical/peptide education-only database, and recovery protocol
// templates. Read-only reference data; nothing here touches user-entered save data.
//
// SAFETY: entries in MEDICAL_EDUCATION_DATABASE are strictly educational. This app
// never provides peptide dosing, sourcing, or cycle protocols, never recommends
// self-prescribing, and never recommends illegal or unregulated performance-enhancing
// drugs. Every entry carries the same mandatory disclaimer block (see
// MEDICAL_DISCLAIMERS below) and is surfaced only as "education only" content.

export const MEDICAL_DISCLAIMERS = [
  "Educational only",
  "Discuss with a qualified healthcare professional",
  "Quality, legality, purity, side effects and medical suitability vary",
  "Do not self-prescribe",
  "The app does not recommend this as a protocol"
];

function Supp(o) {
  return {
    id: o.id,
    name: o.name,
    category: o.category,
    purpose: o.purpose,
    evidenceLevel: o.evidenceLevel,
    bestUseCase: o.bestUseCase || "",
    doseGuidance: o.doseGuidance || "",
    timing: o.timing || "",
    expectedBenefit: o.expectedBenefit || "",
    sideEffects: o.sideEffects || "",
    cautions: o.cautions || "",
    projectReacherUse: o.projectReacherUse,
    recommendationStyle: o.recommendationStyle || "optional",
    clinicianRequired: o.clinicianRequired || false,
    medicalCaution: o.medicalCaution || false,
    educationOnly: o.educationOnly || false,
    notReplacementNote: "Not a replacement for sleep, calories, protein, carbs, hydration or appropriate training load."
  };
}

export const EVIDENCE_LEVELS = ["Strong", "Moderate", "Mixed", "Weak", "Insufficient", "Caution / Medical Only", "Education Only"];

export const SUPPLEMENT_CATEGORIES = [
  "Core muscle/performance", "Performance / workout enhancement", "Recovery / sleep support",
  "Hydration/electrolytes", "General health support", "Optional / conditional",
  "Low priority / overhyped", "Restricted / medical education only"
];

export const SUPPLEMENT_DATABASE = [
  Supp({
    id: "creatine-monohydrate", name: "Creatine Monohydrate", category: "Core muscle/performance",
    purpose: "Repeated high-intensity effort, strength/power support, resistance training support.",
    evidenceLevel: "Strong", doseGuidance: "3-5g daily", timing: "Any time",
    expectedBenefit: "Supports strength and repeated hard-set performance over time.",
    sideEffects: "May increase bodyweight slightly through water retention.",
    cautions: "Not a stimulant.",
    projectReacherUse: "Core daily supplement — foundational for a 6-day hard training week.",
    recommendationStyle: "core"
  }),
  Supp({
    id: "protein-powder", name: "Protein Powder", category: "Core muscle/performance",
    purpose: "Convenient protein target support.",
    evidenceLevel: "Strong when protein target is not met through food",
    doseGuidance: "As needed to hit protein target", timing: "Any time",
    expectedBenefit: "Helps close the gap to the daily protein target when food alone is inconvenient.",
    projectReacherUse: "Useful if food is inconvenient — not mandatory if protein target is already hit with food.",
    recommendationStyle: "core"
  }),
  Supp({
    id: "electrolytes-sodium", name: "Electrolytes / Sodium", category: "Hydration/electrolytes",
    purpose: "Hydration/performance support when sweating, using caffeine, or training hard.",
    evidenceLevel: "Strong/contextual", timing: "Around training, especially hard/hot sessions",
    expectedBenefit: "Supports hydration status and pump quality during hard training.",
    projectReacherUse: "Especially useful with hard sessions, high sweat, poor pump, or low fluids.",
    recommendationStyle: "core"
  }),
  Supp({
    id: "caffeine", name: "Caffeine", category: "Performance / workout enhancement",
    purpose: "Acute performance, alertness, perceived effort support.",
    evidenceLevel: "Strong", timing: "Controlled and timing-aware — avoid late-day use",
    expectedBenefit: "Can improve performance, alertness and perceived effort.",
    sideEffects: "Sleep disruption, anxiety, jitters, tolerance at high intake.",
    cautions: "More caffeine is not always better. Caffeine may be masking fatigue rather than fixing recovery.",
    projectReacherUse: "Use in a controlled, timing-aware way — never increase caffeine to force a poor-readiness session.",
    recommendationStyle: "conditional"
  }),
  Supp({
    id: "beta-alanine", name: "Beta-Alanine", category: "Performance / workout enhancement",
    purpose: "Fatigue buffering via muscle carnosine for repeated high-intensity efforts.",
    evidenceLevel: "Moderate/strong for repeated high-intensity efforts",
    doseGuidance: "3.2-6.4g/day if used", timing: "Daily consistency matters more than acute timing",
    expectedBenefit: "Supports repeated hard sets, legs, arms/delts, and high-rep work over time.",
    sideEffects: "Tingling/paraesthesia (harmless).",
    projectReacherUse: "Optional for hard repeated sets — not a direct muscle-gain supplement, and not an acute one-off miracle.",
    recommendationStyle: "optional"
  }),
  Supp({
    id: "citrulline-malate", name: "Citrulline Malate / L-Citrulline", category: "Performance / workout enhancement",
    purpose: "Pump/blood-flow/performance support.",
    evidenceLevel: "Mixed / less certain", doseGuidance: "If included, commonly 6-8g citrulline malate pre-workout",
    timing: "Pre-workout",
    projectReacherUse: "Optional, not foundational — do not overclaim.",
    recommendationStyle: "optional"
  }),
  Supp({
    id: "nitrate-beetroot", name: "Nitrate / Beetroot", category: "Performance / workout enhancement",
    purpose: "Exercise economy/performance support.",
    evidenceLevel: "Moderate, stronger in endurance/economy contexts",
    projectReacherUse: "Optional, less central for hypertrophy training.",
    recommendationStyle: "optional"
  }),
  Supp({
    id: "sodium-bicarbonate", name: "Sodium Bicarbonate", category: "Performance / workout enhancement",
    purpose: "Buffering for selected hard efforts.",
    evidenceLevel: "Moderate for selected high-intensity efforts",
    sideEffects: "GI distress.", cautions: "High sodium load.",
    projectReacherUse: "Not default — advanced/specific protocols only.",
    recommendationStyle: "optional"
  }),
  Supp({
    id: "carb-powder", name: "Carbohydrate Powder / Dextrose / Cyclic Dextrin", category: "Performance / workout enhancement",
    purpose: "Convenient carbs around training.",
    evidenceLevel: "Strong/contextual as sports food",
    projectReacherUse: "Optional if food is difficult, sessions are long, or the session is under-fuelled — food first.",
    recommendationStyle: "optional"
  }),
  Supp({
    id: "taurine", name: "Taurine", category: "Optional / conditional",
    purpose: "Research pending / mixed performance support.",
    evidenceLevel: "Insufficient",
    projectReacherUse: "Research pending — do not prioritise.",
    recommendationStyle: "low-priority"
  }),
  Supp({
    id: "l-theanine", name: "L-Theanine", category: "Optional / conditional",
    purpose: "Calm/focus support, often paired with caffeine.",
    evidenceLevel: "Mixed/contextual",
    projectReacherUse: "May pair with caffeine if jitters are an issue — not foundational.",
    recommendationStyle: "optional"
  }),
  Supp({
    id: "magnesium-glycinate", name: "Magnesium Glycinate", category: "Recovery / sleep support",
    purpose: "Sleep routine support if helpful.",
    evidenceLevel: "Mixed/contextual", doseGuidance: "200-350mg pre-bed if tolerated", timing: "Pre-bed",
    projectReacherUse: "Optional — not a cure for poor sleep opportunity. Fix sleep opportunity first.",
    recommendationStyle: "optional"
  }),
  Supp({
    id: "glycine", name: "Glycine", category: "Recovery / sleep support",
    purpose: "Sleep routine support.",
    evidenceLevel: "Insufficient", doseGuidance: "~3g pre-bed if used/tolerated", timing: "Pre-bed",
    projectReacherUse: "Optional; evidence still developing.",
    recommendationStyle: "optional"
  }),
  Supp({
    id: "melatonin", name: "Melatonin", category: "Recovery / sleep support",
    purpose: "Circadian timing support.",
    evidenceLevel: "Moderate for circadian timing contexts, not a default insomnia solution",
    cautions: "Short-term/circadian use only — not a routine nightly bodybuilding recovery supplement.",
    projectReacherUse: "Caution — for circadian-timing situations, not routine sleep-debt fixing.",
    recommendationStyle: "caution"
  }),
  Supp({
    id: "ashwagandha", name: "Ashwagandha", category: "Recovery / sleep support",
    purpose: "Stress/sleep support for some users.",
    evidenceLevel: "Mixed",
    sideEffects: "Drowsiness, interactions.", cautions: "Rare liver injury reported — use with caution.",
    projectReacherUse: "Optional with caution, not default.",
    recommendationStyle: "caution"
  }),
  Supp({
    id: "tart-cherry", name: "Tart Cherry", category: "Recovery / sleep support",
    purpose: "Soreness/recovery support.",
    evidenceLevel: "Mixed/limited",
    projectReacherUse: "Optional around heavy phases — not mandatory.",
    recommendationStyle: "optional"
  }),
  Supp({
    id: "casein-prebed-protein", name: "Casein / Pre-Bed Protein", category: "Recovery / sleep support",
    purpose: "Overnight protein availability / protein target support.",
    evidenceLevel: "Moderate/strong as protein support", doseGuidance: "30-50g", timing: "Pre-bed",
    projectReacherUse: "Useful if it helps hit daily protein and supports the pre-bed routine.",
    recommendationStyle: "optional"
  }),
  Supp({
    id: "omega-3", name: "Omega-3", category: "General health support",
    purpose: "General health/recovery support.",
    evidenceLevel: "Mixed",
    projectReacherUse: "Optional if fatty fish intake is low.",
    recommendationStyle: "optional"
  }),
  Supp({
    id: "vitamin-d", name: "Vitamin D", category: "General health support",
    purpose: "General health, deficiency correction.",
    evidenceLevel: "Mixed",
    projectReacherUse: "Diet/sunlight/bloodwork-led — not a default ergogenic claim.",
    recommendationStyle: "optional"
  }),
  Supp({
    id: "zinc", name: "Zinc", category: "General health support",
    purpose: "Deficiency correction.",
    evidenceLevel: "Insufficient",
    projectReacherUse: "Only relevant if intake/deficiency is a genuine concern — not a testosterone booster.",
    recommendationStyle: "low-priority"
  }),
  Supp({
    id: "collagen-vitamin-c", name: "Collagen/Gelatin + Vitamin C", category: "General health support",
    purpose: "Tendon/joint support.",
    evidenceLevel: "Mixed/contextual",
    projectReacherUse: "Optional if tendon/joint issues are a recurring theme — combine with load management and professional support if persistent.",
    recommendationStyle: "optional"
  }),
  Supp({
    id: "curcumin", name: "Curcumin", category: "General health support",
    purpose: "Soreness/inflammation support.",
    evidenceLevel: "Mixed",
    projectReacherUse: "Optional — avoid overclaiming.",
    recommendationStyle: "optional"
  }),
  Supp({
    id: "bcaas", name: "BCAAs", category: "Low priority / overhyped",
    purpose: "Leucine/isoleucine/valine amino acids.",
    evidenceLevel: "Weak",
    projectReacherUse: "BCAAs are not harmful in normal doses, but they are not the main benefit if the protein target is already met. At ~140g protein/day, BCAAs should not be treated as important.",
    recommendationStyle: "low-priority"
  }),
  Supp({
    id: "eaas", name: "EAAs", category: "Low priority / overhyped",
    purpose: "Essential amino acid support.",
    evidenceLevel: "Weak",
    projectReacherUse: "May be useful if training fasted or protein is low — a complete protein source is usually better.",
    recommendationStyle: "low-priority"
  }),
  Supp({
    id: "hmb", name: "HMB", category: "Low priority / overhyped",
    purpose: "Muscle protein breakdown support.",
    evidenceLevel: "Weak",
    projectReacherUse: "Low priority for a trained lifter.",
    recommendationStyle: "low-priority"
  }),
  Supp({
    id: "glutamine", name: "Glutamine", category: "Low priority / overhyped",
    purpose: "Recovery/immune support.",
    evidenceLevel: "Weak",
    projectReacherUse: "Low priority/research pending for hypertrophy/recovery in a well-fed lifter.",
    recommendationStyle: "low-priority"
  }),
  Supp({
    id: "testosterone-boosters", name: "Testosterone Boosters", category: "Low priority / overhyped",
    purpose: "Marketed hormone support.",
    evidenceLevel: "Weak",
    cautions: "Overhyped — not reliable muscle-gain tools.",
    projectReacherUse: "Not recommended as a reliable muscle-gain tool.",
    recommendationStyle: "avoid"
  }),
  Supp({
    id: "fat-burners", name: "Fat Burners", category: "Low priority / overhyped",
    purpose: "Marketed fat-loss support.",
    evidenceLevel: "Weak",
    cautions: "Not relevant to a current lean bulk phase.",
    projectReacherUse: "Not relevant to the current lean bulk — use with caution generally.",
    recommendationStyle: "avoid"
  }),
  Supp({
    id: "proprietary-blends", name: "Proprietary Blends", category: "Low priority / overhyped",
    purpose: "Undisclosed-dose combination products.",
    evidenceLevel: "Insufficient",
    cautions: "Caution if doses are hidden behind a proprietary blend label.",
    projectReacherUse: "Caution — prefer products with fully disclosed doses.",
    recommendationStyle: "caution"
  })
];

function Med(o) {
  return {
    id: o.id,
    name: o.name,
    category: "Restricted / medical education only",
    whatItIs: o.whatItIs,
    whyPeopleConsiderIt: o.whyPeopleConsiderIt,
    evidenceQuality: o.evidenceQuality,
    riskNotes: o.riskNotes,
    legalMedicalCaution: o.legalMedicalCaution,
    whenToSpeakToClinician: o.whenToSpeakToClinician,
    disclaimers: MEDICAL_DISCLAIMERS,
    educationOnly: true,
    clinicianRequired: true,
    medicalCaution: true
  };
}

export const MEDICAL_EDUCATION_DATABASE = [
  Med({
    id: "peptides-education", name: "Peptides: Education and Caution",
    whatItIs: "A broad class of short amino-acid-chain compounds discussed online in fitness/recovery contexts, with widely varying legal status and product quality.",
    whyPeopleConsiderIt: "Often discussed for recovery, injury, sleep or body-composition claims.",
    evidenceQuality: "Highly variable and often weak for the specific claims made in fitness marketing.",
    riskNotes: "Sourcing, purity, legality and side-effect profiles vary enormously; unregulated products carry real risk.",
    legalMedicalCaution: "Legal and regulatory status varies by country and by specific compound.",
    whenToSpeakToClinician: "Before considering any peptide for any reason — this is a medical decision, not a supplement decision."
  }),
  Med({
    id: "bpc-157", name: "BPC-157: Education Only",
    whatItIs: "A synthetic peptide sometimes discussed in relation to tissue/tendon recovery.",
    whyPeopleConsiderIt: "Anecdotal interest in soft-tissue/tendon recovery support.",
    evidenceQuality: "Limited, mostly preclinical/animal evidence; human evidence is not established to the standard of an approved therapy.",
    riskNotes: "Not an approved therapeutic in most jurisdictions for this use; sourcing and purity are unverifiable outside medical supply chains.",
    legalMedicalCaution: "Legal status varies; not FDA-approved for this use.",
    whenToSpeakToClinician: "If tendon/joint pain is persistent, see a sports physio or doctor instead of considering this."
  }),
  Med({
    id: "tb-500", name: "TB-500 / Thymosin Beta-4 Related Compounds: Education Only",
    whatItIs: "A synthetic peptide related to a naturally occurring protein, sometimes discussed for tissue repair.",
    whyPeopleConsiderIt: "Anecdotal interest in recovery/tissue repair.",
    evidenceQuality: "Limited human evidence for fitness-context claims.",
    riskNotes: "Sourcing/purity/legality vary; unregulated use carries real risk.",
    legalMedicalCaution: "Legal status varies by country.",
    whenToSpeakToClinician: "For any persistent soft-tissue injury, a clinician or sports physio is the appropriate first step."
  }),
  Med({
    id: "cjc-ipamorelin", name: "CJC-1295 / Ipamorelin: Education Only",
    whatItIs: "Growth-hormone-releasing peptide compounds sometimes discussed for recovery/body-composition.",
    whyPeopleConsiderIt: "Marketed claims around recovery, sleep and body composition.",
    evidenceQuality: "Limited controlled human evidence for these specific fitness claims.",
    riskNotes: "Hormonal-axis effects, sourcing/purity concerns, and long-term safety data are limited.",
    legalMedicalCaution: "Prescription-only or restricted in many jurisdictions.",
    whenToSpeakToClinician: "This is a hormonal intervention — a doctor, not an app, is the appropriate source of guidance."
  }),
  Med({
    id: "growth-hormone-secretagogues", name: "Growth Hormone Secretagogues: Education Only",
    whatItIs: "A broader class of compounds intended to stimulate growth hormone release.",
    whyPeopleConsiderIt: "Marketed recovery/body-composition claims.",
    evidenceQuality: "Variable and often weak for fitness-specific claims.",
    riskNotes: "Hormonal-axis effects and long-term safety are not well characterised for most products.",
    legalMedicalCaution: "Regulatory status varies; medical supervision is standard practice where legitimately used.",
    whenToSpeakToClinician: "Before considering this category for any reason."
  }),
  Med({
    id: "prescription-sleep-aids", name: "Prescription Sleep Aids: Medical Only",
    whatItIs: "Prescription medications used clinically for diagnosed sleep disorders.",
    whyPeopleConsiderIt: "Persistent, severe difficulty sleeping despite good sleep habits.",
    evidenceQuality: "Established for specific clinical diagnoses under medical supervision.",
    riskNotes: "Dependence, next-day impairment and interaction risks depend on the specific medication.",
    legalMedicalCaution: "Prescription-only — a doctor must assess and prescribe.",
    whenToSpeakToClinician: "If sleep problems are persistent and not resolved by consistent sleep opportunity, caffeine cutoff and a pre-bed routine."
  }),
  Med({
    id: "bloodwork-medical-review", name: "Bloodwork / Medical Review",
    whatItIs: "Clinical blood testing and review by a qualified healthcare professional.",
    whyPeopleConsiderIt: "To check for deficiencies, hormonal issues, or explain persistent unexplained fatigue/performance decline.",
    evidenceQuality: "The gold-standard way to investigate a genuine physiological concern — far more reliable than a supplement guess.",
    riskNotes: "None beyond standard bloodwork procedure.",
    legalMedicalCaution: "Arrange through a GP/doctor.",
    whenToSpeakToClinician: "Persistent unexplained fatigue, performance collapse, or symptoms outside normal training fatigue."
  }),
  Med({
    id: "sports-physio-referral", name: "Sports Physiotherapy / Sports Medicine Referral",
    whatItIs: "Assessment and treatment by a qualified sports physiotherapist or sports medicine clinician.",
    whyPeopleConsiderIt: "Persistent joint/tendon pain, movement-specific pain, or an injury that isn't resolving with normal load management.",
    evidenceQuality: "The appropriate, evidence-based route for musculoskeletal pain that isn't normal training soreness.",
    riskNotes: "None — this is the safe, recommended path.",
    legalMedicalCaution: "Seek a qualified, registered professional.",
    whenToSpeakToClinician: "Any pain flag that persists or worsens across sessions rather than easing with rest/form correction."
  })
];

/**
 * Recovery protocol templates. The static copy lives here; whether a given
 * protocol is currently TRIGGERED for a user is decided by pure functions in
 * calculations.js (activeRecoveryProtocols) that read sleepLogs/recoveryLogs/
 * stimulantLogs/hydrationLogs/mealLogs/workouts — nothing about "is this active"
 * is stored here, only the reusable guidance text for each protocol type.
 */
export const RECOVERY_PROTOCOLS = [
  {
    id: "sleep-debt", title: "Sleep Debt Protocol",
    triggerDescription: "Repeated sleep below target, low morning energy, poor sleep quality.",
    todayAction: "Protect your caffeine cutoff and follow your pre-bed routine tonight.",
    next48hAction: "Use the weekend recovery window (or the next lower-demand day) to extend sleep toward 8-10h.",
    trainingAdjustment: "Hold load if readiness is red — avoid chasing PRs.",
    nutritionAction: "Keep protein and carbs on target; don't skip meals to compensate for tiredness.",
    hydrationAction: "Maintain normal hydration/electrolyte intake.",
    caffeineAction: "Don't increase caffeine to compensate — protect the cutoff time instead.",
    sleepAction: "Prioritise sleep opportunity above all else tonight.",
    supplementSupport: "Magnesium glycinate or glycine pre-bed only if already tolerated — not a fix for the underlying sleep debt.",
    escalationNote: "If short sleep persists for 2+ weeks despite consistent opportunity, consider a GP/doctor conversation."
  },
  {
    id: "under-fuelled", title: "Under-Fuelled Training Protocol",
    triggerDescription: "Low carbs/calories, bodyweight not rising, poor pump/performance.",
    todayAction: "Add 30-80g carbs and 25-40g protein 60-120 minutes before training.",
    next48hAction: "Review the week's calorie trend against the lean bulk target.",
    trainingAdjustment: "Keep the session as planned once fuel is corrected.",
    nutritionAction: "Add a high-carb post-workout recovery meal (60-120g carbs, 30-50g protein).",
    hydrationAction: "Pair pre-workout fuel with water and electrolytes.",
    caffeineAction: "No change needed for this issue specifically.",
    sleepAction: "No change needed for this issue specifically.",
    supplementSupport: "Carb powder pre/post-workout if food is genuinely difficult to fit in.",
    escalationNote: null
  },
  {
    id: "low-carb-flat", title: "Low-Carb / Flat Session Protocol",
    triggerDescription: "Poor pump, low carbs, repeated set drop-off within a session.",
    todayAction: "Increase carbs around training today.",
    next48hAction: "Use a high-carb recovery meal after the next hard session.",
    trainingAdjustment: "Continue training — this is a fuel timing issue, not a load issue.",
    nutritionAction: "Track carb timing around training more closely.",
    hydrationAction: "Check electrolyte intake alongside carbs.",
    caffeineAction: "No change needed for this issue specifically.",
    sleepAction: "No change needed for this issue specifically.",
    supplementSupport: "Optional carb powder if food is difficult to fit in before training.",
    escalationNote: null
  },
  {
    id: "dehydration-electrolyte", title: "Dehydration / Electrolyte Protocol",
    triggerDescription: "High caffeine with low water, high sweat, poor pump, cramping or headache.",
    todayAction: "Add water and sodium/electrolytes before training.",
    next48hAction: "Do a hydration check before every session this week.",
    trainingAdjustment: "No load change needed once hydration is corrected.",
    nutritionAction: "Pair meals with adequate fluid intake.",
    hydrationAction: "Prioritise water and electrolytes, especially around caffeine and hard/hot sessions.",
    caffeineAction: "Be mindful that caffeine without hydration support increases risk.",
    sleepAction: "No change needed for this issue specifically.",
    supplementSupport: "Electrolyte/sodium support around training.",
    escalationNote: "Persistent cramping or headaches despite good hydration warrant a professional check."
  },
  {
    id: "high-caffeine-low-readiness", title: "High Caffeine / Low Readiness Protocol",
    triggerDescription: "High caffeine intake but low energy/readiness.",
    todayAction: "Do not increase caffeine — treat this as a recovery/fuel issue, not a stimulant issue.",
    next48hAction: "Improve sleep, fuel and hydration before your next session.",
    trainingAdjustment: "Hold load, chase clean reps rather than PRs.",
    nutritionAction: "Check pre-workout fuel is actually being completed.",
    hydrationAction: "Check hydration is actually being completed.",
    caffeineAction: "Reduce late caffeine and track whether a crash or sleep disruption follows.",
    sleepAction: "Protect the caffeine cutoff to give sleep a fair chance tonight.",
    supplementSupport: null,
    escalationNote: null
  },
  {
    id: "high-soreness", title: "High Soreness Protocol",
    triggerDescription: "Soreness high, performance stable or slightly down.",
    todayAction: "Hold load if soreness is limiting range of motion or output.",
    next48hAction: "Prioritise a post-workout recovery meal and sleep extension.",
    trainingAdjustment: "Technique focus over load increases.",
    nutritionAction: "Complete the post-workout recovery meal.",
    hydrationAction: "Maintain normal hydration.",
    caffeineAction: "No change needed for this issue specifically.",
    sleepAction: "Extend sleep where possible over the next 48h.",
    supplementSupport: "Tart cherry is an optional, non-mandatory option around heavy phases.",
    escalationNote: null
  },
  {
    id: "overreaching-risk", title: "Overreaching Risk Protocol",
    triggerDescription: "Performance down across sessions, soreness high, motivation down, sleep low, high failure volume.",
    todayAction: "Reduce optional finishers this session.",
    next48hAction: "Hold load across the next 1-2 sessions and prioritise weekend sleep.",
    trainingAdjustment: "Hold load; consider a deload if this pattern persists beyond a week.",
    nutritionAction: "Confirm calories and protein are actually on target, not just planned.",
    hydrationAction: "Maintain normal hydration.",
    caffeineAction: "Don't use caffeine to push through this pattern.",
    sleepAction: "Prioritise weekend sleep extension.",
    supplementSupport: null,
    escalationNote: "If this pattern persists beyond 1-2 weeks despite recovery efforts, a planned deload is the safer path."
  },
  {
    id: "joint-tendon-warning", title: "Joint / Tendon Warning Protocol",
    triggerDescription: "Pain flags, persistent elbow/wrist/shoulder pain.",
    todayAction: "Stop load increases on the painful movement.",
    next48hAction: "Review form/ROM on the affected movement before the next session.",
    trainingAdjustment: "Substitute the movement if pain persists.",
    nutritionAction: null,
    hydrationAction: null,
    caffeineAction: null,
    sleepAction: null,
    supplementSupport: "Collagen/gelatin + vitamin C is an optional, non-mandatory option — not a substitute for load management.",
    escalationNote: "Seek a sports physio or qualified medical professional if pain persists or worsens."
  },
  {
    id: "forearm-elbow-overload", title: "Forearm / Elbow Overload Protocol",
    triggerDescription: "Forearm/elbow discomfort logged after Day 6.",
    todayAction: "Monitor grip work volume today.",
    next48hAction: "Hold curl/extension progression for the next 48h.",
    trainingAdjustment: "Reduce optional loaded holds temporarily.",
    nutritionAction: null,
    hydrationAction: null,
    caffeineAction: null,
    sleepAction: null,
    supplementSupport: null,
    escalationNote: "Check wrist position on curls/extensions; seek professional help if discomfort persists."
  },
  {
    id: "shoulder-irritation", title: "Shoulder Irritation Protocol",
    triggerDescription: "Shoulder pain, lateral raise/press discomfort.",
    todayAction: "Monitor side-delt volume today.",
    next48hAction: "Avoid ego-loading lateral raises/presses for the next 48h.",
    trainingAdjustment: "Reduce painful range of motion.",
    nutritionAction: null,
    hydrationAction: null,
    caffeineAction: null,
    sleepAction: null,
    supplementSupport: null,
    escalationNote: "Seek professional support if shoulder discomfort persists."
  },
  {
    id: "weekend-recovery-extension", title: "Weekend Recovery Extension Protocol",
    triggerDescription: "Hard training week combined with weekday sleep restriction.",
    todayAction: "Plan 8-10h sleep for Saturday and Sunday.",
    next48hAction: "Add an optional 20-30 minute nap and a high-carb recovery meal.",
    trainingAdjustment: "Monday readiness may be upgraded slightly if the weekend extension is completed.",
    nutritionAction: "Prioritise high-carb recovery meals over the weekend.",
    hydrationAction: "Maintain normal hydration.",
    caffeineAction: "Lower caffeine intake over the weekend where possible.",
    sleepAction: "8-10h Saturday and Sunday sleep is the target.",
    supplementSupport: null,
    escalationNote: null
  },
  {
    id: "pre-bed-recovery", title: "Pre-Bed Recovery Protocol",
    triggerDescription: "Short sleep or a poor sleep routine.",
    todayAction: "Complete the pre-bed routine tonight.",
    next48hAction: "Keep the caffeine cutoff and sleep/wake target consistent.",
    trainingAdjustment: null,
    nutritionAction: "30-50g pre-bed protein.",
    hydrationAction: null,
    caffeineAction: "Protect the caffeine cutoff time.",
    sleepAction: "Consistent sleep/wake target, even on lighter days.",
    supplementSupport: "Magnesium glycinate or glycine only if already tolerated.",
    escalationNote: null
  },
  {
    id: "deload-consideration", title: "Deload Consideration Protocol",
    triggerDescription: "Repeated performance decline, high soreness, low readiness, poor sleep.",
    todayAction: "Reduce load/volume for this session.",
    next48hAction: "Remove optional finishers for the next 1-2 sessions.",
    trainingAdjustment: "Prioritise recovery over progression this week.",
    nutritionAction: "Keep calories and protein on target through the lighter week.",
    hydrationAction: "Maintain normal hydration.",
    caffeineAction: "Don't use caffeine to mask the underlying pattern.",
    sleepAction: "Prioritise sleep extension through this week.",
    supplementSupport: null,
    escalationNote: "If this pattern continues beyond a deload week, consider a professional review."
  }
];
