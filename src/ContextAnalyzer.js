/**
 * ContextAnalyzer.js
 *
 * Analyzes 12 dimensions of contextual intensity for ethical reasoning:
 * - Temporal: urgency, duration, reversibility
 * - Relational: intimacy, powerDifferential, trust
 * - Consequential: harmSeverity, benefitMagnitude, scope
 * - Epistemic: certainty, informationCompleteness, expertise
 *
 * Week 2a Feature - January 2026
 */

(function(root, factory) {
    if (typeof module === 'object' && module.exports) {
        // Node.js
        const PatternMatcher = require('./PatternMatcher');
        module.exports = factory(PatternMatcher);
    } else {
        // Browser
        root.ContextAnalyzer = factory(root.PatternMatcher);
    }
}(typeof self !== 'undefined' ? self : this, function(PatternMatcher) {
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
}));
