/**
 * EntityExtractor.js
 *
 * Extracts entities from text using Compromise NLP and creates
 * tagteam:DiscourseReferent nodes for the semantic graph.
 *
 * Phase 4 Two-Tier Architecture (v2.2 spec):
 * - Creates Tier 1 DiscourseReferent nodes
 * - Integrates with RealWorldEntityFactory for Tier 2 entities
 * - Links Tier 1 → Tier 2 via cco:is_about
 *
 * @module graph/EntityExtractor
 * @version 4.0.0-phase4
 */

const nlp = require('compromise');
const RealWorldEntityFactory = require('./RealWorldEntityFactory');

// V7-012 Phase 1: Custom NP chunking to replace Compromise
const POSTagger = require('../core/POSTagger');
const Tokenizer = require('./Tokenizer');
const NPChunker = require('./NPChunker');

/**
 * Scarcity markers that indicate limited resources
 */
const SCARCITY_MARKERS = [
  'last', 'only', 'sole', 'single', 'remaining', 'final',
  'scarce', 'limited', 'rare', 'few', 'shortage', 'deficit'
];

/**
 * Quantity words mapped to numeric values
 */
const QUANTITY_WORDS = {
  'one': 1, 'a': 1, 'an': 1, 'single': 1, 'sole': 1,
  'two': 2, 'both': 2, 'pair': 2, 'couple': 2,
  'three': 3, 'four': 4, 'five': 5, 'six': 6,
  'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
  'several': 3, 'few': 2, 'many': 10, 'multiple': 3
};

/**
 * Temporal unit words — when the last word of a noun phrase is one of these,
 * and a quantity/number precedes it, the entity is a Temporal Region (BFO:0000038).
 */
const TEMPORAL_UNITS = {
  'day': 'day', 'days': 'day',
  'week': 'week', 'weeks': 'week',
  'month': 'month', 'months': 'month',
  'year': 'year', 'years': 'year',
  'hour': 'hour', 'hours': 'hour',
  'minute': 'minute', 'minutes': 'minute',
  'second': 'second', 'seconds': 'second'
};

/**
 * Words that indicate clause boundaries - stop searching for determiners past these
 */
const CLAUSE_BOUNDARY_WORDS = new Set([
  'and', 'or', 'but', 'because', 'although', 'while', 'when', 'if', 'unless',
  'that', 'which', 'who', 'whom', 'whose', 'where', 'how', 'why',
  'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'has', 'have', 'had', 'do', 'does', 'did',
  'can', 'could', 'will', 'would', 'shall', 'should', 'may', 'might', 'must'
]);

/**
 * Relative temporal expressions — standalone words/phrases that denote
 * a temporal region without an explicit quantity.
 */
const RELATIVE_TEMPORAL_TERMS = [
  'yesterday', 'today', 'tomorrow',
  'recently', 'previously', 'currently',
  'now', 'then', 'earlier', 'later',
  'overnight', 'midday', 'midnight',
  // Days of the week
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
];

/**
 * Relative temporal phrase prefixes — when combined with a temporal unit
 * (e.g., "last week", "next month"), denote an unspecified temporal region.
 */
const RELATIVE_TEMPORAL_PREFIXES = ['last', 'next', 'past', 'previous', 'this', 'coming'];

/**
 * v2 Phase 0: Wh-word pseudo-entities
 * Maps Wh-words to BFO/CCO types for interrogative entity recognition.
 * These are recognized as entities when v2 normalizes Wh-questions into SVO order.
 */
const WH_PSEUDO_ENTITIES = {
  'who':   { type: 'cco:Person', definiteness: 'interrogative' },
  'whom':  { type: 'cco:Person', definiteness: 'interrogative' },
  'what':  { type: 'bfo:Entity', definiteness: 'interrogative' },
  'which': { type: 'bfo:Entity', definiteness: 'interrogative_selective' },
  'where': { type: 'bfo:Site', definiteness: 'interrogative' },
  'when':  { type: 'bfo:TemporalRegion', definiteness: 'interrogative' }
};

/**
 * Symptom and physiological quality terms.
 * These are BFO Qualities (bfo:BFO_0000019) that inhere in material entities,
 * NOT artifacts. Extensible — add domain terms as needed.
 *
 * Single-word terms are matched against rootNoun.
 * Multi-word terms are matched against the full noun phrase.
 */
const SYMPTOM_SINGLE_WORDS = new Set([
  // Pain
  'pain', 'ache', 'headache', 'migraine', 'soreness',
  // Respiratory
  'cough', 'wheeze', 'congestion', 'dyspnea',
  // Systemic
  'fever', 'chills', 'fatigue', 'malaise', 'weakness', 'lethargy',
  // Gastrointestinal
  'nausea', 'vomiting', 'diarrhea', 'constipation', 'bloating',
  // Neurological
  'dizziness', 'vertigo', 'numbness', 'tingling', 'tremor', 'seizure',
  // Dermatological
  'rash', 'itching', 'hives', 'swelling', 'bruising',
  // Cardiovascular
  'palpitations', 'tachycardia', 'bradycardia', 'hypertension', 'hypotension',
  // Other
  'bleeding', 'inflammation', 'infection', 'edema', 'insomnia',
  'anxiety', 'depression', 'stress', 'confusion', 'delirium',
]);

/**
 * Disease terms — these are Dispositions (bfo:BFO_0000016) per OGMS/BFO,
 * NOT Qualities. Diseases are predispositions to undergo pathological processes.
 */
const DISEASE_TERMS = new Set([
  'diabetes', 'asthma', 'pneumonia', 'bronchitis', 'anemia',
  'arthritis', 'epilepsy', 'cancer', 'stroke',
  'hypertension', 'infection', 'disease', 'disorder', 'syndrome',
  'condition', 'illness', 'malaria', 'tuberculosis', 'hepatitis',
  'meningitis', 'influenza', 'measles', 'mumps', 'cholera',
  'leukemia', 'lymphoma', 'dementia', 'alzheimer', 'parkinson',
  'cirrhosis', 'fibrosis', 'sepsis', 'gangrene'
]);

/**
 * ENH-001: Cognitive verbs — verbs that typically take ICE as direct object.
 * When these verbs govern an ambiguous noun (design, report, data), the noun
 * should be refined to InformationContentEntity.
 */
const COGNITIVE_VERBS = new Set([
  // Reading/comprehension
  'read', 'study', 'review', 'examine', 'analyze', 'analyse',
  'inspect', 'scrutinize', 'peruse', 'scan', 'skim',
  // Evaluation/assessment
  'evaluate', 'assess', 'appraise', 'critique', 'judge',
  // Understanding/interpretation
  'understand', 'comprehend', 'interpret', 'parse', 'decode',
  // Discussion/communication about content
  'discuss', 'present', 'explain', 'summarize', 'describe'
]);

/**
 * ENH-001: Physical verbs — verbs that typically involve physical manipulation.
 * When these verbs govern an ambiguous noun, the noun should remain Artifact.
 */
const PHYSICAL_VERBS = new Set([
  // Creation/construction
  'build', 'construct', 'assemble', 'create', 'make', 'produce',
  // Movement/transport
  'carry', 'move', 'transport', 'lift', 'push', 'pull', 'drag',
  'deliver', 'ship', 'mail', 'send',  // physical sending
  // Physical manipulation
  'cut', 'fold', 'tear', 'shred', 'bind', 'staple', 'laminate',
  'print', 'copy', 'scan',  // physical document operations
  // Storage
  'store', 'file', 'archive', 'shelve', 'stack'
]);

/**
 * ENH-001: Ambiguous nouns that can denote either ICE or Artifact.
 * These nouns are refinable based on verb context.
 * "design" with "review" → ICE; "design" with "build" → Artifact
 */
const AMBIGUOUS_OBJECT_NOUNS = new Set([
  'design', 'report', 'document', 'record', 'file', 'form',
  'plan', 'blueprint', 'specification', 'specifications', 'spec', 'specs',
  'proposal', 'draft', 'manuscript', 'paper', 'article',
  'data', 'information', 'content', 'material', 'materials',
  'chart', 'graph', 'diagram', 'schematic', 'drawing',
  'contract', 'agreement', 'policy', 'procedure', 'manual',
  'guide', 'handbook', 'instructions', 'guidelines'
]);

/**
 * Evaluative quality terms — nouns that denote judgments, assessments, or
 * evaluative qualities of events/entities. These are BFO Qualities (bfo:BFO_0000019)
 * because they describe an attribute/status of something, not a physical object.
 * "The launch was a disaster" → "disaster" is a quality predicated of "launch".
 */
const EVALUATIVE_QUALITY_TERMS = new Set([
  'disaster', 'catastrophe', 'calamity', 'fiasco', 'debacle',
  'success', 'failure', 'triumph', 'victory', 'defeat',
  'miracle', 'tragedy', 'achievement', 'accomplishment',
  'masterpiece', 'mess', 'blunder', 'mistake', 'error',
  'breakthrough', 'setback', 'improvement', 'decline',
  'crisis', 'emergency', 'priority', 'necessity',
  // Measurable abstract qualities (economic, functional)
  'demand', 'supply', 'cost', 'price', 'value', 'risk',
  'quality', 'efficiency', 'productivity', 'performance',
  'growth', 'revenue', 'profit', 'loss', 'rate', 'level',
  'speed', 'volume', 'frequency', 'intensity', 'severity',
  // V7-006: Physical/technical qualities
  'power', 'energy', 'capacity', 'memory', 'storage', 'bandwidth',
  'temperature', 'pressure', 'weight', 'size', 'length', 'width', 'height'
]);

/**
 * Disposition/capability terms — these are Dispositions (bfo:BFO_0000016)
 * or Realizable Entities. They represent potentials, not physical objects.
 */
const DISPOSITION_TERMS = new Set([
  'capacity', 'capability', 'ability', 'potential', 'tendency',
  'propensity', 'susceptibility', 'vulnerability', 'resistance',
  'competence', 'skill', 'talent', 'aptitude', 'readiness',
  'liability', 'predisposition', 'inclination'
]);

/**
 * Multi-word symptom phrases matched against the full noun text.
 */
const SYMPTOM_PHRASES = [
  'chest pain', 'back pain', 'abdominal pain', 'joint pain', 'muscle pain',
  'sore throat', 'runny nose', 'shortness of breath',
  'loss of appetite', 'loss of consciousness', 'difficulty breathing',
  'blood pressure', 'heart rate', 'blood sugar',
  'weight loss', 'weight gain', 'night sweats', 'cold sweats',
  'blurred vision', 'double vision', 'hearing loss',
  'mental health', 'mood changes', 'panic attack'
];

/**
 * Adjective modifiers that do NOT change a symptom into a non-symptom.
 * "persistent cough" is still a symptom. "cough medicine" is not.
 */
const SYMPTOM_ADJECTIVE_MODIFIERS = new Set([
  'persistent', 'chronic', 'acute', 'severe', 'mild', 'moderate',
  'intermittent', 'constant', 'recurrent', 'sudden', 'gradual',
  'worsening', 'improving', 'unexplained', 'possible'
]);

/**
 * Entity type mappings to CCO/BFO types (for denotesType property)
 */
const ENTITY_TYPE_MAPPINGS = {
  // Persons/Roles (Medical)
  'doctor': 'cco:Person',
  'physician': 'cco:Person',
  'surgeon': 'cco:Person',
  'nurse': 'cco:Person',
  'patient': 'cco:Person',
  'therapist': 'cco:Person',
  'pharmacist': 'cco:Person',
  'paramedic': 'cco:Person',
  'family': 'cco:GroupOfPersons',
  'person': 'cco:Person',
  'man': 'cco:Person',
  'woman': 'cco:Person',
  'child': 'cco:Person',
  'parent': 'cco:Person',
  'mother': 'cco:Person',
  'father': 'cco:Person',
  // Professional/occupational roles (the person bearing the role)
  'engineer': 'cco:Person',
  'teacher': 'cco:Person',
  'lawyer': 'cco:Person',
  'architect': 'cco:Person',
  'scientist': 'cco:Person',
  'researcher': 'cco:Person',
  'analyst': 'cco:Person',
  'manager': 'cco:Person',
  'director': 'cco:Person',
  'officer': 'cco:Person',
  'agent': 'cco:Person',
  'inspector': 'cco:Person',
  'technician': 'cco:Person',
  'programmer': 'cco:Person',
  'developer': 'cco:Person',
  'designer': 'cco:Person',
  'consultant': 'cco:Person',
  'administrator': 'cco:Person',
  'admin': 'cco:Person',  // V7-006: Common abbreviation
  'supervisor': 'cco:Person',
  'coordinator': 'cco:Person',
  'specialist': 'cco:Person',
  'professor': 'cco:Person',
  'student': 'cco:Person',
  'worker': 'cco:Person',
  'employee': 'cco:Person',
  'staff': 'cco:Person',
  'member': 'cco:Person',
  'user': 'cco:Person',
  'client': 'cco:Person',
  'customer': 'cco:Person',
  'owner': 'cco:Person',
  'author': 'cco:Person',
  'editor': 'cco:Person',
  'reviewer': 'cco:Person',
  'auditor': 'cco:Person',
  'judge': 'cco:Person',
  'witness': 'cco:Person',
  'suspect': 'cco:Person',
  'victim': 'cco:Person',
  'soldier': 'cco:Person',
  'pilot': 'cco:Person',
  'driver': 'cco:Person',
  'chef': 'cco:Person',
  'artist': 'cco:Person',
  'musician': 'cco:Person',
  'athlete': 'cco:Person',
  'guard': 'cco:Person',

  // Medical Equipment/Artifacts (physical objects)
  'ventilator': 'cco:Artifact',
  'medication': 'cco:Artifact',
  'drug': 'cco:Artifact',
  'medicine': 'cco:Artifact',
  'equipment': 'cco:Artifact',
  'bed': 'cco:Artifact',
  'resource': 'cco:Artifact',
  'organ': 'cco:BodyPart',

  // V7-006: Technical/IT artifacts
  'server': 'cco:Artifact',
  'database': 'cco:Artifact',
  'system': 'cco:Artifact',
  'application': 'cco:Artifact',
  'patch': 'cco:Artifact',
  'bug': 'cco:Artifact',
  'alert': 'cco:InformationContentEntity',
  'log': 'cco:InformationContentEntity',
  'credential': 'cco:InformationContentEntity',
  'data': 'cco:InformationContentEntity',
  'configuration': 'cco:InformationContentEntity',
  'feature': 'cco:Artifact',

  // V7-Priority5: Software/hardware product names → cco:Artifact
  // Case-insensitive matching handles "Windows", "windows", etc.
  'windows': 'cco:Artifact',
  'linux': 'cco:Artifact',
  'macos': 'cco:Artifact',
  'ios': 'cco:Artifact',
  'android': 'cco:Artifact',
  'chrome': 'cco:Artifact',
  'firefox': 'cco:Artifact',
  'safari': 'cco:Artifact',
  'edge': 'cco:Artifact',

  // V7-006: Facilities and locations
  'datacenter': 'cco:Facility',
  'facility': 'cco:Facility',
  'building': 'cco:Facility',
  'office': 'cco:Facility',

  // V7-Priority4: Abstract nouns → bfo:Quality (BFO specifically dependent continuants)
  // Qualities inhere in material entities but are not material themselves
  'power': 'bfo:Quality',
  'memory': 'bfo:Quality',
  'speed': 'bfo:Quality',
  'temperature': 'bfo:Quality',
  'pressure': 'bfo:Quality',
  'weight': 'bfo:Quality',
  'size': 'bfo:Quality',
  'color': 'bfo:Quality',
  'brightness': 'bfo:Quality',
  'capacity': 'bfo:Quality',
  'bandwidth': 'bfo:Quality',
  'latency': 'bfo:Quality',

  // Default
  '_default': 'bfo:BFO_0000040' // Material Entity
};

/**
 * Pronoun → BFO/CCO type mappings (IEE realist specification)
 *
 * Pronouns carry selectional presuppositions about their antecedent's ontological category:
 * - he/she/him/her/his → cco:Person (gendered personal pronouns presuppose person)
 * - I/me/my/we/us/our → cco:Person (1st person always human)
 * - you/your → cco:Person (2nd person always human)
 * - they/them/their → bfo:BFO_0000027 (Object Aggregate) when plural,
 *                      cco:Person when singular (context-dependent; default plural)
 * - it/its → bfo:BFO_0000004 (Independent Continuant — could be anything non-person)
 * - this/that/these/those → bfo:BFO_0000001 (Entity — maximally general demonstrative)
 */
const PRONOUN_TYPE_MAPPINGS = {
  // Gendered personal → Person
  'he': 'cco:Person',
  'she': 'cco:Person',
  'him': 'cco:Person',
  'her': 'cco:Person',
  'his': 'cco:Person',
  'himself': 'cco:Person',
  'herself': 'cco:Person',

  // 1st person → Person
  'i': 'cco:Person',
  'me': 'cco:Person',
  'my': 'cco:Person',
  'myself': 'cco:Person',
  'we': 'cco:Person',
  'us': 'cco:Person',
  'our': 'cco:Person',
  'ourselves': 'cco:Person',

  // 2nd person → Person
  'you': 'cco:Person',
  'your': 'cco:Person',
  'yourself': 'cco:Person',
  'yourselves': 'cco:Person',

  // 3rd person plural → Object Aggregate (group)
  'they': 'bfo:BFO_0000027',
  'them': 'bfo:BFO_0000027',
  'their': 'bfo:BFO_0000027',
  'themselves': 'bfo:BFO_0000027',

  // 3rd person neuter → Independent Continuant (non-person)
  'it': 'bfo:BFO_0000004',
  'its': 'bfo:BFO_0000004',
  'itself': 'bfo:BFO_0000004',

  // Demonstratives → Entity (maximally general)
  'this': 'bfo:BFO_0000001',
  'that': 'bfo:BFO_0000001',
  'these': 'bfo:BFO_0000001',
  'those': 'bfo:BFO_0000001'
};

/**
 * Domain-neutral ontological vocabulary
 *
 * These are universally applicable terms that map to BFO/CCO types without
 * requiring domain-specific configuration. They represent the core vocabulary
 * that TagTeam recognizes in any domain.
 *
 * Based on ONTOLOGICAL_ISSUES_2026_01_19.md v3.1 analysis.
 */
const ONTOLOGICAL_VOCABULARY = {
  // Occurrents (processes/events)
  'process': 'bfo:BFO_0000015',
  'event': 'bfo:BFO_0000015',
  'activity': 'bfo:BFO_0000015',
  'action': 'bfo:BFO_0000015',
  'service': 'bfo:BFO_0000015',      // Generic service (domain config specializes)
  'assistance': 'bfo:BFO_0000015',
  'intervention': 'bfo:BFO_0000015',
  // Zero-derivation nominalizations (verb→noun without suffix)
  'launch': 'bfo:BFO_0000015',
  'attack': 'bfo:BFO_0000015',
  'attempt': 'bfo:BFO_0000015',
  'collapse': 'bfo:BFO_0000015',
  'crash': 'bfo:BFO_0000015',
  'escape': 'bfo:BFO_0000015',
  'fight': 'bfo:BFO_0000015',
  'release': 'bfo:BFO_0000015',
  'search': 'bfo:BFO_0000015',
  'strike': 'bfo:BFO_0000015',
  'struggle': 'bfo:BFO_0000015',
  'surge': 'bfo:BFO_0000015',

  // Independent Continuants (objects)
  'person': 'cco:Person',
  'people': 'cco:Person',
  'human': 'cco:Person',
  'individual': 'cco:Person',
  'thing': 'bfo:BFO_0000040',
  'object': 'bfo:BFO_0000040',
  'item': 'bfo:BFO_0000040',
  'artifact': 'cco:Artifact',
  'device': 'cco:Artifact',
  'tool': 'cco:Artifact',
  'machine': 'cco:Artifact',

  // Generically Dependent Continuants (information entities)
  'document': 'bfo:BFO_0000031',
  'information': 'bfo:BFO_0000031',
  'data': 'bfo:BFO_0000031',
  'plan': 'bfo:BFO_0000031',
  'record': 'bfo:BFO_0000031',
  'report': 'bfo:BFO_0000031',

  // Information Content Entities (abstract propositional content)
  'fact': 'cco:InformationContentEntity',
  'idea': 'cco:InformationContentEntity',
  'proposal': 'cco:InformationContentEntity',
  'theory': 'cco:InformationContentEntity',
  'claim': 'cco:InformationContentEntity',
  'belief': 'cco:InformationContentEntity',
  'assumption': 'cco:InformationContentEntity',
  'hypothesis': 'cco:InformationContentEntity',
  'conclusion': 'cco:InformationContentEntity',
  'finding': 'cco:InformationContentEntity',
  'observation': 'cco:InformationContentEntity',
  'opinion': 'cco:InformationContentEntity',
  'reason': 'cco:InformationContentEntity',
  'evidence': 'cco:InformationContentEntity',
  'truth': 'cco:InformationContentEntity',
  'notion': 'cco:InformationContentEntity',
  'discrepancy': 'cco:InformationContentEntity',
  'error': 'cco:InformationContentEntity',
  'difference': 'cco:InformationContentEntity',
  'inconsistency': 'cco:InformationContentEntity',
  'anomaly': 'cco:InformationContentEntity',
  'variance': 'cco:InformationContentEntity'
};

/**
 * Domain-specific process root words - DEPRECATED, will move to config in Phase 2
 *
 * TECHNICAL DEBT (TD-001): These medical-specific terms should be loaded from
 * config/medical.json instead of being hardcoded in core. Until Phase 2 is
 * complete, they remain here for backward compatibility.
 *
 * After Phase 2: This constant will be removed and replaced by DomainConfigLoader.
 */
const DOMAIN_PROCESS_WORDS = {
  // Medical services - TO BE MOVED TO config/medical.json
  'care': 'cco:ActOfCare',
  'treatment': 'cco:ActOfMedicalTreatment',
  'therapy': 'cco:ActOfMedicalTreatment',
  'surgery': 'cco:ActOfSurgery',
  'procedure': 'cco:ActOfMedicalProcedure',
  'examination': 'cco:ActOfExamination',
  'diagnosis': 'cco:ActOfDiagnosis',
  'consultation': 'cco:ActOfCommunication',
  'counseling': 'cco:ActOfCommunication',
  'rehabilitation': 'cco:ActOfRehabilitation',
  'resuscitation': 'cco:ActOfResuscitation'
};

/**
 * Nominalization suffixes that often indicate processes/events
 * Words ending in these are candidates for process detection
 */
const PROCESS_SUFFIXES = ['-tion', '-ment', '-ing', '-sis', '-ance', '-ence', '-ure', '-ery'];

/**
 * Physical/concrete object indicators - terms that suggest a material entity
 * When these are present, prefer Artifact classification
 */
const PHYSICAL_OBJECT_INDICATORS = [
  'machine', 'device', 'unit', 'bed', 'monitor', 'pump', 'tube', 'needle',
  'pill', 'tablet', 'bottle', 'bag', 'mask', 'gown', 'glove'
];

/**
 * Result noun exceptions - nominalizations ending in process suffixes that
 * ALWAYS denote products/entities rather than processes.
 *
 * These are NOT ambiguous - they are ALWAYS result nouns regardless of context.
 * "The medication" and "some medication" both refer to the drug, not a process.
 *
 * Based on ONTOLOGICAL_ISSUES_2026_01_19.md v3.1 analysis:
 * - ~30-40% of -tion words are result nouns, not process nouns
 * - These should be classified as Independent Continuants (IC) or GDC
 */
const UNAMBIGUOUS_RESULT_NOUNS = {
  // Physical products (IC - Artifact) - always the product, never the process
  'medication': 'cco:Artifact',
  'publication': 'cco:Artifact',
  'invention': 'cco:Artifact',
  'decoration': 'cco:Artifact',
  'illustration': 'cco:Artifact',
  'equipment': 'cco:Artifact',       // Physical tools/devices
  'instrument': 'cco:Artifact',      // Medical/scientific instrument
  'garment': 'cco:Artifact',         // Clothing item
  'pavement': 'cco:Artifact',        // Physical surface
  'monument': 'cco:Artifact',        // Physical structure
  'compartment': 'cco:Artifact',     // Physical container/section

  // V7-006: Technical/IT result nouns (artifacts, not processes)
  'feature': 'cco:Artifact',         // Software feature (thing), not featuring (act)

  // Documents (GDC) - always the document, never the process
  'documentation': 'bfo:BFO_0000031',
  'registration': 'bfo:BFO_0000031',
  'certification': 'bfo:BFO_0000031',
  'specification': 'bfo:BFO_0000031',
  'notification': 'bfo:BFO_0000031',
  'recommendation': 'bfo:BFO_0000031',
  'regulation': 'bfo:BFO_0000031',     // The rule document
  'legislation': 'bfo:BFO_0000031',

  // V7-006: IT information content entities (not processes)
  'configuration': 'cco:InformationContentEntity',  // Config data, not configuring act

  // Locations (IC) - always the place, never the process
  'location': 'bfo:BFO_0000040',
  'station': 'bfo:BFO_0000040',
  'position': 'bfo:BFO_0000040'        // Spatial position
};

/**
 * Ambiguous nominalizations - can be either process OR entity depending on context.
 * These need determiner-sensitive disambiguation:
 * - "the organization" → entity (the company)
 * - "organization of files" → process (the act of organizing)
 *
 * Default to entity type shown, but process reading possible with "of X" complement
 * or indefinite/bare noun in certain contexts.
 *
 * Phase 5.3.1: Added committee, board, council for proper Organization typing
 * per stakeholder feedback (these are agent-capable social entities).
 */
const AMBIGUOUS_NOMINALIZATIONS = {
  // Can be organization (entity) or organizing (process)
  'organization': 'cco:Organization',
  'foundation': 'cco:Organization',
  'administration': 'cco:Organization',
  'association': 'cco:Organization',
  'corporation': 'cco:Organization',
  'institution': 'cco:Organization',

  // Phase 5.3.1: Collective decision-making bodies (always Organizations when agents)
  // These are social entities that can perform intentional acts
  'committee': 'cco:Organization',
  'board': 'cco:Organization',
  'council': 'cco:Organization',
  'commission': 'cco:Organization',
  'panel': 'cco:Organization',
  'team': 'cco:Organization',

  // Can be software (entity) or applying (process)
  'application': 'cco:Artifact',

  // Can be the building (entity) or the act of building (process)
  'construction': 'cco:Artifact',
  'creation': 'cco:Artifact',
  'production': 'cco:Artifact',
  'installation': 'cco:Artifact'
};

/**
 * Combined result noun exceptions for backward compatibility
 * Used by _checkForProcessType to override suffix detection
 */
const RESULT_NOUN_EXCEPTIONS = {
  ...UNAMBIGUOUS_RESULT_NOUNS,
  ...AMBIGUOUS_NOMINALIZATIONS
};

/**
 * EntityExtractor class - extracts entities and creates DiscourseReferent nodes
 *
 * Two-Tier Architecture:
 * - Creates Tier 1 DiscourseReferent nodes from text
 * - Optionally creates Tier 2 Person/Artifact entities via RealWorldEntityFactory
 * - Links Tier 1 → Tier 2 via cco:is_about
 */
class EntityExtractor {
  /**
   * Create a new EntityExtractor
   * @param {Object} options - Configuration options
   * @param {Object} [options.graphBuilder] - SemanticGraphBuilder instance for IRI generation
   * @param {boolean} [options.createTier2=true] - Whether to create Tier 2 entities
   * @param {string} [options.documentIRI] - Document IRI for Tier 2 scoping
   */
  constructor(options = {}) {
    this.options = {
      createTier2: true,
      ...options
    };
    this.graphBuilder = options.graphBuilder || null;

    // Initialize RealWorldEntityFactory for Tier 2 creation
    this.tier2Factory = new RealWorldEntityFactory({
      graphBuilder: this.graphBuilder,
      documentIRI: options.documentIRI
    });
  }

  /**
   * Extract entities from text and return DiscourseReferent nodes
   *
   * Two-Tier Architecture (v2.2):
   * - Creates Tier 1 DiscourseReferent nodes
   * - Creates Tier 2 Person/Artifact entities (if createTier2 enabled)
   * - Links Tier 1 → Tier 2 via cco:is_about
   *
   * @param {string} text - Input text to analyze
   * @param {Object} [options] - Extraction options
   * @param {boolean} [options.createTier2] - Override Tier 2 creation setting
   * @param {string} [options.documentIRI] - Document IRI for Tier 2 scoping
   * @returns {Array<Object>} Array of nodes (Tier 1 referents + Tier 2 entities)
   *
   * @example
   * const extractor = new EntityExtractor();
   * const entities = extractor.extract("The doctor treats the patient");
   * // Returns array of DiscourseReferent nodes + cco:Person nodes
   */
  extract(text, options = {}) {
    const tier1Entities = [];

    // Update Tier 2 factory document IRI if provided
    if (options.documentIRI) {
      this.tier2Factory.setDocumentIRI(options.documentIRI);
    }

    // V7-012 Phase 1: Use custom NPChunker instead of Compromise
    // Feature flag: options.useNPChunker (default: true for Phase 1 testing)
    const useNPChunker = options.useNPChunker !== false;

    if (useNPChunker) {
      // NEW: Custom NP chunking with jsPOS
      return this._extractWithNPChunker(text, options, tier1Entities);
    }

    // FALLBACK: Original Compromise-based extraction
    // Parse with Compromise NLP
    const doc = nlp(text);

    // Extract nouns with their context
    const nouns = doc.nouns();

    nouns.forEach((noun, index) => {
      let nounText = noun.text();
      const nounJson = noun.json()[0] || {};
      const nounData = nounJson.noun || {};

      // V7-003: Trim trailing verbs from noun phrases to prevent absorption of verbs
      // e.g., "the system restarts" → "the system"
      nounText = this._trimTrailingVerbs(nounText);

      // Skip if trimming removed everything
      if (!nounText || nounText.trim().length === 0) {
        return;
      }

      // Get the root noun (without determiner/adjectives)
      const rootNoun = nounData.root || nounText;

      // Skip non-entity nouns (like "here", "there", etc.)
      if (this._isNonEntityNoun(rootNoun)) {
        return;
      }

      // V7-011: Detect possessive NP ("X's Y") and extract possessor as separate entity
      // Cambridge Grammar §5.4: Possessive constructions have both possessor and possessed
      const possessive = this._detectPossessiveNP(nounText, text);
      if (possessive.isPossessive) {
        // Extract possessor as separate entity ("the admin" from "the admin's credentials")
        const possessorOffset = this._getSpanOffset(text, possessive.possessor, 0);
        const possessorDoc = nlp(possessive.possessor);
        const possessorNounData = possessorDoc.nouns().json()[0]?.noun || {};
        const possessorRootNoun = possessorNounData.root || possessive.possessor;

        if (!this._isNonEntityNoun(possessorRootNoun)) {
          const possessorEntity = this._createEntityFromText(
            possessive.possessor,
            possessorRootNoun,
            possessorOffset,
            text,
            possessorDoc.nouns().first(),
            possessorNounData
          );
          possessorEntity['tagteam:isPossessor'] = true;
          tier1Entities.push(possessorEntity);
        }
        // Continue to extract full possessive phrase as well
      }

      // V7-011: Detect PP modifier ("X in Y") and extract PP object as separate entity
      // Cambridge Grammar §7.2: PP attachment creates hierarchical structure
      const ppModifier = this._detectPPModifier(nounText, text);
      if (ppModifier.hasPP) {
        // Extract PP object as separate entity ("the datacenter" from "the server in the datacenter")
        const ppObjectOffset = this._getSpanOffset(text, ppModifier.ppObject, 0);
        const ppObjectDoc = nlp(ppModifier.ppObject);
        const ppObjectNounData = ppObjectDoc.nouns().json()[0]?.noun || {};
        const ppObjectRootNoun = ppObjectNounData.root || ppModifier.ppObject;

        if (!this._isNonEntityNoun(ppObjectRootNoun)) {
          const ppObjectEntity = this._createEntityFromText(
            ppModifier.ppObject,
            ppObjectRootNoun,
            ppObjectOffset,
            text,
            ppObjectDoc.nouns().first(),
            ppObjectNounData
          );
          ppObjectEntity['tagteam:isPPObject'] = true;
          ppObjectEntity['tagteam:preposition'] = ppModifier.preposition;
          tier1Entities.push(ppObjectEntity);
        }
        // Continue to extract full phrase with PP as well
      }

      // V7-010: Detect and split coordinated noun phrases ("X and Y")
      // Penn Treebank coordination rules: NP conjunction creates separate entities
      const coordination = this._detectCoordination(nounText, text);
      if (coordination.isCoordinated) {
        // Process each conjunct as a separate entity
        coordination.conjuncts.forEach((conjunctText, conjunctIndex) => {
          const conjunctOffset = this._getSpanOffset(text, conjunctText, 0);

          // Extract root noun for conjunct
          const conjunctDoc = nlp(conjunctText);
          const conjunctNounData = conjunctDoc.nouns().json()[0]?.noun || {};
          const conjunctRootNoun = conjunctNounData.root || conjunctText;

          // Skip non-entity nouns
          if (this._isNonEntityNoun(conjunctRootNoun)) {
            return;
          }

          // Detect properties for this conjunct
          const introducingPrep = this._detectIntroducingPreposition(text, conjunctOffset);
          const defInfo = this._detectDefiniteness(nlp(conjunctText).nouns().first(), conjunctText, text, conjunctNounData);
          const scarcityInfo = this._detectScarcity(conjunctText, text, conjunctOffset, conjunctNounData);
          const quantityInfo = this._detectQuantity(conjunctText, text, conjunctOffset, conjunctNounData);

          const fullWords = conjunctText.toLowerCase().trim().split(/\s+/);
          const temporalType = this._checkForTemporalType(conjunctText.toLowerCase().trim(), fullWords);
          const symptomType = !temporalType
            ? this._checkForSymptomType(conjunctText.toLowerCase().trim(), conjunctRootNoun.toLowerCase().trim())
            : null;

          let entityType = temporalType || symptomType || this._determineEntityType(conjunctRootNoun, {
            fullText: text,
            definitenessInfo: defInfo
          });

          let typeRefinedBy = null;
          if (!temporalType && !symptomType) {
            const verbRefinement = this._refineTypeByVerbContext(conjunctRootNoun, text, conjunctOffset);
            if (verbRefinement.refinedType) {
              entityType = verbRefinement.refinedType;
              typeRefinedBy = verbRefinement.governingVerb;
            }
          }

          const temporalUnit = temporalType ? this._extractTemporalUnit(conjunctText) : null;
          const referentialStatus = this._determineReferentialStatus(defInfo, conjunctText, text, index);

          // Create separate entity for this conjunct
          const conjunctReferent = this._createDiscourseReferent({
            text: conjunctText,
            rootNoun: conjunctRootNoun,
            offset: conjunctOffset,
            entityType,
            definiteness: defInfo.definiteness,
            referentialStatus,
            scarcity: scarcityInfo,
            quantity: quantityInfo,
            temporalUnit: temporalUnit,
            typeRefinedBy: typeRefinedBy,
            introducingPreposition: introducingPrep
          });

          // Mark as part of coordination
          conjunctReferent['tagteam:isConjunct'] = true;
          conjunctReferent['tagteam:coordinationType'] = coordination.type;

          tier1Entities.push(conjunctReferent);
        });

        // Skip normal processing since we handled coordination
        return;
      }

      // Get span offset
      const offset = this._getSpanOffset(text, nounText, index);

      // ENH-015: Detect introducing preposition (for role assignment)
      const introducingPreposition = this._detectIntroducingPreposition(text, offset);

      // Use Compromise data for definiteness detection
      const definitenessInfo = this._detectDefiniteness(noun, nounText, text, nounData);

      // Detect scarcity from adjectives and context
      const scarcityInfo = this._detectScarcity(nounText, text, offset, nounData);

      // Detect quantity from Compromise and context
      const quantityInfo = this._detectQuantity(nounText, text, offset, nounData);

      // Check for temporal type using full noun phrase (needs quantity + unit together)
      const fullWords = nounText.toLowerCase().trim().split(/\s+/);
      const temporalType = this._checkForTemporalType(nounText.toLowerCase().trim(), fullWords);

      // V7-011c: Extract syntactic head noun for accurate type classification
      // For complex NPs (possessives, PP modifiers), Compromise's rootNoun is unreliable
      const headNoun = this._extractHeadNoun(nounText, rootNoun);

      // Check for symptom/quality type using full noun phrase AND head noun
      const symptomType = !temporalType
        ? this._checkForSymptomType(nounText.toLowerCase().trim(), headNoun)
        : null;

      // Determine entity type: temporal > symptom > standard matching
      // V7-011c: Use headNoun instead of rootNoun for accurate type classification
      let entityType = temporalType || symptomType || this._determineEntityType(headNoun, {
        fullText: text,
        definitenessInfo: definitenessInfo
      });

      // ENH-001: Verb-context refinement for ambiguous nouns
      // If the noun is ambiguous and governed by a cognitive/physical verb, refine type
      // V7-011c: Use headNoun for accurate refinement
      let typeRefinedBy = null;
      if (!temporalType && !symptomType) {
        const verbRefinement = this._refineTypeByVerbContext(headNoun, text, offset);
        if (verbRefinement.refinedType) {
          entityType = verbRefinement.refinedType;
          typeRefinedBy = verbRefinement.governingVerb;
        }
      }

      // Extract temporal unit if this is a temporal entity
      const temporalUnit = temporalType ? this._extractTemporalUnit(nounText) : null;

      // Determine referential status
      const referentialStatus = this._determineReferentialStatus(
        definitenessInfo,
        nounText,
        text,
        index
      );

      // Create DiscourseReferent node (use full noun phrase as label)
      const referent = this._createDiscourseReferent({
        text: nounText,
        rootNoun: rootNoun,
        offset,
        entityType,
        definiteness: definitenessInfo.definiteness,
        referentialStatus,
        scarcity: scarcityInfo,
        quantity: quantityInfo,
        temporalUnit: temporalUnit,
        typeRefinedBy: typeRefinedBy,  // ENH-001: record refining verb
        introducingPreposition: introducingPreposition  // ENH-015: preposition for role mapping
      });

      tier1Entities.push(referent);
    });

    // V7-007: Extract proper names using Compromise's specialized methods
    // This handles person names, organizations, and places more reliably than
    // capitalization heuristics, especially for sentence-initial names.
    this._extractProperNames(doc, text, tier1Entities);

    // V7-010: Extract pronouns (especially reflexives for Binding Theory)
    // Reflexive pronouns need to be extracted as entities for role assignment
    this._extractPronouns(doc, text, tier1Entities);

    // v2 Phase 0: Wh-word pseudo-entity extraction
    // Scans for Wh-words that Compromise NLP does not recognize as nouns.
    // Handles both standalone Wh-words ("who", "what") and Wh + noun phrases ("which report").
    // V7-004: Skip relativizers (who/whom/which/that after NPs) - they're not entities
    if (options.v2WhEntities !== false) {
      const words = text.toLowerCase().split(/\s+/);
      const relativizers = new Set(['who', 'whom', 'whose', 'which', 'that']);

      for (let i = 0; i < words.length; i++) {
        const cleanWord = words[i].replace(/[^a-z]/g, '');
        const whEntry = WH_PSEUDO_ENTITIES[cleanWord];
        if (!whEntry) continue;

        // V7-004: Skip if this is a relativizer (follows a noun phrase)
        // e.g., "The engineer who..." - "who" follows NP, so it's a relativizer, not interrogative
        if (relativizers.has(cleanWord) && this._isRelativizerContext(tier1Entities, text, i, words)) {
          continue;
        }

        // Build the full Wh-phrase: for "which", include the following noun
        let whPhraseText = words[i];
        let whPhraseType = whEntry.type;
        const rawOffset = text.toLowerCase().indexOf(words[i], i > 0 ? text.toLowerCase().indexOf(words[i - 1]) + words[i - 1].length : 0);

        if (cleanWord === 'which' && i + 1 < words.length) {
          // "which report" — include the head noun
          whPhraseText = words[i] + ' ' + words[i + 1];
        }

        // Check if this Wh-word is already captured by an existing entity
        const alreadyCaptured = tier1Entities.some(e => {
          const eText = (e['rdfs:label'] || '').toLowerCase();
          return eText.includes(cleanWord);
        });
        if (alreadyCaptured) continue;

        // Create DiscourseReferent for Wh-pseudo-entity
        const offset = rawOffset >= 0 ? rawOffset : 0;
        const referent = this._createDiscourseReferent({
          text: whPhraseText,
          rootNoun: cleanWord,
          offset,
          entityType: whPhraseType,
          definiteness: whEntry.definiteness,
          referentialStatus: 'interrogative',
          scarcity: { isScarce: false },
          quantity: { quantity: null },
          temporalUnit: null,
          typeRefinedBy: null,
          introducingPreposition: null
        });

        tier1Entities.push(referent);
      }
    }

    // Create Tier 2 entities and link via is_about (Two-Tier Architecture)
    const shouldCreateTier2 = options.createTier2 !== undefined
      ? options.createTier2
      : this.options.createTier2;

    if (shouldCreateTier2 && tier1Entities.length > 0) {
      const { tier2Entities, linkMap } = this.tier2Factory.createFromReferents(
        tier1Entities,
        { documentIRI: options.documentIRI }
      );

      // Add is_about links to Tier 1 referents
      const linkedReferents = this.tier2Factory.linkReferentsToTier2(tier1Entities, linkMap);

      // Return both Tier 1 (with is_about) and Tier 2 entities
      return [...linkedReferents, ...tier2Entities];
    }

    return tier1Entities;
  }

  /**
   * V7-007: Extract proper names using Compromise NLP's specialized methods.
   *
   * This handles person names, organizations, and places that may not be
   * detected as regular nouns, especially sentence-initial proper names where
   * capitalization doesn't distinguish "The server" from "John".
   *
   * @param {Object} doc - Compromise NLP document
   * @param {string} text - Full input text
   * @param {Array} tier1Entities - Array to add entities to (modified in place)
   */
  _extractProperNames(doc, text, tier1Entities) {
    // Extract person names
    const people = doc.people();
    people.forEach((person, index) => {
      const personText = person.text();

      // Skip if already extracted as noun
      const alreadyExtracted = tier1Entities.some(e => {
        const label = (e['rdfs:label'] || '').toLowerCase();
        return label === personText.toLowerCase() || label.includes(personText.toLowerCase());
      });
      if (alreadyExtracted) return;

      const offset = this._getSpanOffset(text, personText, index);

      const referent = this._createDiscourseReferent({
        text: personText,
        rootNoun: personText,
        offset,
        entityType: 'cco:Person',
        definiteness: 'definite',  // Proper names are inherently definite
        referentialStatus: 'introduced',
        scarcity: { isScarce: false },
        quantity: { quantity: null },
        temporalUnit: null,
        typeRefinedBy: null,
        introducingPreposition: null
      });

      tier1Entities.push(referent);
    });

    // Extract organizations
    const orgs = doc.organizations();
    orgs.forEach((org, index) => {
      const orgText = org.text();

      // Check if already extracted by NPChunker
      const existingEntity = tier1Entities.find(e => {
        const label = (e['rdfs:label'] || '').toLowerCase();
        return label === orgText.toLowerCase();
      });

      if (existingEntity) {
        // Update type if it was extracted by NPChunker with default type
        if (existingEntity['tagteam:denotesType'] === 'bfo:BFO_0000040') {
          existingEntity['tagteam:denotesType'] = 'cco:Organization';
          // Also update @type array
          const typeIndex = existingEntity['@type'].indexOf('bfo:BFO_0000040');
          if (typeIndex !== -1) {
            existingEntity['@type'][typeIndex] = 'cco:Organization';
          }
        }
        return;
      }

      const offset = this._getSpanOffset(text, orgText, index);

      const referent = this._createDiscourseReferent({
        text: orgText,
        rootNoun: orgText,
        offset,
        entityType: 'cco:Organization',
        definiteness: 'definite',
        referentialStatus: 'introduced',
        scarcity: { isScarce: false },
        quantity: { quantity: null },
        temporalUnit: null,
        typeRefinedBy: null,
        introducingPreposition: null
      });

      tier1Entities.push(referent);
    });

    // Extract places
    const places = doc.places();
    places.forEach((place, index) => {
      const placeText = place.text();

      // Check if already extracted by NPChunker
      const existingEntity = tier1Entities.find(e => {
        const label = (e['rdfs:label'] || '').toLowerCase();
        return label === placeText.toLowerCase();
      });

      if (existingEntity) {
        // Update type if it was extracted by NPChunker with default type
        if (existingEntity['tagteam:denotesType'] === 'bfo:BFO_0000040') {
          existingEntity['tagteam:denotesType'] = 'cco:GeopoliticalEntity';
          // Also update @type array
          const typeIndex = existingEntity['@type'].indexOf('bfo:BFO_0000040');
          if (typeIndex !== -1) {
            existingEntity['@type'][typeIndex] = 'cco:GeopoliticalEntity';
          }
        }
        return;
      }

      const offset = this._getSpanOffset(text, placeText, index);

      // Use GeopoliticalEntity for places (cities, countries, etc.)
      const referent = this._createDiscourseReferent({
        text: placeText,
        rootNoun: placeText,
        offset,
        entityType: 'cco:GeopoliticalEntity',
        definiteness: 'definite',
        referentialStatus: 'introduced',
        scarcity: { isScarce: false },
        quantity: { quantity: null },
        temporalUnit: null,
        typeRefinedBy: null,
        introducingPreposition: null
      });

      tier1Entities.push(referent);
    });

    // V7-007: Fallback - scan for capitalized words not yet extracted
    // This catches proper names that Compromise doesn't recognize
    this._extractCapitalizedWords(text, tier1Entities);

    // V7-007: Post-process - upgrade default-typed entities if they're capitalized proper names
    this._upgradeCapitalizedDefaultEntities(tier1Entities);
  }

  /**
   * V7-012 Phase 1: Extract entities using custom NPChunker instead of Compromise
   *
   * Replaces Compromise's unreliable .nouns() method with explicit, rule-based chunking:
   * - Uses jsPOS for POS tagging (more reliable than Compromise)
   * - Uses NPChunker for pattern-based NP extraction
   * - Correctly identifies head nouns for possessives and PP-modified NPs
   * - Still uses Compromise for proper names (.people(), .places(), .organizations())
   *
   * @param {string} text - Input text
   * @param {Object} options - Extraction options
   * @param {Array} tier1Entities - Entity array to populate
   * @returns {Array} tier1Entities + tier2Entities (if enabled)
   */
  _extractWithNPChunker(text, options, tier1Entities) {

    // Step 1: Tokenize
    const tokenizer = new Tokenizer();
    const words = tokenizer.tokenizeForPOS(text);

    // Step 2: POS tag with jsPOS
    const posTagger = new POSTagger();
    const tagged = posTagger.tag(words);

    // Step 2.5: Fix common ambiguous words that jsPOS mistags
    // jsPOS lexicon lists ambiguous words' most common sense first,
    // but context may require a different sense.
    // Also fixes missing function words (prepositions, determiners, conjunctions).
    const AMBIGUOUS_WORD_FIXES = {
      // Words that jsPOS lists as JJ first but are often nouns after determiners
      'alert': (word, tag, prevTag) => (prevTag === 'DT' && tag === 'JJ') ? 'NN' : tag,
      'access': (word, tag, prevTag) => (prevTag === 'DT' && tag === 'NN') ? 'NN' : tag,
      'change': (word, tag, prevTag) => (prevTag === 'DT' && tag === 'NN') ? 'NN' : tag,

      // Common prepositions (missing from jsPOS lexicon, default to NN)
      'for': (word, tag, prevTag) => 'IN',
      'with': (word, tag, prevTag) => 'IN',
      'on': (word, tag, prevTag) => 'IN',
      'in': (word, tag, prevTag) => 'IN',
      'at': (word, tag, prevTag) => 'IN',
      'from': (word, tag, prevTag) => 'IN',
      'to': (word, tag, prevTag) => 'IN',
      'into': (word, tag, prevTag) => 'IN',
      'onto': (word, tag, prevTag) => 'IN',
      'by': (word, tag, prevTag) => 'IN',
      'of': (word, tag, prevTag) => 'IN',

      // Common determiners (missing from jsPOS lexicon)
      'the': (word, tag, prevTag) => 'DT',
      'a': (word, tag, prevTag) => 'DT',
      'an': (word, tag, prevTag) => 'DT',

      // Coordinating conjunctions (missing from jsPOS lexicon)
      'and': (word, tag, prevTag) => 'CC',
      'or': (word, tag, prevTag) => 'CC'
    };

    for (let i = 0; i < tagged.length; i++) {
      const [word, tag] = tagged[i];
      const wordLower = word.toLowerCase();
      const prevTag = i > 0 ? tagged[i - 1][1] : null;

      if (AMBIGUOUS_WORD_FIXES[wordLower]) {
        const correctedTag = AMBIGUOUS_WORD_FIXES[wordLower](word, tag, prevTag);
        tagged[i] = [word, correctedTag];
      }
    }

    // Step 3: Chunk NPs
    const npChunker = new NPChunker();
    const chunks = npChunker.chunk(tagged);

    // Step 3.5: Detect coordination between adjacent chunks
    // If two chunks are separated by CC (and, or), mark them as coordinated
    const coordinationInfo = new Map(); // chunkIdx → {isConjunct: true, type: 'and'/'or'}

    for (let i = 0; i < chunks.length - 1; i++) {
      const currentChunk = chunks[i];
      const nextChunk = chunks[i + 1];

      // Check if there's a CC token between these chunks
      const betweenStart = currentChunk.endIndex + 1;
      const betweenEnd = nextChunk.startIndex - 1;

      if (betweenStart <= betweenEnd) {
        for (let j = betweenStart; j <= betweenEnd; j++) {
          if (tagged[j] && tagged[j][1] === 'CC') {
            const coordType = tagged[j][0].toLowerCase(); // 'and' or 'or'
            coordinationInfo.set(i, { isConjunct: true, type: coordType });
            coordinationInfo.set(i + 1, { isConjunct: true, type: coordType });
            break;
          }
        }
      }
    }

    // Step 4: Extract entities from NP chunks
    chunks.forEach((chunk, chunkIdx) => {

      // Extract component entities (possessor, PP object, full phrase)
      const components = npChunker.extractComponents(chunk);

      components.forEach((component, compIdx) => {

        // Skip temporal adverbs - these are temporal modifiers, not entities
        // BFO treats these as TemporalRegion annotations, not discourse referents
        const temporalAdverbs = new Set([
          'yesterday', 'today', 'tomorrow', 'now', 'then',
          'recently', 'lately', 'soon', 'earlier', 'later'
        ]);
        if (temporalAdverbs.has(component.text.toLowerCase())) {
          return;
        }

        // Skip if already extracted (avoid duplicates)
        const alreadyExtracted = tier1Entities.some(e => {
          const label = (e['rdfs:label'] || '').toLowerCase().trim();
          return label === component.text.toLowerCase().trim();
        });
        if (alreadyExtracted) {
          return;
        }

        // V7-010 (Phase 2): Check for coordination ("X and Y")
        const coordination = this._detectCoordination(component.text, text);
        if (coordination.isCoordinated) {
          // Split into separate conjunct entities
          coordination.conjuncts.forEach((conjunctText) => {
            // Skip if already extracted
            const conjunctAlreadyExtracted = tier1Entities.some(e => {
              const label = (e['rdfs:label'] || '').toLowerCase().trim();
              return label === conjunctText.toLowerCase().trim();
            });
            if (conjunctAlreadyExtracted) return;

            // Get head noun for conjunct (use simple extraction)
            const conjunctWords = conjunctText.trim().split(/\s+/);
            const conjunctHead = conjunctWords[conjunctWords.length - 1]; // Last word as head

            const conjunctType = this._determineEntityType(conjunctHead, {
              fullText: text,
              definitenessInfo: { definiteness: 'definite' }
            });

            const conjunctOffset = this._getSpanOffset(text, conjunctText, 0);

            const conjunctReferent = this._createDiscourseReferent({
              text: conjunctText,
              rootNoun: conjunctHead,
              offset: conjunctOffset,
              entityType: conjunctType,
              definiteness: 'definite',
              referentialStatus: 'introduced',
              scarcity: { isScarce: false },
              quantity: { quantity: null },
              temporalUnit: null,
              typeRefinedBy: null,
              introducingPreposition: component.properties['tagteam:preposition'] || null
            });

            // Mark as part of coordination
            conjunctReferent['tagteam:isConjunct'] = true;
            conjunctReferent['tagteam:coordinationType'] = coordination.type;

            tier1Entities.push(conjunctReferent);
          });

          // Skip normal processing since we handled coordination
          return;
        }

        // Determine entity type using head noun
        const entityType = this._determineEntityType(component.head, {
          fullText: text,
          definitenessInfo: { definiteness: 'definite' } // Simplified for Phase 1
        });

        // Get offset in original text
        const offset = this._getSpanOffset(text, component.text, 0);

        // Create DiscourseReferent
        const referent = this._createDiscourseReferent({
          text: component.text,
          rootNoun: component.head,
          offset,
          entityType,
          definiteness: 'definite', // Simplified for Phase 1
          referentialStatus: 'introduced',
          scarcity: { isScarce: false },
          quantity: { quantity: null },
          temporalUnit: null,
          typeRefinedBy: null,
          introducingPreposition: component.properties['tagteam:preposition'] || null
        });

        // Add component-specific properties
        Object.assign(referent, component.properties);

        // V7-010 (Phase 2): Mark as conjunct if part of coordination
        const coordInfo = coordinationInfo.get(chunkIdx);
        if (coordInfo) {
          referent['tagteam:isConjunct'] = true;
          referent['tagteam:coordinationType'] = coordInfo.type;
        }

        tier1Entities.push(referent);
      });
    });

    // Step 5: Still use Compromise for proper names (good at this)
    const doc = nlp(text);

    // Extract persons
    const people = doc.people();
    people.forEach((person, index) => {
      const personText = person.text();

      // Check if already extracted by NPChunker
      const existingEntity = tier1Entities.find(e => {
        const label = (e['rdfs:label'] || '').toLowerCase();
        return label === personText.toLowerCase();
      });

      if (existingEntity) {
        // Update type if it was extracted by NPChunker with default type
        if (existingEntity['tagteam:denotesType'] === 'bfo:BFO_0000040') {
          existingEntity['tagteam:denotesType'] = 'cco:Person';
          // Also update @type array
          const typeIndex = existingEntity['@type'].indexOf('bfo:BFO_0000040');
          if (typeIndex !== -1) {
            existingEntity['@type'][typeIndex] = 'cco:Person';
          }
        }
        return;
      }

      const offset = this._getSpanOffset(text, personText, index);

      const referent = this._createDiscourseReferent({
        text: personText,
        rootNoun: personText,
        offset,
        entityType: 'cco:Person',
        definiteness: 'definite',
        referentialStatus: 'introduced',
        scarcity: { isScarce: false },
        quantity: { quantity: null },
        temporalUnit: null,
        typeRefinedBy: null,
        introducingPreposition: null
      });

      tier1Entities.push(referent);
    });

    // Extract organizations
    const orgs = doc.organizations();
    orgs.forEach((org, index) => {
      const orgText = org.text();

      // Check if already extracted by NPChunker
      const existingEntity = tier1Entities.find(e => {
        const label = (e['rdfs:label'] || '').toLowerCase();
        return label === orgText.toLowerCase();
      });

      if (existingEntity) {
        // Update type if it was extracted by NPChunker with default type
        if (existingEntity['tagteam:denotesType'] === 'bfo:BFO_0000040') {
          existingEntity['tagteam:denotesType'] = 'cco:Organization';
          // Also update @type array
          const typeIndex = existingEntity['@type'].indexOf('bfo:BFO_0000040');
          if (typeIndex !== -1) {
            existingEntity['@type'][typeIndex] = 'cco:Organization';
          }
        }
        return;
      }

      const offset = this._getSpanOffset(text, orgText, index);

      const referent = this._createDiscourseReferent({
        text: orgText,
        rootNoun: orgText,
        offset,
        entityType: 'cco:Organization',
        definiteness: 'definite',
        referentialStatus: 'introduced',
        scarcity: { isScarce: false },
        quantity: { quantity: null },
        temporalUnit: null,
        typeRefinedBy: null,
        introducingPreposition: null
      });

      tier1Entities.push(referent);
    });

    // Extract places
    const places = doc.places();
    places.forEach((place, index) => {
      const placeText = place.text();

      // Check if already extracted by NPChunker
      const existingEntity = tier1Entities.find(e => {
        const label = (e['rdfs:label'] || '').toLowerCase();
        return label === placeText.toLowerCase();
      });

      if (existingEntity) {
        // Update type if it was extracted by NPChunker with default type
        if (existingEntity['tagteam:denotesType'] === 'bfo:BFO_0000040') {
          existingEntity['tagteam:denotesType'] = 'cco:GeopoliticalEntity';
          // Also update @type array
          const typeIndex = existingEntity['@type'].indexOf('bfo:BFO_0000040');
          if (typeIndex !== -1) {
            existingEntity['@type'][typeIndex] = 'cco:GeopoliticalEntity';
          }
        }
        return;
      }

      const offset = this._getSpanOffset(text, placeText, index);

      const referent = this._createDiscourseReferent({
        text: placeText,
        rootNoun: placeText,
        offset,
        entityType: 'cco:GeopoliticalEntity',
        definiteness: 'definite',
        referentialStatus: 'introduced',
        scarcity: { isScarce: false },
        quantity: { quantity: null },
        temporalUnit: null,
        typeRefinedBy: null,
        introducingPreposition: null
      });

      tier1Entities.push(referent);
    });

    // Extract pronouns (V7-010: reflexives)
    this._extractPronouns(doc, text, tier1Entities);

    // V7-Priority5: Filter out partial name fragments BEFORE tier2 processing
    // E.g., remove "Dr" and "Smith" when "Dr. Smith" exists
    // This handles title+name patterns where tokenization splits them
    tier1Entities = tier1Entities.filter(entity => {
      const entityText = (entity['rdfs:label'] || '').trim();

      // Check if this entity is a single-word fragment of a multi-word entity
      const entityWords = entityText.split(/\s+/);
      if (entityWords.length === 1) {
        // Single-word entity - check if it appears in a longer entity
        const isPartOfLonger = tier1Entities.some(other => {
          if (other === entity) return false;

          const otherText = (other['rdfs:label'] || '').trim();
          const otherWords = otherText.split(/\s+/);

          // Other must be longer (multi-word)
          if (otherWords.length <= 1) return false;

          // Check if our single word appears in the other entity's words
          // Match with or without punctuation (e.g., "Dr" matches "Dr.")
          return otherWords.some(word => {
            const cleanWord = word.replace(/[.,;:!?]/g, '');
            const cleanEntity = entityText.replace(/[.,;:!?]/g, '');
            return cleanWord.toLowerCase() === cleanEntity.toLowerCase();
          });
        });

        return !isPartOfLonger;
      }

      return true;
    });

    // V7-Priority6: Filter out appositive phrases
    // Pattern: "NP1, NP2," where NP2 provides additional info about NP1
    // E.g., "The engineer, a senior developer," → keep "The engineer", filter "a senior developer"
    tier1Entities = tier1Entities.filter(entity => {
      const entityText = (entity['rdfs:label'] || '').trim();

      // Check if this entity appears in the original text between commas (appositive pattern)
      // Look for pattern: ", <entity>," in the text
      const appositivePattern = new RegExp(`,\\s*${entityText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*,`, 'i');

      if (appositivePattern.test(text)) {
        // This entity appears between commas - likely an appositive
        // Check if there's another entity immediately before it (the head noun)
        const entityIndex = text.toLowerCase().indexOf(entityText.toLowerCase());

        // Look for the preceding entity
        const hasAntecedent = tier1Entities.some(other => {
          if (other === entity) return false;

          const otherText = (other['rdfs:label'] || '').trim();
          const otherIndex = text.toLowerCase().indexOf(otherText.toLowerCase());

          // Other entity should appear before this one
          if (otherIndex >= entityIndex) return false;

          // Check if they're separated by a comma (appositive structure)
          const between = text.substring(otherIndex + otherText.length, entityIndex);
          return /^\s*,\s*$/.test(between);
        });

        // If this entity is an appositive (has antecedent), filter it out
        return !hasAntecedent;
      }

      return true;
    });

    // Create Tier 2 entities and link via is_about (Two-Tier Architecture)
    const shouldCreateTier2 = options.createTier2 !== undefined
      ? options.createTier2
      : this.options.createTier2 !== false;


    if (shouldCreateTier2 && tier1Entities.length > 0) {
      const { tier2Entities, linkMap } = this.tier2Factory.createFromReferents(
        tier1Entities,
        { documentIRI: options.documentIRI }
      );


      // Add is_about links to Tier 1 referents
      const linkedReferents = this.tier2Factory.linkReferentsToTier2(tier1Entities, linkMap);

      const result = [...linkedReferents, ...tier2Entities];

      // Deduplicate by @id (linkReferentsToTier2 may create duplicates)
      const seen = new Set();
      const deduplicated = result.filter(entity => {
        if (seen.has(entity['@id'])) {
          return false;
        }
        seen.add(entity['@id']);
        return true;
      });

      // Return both Tier 1 (with is_about) and Tier 2 entities
      return deduplicated;
    }

    return tier1Entities;
  }

  /**
   * V7-011: Detect possessive NP structure ("X's Y" patterns).
   *
   * Linguistic Foundation: Cambridge Grammar §5.4 (possessive constructions)
   * - Possessive NP has both possessor and possessed
   * - "the admin's credentials" → possessor="the admin", possessed="credentials"
   * - Penn Treebank structure: [NP [NP X]'s [N Y]]
   *
   * @param {string} nounText - The noun phrase text
   * @param {string} fullText - Full input text for context
   * @returns {Object} {isPossessive: boolean, possessor: string, possessed: string}
   */
  _detectPossessiveNP(nounText, fullText) {
    // Possessive pattern: "X's" (possessor + 's)
    // Note: Compromise often splits "X's Y" into two nouns, so we detect just "X's"
    const possessivePattern = /^(.+?)'s$/i;
    const match = nounText.match(possessivePattern);

    if (!match) {
      return { isPossessive: false, possessor: null, possessed: null };
    }

    return {
      isPossessive: true,
      possessor: match[1].trim(),    // "the admin"
      possessed: null                 // Will be in next noun
    };
  }

  /**
   * V7-011: Detect PP modifier in noun phrases ("X in Y" patterns).
   *
   * Linguistic Foundation: Cambridge Grammar §7.2 (PP attachment)
   * - PP modifiers create hierarchical NP structure
   * - "the server in the datacenter" → head="the server", ppObject="the datacenter"
   * - High attachment: both head and PP object are separate entities
   *
   * @param {string} nounText - The noun phrase text
   * @param {string} fullText - Full input text for context
   * @returns {Object} {hasPP: boolean, head: string, preposition: string, ppObject: string}
   */
  _detectPPModifier(nounText, fullText) {
    // PP pattern: "X [PREP] Y" where PREP is locative/directional preposition
    const ppPattern = /^(.+?)\s+(in|on|at|from|to|into|onto|near|inside|outside|within)\s+(.+)$/i;
    const match = nounText.match(ppPattern);

    if (!match) {
      return { hasPP: false, head: null, preposition: null, ppObject: null };
    }

    return {
      hasPP: true,
      head: match[1].trim(),         // "the server"
      preposition: match[2].toLowerCase(),  // "in"
      ppObject: match[3].trim()      // "the datacenter"
    };
  }

  /**
   * V7-011: Helper method to create entity from text components.
   * Extracted from main noun processing loop to avoid code duplication.
   *
   * @param {string} entityText - The entity text
   * @param {string} rootNoun - The root noun
   * @param {number} offset - Text offset
   * @param {string} fullText - Full input text
   * @param {Object} nounObj - Compromise noun object
   * @param {Object} nounData - Noun data from Compromise
   * @returns {Object} DiscourseReferent entity
   */
  _createEntityFromText(entityText, rootNoun, offset, fullText, nounObj, nounData) {
    const introducingPrep = this._detectIntroducingPreposition(fullText, offset);
    const defInfo = this._detectDefiniteness(nounObj, entityText, fullText, nounData);
    const scarcityInfo = this._detectScarcity(entityText, fullText, offset, nounData);
    const quantityInfo = this._detectQuantity(entityText, fullText, offset, nounData);

    // V7-011c: Extract syntactic head noun for accurate type classification
    const headNoun = this._extractHeadNoun(entityText, rootNoun);

    const fullWords = entityText.toLowerCase().trim().split(/\s+/);
    const temporalType = this._checkForTemporalType(entityText.toLowerCase().trim(), fullWords);
    const symptomType = !temporalType
      ? this._checkForSymptomType(entityText.toLowerCase().trim(), headNoun)
      : null;

    let entityType = temporalType || symptomType || this._determineEntityType(headNoun, {
      fullText: fullText,
      definitenessInfo: defInfo
    });

    let typeRefinedBy = null;
    if (!temporalType && !symptomType) {
      const verbRefinement = this._refineTypeByVerbContext(headNoun, fullText, offset);
      if (verbRefinement.refinedType) {
        entityType = verbRefinement.refinedType;
        typeRefinedBy = verbRefinement.governingVerb;
      }
    }

    const temporalUnit = temporalType ? this._extractTemporalUnit(entityText) : null;
    const referentialStatus = this._determineReferentialStatus(defInfo, entityText, fullText, 0);

    return this._createDiscourseReferent({
      text: entityText,
      rootNoun: rootNoun,
      offset,
      entityType,
      definiteness: defInfo.definiteness,
      referentialStatus,
      scarcity: scarcityInfo,
      quantity: quantityInfo,
      temporalUnit: temporalUnit,
      typeRefinedBy: typeRefinedBy,
      introducingPreposition: introducingPrep
    });
  }

  /**
   * V7-011c: Extract syntactic head noun from complex NP.
   *
   * Linguistic Foundation:
   * - Cambridge Grammar §5.4: Possessive NP head is the possessed (rightmost noun)
   * - Cambridge Grammar §7.2: PP-modified NP head is the noun before the preposition
   * - X-bar Theory: Head determines the category and semantic type of the phrase
   *
   * Problem: Compromise NLP doesn't reliably identify syntactic heads for complex NPs:
   * - "admin's credentials" → Compromise returns "admin's" as head (should be "credentials")
   * - "server in datacenter" → Compromise returns "datacenter" or phrase (should be "server")
   *
   * Solution: Apply linguistic rules to extract true head noun:
   * 1. Possessives ("X's Y"): Rightmost noun is head ("credentials")
   * 2. PP modifiers ("X in/on/at Y"): Leftmost noun before prep is head ("server")
   * 3. Otherwise: Use Compromise's rootNoun
   *
   * @param {string} nounText - The full noun phrase text
   * @param {string} rootNoun - Compromise's root noun (fallback)
   * @returns {string} The syntactic head noun
   */
  _extractHeadNoun(nounText, rootNoun) {
    const text = nounText.trim();

    // Pattern 1: Possessive NP ("X's Y" or just "X's")
    // Cambridge Grammar §5.4: In "the admin's credentials", head is "credentials"
    const possessivePattern = /^(.+?)'s(?:\s+(.+))?$/i;
    const possMatch = text.match(possessivePattern);
    if (possMatch) {
      if (possMatch[2]) {
        // "X's Y" form - possessed is head
        const possessed = possMatch[2].trim();
        // Extract rightmost noun from possessed part
        const words = possessed.split(/\s+/);
        return words[words.length - 1].toLowerCase();
      } else {
        // Just "X's" with no Y - use possessor
        const possessor = possMatch[1].trim();
        const words = possessor.split(/\s+/);
        return words[words.length - 1].toLowerCase();
      }
    }

    // Pattern 2: PP modifier ("X in/on/at/from/to/... Y")
    // Cambridge Grammar §7.2: In "the server in the datacenter", head is "server"
    // Use greedy matching (.+) to capture full head phrase before preposition
    const ppPattern = /^(.+)\s+(in|on|at|from|to|into|onto|near|by|with|under|over|above|below|beside|behind|before|after|during|within|outside)\s+(.+)$/i;
    const ppMatch = text.match(ppPattern);
    if (ppMatch) {
      const headPhrase = ppMatch[1].trim();
      // Extract rightmost noun from head phrase (before preposition)
      const words = headPhrase.split(/\s+/);
      return words[words.length - 1].toLowerCase();
    }

    // Pattern 3: No complex structure - use Compromise's rootNoun
    return (rootNoun || text).toLowerCase();
  }

  /**
   * V7-010: Detect coordination in noun phrases ("X and Y" patterns).
   *
   * Linguistic Foundation: Penn Treebank NP coordination rules
   * - "NP and NP" creates two separate entities, not one merged entity
   * - "the admin and the user" → 2 entities: "the admin", "the user"
   * - "servers and databases" → 2 entities: "servers", "databases"
   *
   * Handles both "and" and "or" coordination.
   *
   * @param {string} nounText - The noun phrase text
   * @param {string} fullText - Full input text for context
   * @returns {Object} {isCoordinated: boolean, conjuncts: string[], type: 'and'|'or'}
   */
  _detectCoordination(nounText, fullText) {
    // Coordination pattern: "X and Y" or "X or Y"
    // Use word boundaries to avoid matching "brand" or "standard"
    const andPattern = /\b(\w+(?:\s+\w+)*)\s+and\s+(\w+(?:\s+\w+)*)\b/i;
    const orPattern = /\b(\w+(?:\s+\w+)*)\s+or\s+(\w+(?:\s+\w+)*)\b/i;

    let match = nounText.match(andPattern);
    let type = 'and';

    if (!match) {
      match = nounText.match(orPattern);
      type = 'or';
    }

    if (!match) {
      return { isCoordinated: false, conjuncts: [], type: null };
    }

    // Extract conjuncts
    // For "the admin and the user" → ["the admin", "the user"]
    // For "servers and databases" → ["servers", "databases"]
    const conjuncts = [];

    // Check if pattern has determiners
    const leftPart = match[1].trim();
    const rightPart = match[2].trim();

    // Handle determiner inheritance
    // "the admin and user" → ["the admin", "the user"] (inherit determiner)
    // "the admin and the user" → ["the admin", "the user"] (explicit determiners)
    const determinerPattern = /^(the|a|an|this|that|these|those)\s+/i;
    const leftDet = leftPart.match(determinerPattern);

    if (leftDet && !rightPart.match(determinerPattern)) {
      // Inherit determiner to right conjunct
      conjuncts.push(leftPart);
      conjuncts.push(leftDet[1] + ' ' + rightPart);
    } else {
      // Both have explicit determiners or both are bare
      conjuncts.push(leftPart);
      conjuncts.push(rightPart);
    }

    return {
      isCoordinated: true,
      conjuncts: conjuncts,
      type: type
    };
  }

  /**
   * V7-010: Extract pronouns, especially reflexives for Binding Theory support.
   *
   * Reflexive pronouns (itself, himself, herself, etc.) need to be extracted
   * as entities so ActExtractor can assign them to patient roles.
   *
   * Linguistic Foundation: Chomsky's Binding Theory (Principle A)
   * - Reflexive pronouns must be bound within their local domain
   * - In "The system updated itself", "itself" must be patient of "updated"
   *
   * @param {Object} doc - Compromise NLP document
   * @param {string} text - Full input text
   * @param {Array} tier1Entities - Array to add entities to (modified in place)
   */
  _extractPronouns(doc, text, tier1Entities) {
    // Reflexive pronouns that need entity extraction
    const REFLEXIVE_PRONOUNS = new Set([
      'itself', 'himself', 'herself', 'themselves',
      'ourselves', 'yourself', 'yourselves', 'myself'
    ]);

    // Extract all pronouns using Compromise
    const pronouns = doc.pronouns();

    pronouns.forEach((pronoun, index) => {
      const pronounText = pronoun.text().toLowerCase();

      // Only extract reflexive pronouns (non-reflexives like "it", "he" are handled by anaphora)
      if (!REFLEXIVE_PRONOUNS.has(pronounText)) {
        return;
      }

      // Skip if already extracted (shouldn't happen, but safety check)
      const alreadyExtracted = tier1Entities.some(e => {
        const label = (e['rdfs:label'] || '').toLowerCase();
        return label === pronounText;
      });
      if (alreadyExtracted) return;

      // Get offset in original text
      const offset = this._getSpanOffset(text, pronounText, index);

      // Determine entity type based on pronoun
      // "itself" → generic entity (could be artifact, system, etc.)
      // "himself/herself" → person
      // "themselves/ourselves" → group
      let entityType = 'bfo:Entity';  // Default for "itself"
      if (pronounText === 'himself' || pronounText === 'herself' || pronounText === 'myself' || pronounText === 'yourself') {
        entityType = 'cco:Person';
      } else if (pronounText === 'themselves' || pronounText === 'ourselves' || pronounText === 'yourselves') {
        entityType = 'cco:GroupOfPersons';
      }

      // Create DiscourseReferent for reflexive pronoun
      const referent = this._createDiscourseReferent({
        text: pronounText,
        rootNoun: pronounText,
        offset,
        entityType: entityType,
        definiteness: 'anaphoric',  // Pronouns are anaphoric by definition
        referentialStatus: 'anaphoric',
        scarcity: { isScarce: false },
        quantity: { quantity: null },
        temporalUnit: null,
        typeRefinedBy: null,
        introducingPreposition: null
      });

      // V7-010: Mark as pronoun for ActExtractor
      referent['tagteam:isPronoun'] = true;
      referent['tagteam:pronounType'] = 'reflexive';

      tier1Entities.push(referent);
    });
  }

  /**
   * V7-007: Upgrade entities with default type if they appear to be proper names.
   *
   * Some proper names get extracted as regular nouns with bfo:BFO_0000040 default type.
   * This post-processing step upgrades them based on capitalization heuristics.
   *
   * @param {Array} tier1Entities - Entities to upgrade (modified in place)
   */
  _upgradeCapitalizedDefaultEntities(tier1Entities) {
    const DEFAULT_TYPE = 'bfo:BFO_0000040';

    tier1Entities.forEach(entity => {
      // Only upgrade if it has default type
      const types = entity['@type'] || [];
      if (!types.includes(DEFAULT_TYPE)) return;

      const text = entity['rdfs:label'] || '';
      const words = text.trim().split(/\s+/);

      // Check if all main words are capitalized (skip articles)
      const mainWords = words.filter(w => {
        const lower = w.toLowerCase();
        return !['the', 'a', 'an'].includes(lower);
      });

      const allCapitalized = mainWords.every(w => {
        const clean = w.replace(/[.,;:!?]$/, '');
        return clean.length > 0 &&
               clean[0] === clean[0].toUpperCase() &&
               clean[0] !== clean[0].toLowerCase();
      });

      if (!allCapitalized) return;

      // Determine new type based on word count, length, and patterns
      let newType;
      const cleanWords = mainWords.map(w => w.replace(/[.,;:!?]$/, ''));
      const totalLength = cleanWords.join('').length;
      const firstWord = cleanWords[0];

      // Check for known tech companies/products
      const techCompanies = new Set(['Microsoft', 'Google', 'Apple', 'Amazon', 'Facebook', 'Oracle', 'IBM', 'Intel', 'AMD', 'Nvidia']);
      const techProducts = new Set(['Windows', 'Linux', 'Mac', 'Unix', 'Android', 'iOS', 'Chrome', 'Firefox', 'Safari']);

      if (cleanWords.length === 1) {
        // Single capitalized word
        if (techCompanies.has(firstWord)) {
          newType = 'cco:Organization';
        } else if (techProducts.has(firstWord)) {
          newType = 'cco:Artifact';  // Product names are artifacts
        } else if (totalLength >= 3 && totalLength <= 8) {
          // Short word - likely person name (John, Mary, Smith)
          newType = 'cco:Person';
        } else if (totalLength >= 9) {
          // Longer single word - likely organization (Microsoft = 9 chars)
          newType = 'cco:Organization';
        }
      } else if (cleanWords.length === 2) {
        // Two capitalized words
        // Check if second word is a common name suffix (indicates person)
        const nameSuffixes = new Set(['Jr', 'Sr', 'II', 'III']);
        if (nameSuffixes.has(cleanWords[1])) {
          newType = 'cco:Person';
        } else if (totalLength <= 20) {
          // Likely "FirstName LastName"
          newType = 'cco:Person';
        } else {
          // Long two-word phrase - likely organization
          newType = 'cco:Organization';
        }
      } else {
        // Multiple words - likely organization
        newType = 'cco:Organization';
      }

      if (newType) {
        // Replace default type with specific type
        const typeIndex = types.indexOf(DEFAULT_TYPE);
        if (typeIndex !== -1) {
          types[typeIndex] = newType;
        }
      }
    });
  }

  /**
   * V7-007: Extract capitalized words that weren't caught by other methods.
   *
   * Fallback for proper names that Compromise doesn't recognize in its
   * dictionaries (e.g., "John", "Microsoft", "Windows").
   *
   * Heuristics:
   * - Capitalized word(s) not in ENTITY_TYPE_MAPPINGS or common words
   * - Short single words (3-10 chars) → likely Person names
   * - Longer or multi-word → likely Organizations or product names
   *
   * @param {string} text - Full input text
   * @param {Array} tier1Entities - Existing entities (modified in place)
   */
  _extractCapitalizedWords(text, tier1Entities) {
    const words = text.split(/\s+/);
    const commonWords = new Set(['the', 'a', 'an', 'this', 'that', 'these', 'those', 'i', 'he', 'she', 'it', 'we', 'they']);

    let i = 0;
    while (i < words.length) {
      const cleanWord = words[i].replace(/[.,;:!?]$/, '');
      const lowerWord = cleanWord.toLowerCase();

      // Skip if not capitalized or is a common word
      if (cleanWord[0] !== cleanWord[0].toUpperCase() ||
          cleanWord[0] === cleanWord[0].toLowerCase() ||
          commonWords.has(lowerWord)) {
        i++;
        continue;
      }

      // Skip if in ENTITY_TYPE_MAPPINGS (already handled by noun extraction)
      if (ENTITY_TYPE_MAPPINGS[lowerWord]) {
        i++;
        continue;
      }

      // Check if already extracted
      const wordStart = text.indexOf(words[i], i > 0 ? text.indexOf(words[i - 1]) + words[i - 1].length : 0);
      const alreadyExtracted = tier1Entities.some(e => {
        const start = e['tagteam:startPosition'];
        const end = e['tagteam:endPosition'];
        return start <= wordStart && wordStart < end;
      });

      if (alreadyExtracted) {
        i++;
        continue;
      }

      // Check for multi-word capitalized phrase (e.g., "John Smith")
      let phrase = cleanWord;
      let phraseEnd = i;
      while (phraseEnd + 1 < words.length) {
        const nextWord = words[phraseEnd + 1].replace(/[.,;:!?]$/, '');
        if (nextWord[0] === nextWord[0].toUpperCase() && nextWord[0] !== nextWord[0].toLowerCase()) {
          phrase += ' ' + nextWord;
          phraseEnd++;
        } else {
          break;
        }
      }

      // Determine type based on heuristics
      let entityType;
      const phraseLength = phrase.replace(/\s+/g, '').length;

      if (phraseEnd > i) {
        // Multi-word capitalized phrase
        if (phrase.split(/\s+/).length === 2 && phraseLength <= 20) {
          // Likely "FirstName LastName"
          entityType = 'cco:Person';
        } else {
          // Longer phrase - likely Organization
          entityType = 'cco:Organization';
        }
      } else {
        // Single capitalized word
        if (phraseLength >= 3 && phraseLength <= 10) {
          // Short word - likely person name
          entityType = 'cco:Person';
        } else if (phraseLength > 10) {
          // Longer word - likely organization or product
          entityType = 'cco:Organization';
        } else {
          // Very short - skip (might be abbreviation)
          i++;
          continue;
        }
      }

      const offset = wordStart >= 0 ? wordStart : 0;

      const referent = this._createDiscourseReferent({
        text: phrase,
        rootNoun: phrase,
        offset,
        entityType,
        definiteness: 'definite',
        referentialStatus: 'introduced',
        scarcity: { isScarce: false },
        quantity: { quantity: null },
        temporalUnit: null,
        typeRefinedBy: null,
        introducingPreposition: null
      });

      tier1Entities.push(referent);

      i = phraseEnd + 1;
    }
  }

  /**
   * V7-003: Trim trailing verbs from noun phrase to prevent absorption
   * e.g., "the system restarts" → "the system"
   * @param {string} nounPhrase - The noun phrase from Compromise
   * @returns {string} Trimmed noun phrase without trailing verbs
   */
  _trimTrailingVerbs(nounPhrase) {
    const words = nounPhrase.trim().split(/\s+/);
    if (words.length === 0) return nounPhrase;

    // Common verb patterns to trim
    const verbPatterns = [
      /s$/,           // present tense 3rd person (fails, runs, completes, restarts)
      /ed$/,          // past tense (failed, completed, restarted)
      /ing$/,         // present participle (failing, running, completing)
      /es$/,          // present tense (goes, does, reaches)
      /ied$/          // past tense -y verbs (tried, replied)
    ];

    // Common verbs to trim (irregular + common regular)
    const commonVerbs = new Set([
      'fails', 'fail', 'failed', 'receives', 'receive', 'received',
      'completes', 'complete', 'completed', 'restarts', 'restart', 'restarted',
      'runs', 'run', 'ran', 'locks', 'lock', 'locked', 'expires', 'expire', 'expired',
      'approves', 'approve', 'approved', 'blocks', 'block', 'blocked',
      'finishes', 'finish', 'finished', 'launches', 'launch', 'launched',
      'starts', 'start', 'started', 'loads', 'load', 'loaded',
      'stops', 'stop', 'stopped', 'increases', 'increase', 'increased',
      'rises', 'rise', 'rose', 'goes', 'go', 'went', 'does', 'do', 'did',
      'is', 'are', 'was', 'were', 'has', 'have', 'had',
      'designs', 'design', 'designed', 'stores', 'store', 'stored',
      'handles', 'handle', 'handled', 'crashes', 'crash', 'crashed',
      'hired', 'hire', 'hires', 'resigned', 'resign', 'resigns',
      'deployed', 'deploy', 'deploys', 'fixed', 'fix', 'fixes',
      'filed', 'file', 'files', 'caused', 'cause', 'causes',
      'responded', 'respond', 'responds', 'left', 'leave', 'leaves'
    ]);

    // Determiners that should not be left as standalone entities
    const determiners = new Set(['the', 'a', 'an', 'this', 'that', 'these', 'those']);

    // Trim from the end while last word looks like a verb
    while (words.length > 1) {
      const lastWord = words[words.length - 1].toLowerCase().replace(/[.,;:!?]$/, '');

      // Don't trim if it would leave only a determiner
      // e.g., "the load" → don't trim to just "the"
      if (words.length === 2 && determiners.has(words[0].toLowerCase().replace(/[.,;:!?]$/, ''))) {
        break;
      }

      // Check if it's a known verb
      if (commonVerbs.has(lastWord)) {
        words.pop();
        continue;
      }

      // Check if it matches verb patterns
      const matchesVerbPattern = verbPatterns.some(pattern => pattern.test(lastWord));
      if (matchesVerbPattern && lastWord.length > 3) {
        words.pop();
        continue;
      }

      // Not a verb, stop trimming
      break;
    }

    return words.join(' ');
  }

  /**
   * V7-004/V7-005: Check if Wh-word is in relativizer context (follows NP or preposition)
   *
   * Patterns:
   * 1. Direct: "The engineer who..." - "who" follows NP
   * 2. Prepositional: "The server on which..." - "which" follows preposition
   *
   * vs. "Who designed..." - "who" at start, so it's interrogative
   *
   * @param {Array} entities - Extracted entities so far
   * @param {string} text - Full text
   * @param {number} wordIndex - Index of Wh-word in words array
   * @param {Array} words - Words array
   * @returns {boolean} True if this is a relativizer context
   */
  _isRelativizerContext(entities, text, wordIndex, words) {
    // If Wh-word is at start of sentence, it's interrogative, not relativizer
    if (wordIndex === 0) return false;

    // V7-005: Check if immediately preceded by a preposition (prepositional relative)
    // Pattern: "on which", "to whom", "for whose", etc.
    const PREPOSITIONS = ['on', 'in', 'at', 'to', 'from', 'with', 'by', 'for', 'of', 'about', 'through', 'during', 'after', 'before'];
    if (wordIndex > 0) {
      const prevWord = words[wordIndex - 1].toLowerCase().replace(/[.,;:!?]$/, '');
      if (PREPOSITIONS.includes(prevWord)) {
        return true; // Prepositional relative: "on which"
      }
    }

    // Find position of this Wh-word in original text
    let position = 0;
    for (let i = 0; i < wordIndex; i++) {
      position = text.toLowerCase().indexOf(words[i], position) + words[i].length;
    }
    const whWordStart = text.toLowerCase().indexOf(words[wordIndex], position);

    // Check if any entity ends just before this Wh-word
    // Relativizers typically follow immediately after NPs (with maybe a space)
    const precedingEntity = entities.find(e => {
      const entityEnd = e['tagteam:endPosition'];
      // Allow 1-2 character gap (space) between entity and Wh-word
      return entityEnd !== undefined && entityEnd >= whWordStart - 2 && entityEnd <= whWordStart;
    });

    return !!precedingEntity;
  }

  /**
   * Check if noun is a non-entity word to skip
   * @param {string} noun - Noun text
   * @returns {boolean} True if should skip
   */
  _isNonEntityNoun(noun) {
    const nonEntityNouns = ['here', 'there', 'now', 'then', 'help', 'way', 'thing'];
    return nonEntityNouns.includes(noun.toLowerCase().trim());
  }

  /**
   * Detect definiteness from determiner
   * @param {Object} noun - Compromise noun object
   * @param {string} nounText - The noun text
   * @param {string} fullText - Full input text
   * @param {Object} nounData - Compromise noun metadata
   * @returns {Object} Definiteness info
   */
  _detectDefiniteness(noun, nounText, fullText, nounData = {}) {
    // Definite determiners
    const definiteMarkers = ['the', 'this', 'that', 'these', 'those', 'his', 'her', 'its', 'their', 'my', 'our', 'your'];

    // Indefinite determiners
    const indefiniteMarkers = ['a', 'an', 'some', 'any', 'each', 'every', 'no', 'another'];

    // First check Compromise's determiner data
    if (nounData.determiner) {
      const det = nounData.determiner.toLowerCase();
      if (definiteMarkers.includes(det)) {
        return { definiteness: 'definite', determiner: det };
      }
      if (indefiniteMarkers.includes(det)) {
        return { definiteness: 'indefinite', determiner: det };
      }
    }

    // Fallback: check text before noun (Compromise may miss determiners with intervening modifiers)
    // e.g., "the critically ill patient" - Compromise may only see "ill patient"
    const lowerText = fullText.toLowerCase();
    const lowerNoun = nounText.toLowerCase();
    const nounIndex = lowerText.indexOf(lowerNoun);

    if (nounIndex > 0) {
      const beforeNoun = lowerText.substring(0, nounIndex).trim();
      const words = beforeNoun.split(/\s+/);

      // Look back up to 6 words to find a determiner (handles modifiers like "the critically ill")
      const searchLimit = Math.min(6, words.length);
      for (let i = 1; i <= searchLimit; i++) {
        const word = words[words.length - i];
        if (definiteMarkers.includes(word)) {
          return { definiteness: 'definite', determiner: word };
        }
        if (indefiniteMarkers.includes(word)) {
          return { definiteness: 'indefinite', determiner: word };
        }
        // Stop if we hit a verb, preposition, or punctuation (different clause)
        if (word.match(/[.,;:!?]$/) || CLAUSE_BOUNDARY_WORDS.has(word)) {
          break;
        }
      }
    }

    // Check for proper names (inherently definite)
    // Proper names are capitalized and typically don't have determiners
    // e.g., "Dr. Smith", "John", "Mary"
    if (this._isProperName(nounText, fullText, nounIndex)) {
      return { definiteness: 'definite', determiner: null, isProperName: true };
    }

    // Default to indefinite if no determiner
    return { definiteness: 'indefinite', determiner: null };
  }

  /**
   * Check if a noun phrase is a proper name (inherently definite)
   * @param {string} nounText - The noun text
   * @param {string} fullText - Full input text
   * @param {number} nounIndex - Position of noun in text
   * @returns {boolean} True if proper name
   */
  _isProperName(nounText, fullText, nounIndex) {
    // Titles that indicate proper names
    const titles = ['dr', 'dr.', 'mr', 'mr.', 'mrs', 'mrs.', 'ms', 'ms.', 'prof', 'prof.'];

    const words = nounText.split(/\s+/);

    // Check if first word is a title
    if (titles.includes(words[0].toLowerCase())) {
      return true;
    }

    // Check if first word is capitalized (and not at sentence start)
    const firstWord = words[0];
    if (firstWord[0] === firstWord[0].toUpperCase() && firstWord[0] !== firstWord[0].toLowerCase()) {
      // Make sure it's not at the start of a sentence
      if (nounIndex > 0) {
        const charBefore = fullText[nounIndex - 1];
        const twoCharsBefore = nounIndex > 1 ? fullText.substring(nounIndex - 2, nounIndex) : '';
        // If preceded by space (not after period), it's likely a proper name
        if (charBefore === ' ' && !twoCharsBefore.match(/[.!?]\s*$/)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Detect scarcity markers near entity
   * @param {string} nounText - The noun text
   * @param {string} fullText - Full input text
   * @param {number} offset - Span offset
   * @param {Object} nounData - Compromise noun metadata
   * @returns {Object} Scarcity info
   */
  _detectScarcity(nounText, fullText, offset, nounData = {}) {
    // First check adjectives from Compromise
    if (nounData.adjectives && nounData.adjectives.length > 0) {
      for (const adj of nounData.adjectives) {
        const lowerAdj = adj.toLowerCase();
        if (SCARCITY_MARKERS.includes(lowerAdj)) {
          return { isScarce: true, marker: lowerAdj };
        }
      }
    }

    // Fallback: check context before noun
    const lowerText = fullText.toLowerCase();
    const lowerNoun = nounText.toLowerCase();

    const nounIndex = lowerText.indexOf(lowerNoun);
    if (nounIndex === -1) {
      return { isScarce: false, marker: null };
    }

    const contextStart = Math.max(0, nounIndex - 30);
    const beforeContext = lowerText.substring(contextStart, nounIndex);

    for (const marker of SCARCITY_MARKERS) {
      if (beforeContext.includes(marker)) {
        return { isScarce: true, marker };
      }
    }

    return { isScarce: false, marker: null };
  }

  /**
   * Detect quantity from context
   * @param {string} nounText - The noun text
   * @param {string} fullText - Full input text
   * @param {number} offset - Span offset
   * @param {Object} nounData - Compromise noun metadata
   * @returns {Object} Quantity info
   */
  _detectQuantity(nounText, fullText, offset, nounData = {}) {
    // First check Compromise's number data
    if (nounData.number !== null && nounData.number !== undefined) {
      return { quantity: nounData.number, quantifier: 'detected' };
    }

    // Check adjectives for implied quantity (last, only, single = 1)
    const impliedOneMarkers = ['last', 'only', 'sole', 'single', 'remaining', 'final'];
    if (nounData.adjectives && nounData.adjectives.length > 0) {
      for (const adj of nounData.adjectives) {
        if (impliedOneMarkers.includes(adj.toLowerCase())) {
          return { quantity: 1, quantifier: adj.toLowerCase() };
        }
      }
    }

    const lowerText = fullText.toLowerCase();
    const lowerNoun = nounText.toLowerCase();

    // Find noun position
    const nounIndex = lowerText.indexOf(lowerNoun);
    if (nounIndex === -1) {
      return { quantity: null, quantifier: null };
    }

    // Look for quantity word before noun
    const contextStart = Math.max(0, nounIndex - 20);
    const beforeContext = lowerText.substring(contextStart, nounIndex);
    const words = beforeContext.trim().split(/\s+/);

    // Check each word for quantity
    for (let i = words.length - 1; i >= 0; i--) {
      const word = words[i];
      if (QUANTITY_WORDS[word] !== undefined) {
        return { quantity: QUANTITY_WORDS[word], quantifier: word };
      }

      // Check for numeric digits
      if (/^\d+$/.test(word)) {
        return { quantity: parseInt(word, 10), quantifier: word };
      }
    }

    return { quantity: null, quantifier: null };
  }

  /**
   * Extract head noun from a noun phrase
   *
   * In English, the head noun is typically the rightmost noun in a compound.
   * e.g., "medication administration" → "administration" (head)
   *       "patient care plan" → "plan" (head)
   *
   * @param {string} nounPhrase - The noun phrase
   * @returns {string} The head noun
   * @private
   */
  _extractHeadNoun(nounPhrase) {
    const words = nounPhrase.toLowerCase().trim().split(/\s+/);
    return words[words.length - 1];
  }

  /**
   * Check if noun phrase refers to a process/service rather than a physical object
   *
   * Domain-Neutral Detection Order (ONTOLOGICAL_ISSUES_2026_01_19.md v3.1):
   * 0. Compound noun analysis → head noun determines type
   * 1. Physical object indicators → Artifact (override everything)
   * 2. Ontological vocabulary → BFO types (domain-neutral)
   * 3. Result noun exceptions → IC/GDC (override suffixes)
   * 4. Nominalization suffixes → BFO:Process (linguistic patterns - PRIMARY)
   * 5. Domain-specific words → CCO types (DEPRECATED - Phase 2 moves to config)
   *
   * Pattern Precedence (from critique):
   * 1. Verb selectional restrictions (Phase 3)
   * 2. Compound noun as unit - head noun determines type
   * 3. Head noun morphology - suffixes on head noun
   * 4. Modifier constraints - "physical documentation" override (TODO)
   * 5. Suffix heuristics
   * 6. Ontological vocabulary match
   * 7. Default
   *
   * @param {string} nounText - The noun text
   * @param {Object} [context] - Additional context for disambiguation
   * @param {string} [context.determiner] - Determiner if available
   * @returns {Object|null} Type info { isProcess, type } or null if not a process
   */
  _checkForProcessType(nounText, context = {}) {
    const lowerNoun = nounText.toLowerCase().trim();
    const words = lowerNoun.split(/\s+/);
    const lastWord = this._extractHeadNoun(lowerNoun); // Head noun determines type

    // Priority 1: Physical object indicators override everything
    for (const indicator of PHYSICAL_OBJECT_INDICATORS) {
      if (lowerNoun.includes(indicator)) {
        return null; // Not a process, let it fall through to artifact
      }
    }

    // Priority 2: Check ontological vocabulary (domain-neutral)
    // Handle both singular and common plural forms (service/services, activity/activities)
    for (const [term, type] of Object.entries(ONTOLOGICAL_VOCABULARY)) {
      // Match term or term+s or term with y→ies plural
      const pluralS = term + 's';
      const pluralIes = term.endsWith('y') ? term.slice(0, -1) + 'ies' : null;

      const matchesTerm = lastWord === term ||
                          lastWord === pluralS ||
                          (pluralIes && lastWord === pluralIes);

      if (matchesTerm) {
        // Check if it's an occurrent type
        if (type === 'bfo:BFO_0000015' || type === 'bfo:Process') {
          // V7-008: Accept both full IRI and compact form
          return { isProcess: true, type: 'bfo:Process' };
        }
        // Not a process (person, artifact, GDC) - return null to use other classification
        return null;
      }
    }

    // Priority 3: Check result noun exceptions (these override suffix detection)
    if (RESULT_NOUN_EXCEPTIONS[lastWord]) {
      // It's a result noun (product/entity), not a process
      return null;
    }

    // Priority 4: Domain-specific words from config loader (Phase 2)
    // Config loader takes precedence over suffix detection to allow domain-specific
    // type specialization (e.g., "surgery" → cco:ActOfSurgery instead of bfo:BFO_0000015)
    if (this.configLoader && this.configLoader.isConfigLoaded()) {
      const configType = this.configLoader.getProcessRootWord(lastWord);
      if (configType) {
        return { isProcess: true, type: configType };
      }

      // Also check the full phrase for multi-word matches
      const fullPhraseType = this.configLoader.getProcessRootWord(lowerNoun);
      if (fullPhraseType) {
        return { isProcess: true, type: fullPhraseType };
      }
    }

    // Priority 4.5: V7-008 Action nominalizations → cco:Act
    // These are nominalized intentional acts, not generic processes
    const actionNominalizations = new Set([
      'deployment', 'implementation', 'installation', 'configuration',
      'execution', 'operation', 'deployment', 'migration', 'upgrade'
    ]);
    if (actionNominalizations.has(lastWord)) {
      return { isProcess: true, type: 'cco:Act' };
    }

    // Priority 5: Nominalization suffixes - domain-neutral detection mechanism
    // This is the linguistic pattern approach when no config specialization matches
    for (const suffix of PROCESS_SUFFIXES) {
      const cleanSuffix = suffix.replace('-', '');
      if (lastWord.endsWith(cleanSuffix) && lastWord.length > cleanSuffix.length + 2) {
        // Has process suffix and not in exception list → Process
        return { isProcess: true, type: 'bfo:Process' }; // V7-008: Use compact form instead of bfo:BFO_0000015
      }
    }

    // Priority 6: Deprecated domain process words (fallback when no config)
    // TD-001: These will be removed after Phase 2 migration is complete
    if (!this.configLoader || !this.configLoader.isConfigLoaded()) {
      for (const [rootWord, type] of Object.entries(DOMAIN_PROCESS_WORDS)) {
        const regex = new RegExp(`\\b${rootWord}\\b`, 'i');
        if (regex.test(lowerNoun)) {
          return { isProcess: true, type };
        }
      }
    }

    return null;
  }

  /**
   * Check if a word is a known result noun or physical entity
   * These are nominalizations that denote products/entities rather than processes.
   *
   * @param {string} word - Word to check
   * @returns {boolean} True if known result noun or physical entity
   */
  _isKnownPhysicalEntity(word) {
    // Use the RESULT_NOUN_EXCEPTIONS constant for comprehensive coverage
    return RESULT_NOUN_EXCEPTIONS.hasOwnProperty(word.toLowerCase());
  }

  /**
   * Check if a noun phrase denotes a temporal region.
   *
   * Detection rules:
   * 1. Quantity + temporal unit ("three days") → bfo:BFO_0000038 (1D Temporal Region)
   * 2. Numeric + temporal unit ("24 hours") → bfo:BFO_0000038
   * 3. Relative prefix + unit ("last week") → bfo:BFO_0000008 (Temporal Region)
   * 4. Standalone relative term ("yesterday") → bfo:BFO_0000008
   *
   * @param {string} lowerNoun - Lowercased noun text
   * @param {string[]} words - Words array
   * @returns {string|null} BFO temporal type IRI or null
   */
  _checkForTemporalType(lowerNoun, words) {
    const lastWord = words[words.length - 1];

    // Rule 1-2: quantity/number + temporal unit → 1D Temporal Region
    if (words.length >= 2 && TEMPORAL_UNITS[lastWord]) {
      const firstWord = words[0];
      if (QUANTITY_WORDS[firstWord] !== undefined || /^\d+$/.test(firstWord)) {
        return 'bfo:BFO_0000038'; // One-Dimensional Temporal Region
      }
    }

    // Rule 3: relative prefix + temporal unit → Temporal Region (unspecified)
    if (words.length >= 2 && TEMPORAL_UNITS[lastWord]) {
      if (RELATIVE_TEMPORAL_PREFIXES.includes(words[0])) {
        return 'bfo:BFO_0000008'; // Temporal Region
      }
    }

    // Rule 4: standalone relative temporal term
    if (words.length === 1 && RELATIVE_TEMPORAL_TERMS.includes(lastWord)) {
      return 'bfo:BFO_0000008'; // Temporal Region
    }

    return null;
  }

  /**
   * Extract temporal unit from a noun phrase if it is a temporal expression.
   * Used to annotate Tier 1 nodes with tagteam:unit.
   *
   * @param {string} nounText - The noun text
   * @returns {string|null} Normalized unit ("day", "week", etc.) or null
   */
  _extractTemporalUnit(nounText) {
    const words = nounText.toLowerCase().trim().split(/\s+/);
    const lastWord = words[words.length - 1];
    return TEMPORAL_UNITS[lastWord] || null;
  }

  /**
   * Check if a noun phrase denotes a physiological symptom or quality.
   *
   * Detection rules:
   * 1. Full phrase matches a known multi-word symptom phrase ("chest pain", "shortness of breath")
   * 2. Root noun is a known single-word symptom ("cough", "fever", "nausea")
   * 3. Coordinated symptoms: "cough and fever" — check individual conjuncts
   *
   * @param {string} fullNounLower - Full noun phrase, lowercased
   * @param {string} rootNounLower - Root/head noun, lowercased
   * @returns {string|null} 'bfo:BFO_0000019' (Quality) or null
   */
  _checkForSymptomType(fullNounLower, rootNounLower) {
    // Rule 0: Disease terms → Disposition, NOT Quality
    // Per OGMS/BFO, diseases are dispositions to undergo pathological processes
    if (DISEASE_TERMS.has(rootNounLower)) {
      return 'bfo:Disposition'; // V7-008: Use compact form instead of bfo:BFO_0000016
    }
    // Check head word of multi-word root for diseases
    const rootWordsForDisease = rootNounLower.split(/\s+/);
    if (rootWordsForDisease.length > 1) {
      const headForDisease = rootWordsForDisease[rootWordsForDisease.length - 1];
      if (DISEASE_TERMS.has(headForDisease)) {
        return 'bfo:Disposition';
      }
    }

    // Rule 0b: Disposition/capability terms → Disposition
    // "capacity", "capability", "ability" etc. are realizable entities, not artifacts
    if (DISPOSITION_TERMS.has(rootNounLower)) {
      return 'bfo:Disposition'; // V7-008: Use compact form
    }

    // Rule 0c: Evaluative quality terms → Quality
    // "disaster", "success", "failure", "demand" etc. are evaluative attributes, not artifacts
    if (EVALUATIVE_QUALITY_TERMS.has(rootNounLower)) {
      return 'bfo:Quality'; // V7-008: Use compact form instead of bfo:BFO_0000019
    }

    // Rule 1: Multi-word phrase match (symptoms only)
    for (const phrase of SYMPTOM_PHRASES) {
      if (fullNounLower.includes(phrase)) {
        return 'bfo:Quality'; // V7-008: Use compact form
      }
    }

    // Rule 2: Single-word root noun match
    if (SYMPTOM_SINGLE_WORDS.has(rootNounLower)) {
      return 'bfo:Quality';
    }

    // Rule 3: Strip adjective modifiers and re-check root
    const rootWords = rootNounLower.split(/\s+/);
    if (rootWords.length > 1) {
      const headWord = rootWords[rootWords.length - 1];
      if (SYMPTOM_SINGLE_WORDS.has(headWord)) {
        return 'bfo:Quality';
      }
    }

    // Rule 4: Coordinated nouns — "cough and fever"
    // Check individual conjuncts from the full phrase
    if (fullNounLower.includes(' and ')) {
      const conjuncts = fullNounLower.split(/\s+and\s+/);
      const allAreSymptoms = conjuncts.every(c => {
        const trimmed = c.trim();
        // Strip leading adjective modifiers
        const words = trimmed.split(/\s+/);
        const head = words[words.length - 1];
        // Check disease terms first
        if (DISEASE_TERMS.has(head)) return true;
        // Check single word symptoms
        if (SYMPTOM_SINGLE_WORDS.has(head)) return true;
        // Check multi-word
        for (const phrase of SYMPTOM_PHRASES) {
          if (trimmed.includes(phrase)) return true;
        }
        return false;
      });
      if (allAreSymptoms) {
        // If any conjunct is a disease, the whole phrase is a disposition
        const anyDisease = conjuncts.some(c => {
          const head = c.trim().split(/\s+/).pop();
          return DISEASE_TERMS.has(head);
        });
        return anyDisease ? 'bfo:Disposition' : 'bfo:Quality';
      }
    }

    return null;
  }

  /**
   * ENH-001: Refine entity type based on governing verb context.
   *
   * For ambiguous nouns (design, report, data), the governing verb determines
   * whether the entity is information content (ICE) or physical artifact.
   *
   * - Cognitive verbs (review, analyze, read) → ICE
   * - Physical verbs (build, carry, print) → Artifact
   *
   * Uses IEE-approved guardrail: checks for intervening nouns between verb
   * and entity to avoid misattribution in multi-verb sentences.
   *
   * @param {string} rootNoun - Root noun to check
   * @param {string} fullText - Full input text
   * @param {number} entityOffset - Position of entity in text
   * @returns {Object} { refinedType: string|null, governingVerb: string|null }
   */
  _refineTypeByVerbContext(rootNoun, fullText, entityOffset) {
    const result = { refinedType: null, governingVerb: null };

    // Only refine ambiguous nouns
    const lowerRoot = rootNoun.toLowerCase().trim();
    const words = lowerRoot.split(/\s+/);
    const lastWord = words[words.length - 1];

    if (!AMBIGUOUS_OBJECT_NOUNS.has(lastWord)) {
      return result;
    }

    // Find the governing verb
    const governingVerb = this._findGoverningVerb(fullText, entityOffset, lowerRoot);
    if (!governingVerb) {
      return result;
    }

    // Refine based on verb class
    if (COGNITIVE_VERBS.has(governingVerb)) {
      result.refinedType = 'cco:InformationContentEntity';
      result.governingVerb = governingVerb;
    } else if (PHYSICAL_VERBS.has(governingVerb)) {
      result.refinedType = 'cco:Artifact';
      result.governingVerb = governingVerb;
    }

    return result;
  }

  /**
   * ENH-001: Find the verb that governs an entity as its direct object.
   *
   * Looks backward from the entity position to find the nearest verb.
   * Includes guardrail to check for intervening nouns (IEE requirement).
   *
   * @param {string} fullText - Full input text
   * @param {number} entityOffset - Position of entity in text
   * @param {string} entityText - The entity text (lowercased)
   * @returns {string|null} Governing verb (infinitive) or null
   */
  _findGoverningVerb(fullText, entityOffset, entityText) {
    const nlp = require('compromise');
    const doc = nlp(fullText);
    const verbs = doc.verbs();

    let nearestVerb = null;
    let nearestVerbEnd = -1;

    // Find the nearest verb before the entity
    verbs.forEach(verb => {
      const verbText = verb.text().toLowerCase();
      const verbStart = fullText.toLowerCase().indexOf(verbText);
      const verbEnd = verbStart + verbText.length;

      // Verb must be before the entity
      if (verbEnd <= entityOffset && verbEnd > nearestVerbEnd) {
        // Extract infinitive form
        const verbJson = verb.json()[0] || {};
        const verbData = verbJson.verb || {};
        const infinitive = (verbData.infinitive || verbData.root || verbText).toLowerCase();

        nearestVerb = infinitive;
        nearestVerbEnd = verbEnd;
      }
    });

    if (!nearestVerb) {
      return null;
    }

    // IEE Guardrail: Check if another noun intervenes between verb and entity
    // If so, the entity is likely not the direct object of this verb
    const textBetween = fullText.substring(nearestVerbEnd, entityOffset).toLowerCase();

    // Extract nouns from the text between verb and entity
    const betweenDoc = nlp(textBetween);
    const nounsBetween = betweenDoc.nouns().out('array');

    // Filter out determiners and the entity itself
    const interveningNouns = nounsBetween.filter(n => {
      const nLower = n.toLowerCase().trim();
      // Skip if it's just a determiner or part of the target entity
      if (['the', 'a', 'an'].includes(nLower)) return false;
      if (entityText.includes(nLower) || nLower.includes(entityText)) return false;
      return true;
    });

    if (interveningNouns.length > 0) {
      // Another noun intervenes - this verb doesn't govern our entity
      return null;
    }

    return nearestVerb;
  }

  /**
   * ENH-015: Detect the preposition that introduces an entity.
   *
   * Looks backward from the entity position to find a preposition immediately
   * before the noun phrase (accounting for determiners and adjectives).
   *
   * Prepositions tracked: for, with, to, from, by, at, in, on, about, through
   *
   * @param {string} fullText - Full input text
   * @param {number} entityOffset - Position of entity in text
   * @returns {string|null} Introducing preposition or null
   */
  _detectIntroducingPreposition(fullText, entityOffset) {
    // Get text before the entity (look back ~30 chars should be enough)
    const lookbackStart = Math.max(0, entityOffset - 30);
    const textBefore = fullText.substring(lookbackStart, entityOffset).toLowerCase();

    // ENH-015 fix: Match the NEAREST preposition to the entity
    // Pattern: preposition + optional determiner + optional adjectives (non-prep words) + end
    // We need to ensure we don't match prepositions that have other prepositions after them
    const prepositions = ['with', 'for', 'to', 'from', 'by', 'at', 'in', 'on', 'about', 'through', 'into', 'onto', 'upon'];

    // Find all preposition positions
    let lastPrep = null;
    let lastPrepPos = -1;

    for (const prep of prepositions) {
      // Find all occurrences of this preposition
      const regex = new RegExp(`\\b${prep}\\s+(the|a|an)?\\s*`, 'gi');
      let match;
      while ((match = regex.exec(textBefore)) !== null) {
        // Check that no other preposition appears between this one and the end
        const afterMatch = textBefore.substring(match.index + match[0].length);
        const hasLaterPrep = prepositions.some(p =>
          new RegExp(`\\b${p}\\s+(the|a|an)?\\s`).test(afterMatch)
        );

        if (!hasLaterPrep && match.index > lastPrepPos) {
          lastPrep = prep;
          lastPrepPos = match.index;
        }
      }
    }

    return lastPrep;
  }

  /**
   * Analyze noun phrase context for determiner-sensitive disambiguation
   *
   * Based on ONTOLOGICAL_ISSUES_2026_01_19.md v3.1:
   * - Definite determiner ("the X") → favors entity (IC) reading
   * - Indefinite determiner ("some X") → favors process (Occurrent) reading
   * - "X of Y" complement pattern → favors process reading
   * - Bare noun (no determiner) → favors process reading
   *
   * @param {string} nounText - The noun phrase text
   * @param {string} fullText - The full sentence for context
   * @param {Object} definitenessInfo - Definiteness info from _detectDefiniteness
   * @returns {Object} Context hints for disambiguation
   */
  _analyzeNounPhraseContext(nounText, fullText, definitenessInfo) {
    const result = {
      favorsEntity: false,
      favorsProcess: false,
      reason: null
    };

    const lowerFull = fullText.toLowerCase();
    const lowerNoun = nounText.toLowerCase();

    // Check for "X of Y" complement pattern (strongly favors process reading)
    // e.g., "the organization of files" = process, not entity
    const nounIndex = lowerFull.indexOf(lowerNoun);
    if (nounIndex !== -1) {
      const afterNoun = lowerFull.substring(nounIndex + lowerNoun.length).trim();
      if (afterNoun.startsWith('of ')) {
        result.favorsProcess = true;
        result.reason = 'of-complement';
        return result;
      }
    }

    // Check determiner
    if (definitenessInfo.definiteness === 'definite') {
      // "the administration" → entity reading (the organization)
      result.favorsEntity = true;
      result.reason = 'definite-determiner';
    } else if (definitenessInfo.determiner === null) {
      // Bare noun → process reading
      result.favorsProcess = true;
      result.reason = 'bare-noun';
    } else {
      // Indefinite → process reading
      result.favorsProcess = true;
      result.reason = 'indefinite-determiner';
    }

    return result;
  }

  /**
   * Determine entity type for denotesType property
   *
   * BFO/CCO compliance: Distinguishes between:
   * - Continuants (objects): cco:Person, cco:Artifact
   * - Occurrents (processes): cco:ActOfCare, cco:ActOfMedicalTreatment, etc.
   *
   * Uses determiner-sensitive disambiguation for ambiguous nominalizations.
   *
   * @param {string} nounText - The noun text
   * @param {Object} [context] - Additional context
   * @param {string} [context.fullText] - Full sentence for context analysis
   * @param {Object} [context.definitenessInfo] - Definiteness info
   * @returns {string} Entity type IRI
   */
  _determineEntityType(nounText, context = {}) {
    const lowerNoun = nounText.toLowerCase().trim();
    const words = lowerNoun.split(/\s+/);
    const lastWord = words[words.length - 1];

    // Priority -2: V7-006 Proper name detection
    // If definitenessInfo indicates this is a proper name, infer type from structure
    if (context.definitenessInfo && context.definitenessInfo.isProperName) {
      const originalNoun = nounText.trim();  // Keep original case
      const firstWord = originalNoun.split(/\s+/)[0];

      // Titles indicate person
      const titles = ['Dr', 'Dr.', 'Mr', 'Mr.', 'Mrs', 'Mrs.', 'Ms', 'Ms.', 'Prof', 'Prof.'];
      if (titles.some(t => firstWord.startsWith(t))) {
        return 'cco:Person';
      }

      // Multi-word capitalized names are usually persons or organizations
      // Heuristic: if 2-3 words and all capitalized → Person (e.g., "John Smith")
      // If includes common org indicators → Organization
      const orgIndicators = ['Inc', 'Corp', 'LLC', 'Ltd', 'Company', 'Corporation', 'Foundation'];
      const hasOrgIndicator = orgIndicators.some(ind => originalNoun.includes(ind));

      if (hasOrgIndicator) {
        return 'cco:Organization';
      }

      // V7-Priority5: Product names (software, hardware)
      // Common technology product names should be classified as Artifacts
      const productNames = [
        'Windows', 'Linux', 'macOS', 'iOS', 'Android',
        'Chrome', 'Firefox', 'Safari', 'Edge',
        'Office', 'Excel', 'Word', 'PowerPoint',
        'Photoshop', 'Illustrator',
        'MySQL', 'PostgreSQL', 'MongoDB', 'Redis',
        'Docker', 'Kubernetes',
        'AWS', 'Azure', 'GCP'
      ];
      if (productNames.includes(originalNoun)) {
        return 'cco:Artifact';
      }

      // Single capitalized word: could be person name, product name, or location
      // Default to Person for short single words (common first names)
      // This is a heuristic - proper classification needs context
      if (words.length === 1 && originalNoun.length <= 8) {
        return 'cco:Person';  // Likely a first name
      }

      // Multi-word (2-3 words) all capitalized → Person
      if (words.length >= 2 && words.length <= 3) {
        return 'cco:Person';  // Likely "FirstName LastName"
      }

      // Fall through to other detection for proper nouns we can't classify
    }

    // Priority -1: Pronoun type mapping (IEE realist specification)
    // Pronouns carry selectional presuppositions about ontological category
    if (words.length === 1 && PRONOUN_TYPE_MAPPINGS[lowerNoun]) {
      return PRONOUN_TYPE_MAPPINGS[lowerNoun];
    }

    // Priority 0: Compound noun analysis
    // If the noun phrase has multiple words, check if compound context favors process
    // e.g., "medication administration" → process (administering medication)
    //       "file organization" → process (organizing files)
    if (words.length > 1 && AMBIGUOUS_NOMINALIZATIONS[lastWord]) {
      // Check if any modifier word is a known entity type (suggests process reading)
      // "medication administration" - medication is artifact, so this is about administering it
      const modifiers = words.slice(0, -1);
      for (const modifier of modifiers) {
        // If modifier is a known entity/artifact, compound likely denotes process
        if (UNAMBIGUOUS_RESULT_NOUNS[modifier] ||
            ENTITY_TYPE_MAPPINGS[modifier] ||
            ['patient', 'file', 'data', 'drug', 'medication', 'document'].includes(modifier)) {
          return 'bfo:BFO_0000015'; // Process reading for compound
        }
      }
    }

    // Priority 1: Unambiguous result nouns - ALWAYS return the product type
    // "medication" is always the drug, "documentation" is always the document
    if (UNAMBIGUOUS_RESULT_NOUNS[lastWord]) {
      return UNAMBIGUOUS_RESULT_NOUNS[lastWord];
    }

    // Priority 2: Ambiguous nominalizations - use determiner-sensitive defaults
    // "organization" can be the company (entity) or organizing (process)
    if (AMBIGUOUS_NOMINALIZATIONS[lastWord] && context.definitenessInfo && context.fullText) {
      const nounContext = this._analyzeNounPhraseContext(
        nounText,
        context.fullText,
        context.definitenessInfo
      );

      if (nounContext.favorsProcess && nounContext.reason === 'of-complement') {
        // "organization of files" → process reading
        return 'bfo:BFO_0000015';
      }

      if (nounContext.favorsEntity) {
        // "the administration" → entity reading
        return AMBIGUOUS_NOMINALIZATIONS[lastWord];
      }

      // Bare/indefinite with ambiguous noun → default to entity (more common usage)
      // Note: v3.1 spec says default to process, but entity is safer for most cases
      return AMBIGUOUS_NOMINALIZATIONS[lastWord];
    }

    // Handle ambiguous nominalizations without context (fallback to entity reading)
    if (AMBIGUOUS_NOMINALIZATIONS[lastWord]) {
      return AMBIGUOUS_NOMINALIZATIONS[lastWord];
    }

    // Standard process detection (domain-neutral)
    const processCheck = this._checkForProcessType(lowerNoun, context);
    if (processCheck) {
      return processCheck.type;
    }

    // Check for known entity types (continuants)
    // Use word-boundary matching to avoid substring false positives
    // e.g., "demand" should NOT match "man", "command" should NOT match "man"
    // Also match common plural forms (keyword + "s" or "es")
    for (const [keyword, type] of Object.entries(ENTITY_TYPE_MAPPINGS)) {
      if (keyword === '_default') continue;
      const regex = new RegExp(`\\b${keyword}(?:e?s)?\\b`, 'i');
      if (regex.test(lowerNoun)) {
        return type;
      }
    }

    // Temporal Region detection
    // "three days" (quantity + temporal unit) → bfo:BFO_0000038 (1D Temporal Region)
    // "yesterday", "recently" → bfo:BFO_0000008 (Temporal Region)
    // "last week" (relative prefix + unit) → bfo:BFO_0000008
    const temporalType = this._checkForTemporalType(lowerNoun, words);
    if (temporalType) {
      return temporalType;
    }

    // Direct ONTOLOGICAL_VOCABULARY lookup for non-process types (ICE, GDC, etc.)
    // _checkForProcessType only returns process types; this catches the rest
    // Try exact match first, then simple singularization for plurals
    const vocabType = ONTOLOGICAL_VOCABULARY[lastWord]
      || (lastWord.endsWith('ies') ? ONTOLOGICAL_VOCABULARY[lastWord.slice(0, -3) + 'y'] : null)
      || (lastWord.endsWith('ses') || lastWord.endsWith('zes') || lastWord.endsWith('xes') || lastWord.endsWith('ches') || lastWord.endsWith('shes')
          ? ONTOLOGICAL_VOCABULARY[lastWord.slice(0, -2)] : null)
      || (lastWord.endsWith('s') && !lastWord.endsWith('ss') ? ONTOLOGICAL_VOCABULARY[lastWord.slice(0, -1)] : null);
    if (vocabType && vocabType !== 'bfo:BFO_0000015') {
      return vocabType;
    }

    return ENTITY_TYPE_MAPPINGS['_default'];
  }

  /**
   * Determine referential status based on context
   * @param {Object} definitenessInfo - Definiteness info
   * @param {string} nounText - The noun text
   * @param {string} fullText - Full input text
   * @param {number} index - Entity index in sequence
   * @returns {string} Referential status
   */
  _determineReferentialStatus(definitenessInfo, nounText, fullText, index) {
    const lowerText = fullText.toLowerCase();
    const lowerNoun = nounText.toLowerCase().trim();

    // Modal adjectives on the noun itself → hypothetical
    // "possible diabetes", "suspected infection", "likely pneumonia"
    const modalAdjectives = ['possible', 'likely', 'probable', 'suspected', 'potential',
      'presumed', 'apparent', 'alleged', 'uncertain', 'questionable'];
    const firstWord = lowerNoun.split(/\s+/)[0];
    if (modalAdjectives.includes(firstWord)) {
      return 'hypothetical';
    }

    // Hypothetical markers in surrounding context
    const hypotheticalMarkers = ['if', 'would', 'could', 'might', 'suppose', 'assuming', 'hypothetically'];
    for (const marker of hypotheticalMarkers) {
      if (lowerText.includes(marker)) {
        // Check if marker is near this noun
        const nounIndex = lowerText.indexOf(nounText.toLowerCase());
        const markerIndex = lowerText.indexOf(marker);
        if (markerIndex !== -1 && markerIndex < nounIndex && (nounIndex - markerIndex) < 50) {
          return 'hypothetical';
        }
      }
    }

    // Anaphoric: pronouns or "the [noun]" when noun was mentioned before
    const pronouns = ['he', 'she', 'it', 'they', 'him', 'her', 'them', 'his', 'their'];
    if (pronouns.includes(nounText.toLowerCase())) {
      return 'anaphoric';
    }

    // If definite and not first mention, likely presupposed
    if (definitenessInfo.definiteness === 'definite') {
      return 'presupposed';
    }

    // Indefinite typically introduces new referent
    return 'introduced';
  }

  /**
   * Get span offset for entity in text
   * @param {string} fullText - Full input text
   * @param {string} entityText - Entity text
   * @param {number} index - Entity index
   * @returns {number} Character offset
   */
  _getSpanOffset(fullText, entityText, index) {
    const lowerText = fullText.toLowerCase();
    const lowerEntity = entityText.toLowerCase();

    let offset = 0;
    let searchStart = 0;

    // Find nth occurrence
    for (let i = 0; i <= index; i++) {
      const found = lowerText.indexOf(lowerEntity, searchStart);
      if (found === -1) break;
      offset = found;
      searchStart = found + 1;
    }

    return offset;
  }

  /**
   * Create a DiscourseReferent node (Tier 1)
   *
   * v2.2 spec properties:
   * - sourceText, startPosition, endPosition (instead of extracted_from_span, span_offset)
   * - denotesType kept for backward compatibility (deprecated; use is_about to Tier 2)
   *
   * V7-006: Multi-type classification
   * - @type array includes both DiscourseReferent AND specific CCO/BFO types
   * - Follows RoleDetector pattern for multi-type entities
   *
   * @param {Object} entityInfo - Entity information
   * @returns {Object} DiscourseReferent node
   */
  _createDiscourseReferent(entityInfo) {
    // Generate IRI
    let iri;
    if (this.graphBuilder) {
      iri = this.graphBuilder.generateIRI(
        entityInfo.text,
        'DiscourseReferent',
        entityInfo.offset
      );
    } else {
      // Fallback simple IRI
      const cleanText = entityInfo.text.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
      iri = `inst:${cleanText}_Referent_${entityInfo.offset}`;
    }

    // Calculate end position
    const endPosition = entityInfo.offset + entityInfo.text.length;

    // V7-006: Build @type array with specific CCO/BFO type + DiscourseReferent
    // Similar to RoleDetector's multi-type pattern
    const types = [];

    // Add specific CCO/BFO type first (e.g., cco:Person, cco:Artifact)
    if (entityInfo.entityType) {
      types.push(entityInfo.entityType);
    }

    // Add DiscourseReferent (discourse-level classification)
    types.push('tagteam:DiscourseReferent');

    // Add owl:NamedIndividual (OWL requirement)
    types.push('owl:NamedIndividual');

    // Build node with v2.2 properties
    const node = {
      '@id': iri,
      '@type': types,
      'rdfs:label': entityInfo.text,

      // v2.2 position properties
      'tagteam:sourceText': entityInfo.text,
      'tagteam:startPosition': entityInfo.offset,
      'tagteam:endPosition': endPosition,

      // Discourse properties
      'tagteam:definiteness': entityInfo.definiteness,
      'tagteam:referentialStatus': entityInfo.referentialStatus,

      // Legacy compatibility: denotesType (deprecated in v2.2, use is_about instead)
      // Kept for backward compatibility with existing tests
      'tagteam:denotesType': entityInfo.entityType
    };

    // Add scarcity if detected
    if (entityInfo.scarcity && entityInfo.scarcity.isScarce) {
      node['tagteam:is_scarce'] = true;
      node['tagteam:scarcity_marker'] = entityInfo.scarcity.marker;
    }

    // Add quantity if detected
    if (entityInfo.quantity && entityInfo.quantity.quantity !== null) {
      node['tagteam:quantity'] = entityInfo.quantity.quantity;
    }

    // Add temporal unit if this is a temporal entity
    if (entityInfo.temporalUnit) {
      node['tagteam:unit'] = entityInfo.temporalUnit;
    }

    // ENH-001: Add typeRefinedBy if entity type was refined by verb context
    if (entityInfo.typeRefinedBy) {
      node['tagteam:typeRefinedBy'] = entityInfo.typeRefinedBy;
    }

    // ENH-015: Add introducing preposition for role mapping
    if (entityInfo.introducingPreposition) {
      node['tagteam:introducingPreposition'] = entityInfo.introducingPreposition;
    }

    return node;
  }

  /**
   * Set the graph builder for IRI generation
   * @param {Object} graphBuilder - SemanticGraphBuilder instance
   */
  setGraphBuilder(graphBuilder) {
    this.graphBuilder = graphBuilder;
    this.tier2Factory.setGraphBuilder(graphBuilder);
  }

  /**
   * Set the document IRI for Tier 2 entity scoping
   * @param {string} documentIRI - Document/IBE IRI
   */
  setDocumentIRI(documentIRI) {
    this.tier2Factory.setDocumentIRI(documentIRI);
  }

  /**
   * Get the Tier 2 factory for direct access
   * @returns {RealWorldEntityFactory} The factory instance
   */
  getTier2Factory() {
    return this.tier2Factory;
  }

  /**
   * Set the domain config loader for type specialization
   *
   * Phase 2: When a config loader is set, domain-specific process words
   * are loaded from the config instead of using the deprecated
   * DOMAIN_PROCESS_WORDS constant.
   *
   * @param {Object|null} configLoader - DomainConfigLoader instance or null to clear
   */
  setConfigLoader(configLoader) {
    this.configLoader = configLoader;
  }

  /**
   * Get domain-specific type from config loader
   *
   * @param {string} term - The term to look up
   * @param {string} bfoType - The BFO base type
   * @returns {string|null} Specialized type or null
   * @private
   */
  _getConfigSpecializedType(term, bfoType) {
    if (!this.configLoader || !this.configLoader.isConfigLoaded()) {
      return null;
    }

    // First check process root words (domain-specific terms like "care", "surgery")
    const processType = this.configLoader.getProcessRootWord(term);
    if (processType) {
      return processType;
    }

    // Then check type specializations for the BFO type
    return this.configLoader.getTypeSpecialization(bfoType, term);
  }
}

module.exports = EntityExtractor;
