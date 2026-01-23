/**
 * AmbiguityDetector - Phase 5.3
 *
 * Identifies potentially ambiguous spans in parsed output.
 * Does NOT resolve ambiguity - only flags it for Phase 6 lattice.
 *
 * Ambiguity Types:
 * - noun_category: Nominalizations ambiguous between process/continuant
 * - modal_force: Modal verbs ambiguous between deontic/epistemic
 * - scope: Quantifier + negation scope ambiguity
 * - selectional_violation: Categorical constraint violations
 * - selectional_preference: Soft constraint notes
 * - potential_metonymy: Possible metonymic usage
 * - verb_sense: Multiple selectional matches for verb
 *
 * @example
 * const detector = new AmbiguityDetector();
 * const report = detector.detect(text, entities, acts, roles);
 */

const AmbiguityReport = require('./AmbiguityReport.js');

class AmbiguityDetector {
  constructor(config = {}) {
    // Nominalization suffixes for process/continuant ambiguity
    this.nominalizationSuffixes = [
      { suffix: 'tion', label: '-tion' },
      { suffix: 'sion', label: '-sion' },
      { suffix: 'ment', label: '-ment' },
      { suffix: 'ing', label: '-ing' },
      { suffix: 'ance', label: '-ance/-ence' },
      { suffix: 'ence', label: '-ance/-ence' },
      { suffix: 'al', label: '-al' },
      { suffix: 'age', label: '-age' }
    ];

    // Words that are nominalizations but also commonly used as pure continuants
    this.continuantDominant = new Set([
      'building', 'painting', 'ceiling', 'morning', 'evening', 'thing',
      'meeting', 'wedding', 'setting', 'clothing', 'feeling'
    ]);

    // Modal verbs and their ambiguity profile
    this.deonticModals = ['must', 'should', 'shall', 'ought'];
    this.epistemicModals = ['may', 'might', 'could', 'should'];
    this.ambiguousModals = ['must', 'should', 'may', 'can', 'could', 'would'];

    // Scope-relevant quantifiers
    this.universalQuantifiers = ['all', 'every', 'each'];
    this.existentialQuantifiers = ['some', 'any', 'a', 'an'];
    this.negativeQuantifiers = ['no', 'none', 'neither'];

    // Stative verbs (more likely epistemic modal reading)
    this.stativeVerbs = new Set([
      'be', 'have', 'know', 'believe', 'think', 'want', 'need',
      'like', 'love', 'hate', 'prefer', 'understand', 'seem',
      'appear', 'belong', 'contain', 'consist', 'exist', 'own'
    ]);

    // Intentional act verbs (require animate/agent subject)
    this.intentionalVerbs = new Set([
      'decide', 'choose', 'hire', 'fire', 'allocate', 'assign',
      'tell', 'inform', 'ask', 'request', 'promise', 'threaten',
      'plan', 'intend', 'hope', 'wish', 'believe', 'think',
      'judge', 'evaluate', 'assess', 'consider', 'examine'
    ]);

    // Physical act verbs
    this.physicalVerbs = new Set([
      'lift', 'push', 'pull', 'carry', 'throw', 'catch',
      'hit', 'kick', 'run', 'walk', 'jump', 'climb',
      'cut', 'break', 'build', 'create', 'make', 'destroy'
    ]);

    // Animate noun indicators
    this.animateNouns = new Set([
      'doctor', 'patient', 'nurse', 'surgeon', 'person', 'man', 'woman',
      'child', 'administrator', 'staff', 'team', 'family', 'friend',
      'colleague', 'manager', 'director', 'committee', 'board',
      'organization', 'company', 'government', 'hospital', 'agency'
    ]);

    // Inanimate/object nouns
    this.inanimateNouns = new Set([
      'rock', 'stone', 'table', 'chair', 'desk', 'computer', 'machine',
      'device', 'tool', 'equipment', 'ventilator', 'resource', 'file',
      'document', 'report', 'data', 'information', 'result', 'outcome'
    ]);

    // Abstract nouns
    this.abstractNouns = new Set([
      'justice', 'truth', 'beauty', 'freedom', 'democracy', 'equality',
      'fairness', 'honesty', 'loyalty', 'courage', 'wisdom', 'knowledge',
      'idea', 'concept', 'theory', 'principle', 'policy', 'law'
    ]);

    // Metonymy patterns (location for institution)
    this.metonymyPatterns = new Set([
      'house', 'street', 'hill', 'place', 'office', 'court', 'bench'
    ]);

    // Duration predicates (signal process reading)
    this.durationPredicates = new Set([
      'last', 'take', 'continue', 'persist', 'endure', 'span'
    ]);

    this.config = config;
  }

  /**
   * Detect all ambiguities in parsed output
   * @param {string} text - Original text
   * @param {Array} entities - Extracted entities
   * @param {Array} acts - Extracted acts
   * @param {Array} roles - Semantic roles (optional)
   * @returns {AmbiguityReport}
   */
  detect(text, entities = [], acts = [], roles = []) {
    const ambiguities = [];

    // 1. Check nouns for process/continuant ambiguity
    ambiguities.push(...this._detectNounAmbiguity(entities, acts, roles));

    // 2. Check for selectional constraint violations
    ambiguities.push(...this._detectSelectionalViolations(entities, acts, roles));

    // 3. Check modals for deontic/epistemic ambiguity
    ambiguities.push(...this._detectModalAmbiguity(acts, entities, roles));

    // 4. Check for scope ambiguity (quantifiers + negation)
    ambiguities.push(...this._detectScopeAmbiguity(text, entities, acts));

    // 5. Check for potential metonymy
    ambiguities.push(...this._detectMetonymy(entities, acts, roles));

    return new AmbiguityReport(ambiguities);
  }

  /**
   * Detect nominalization ambiguity (process vs continuant)
   * @private
   */
  _detectNounAmbiguity(entities, acts, roles) {
    const ambiguities = [];

    for (const entity of entities) {
      const noun = this._getNounWord(entity);
      if (!noun) continue;

      const nominalization = this._checkNominalization(noun);
      if (!nominalization.isNominalization) continue;

      // Skip if clearly a continuant-dominant word
      if (this.continuantDominant.has(noun.toLowerCase())) continue;

      const signals = [];
      let defaultReading = null;
      let confidence = 'medium';

      // Check context signals
      const isAgent = this._isAgentOf(entity, acts, roles);
      const hasOfComplement = this._hasOfComplement(entity);
      const hasDurationPredicate = this._hasDurationPredicate(entity, acts);

      if (isAgent) {
        signals.push('subject_of_intentional_act');
        defaultReading = 'continuant';
        confidence = 'high';
      }

      if (hasOfComplement) {
        signals.push('of_complement');
        if (!defaultReading) defaultReading = 'process';
      }

      if (hasDurationPredicate) {
        signals.push('duration_predicate');
        defaultReading = 'process';
        confidence = 'high';
      }

      // Check for predicate adjective (suggests process if difficulty-related)
      if (this._hasDifficultyPredicate(entity)) {
        signals.push('predicate_adjective');
        if (!defaultReading) defaultReading = 'process';
      }

      ambiguities.push({
        type: 'noun_category',
        span: entity.label || entity.sourceText || noun,
        nodeId: entity['@id'],
        readings: ['process', 'continuant'],
        signals,
        defaultReading: defaultReading || 'continuant',
        confidence,
        nominalizationSuffix: nominalization.suffix
      });
    }

    return ambiguities;
  }

  /**
   * Check if a word is a nominalization
   * @private
   */
  _checkNominalization(word) {
    const lw = word.toLowerCase();

    for (const { suffix, label } of this.nominalizationSuffixes) {
      if (lw.endsWith(suffix) && lw.length > suffix.length + 2) {
        return { isNominalization: true, suffix: label };
      }
    }

    return { isNominalization: false };
  }

  /**
   * Detect selectional constraint violations
   * @private
   */
  _detectSelectionalViolations(entities, acts, roles) {
    const ambiguities = [];

    for (const act of acts) {
      const violation = this._checkActSelectionalConstraints(act, entities, roles);
      if (violation) {
        ambiguities.push(violation);
      }
    }

    return ambiguities;
  }

  /**
   * Check selectional constraints for a single act
   * @private
   */
  _checkActSelectionalConstraints(act, entities, roles) {
    const agent = this._findAgentFor(act, entities, roles);
    const patient = this._findPatientFor(act, entities, roles);
    const verb = this._getVerbLemma(act);

    // Check: inanimate cannot be agent of Intentional Act
    if (agent && this._isInanimate(agent) && this._isIntentionalAct(act)) {
      return {
        type: 'selectional_violation',
        signal: 'inanimate_agent',
        subject: this._getEntityLabel(agent),
        verb: verb,
        nodeId: act['@id'],
        confidence: 'high',
        ontologyConstraint: 'bfo:Agent requires bfo:MaterialEntity with cco:has_function'
      };
    }

    // Check: abstract cannot perform physical acts
    if (agent && this._isAbstract(agent) && this._isPhysicalAct(act)) {
      return {
        type: 'selectional_violation',
        signal: 'abstract_physical_actor',
        subject: this._getEntityLabel(agent),
        verb: verb,
        nodeId: act['@id'],
        confidence: 'high'
      };
    }

    return null;
  }

  /**
   * Detect modal force ambiguity (deontic vs epistemic)
   * @private
   */
  _detectModalAmbiguity(acts, entities, roles) {
    const ambiguities = [];

    for (const act of acts) {
      const modal = this._getModal(act);
      if (!modal) continue;

      // Check if modal is potentially ambiguous
      if (!this.ambiguousModals.includes(modal.toLowerCase())) continue;

      const signals = [];
      let defaultReading = null;
      const readings = [];

      const lowerModal = modal.toLowerCase();
      const verb = this._getVerbLemma(act);
      const agent = this._findAgentFor(act, entities, roles);
      const hasPerfectAspect = this._hasPerfectAspect(act);
      const isStative = this.stativeVerbs.has(verb);

      // Determine readings based on modal
      if (lowerModal === 'must' || lowerModal === 'should') {
        readings.push('obligation', 'expectation');
        if (lowerModal === 'must') {
          readings[1] = 'inference'; // "must have" = inference
        }
      } else if (lowerModal === 'may' || lowerModal === 'might') {
        readings.push('permission', 'possibility');
      } else if (lowerModal === 'can' || lowerModal === 'could') {
        readings.push('ability', 'possibility');
      } else if (lowerModal === 'would') {
        readings.push('conditional', 'habitual');
      }

      // Context signals for disambiguation
      if (hasPerfectAspect) {
        signals.push('perfect_aspect');
        // Perfect aspect strongly suggests epistemic
        defaultReading = readings[1]; // expectation/inference/possibility
      }

      if (isStative) {
        signals.push('stative_verb');
        if (!defaultReading) defaultReading = readings[1];
      }

      if (agent && this._isAnimate(agent)) {
        signals.push('agent_subject');
        if (!defaultReading) defaultReading = readings[0]; // deontic
      }

      if (this._isIntentionalAct(act)) {
        signals.push('intentional_act');
        if (!defaultReading) defaultReading = readings[0];
      }

      // Check for second person (you) - suggests deontic
      if (agent && this._isSecondPerson(agent)) {
        signals.push('second_person_subject');
        defaultReading = readings[0];
      }

      // Check negation scope
      const negationScope = this._getNegationScope(act);

      ambiguities.push({
        type: 'modal_force',
        span: act.sourceText || act.label,
        nodeId: act['@id'],
        modal: modal,
        readings,
        signals,
        defaultReading: defaultReading || readings[0],
        negationScope
      });
    }

    return ambiguities;
  }

  /**
   * Detect scope ambiguity (quantifiers + negation)
   * @private
   */
  _detectScopeAmbiguity(text, entities, acts) {
    const ambiguities = [];
    const lowerText = text.toLowerCase();

    // Check for universal quantifier + negation
    for (const quantifier of this.universalQuantifiers) {
      if (lowerText.includes(quantifier)) {
        // Check for negation
        if (lowerText.includes('not') || lowerText.includes("n't") || lowerText.includes('never')) {
          // Check word order for default reading
          const quantIdx = lowerText.indexOf(quantifier);
          const notIdx = Math.max(
            lowerText.indexOf('not'),
            lowerText.indexOf("n't"),
            lowerText.indexOf('never')
          );

          const readings = ['wide', 'narrow'];
          let defaultReading = 'narrow'; // Default: quantifier scopes over negation
          let confidence = 'medium';

          // "Not all" = clear wide scope
          if (lowerText.includes('not all') || lowerText.includes('not every')) {
            defaultReading = 'wide';
            confidence = 'high';
          }

          ambiguities.push({
            type: 'scope',
            span: text,
            quantifier,
            negation: 'not',
            readings,
            defaultReading,
            confidence,
            formalizations: {
              wide: `¬∀x.P(x)`,
              narrow: `∀x.¬P(x)`
            }
          });
        }
      }
    }

    // Check for multiple quantifiers
    const foundQuantifiers = [];
    for (const q of [...this.universalQuantifiers, ...this.existentialQuantifiers]) {
      if (lowerText.includes(q + ' ')) {
        foundQuantifiers.push(q);
      }
    }

    if (foundQuantifiers.length >= 2) {
      ambiguities.push({
        type: 'scope',
        span: text,
        quantifiers: foundQuantifiers,
        readings: ['subject_wide', 'object_wide'],
        defaultReading: 'subject_wide', // Default: surface order
        confidence: 'medium'
      });
    }

    // Check for modal + negation scope
    for (const act of acts) {
      const modal = this._getModal(act);
      const isNegated = act.negated || act['tagteam:polarity'] === 'negative';

      if (modal && isNegated) {
        const lowerModal = modal.toLowerCase();

        if (lowerModal === 'may') {
          ambiguities.push({
            type: 'scope',
            span: act.sourceText || act.label,
            nodeId: act['@id'],
            modal,
            readings: ['permission_denied', 'possibility_denied'],
            defaultReading: 'permission_denied',
            confidence: 'medium'
          });
        }
      }
    }

    return ambiguities;
  }

  /**
   * Detect potential metonymy
   * @private
   */
  _detectMetonymy(entities, acts, roles) {
    const ambiguities = [];

    for (const entity of entities) {
      const noun = this._getNounWord(entity);
      if (!noun) continue;

      if (this.metonymyPatterns.has(noun.toLowerCase())) {
        // Check if used as agent of intentional act
        const isAgent = this._isAgentOf(entity, acts, roles);

        if (isAgent) {
          ambiguities.push({
            type: 'potential_metonymy',
            span: entity.label || entity.sourceText || noun,
            nodeId: entity['@id'],
            signal: 'location_as_agent',
            suggestedReading: 'institution',
            confidence: 'medium'
          });
        }
      }
    }

    return ambiguities;
  }

  // ============ Helper Methods ============

  /**
   * Get the main noun word from an entity
   * For phrases like "organization of files", returns "organization" (before "of")
   * @private
   */
  _getNounWord(entity) {
    if (entity.head) return entity.head;

    // For label/sourceText, handle "X of Y" patterns
    const text = entity.label || entity.sourceText;
    if (!text) return null;

    // If contains " of ", take the word before "of"
    const ofIndex = text.toLowerCase().indexOf(' of ');
    if (ofIndex > 0) {
      const beforeOf = text.substring(0, ofIndex).trim();
      return beforeOf.split(' ').pop();
    }

    // Otherwise take the last word
    return text.split(' ').pop();
  }

  /**
   * Get entity label for display
   * @private
   */
  _getEntityLabel(entity) {
    return entity.label || entity.sourceText || entity.head || 'unknown';
  }

  /**
   * Get verb lemma from act
   * Handles both test data and SemanticGraphBuilder output
   * @private
   */
  _getVerbLemma(act) {
    // Direct properties
    if (act.lemma) return act.lemma;
    if (act.verb) return act.verb;
    // SemanticGraphBuilder output uses tagteam:verb
    if (act['tagteam:verb']) return act['tagteam:verb'];
    // Fallback
    return act.label || act['rdfs:label'] || '';
  }

  /**
   * Get modal from act
   * Handles both test data (act.modal) and SemanticGraphBuilder output (tagteam:modality)
   * @private
   */
  _getModal(act) {
    // Direct modal property (from tests or VerbPhraseExtractor)
    if (act.modal) return act.modal;

    // From SemanticGraphBuilder: tagteam:modality gives the semantic type
    // We need to infer the modal word from sourceText or modality mapping
    const modality = act['tagteam:modality'];
    if (modality) {
      // Map modality types back to modal words for ambiguity detection
      const modalityToModal = {
        'recommendation': 'should',
        'obligation': 'must',
        'permission': 'may',
        'possibility': 'might',
        'ability': 'can',
        'conditional': 'would',
        'futurity': 'will'
      };
      if (modalityToModal[modality]) {
        return modalityToModal[modality];
      }
    }

    // Try to extract from sourceText
    const sourceText = act['tagteam:sourceText'] || act.sourceText || '';
    const modalMatch = sourceText.toLowerCase().match(/\b(must|should|may|might|can|could|will|would|shall|ought)\b/);
    if (modalMatch) {
      return modalMatch[1];
    }

    return null;
  }

  /**
   * Find agent for an act
   * Handles both test data and SemanticGraphBuilder output
   * @private
   */
  _findAgentFor(act, entities, roles) {
    // Check roles first
    for (const role of roles) {
      if (role.act === act['@id'] && role.type === 'agent') {
        return entities.find(e => e['@id'] === role.entity);
      }
    }

    // Test data format: act.agent
    if (act.agent) {
      return entities.find(e => e['@id'] === act.agent || e.label === act.agent);
    }

    // SemanticGraphBuilder format: cco:has_agent
    const hasAgent = act['cco:has_agent'];
    if (hasAgent) {
      const agentIRI = typeof hasAgent === 'object' ? hasAgent['@id'] : hasAgent;
      return entities.find(e => e['@id'] === agentIRI);
    }

    return null;
  }

  /**
   * Find patient for an act
   * @private
   */
  _findPatientFor(act, entities, roles) {
    for (const role of roles) {
      if (role.act === act['@id'] && role.type === 'patient') {
        return entities.find(e => e['@id'] === role.entity);
      }
    }

    if (act.patient) {
      return entities.find(e => e['@id'] === act.patient || e.label === act.patient);
    }

    return null;
  }

  /**
   * Check if entity is agent of any act
   * @private
   */
  _isAgentOf(entity, acts, roles) {
    const entityId = entity['@id'];
    const entityLabel = entity.label || entity.sourceText;

    for (const role of roles) {
      if (role.entity === entityId && role.type === 'agent') {
        return true;
      }
    }

    for (const act of acts) {
      if (act.agent === entityId || act.agent === entityLabel) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if entity is inanimate
   * @private
   */
  _isInanimate(entity) {
    const noun = this._getNounWord(entity);
    if (!noun) return false;

    const lower = noun.toLowerCase();

    // Check explicit inanimate list
    if (this.inanimateNouns.has(lower)) return true;

    // Not in animate list and not abstract = assume inanimate
    return !this.animateNouns.has(lower) && !this.abstractNouns.has(lower);
  }

  /**
   * Check if entity is animate
   * @private
   */
  _isAnimate(entity) {
    const noun = this._getNounWord(entity);
    if (!noun) return false;

    return this.animateNouns.has(noun.toLowerCase());
  }

  /**
   * Check if entity is abstract
   * @private
   */
  _isAbstract(entity) {
    const noun = this._getNounWord(entity);
    if (!noun) return false;

    return this.abstractNouns.has(noun.toLowerCase());
  }

  /**
   * Check if act is intentional
   * @private
   */
  _isIntentionalAct(act) {
    const verb = this._getVerbLemma(act).toLowerCase();
    // Check base form
    if (this.intentionalVerbs.has(verb)) return true;
    // Check if it's an inflected form (simple suffix removal)
    const base = this._getBaseVerb(verb);
    return this.intentionalVerbs.has(base);
  }

  /**
   * Check if act is physical
   * @private
   */
  _isPhysicalAct(act) {
    const verb = this._getVerbLemma(act).toLowerCase();
    // Check base form
    if (this.physicalVerbs.has(verb)) return true;
    // Check if it's an inflected form
    const base = this._getBaseVerb(verb);
    return this.physicalVerbs.has(base);
  }

  /**
   * Get approximate base form of a verb (simple version without full Lemmatizer)
   * @private
   */
  _getBaseVerb(verb) {
    const v = verb.toLowerCase();
    // Handle -ed endings
    if (v.endsWith('ied')) return v.slice(0, -3) + 'y'; // tried -> try
    if (v.endsWith('ed')) {
      // Double consonant: stopped -> stop
      if (v.length > 4 && v[v.length - 3] === v[v.length - 4]) {
        return v.slice(0, -3);
      }
      // Check for silent-e verbs: hired -> hire
      const withoutEd = v.slice(0, -2);
      const withE = withoutEd + 'e';
      return withE; // Prefer silent-e restoration
    }
    // Handle -ing endings
    if (v.endsWith('ing')) {
      const withoutIng = v.slice(0, -3);
      // Check for doubled consonant: running -> run
      if (withoutIng.length > 2 && withoutIng[withoutIng.length - 1] === withoutIng[withoutIng.length - 2]) {
        return withoutIng.slice(0, -1);
      }
      // Assume silent-e: making -> make
      return withoutIng + 'e';
    }
    // Handle -s endings
    if (v.endsWith('ies')) return v.slice(0, -3) + 'y';
    if (v.endsWith('es')) return v.slice(0, -2);
    if (v.endsWith('s') && v.length > 3) return v.slice(0, -1);
    return v;
  }

  /**
   * Check if act has perfect aspect
   * @private
   */
  _hasPerfectAspect(act) {
    return act.tense === 'perfect' ||
           (act.auxiliary && act.auxiliary.some(a =>
             ['have', 'has', 'had'].includes(a)
           ));
  }

  /**
   * Check for of-complement (signals process reading)
   * @private
   */
  _hasOfComplement(entity) {
    const text = entity.sourceText || entity.label || '';
    return text.includes(' of ');
  }

  /**
   * Check for duration predicate
   * @private
   */
  _hasDurationPredicate(entity, acts) {
    // Check if entity is subject of a duration verb
    for (const act of acts) {
      const verb = this._getVerbLemma(act);
      if (this.durationPredicates.has(verb.toLowerCase())) {
        // Check if this entity is subject
        if (act.agent === entity['@id'] || act.agent === entity.label) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Check for difficulty predicate adjective
   * @private
   */
  _hasDifficultyPredicate(entity) {
    // This would need more context - simplified check
    return false;
  }

  /**
   * Check if entity is second person pronoun
   * @private
   */
  _isSecondPerson(entity) {
    const label = (entity.label || entity.sourceText || '').toLowerCase();
    return label === 'you' || label === 'your';
  }

  /**
   * Get negation scope info
   * @private
   */
  _getNegationScope(act) {
    if (!act.negated) return null;

    const modal = this._getModal(act);
    if (modal) {
      // "must not" = obligation not to (negation under modal)
      return 'under_modal';
    }

    return 'predicate';
  }
}

// Export for both Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AmbiguityDetector;
}
if (typeof window !== 'undefined') {
  window.AmbiguityDetector = AmbiguityDetector;
}
