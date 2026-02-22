/*!
 * TagTeam IEE Values - Ethical Value Detection Add-on
 * Version: 1.0.0
 * Date: 2026-02-22
 *
 * IEE ethical value detection for TagTeam semantic graphs.
 * REQUIRES: tagteam-core.js to be loaded first!
 *
 * Copyright (c) 2025-2026 IEE Team
 * Licensed under MIT
 */

(function(global, factory) {
  'use strict';
  if (typeof module === 'object' && typeof module.exports === 'object') {
    // Try multiple ways to find TagTeam core
    var TagTeam = global.TagTeam;
    if (!TagTeam) {
      try { TagTeam = require('tagteam-core'); } catch(e) {}
    }
    if (!TagTeam) {
      try { TagTeam = require('./tagteam-core'); } catch(e) {}
    }
    if (!TagTeam) {
      try { TagTeam = require('./tagteam-core.js'); } catch(e) {}
    }
    if (!TagTeam) {
      throw new Error('TagTeam Values requires TagTeam Core. Load tagteam-core.js first or install tagteam-core package.');
    }
    module.exports = factory(TagTeam);
  } else if (typeof define === 'function' && define.amd) {
    define(['tagteam-core'], factory);
  } else {
    if (!global.TagTeam) {
      throw new Error('TagTeam Values requires TagTeam Core to be loaded first');
    }
    global.TagTeamValues = factory(global.TagTeam);
  }
})(typeof window !== 'undefined' ? window : this, function(TagTeam) {
  'use strict';

  const _global = typeof window !== 'undefined' ? window : global;

  // Get PatternMatcher from core
  const PatternMatcher = TagTeam.PatternMatcher;

  // ============================================================================
  // VALUE DEFINITIONS DATA
  // ============================================================================

  const VALUE_DEFINITIONS = {
  "version": "2.0",
  "deliveryDate": "2026-01-11",
  "description": "Comprehensive 50-value taxonomy for ethical reasoning across all domains and worldviews",
  "usage": "Use semanticMarkers for keyword matching. Use polarityIndicators to detect whether value is being upheld (+1) or violated (-1).",
  "changes": "Expanded from 20 to 50 values, added polarity indicators, refined keyword patterns",
  "domains": [
    "Dignity (10 values)",
    "Care (10 values)",
    "Virtue (10 values)",
    "Community (10 values)",
    "Transcendence (10 values)"
  ],
  "values": [
    {
      "id": 1,
      "name": "Human Dignity",
      "domain": "dignity",
      "definition": "The inherent worth and inviolability of every person, independent of their characteristics, achievements, or utility to others.",
      "semanticMarkers": [
        "dignity", "inherent worth", "inviolable", "sacred", "human value",
        "person", "humanity", "respect", "honor", "reverence",
        "degrade", "demean", "humiliate", "objectify", "instrumentalize"
      ],
      "polarityIndicators": {
        "upholding": ["respect dignity", "honor personhood", "recognize worth", "treat as end", "value inherent"],
        "violating": ["degrade", "objectify", "use as means", "demean", "humiliate", "dehumanize"]
      },
      "relatedValues": ["Autonomy", "Equality", "Justice", "Sacred/Holy"],
      "examples": [
        "Every person deserves respect regardless of condition",
        "Using someone solely as a means violates their dignity",
        "Dignity persists even when autonomy is lost"
      ]
    },
    {
      "id": 2,
      "name": "Autonomy",
      "domain": "dignity",
      "definition": "The capacity and right of persons to make free, informed decisions about their own lives without coercion.",
      "semanticMarkers": [
        "autonomy", "self-determination", "freedom", "liberty", "choice",
        "decide", "choose", "consent", "voluntary", "independent",
        "force", "coerce", "compel", "impose", "override"
      ],
      "polarityIndicators": {
        "upholding": ["free choice", "informed consent", "voluntary decision", "self-directed", "respect wishes"],
        "violating": ["force", "coerce", "override decision", "without consent", "against will", "compel"]
      },
      "relatedValues": ["Human Dignity", "Freedom", "Integrity", "Self-care"],
      "examples": [
        "Patient has right to refuse treatment",
        "Informed consent requires understanding and voluntariness",
        "Paternalism overrides individual autonomy"
      ]
    },
    {
      "id": 3,
      "name": "Equality",
      "domain": "dignity",
      "definition": "The principle that all persons deserve equal moral consideration and should not be discriminated against based on arbitrary characteristics.",
      "semanticMarkers": [
        "equality", "equal", "fairness", "impartial", "unbiased",
        "discrimination", "prejudice", "bias", "favoritism", "privilege",
        "same", "alike", "equivalent", "uniform", "consistent"
      ],
      "polarityIndicators": {
        "upholding": ["equal treatment", "no discrimination", "impartial", "fair to all", "same consideration"],
        "violating": ["discriminate", "prejudice", "favor", "bias against", "unequal treatment", "privilege"]
      },
      "relatedValues": ["Justice", "Human Dignity", "Inclusion", "Diversity"],
      "examples": [
        "All patients deserve equal quality of care",
        "Hiring based on race is discriminatory",
        "Equal opportunity requires removing systemic barriers"
      ]
    },
    {
      "id": 4,
      "name": "Justice",
      "domain": "dignity",
      "definition": "Fair distribution of benefits and burdens, due process, and treating similar cases similarly while recognizing relevant differences.",
      "semanticMarkers": [
        "justice", "fair", "fairness", "equity", "due process",
        "unfair", "unjust", "inequitable", "arbitrary", "biased",
        "allocate", "distribute", "deserve", "merit", "entitlement"
      ],
      "polarityIndicators": {
        "upholding": ["fair distribution", "due process", "just allocation", "deserve", "equitable"],
        "violating": ["unfair", "unjust", "arbitrary", "biased allocation", "deny due process"]
      },
      "relatedValues": ["Equality", "Accountability", "Transparency", "Common Good"],
      "examples": [
        "Resources should be allocated fairly",
        "Punishment must fit the crime",
        "Procedural justice requires transparent processes"
      ]
    },
    {
      "id": 5,
      "name": "Freedom",
      "domain": "dignity",
      "definition": "Liberty from external constraint and the positive capacity to pursue one's chosen life path.",
      "semanticMarkers": [
        "freedom", "liberty", "free", "unconstrained", "liberation",
        "restriction", "constraint", "limit", "bound", "confined",
        "rights", "civil liberties", "expression", "movement", "speech"
      ],
      "polarityIndicators": {
        "upholding": ["protect freedom", "liberty to", "free to choose", "unrestricted", "liberate"],
        "violating": ["restrict", "constrain", "limit freedom", "confine", "oppress", "suppress"]
      },
      "relatedValues": ["Autonomy", "Human Dignity", "Justice", "Peace"],
      "examples": [
        "Freedom of speech protects unpopular views",
        "Oppressive regimes violate basic freedoms",
        "Freedom requires absence of coercion"
      ]
    },
    {
      "id": 6,
      "name": "Rights",
      "domain": "dignity",
      "definition": "Justified claims that individuals have against others and society, including negative rights (freedoms) and positive rights (entitlements).",
      "semanticMarkers": [
        "rights", "entitled", "claim", "due", "owed",
        "violate rights", "infringe", "deny", "deprive", "transgress",
        "human rights", "civil rights", "legal rights", "moral rights"
      ],
      "polarityIndicators": {
        "upholding": ["respect rights", "honor entitlement", "recognize claims", "protect rights"],
        "violating": ["violate rights", "infringe", "deny entitlement", "deprive", "transgress"]
      },
      "relatedValues": ["Justice", "Freedom", "Autonomy", "Human Dignity"],
      "examples": [
        "Right to privacy protects personal information",
        "Denying medical care violates right to health",
        "Human rights transcend national borders"
      ]
    },
    {
      "id": 7,
      "name": "Respect for Persons",
      "domain": "dignity",
      "definition": "Treating individuals as valuable in themselves, not merely as means to others' ends, honoring their perspectives and choices.",
      "semanticMarkers": [
        "respect", "regard", "esteem", "honor", "value",
        "disrespect", "disregard", "dismiss", "ignore", "belittle",
        "listen", "consider", "acknowledge", "recognize", "validate"
      ],
      "polarityIndicators": {
        "upholding": ["show respect", "honor perspective", "value input", "listen to", "acknowledge"],
        "violating": ["disrespect", "dismiss", "ignore", "belittle", "disregard", "devalue"]
      },
      "relatedValues": ["Human Dignity", "Autonomy", "Compassion", "Humility"],
      "examples": [
        "Respecting patient means honoring their values",
        "Dismissing concerns shows disrespect",
        "Respect requires active listening"
      ]
    },
    {
      "id": 8,
      "name": "Privacy",
      "domain": "dignity",
      "definition": "The right to control access to information about oneself and to maintain boundaries around personal space and decisions.",
      "semanticMarkers": [
        "privacy", "confidential", "secret", "private", "personal",
        "intrude", "violate privacy", "expose", "reveal", "disclose",
        "boundary", "confidentiality", "intimate", "secrecy", "discretion"
      ],
      "polarityIndicators": {
        "upholding": ["protect privacy", "maintain confidentiality", "respect boundaries", "keep secret"],
        "violating": ["violate privacy", "breach confidentiality", "intrude", "expose", "disclose without consent"]
      },
      "relatedValues": ["Autonomy", "Human Dignity", "Trust", "Confidentiality"],
      "examples": [
        "Medical records must remain confidential",
        "Surveillance violates privacy expectations",
        "Privacy enables personal autonomy"
      ]
    },
    {
      "id": 9,
      "name": "Consent",
      "domain": "dignity",
      "definition": "Voluntary, informed agreement to participate in an action or relationship, given without coercion or deception.",
      "semanticMarkers": [
        "consent", "agree", "permission", "authorize", "approve",
        "without consent", "force", "coerce", "manipulate", "deceive",
        "informed", "voluntary", "freely given", "understanding", "agreement"
      ],
      "polarityIndicators": {
        "upholding": ["obtain consent", "seek permission", "informed agreement", "voluntary participation"],
        "violating": ["without consent", "force", "coerce", "manipulate into", "deceive"]
      },
      "relatedValues": ["Autonomy", "Honesty", "Respect for Persons", "Non-maleficence"],
      "examples": [
        "Informed consent requires disclosure of risks",
        "Sexual contact without consent is assault",
        "Medical procedures require patient authorization"
      ]
    },
    {
      "id": 10,
      "name": "Human Rights",
      "domain": "dignity",
      "definition": "Universal entitlements possessed by all persons by virtue of their humanity, including life, liberty, and security.",
      "semanticMarkers": [
        "human rights", "universal rights", "inalienable", "fundamental rights",
        "violate human rights", "abuse", "atrocity", "crimes against humanity",
        "UDHR", "civil liberties", "basic rights", "natural rights"
      ],
      "polarityIndicators": {
        "upholding": ["protect human rights", "uphold rights", "defend liberties", "ensure rights"],
        "violating": ["violate human rights", "abuse", "atrocity", "deny basic rights", "crimes against humanity"]
      },
      "relatedValues": ["Human Dignity", "Justice", "Freedom", "Equality"],
      "examples": [
        "Torture violates fundamental human rights",
        "Right to asylum protects refugees",
        "Human rights transcend cultural differences"
      ]
    },
    {
      "id": 11,
      "name": "Compassion",
      "domain": "care",
      "definition": "Deep awareness of and sympathy for the suffering of others, coupled with desire to alleviate that suffering.",
      "semanticMarkers": [
        "compassion", "empathy", "sympathy", "care", "concern",
        "callous", "indifferent", "cold", "uncaring", "heartless",
        "suffering", "pain", "distress", "anguish", "comfort"
      ],
      "polarityIndicators": {
        "upholding": ["show compassion", "empathize", "care for", "relieve suffering", "comfort"],
        "violating": ["callous", "indifferent to suffering", "uncaring", "heartless", "ignore pain"]
      },
      "relatedValues": ["Beneficence", "Non-maleficence", "Solidarity", "Love"],
      "examples": [
        "Compassion motivates end-of-life care",
        "Indifference to suffering is morally problematic",
        "Healthcare requires compassionate presence"
      ]
    },
    {
      "id": 12,
      "name": "Fidelity",
      "domain": "care",
      "definition": "Faithfulness to commitments, promises, and relationships; loyalty and trustworthiness in ongoing bonds.",
      "semanticMarkers": [
        "fidelity", "faithful", "loyal", "commitment", "promise",
        "betray", "unfaithful", "disloyal", "break promise", "abandon",
        "trust", "reliability", "dependable", "devoted", "steadfast"
      ],
      "polarityIndicators": {
        "upholding": ["keep promise", "remain faithful", "honor commitment", "stay loyal", "be reliable"],
        "violating": ["betray", "break promise", "abandon", "disloyal", "unfaithful"]
      },
      "relatedValues": ["Honesty", "Integrity", "Trust", "Accountability"],
      "examples": [
        "Fidelity to patient requires continuity of care",
        "Betraying confidence violates fidelity",
        "Marriage vows create fidelity obligations"
      ]
    },
    {
      "id": 13,
      "name": "Beneficence",
      "domain": "care",
      "definition": "The obligation to actively promote the well-being of others and to act for their benefit.",
      "semanticMarkers": [
        "beneficence", "benefit", "help", "promote welfare", "do good",
        "harm", "neglect", "fail to help", "withhold benefit", "abandon",
        "assist", "aid", "support", "improve", "enhance"
      ],
      "polarityIndicators": {
        "upholding": ["promote welfare", "help", "benefit", "assist", "improve well-being"],
        "violating": ["neglect", "fail to help", "withhold aid", "abandon", "refuse assistance"]
      },
      "relatedValues": ["Compassion", "Non-maleficence", "Solidarity", "Service"],
      "examples": [
        "Physicians have duty of beneficence to patients",
        "Helping those in need expresses beneficence",
        "Beneficence sometimes conflicts with autonomy"
      ]
    },
    {
      "id": 14,
      "name": "Non-maleficence",
      "domain": "care",
      "definition": "The obligation to avoid causing harm; primum non nocere - first, do no harm.",
      "semanticMarkers": [
        "non-maleficence", "do no harm", "avoid harm", "prevent harm",
        "harm", "injure", "hurt", "damage", "wound",
        "safe", "safety", "risk", "danger", "hazard"
      ],
      "polarityIndicators": {
        "upholding": ["avoid harm", "prevent injury", "ensure safety", "minimize risk", "do no harm"],
        "violating": ["cause harm", "injure", "damage", "endanger", "reckless", "negligent"]
      },
      "relatedValues": ["Beneficence", "Compassion", "Prudence", "Competence"],
      "examples": [
        "Medical treatment must not cause net harm",
        "Negligence violates non-maleficence",
        "Sometimes avoiding harm means not intervening"
      ]
    },
    {
      "id": 15,
      "name": "Care",
      "domain": "care",
      "definition": "Attentive responsiveness to the needs of particular others, especially those in dependent or vulnerable positions.",
      "semanticMarkers": [
        "care", "caring", "nurture", "attend to", "look after",
        "neglect", "abandon", "ignore needs", "uncaring", "cold",
        "relationship", "responsive", "attentive", "support", "tend"
      ],
      "polarityIndicators": {
        "upholding": ["provide care", "nurture", "attend to needs", "responsive", "support"],
        "violating": ["neglect", "abandon", "ignore needs", "uncaring", "inattentive"]
      },
      "relatedValues": ["Compassion", "Beneficence", "Solidarity", "Vulnerability"],
      "examples": [
        "Caring for elderly parents is ethical obligation",
        "Neglect of dependents violates care ethics",
        "Care requires attending to particular needs"
      ]
    },
    {
      "id": 16,
      "name": "Love",
      "domain": "care",
      "definition": "Deep affection, attachment, and commitment to the good of another; agape as unconditional goodwill.",
      "semanticMarkers": [
        "love", "affection", "devotion", "cherish", "adore",
        "hate", "indifference", "contempt", "disdain", "animosity",
        "caring", "tenderness", "warmth", "attachment", "bond"
      ],
      "polarityIndicators": {
        "upholding": ["show love", "cherish", "devoted to", "care deeply", "unconditional regard"],
        "violating": ["hate", "contempt", "indifference", "cold", "disdain"]
      },
      "relatedValues": ["Compassion", "Fidelity", "Care", "Solidarity"],
      "examples": [
        "Parental love motivates sacrifice",
        "Love your neighbor as yourself",
        "Indifference is opposite of love"
      ]
    },
    {
      "id": 17,
      "name": "Kindness",
      "domain": "care",
      "definition": "Gentle, considerate treatment of others; benevolence expressed in words and actions.",
      "semanticMarkers": [
        "kindness", "kind", "gentle", "considerate", "thoughtful",
        "cruel", "harsh", "mean", "unkind", "brutal",
        "tender", "caring", "benevolent", "gracious", "warmth"
      ],
      "polarityIndicators": {
        "upholding": ["show kindness", "treat gently", "considerate", "thoughtful", "benevolent"],
        "violating": ["cruel", "harsh", "mean", "unkind", "brutal", "callous"]
      },
      "relatedValues": ["Compassion", "Love", "Gentleness", "Respect for Persons"],
      "examples": [
        "Kindness to strangers builds community",
        "Cruelty violates basic human kindness",
        "Small acts of kindness matter morally"
      ]
    },
    {
      "id": 18,
      "name": "Empathy",
      "domain": "care",
      "definition": "The capacity to understand and share the feelings of another; emotional resonance with others' experiences.",
      "semanticMarkers": [
        "empathy", "empathize", "understand feelings", "share experience",
        "lack empathy", "cold", "unfeeling", "disconnected", "indifferent",
        "perspective-taking", "emotional resonance", "identify with", "feel for"
      ],
      "polarityIndicators": {
        "upholding": ["empathize", "understand feelings", "share experience", "emotional connection"],
        "violating": ["lack empathy", "cold", "unfeeling", "cannot relate", "indifferent to feelings"]
      },
      "relatedValues": ["Compassion", "Respect for Persons", "Understanding", "Humility"],
      "examples": [
        "Empathy enables understanding patient suffering",
        "Lack of empathy impairs moral judgment",
        "Empathy bridges differences between people"
      ]
    },
    {
      "id": 19,
      "name": "Forgiveness",
      "domain": "care",
      "definition": "Releasing resentment and claims for retaliation against wrongdoers; offering reconciliation despite offense.",
      "semanticMarkers": [
        "forgiveness", "forgive", "pardon", "absolve", "reconcile",
        "resentment", "grudge", "revenge", "retaliate", "unforgiving",
        "mercy", "grace", "let go", "move past", "reconciliation"
      ],
      "polarityIndicators": {
        "upholding": ["forgive", "show mercy", "reconcile", "let go resentment", "pardon"],
        "violating": ["hold grudge", "seek revenge", "unforgiving", "retaliate", "refuse reconciliation"]
      },
      "relatedValues": ["Compassion", "Mercy", "Peace", "Humility"],
      "examples": [
        "Forgiveness enables healing after betrayal",
        "Holding grudges perpetuates conflict",
        "Forgiveness doesn't require forgetting"
      ]
    },
    {
      "id": 20,
      "name": "Mercy",
      "domain": "care",
      "definition": "Compassionate treatment of those who could justly be treated harshly; tempering justice with compassion.",
      "semanticMarkers": [
        "mercy", "merciful", "compassion", "leniency", "clemency",
        "merciless", "harsh", "severe", "strict", "unforgiving",
        "forgiveness", "pardon", "grace", "tempering justice", "compassionate"
      ],
      "polarityIndicators": {
        "upholding": ["show mercy", "compassionate", "lenient", "clemency", "temper justice"],
        "violating": ["merciless", "harsh", "severe", "show no compassion", "unforgiving"]
      },
      "relatedValues": ["Compassion", "Forgiveness", "Justice", "Grace"],
      "examples": [
        "Mercy tempers strict application of rules",
        "Showing mercy to offenders enables redemption",
        "Justice without mercy can be cruel"
      ]
    },
    {
      "id": 21,
      "name": "Integrity",
      "domain": "virtue",
      "definition": "Consistency between one's values, words, and actions; wholeness and authenticity of character.",
      "semanticMarkers": [
        "integrity", "consistent", "authentic", "genuine", "whole",
        "hypocrite", "inconsistent", "duplicitous", "two-faced", "dishonest",
        "align", "coherent", "true to values", "walk the talk", "moral consistency"
      ],
      "polarityIndicators": {
        "upholding": ["act with integrity", "consistent", "authentic", "true to values", "walk the talk"],
        "violating": ["hypocritical", "inconsistent", "say one thing do another", "duplicitous", "fake"]
      },
      "relatedValues": ["Honesty", "Authenticity", "Courage", "Accountability"],
      "examples": [
        "Integrity requires aligning actions with values",
        "Hypocrisy violates personal integrity",
        "Leaders must demonstrate integrity"
      ]
    },
    {
      "id": 22,
      "name": "Honesty",
      "domain": "virtue",
      "definition": "Truthfulness in speech and representation; refraining from deception, lying, or misleading others.",
      "semanticMarkers": [
        "honesty", "honest", "truthful", "truth", "candid",
        "lie", "deceive", "mislead", "dishonest", "false",
        "transparency", "forthright", "sincere", "accurate", "trustworthy"
      ],
      "polarityIndicators": {
        "upholding": ["tell truth", "honest", "transparent", "forthright", "accurate"],
        "violating": ["lie", "deceive", "mislead", "dishonest", "withhold truth", "fabricate"]
      },
      "relatedValues": ["Integrity", "Trust", "Transparency", "Authenticity"],
      "examples": [
        "Honesty builds trust in relationships",
        "Deception undermines informed consent",
        "Sometimes honesty conflicts with compassion"
      ]
    },
    {
      "id": 23,
      "name": "Courage",
      "domain": "virtue",
      "definition": "Moral fortitude to act rightly despite fear, risk, or opposition; standing for principle under pressure.",
      "semanticMarkers": [
        "courage", "courageous", "brave", "bold", "fearless",
        "cowardice", "fear", "timid", "avoid", "back down",
        "stand up", "face", "confront", "risk", "moral fortitude"
      ],
      "polarityIndicators": {
        "upholding": ["show courage", "stand up for", "confront", "face risk", "brave"],
        "violating": ["cowardly", "back down", "avoid confrontation", "fear-driven", "give in to pressure"]
      },
      "relatedValues": ["Integrity", "Justice", "Strength", "Conviction"],
      "examples": [
        "Whistleblowing requires moral courage",
        "Courage enables standing for unpopular truth",
        "Fear of consequences doesn't excuse cowardice"
      ]
    },
    {
      "id": 24,
      "name": "Humility",
      "domain": "virtue",
      "definition": "Accurate self-assessment; recognition of one's limitations, fallibility, and dependence on others.",
      "semanticMarkers": [
        "humility", "humble", "modest", "unassuming", "teachable",
        "arrogance", "pride", "hubris", "conceited", "superiority",
        "acknowledge limits", "fallible", "learn from", "open to", "recognize limits"
      ],
      "polarityIndicators": {
        "upholding": ["show humility", "acknowledge limits", "teachable", "modest", "recognize fallibility"],
        "violating": ["arrogant", "prideful", "hubris", "conceited", "refuse to admit error"]
      },
      "relatedValues": ["Wisdom", "Prudence", "Openness", "Respect for Persons"],
      "examples": [
        "Humility enables learning from mistakes",
        "Arrogance leads to overconfidence",
        "Recognizing limits is sign of wisdom"
      ]
    },
    {
      "id": 25,
      "name": "Wisdom",
      "domain": "virtue",
      "definition": "Practical judgment about what contributes to living well; integrating knowledge, experience, and virtue.",
      "semanticMarkers": [
        "wisdom", "wise", "prudent", "judicious", "discerning",
        "foolish", "unwise", "imprudent", "rash", "thoughtless",
        "judgment", "experience", "practical reason", "insight", "understanding"
      ],
      "polarityIndicators": {
        "upholding": ["show wisdom", "prudent judgment", "discerning", "thoughtful", "wise decision"],
        "violating": ["foolish", "unwise", "imprudent", "rash", "poor judgment", "thoughtless"]
      },
      "relatedValues": ["Prudence", "Humility", "Understanding", "Practical Reason"],
      "examples": [
        "Wisdom integrates knowledge with virtue",
        "Foolish decisions ignore consequences",
        "Elders often possess practical wisdom"
      ]
    },
    {
      "id": 26,
      "name": "Temperance",
      "domain": "virtue",
      "definition": "Moderation and self-restraint in desires and pleasures; avoiding excess and deficiency.",
      "semanticMarkers": [
        "temperance", "moderation", "self-control", "restraint", "balance",
        "excess", "indulgence", "addiction", "uncontrolled", "extreme",
        "moderate", "measured", "disciplined", "self-restraint", "balanced"
      ],
      "polarityIndicators": {
        "upholding": ["practice moderation", "self-control", "restrained", "balanced", "disciplined"],
        "violating": ["excess", "indulgent", "uncontrolled", "addicted", "extreme", "lack self-control"]
      },
      "relatedValues": ["Self-care", "Prudence", "Health", "Discipline"],
      "examples": [
        "Temperance avoids both excess and deficiency",
        "Addiction represents loss of self-control",
        "Moderation in all things promotes well-being"
      ]
    },
    {
      "id": 27,
      "name": "Patience",
      "domain": "virtue",
      "definition": "Endurance under difficulty without complaint; bearing suffering or inconvenience with equanimity.",
      "semanticMarkers": [
        "patience", "patient", "endure", "persevere", "wait",
        "impatience", "intolerant", "hasty", "rush", "irritable",
        "tolerate", "bear", "long-suffering", "forbearance", "calm"
      ],
      "polarityIndicators": {
        "upholding": ["show patience", "endure", "wait calmly", "persevere", "tolerant"],
        "violating": ["impatient", "hasty", "rush", "irritable", "intolerant"]
      },
      "relatedValues": ["Temperance", "Hope", "Fortitude", "Peace"],
      "examples": [
        "Patience enables enduring hardship",
        "Impatience leads to rash decisions",
        "Long-suffering demonstrates moral character"
      ]
    },
    {
      "id": 28,
      "name": "Generosity",
      "domain": "virtue",
      "definition": "Willingness to give freely of oneself, time, and resources; liberality in giving.",
      "semanticMarkers": [
        "generosity", "generous", "give", "share", "donate",
        "stingy", "selfish", "greedy", "hoard", "withhold",
        "charitable", "liberal", "munificent", "philanthropy", "altruistic"
      ],
      "polarityIndicators": {
        "upholding": ["generous", "give freely", "share", "donate", "charitable"],
        "violating": ["stingy", "selfish", "greedy", "hoard", "withhold", "refuse to share"]
      },
      "relatedValues": ["Solidarity", "Compassion", "Common Good", "Service"],
      "examples": [
        "Generosity builds community bonds",
        "Hoarding wealth while others suffer is problematic",
        "Giving freely demonstrates virtue"
      ]
    },
    {
      "id": 29,
      "name": "Gratitude",
      "domain": "virtue",
      "definition": "Thankful recognition of benefits received; acknowledgment of gifts and grace.",
      "semanticMarkers": [
        "gratitude", "grateful", "thankful", "appreciate", "recognition",
        "ungrateful", "entitled", "take for granted", "unappreciative",
        "thanksgiving", "acknowledgment", "appreciation", "thanks", "blessed"
      ],
      "polarityIndicators": {
        "upholding": ["express gratitude", "thankful", "appreciate", "acknowledge gifts", "grateful"],
        "violating": ["ungrateful", "entitled", "take for granted", "unappreciative", "demand"]
      },
      "relatedValues": ["Humility", "Grace", "Joy", "Contentment"],
      "examples": [
        "Gratitude recognizes gifts received",
        "Entitlement ignores dependence on others",
        "Thankfulness cultivates contentment"
      ]
    },
    {
      "id": 30,
      "name": "Authenticity",
      "domain": "virtue",
      "definition": "Being genuine and true to one's own personality, values, and spirit; rejecting false personas.",
      "semanticMarkers": [
        "authenticity", "authentic", "genuine", "real", "true self",
        "fake", "false", "pretend", "mask", "persona",
        "honest", "sincere", "transparent", "true to self", "real"
      ],
      "polarityIndicators": {
        "upholding": ["authentic", "genuine", "true to self", "real", "honest about self"],
        "violating": ["fake", "false", "pretend", "put on mask", "inauthentic", "dishonest about self"]
      },
      "relatedValues": ["Integrity", "Honesty", "Self-awareness", "Freedom"],
      "examples": [
        "Authenticity requires self-knowledge",
        "Wearing false masks prevents genuine connection",
        "Being true to oneself is moral imperative"
      ]
    },
    {
      "id": 31,
      "name": "Solidarity",
      "domain": "community",
      "definition": "Unity of purpose and mutual support within a community; standing with others in their struggles.",
      "semanticMarkers": [
        "solidarity", "unity", "together", "collective", "mutual support",
        "division", "fragmentation", "isolation", "abandon", "alone",
        "stand with", "collective action", "common cause", "united", "community"
      ],
      "polarityIndicators": {
        "upholding": ["show solidarity", "stand together", "united", "mutual support", "collective action"],
        "violating": ["divided", "abandon", "isolated", "fragmented", "refuse to support"]
      },
      "relatedValues": ["Common Good", "Justice", "Compassion", "Community"],
      "examples": [
        "Labor unions express worker solidarity",
        "Abandoning others violates solidarity",
        "Standing with oppressed demonstrates solidarity"
      ]
    },
    {
      "id": 32,
      "name": "Common Good",
      "domain": "community",
      "definition": "The welfare of the community as a whole; conditions enabling all members to flourish.",
      "semanticMarkers": [
        "common good", "public good", "collective welfare", "community benefit",
        "self-interest", "private gain", "narrow interest", "faction",
        "public interest", "general welfare", "social benefit", "commonwealth"
      ],
      "polarityIndicators": {
        "upholding": ["promote common good", "public interest", "collective welfare", "community benefit"],
        "violating": ["private gain over public", "narrow self-interest", "harm community", "faction"]
      },
      "relatedValues": ["Solidarity", "Justice", "Stewardship", "Service"],
      "examples": [
        "Public health promotes common good",
        "Pollution harms common good for private profit",
        "Democracy serves common good through participation"
      ]
    },
    {
      "id": 33,
      "name": "Stewardship",
      "domain": "community",
      "definition": "Responsible care for resources, environment, and institutions entrusted to one's care for future generations.",
      "semanticMarkers": [
        "stewardship", "responsible care", "sustainability", "preservation",
        "exploitation", "depletion", "waste", "short-term gain", "destruction",
        "environment", "resources", "future generations", "conservation", "custodian"
      ],
      "polarityIndicators": {
        "upholding": ["responsible stewardship", "sustainable", "conserve", "preserve for future", "careful use"],
        "violating": ["exploit", "deplete", "waste", "short-term gain", "destroy", "unsustainable"]
      },
      "relatedValues": ["Common Good", "Sustainability", "Responsibility", "Future Generations"],
      "examples": [
        "Environmental stewardship protects ecosystems",
        "Depleting resources harms future generations",
        "Institutions require responsible stewardship"
      ]
    },
    {
      "id": 34,
      "name": "Peace",
      "domain": "community",
      "definition": "Harmony and absence of violence in relationships and communities; active pursuit of reconciliation.",
      "semanticMarkers": [
        "peace", "harmony", "reconciliation", "non-violence", "concord",
        "war", "violence", "conflict", "hostility", "aggression",
        "peaceful", "resolve", "peacemaking", "tranquility", "cooperation"
      ],
      "polarityIndicators": {
        "upholding": ["promote peace", "reconcile", "non-violent", "harmonious", "resolve conflict"],
        "violating": ["violence", "war", "aggression", "escalate conflict", "hostile"]
      },
      "relatedValues": ["Justice", "Forgiveness", "Solidarity", "Compassion"],
      "examples": [
        "Peacemaking requires addressing root causes",
        "Violence perpetuates cycles of harm",
        "Peace is more than absence of war"
      ]
    },
    {
      "id": 35,
      "name": "Inclusion",
      "domain": "community",
      "definition": "Active incorporation of diverse persons and perspectives; removing barriers to full participation.",
      "semanticMarkers": [
        "inclusion", "inclusive", "welcome", "embrace", "belong",
        "exclusion", "exclude", "marginalize", "ostracize", "reject",
        "diversity", "participation", "access", "belonging", "incorporate"
      ],
      "polarityIndicators": {
        "upholding": ["include", "welcome", "embrace diversity", "ensure access", "create belonging"],
        "violating": ["exclude", "marginalize", "ostracize", "reject", "deny access", "segregate"]
      },
      "relatedValues": ["Equality", "Justice", "Diversity", "Solidarity"],
      "examples": [
        "Inclusive communities welcome all members",
        "Exclusion harms those marginalized",
        "Accessibility enables full participation"
      ]
    },
    {
      "id": 36,
      "name": "Diversity",
      "domain": "community",
      "definition": "Recognition and valuing of differences in perspectives, identities, and experiences within community.",
      "semanticMarkers": [
        "diversity", "diverse", "difference", "variety", "pluralism",
        "homogeneity", "uniformity", "sameness", "monoculture", "conformity",
        "multicultural", "heterogeneous", "varied", "multiple perspectives"
      ],
      "polarityIndicators": {
        "upholding": ["value diversity", "embrace differences", "pluralistic", "multiple perspectives"],
        "violating": ["enforce uniformity", "suppress differences", "monoculture", "forced conformity"]
      },
      "relatedValues": ["Inclusion", "Equality", "Respect for Persons", "Justice"],
      "examples": [
        "Diversity enriches community life",
        "Forced conformity suppresses authentic expression",
        "Multiple perspectives improve decision-making"
      ]
    },
    {
      "id": 37,
      "name": "Transparency",
      "domain": "community",
      "definition": "Openness in processes, decisions, and information; accessibility of governance and operations.",
      "semanticMarkers": [
        "transparency", "transparent", "open", "accessible", "disclosure",
        "secrecy", "hidden", "opaque", "concealed", "closed",
        "accountability", "visible", "public", "disclosed", "clear"
      ],
      "polarityIndicators": {
        "upholding": ["transparent process", "open", "disclose", "accessible information", "visible"],
        "violating": ["secretive", "hidden", "opaque", "conceal", "closed process", "obscure"]
      },
      "relatedValues": ["Accountability", "Honesty", "Justice", "Democracy"],
      "examples": [
        "Transparent government enables accountability",
        "Secrecy breeds corruption and distrust",
        "Open processes build public confidence"
      ]
    },
    {
      "id": 38,
      "name": "Accountability",
      "domain": "community",
      "definition": "Answerability for one's actions and decisions; obligation to explain, justify, and accept responsibility.",
      "semanticMarkers": [
        "accountability", "accountable", "responsible", "answerable", "liable",
        "unaccountable", "irresponsible", "evade", "deny", "blame others",
        "answer for", "take responsibility", "justify", "explain", "consequences"
      ],
      "polarityIndicators": {
        "upholding": ["hold accountable", "take responsibility", "answer for", "accept consequences"],
        "violating": ["evade accountability", "irresponsible", "blame others", "deny responsibility", "unaccountable"]
      },
      "relatedValues": ["Justice", "Integrity", "Transparency", "Responsibility"],
      "examples": [
        "Leaders must be accountable to constituents",
        "Evading responsibility undermines trust",
        "Accountability requires accepting consequences"
      ]
    },
    {
      "id": 39,
      "name": "Service",
      "domain": "community",
      "definition": "Contributing to others' welfare through work, volunteerism, or civic participation; helping orientation.",
      "semanticMarkers": [
        "service", "serve", "help", "contribute", "volunteer",
        "self-serving", "selfish", "refuse to help", "exploitation",
        "civic duty", "public service", "assistance", "aid", "ministry"
      ],
      "polarityIndicators": {
        "upholding": ["serve others", "contribute", "help", "volunteer", "civic engagement"],
        "violating": ["self-serving", "refuse to help", "exploit for gain", "ignore needs"]
      },
      "relatedValues": ["Solidarity", "Beneficence", "Common Good", "Generosity"],
      "examples": [
        "Public service contributes to common good",
        "Purely self-serving actions neglect community",
        "Volunteering expresses civic virtue"
      ]
    },
    {
      "id": 40,
      "name": "Democracy",
      "domain": "community",
      "definition": "Collective self-governance through participation, representation, and protection of minority rights.",
      "semanticMarkers": [
        "democracy", "democratic", "participation", "vote", "representation",
        "autocracy", "tyranny", "oppression", "disenfranchise", "authoritarian",
        "self-governance", "citizen", "elections", "voice", "deliberation"
      ],
      "polarityIndicators": {
        "upholding": ["democratic process", "participation", "representation", "protect rights", "voice"],
        "violating": ["autocratic", "suppress voice", "disenfranchise", "tyranny", "authoritarian"]
      },
      "relatedValues": ["Freedom", "Equality", "Justice", "Participation"],
      "examples": [
        "Democracy requires informed participation",
        "Disenfranchisement undermines self-governance",
        "Protecting minority rights is democratic imperative"
      ]
    },
    {
      "id": 41,
      "name": "Meaning",
      "domain": "transcendence",
      "definition": "Sense of purpose and significance in life; orientation toward what matters ultimately.",
      "semanticMarkers": [
        "meaning", "purpose", "significance", "why", "mattering",
        "meaningless", "purposeless", "absurd", "pointless", "empty",
        "fulfillment", "calling", "vocation", "destiny", "legacy"
      ],
      "polarityIndicators": {
        "upholding": ["find meaning", "purposeful", "significant", "fulfilling", "matters"],
        "violating": ["meaningless", "purposeless", "empty", "pointless", "absurd"]
      },
      "relatedValues": ["Spiritual Growth", "Hope", "Transcendence", "Vocation"],
      "examples": [
        "Meaningful work provides purpose",
        "Existential crisis involves loss of meaning",
        "Legacy creates significance beyond lifespan"
      ]
    },
    {
      "id": 42,
      "name": "Spiritual Growth",
      "domain": "transcendence",
      "definition": "Development of inner life, deepening connection to ultimate reality, and transformation of consciousness.",
      "semanticMarkers": [
        "spiritual growth", "transformation", "enlightenment", "awakening",
        "stagnation", "spiritual death", "emptiness", "closed",
        "prayer", "meditation", "contemplation", "journey", "path"
      ],
      "polarityIndicators": {
        "upholding": ["spiritual growth", "transformation", "deepening", "awakening", "develop inner life"],
        "violating": ["spiritual stagnation", "closed to growth", "reject transcendence", "materialistic"]
      },
      "relatedValues": ["Meaning", "Sacred/Holy", "Transcendence", "Wisdom"],
      "examples": [
        "Spiritual practices foster growth",
        "Materialism alone leads to emptiness",
        "Transformation requires openness"
      ]
    },
    {
      "id": 43,
      "name": "Sacred/Holy",
      "domain": "transcendence",
      "definition": "That which is set apart as worthy of reverence; the numinous dimension of reality.",
      "semanticMarkers": [
        "sacred", "holy", "divine", "reverence", "worship",
        "profane", "desecrate", "violate", "blasphemy", "sacrilege",
        "sanctity", "consecrate", "venerate", "hallowed", "transcendent"
      ],
      "polarityIndicators": {
        "upholding": ["honor sacred", "reverence", "consecrate", "respect holiness", "worship"],
        "violating": ["profane", "desecrate", "violate sacred", "blasphemy", "sacrilege"]
      },
      "relatedValues": ["Spiritual Growth", "Transcendence", "Reverence", "Mystery"],
      "examples": [
        "Sacred spaces command reverence",
        "Desecration violates holiness",
        "Religious objects deserve respectful treatment"
      ]
    },
    {
      "id": 44,
      "name": "Hope",
      "domain": "transcendence",
      "definition": "Confident expectation of future good; trust that present suffering is not final word.",
      "semanticMarkers": [
        "hope", "hopeful", "optimism", "trust", "expectation",
        "despair", "hopeless", "pessimism", "futility", "give up",
        "future", "possibility", "promise", "aspiration", "faith"
      ],
      "polarityIndicators": {
        "upholding": ["maintain hope", "hopeful", "trust future", "see possibility", "aspire"],
        "violating": ["despair", "hopeless", "give up", "no future", "futility"]
      },
      "relatedValues": ["Meaning", "Faith", "Resilience", "Patience"],
      "examples": [
        "Hope sustains through suffering",
        "Despair sees no possibility",
        "Hopeful outlook enables perseverance"
      ]
    },
    {
      "id": 45,
      "name": "Faith",
      "domain": "transcendence",
      "definition": "Trust and commitment to ultimate reality or truth beyond empirical verification; fidelity to transcendent.",
      "semanticMarkers": [
        "faith", "believe", "trust", "commitment", "devotion",
        "doubt", "skepticism", "faithless", "abandon faith", "apostasy",
        "conviction", "religious", "spiritual", "creed", "belief"
      ],
      "polarityIndicators": {
        "upholding": ["maintain faith", "trust", "devoted", "committed", "faithful"],
        "violating": ["abandon faith", "faithless", "apostasy", "betray belief", "lose faith"]
      },
      "relatedValues": ["Hope", "Sacred/Holy", "Fidelity", "Trust"],
      "examples": [
        "Faith provides foundation for meaning",
        "Losing faith creates existential crisis",
        "Religious commitment requires faithfulness"
      ]
    },
    {
      "id": 46,
      "name": "Transcendence",
      "domain": "transcendence",
      "definition": "Reality beyond material existence; experiences of going beyond ordinary limits and connecting with ultimate.",
      "semanticMarkers": [
        "transcendence", "transcendent", "beyond", "ultimate", "infinite",
        "immanent only", "materialistic", "reductionist", "limited",
        "mystical", "numinous", "sublime", "eternal", "absolute"
      ],
      "polarityIndicators": {
        "upholding": ["transcendent reality", "beyond material", "ultimate concern", "infinite", "eternal"],
        "violating": ["only material", "reductionist", "deny transcendent", "limited to immanent"]
      },
      "relatedValues": ["Sacred/Holy", "Spiritual Growth", "Mystery", "Reverence"],
      "examples": [
        "Mystical experiences point to transcendent",
        "Materialism denies transcendent dimension",
        "Art can evoke sense of sublime"
      ]
    },
    {
      "id": 47,
      "name": "Mystery",
      "domain": "transcendence",
      "definition": "Recognition that ultimate reality exceeds human comprehension; comfort with unknowing.",
      "semanticMarkers": [
        "mystery", "mysterious", "unknowable", "ineffable", "wonder",
        "certainty", "know all", "explain away", "reduce", "demystify",
        "awe", "incomprehensible", "beyond understanding", "enigma"
      ],
      "polarityIndicators": {
        "upholding": ["embrace mystery", "wonder", "acknowledge limits", "awe", "incomprehensible"],
        "violating": ["claim certainty", "reduce mystery", "explain away", "demystify", "arrogant knowing"]
      },
      "relatedValues": ["Humility", "Transcendence", "Reverence", "Wonder"],
      "examples": [
        "Mystery evokes awe and wonder",
        "Claiming complete understanding denies mystery",
        "Some truths exceed rational comprehension"
      ]
    },
    {
      "id": 48,
      "name": "Reverence",
      "domain": "transcendence",
      "definition": "Deep respect and awe toward what is sacred, sublime, or of ultimate worth.",
      "semanticMarkers": [
        "reverence", "revere", "awe", "veneration", "respect deeply",
        "irreverence", "disrespect", "profane", "mock", "belittle",
        "worship", "honor", "esteem", "adoration", "sacred regard"
      ],
      "polarityIndicators": {
        "upholding": ["show reverence", "venerate", "deep respect", "awe", "honor sacred"],
        "violating": ["irreverent", "mock", "profane", "disrespect sacred", "belittle"]
      },
      "relatedValues": ["Sacred/Holy", "Respect for Persons", "Mystery", "Humility"],
      "examples": [
        "Reverence for nature inspires conservation",
        "Mocking sacred objects shows irreverence",
        "Awe before mystery evokes reverence"
      ]
    },
    {
      "id": 49,
      "name": "Grace",
      "domain": "transcendence",
      "definition": "Unmerited gift from divine or ultimate reality; being given what is not earned or deserved.",
      "semanticMarkers": [
        "grace", "gift", "unmerited", "unearned", "given freely",
        "earned", "deserved", "merit", "work for", "payment",
        "blessing", "favor", "divine gift", "gratuitous", "freely given"
      ],
      "polarityIndicators": {
        "upholding": ["receive grace", "gift freely given", "unmerited favor", "blessing"],
        "violating": ["earn everything", "merit-based only", "deny grace", "transactional"]
      },
      "relatedValues": ["Gratitude", "Mercy", "Forgiveness", "Faith"],
      "examples": [
        "Grace is gift not earned",
        "Purely transactional view denies grace",
        "Receiving grace evokes gratitude"
      ]
    },
    {
      "id": 50,
      "name": "Self-care",
      "domain": "virtue",
      "definition": "Proper attention to one's own physical, emotional, and spiritual well-being; healthy self-regard.",
      "semanticMarkers": [
        "self-care", "self-compassion", "boundaries", "rest", "renewal",
        "self-neglect", "burnout", "martyr", "exhaust", "deplete",
        "health", "wellbeing", "balance", "sustain", "recharge"
      ],
      "polarityIndicators": {
        "upholding": ["practice self-care", "maintain boundaries", "rest", "renew", "sustain wellbeing"],
        "violating": ["self-neglect", "burnout", "martyr complex", "exhaust self", "deplete"]
      },
      "relatedValues": ["Temperance", "Prudence", "Health", "Sustainability"],
      "examples": [
        "Self-care enables sustained service",
        "Burnout from neglecting own needs",
        "Healthy boundaries are form of self-care"
      ]
    }
  ]
}
;
  const FRAME_VALUE_BOOSTS = {
  "version": "1.0",
  "deliveryDate": "2026-01-11",
  "description": "Frame-to-value and role-to-value boost mappings for salience calculation",
  "usage": "Add frame/role boosts to base salience when calculating value relevance. Boosts range from 0.0 (no boost) to 0.3 (strong relevance).",
  "frameValueBoosts": {
    "Deciding": {
      "description": "Decision-making frames strongly imply autonomy and responsibility",
      "boosts": {
        "Autonomy": 0.3,
        "Freedom": 0.2,
        "Responsibility": 0.2,
        "Wisdom": 0.1,
        "Prudence": 0.1
      }
    },
    "Choosing": {
      "description": "Explicit choice frames emphasize freedom and self-determination",
      "boosts": {
        "Autonomy": 0.3,
        "Freedom": 0.3,
        "Self-determination": 0.2
      }
    },
    "Offenses": {
      "description": "Violations and transgressions imply justice and harm",
      "boosts": {
        "Justice": 0.3,
        "Non-maleficence": 0.2,
        "Accountability": 0.2,
        "Integrity": 0.2,
        "Harm": 0.3
      }
    },
    "Questioning": {
      "description": "Interrogation of beliefs implies integrity and authenticity",
      "boosts": {
        "Integrity": 0.3,
        "Authenticity": 0.3,
        "Wisdom": 0.2,
        "Humility": 0.2,
        "Spiritual Growth": 0.2
      }
    },
    "Becoming_aware": {
      "description": "Discovery and realization imply honesty and courage",
      "boosts": {
        "Honesty": 0.3,
        "Courage": 0.2,
        "Accountability": 0.2,
        "Integrity": 0.2,
        "Transparency": 0.2
      }
    },
    "Request": {
      "description": "Asking and demanding involve relational dynamics",
      "boosts": {
        "Respect for Persons": 0.2,
        "Autonomy": 0.1,
        "Power Differential": 0.2,
        "Communication": 0.1
      }
    },
    "Claim_ownership": {
      "description": "Claims of ownership or credit involve justice",
      "boosts": {
        "Justice": 0.3,
        "Honesty": 0.2,
        "Accountability": 0.2,
        "Integrity": 0.2
      }
    },
    "Undergo_change": {
      "description": "Transformation and conversion involve identity and authenticity",
      "boosts": {
        "Authenticity": 0.3,
        "Integrity": 0.2,
        "Spiritual Growth": 0.3,
        "Meaning": 0.2,
        "Freedom": 0.1
      }
    },
    "Awareness": {
      "description": "States of knowing or suspecting involve epistemic values",
      "boosts": {
        "Honesty": 0.2,
        "Courage": 0.2,
        "Responsibility": 0.2,
        "Wisdom": 0.1
      }
    },
    "Cogitation": {
      "description": "Thinking and considering involve deliberation",
      "boosts": {
        "Wisdom": 0.3,
        "Prudence": 0.3,
        "Humility": 0.2,
        "Patience": 0.1
      }
    },
    "Cause_change_of_position_on_a_scale": {
      "description": "Increasing or decreasing something involves consequences",
      "boosts": {
        "Stewardship": 0.2,
        "Responsibility": 0.2,
        "Common Good": 0.1
      }
    }
  },
  "roleValueBoosts": {
    "doctor": {
      "description": "Medical professionals have strong obligations of care and competence",
      "boosts": {
        "Beneficence": 0.3,
        "Non-maleficence": 0.3,
        "Competence": 0.3,
        "Expertise": 0.3,
        "Accountability": 0.2,
        "Compassion": 0.2,
        "Fidelity": 0.2
      }
    },
    "physician": {
      "description": "Synonym for doctor",
      "boosts": {
        "Beneficence": 0.3,
        "Non-maleficence": 0.3,
        "Competence": 0.3,
        "Expertise": 0.3
      }
    },
    "surgeon": {
      "description": "Surgical professionals with high stakes decisions",
      "boosts": {
        "Non-maleficence": 0.3,
        "Competence": 0.3,
        "Expertise": 0.3,
        "Courage": 0.2,
        "Accountability": 0.3
      }
    },
    "nurse": {
      "description": "Caregiving professionals",
      "boosts": {
        "Care": 0.3,
        "Compassion": 0.3,
        "Beneficence": 0.2,
        "Fidelity": 0.2
      }
    },
    "psychiatrist": {
      "description": "Mental health professionals with autonomy tensions",
      "boosts": {
        "Beneficence": 0.3,
        "Autonomy": 0.2,
        "Non-maleficence": 0.3,
        "Expertise": 0.3,
        "Care": 0.2
      }
    },
    "patient": {
      "description": "Recipients of medical care with vulnerability",
      "boosts": {
        "Autonomy": 0.3,
        "Human Dignity": 0.3,
        "Care": 0.2,
        "Vulnerability": 0.3,
        "Rights": 0.2
      }
    },
    "parent": {
      "description": "Caregivers with responsibility for children",
      "boosts": {
        "Care": 0.3,
        "Fidelity": 0.3,
        "Responsibility": 0.3,
        "Love": 0.3,
        "Protection": 0.2,
        "Beneficence": 0.2
      }
    },
    "mother": {
      "description": "Maternal caregiving role",
      "boosts": {
        "Care": 0.3,
        "Love": 0.3,
        "Fidelity": 0.3,
        "Compassion": 0.2
      }
    },
    "father": {
      "description": "Paternal caregiving role",
      "boosts": {
        "Care": 0.3,
        "Love": 0.3,
        "Fidelity": 0.3,
        "Responsibility": 0.2
      }
    },
    "child": {
      "description": "Young person with developmental needs",
      "boosts": {
        "Vulnerability": 0.3,
        "Development": 0.3,
        "Protection": 0.3,
        "Care": 0.2,
        "Rights": 0.2
      }
    },
    "son": {
      "description": "Male child in family context",
      "boosts": {
        "Fidelity": 0.2,
        "Family": 0.2,
        "Vulnerability": 0.2
      }
    },
    "daughter": {
      "description": "Female child in family context",
      "boosts": {
        "Fidelity": 0.2,
        "Family": 0.2,
        "Vulnerability": 0.2
      }
    },
    "spouse": {
      "description": "Marriage partner with strong relational bonds",
      "boosts": {
        "Fidelity": 0.3,
        "Love": 0.3,
        "Trust": 0.3,
        "Commitment": 0.3,
        "Intimacy": 0.3
      }
    },
    "husband": {
      "description": "Male spouse",
      "boosts": {
        "Fidelity": 0.3,
        "Love": 0.3,
        "Trust": 0.3
      }
    },
    "wife": {
      "description": "Female spouse",
      "boosts": {
        "Fidelity": 0.3,
        "Love": 0.3,
        "Trust": 0.3
      }
    },
    "friend": {
      "description": "Peer relationship with mutual regard",
      "boosts": {
        "Fidelity": 0.2,
        "Honesty": 0.2,
        "Trust": 0.2,
        "Loyalty": 0.2,
        "Care": 0.2
      }
    },
    "best friend": {
      "description": "Close peer relationship",
      "boosts": {
        "Fidelity": 0.3,
        "Honesty": 0.3,
        "Trust": 0.3,
        "Loyalty": 0.3,
        "Care": 0.2
      }
    },
    "boss": {
      "description": "Supervisor with power over employees",
      "boosts": {
        "Justice": 0.2,
        "Accountability": 0.3,
        "Power Differential": 0.3,
        "Fairness": 0.2,
        "Responsibility": 0.2
      }
    },
    "supervisor": {
      "description": "Manager with oversight role",
      "boosts": {
        "Accountability": 0.3,
        "Justice": 0.2,
        "Power Differential": 0.2,
        "Responsibility": 0.2
      }
    },
    "manager": {
      "description": "Leadership role with team responsibility",
      "boosts": {
        "Accountability": 0.3,
        "Leadership": 0.2,
        "Justice": 0.2,
        "Responsibility": 0.2
      }
    },
    "employee": {
      "description": "Worker in organizational hierarchy",
      "boosts": {
        "Justice": 0.2,
        "Rights": 0.2,
        "Dignity": 0.2,
        "Fairness": 0.2
      }
    },
    "CEO": {
      "description": "Top executive with broad responsibility",
      "boosts": {
        "Accountability": 0.3,
        "Stewardship": 0.3,
        "Leadership": 0.3,
        "Power Differential": 0.3,
        "Common Good": 0.2
      }
    },
    "teacher": {
      "description": "Educator with student development responsibility",
      "boosts": {
        "Care": 0.2,
        "Development": 0.3,
        "Justice": 0.2,
        "Expertise": 0.2,
        "Power Differential": 0.2
      }
    },
    "professor": {
      "description": "Higher education instructor",
      "boosts": {
        "Expertise": 0.3,
        "Wisdom": 0.2,
        "Development": 0.2,
        "Mentorship": 0.2
      }
    },
    "student": {
      "description": "Learner with development needs",
      "boosts": {
        "Development": 0.3,
        "Learning": 0.3,
        "Humility": 0.2,
        "Power Differential": 0.2
      }
    },
    "judge": {
      "description": "Legal authority with decision power",
      "boosts": {
        "Justice": 0.3,
        "Impartiality": 0.3,
        "Wisdom": 0.3,
        "Power Differential": 0.3,
        "Accountability": 0.2
      }
    },
    "lawyer": {
      "description": "Legal advocate",
      "boosts": {
        "Justice": 0.3,
        "Advocacy": 0.3,
        "Integrity": 0.2,
        "Competence": 0.2
      }
    },
    "priest": {
      "description": "Religious leader with spiritual authority",
      "boosts": {
        "Sacred/Holy": 0.3,
        "Spiritual Growth": 0.3,
        "Care": 0.2,
        "Power Differential": 0.2,
        "Trust": 0.3,
        "Fidelity": 0.2
      }
    },
    "pastor": {
      "description": "Religious shepherd role",
      "boosts": {
        "Sacred/Holy": 0.3,
        "Care": 0.3,
        "Spiritual Growth": 0.3,
        "Fidelity": 0.2
      }
    },
    "rabbi": {
      "description": "Jewish religious leader",
      "boosts": {
        "Sacred/Holy": 0.3,
        "Wisdom": 0.3,
        "Spiritual Growth": 0.3,
        "Teaching": 0.2
      }
    },
    "imam": {
      "description": "Islamic religious leader",
      "boosts": {
        "Sacred/Holy": 0.3,
        "Spiritual Growth": 0.3,
        "Leadership": 0.2,
        "Community": 0.2
      }
    },
    "whistleblower": {
      "description": "Person exposing wrongdoing",
      "boosts": {
        "Courage": 0.3,
        "Integrity": 0.3,
        "Honesty": 0.3,
        "Justice": 0.3,
        "Accountability": 0.3,
        "Common Good": 0.2
      }
    },
    "victim": {
      "description": "Person harmed by wrongdoing",
      "boosts": {
        "Justice": 0.3,
        "Harm": 0.3,
        "Vulnerability": 0.3,
        "Compassion": 0.2,
        "Dignity": 0.2
      }
    },
    "perpetrator": {
      "description": "Person committing wrongdoing",
      "boosts": {
        "Accountability": 0.3,
        "Justice": 0.3,
        "Harm": 0.2,
        "Responsibility": 0.2
      }
    },
    "leader": {
      "description": "Person in leadership position",
      "boosts": {
        "Responsibility": 0.3,
        "Accountability": 0.3,
        "Integrity": 0.2,
        "Wisdom": 0.2,
        "Power Differential": 0.2
      }
    },
    "community": {
      "description": "Collective group entity",
      "boosts": {
        "Common Good": 0.3,
        "Solidarity": 0.3,
        "Collective": 0.3,
        "Inclusion": 0.2,
        "Diversity": 0.2
      }
    },
    "family": {
      "description": "Kinship group",
      "boosts": {
        "Fidelity": 0.3,
        "Love": 0.3,
        "Care": 0.3,
        "Solidarity": 0.2,
        "Loyalty": 0.2
      }
    },
    "company": {
      "description": "Business organization",
      "boosts": {
        "Accountability": 0.2,
        "Responsibility": 0.2,
        "Stewardship": 0.2,
        "Common Good": 0.1
      }
    },
    "government": {
      "description": "State authority",
      "boosts": {
        "Justice": 0.3,
        "Common Good": 0.3,
        "Accountability": 0.3,
        "Power Differential": 0.3,
        "Democracy": 0.2
      }
    }
  },
  "usageExamples": [
    {
      "scenario": "The doctor must decide whether to continue treatment",
      "frame": "Deciding",
      "agent": "doctor",
      "calculation": {
        "Autonomy": {
          "baseFromKeyword": 0.5,
          "frameBoost_Deciding": 0.3,
          "roleBoost_doctor": 0.0,
          "total": 0.8
        },
        "Beneficence": {
          "baseFromKeyword": 0.5,
          "frameBoost_Deciding": 0.0,
          "roleBoost_doctor": 0.3,
          "total": 0.8
        },
        "Non-maleficence": {
          "baseFromKeyword": 0.4,
          "frameBoost_Deciding": 0.0,
          "roleBoost_doctor": 0.3,
          "total": 0.7
        }
      }
    },
    {
      "scenario": "I discovered that my company is falsifying safety reports",
      "frame": "Becoming_aware",
      "agent": "I",
      "calculation": {
        "Honesty": {
          "baseFromKeyword": 0.6,
          "frameBoost_Becoming_aware": 0.3,
          "roleBoost_whistleblower": 0.3,
          "total": 1.0
        },
        "Courage": {
          "baseFromKeyword": 0.5,
          "frameBoost_Becoming_aware": 0.2,
          "roleBoost_whistleblower": 0.3,
          "total": 1.0
        },
        "Accountability": {
          "baseFromKeyword": 0.4,
          "frameBoost_Becoming_aware": 0.2,
          "roleBoost_whistleblower": 0.3,
          "total": 0.9
        }
      }
    }
  ],
  "implementationNotes": {
    "roleDetection": "Roles can be detected from agent/patient entities. If agent='doctor', apply doctor boosts.",
    "contextualRoles": "Some roles are implicit (e.g., 'I' in whistleblowing context becomes whistleblower). Use context clues.",
    "multipleRoles": "If multiple roles apply (e.g., 'parent' and 'doctor'), apply maximum boost for each value.",
    "clampingSalience": "Always clamp final salience to [0.0, 1.0] range after applying boosts.",
    "unknownFrames": "If frame not in list, use keyword-based detection only (no frame boost).",
    "unknownRoles": "If role not in list, use keyword-based detection only (no role boost)."
  }
}
;
  const CONFLICT_PAIRS = {
  "version": "1.0",
  "description": "Known ethical value conflicts and tensions for IEE deliberation engine",
  "lastUpdated": "2026-01-18",
  "conflicts": [
    {
      "id": "conflict-001",
      "value1": "Autonomy",
      "value2": "Beneficence",
      "description": "Patient self-determination vs. medical paternalism",
      "severity": 0.8,
      "domain_crossing": true,
      "domains": ["Dignity", "Care"],
      "examples": [
        "Patient refuses life-saving treatment",
        "Doctor overrides patient wishes for their own good",
        "Competent adult declines recommended intervention"
      ],
      "philosophical_tradition": "Kantian autonomy vs. consequentialist beneficence",
      "resolution_strategies": [
        "Respect autonomy unless patient lacks capacity",
        "Ensure informed consent",
        "Distinguish between beneficence and paternalism"
      ]
    },
    {
      "id": "conflict-002",
      "value1": "Justice",
      "value2": "Mercy",
      "description": "Fairness and equal treatment vs. compassion and leniency",
      "severity": 0.7,
      "domain_crossing": true,
      "domains": ["Dignity", "Care"],
      "examples": [
        "Strict punishment vs. second chances",
        "Equal resource allocation vs. special consideration for suffering",
        "Legal justice vs. restorative justice"
      ],
      "philosophical_tradition": "Retributive justice vs. care ethics",
      "resolution_strategies": [
        "Temper justice with mercy",
        "Consider both desert and need",
        "Restorative over purely punitive approaches"
      ]
    },
    {
      "id": "conflict-003",
      "value1": "Sanctity of Life",
      "value2": "Quality of Life",
      "description": "Preserving life at all costs vs. concern for suffering and dignity",
      "severity": 0.9,
      "domain_crossing": false,
      "domains": ["Care", "Care"],
      "examples": [
        "End-of-life care decisions",
        "Prolonging life with severe suffering",
        "Passive euthanasia debates"
      ],
      "philosophical_tradition": "Vitalism vs. quality-of-life ethics",
      "resolution_strategies": [
        "Distinguish ordinary vs. extraordinary means",
        "Respect patient values and advance directives",
        "Focus on palliative care"
      ]
    },
    {
      "id": "conflict-004",
      "value1": "Loyalty",
      "value2": "Honesty",
      "description": "Allegiance to institution/person vs. truth-telling",
      "severity": 0.75,
      "domain_crossing": true,
      "domains": ["Virtue", "Virtue"],
      "examples": [
        "Whistleblowing on employer misconduct",
        "Reporting friend's wrongdoing",
        "Loyalty to team vs. integrity"
      ],
      "philosophical_tradition": "Virtue ethics internal tensions",
      "resolution_strategies": [
        "True loyalty doesn't require complicity in wrongdoing",
        "Internal reporting before external",
        "Protect those who speak up"
      ]
    },
    {
      "id": "conflict-005",
      "value1": "Individual Rights",
      "value2": "Common Good",
      "description": "Personal liberty vs. collective welfare",
      "severity": 0.8,
      "domain_crossing": true,
      "domains": ["Dignity", "Community"],
      "examples": [
        "Public health mandates vs. personal freedom",
        "Private property rights vs. eminent domain",
        "Individual expression vs. community standards"
      ],
      "philosophical_tradition": "Liberalism vs. communitarianism",
      "resolution_strategies": [
        "Least restrictive means",
        "Proportionality principle",
        "Recognize interdependence"
      ]
    },
    {
      "id": "conflict-006",
      "value1": "Liberty",
      "value2": "Equality",
      "description": "Freedom of action vs. equal distribution",
      "severity": 0.7,
      "domain_crossing": false,
      "domains": ["Dignity", "Dignity"],
      "examples": [
        "Economic freedom vs. redistributive taxation",
        "Meritocracy vs. equal opportunity",
        "Free markets vs. economic justice"
      ],
      "philosophical_tradition": "Classical liberalism vs. egalitarianism",
      "resolution_strategies": [
        "Rawlsian difference principle",
        "Equal opportunity over equal outcomes",
        "Basic liberties take priority"
      ]
    },
    {
      "id": "conflict-007",
      "value1": "Truthfulness",
      "value2": "Compassion",
      "description": "Honest disclosure vs. protecting from harm",
      "severity": 0.6,
      "domain_crossing": true,
      "domains": ["Virtue", "Care"],
      "examples": [
        "Disclosing terminal diagnosis",
        "Honest feedback vs. preserving self-esteem",
        "Brutal honesty vs. white lies"
      ],
      "philosophical_tradition": "Deontological honesty vs. consequentialist compassion",
      "resolution_strategies": [
        "Honest but gentle disclosure",
        "Right timing and setting",
        "Distinguish withholding from lying"
      ]
    },
    {
      "id": "conflict-008",
      "value1": "Confidentiality",
      "value2": "Safety",
      "description": "Keeping secrets vs. preventing harm",
      "severity": 0.85,
      "domain_crossing": true,
      "domains": ["Dignity", "Care"],
      "examples": [
        "Therapist learning of danger to third party",
        "Medical confidentiality vs. public health",
        "Attorney-client privilege vs. preventing crime"
      ],
      "philosophical_tradition": "Professional ethics tensions",
      "resolution_strategies": [
        "Duty to warn in imminent danger",
        "Narrow exceptions to confidentiality",
        "Transparent policies about limits"
      ]
    },
    {
      "id": "conflict-009",
      "value1": "Fidelity",
      "value2": "Justice",
      "description": "Loyalty to relationships vs. impartial fairness",
      "severity": 0.65,
      "domain_crossing": true,
      "domains": ["Care", "Dignity"],
      "examples": [
        "Favoritism toward family members",
        "Nepotism vs. meritocracy",
        "Special obligations vs. universal principles"
      ],
      "philosophical_tradition": "Care ethics vs. justice ethics",
      "resolution_strategies": [
        "Separate personal and professional roles",
        "Recognize special obligations within limits",
        "Transparent about potential conflicts"
      ]
    },
    {
      "id": "conflict-010",
      "value1": "Sustainability",
      "value2": "Economic Growth",
      "description": "Environmental preservation vs. development",
      "severity": 0.8,
      "domain_crossing": true,
      "domains": ["Community", "Community"],
      "examples": [
        "Conservation vs. resource extraction",
        "Climate action vs. economic costs",
        "Intergenerational vs. present welfare"
      ],
      "philosophical_tradition": "Environmental ethics vs. economic development",
      "resolution_strategies": [
        "Sustainable development models",
        "Long-term over short-term gains",
        "Recognize ecological limits"
      ]
    },
    {
      "id": "conflict-011",
      "value1": "Faith",
      "value2": "Autonomy",
      "description": "Religious authority vs. individual conscience",
      "severity": 0.75,
      "domain_crossing": true,
      "domains": ["Transcendence", "Dignity"],
      "examples": [
        "Church doctrine vs. personal interpretation",
        "Religious law vs. civil law",
        "Submission to divine will vs. free will"
      ],
      "philosophical_tradition": "Theological ethics tensions",
      "resolution_strategies": [
        "Freedom of conscience",
        "Religious liberty protections",
        "Dialogue and discernment"
      ]
    },
    {
      "id": "conflict-012",
      "value1": "Innovation",
      "value2": "Tradition",
      "description": "New methods vs. established practices",
      "severity": 0.5,
      "domain_crossing": true,
      "domains": ["Virtue", "Community"],
      "examples": [
        "Experimental treatment vs. standard of care",
        "Cultural preservation vs. modernization",
        "Reform vs. conservation"
      ],
      "philosophical_tradition": "Progressive vs. conservative ethics",
      "resolution_strategies": [
        "Incremental change",
        "Preserve core while adapting periphery",
        "Evidence-based innovation"
      ]
    },
    {
      "id": "conflict-013",
      "value1": "Efficiency",
      "value2": "Dignity",
      "description": "Optimization vs. respect for persons",
      "severity": 0.7,
      "domain_crossing": true,
      "domains": ["Virtue", "Dignity"],
      "examples": [
        "Healthcare cost-cutting vs. patient care",
        "Productivity metrics vs. human flourishing",
        "Automation vs. meaningful work"
      ],
      "philosophical_tradition": "Utilitarian efficiency vs. Kantian dignity",
      "resolution_strategies": [
        "Persons as ends not means",
        "Sustainable pace over burnout",
        "Quality over mere quantity"
      ]
    },
    {
      "id": "conflict-014",
      "value1": "Solidarity",
      "value2": "Competition",
      "description": "Cooperation vs. individual achievement",
      "severity": 0.6,
      "domain_crossing": true,
      "domains": ["Community", "Virtue"],
      "examples": [
        "Collective bargaining vs. individual negotiation",
        "Team success vs. personal recognition",
        "Market competition vs. worker solidarity"
      ],
      "philosophical_tradition": "Socialist vs. capitalist ethics",
      "resolution_strategies": [
        "Balanced competition within solidarity",
        "Cooperative competition",
        "Fair play and mutual support"
      ]
    },
    {
      "id": "conflict-015",
      "value1": "Transparency",
      "value2": "Privacy",
      "description": "Openness vs. personal boundaries",
      "severity": 0.7,
      "domain_crossing": false,
      "domains": ["Community", "Dignity"],
      "examples": [
        "Government transparency vs. state secrets",
        "Financial disclosure vs. personal privacy",
        "Organizational openness vs. confidential information"
      ],
      "philosophical_tradition": "Democratic accountability vs. liberal privacy",
      "resolution_strategies": [
        "Public interest test",
        "Privacy by default, transparency by exception",
        "Proportional disclosure"
      ]
    },
    {
      "id": "conflict-016",
      "value1": "Courage",
      "value2": "Prudence",
      "description": "Bold action vs. cautious wisdom",
      "severity": 0.5,
      "domain_crossing": false,
      "domains": ["Virtue", "Virtue"],
      "examples": [
        "Taking risks vs. playing safe",
        "Speaking truth to power vs. picking battles",
        "Moral courage vs. practical wisdom"
      ],
      "philosophical_tradition": "Classical virtue ethics internal tensions",
      "resolution_strategies": [
        "Aristotelian mean between cowardice and recklessness",
        "Context-sensitive judgment",
        "Courage tempered by wisdom"
      ]
    },
    {
      "id": "conflict-017",
      "value1": "Hope",
      "value2": "Realism",
      "description": "Optimism vs. accepting limits",
      "severity": 0.4,
      "domain_crossing": true,
      "domains": ["Transcendence", "Virtue"],
      "examples": [
        "Hoping for cure vs. accepting terminal illness",
        "Idealism vs. pragmatism",
        "Faith in progress vs. tragic awareness"
      ],
      "philosophical_tradition": "Religious hope vs. existential realism",
      "resolution_strategies": [
        "Hope without denial",
        "Tragic optimism",
        "Serenity to accept what cannot be changed"
      ]
    },
    {
      "id": "conflict-018",
      "value1": "Non-maleficence",
      "value2": "Beneficence",
      "description": "Do no harm vs. actively help",
      "severity": 0.6,
      "domain_crossing": false,
      "domains": ["Care", "Care"],
      "examples": [
        "Risky intervention for potential benefit",
        "Side effects vs. therapeutic effects",
        "Aggressive treatment vs. comfort care"
      ],
      "philosophical_tradition": "Medical ethics principle tensions",
      "resolution_strategies": [
        "Primum non nocere (first do no harm)",
        "Proportionality of risk to benefit",
        "Informed consent about tradeoffs"
      ]
    }
  ],
  "usage_notes": {
    "detection": "Check if both values in a conflict pair have scores >0.6",
    "tension_calculation": "tension = min(score1, score2) * severity * conflict_factor",
    "conflict_factor": "1.0 if polarities differ, 0.5 if same polarity, 0.0 if both neutral",
    "display": "Show conflicts only if tension >0.4 to avoid noise"
  },
  "metadata": {
    "total_conflicts": 18,
    "coverage": {
      "Dignity": 8,
      "Care": 8,
      "Virtue": 7,
      "Community": 6,
      "Transcendence": 3
    },
    "cross_domain": 13,
    "within_domain": 5
  }
}
;

  // Make available globally for legacy code
  _global.VALUE_DEFINITIONS = VALUE_DEFINITIONS;
  _global.FRAME_VALUE_BOOSTS = FRAME_VALUE_BOOSTS;
  _global.CONFLICT_PAIRS = CONFLICT_PAIRS;

  // ============================================================================
  // CONTEXT ANALYZER
  // ============================================================================

  const ContextAnalyzer = (function(PatternMatcher) {

    'use strict';

    // ========================================
    // DEFAULT SCORES (from IEE specifications)
    // ========================================

    const DEFAULT_SCORES = {
        // Temporal - Neutral assumption
        urgency: 0.5,
        duration: 0.5,
        reversibility: 0.5,

        // Relational - Lower defaults (most scenarios = acquaintances)
        intimacy: 0.3,
        powerDifferential: 0.3,
        trust: 0.5,

        // Consequential - Lower defaults (assume less harm unless stated)
        harmSeverity: 0.3,
        benefitMagnitude: 0.3,
        scope: 0.2,

        // Epistemic - Neutral assumption
        certainty: 0.5,
        informationCompleteness: 0.5,
        expertise: 0.5
    };

    // ========================================
    // CONTEXT ANALYZER CLASS
    // ========================================

    function ContextAnalyzer(contextPatterns) {
        this.patterns = contextPatterns || {};
        this.patternMatcher = new PatternMatcher();
    }

    /**
     * Analyze all 12 context dimensions
     * @param {string} text - Input sentence
     * @param {Array} taggedWords - POS-tagged words
     * @param {Object} semanticFrame - Classified semantic frame
     * @param {Object} roles - Extracted semantic roles (agent, patient, etc.)
     * @returns {Object} - 12-dimension context intensity scores
     */
    ContextAnalyzer.prototype.analyzeContext = function(text, taggedWords, semanticFrame, roles) {
        return {
            temporal: this._analyzeTemporal(text),
            relational: this._analyzeRelational(text, roles),
            consequential: this._analyzeConsequential(text, semanticFrame, roles),
            epistemic: this._analyzeEpistemic(text, taggedWords, roles)
        };
    };

    // ========================================
    // TEMPORAL CONTEXT ANALYSIS
    // ========================================

    ContextAnalyzer.prototype._analyzeTemporal = function(text) {
        return {
            urgency: this._scoreUrgency(text),
            duration: this._scoreDuration(text),
            reversibility: this._scoreReversibility(text)
        };
    };

    ContextAnalyzer.prototype._scoreUrgency = function(text) {
        const keywords = {
            extreme: [
                'last ventilator', 'dying', 'critical condition', 'critically ill',
                'life-threatening', 'life or death', 'emergency', 'immediately'
            ],
            high: [
                'urgent', 'crisis', 'now', 'must decide', 'must allocate',
                'deadline', 'time running out', 'critical', 'imminent', 'asap',
                'right now', 'this instant', 'pressing', 'time-sensitive',
                'within hours', 'within minutes', 'no time'
            ],
            medium: [
                'soon', 'quickly', 'timely', 'prompt', 'expedite',
                'within days', 'this week', 'short time', 'limited time',
                'discovered', 'falsifying'
            ],
            low: [
                'eventually', 'when convenient', 'no rush', 'take time',
                'ample time', 'no deadline', 'flexible', 'whenever',
                'questioning'
            ]
        };

        const scores = {
            extreme: 1.0,
            high: 0.8,
            medium: 0.6,
            low: 0.3
        };

        return this.patternMatcher.getMaxScore(text, keywords, scores, DEFAULT_SCORES.urgency);
    };

    ContextAnalyzer.prototype._scoreDuration = function(text) {
        const keywords = {
            permanent: [
                'forever', 'permanent', 'irreversible', 'lifelong', 'eternal',
                'always', 'never undo', 'rest of life', 'generations',
                'lasting', 'enduring', 'perpetual', 'end of life', 'death',
                'continue treatment', 'allocate', 'decide whether'
            ],
            long_term: [
                'years', 'decades', 'long-term', 'extended', 'sustained',
                'chronic', 'ongoing', 'prolonged', 'core doctrines',
                'falsifying', 'safety reports', 'cheating'
            ],
            medium_term: [
                'months', 'seasons', 'medium-term', 'several weeks'
            ],
            short_term: [
                'temporary', 'brief', 'short-term', 'momentary', 'fleeting',
                'transient', 'passing'
            ]
        };

        const scores = {
            permanent: 1.0,
            long_term: 0.7,
            medium_term: 0.5,
            short_term: 0.2
        };

        return this.patternMatcher.getMaxScore(text, keywords, scores, DEFAULT_SCORES.duration);
    };

    ContextAnalyzer.prototype._scoreReversibility = function(text) {
        const keywords = {
            irreversible: [
                'irreversible', 'cannot undo', 'permanent', 'final', 'irrevocable',
                'no going back', 'once done', 'point of no return',
                'death', 'destroy', 'terminal', 'end of life', 'continue treatment',
                'allocate', 'last ventilator', 'critically ill'
            ],
            difficult: [
                'hard to undo', 'difficult to reverse', 'costly to reverse',
                'significant to change', 'surgery', 'commitment', 'falsifying',
                'cheating', 'core doctrines'
            ],
            moderate: [
                'can change', 'adjustable', 'modifiable', 'amendable'
            ],
            easy: [
                'reversible', 'can undo', 'changeable', 'temporary', 'trial',
                'cancel anytime', 'questioning'
            ]
        };

        const scores = {
            irreversible: 1.0,
            difficult: 0.6,
            moderate: 0.4,
            easy: 0.2
        };

        return this.patternMatcher.getMaxScore(text, keywords, scores, DEFAULT_SCORES.reversibility);
    };

    // ========================================
    // RELATIONAL CONTEXT ANALYSIS
    // ========================================

    ContextAnalyzer.prototype._analyzeRelational = function(text, roles) {
        return {
            intimacy: this._scoreIntimacy(text, roles),
            powerDifferential: this._scorePowerDifferential(text, roles),
            trust: this._scoreTrust(text)
        };
    };

    ContextAnalyzer.prototype._scoreIntimacy = function(text, roles) {
        const keywords = {
            immediate: [
                'myself', 'my own', 'i am',
                'spouse', 'partner', 'child', 'parent', 'mother', 'father'
            ],
            close: [
                'family', 'best friend', 'close friend', 'sibling', 'loved one'
            ],
            moderate: [
                'friend', 'colleague', 'neighbor', 'acquaintance'
            ],
            distant: [
                'stranger', 'unknown', 'anonymous', 'public', 'community',
                'company', 'my company', 'organization', 'employer', 'patients'
            ]
        };

        const scores = {
            immediate: 1.0,
            close: 0.8,
            moderate: 0.5,
            distant: 0.2
        };

        return this.patternMatcher.getMaxScore(text, keywords, scores, DEFAULT_SCORES.intimacy);
    };

    ContextAnalyzer.prototype._scorePowerDifferential = function(text, roles) {
        const keywords = {
            extreme: [
                'child', 'infant', 'baby', 'vulnerable', 'helpless',
                'boss', 'CEO', 'authority', 'prisoner', 'patient in care',
                'patients', 'critically ill', 'allocate', 'must allocate',
                'doctor must'
            ],
            high: [
                'employee', 'subordinate', 'student', 'junior',
                'elderly', 'disabled', 'dependent', 'my company',
                'company', 'employer'
            ],
            moderate: [
                'colleague', 'peer', 'co-worker', 'classmate'
            ],
            equal: [
                'equal', 'peer', 'same level', 'balanced', 'friend',
                'best friend', 'spouse', 'family'
            ]
        };

        const scores = {
            extreme: 0.9,
            high: 0.8,
            moderate: 0.4,
            equal: 0.1
        };

        return this.patternMatcher.getMaxScore(text, keywords, scores, DEFAULT_SCORES.powerDifferential);
    };

    ContextAnalyzer.prototype._scoreTrust = function(text) {
        const keywords = {
            complete: [
                'complete trust', 'always trusted', 'trusted completely',
                'reliable', 'dependable', 'faithful'
            ],
            high: [
                'trust', 'trusted', 'trustworthy', 'confidence',
                'doctor', 'medical', 'family'
            ],
            moderate: [
                'friend', 'best friend'
            ],
            low: [
                'distrust', 'suspicious', 'doubtful', 'unreliable'
            ],
            none: [
                'betrayal', 'betrayed', 'no trust', 'cannot trust',
                'deceitful', 'dishonest', 'cheating', 'falsifying',
                'falsifying safety reports'
            ]
        };

        const scores = {
            complete: 1.0,
            high: 0.8,
            moderate: 0.7,
            low: 0.3,
            none: 0.2
        };

        return this.patternMatcher.getMaxScore(text, keywords, scores, DEFAULT_SCORES.trust);
    };

    // ========================================
    // CONSEQUENTIAL CONTEXT ANALYSIS
    // ========================================

    ContextAnalyzer.prototype._analyzeConsequential = function(text, semanticFrame, roles) {
        return {
            harmSeverity: this._scoreHarmSeverity(text, semanticFrame),
            benefitMagnitude: this._scoreBenefitMagnitude(text, semanticFrame),
            scope: this._scoreScope(text, roles)
        };
    };

    ContextAnalyzer.prototype._scoreHarmSeverity = function(text, semanticFrame) {
        const keywords = {
            catastrophic: [
                'death', 'die', 'kill', 'fatal', 'deadly',
                'catastrophic', 'devastating', 'destroy', 'thousands die',
                'end of life', 'continue treatment', 'last ventilator',
                'critically ill', 'allocate'
            ],
            severe: [
                'serious harm', 'major injury', 'permanent damage',
                'life-threatening', 'traumatic', 'severe',
                'falsifying safety reports', 'safety violation'
            ],
            moderate: [
                'harm', 'injury', 'hurt', 'damage', 'suffering', 'pain',
                'cheating', 'infidelity'
            ],
            minor: [
                'minor harm', 'slight injury', 'inconvenience', 'discomfort',
                'questioning'
            ]
        };

        const scores = {
            catastrophic: 1.0,
            severe: 0.8,
            moderate: 0.6,
            minor: 0.2
        };

        return this.patternMatcher.getMaxScore(text, keywords, scores, DEFAULT_SCORES.harmSeverity);
    };

    ContextAnalyzer.prototype._scoreBenefitMagnitude = function(text, semanticFrame) {
        const keywords = {
            transformative: [
                'life-saving', 'save lives', 'cure', 'revolutionary',
                'transformative', 'save millions', 'save thousands',
                'last ventilator', 'allocate'
            ],
            major: [
                'significant benefit', 'major improvement', 'heal',
                'great benefit', 'substantial', 'safety reports',
                'prevent harm', 'whistleblowing'
            ],
            moderate: [
                'benefit', 'improve', 'help', 'positive', 'advantage',
                'questioning', 'truth', 'honesty'
            ],
            minor: [
                'slight improvement', 'minor benefit', 'small gain',
                'continue treatment'
            ]
        };

        const scores = {
            transformative: 1.0,
            major: 0.7,
            moderate: 0.6,
            minor: 0.3
        };

        return this.patternMatcher.getMaxScore(text, keywords, scores, DEFAULT_SCORES.benefitMagnitude);
    };

    ContextAnalyzer.prototype._scoreScope = function(text, roles) {
        const keywords = {
            global: [
                'humanity', 'everyone', 'entire species', 'global',
                'worldwide', 'all people', 'human race'
            ],
            national: [
                'nation', 'country', 'national', 'all citizens'
            ],
            community: [
                'community', 'town', 'city', 'neighborhood',
                'local', 'our community', 'many people',
                'safety reports', 'company', 'falsifying'
            ],
            group: [
                'group', 'team', 'organization', 'several people',
                'family', 'friends', 'patients', 'two patients'
            ],
            individual: [
                'person', 'individual', 'one person', 'myself', 'self',
                'i am', 'my best friend', 'their spouse'
            ]
        };

        const scores = {
            global: 1.0,
            national: 0.8,
            community: 0.5,
            group: 0.2,
            individual: 0.1
        };

        return this.patternMatcher.getMaxScore(text, keywords, scores, DEFAULT_SCORES.scope);
    };

    // ========================================
    // EPISTEMIC CONTEXT ANALYSIS
    // ========================================

    ContextAnalyzer.prototype._analyzeEpistemic = function(text, taggedWords, roles) {
        return {
            certainty: this._scoreCertainty(text),
            informationCompleteness: this._scoreInformationCompleteness(text),
            expertise: this._scoreExpertise(text, roles)
        };
    };

    ContextAnalyzer.prototype._scoreCertainty = function(text) {
        const keywords = {
            certain: [
                'certain', 'definitely', 'absolutely', 'sure', 'proven',
                'confirmed', 'guaranteed', 'undoubtedly', 'clearly',
                'discovered', 'is cheating', 'is falsifying'
            ],
            probable: [
                'likely', 'probably', 'expected', 'anticipated'
            ],
            uncertain: [
                'uncertain', 'unclear', 'unknown', 'might', 'maybe',
                'possibly', 'perhaps', 'questionable', 'questioning',
                'must decide'
            ]
        };

        const scores = {
            certain: 0.8,
            probable: 0.6,
            uncertain: 0.3
        };

        return this.patternMatcher.getMaxScore(text, keywords, scores, DEFAULT_SCORES.certainty);
    };

    ContextAnalyzer.prototype._scoreInformationCompleteness = function(text) {
        const keywords = {
            complete: [
                'all the facts', 'complete information', 'full picture',
                'all the data', 'comprehensive'
            ],
            mostly_complete: [
                'most information', 'generally informed', 'good understanding'
            ],
            incomplete: [
                'missing information', 'incomplete', 'unclear', 'don\'t know',
                'lack information', 'missing data', 'critical information missing'
            ]
        };

        const scores = {
            complete: 0.9,
            mostly_complete: 0.6,
            incomplete: 0.2
        };

        return this.patternMatcher.getMaxScore(text, keywords, scores, DEFAULT_SCORES.informationCompleteness);
    };

    ContextAnalyzer.prototype._scoreExpertise = function(text, roles) {
        const keywords = {
            expert: [
                'expert', 'specialist', 'professional', 'trained',
                'board-certified', 'experienced', 'qualified', 'licensed',
                'doctor', 'surgeon', 'professor', 'researcher'
            ],
            competent: [
                'competent', 'capable', 'skilled', 'knowledgeable'
            ],
            novice: [
                'inexperienced', 'novice', 'beginner', 'untrained',
                'no experience', 'first time'
            ]
        };

        const scores = {
            expert: 0.9,
            competent: 0.6,
            novice: 0.2
        };

        return this.patternMatcher.getMaxScore(text, keywords, scores, DEFAULT_SCORES.expertise);
    };

    // ========================================
    // EXPORT
    // ========================================

    return ContextAnalyzer;

    return ContextAnalyzer;
  })(PatternMatcher);

  // ============================================================================
  // VALUE MATCHER
  // ============================================================================

  const ValueMatcher = (function(PatternMatcher) {

    'use strict';

    // ========================================
    // VALUE MATCHER CLASS
    // ========================================

    /**
     * ValueMatcher - Detects ethical values in text
     * @param {Object} valueDefinitions - Loaded from value-definitions-comprehensive.json
     */
    function ValueMatcher(valueDefinitions) {
        if (!valueDefinitions || !valueDefinitions.values) {
            throw new Error('ValueMatcher requires value definitions with "values" array');
        }

        this.valueDefinitions = valueDefinitions.values;
        this.patternMatcher = new PatternMatcher();

        // Pre-compile value lookup by name for quick access
        this.valueByName = {};
        this.valueDefinitions.forEach(function(valueDef) {
            this.valueByName[valueDef.name] = valueDef;
        }.bind(this));
    }

    /**
     * Match values in text and return all detected values with metadata
     * @param {string} text - Input text to analyze
     * @returns {Array} - Array of detected values with salience, polarity, evidence
     */
    ValueMatcher.prototype.matchValues = function(text) {
        var detectedValues = [];

        this.valueDefinitions.forEach(function(valueDef) {
            var result = this._matchSingleValue(text, valueDef);

            if (result.keywordCount > 0) {
                detectedValues.push({
                    name: valueDef.name,
                    domain: valueDef.domain,
                    keywordCount: result.keywordCount,
                    polarity: result.polarity,
                    evidence: result.evidence,
                    source: 'keyword'
                });
            }
        }.bind(this));

        return detectedValues;
    };

    /**
     * Match a single value against text
     * @private
     * @param {string} text - Input text
     * @param {Object} valueDef - Value definition object
     * @returns {Object} - Match result with keywordCount, polarity, evidence
     */
    ValueMatcher.prototype._matchSingleValue = function(text, valueDef) {
        var lowerText = text.toLowerCase();
        var keywordCount = 0;
        var evidence = [];
        var upholdingCount = 0;
        var violatingCount = 0;

        // Step 1: Count keyword matches from semanticMarkers
        var semanticMarkers = valueDef.semanticMarkers || [];
        semanticMarkers.forEach(function(marker) {
            var lowerMarker = marker.toLowerCase();
            var regex = new RegExp('\\b' + this._escapeRegex(lowerMarker) + '\\b', 'gi');
            var matches = lowerText.match(regex);

            if (matches) {
                keywordCount += matches.length;
                // Collect evidence (deduplicate)
                if (evidence.indexOf(marker) === -1) {
                    evidence.push(marker);
                }
            }
        }.bind(this));

        // Step 2: Determine polarity using polarityIndicators
        if (valueDef.polarityIndicators) {
            // Week 3 Enhancement: Use BALANCED strategy for flexible matching
            var matchOptions = {
                lemmatize: true,
                caseSensitive: false,
                partialMatch: true,
                threshold: 0.8
            };

            // Check upholding patterns
            var upholdingPatterns = valueDef.polarityIndicators.upholding || [];
            upholdingPatterns.forEach(function(pattern) {
                if (this.patternMatcher.containsAny(text, [pattern], matchOptions)) {
                    upholdingCount++;
                }
            }.bind(this));

            // Check violating patterns
            var violatingPatterns = valueDef.polarityIndicators.violating || [];
            violatingPatterns.forEach(function(pattern) {
                if (this.patternMatcher.containsAny(text, [pattern], matchOptions)) {
                    violatingCount++;
                }
            }.bind(this));
        }

        // Step 3: Determine final polarity
        var polarity = this._determinePolarity(upholdingCount, violatingCount);

        return {
            keywordCount: keywordCount,
            polarity: polarity,
            evidence: evidence,
            upholdingCount: upholdingCount,
            violatingCount: violatingCount
        };
    };

    /**
     * Determine polarity based on upholding and violating evidence
     * @private
     * @param {number} upholdingCount - Number of upholding patterns matched
     * @param {number} violatingCount - Number of violating patterns matched
     * @returns {number} - Polarity: +1 (upholding), -1 (violating), 0 (neutral/conflicted)
     */
    ValueMatcher.prototype._determinePolarity = function(upholdingCount, violatingCount) {
        // Binary polarity detection (as approved by IEE)

        // If both upholding and violating evidence, return 0 (conflicted)
        if (upholdingCount > 0 && violatingCount > 0) {
            return 0;
        }

        // If only violating evidence
        if (violatingCount > 0) {
            return -1;
        }

        // If only upholding evidence
        if (upholdingCount > 0) {
            return +1;
        }

        // No polarity evidence, return 0 (neutral)
        return 0;
    };

    /**
     * Check if polarity represents a genuine conflict
     * @param {number} upholdingCount - Upholding pattern matches
     * @param {number} violatingCount - Violating pattern matches
     * @returns {boolean} - True if both upholding AND violating evidence present
     */
    ValueMatcher.prototype.isConflicted = function(upholdingCount, violatingCount) {
        return upholdingCount > 0 && violatingCount > 0;
    };

    /**
     * Escape regex special characters
     * @private
     */
    ValueMatcher.prototype._escapeRegex = function(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };

    /**
     * Get value definition by name
     * @param {string} valueName - Name of the value
     * @returns {Object|null} - Value definition or null if not found
     */
    ValueMatcher.prototype.getValueDefinition = function(valueName) {
        return this.valueByName[valueName] || null;
    };

    /**
     * Get all value names
     * @returns {Array<string>} - Array of all value names
     */
    ValueMatcher.prototype.getAllValueNames = function() {
        return this.valueDefinitions.map(function(v) { return v.name; });
    };

    // ========================================
    // EXPORT
    // ========================================

    return ValueMatcher;

    return ValueMatcher;
  })(PatternMatcher);

  // ============================================================================
  // VALUE SCORER
  // ============================================================================

  const ValueScorer = (function() {

    'use strict';

    // ========================================
    // VALUE SCORER CLASS
    // ========================================

    /**
     * ValueScorer - Calculates salience scores with frame/role boosts
     * @param {Object} frameValueBoosts - Loaded from frame-value-boosts.json
     */
    function ValueScorer(frameValueBoosts) {
        if (!frameValueBoosts) {
            throw new Error('ValueScorer requires frameValueBoosts configuration');
        }

        this.frameBoosts = frameValueBoosts.frameValueBoosts || {};
        this.roleBoosts = frameValueBoosts.roleValueBoosts || {};

        // Constants for salience calculation
        this.KEYWORD_MULTIPLIER = 0.3;
        this.KEYWORD_CAP = 0.6;
        this.DETECTION_THRESHOLD = 0.3;
    }

    /**
     * Calculate salience for a detected value
     * @param {Object} detectedValue - Value from ValueMatcher with keywordCount
     * @param {string} semanticFrame - Current semantic frame (e.g., "Deciding")
     * @param {Array<string>} roles - Array of roles (e.g., ["doctor", "patient"])
     * @returns {Object} - Scored value with salience, breakdown, and source
     */
    ValueScorer.prototype.calculateSalience = function(detectedValue, semanticFrame, roles) {
        var valueName = detectedValue.name;
        var keywordCount = detectedValue.keywordCount || 0;

        // Step 1: Keyword score (0.0 to 0.6)
        var keywordScore = Math.min(keywordCount * this.KEYWORD_MULTIPLIER, this.KEYWORD_CAP);

        // Step 2: Frame boost (0.0 to 0.3)
        var frameBoost = this._getFrameBoost(semanticFrame, valueName);

        // Step 3: Role boost (0.0 to 0.2)
        var roleBoost = this._getRoleBoost(roles, valueName);

        // Step 4: Calculate final salience
        var salience = keywordScore + frameBoost + roleBoost;
        salience = Math.min(Math.max(salience, 0.0), 1.0); // Clamp to [0.0, 1.0]

        return {
            name: valueName,
            domain: detectedValue.domain,
            salience: parseFloat(salience.toFixed(2)), // Round to 2 decimals
            polarity: detectedValue.polarity,
            evidence: detectedValue.evidence,
            source: detectedValue.source,
            breakdown: {
                keywordScore: parseFloat(keywordScore.toFixed(2)),
                frameBoost: parseFloat(frameBoost.toFixed(2)),
                roleBoost: parseFloat(roleBoost.toFixed(2)),
                total: parseFloat(salience.toFixed(2))
            }
        };
    };

    /**
     * Score all detected values and add entailed values
     * @param {Array} detectedValues - Array of values from ValueMatcher
     * @param {string} semanticFrame - Current semantic frame
     * @param {Array<string>} roles - Array of roles
     * @param {Array} allValueDefinitions - All 50 value definitions (for entailment)
     * @returns {Array} - Array of scored values above threshold
     */
    ValueScorer.prototype.scoreValues = function(detectedValues, semanticFrame, roles, allValueDefinitions) {
        var scoredValues = [];
        var processedValueNames = {};

        // Score all keyword-detected values
        detectedValues.forEach(function(detectedValue) {
            var scored = this.calculateSalience(detectedValue, semanticFrame, roles);

            if (scored.salience >= this.DETECTION_THRESHOLD) {
                scoredValues.push(scored);
                processedValueNames[scored.name] = true;
            }
        }.bind(this));

        // Add entailed values (values boosted by frame/role but not in keywords)
        this._addEntailedValues(scoredValues, processedValueNames, semanticFrame, roles, allValueDefinitions);

        // Sort by salience descending
        scoredValues.sort(function(a, b) {
            return b.salience - a.salience;
        });

        return scoredValues;
    };

    /**
     * Add entailed values - values implied by frame/role but not keyword-detected
     * @private
     */
    ValueScorer.prototype._addEntailedValues = function(scoredValues, processedValueNames, semanticFrame, roles, allValueDefinitions) {
        // Check frame boosts for values not yet processed
        if (this.frameBoosts[semanticFrame]) {
            var frameValueBoosts = this.frameBoosts[semanticFrame].boosts || {};

            for (var valueName in frameValueBoosts) {
                if (!processedValueNames[valueName]) {
                    var entailedValue = this._createEntailedValue(valueName, semanticFrame, roles, allValueDefinitions);

                    if (entailedValue && entailedValue.salience >= this.DETECTION_THRESHOLD) {
                        scoredValues.push(entailedValue);
                        processedValueNames[valueName] = true;
                    }
                }
            }
        }

        // Check role boosts for values not yet processed
        roles.forEach(function(role) {
            if (this.roleBoosts[role]) {
                var roleValueBoosts = this.roleBoosts[role].boosts || {};

                for (var valueName in roleValueBoosts) {
                    if (!processedValueNames[valueName]) {
                        var entailedValue = this._createEntailedValue(valueName, semanticFrame, roles, allValueDefinitions);

                        if (entailedValue && entailedValue.salience >= this.DETECTION_THRESHOLD) {
                            scoredValues.push(entailedValue);
                            processedValueNames[valueName] = true;
                        }
                    }
                }
            }
        }.bind(this));
    };

    /**
     * Create an entailed value (boosted by frame/role but no keywords)
     * @private
     */
    ValueScorer.prototype._createEntailedValue = function(valueName, semanticFrame, roles, allValueDefinitions) {
        // Find value definition
        var valueDef = null;
        for (var i = 0; i < allValueDefinitions.length; i++) {
            if (allValueDefinitions[i].name === valueName) {
                valueDef = allValueDefinitions[i];
                break;
            }
        }

        if (!valueDef) {
            return null;
        }

        // Calculate salience (no keyword score, only boosts)
        var frameBoost = this._getFrameBoost(semanticFrame, valueName);
        var roleBoost = this._getRoleBoost(roles, valueName);
        var salience = Math.min(frameBoost + roleBoost, 1.0);

        if (salience < this.DETECTION_THRESHOLD) {
            return null;
        }

        return {
            name: valueName,
            domain: valueDef.domain,
            salience: parseFloat(salience.toFixed(2)),
            polarity: +1, // Default to upholding for entailed values (conservative assumption)
            evidence: [],
            source: 'entailment',
            breakdown: {
                keywordScore: 0.0,
                frameBoost: parseFloat(frameBoost.toFixed(2)),
                roleBoost: parseFloat(roleBoost.toFixed(2)),
                total: parseFloat(salience.toFixed(2))
            }
        };
    };

    /**
     * Get frame boost for a value
     * @private
     * @param {string} frame - Semantic frame name
     * @param {string} valueName - Value name
     * @returns {number} - Boost amount (0.0-0.3)
     */
    ValueScorer.prototype._getFrameBoost = function(frame, valueName) {
        if (!frame || !this.frameBoosts[frame]) {
            return 0.0;
        }

        var boosts = this.frameBoosts[frame].boosts || {};
        return boosts[valueName] || 0.0;
    };

    /**
     * Get role boost for a value (maximum across all roles)
     * @private
     * @param {Array<string>} roles - Array of role names
     * @param {string} valueName - Value name
     * @returns {number} - Maximum boost amount (0.0-0.2)
     */
    ValueScorer.prototype._getRoleBoost = function(roles, valueName) {
        if (!roles || roles.length === 0) {
            return 0.0;
        }

        var maxBoost = 0.0;

        roles.forEach(function(role) {
            if (this.roleBoosts[role]) {
                var boosts = this.roleBoosts[role].boosts || {};
                var boost = boosts[valueName] || 0.0;

                // Take maximum boost (avoid double-counting)
                if (boost > maxBoost) {
                    maxBoost = boost;
                }
            }
        }.bind(this));

        // Cap role boost at 0.2 as per specification
        return Math.min(maxBoost, 0.2);
    };

    /**
     * Get detection threshold
     * @returns {number} - Minimum salience threshold (0.3)
     */
    ValueScorer.prototype.getThreshold = function() {
        return this.DETECTION_THRESHOLD;
    };

    // ========================================
    // EXPORT
    // ========================================

    return ValueScorer;

    return ValueScorer;
  })();

  // ============================================================================
  // ETHICAL PROFILER
  // ============================================================================

  const EthicalProfiler = (function() {

    'use strict';

    // ========================================
    // ETHICAL PROFILER CLASS
    // ========================================

    /**
     * EthicalProfiler - Generates comprehensive ethical profiles
     * @param {Object} conflictPairs - Loaded from conflict-pairs.json
     */
    function EthicalProfiler(conflictPairs) {
        this.conflictPairs = (conflictPairs && conflictPairs.conflicts) ? conflictPairs.conflicts : [];

        // Domain mapping
        this.domainNames = ['Dignity', 'Care', 'Virtue', 'Community', 'Transcendence'];

        // Configuration
        this.DEFAULT_TOP_VALUES_COUNT = 5;
        this.DOMINANT_DOMAIN_THRESHOLD = 0.1;
    }

    /**
     * Generate complete ethical profile
     * @param {Array} scoredValues - Values from ValueScorer
     * @param {Object} options - Configuration options
     * @returns {Object} - Complete ethical profile
     */
    EthicalProfiler.prototype.generateProfile = function(scoredValues, options) {
        options = options || {};
        var topValuesCount = options.topValuesCount || this.DEFAULT_TOP_VALUES_COUNT;
        var verbose = options.verbose || false;

        // Sort by salience descending (should already be sorted, but ensure)
        scoredValues.sort(function(a, b) {
            return b.salience - a.salience;
        });

        // Build profile
        var profile = {
            values: this._buildValuesArray(scoredValues),
            valueSummary: this._buildValueSummary(scoredValues),
            topValues: this._getTopValues(scoredValues, topValuesCount),
            dominantDomain: this._getDominantDomain(scoredValues),
            domainScores: this._calculateDomainScores(scoredValues),
            conflictScore: 0,
            conflicts: [],
            confidence: this._calculateConfidence(scoredValues)
        };

        // Detect conflicts
        var conflictResult = this._detectConflicts(scoredValues);
        profile.conflictScore = conflictResult.conflictScore;
        profile.conflicts = conflictResult.conflicts;

        // Add metadata if verbose
        if (verbose) {
            profile.metadata = this._buildMetadata(scoredValues);
        }

        return profile;
    };

    /**
     * Build values array in output format
     * @private
     */
    EthicalProfiler.prototype._buildValuesArray = function(scoredValues) {
        return scoredValues.map(function(value) {
            return {
                name: value.name,
                salience: value.salience,
                polarity: value.polarity,
                conflict: value.conflict || false,
                domain: this._capitalizeFirst(value.domain),
                evidence: value.evidence || [],
                source: value.source
            };
        }.bind(this));
    };

    /**
     * Build value summary object
     * @private
     */
    EthicalProfiler.prototype._buildValueSummary = function(scoredValues) {
        var byDomain = {};
        var totalSalience = 0;
        var conflictCount = 0;

        scoredValues.forEach(function(value) {
            var domain = this._capitalizeFirst(value.domain);

            if (!byDomain[domain]) {
                byDomain[domain] = 0;
            }
            byDomain[domain]++;
            totalSalience += value.salience;

            if (value.conflict) {
                conflictCount++;
            }
        }.bind(this));

        return {
            totalDetected: scoredValues.length,
            byDomain: byDomain,
            avgSalience: scoredValues.length > 0 ? parseFloat((totalSalience / scoredValues.length).toFixed(2)) : 0,
            conflicts: conflictCount
        };
    };

    /**
     * Get top N values
     * @private
     */
    EthicalProfiler.prototype._getTopValues = function(scoredValues, count) {
        return scoredValues.slice(0, count).map(function(value) {
            var topValue = {
                name: value.name,
                salience: value.salience,
                polarity: value.polarity,
                domain: this._capitalizeFirst(value.domain)
            };

            // Add breakdown if available (from ValueScorer)
            if (value.breakdown) {
                topValue.keywords = value.evidence || [];
                topValue.boostedBy = this._buildBoostedByList(value.breakdown);
            }

            return topValue;
        }.bind(this));
    };

    /**
     * Build "boostedBy" list showing which components contributed
     * @private
     */
    EthicalProfiler.prototype._buildBoostedByList = function(breakdown) {
        var boostedBy = [];

        if (breakdown.keywordScore > 0) {
            boostedBy.push('keywords:' + breakdown.keywordScore);
        }
        if (breakdown.frameBoost > 0) {
            boostedBy.push('frame:' + breakdown.frameBoost);
        }
        if (breakdown.roleBoost > 0) {
            boostedBy.push('role:' + breakdown.roleBoost);
        }

        return boostedBy;
    };

    /**
     * Calculate domain scores
     * @private
     */
    EthicalProfiler.prototype._calculateDomainScores = function(scoredValues) {
        var domainScores = {};

        // Initialize all domains to 0
        this.domainNames.forEach(function(domain) {
            domainScores[domain] = 0;
        });

        // Sum saliences by domain
        var domainCounts = {};
        scoredValues.forEach(function(value) {
            var domain = this._capitalizeFirst(value.domain);

            if (!domainScores[domain]) {
                domainScores[domain] = 0;
                domainCounts[domain] = 0;
            }

            domainScores[domain] += value.salience;
            domainCounts[domain]++;
        }.bind(this));

        // Average salience per domain
        for (var domain in domainScores) {
            if (domainCounts[domain] > 0) {
                domainScores[domain] = parseFloat((domainScores[domain] / domainCounts[domain]).toFixed(2));
            }
        }

        return domainScores;
    };

    /**
     * Determine dominant domain
     * @private
     */
    EthicalProfiler.prototype._getDominantDomain = function(scoredValues) {
        var domainScores = this._calculateDomainScores(scoredValues);

        // Find max and second max
        var maxDomain = null;
        var maxScore = -1;
        var secondMaxScore = -1;

        for (var domain in domainScores) {
            if (domainScores[domain] > maxScore) {
                secondMaxScore = maxScore;
                maxScore = domainScores[domain];
                maxDomain = domain;
            } else if (domainScores[domain] > secondMaxScore) {
                secondMaxScore = domainScores[domain];
            }
        }

        // If difference < threshold, return "Mixed"
        if (maxScore - secondMaxScore < this.DOMINANT_DOMAIN_THRESHOLD) {
            return 'Mixed';
        }

        return maxDomain;
    };

    /**
     * Detect conflicts using hybrid approach (predefined + automatic)
     * @private
     */
    EthicalProfiler.prototype._detectConflicts = function(scoredValues) {
        var conflicts = [];
        var maxTension = 0;

        // Build lookup map for quick access
        var valueMap = {};
        scoredValues.forEach(function(value) {
            valueMap[value.name] = value;
        });

        // Check predefined conflict pairs
        this.conflictPairs.forEach(function(pair) {
            var value1 = valueMap[pair.value1];
            var value2 = valueMap[pair.value2];

            // Both values must be detected and significant
            if (value1 && value2 && value1.salience >= 0.6 && value2.salience >= 0.6) {
                var tension = this._calculateTension(value1, value2, pair.severity || 0.7);

                if (tension > 0.4) { // Threshold to avoid noise
                    conflicts.push({
                        value1: value1.name,
                        value2: value2.name,
                        score1: value1.salience,
                        score2: value2.salience,
                        polarity1: value1.polarity,
                        polarity2: value2.polarity,
                        tension: parseFloat(tension.toFixed(2)),
                        description: pair.description || '',
                        source: 'predefined'
                    });

                    if (tension > maxTension) {
                        maxTension = tension;
                    }
                }
            }
        }.bind(this));

        // Automatic conflict detection (both values > 0.6, different polarities)
        for (var i = 0; i < scoredValues.length; i++) {
            for (var j = i + 1; j < scoredValues.length; j++) {
                var v1 = scoredValues[i];
                var v2 = scoredValues[j];

                // Check if both significant and polarities differ
                if (v1.salience >= 0.6 && v2.salience >= 0.6 && v1.polarity !== v2.polarity && v1.polarity !== 0 && v2.polarity !== 0) {
                    // Check if not already in predefined conflicts
                    var alreadyDetected = conflicts.some(function(c) {
                        return (c.value1 === v1.name && c.value2 === v2.name) ||
                               (c.value1 === v2.name && c.value2 === v1.name);
                    });

                    if (!alreadyDetected) {
                        var tension = this._calculateTension(v1, v2, 0.5); // Medium severity for auto-detected

                        if (tension > 0.4) {
                            conflicts.push({
                                value1: v1.name,
                                value2: v2.name,
                                score1: v1.salience,
                                score2: v2.salience,
                                polarity1: v1.polarity,
                                polarity2: v2.polarity,
                                tension: parseFloat(tension.toFixed(2)),
                                description: 'Auto-detected: opposing polarities with high salience',
                                source: 'detected'
                            });

                            if (tension > maxTension) {
                                maxTension = tension;
                            }
                        }
                    }
                }
            }
        }

        return {
            conflictScore: parseFloat(maxTension.toFixed(2)),
            conflicts: conflicts
        };
    };

    /**
     * Calculate tension between two values
     * @private
     * @param {Object} value1 - First value
     * @param {Object} value2 - Second value
     * @param {number} severity - Severity rating (0.0-1.0)
     * @returns {number} - Tension score
     */
    EthicalProfiler.prototype._calculateTension = function(value1, value2, severity) {
        // tension = min(score1, score2) * severity * conflict_factor
        var minScore = Math.min(value1.salience, value2.salience);

        // Conflict factor based on polarities
        var conflictFactor = 1.0;
        if (value1.polarity === value2.polarity) {
            conflictFactor = 0.5; // Same polarity = less tension
        } else if (value1.polarity === 0 || value2.polarity === 0) {
            conflictFactor = 0.5; // One neutral = less tension
        }
        // else: opposing polarities = 1.0 (maximum tension)

        return minScore * severity * conflictFactor;
    };

    /**
     * Calculate confidence score
     * @private
     */
    EthicalProfiler.prototype._calculateConfidence = function(scoredValues) {
        if (scoredValues.length === 0) {
            return 0;
        }

        // Factors affecting confidence:
        // 1. Number of values detected (more = higher confidence)
        // 2. Average salience (higher = more confident)
        // 3. Evidence quality (keyword vs. entailment)

        var valueCountFactor = Math.min(scoredValues.length / 10, 1.0); // Cap at 10 values
        var avgSalience = scoredValues.reduce(function(sum, v) {
            return sum + v.salience;
        }, 0) / scoredValues.length;

        var keywordCount = scoredValues.filter(function(v) {
            return v.source === 'keyword';
        }).length;
        var evidenceFactor = scoredValues.length > 0 ? keywordCount / scoredValues.length : 0;

        var confidence = (valueCountFactor * 0.3) + (avgSalience * 0.5) + (evidenceFactor * 0.2);

        return parseFloat(Math.min(confidence, 1.0).toFixed(2));
    };

    /**
     * Build metadata object for verbose mode
     * @private
     */
    EthicalProfiler.prototype._buildMetadata = function(scoredValues) {
        var totalKeywordMatches = 0;
        var keywordValues = 0;
        var frameBoostCount = 0;
        var roleBoostCount = 0;

        scoredValues.forEach(function(value) {
            if (value.source === 'keyword') {
                keywordValues++;
                totalKeywordMatches += value.evidence.length;
            }
            if (value.breakdown) {
                if (value.breakdown.frameBoost > 0) frameBoostCount++;
                if (value.breakdown.roleBoost > 0) roleBoostCount++;
            }
        });

        var avgSalience = scoredValues.length > 0 ?
            scoredValues.reduce(function(sum, v) { return sum + v.salience; }, 0) / scoredValues.length : 0;

        return {
            totalKeywordMatches: totalKeywordMatches,
            valuesDetected: scoredValues.length,
            keywordBasedValues: keywordValues,
            entailedValues: scoredValues.length - keywordValues,
            frameBoostsApplied: frameBoostCount,
            roleBoostsApplied: roleBoostCount,
            averageScore: parseFloat(avgSalience.toFixed(2))
        };
    };

    /**
     * Capitalize first letter of string
     * @private
     */
    EthicalProfiler.prototype._capitalizeFirst = function(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    };

    // ========================================
    // EXPORT
    // ========================================

    return EthicalProfiler;

    return EthicalProfiler;
  })();

  // ============================================================================
  // ASSERTION EVENT BUILDER
  // ============================================================================


  // Browser-compatible SHA-256 implementation for IRI generation
  const crypto = {
    createHash: function(algorithm) {
      if (algorithm !== 'sha256') {
        throw new Error('Only sha256 is supported in browser');
      }
      return {
        _data: '',
        update: function(data) {
          this._data += data;
          return this;
        },
        digest: function(encoding) {
          let hash = 5381;
          const str = this._data;
          for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) + hash) + str.charCodeAt(i);
            hash = hash & 0xffffffff;
          }
          const hex1 = (hash >>> 0).toString(16).padStart(8, '0');
          let hash2 = 0;
          for (let i = 0; i < str.length; i++) {
            hash2 = str.charCodeAt(i) + ((hash2 << 6) + (hash2 << 16) - hash2);
            hash2 = hash2 & 0xffffffff;
          }
          const hex2 = (hash2 >>> 0).toString(16).padStart(8, '0');
          return (hex1 + hex2).repeat(4).substring(0, 64);
        }
      };
    }
  };


/**
 * AssertionEventBuilder.js
 *
 * Creates ValueAssertionEvent and ContextAssessmentEvent nodes.
 * Wraps existing value and context detections as semantically honest
 * assertion events with GIT-Minimal provenance tracking.
 *
 * Phase 4 Week 2 Implementation:
 * - Three-way confidence decomposition (extraction, classification, relevance)
 * - GIT-Minimal properties (assertionType, validInContext)
 * - ICE nodes as separate entities linked via asserts
 * - Parser agent provenance via detected_by
 * - IBE linkage via based_on
 *
 * @module graph/AssertionEventBuilder
 * @version 4.0.0-phase4-week2
 */

/**
 * Context dimension definitions for ContextAssessmentEvents
 * Maps to ContextAnalyzer's 12 dimensions
 */
const CONTEXT_DIMENSIONS = {
  // Temporal
  urgency: { category: 'temporal', label: 'Urgency' },
  timePressure: { category: 'temporal', label: 'Time Pressure' },
  irreversibility: { category: 'temporal', label: 'Irreversibility' },

  // Relational
  powerDifferential: { category: 'relational', label: 'Power Differential' },
  dependencyLevel: { category: 'relational', label: 'Dependency Level' },
  trustRequirement: { category: 'relational', label: 'Trust Requirement' },

  // Consequential
  stakesLevel: { category: 'consequential', label: 'Stakes Level' },
  scopeOfImpact: { category: 'consequential', label: 'Scope of Impact' },
  cascadeRisk: { category: 'consequential', label: 'Cascade Risk' },

  // Epistemic
  informationCompleteness: { category: 'epistemic', label: 'Information Completeness' },
  expertiseRequired: { category: 'epistemic', label: 'Expertise Required' },
  uncertaintyLevel: { category: 'epistemic', label: 'Uncertainty Level' }
};

/**
 * AssertionEventBuilder - creates assertion events with GIT-Minimal provenance
 */
class AssertionEventBuilder {
  /**
   * Create a new AssertionEventBuilder
   * @param {Object} options - Configuration options
   * @param {Object} [options.graphBuilder] - SemanticGraphBuilder instance
   * @param {string} [options.namespace='inst'] - IRI namespace prefix
   */
  constructor(options = {}) {
    this.options = {
      namespace: options.namespace || 'inst',
      ...options
    };
    this.graphBuilder = options.graphBuilder || null;
  }

  /**
   * Create ValueAssertionEvents from scored values
   *
   * @param {Array} scoredValues - Array from ValueScorer.scoreValues()
   * @param {Object} context - Context for assertions
   * @param {string} context.contextIRI - InterpretationContext IRI
   * @param {string} context.ibeIRI - Input IBE IRI
   * @param {string} context.parserAgentIRI - Parser agent IRI
   * @returns {Object} { assertionEvents: [], iceNodes: [] }
   */
  createValueAssertions(scoredValues, context) {
    const assertionEvents = [];
    const iceNodes = [];

    if (!scoredValues || !Array.isArray(scoredValues)) {
      return { assertionEvents, iceNodes };
    }

    scoredValues.forEach((scoredValue, index) => {
      // Create ICE node for the value content
      const iceNode = this._createValueICE(scoredValue, context, index);
      iceNodes.push(iceNode);

      // Create assertion event
      const assertionEvent = this._createValueAssertionEvent(
        scoredValue,
        iceNode['@id'],
        context,
        index
      );
      assertionEvents.push(assertionEvent);
    });

    return { assertionEvents, iceNodes };
  }

  /**
   * Create ContextAssessmentEvents from context analysis
   *
   * @param {Object} contextIntensity - Object from ContextAnalyzer.analyzeContext()
   * @param {Object} context - Context for assertions
   * @param {string} context.contextIRI - InterpretationContext IRI
   * @param {string} context.ibeIRI - Input IBE IRI
   * @param {string} context.parserAgentIRI - Parser agent IRI
   * @returns {Object} { assessmentEvents: [], iceNodes: [] }
   */
  createContextAssessments(contextIntensity, context) {
    const assessmentEvents = [];
    const iceNodes = [];

    if (!contextIntensity || typeof contextIntensity !== 'object') {
      return { assessmentEvents, iceNodes };
    }

    // Process each dimension
    Object.entries(CONTEXT_DIMENSIONS).forEach(([dimension, meta]) => {
      const score = contextIntensity[dimension];
      if (score === undefined || score === null) return;

      // Create ICE node for dimension content
      const iceNode = this._createContextDimensionICE(dimension, score, meta, context);
      iceNodes.push(iceNode);

      // Create assessment event
      const assessmentEvent = this._createContextAssessmentEvent(
        dimension,
        score,
        meta,
        iceNode['@id'],
        context
      );
      assessmentEvents.push(assessmentEvent);
    });

    return { assessmentEvents, iceNodes };
  }

  /**
   * Compute three-way confidence breakdown
   *
   * @param {Object} scoredValue - Scored value with confidence data
   * @returns {Object} { extraction, classification, relevance, aggregate }
   */
  _computeConfidenceBreakdown(scoredValue) {
    // Extract confidence components
    // If not provided, use reasonable defaults based on overall confidence
    const overallConfidence = scoredValue.confidence || scoredValue.score || 0.5;

    // Extraction: How confident we found the text pattern
    const extraction = scoredValue.extractionConfidence ||
                       scoredValue.patternStrength ||
                       Math.min(1.0, overallConfidence + 0.1);

    // Classification: How confident it's the right value type
    const classification = scoredValue.classificationConfidence ||
                           scoredValue.typeConfidence ||
                           overallConfidence;

    // Relevance: How relevant to the ethical context
    const relevance = scoredValue.relevanceConfidence ||
                      scoredValue.contextualScore ||
                      Math.max(0.5, overallConfidence - 0.1);

    // Aggregate: Geometric mean (conservative combination)
    const aggregate = Math.pow(extraction * classification * relevance, 1/3);

    return {
      extraction: this._roundConfidence(extraction),
      classification: this._roundConfidence(classification),
      relevance: this._roundConfidence(relevance),
      aggregate: this._roundConfidence(aggregate)
    };
  }

  /**
   * Create EthicalValueICE node
   *
   * @param {Object} scoredValue - Scored value
   * @param {Object} context - Context for assertions
   * @param {number} index - Index for uniqueness
   * @returns {Object} ICE node
   * @private
   */
  _createValueICE(scoredValue, context, index) {
    const valueName = scoredValue.value || scoredValue.name || 'UnknownValue';
    const iri = this._generateIRI(valueName, 'ICE', index);

    return {
      '@id': iri,
      '@type': ['tagteam:EthicalValueICE', 'cco:InformationContentEntity', 'owl:NamedIndividual'],
      'rdfs:label': `${valueName} Value Content`,
      'cco:is_about': { '@id': `tagteam:${valueName}` },
      'cco:is_concretized_by': { '@id': context.ibeIRI },
      'tagteam:valueName': valueName,
      'tagteam:valueCategory': scoredValue.category || 'ethical',
      'tagteam:instantiated_at': new Date().toISOString()
    };
  }

  /**
   * Create ValueAssertionEvent node
   *
   * @param {Object} scoredValue - Scored value
   * @param {string} iceIRI - ICE node IRI
   * @param {Object} context - Context for assertions
   * @param {number} index - Index for uniqueness
   * @returns {Object} Assertion event node
   * @private
   */
  _createValueAssertionEvent(scoredValue, iceIRI, context, index) {
    const valueName = scoredValue.value || scoredValue.name || 'UnknownValue';
    const iri = this._generateIRI(valueName, 'ValueAssertion', index);
    const confidence = this._computeConfidenceBreakdown(scoredValue);

    const event = {
      '@id': iri,
      '@type': ['tagteam:ValueAssertionEvent', 'owl:NamedIndividual'],
      'rdfs:label': `${valueName} Value Assertion`,

      // Core assertion links
      'tagteam:asserts': { '@id': iceIRI },
      'tagteam:detected_by': { '@id': context.parserAgentIRI },
      'tagteam:based_on': { '@id': context.ibeIRI },

      // GIT-Minimal required properties
      'tagteam:assertionType': { '@id': 'tagteam:AutomatedDetection' },
      'tagteam:validInContext': { '@id': context.contextIRI },

      // Three-way confidence decomposition
      'tagteam:extractionConfidence': confidence.extraction,
      'tagteam:classificationConfidence': confidence.classification,
      'tagteam:relevanceConfidence': confidence.relevance,
      'tagteam:aggregateConfidence': confidence.aggregate,
      'tagteam:aggregationMethod': 'geometric_mean',

      // Metadata
      'tagteam:instantiated_at': new Date().toISOString()
    };

    // Add evidence if available
    if (scoredValue.evidence || scoredValue.matchedText) {
      event['tagteam:evidence'] = scoredValue.evidence || scoredValue.matchedText;
    }

    // Add source span if available
    if (scoredValue.span) {
      event['tagteam:sourceSpan'] = scoredValue.span;
    }

    return event;
  }

  /**
   * Create ContextDimensionICE node
   *
   * @param {string} dimension - Dimension name
   * @param {number} score - Dimension score
   * @param {Object} meta - Dimension metadata
   * @param {Object} context - Context for assertions
   * @returns {Object} ICE node
   * @private
   */
  _createContextDimensionICE(dimension, score, meta, context) {
    const iri = this._generateIRI(dimension, 'DimensionICE', 0);

    return {
      '@id': iri,
      '@type': ['tagteam:ContextDimensionICE', 'cco:InformationContentEntity', 'owl:NamedIndividual'],
      'rdfs:label': `${meta.label} Dimension Content`,
      'cco:is_concretized_by': context.ibeIRI,
      'tagteam:dimension': dimension,
      'tagteam:category': meta.category,
      'tagteam:score': this._roundConfidence(score),
      'tagteam:instantiated_at': new Date().toISOString()
    };
  }

  /**
   * Create ContextAssessmentEvent node
   *
   * @param {string} dimension - Dimension name
   * @param {number} score - Dimension score
   * @param {Object} meta - Dimension metadata
   * @param {string} iceIRI - ICE node IRI
   * @param {Object} context - Context for assertions
   * @returns {Object} Assessment event node
   * @private
   */
  _createContextAssessmentEvent(dimension, score, meta, iceIRI, context) {
    const iri = this._generateIRI(dimension, 'ContextAssessment', 0);

    return {
      '@id': iri,
      '@type': ['tagteam:ContextAssessmentEvent', 'owl:NamedIndividual'],
      'rdfs:label': `${meta.label} Context Assessment`,

      // Core assertion links
      'tagteam:asserts': { '@id': iceIRI },
      'tagteam:detected_by': { '@id': context.parserAgentIRI },
      'tagteam:based_on': { '@id': context.ibeIRI },

      // GIT-Minimal required properties
      'tagteam:assertionType': { '@id': 'tagteam:AutomatedDetection' },
      'tagteam:validInContext': { '@id': context.contextIRI },

      // Dimension-specific properties
      'tagteam:dimension': dimension,
      'tagteam:category': meta.category,
      'tagteam:score': this._roundConfidence(score),

      // Confidence (simpler for context assessment - single score)
      'tagteam:aggregateConfidence': this._roundConfidence(score),
      'tagteam:aggregationMethod': 'direct_score',

      // Metadata
      'tagteam:instantiated_at': new Date().toISOString()
    };
  }

  /**
   * Generate deterministic IRI
   *
   * @param {string} text - Text for IRI
   * @param {string} type - Type label
   * @param {number} index - Index for uniqueness
   * @returns {string} IRI
   * @private
   */
  _generateIRI(text, type, index) {
    const hash = crypto
      .createHash('sha256')
      .update(`${text}|${type}|${index}|${Date.now()}`)
      .digest('hex')
      .substring(0, 12);

    const cleanText = text
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_]/g, '')
      .substring(0, 20);

    return `${this.options.namespace}:${cleanText}_${type}_${hash}`;
  }

  /**
   * Round confidence to 2 decimal places
   *
   * @param {number} value - Confidence value
   * @returns {number} Rounded value
   * @private
   */
  _roundConfidence(value) {
    return Math.round(value * 100) / 100;
  }

  /**
   * Set the graph builder
   *
   * @param {Object} graphBuilder - SemanticGraphBuilder instance
   */
  setGraphBuilder(graphBuilder) {
    this.graphBuilder = graphBuilder;
  }
}



  // ============================================================================
  // IEE GRAPH BUILDER
  // ============================================================================

  class IEEGraphBuilder {
    constructor(options = {}) {
      this.options = options;

      // Initialize value analyzer components
      this.contextAnalyzer = new ContextAnalyzer(options.contextPatterns);
      this.valueMatcher = new ValueMatcher(options.valueDefinitions || VALUE_DEFINITIONS);
      this.valueScorer = new ValueScorer({
        frameBoosts: options.frameBoosts || FRAME_VALUE_BOOSTS,
        conflictPairs: options.conflictPairs || CONFLICT_PAIRS
      });
      this.ethicalProfiler = new EthicalProfiler(options.conflictPairs || CONFLICT_PAIRS);
      this.assertionBuilder = new AssertionEventBuilder(options);

      // Create core builder with assertion builder injected
      this.coreBuilder = new TagTeam.SemanticGraphBuilder({
        ...options,
        assertionBuilder: this.assertionBuilder
      });
    }

    build(text, options = {}) {
      const buildOptions = { ...this.options, ...options };

      // Analyze values
      const patternMatcher = new PatternMatcher();
      const taggedWords = patternMatcher.nlp ? patternMatcher.nlp(text).terms().json() : [];

      const contextIntensity = this.contextAnalyzer.analyzeContext(text, taggedWords, null, null);
      const flatContext = this._flattenContext(contextIntensity);

      const matchedValues = this.valueMatcher.matchValues(text, taggedWords);
      const scoredValues = this.valueScorer.scoreValues(
        matchedValues, null, [], VALUE_DEFINITIONS.values || VALUE_DEFINITIONS
      );

      // Build graph with values
      return this.coreBuilder.build(text, {
        ...buildOptions,
        scoredValues,
        contextIntensity: flatContext
      });
    }

    _flattenContext(ctx) {
      const flat = {};
      for (const cat of Object.keys(ctx)) {
        if (typeof ctx[cat] === 'object') {
          for (const [dim, score] of Object.entries(ctx[cat])) {
            flat[dim] = score;
          }
        }
      }
      return flat;
    }

    analyzeValues(text) {
      const patternMatcher = new PatternMatcher();
      const taggedWords = patternMatcher.nlp ? patternMatcher.nlp(text).terms().json() : [];

      const contextIntensity = this.contextAnalyzer.analyzeContext(text, taggedWords, null, null);
      const matchedValues = this.valueMatcher.matchValues(text, taggedWords);
      const scoredValues = this.valueScorer.scoreValues(
        matchedValues, null, [], VALUE_DEFINITIONS.values || VALUE_DEFINITIONS
      );
      const profile = this.ethicalProfiler.generateProfile(scoredValues);

      return {
        scoredValues,
        contextIntensity,
        conflicts: profile.conflicts || [],
        profile
      };
    }
  }

  // ============================================================================
  // VALUES API
  // ============================================================================

  const TagTeamValues = {
    // Main entry point
    IEEGraphBuilder,

    // Analyzers
    ContextAnalyzer,
    ValueMatcher,
    ValueScorer,
    EthicalProfiler,

    // Graph components
    AssertionEventBuilder,

    // Data
    VALUE_DEFINITIONS,
    FRAME_VALUE_BOOSTS,
    CONFLICT_PAIRS,

    // Version
    version: '1.0.0'
  };

  return TagTeamValues;
});
