/**
 * SelectionalPreferences - Phase 6.0
 *
 * Centralizes verb→argument requirements for semantic role validation.
 * Used by AmbiguityDetector to determine selectional violations.
 *
 * This module replaces ad-hoc verb classification with a structured lookup
 * table that properly handles organizations, institutions, and collectives
 * as valid agents for mental/communication acts.
 *
 * @example
 * const prefs = new SelectionalPreferences();
 * prefs.isValidAgent('decide', 'committee'); // true (org can decide)
 * prefs.isValidAgent('decide', 'rock');      // false (inanimate can't)
 * prefs.isValidAgent('lift', 'committee');   // false (org can't physically lift)
 */

// Verb classes with their selectional requirements
const VERB_CLASSES = {
  // Mental acts requiring animate/organization agents
  intentional_mental: {
    verbs: new Set([
      'decide', 'believe', 'intend', 'think', 'consider', 'judge',
      'evaluate', 'assess', 'plan', 'hope', 'wish', 'choose',
      'determine', 'conclude', 'assume', 'suspect', 'doubt',
      'prefer', 'want', 'need', 'desire', 'expect', 'anticipate',
      'know', 'understand', 'realize', 'recognize', 'remember',
      'forget', 'learn', 'discover', 'notice', 'perceive', 'fear'
    ]),
    subjectRequirement: ['animate', 'organization', 'collective'],
    subjectForbidden: ['inanimate', 'abstract'],
    objectRequirement: null,  // Mental verbs have loose object constraints
    ontologyType: 'MentalAct'
  },

  // Physical acts requiring animate agents (NOT organizations)
  intentional_physical: {
    verbs: new Set([
      'lift', 'throw', 'carry', 'push', 'pull', 'hit', 'kick',
      'jump', 'climb', 'cut', 'break', 'touch',
      'grasp', 'hold', 'grab', 'drop', 'catch', 'shake',
      'bend', 'stretch', 'squeeze', 'tear', 'rip', 'fold',
      'eat', 'drink', 'swim', 'fly'
      // Note: 'walk', 'run', 'breathe', 'sleep' are motion/state verbs, not in this class
    ]),
    subjectRequirement: ['animate'],
    subjectForbidden: ['inanimate', 'abstract', 'organization'],
    objectRequirement: ['material_entity', 'inanimate'],  // Physical objects
    objectForbidden: ['abstract'],
    ontologyType: 'PhysicalAct'
  },

  // Communication acts (organizations can communicate)
  communication: {
    verbs: new Set([
      'announce', 'report', 'claim', 'state', 'declare', 'tell',
      'inform', 'ask', 'request', 'promise', 'warn', 'advise',
      'suggest', 'recommend', 'propose', 'order', 'command',
      'forbid', 'permit', 'authorize', 'deny', 'confirm', 'reject',
      'say', 'speak', 'write', 'publish', 'broadcast', 'notify',
      'respond', 'reply', 'answer', 'explain', 'describe', 'assert',
      'indicate', 'show', 'reveal', 'demonstrate', 'imply', 'point'
    ]),
    subjectRequirement: ['animate', 'organization', 'collective'],
    subjectForbidden: ['inanimate'],
    objectRequirement: null,  // Can announce anything
    ontologyType: 'CommunicativeAct'
  },

  // Transfer acts (organizations can transfer)
  transfer: {
    verbs: new Set([
      'give', 'allocate', 'assign', 'distribute', 'provide',
      'deliver', 'send', 'offer', 'grant', 'donate', 'lend',
      'return', 'transfer', 'convey', 'supply', 'furnish',
      'award', 'bestow', 'contribute', 'share', 'pass'
    ]),
    subjectRequirement: ['animate', 'organization', 'collective'],
    subjectForbidden: ['inanimate', 'abstract'],
    objectRequirement: null,  // Can transfer many things - be permissive
    ontologyType: 'TransferAct'
  },

  // Employment/organizational acts
  employment: {
    verbs: new Set([
      'hire', 'fire', 'employ', 'appoint', 'dismiss', 'recruit',
      'promote', 'demote', 'transfer', 'assign', 'terminate',
      'suspend', 'reinstate', 'retire', 'resign', 'layoff'
    ]),
    subjectRequirement: ['animate', 'organization'],
    objectRequirement: ['animate'],
    ontologyType: 'OrganizationalAct'
  },

  // Governance/policy acts
  governance: {
    verbs: new Set([
      'govern', 'regulate', 'legislate', 'enforce', 'implement',
      'enact', 'ratify', 'amend', 'repeal', 'veto', 'override',
      'review', 'audit', 'investigate', 'sanction', 'penalize',
      'certify', 'accredit', 'license', 'ban', 'prohibit'
    ]),
    subjectRequirement: ['animate', 'organization'],
    objectRequirement: null,
    ontologyType: 'GovernanceAct'
  },

  // Creation/production acts
  creation: {
    verbs: new Set([
      'create', 'make', 'build', 'construct', 'produce', 'manufacture',
      'design', 'develop', 'invent', 'compose', 'write', 'draw',
      'paint', 'sculpt', 'craft', 'assemble', 'fabricate',
      'generate', 'synthesize', 'formulate', 'establish', 'found'
    ]),
    subjectRequirement: ['animate', 'organization'],
    objectRequirement: ['continuant'],
    ontologyType: 'CreationAct'
  },

  // Perception acts (animate only, not organizations)
  perception: {
    verbs: new Set([
      'see', 'hear', 'smell', 'taste', 'feel', 'sense',
      'watch', 'observe', 'look', 'listen', 'view', 'witness',
      'detect', 'perceive', 'experience', 'undergo'
    ]),
    subjectRequirement: ['animate'],
    objectRequirement: null,
    ontologyType: 'PerceptionAct'
  },

  // Causation (any subject can cause - even inanimate)
  causation: {
    verbs: new Set([
      'cause', 'create', 'produce', 'generate', 'make',
      'trigger', 'induce', 'bring', 'result', 'lead',
      'provoke', 'spark', 'initiate', 'start', 'begin'
    ]),
    subjectRequirement: null,  // Any subject allowed (storms can cause)
    subjectForbidden: [],
    objectRequirement: null,
    ontologyType: 'Process'
  },

  // Stative/relational (broad subject requirements)
  stative: {
    verbs: new Set([
      'be', 'have', 'own', 'possess', 'contain', 'include',
      'consist', 'comprise', 'belong', 'exist', 'remain',
      'seem', 'appear', 'look', 'sound', 'feel',
      'cost', 'weigh', 'measure', 'equal', 'represent'
    ]),
    subjectRequirement: null, // Any subject allowed
    subjectForbidden: [],
    objectRequirement: null,
    ontologyType: 'RelationalQuality'
  }
};

// Entity categories for validation
const ENTITY_CATEGORIES = {
  // Animate entities (persons, animals)
  animate: new Set([
    'person', 'doctor', 'patient', 'nurse', 'surgeon', 'physician',
    'man', 'woman', 'child', 'adult', 'human', 'individual',
    'employee', 'worker', 'staff', 'member', 'colleague', 'friend',
    'manager', 'director', 'executive', 'administrator', 'official',
    'judge', 'lawyer', 'attorney', 'officer', 'agent', 'representative',
    'student', 'teacher', 'professor', 'researcher', 'scientist',
    'customer', 'client', 'user', 'consumer', 'citizen', 'resident',
    'he', 'she', 'they', 'i', 'we', 'you', 'one',
    'someone', 'anyone', 'everyone', 'nobody', 'somebody', 'whoever',
    'family'  // family can also be collective but is primarily animate
  ]),

  // Organizations (can perform mental, communication, transfer acts)
  organization: new Set([
    'organization', 'company', 'corporation', 'firm', 'business',
    'committee', 'board', 'council', 'commission', 'panel', 'team',
    'government', 'administration', 'agency', 'department', 'bureau',
    'hospital', 'clinic', 'institution', 'university', 'school', 'college',
    'court', 'legislature', 'parliament', 'congress', 'senate',
    'bank', 'foundation', 'charity', 'nonprofit', 'ngo',
    'group', 'association', 'society', 'union', 'federation',
    'industry', 'sector', 'market', 'media', 'press',
    // Metonymic locations that refer to institutions
    'house', 'office', 'bench', 'bar', 'chair'
  ]),

  // Collective (groups that can act as one, subset of animate)
  collective: new Set([
    'family', 'group', 'team', 'staff', 'crew', 'public',
    'committee', 'board', 'council', 'panel', 'jury',
    'audience', 'crowd', 'population', 'community', 'society'
  ]),

  // Material entities (physical objects that can be transferred, moved, etc.)
  material_entity: new Set([
    'ventilator', 'medication', 'equipment', 'device', 'machine',
    'tool', 'instrument', 'apparatus', 'appliance', 'mechanism',
    'vehicle', 'car', 'truck', 'bus', 'plane', 'ship', 'boat',
    'building', 'structure', 'facility', 'room', 'floor',
    'table', 'chair', 'desk', 'bed', 'door', 'window',
    'computer', 'phone', 'screen', 'keyboard', 'monitor',
    'file', 'document', 'report', 'form', 'record', 'paper',
    'resource', 'resources', 'material', 'substance', 'item', 'object', 'thing',
    'food', 'water', 'medicine', 'drug', 'treatment',
    'box', 'package', 'container', 'bag', 'case',
    'organ', 'tissue', 'blood', 'sample', 'specimen',
    'money', 'funds', 'payment', 'gift', 'donation',
    'care', 'service', 'support', 'aid', 'assistance'  // Abstract but transferable
  ]),

  // Inanimate (cannot be agents of intentional acts)
  inanimate: new Set([
    'rock', 'stone', 'mineral', 'crystal', 'gem',
    'wall', 'floor', 'ceiling', 'ground', 'earth', 'soil',
    'water', 'air', 'fire', 'ice', 'steam', 'gas', 'liquid',
    'metal', 'plastic', 'glass', 'wood', 'concrete', 'brick',
    'data', 'information', 'result', 'outcome', 'statistic',
    'number', 'figure', 'percentage', 'ratio', 'rate',
    'weather', 'climate', 'temperature', 'pressure', 'humidity',
    'ventilator', 'machine', 'equipment', 'device', 'apparatus',
    'table', 'chair', 'desk', 'furniture'
  ]),

  // Abstract entities (concepts, qualities)
  abstract: new Set([
    'justice', 'truth', 'beauty', 'freedom', 'democracy', 'equality',
    'fairness', 'honesty', 'loyalty', 'courage', 'wisdom', 'knowledge',
    'idea', 'concept', 'theory', 'principle', 'policy', 'law', 'rule',
    'reason', 'logic', 'evidence', 'fact', 'belief', 'opinion',
    'right', 'duty', 'obligation', 'responsibility', 'authority',
    'power', 'control', 'influence', 'impact', 'effect', 'cause',
    'time', 'space', 'distance', 'speed', 'duration', 'period',
    'situation', 'condition', 'state', 'status', 'circumstance'
  ]),

  // Propositions/content (can be objects of communication)
  proposition: new Set([
    'that', 'whether', 'if', 'what', 'how', 'why', 'when', 'where',
    'statement', 'claim', 'assertion', 'argument', 'point',
    'question', 'answer', 'response', 'reply', 'explanation',
    'decision', 'choice', 'verdict', 'ruling', 'judgment',
    'proposal', 'suggestion', 'recommendation', 'advice',
    'news', 'announcement', 'notice', 'warning', 'alert'
  ])
};

class SelectionalPreferences {
  constructor(config = {}) {
    this.config = config;
    this.verbClasses = VERB_CLASSES;
    this.entityCategories = ENTITY_CATEGORIES;

    // Build reverse lookup: verb -> class
    this._verbToClass = new Map();
    for (const [className, classData] of Object.entries(VERB_CLASSES)) {
      for (const verb of classData.verbs) {
        this._verbToClass.set(verb, className);
      }
    }
  }

  /**
   * Get the verb class for a given verb
   * @param {string} verb - The verb lemma
   * @returns {string|null} The verb class name or null if not found
   */
  getVerbClass(verb) {
    if (!verb) return null;
    const lowerVerb = verb.toLowerCase();

    // Direct lookup
    if (this._verbToClass.has(lowerVerb)) {
      return this._verbToClass.get(lowerVerb);
    }

    // Try base form extraction for inflected verbs
    const baseForm = this._getBaseVerb(lowerVerb);
    if (baseForm !== lowerVerb && this._verbToClass.has(baseForm)) {
      return this._verbToClass.get(baseForm);
    }

    return null;
  }

  /**
   * Get the subject requirement for a verb
   * @param {string} verb - The verb lemma
   * @returns {Array|null} Array of allowed entity categories or null if no restriction
   */
  getSubjectRequirement(verb) {
    const verbClass = this.getVerbClass(verb);
    if (!verbClass) return null;

    return this.verbClasses[verbClass].subjectRequirement;
  }

  /**
   * Get the object requirement for a verb
   * @param {string} verb - The verb lemma
   * @returns {Array|null} Array of allowed entity categories or null if no restriction
   */
  getObjectRequirement(verb) {
    const verbClass = this.getVerbClass(verb);
    if (!verbClass) return null;

    return this.verbClasses[verbClass].objectRequirement;
  }

  /**
   * Get the ontology type for a verb class
   * @param {string} verb - The verb lemma
   * @returns {string|null} The BFO/CCO ontology type
   */
  getOntologyType(verb) {
    const verbClass = this.getVerbClass(verb);
    if (!verbClass) return null;

    return this.verbClasses[verbClass].ontologyType;
  }

  /**
   * Check if an entity type is valid as an agent for a verb
   * @param {string} verb - The verb lemma
   * @param {string} entityType - The entity type or noun
   * @returns {boolean} True if the entity can be an agent for this verb
   */
  isValidAgent(verb, entityType) {
    const requirement = this.getSubjectRequirement(verb);

    // No requirement means any agent is valid
    if (!requirement) return true;

    // Get the category of the entity
    const category = this.getEntityCategory(entityType);

    // Check if entity category is in allowed list
    return requirement.includes(category);
  }

  /**
   * Check if an entity type is valid as a patient/object for a verb
   * @param {string} verb - The verb lemma
   * @param {string} entityType - The entity type or noun
   * @returns {boolean} True if the entity can be an object for this verb
   */
  isValidPatient(verb, entityType) {
    const requirement = this.getObjectRequirement(verb);

    // No requirement means any object is valid
    if (!requirement) return true;

    // Get the category of the entity
    const category = this.getEntityCategory(entityType);

    // Check if entity category is in allowed list
    return requirement.includes(category);
  }

  /**
   * Get the category of an entity based on its noun/type (returns single category)
   * @param {string} entityType - The entity type or noun
   * @returns {string} The category: 'animate', 'organization', 'inanimate', 'abstract', etc.
   */
  getEntityCategory(entityType) {
    if (!entityType) return 'unknown';

    const lowerType = entityType.toLowerCase();

    // Check each category
    if (this.entityCategories.animate.has(lowerType)) return 'animate';
    if (this.entityCategories.organization.has(lowerType)) return 'organization';
    if (this.entityCategories.material_entity.has(lowerType)) return 'material_entity';
    if (this.entityCategories.inanimate.has(lowerType)) return 'inanimate';
    if (this.entityCategories.abstract.has(lowerType)) return 'abstract';
    if (this.entityCategories.proposition.has(lowerType)) return 'proposition';

    // Default heuristics for unknown words
    // Words ending in -er/-or often denote agents (person nouns)
    if (lowerType.endsWith('er') || lowerType.endsWith('or')) {
      // But not if they're clearly objects like 'computer', 'motor'
      if (!this.entityCategories.material_entity.has(lowerType)) {
        return 'animate';
      }
    }

    // Words ending in -tion/-ment/-ness are often abstract
    if (lowerType.endsWith('tion') || lowerType.endsWith('ment') ||
        lowerType.endsWith('ness') || lowerType.endsWith('ity')) {
      return 'abstract';
    }

    // Default to inanimate for unknown
    return 'inanimate';
  }

  /**
   * Get all matching categories for an entity (returns array)
   * @param {Object|string} entity - Entity object with type/label or string
   * @returns {string[]} Array of matching category names
   */
  getEntityCategories(entity) {
    if (!entity) return ['unknown'];
    if (typeof entity === 'string') {
      const cat = this.getEntityCategory(entity);
      return cat === 'unknown' ? ['unknown'] : [cat];
    }

    const categories = new Set();
    const label = this._extractLabel(entity);
    const type = this._extractType(entity);

    // Check type first (more reliable)
    if (type) {
      if (type.includes('Person') || type.includes('Organism')) {
        categories.add('animate');
      }
      if (type.includes('Organization') || type.includes('GroupOfPersons')) {
        categories.add('organization');
        categories.add('collective');
      }
      if (type.includes('Quality') || type.includes('GenericallyDependentContinuant')) {
        categories.add('abstract');
      }
      if (type.includes('MaterialEntity')) {
        // MaterialEntity is a broad type - check label for more specificity
        const labelCat = label ? this.getEntityCategory(label) : null;
        if (labelCat === 'animate' || labelCat === 'organization') {
          categories.add(labelCat);
        } else {
          categories.add('material_entity');
          // Also add inanimate if the label is in the inanimate list
          if (label && this.entityCategories.inanimate.has(label.toLowerCase())) {
            categories.add('inanimate');
          }
        }
      }
    }

    // Check label
    if (label) {
      const lowerLabel = label.toLowerCase();

      // Handle multi-word labels like "The White House"
      const words = lowerLabel.split(/\s+/);
      const lastWord = words[words.length - 1];

      // Check for metonymic patterns (government institutions referred to by location)
      if (this._isMetonymicOrganization(label)) {
        categories.add('organization');
      }

      // Check each category
      for (const [catName, catSet] of Object.entries(this.entityCategories)) {
        if (catSet.has(lowerLabel) || catSet.has(lastWord)) {
          categories.add(catName);
        }
      }

      // Apply heuristics if nothing found
      if (categories.size === 0) {
        const heuristicCat = this.getEntityCategory(label);
        if (heuristicCat !== 'unknown') {
          categories.add(heuristicCat);
        }
      }
    }

    // Default to unknown if nothing found
    if (categories.size === 0) {
      return ['unknown'];
    }

    return Array.from(categories);
  }

  /**
   * Check if subject is valid for verb with confidence score
   * @param {string} verb - The verb lemma
   * @param {Object|string} entity - Entity object or string
   * @returns {Object} { valid: boolean, confidence: number, reason: string }
   */
  checkSubject(verb, entity) {
    // Handle edge cases
    if (!verb || verb === '') {
      return { valid: true, confidence: 0, reason: 'Empty verb - no validation possible' };
    }
    if (entity === null || entity === undefined) {
      return { valid: true, confidence: 0, reason: 'Null entity - no validation possible' };
    }
    if (typeof entity === 'object' && Object.keys(entity).length === 0) {
      return { valid: true, confidence: 0.5, reason: 'Empty entity - defaulting to permissive' };
    }

    const verbClass = this.getVerbClass(verb);
    const entityCategories = this.getEntityCategories(entity);

    // Unknown verb - be permissive
    if (!verbClass) {
      return {
        valid: true,
        confidence: 0.5,
        reason: `Unknown verb '${verb}' - no selectional constraints defined`
      };
    }

    const classData = this.verbClasses[verbClass];
    const requirement = classData.subjectRequirement;
    const forbidden = classData.subjectForbidden || [];

    // No requirement means any subject is valid
    if (!requirement) {
      return {
        valid: true,
        confidence: 0.8,
        reason: `Verb class '${verbClass}' allows any subject`
      };
    }

    // Check if any entity category is forbidden
    for (const cat of entityCategories) {
      if (forbidden.includes(cat)) {
        return {
          valid: false,
          confidence: 0.9,
          reason: `Category '${cat}' is forbidden for '${verbClass}' verbs`
        };
      }
    }

    // Check if any entity category matches requirement
    const hasMatch = entityCategories.some(cat => requirement.includes(cat));

    if (hasMatch) {
      // Higher confidence for type-based matches vs label heuristics
      const hasTypeMatch = this._extractType(entity) !== null;
      return {
        valid: true,
        confidence: hasTypeMatch ? 0.95 : 0.9,
        reason: `Entity matches required categories: ${requirement.join(', ')}`
      };
    }

    // No match - check if it's a clear violation or just unknown
    if (entityCategories.includes('unknown')) {
      return {
        valid: true,
        confidence: 0.5,
        reason: 'Unknown entity category - defaulting to permissive'
      };
    }

    return {
      valid: false,
      confidence: 0.85,
      reason: `Entity categories [${entityCategories.join(', ')}] don't match required [${requirement.join(', ')}]`
    };
  }

  /**
   * Check if object is valid for verb with confidence score
   * @param {string} verb - The verb lemma
   * @param {Object|string} entity - Entity object or string
   * @returns {Object} { valid: boolean, confidence: number, reason: string }
   */
  checkObject(verb, entity) {
    // Handle edge cases
    if (!verb || verb === '') {
      return { valid: true, confidence: 0, reason: 'Empty verb - no validation possible' };
    }
    if (!entity) {
      return { valid: true, confidence: 0.5, reason: 'No object provided' };
    }

    const verbClass = this.getVerbClass(verb);
    const entityCategories = this.getEntityCategories(entity);

    // Unknown verb - be permissive
    if (!verbClass) {
      return {
        valid: true,
        confidence: 0.5,
        reason: `Unknown verb '${verb}' - no selectional constraints defined`
      };
    }

    const classData = this.verbClasses[verbClass];
    const requirement = classData.objectRequirement;

    // No requirement means any object is valid
    if (!requirement) {
      return {
        valid: true,
        confidence: 0.7,
        reason: `Verb class '${verbClass}' allows any object`
      };
    }

    // Check if any entity category matches requirement
    const hasMatch = entityCategories.some(cat => requirement.includes(cat));

    if (hasMatch) {
      return {
        valid: true,
        confidence: 0.9,
        reason: `Object matches required categories: ${requirement.join(', ')}`
      };
    }

    // Check for abstract entity with physical verb
    if (entityCategories.includes('abstract')) {
      const physicalClasses = ['intentional_physical'];
      if (physicalClasses.includes(verbClass)) {
        return {
          valid: false,
          confidence: 0.85,
          reason: `Abstract entities cannot be objects of physical actions`
        };
      }
    }

    // No match - but be more permissive for objects than subjects
    if (entityCategories.includes('unknown')) {
      return {
        valid: true,
        confidence: 0.5,
        reason: 'Unknown entity category - defaulting to permissive'
      };
    }

    return {
      valid: false,
      confidence: 0.8,
      reason: `Object categories [${entityCategories.join(', ')}] don't match required [${requirement.join(', ')}]`
    };
  }

  /**
   * Add an entity keyword to a category
   * @param {string} category - The category name
   * @param {string} keyword - The keyword to add
   * @returns {boolean} True if added successfully
   */
  addEntityKeyword(category, keyword) {
    if (!this.entityCategories[category]) {
      // Create new category if it doesn't exist
      this.entityCategories[category] = new Set();
    }
    this.entityCategories[category].add(keyword.toLowerCase());
    return true;
  }

  /**
   * Check if an entity is animate (includes organizations)
   * @param {string} entityType - The entity type or noun
   * @returns {boolean}
   */
  isAnimate(entityType) {
    const category = this.getEntityCategory(entityType);
    return category === 'animate';
  }

  /**
   * Check if an entity is an organization
   * @param {string} entityType - The entity type or noun
   * @returns {boolean}
   */
  isOrganization(entityType) {
    const category = this.getEntityCategory(entityType);
    return category === 'organization';
  }

  /**
   * Check if an entity is inanimate (not animate, not organization, not abstract)
   * @param {string} entityType - The entity type or noun
   * @returns {boolean}
   */
  isInanimate(entityType) {
    const category = this.getEntityCategory(entityType);
    return category === 'inanimate' || category === 'material_entity';
  }

  /**
   * Check if an entity is abstract
   * @param {string} entityType - The entity type or noun
   * @returns {boolean}
   */
  isAbstract(entityType) {
    const category = this.getEntityCategory(entityType);
    return category === 'abstract';
  }

  /**
   * Get selectional violation info if any
   * @param {string} verb - The verb lemma
   * @param {string} agentType - The agent entity type
   * @param {string} patientType - The patient entity type (optional)
   * @returns {Object|null} Violation info or null if valid
   */
  getViolation(verb, agentType, patientType = null) {
    const verbClass = this.getVerbClass(verb);
    const agentCategory = this.getEntityCategory(agentType);

    // Check agent violation
    if (!this.isValidAgent(verb, agentType)) {
      const requirement = this.getSubjectRequirement(verb);

      // Determine signal based on agent category and verb class
      let signal;
      if (agentCategory === 'inanimate' || agentCategory === 'material_entity') {
        signal = 'inanimate_agent';
      } else if (agentCategory === 'abstract') {
        // More specific signal for abstract agents with physical verbs
        if (verbClass === 'intentional_physical' || verbClass === 'perception') {
          signal = 'abstract_physical_actor';
        } else {
          signal = 'abstract_agent';
        }
      } else {
        signal = 'invalid_agent';
      }

      return {
        type: 'agent_violation',
        signal: signal,
        verb: verb,
        verbClass: verbClass,
        agentType: agentType,
        agentCategory: agentCategory,
        requirement: requirement,
        ontologyConstraint: this._getOntologyConstraint(verbClass, agentCategory)
      };
    }

    // Check patient violation if patient provided
    if (patientType && !this.isValidPatient(verb, patientType)) {
      const requirement = this.getObjectRequirement(verb);
      const patientCategory = this.getEntityCategory(patientType);
      return {
        type: 'patient_violation',
        signal: 'invalid_patient',
        verb: verb,
        verbClass: verbClass,
        patientType: patientType,
        patientCategory: patientCategory,
        requirement: requirement
      };
    }

    return null;
  }

  /**
   * Get all verbs in a specific class
   * @param {string} className - The verb class name
   * @returns {Set|null} Set of verbs or null if class not found
   */
  getVerbsInClass(className) {
    if (!this.verbClasses[className]) return null;
    return new Set(this.verbClasses[className].verbs);
  }

  /**
   * Get all entity category names
   * @returns {Array} Array of category names
   */
  getEntityCategoryNames() {
    return Object.keys(this.entityCategories);
  }

  /**
   * Get all verb class names
   * @returns {Array} Array of verb class names
   */
  getVerbClassNames() {
    return Object.keys(this.verbClasses);
  }

  /**
   * Add a verb to a class (for extensibility)
   * @param {string} verb - The verb to add
   * @param {string} className - The class to add it to
   * @returns {boolean} True if added successfully
   */
  addVerb(verb, className) {
    if (!this.verbClasses[className]) return false;

    const lowerVerb = verb.toLowerCase();
    this.verbClasses[className].verbs.add(lowerVerb);
    this._verbToClass.set(lowerVerb, className);
    return true;
  }

  /**
   * Add an entity to a category (for extensibility)
   * @param {string} entity - The entity noun to add
   * @param {string} category - The category to add it to
   * @returns {boolean} True if added successfully
   */
  addEntity(entity, category) {
    if (!this.entityCategories[category]) return false;

    this.entityCategories[category].add(entity.toLowerCase());
    return true;
  }

  // ============ Private Helpers ============

  /**
   * Extract label from entity object
   * @private
   */
  _extractLabel(entity) {
    if (!entity) return null;
    if (typeof entity === 'string') return entity;
    return entity.label || entity['rdfs:label'] || entity.name || null;
  }

  /**
   * Extract type from entity object
   * @private
   */
  _extractType(entity) {
    if (!entity) return null;
    if (typeof entity === 'string') return null;
    return entity.type || entity['@type'] || entity.denotesType || null;
  }

  /**
   * Check if a label represents a metonymic organization reference
   * @private
   */
  _isMetonymicOrganization(label) {
    if (!label) return false;
    const lowerLabel = label.toLowerCase();

    // Known metonymic references
    const metonymicPatterns = [
      'white house', 'kremlin', 'pentagon', 'downing street',
      'capitol', 'wall street', 'city hall', 'state department',
      'foreign office', 'ministry', 'palace'
    ];

    return metonymicPatterns.some(p => lowerLabel.includes(p));
  }

  /**
   * Get approximate base form of a verb
   * @private
   */
  _getBaseVerb(verb) {
    const v = verb.toLowerCase();

    // Handle -ed endings
    if (v.endsWith('ied')) return v.slice(0, -3) + 'y';
    if (v.endsWith('ed')) {
      if (v.length > 4 && v[v.length - 3] === v[v.length - 4]) {
        return v.slice(0, -3);
      }
      const withoutEd = v.slice(0, -2);
      return withoutEd + 'e';
    }

    // Handle -ing endings
    if (v.endsWith('ing')) {
      const withoutIng = v.slice(0, -3);
      if (withoutIng.length > 2 && withoutIng[withoutIng.length - 1] === withoutIng[withoutIng.length - 2]) {
        return withoutIng.slice(0, -1);
      }
      return withoutIng + 'e';
    }

    // Handle -s endings
    if (v.endsWith('ies')) return v.slice(0, -3) + 'y';
    // Only strip -es for sibilant endings (goes, watches, buzzes, washes)
    // NOT for verbs like "decides" where base ends in 'e'
    if (v.endsWith('es')) {
      // Check if this is a sibilant -es ending
      const beforeEs = v.slice(-3, -2);
      if ('sxzho'.includes(beforeEs) || v.endsWith('ches') || v.endsWith('shes')) {
        return v.slice(0, -2);
      }
      // Otherwise, likely a verb ending in silent-e + s (decides -> decide)
      return v.slice(0, -1);
    }
    if (v.endsWith('s') && v.length > 3) return v.slice(0, -1);

    return v;
  }

  /**
   * Get ontology constraint message for a violation
   * @private
   */
  _getOntologyConstraint(verbClass, agentCategory) {
    if (agentCategory === 'inanimate' || agentCategory === 'material_entity') {
      return 'bfo:Agent requires bfo:MaterialEntity with has_function capability';
    }
    if (agentCategory === 'abstract') {
      return 'bfo:Agent requires Agent (animate or organizational entity)';
    }
    if (verbClass === 'intentional_physical') {
      return 'PhysicalAct requires animate agent with physical capability';
    }
    if (verbClass === 'perception') {
      return 'PerceptionAct requires animate agent with sensory capability';
    }
    return 'Selectional constraint violation';
  }
}

// Export for both Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SelectionalPreferences;
}
if (typeof window !== 'undefined') {
  window.SelectionalPreferences = SelectionalPreferences;
}
