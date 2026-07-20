// Built-in evidence-graded peptide library (Peptides Node master spec, section 4).
// Read-only reference content. Nothing here recommends a peptide, a dose, a route,
// or a cycle — it exists so a user who has already chosen to track a compound can
// see what is and is not established before they log anything.

export const EVIDENCE_BADGES = {
  A: {
    label: "A",
    meaning: "Regulatory approval or strong replicated human evidence",
    explanation: "The claim is backed by an approved product, an approved indication, or human evidence that has been independently replicated. This is the strongest tier available and still does not mean a use is approved for every purpose or population."
  },
  B: {
    label: "B",
    meaning: "Moderate human evidence",
    explanation: "Human studies exist and are reasonably consistent, but sample sizes, replication, or study duration are limited compared to an A-grade claim."
  },
  C: {
    label: "C",
    meaning: "Limited or early human evidence",
    explanation: "Small human studies, pilot trials, or single-dose experimental work exist, but the result has not been validated as a general-use protocol."
  },
  D: {
    label: "D",
    meaning: "Case report, case series or observational signal",
    explanation: "Evidence comes from individual clinical case reports rather than controlled studies. Useful for spotting rare but serious risks; not proof of a typical outcome."
  },
  E: {
    label: "E",
    meaning: "Animal, laboratory or mechanistic evidence",
    explanation: "The evidence is preclinical — animal models, cell studies, or receptor/mechanism research. It has not been confirmed to translate to human outcomes."
  },
  F: {
    label: "F",
    meaning: "Licensed-practitioner opinion without strong clinical evidence",
    explanation: "A qualified clinician's stated opinion or common practice, not itself backed by controlled human trial data."
  },
  G: {
    label: "G",
    meaning: "Anecdotal community report",
    explanation: "Self-reported experience shared in online communities or forums. Not verified, not controlled, and often subject to selective reporting."
  },
  H: {
    label: "H",
    meaning: "Vendor or commercial claim",
    explanation: "A claim made by a seller of the product. Commercial incentive exists to overstate benefit and understate risk; treat as marketing, not evidence."
  },
  Unknown: {
    label: "Unknown",
    meaning: "Not verified",
    explanation: "No reliable source could be identified to support or refute this claim as of the last research review date. Absence of evidence is not evidence of safety or efficacy."
  }
};

export function evidenceBadgeInfo(code) {
  return EVIDENCE_BADGES[code] || EVIDENCE_BADGES.Unknown;
}

const REVIEW_DATE = "2026-07-19";

export const PEPTIDE_LIBRARY = [
  {
    id: "melanotan-ii",
    name: "Melanotan II",
    synonyms: ["Melanotan 2", "MT-II", "MT-2"],
    category: "Synthetic cyclic melanocortin agonist (heptapeptide)",
    identity: "A superpotent analogue designed to stimulate melanocortin receptor signalling. It is a distinct molecule from afamelanotide and from Melanotan I — those must not be treated as interchangeable.",
    routeEvidence: [
      { route: "Subcutaneous injection", badge: "C", summary: "The only directly identified controlled human dosing evidence is a small pilot study, not a validated general-use protocol." }
    ],
    regulatoryStatus: "Not an approved medicine. Health authorities in Australia and New Zealand have issued public warnings about unapproved peptide products including Melanotan II, citing risks of non-sterile, mislabelled or contaminated product. In practice this is best classified as an unregulated research-chemical or grey-market product.",
    antiDopingStatus: "Prohibited at all times for tested athletes under WADA's S0 class (non-approved substances).",
    investigatedUses: [
      { use: "Skin pigmentation increase", badge: "C", summary: "A pilot phase I study in 3 healthy men used escalating subcutaneous doses over two weeks; 2 of 3 participants showed increased pigmentation." }
    ],
    claimedUses: [
      { use: "Tanning acceleration / 'loading and maintenance' cycle protocols", note: "Community-described practice, not medical guidance. No published human evidence establishes a standard loading phase, maintenance phase, washout interval, or required rest period." },
      { use: "Libido / erectile effects", note: "Reported in early human dosing work and community use, but not established as a therapeutic use and linked to a serious adverse effect (see red flags below)." }
    ],
    evidenceConfidenceOverall: "Low for any routine-use protocol. Moderate confidence that safety monitoring specifically needs to prioritise skin/mole changes and priapism risk, based on case-report evidence.",
    majorUncertainties: [
      "Long-term dermatologic safety is not established.",
      "Pigmented-lesion risk has not been quantified beyond individual case reports.",
      "No route-standardised human pharmacokinetics exist.",
      "No approved use exists for any population."
    ],
    adverseEffectPriorities: [
      { effect: "Nausea, flushing, fatigue, yawning/stretching, transient erections", badge: "C", response: "Log and monitor; escalate if severe or persistent." },
      { effect: "New or darkening moles, eruptive naevi, or a lesion changing in asymmetry, border, colour, diameter or evolution", badge: "D", response: "Pause and seek prompt dermatology or GP review." },
      { effect: "Erection lasting more than 3–4 hours (priapism)", badge: "D", response: "Emergency — seek urgent medical care immediately, do not wait." }
    ],
    medicallyRecognisedCycleExists: false,
    medicallyRecognisedCycleNote: "The concept of a 'Melanotan II cycle' is an online-culture construct, not a medically recognised requirement. Community loading/maintenance language should be read as anecdotal, not instructional.",
    approvedProtocolExists: false,
    approvedProtocolNote: "No approved protocol exists for any population or purpose.",
    additionalWarning: "Increased pigmentation does not prove UV protection. Deliberate UV exposure or tanning-bed use to 'deepen' a tan, especially during any adverse effect, should be treated as a precaution, not a benefit.",
    lastResearchReviewDate: REVIEW_DATE,
    sources: [
      "Public-health warnings from Australian and New Zealand medicines regulators on unapproved peptide products",
      "WADA Prohibited List (S0 non-approved substances)",
      "Small human pilot dosing study (phase I, healthy male volunteers)",
      "Dermatology case reports on mole changes after use",
      "Case reports and emergency-medicine guidance on priapism",
      "PubChem chemical identity record"
    ]
  },
  {
    id: "ghk-cu",
    name: "GHK-Cu",
    synonyms: ["Copper tripeptide-1", "Copper peptide", "Glycyl-L-histidyl-L-lysine copper"],
    category: "Copper complex of the tripeptide GHK (glycyl-L-histidyl-L-lysine)",
    identity: "Registry identity and naming are inconsistent across chemical and cosmetic-ingredient databases, so exact label text and source documents should be treated as more reliable than any single 'universal' identity.",
    routeEvidence: [
      { route: "Topical / cosmetic", badge: "C", summary: "The strongest human evidence relates to topical or cosmetic use, and even there it is modest — often small studies or mixed/combination formulations rather than isolated GHK-Cu." },
      { route: "Injectable / systemic", badge: "Unknown", summary: "No controlled human injectable or systemic GHK-Cu trials were identified in the sources reviewed. Topical evidence must not be assumed to transfer to this route." }
    ],
    regulatoryStatus: "Recognised as a cosmetic ingredient in the EU cosmetic ingredient system when sold and used as a cosmetic. In the US compounding context it appears under interim evaluation for non-injectable routes only — an interim compounding position, not an approval, and it explicitly excludes injectable use. Also named in a 2026 Australian public-health warning among unapproved peptide products. Classification therefore depends entirely on how the specific product is sold and used.",
    antiDopingStatus: "Not separately identified as a named prohibited substance in the sources reviewed; general anti-doping principles for unapproved/unregulated products still apply if used by a tested athlete.",
    investigatedUses: [
      { use: "Hair/scalp density in male pattern hair loss (topical, combination formulation)", badge: "C", summary: "A six-month placebo-controlled study used a topical product combining 5-ALA with a GHK peptide, not isolated injectable GHK-Cu, and found improvements in hair count/thickness with no reported adverse events." },
      { use: "Wound-healing and fibroblast mechanistic activity", badge: "E", summary: "Preclinical/mechanistic laboratory work, not clinical efficacy evidence." }
    ],
    claimedUses: [
      { use: "Injectable 'whole-body regeneration', systemic anti-ageing, or copper repletion", note: "Commercial/vendor claim. No route-matched human evidence supports these claims for injectable or systemic use." }
    ],
    evidenceConfidenceOverall: "Limited-to-moderate for topical cosmetic applications. Very low for injectable or systemic use.",
    majorUncertainties: [
      "Injectable/systemic human safety and efficacy are largely unverified.",
      "Identity and naming conventions are inconsistent across chemical and cosmetic registries.",
      "No established copper-specific monitoring standard exists for ordinary topical/cosmetic exposure."
    ],
    adverseEffectPriorities: [
      { effect: "Local irritation, redness, scalp irritation (topical use)", badge: "C/F", response: "Log and monitor; pause if worsening." },
      { effect: "Contamination, route mismatch, or unsupported systemic claims (injectable/systemic use)", badge: "Unknown/F", response: "Treat as an unapproved route with limited verified human safety data. Pause and seek non-urgent clinical advice if used." }
    ],
    medicallyRecognisedCycleExists: false,
    medicallyRecognisedCycleNote: "Topical skincare studies generally used continued daily or twice-daily cosmetic use over weeks to months, not a cycle structure. Injectable 'cycle' discussion online is anecdotal and commercially entangled.",
    approvedProtocolExists: false,
    approvedProtocolNote: "No approved protocol exists for injectable or systemic use. Topical cosmetic use follows ordinary cosmetic-ingredient status, not a medical protocol.",
    additionalWarning: "Route selection matters more for this compound than any other in this library — topical and injectable/systemic use are tracked as separate data because they are not evidence-equivalent.",
    lastResearchReviewDate: REVIEW_DATE,
    sources: [
      "EU cosmetic ingredient database (CosIng) listing",
      "US compounding evaluation materials (non-injectable route only)",
      "Australian public-health warning on unapproved peptide products",
      "Placebo-controlled topical hair-loss study (combination formulation)",
      "Preclinical fibroblast/wound-healing mechanistic literature",
      "PubChem chemical identity record"
    ]
  },
  {
    id: "ghrp-2",
    name: "GHRP-2",
    synonyms: ["Pralmorelin", "KP-102", "Growth hormone-releasing peptide-2"],
    category: "Synthetic growth-hormone-releasing peptide / ghrelin-receptor agonist",
    identity: "The only compound in this library with a current, official, marketed human product — a Japanese diagnostic injection, distinct from repeated performance-oriented use.",
    routeEvidence: [
      { route: "Intravenous (approved diagnostic use, Japan)", badge: "A", summary: "A marketed 100 microgram lyophilised vial is approved in Japan as a single diagnostic stimulation test for suspected growth hormone deficiency — not for muscle gain, recovery, or anti-ageing use." },
      { route: "Subcutaneous / repeated dosing (performance or physique use)", badge: "C", summary: "Limited experimental physiology studies exist in humans, but no validated repeated-use regimen exists for any performance purpose." }
    ],
    regulatoryStatus: "Approved only for a narrow diagnostic indication in Japan (growth hormone deficiency stimulation testing). Not approved for repeated performance, physique, or anti-ageing use in any jurisdiction reviewed.",
    antiDopingStatus: "Explicitly named as a prohibited GH-releasing peptide under WADA's Prohibited List. Use by a tested athlete is incompatible with clean-sport rules regardless of purpose.",
    investigatedUses: [
      { use: "Diagnostic GH stimulation test (adults, IV, fasted, 100mcg single dose)", badge: "A", summary: "Approved Japanese product information; blood sampling for GH performed around 15, 30 and 60 minutes after dosing." },
      { use: "Diagnostic GH stimulation test (children 4 to <18 years, IV, fasted, weight-based up to 100mcg)", badge: "A", summary: "Same approved diagnostic indication, paediatric dosing." },
      { use: "Repeated/daily subcutaneous dosing", badge: "C", summary: "A 5-day study found the GH response attenuated over time and IGF-1 did not rise — evidence against assuming daily dosing reliably raises IGF-1." },
      { use: "Continuous infusion over 30 days (experimental, older adults)", badge: "C", summary: "Increased GH pulsatility and IGF-1 in one experimental infusion study; not representative of common self-administered use." }
    ],
    claimedUses: [
      { use: "Bedtime or pre-meal 'bodybuilding' timing, multi-daily pulsing, stacking with GHRH or other peptides", note: "Comes mainly from anti-doping literature, physiology experiments and anecdotal practice, not approved routine care. Should never be read as a recommendation." }
    ],
    evidenceConfidenceOverall: "Moderate for diagnostic physiology under approved conditions. Low for any repeated performance-oriented use.",
    majorUncertainties: [
      "Repeated non-diagnostic administration lacks modern human validation.",
      "Online timing and stacking practices outrun the underlying evidence base.",
      "Study designs, populations and routes vary widely and do not define a universal 'cycle'."
    ],
    adverseEffectPriorities: [
      { effect: "Heat sensation, borborygmus (stomach rumbling), sweating, mild GI symptoms", badge: "A", response: "Log and monitor — consistent with approved product information." },
      { effect: "Prolactin/ACTH/cortisol rise, endocrine spillover", badge: "C", response: "Monitor with caution; prompt clinical review if symptoms are significant." },
      { effect: "Dizziness, confusion, palpitations, marked sweating while fasted", badge: "C/F", response: "Seek prompt assessment if marked; treat as urgent if severe or accompanied by collapse." }
    ],
    medicallyRecognisedCycleExists: false,
    medicallyRecognisedCycleNote: "The only medically recognised protocol is a single diagnostic test, not a cycle. No repeated-use schedule has approval.",
    approvedProtocolExists: true,
    approvedProtocolNote: "An approved protocol exists, but only for single-dose diagnostic GH stimulation testing in Japan — not for any repeated, performance, or physique-related use.",
    additionalWarning: "Fasted administration has direct support only for the approved diagnostic use, because feeding and elevated glucose can alter GH response readings. This is not evidence that fasted dosing is required or beneficial for any other purpose.",
    lastResearchReviewDate: REVIEW_DATE,
    sources: [
      "Japanese approved diagnostic product information and regulatory approval materials",
      "WADA Prohibited List",
      "Human experimental physiology studies (single-dose and repeated-dose)",
      "30-day continuous infusion experimental study",
      "PubChem chemical identity record (pralmorelin dihydrochloride)"
    ]
  },
  {
    id: "bpc-157",
    name: "BPC-157",
    synonyms: ["Body Protection Compound-157", "Bepecin", "PL-14736"],
    category: "Synthetic pentadecapeptide fragment",
    identity: "Sequence GEPPPGKPADDAGLV. Straightforward chemical identity; clinical translation is not established.",
    routeEvidence: [
      { route: "Oral", badge: "C", summary: "An older phase I safety/pharmacokinetic study used oral tablets in healthy volunteers. No results have been posted from the registered protocol." },
      { route: "Subcutaneous injection", badge: "Unknown", summary: "Widespread in online communities, but robust controlled human injectable evidence is sparse. A phase II hamstring-injury trial is recruiting with no posted results." }
    ],
    regulatoryStatus: "Not approved for human clinical use by any global regulatory authority identified. US compounding authorities have proposed not including BPC-157 on their permitted compounding list.",
    antiDopingStatus: "Explicitly named under WADA's S0 class of non-approved substances. Anti-doping authorities have stated there is no legal basis to sell it as a drug, food, or dietary supplement, and no legal basis for compounding pharmacies to use it in compounded medications.",
    investigatedUses: [
      { use: "Oral safety/pharmacokinetics (healthy volunteers)", badge: "C", summary: "Registered phase I protocol (single dose then repeated dosing over 14 days); no results posted." },
      { use: "Hamstring-strain recovery (subcutaneous, alongside rehabilitation)", badge: "C", summary: "Registered phase II protocol, currently recruiting; no results posted yet." }
    ],
    claimedUses: [
      { use: "Tendon, ligament, GI, or neurological healing/recovery benefits", note: "Built mainly on animal and mechanistic literature, not confirmed human clinical outcomes. A 2026 narrative review found no approved formulation, no validated human dosing regimen, and fewer than 30 human participants across small pilot studies." }
    ],
    evidenceConfidenceOverall: "Very low for efficacy and dosing in humans. The largest evidence gap of the four compounds in this library — most recovery claims should be treated as preclinical, anecdotal, or commercial rather than established human benefit.",
    majorUncertainties: [
      "No approved formulation exists.",
      "No validated human dosing regimen exists.",
      "No completed phase II efficacy dataset exists.",
      "Musculoskeletal 'improvement' during use is heavily confounded by concurrent rehab, training modification, deloading, and natural recovery — the app records this as a temporal association, never as a caused outcome."
    ],
    adverseEffectPriorities: [
      { effect: "Injection-site infection or spreading redness/cellulitis from non-sterile product or technique", badge: "A/F", response: "Seek prompt medical assessment if redness is spreading, fever develops, or pain is severe." },
      { effect: "Claimed tendon, ligament, GI, or neuro benefit without a verified human outcome", badge: "E–H depending on claim", response: "No symptom response required — display uncertainty and track timing/correlation only, never causation." }
    ],
    medicallyRecognisedCycleExists: false,
    medicallyRecognisedCycleNote: "No robust human timing standard exists. Morning, evening, pre-workout, post-workout, or 'local' placement claims are not validated by controlled human evidence.",
    approvedProtocolExists: false,
    approvedProtocolNote: "No approved protocol exists for any population, purpose, or route.",
    additionalWarning: "Because users recording BPC-157 are usually also changing training load, adding rehab, resting more, or simply healing naturally, any observed change should be described as occurring during the exposure period — never as caused by the peptide.",
    lastResearchReviewDate: REVIEW_DATE,
    sources: [
      "ClinicalTrials.gov registry records (phase I oral study, phase II hamstring-strain study)",
      "WADA Prohibited List",
      "US anti-doping agency public statements on regulatory and compounding status",
      "2026 narrative review of human translational evidence",
      "PubChem chemical identity record"
    ]
  }
];

export function findLibraryEntry(id) {
  return PEPTIDE_LIBRARY.find(p => p.id === id) || null;
}

export function searchLibrary(query) {
  const q = (query || "").trim().toLowerCase();
  if (!q) return PEPTIDE_LIBRARY;
  return PEPTIDE_LIBRARY.filter(p => {
    const haystack = [p.name, p.category, ...(p.synonyms || [])].join(" ").toLowerCase();
    return haystack.includes(q);
  });
}
