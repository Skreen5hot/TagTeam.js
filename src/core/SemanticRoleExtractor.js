/*!
 * SemanticRoleExtractor.js
 * Week 1 Deliverable: Deterministic Semantic Role Extraction
 *
 * Extends TagTeam.js POS tagging with semantic understanding:
 * - Identifies WHO does WHAT to WHOM
 * - Extracts semantic frames (action types)
 * - Handles negation and modality
 * - Provides confidence scores
 *
 * Copyright 2025 Aaron Damiano
 * Licensed under MIT
 */

(function(window) {
    'use strict';

    // ========================================
    // COMPOUND TERMS (Multi-word entities)
    // ========================================
    // Source: compound-terms.json v1.0 (150 terms delivered by IEE team Jan 10, 2026)

    const COMPOUND_TERMS = [
        // Healthcare (20 terms)
        'life support', 'terminal cancer', 'end of life', 'advance directive',
        'comfort care', 'aggressive treatment', 'clinical trials', 'experimental drug',
        'informed consent', 'organ donation', 'liver transplant', 'quality of life',
        'medical treatment', 'health insurance', 'mental health', 'physical health',
        'healthcare provider', 'primary care', 'emergency room', 'intensive care',

        // Spiritual/Religious (15 terms)
        'faith community', 'religious community', 'core doctrines', 'religious tradition',
        'spiritual practice', 'interfaith marriage', 'holy day', 'sacred obligations',
        'divine relationship', 'spiritual vitality', 'religious freedom', 'faith tradition',
        'spiritual growth', 'religious beliefs', 'worship service',

        // Vocational/Professional (15 terms)
        'safety reports', 'serious injuries', 'public safety', 'professional responsibility',
        'career opportunity', 'work environment', 'ethical standards', 'workplace harassment',
        'job security', 'career advancement', 'professional development', 'corporate responsibility',
        'business ethics', 'trade secrets', 'intellectual property',

        // Interpersonal/Social (14 terms)
        'best friend', 'close friend', 'social network', 'family relationships',
        'romantic relationship', 'personal boundaries', 'emotional support', 'mutual respect',
        'trust issues', 'social obligations', 'peer pressure', 'social status',
        'personal values', 'intimate partner',

        // Environmental (15 terms)
        'climate goals', 'climate change', 'climate action', 'coal plant',
        'major employers', 'environmental protection', 'carbon emissions', 'renewable energy',
        'fossil fuels', 'air quality', 'water pollution', 'natural resources',
        'sustainable development', 'environmental impact', 'future generations',

        // Educational (13 terms)
        'academic integrity', 'learning disability', 'standardized tests', 'grade point average',
        'educational opportunity', 'academic freedom', 'research ethics', 'student loan',
        'higher education', 'special education', 'academic performance', 'educational equity',

        // Political/Civic (13 terms)
        'civil rights', 'human rights', 'social justice', 'political freedom',
        'free speech', 'democratic process', 'public policy', 'civil liberties',
        'voting rights', 'rule of law', 'political participation', 'civic duty',
        'constitutional rights',

        // Technological (12 terms)
        'artificial intelligence', 'data privacy', 'social media', 'cyber security',
        'digital rights', 'algorithmic bias', 'surveillance technology', 'personal data',
        'online safety', 'digital literacy', 'technological advancement',

        // General Ethical (14 terms)
        'moral responsibility', 'ethical dilemma', 'moral obligation', 'value conflict',
        'ethical principles', 'moral reasoning', 'personal autonomy', 'bodily autonomy',
        'human dignity', 'common good', 'individual rights', 'collective welfare',
        'moral character', 'ethical standards'
    ];

    // ========================================
    // SEMANTIC FRAME DEFINITIONS
    // ========================================

    // Mapping from TagTeam frame names to IEE expected names
    const FRAME_NAME_MAPPING = {
        'revealing_information': 'Revealing_information',
        'concealing_information': 'Concealing_information',
        'causing_harm': 'Causing_harm',
        'causing_benefit': 'Causing_benefit',
        'abandoning_relationship': 'Abandoning_relationship',
        'maintaining_relationship': 'Maintaining_relationship',
        'decision_making': 'Deciding',
        'resource_allocation': 'Resource_allocation',
        'medical_treatment': 'Medical_treatment',
        'experiencing_emotion': 'Experiencing_emotion',
        'communication': 'Communication',
        'physical_motion': 'Physical_motion',
        'questioning': 'Questioning',
        'becoming_aware': 'Becoming_aware',
        'offenses': 'Offenses',
        'generic_action': 'Generic_action',
        'unknown': 'Unknown'
    };

    const SEMANTIC_FRAMES = {
        'revealing_information': {
            coreVerbs: ['tell', 'disclose', 'reveal', 'inform', 'report', 'confess', 'admit', 'share', 'mention'],
            requiredRoles: ['agent', 'recipient'],
            optionalRoles: ['theme'],
            description: 'Agent communicates information to recipient'
        },

        'concealing_information': {
            coreVerbs: ['hide', 'conceal', 'withhold', 'suppress', 'omit', 'keep', 'secret'],
            requiredRoles: ['agent', 'theme'],
            optionalRoles: ['source'],
            description: 'Agent prevents information from being known',
            contextClues: ['secret', 'hidden', 'private', 'confidential']
        },

        'causing_harm': {
            coreVerbs: ['harm', 'hurt', 'injure', 'damage', 'wound', 'endanger', 'threaten', 'risk'],
            requiredRoles: ['agent', 'patient'],
            optionalRoles: ['instrument', 'manner'],
            description: 'Agent causes negative impact to patient'
        },

        'causing_benefit': {
            coreVerbs: ['help', 'benefit', 'improve', 'heal', 'support', 'aid', 'assist', 'save', 'protect'],
            requiredRoles: ['agent', 'patient'],
            optionalRoles: ['instrument'],
            description: 'Agent causes positive impact to patient'
        },

        'abandoning_relationship': {
            coreVerbs: ['leave', 'abandon', 'quit', 'depart', 'exit', 'desert', 'forsake'],
            requiredRoles: ['agent', 'theme'],
            optionalRoles: ['source'],
            description: 'Agent terminates connection with entity',
            contextClues: ['community', 'family', 'relationship', 'group', 'home', 'country']
        },

        'maintaining_relationship': {
            coreVerbs: ['stay', 'remain', 'continue', 'maintain', 'preserve', 'keep'],
            requiredRoles: ['agent', 'location'],
            description: 'Agent continues connection with entity',
            contextClues: ['community', 'family', 'relationship', 'group', 'home', 'country']
        },

        'decision_making': {
            coreVerbs: ['decide', 'choose', 'select', 'determine', 'resolve', 'consider', 'contemplate', 'think'],
            requiredRoles: ['agent', 'theme'],
            optionalRoles: ['criterion'],
            description: 'Agent makes choice about theme'
        },

        'resource_allocation': {
            coreVerbs: ['allocate', 'distribute', 'assign', 'apportion', 'give', 'provide', 'grant'],
            requiredRoles: ['agent', 'theme', 'recipient'],
            description: 'Agent transfers resources to recipient',
            contextClues: ['resources', 'budget', 'money', 'jobs', 'land', 'food', 'water']
        },

        'medical_treatment': {
            coreVerbs: ['treat', 'heal', 'cure', 'operate', 'diagnose', 'prescribe', 'examine', 'remove', 'withdraw', 'terminate', 'discontinue', 'stop'],
            requiredRoles: ['agent', 'patient'],
            optionalRoles: ['instrument'],
            description: 'Agent provides medical care to patient',
            contextClues: ['doctor', 'hospital', 'patient', 'medical', 'health', 'treatment', 'medicine', 'life support', 'care']
        },

        'experiencing_emotion': {
            coreVerbs: ['feel', 'experience', 'sense', 'suffer', 'enjoy', 'endure'],
            requiredRoles: ['experiencer', 'theme'],
            description: 'Experiencer has emotional or physical sensation'
        },

        'communication': {
            coreVerbs: ['say', 'speak', 'talk', 'communicate', 'express', 'state', 'declare'],
            requiredRoles: ['agent'],
            optionalRoles: ['recipient', 'theme'],
            description: 'Agent engages in communication act'
        },

        'physical_motion': {
            coreVerbs: ['go', 'move', 'walk', 'run', 'travel', 'come', 'arrive', 'return'],
            requiredRoles: ['agent'],
            optionalRoles: ['destination', 'source'],
            description: 'Agent changes physical location'
        },

        'questioning': {
            coreVerbs: ['question', 'doubt', 'challenge', 'query', 'wonder', 'ask'],
            requiredRoles: ['agent', 'patient'],
            description: 'Agent questions or doubts something',
            contextClues: ['belief', 'doctrine', 'faith', 'assumption', 'claim']
        },

        'becoming_aware': {
            coreVerbs: ['discover', 'find', 'learn', 'realize', 'notice', 'observe', 'uncover', 'detect'],
            requiredRoles: ['agent', 'patient'],
            description: 'Agent becomes aware of information',
            contextClues: ['found', 'discovered', 'learned', 'noticed']
        },

        'offenses': {
            coreVerbs: ['cheat', 'betray', 'lie', 'deceive', 'steal', 'violate', 'abuse', 'exploit'],
            requiredRoles: ['agent', 'patient'],
            description: 'Agent commits offense against patient',
            contextClues: ['unfaithful', 'dishonest', 'wrongdoing', 'violation']
        }
    };

    // ========================================
    // NEGATION MARKERS
    // ========================================

    const NEGATION_MARKERS = {
        explicit: ['not', 'never', 'no', 'neither', 'nor', 'nobody', 'nothing', 'nowhere', 'none'],
        contracted: ["n't", 'cannot', 'cant', "won't", "don't", "didn't", "doesn't", "haven't", "hasn't", "hadn't"],
        implicit: ['without', 'lack', 'absent', 'fail', 'refuse', 'avoid', 'prevent']
    };

    // ========================================
    // MODAL MARKERS (uncertainty, obligation)
    // ========================================

    const MODAL_MARKERS = {
        possibility: ['might', 'may', 'could', 'possibly', 'perhaps', 'maybe'],
        necessity: ['must', 'should', 'ought', 'need', 'have to', 'required'],
        intention: ['will', 'would', 'going to', 'plan', 'intend', 'want'],
        ability: ['can', 'able', 'capable']
    };

    // ========================================
    // PRONOUN RESOLUTION (SIMPLE)
    // ========================================

    const ENTITY_CATEGORIES = {
        self: ['i', 'me', 'my', 'mine', 'myself'],
        other_singular: ['he', 'she', 'him', 'her', 'his', 'hers'],
        other_plural: ['they', 'them', 'their', 'theirs', 'themselves'],
        collective_we: ['we', 'us', 'our', 'ours', 'ourselves']
    };

    // ========================================
    // MAIN CLASS: SemanticRoleExtractor
    // ========================================

    function SemanticRoleExtractor() {
        this.frames = SEMANTIC_FRAMES;
        this.posTagger = new POSTagger(); // Use existing TagTeam POS tagger

        // Week 2a: Initialize ContextAnalyzer
        // Load it dynamically if available, otherwise context analysis is skipped
        if (typeof ContextAnalyzer !== 'undefined') {
            this.contextAnalyzer = new ContextAnalyzer();
        } else {
            this.contextAnalyzer = null;
        }

        // Week 2b: Initialize Value Matching Components
        // Load dynamically if available, otherwise ethical profiling is skipped
        if (typeof ValueMatcher !== 'undefined' && typeof ValueScorer !== 'undefined' && typeof EthicalProfiler !== 'undefined') {
            this.valueMatcher = new ValueMatcher(window.VALUE_DEFINITIONS);
            this.valueScorer = new ValueScorer(window.FRAME_VALUE_BOOSTS);
            this.ethicalProfiler = new EthicalProfiler(window.CONFLICT_PAIRS);
        } else {
            this.valueMatcher = null;
            this.valueScorer = null;
            this.ethicalProfiler = null;
        }
    }

    /**
     * Main entry point: Parse semantic action from text
     * @param {string} text - Input sentence
     * @returns {SemanticAction} Structured semantic representation
     */
    SemanticRoleExtractor.prototype.parseSemanticAction = function(text) {
        // Step 1: POS tagging (existing TagTeam functionality)
        const words = this._tokenize(text);
        const taggedWords = this.posTagger.tag(words);

        // Step 2: Identify negation and modality
        const negation = this._detectNegation(taggedWords);
        const modality = this._detectModality(taggedWords);

        // Step 3: Find main verb and semantic frame
        const verbInfo = this._findMainVerb(taggedWords);
        const frame = this._classifyFrame(verbInfo, taggedWords);

        // Step 4: Extract semantic roles
        const roles = this._extractRoles(taggedWords, verbInfo, frame);

        // Step 5: Compute confidence score
        const confidence = this._computeConfidence(roles, frame, verbInfo);

        // Step 6: Detect ambiguity
        const ambiguity = this._detectAmbiguity(roles, frame, taggedWords);

        // Week 2a: Analyze context intensity (12 dimensions)
        let contextIntensity = null;
        if (this.contextAnalyzer) {
            contextIntensity = this.contextAnalyzer.analyzeContext(text, taggedWords, frame, roles);
        }

        // Week 2b: Generate ethical profile (50 values, conflicts, domains)
        let ethicalProfile = null;
        if (this.valueMatcher && this.valueScorer && this.ethicalProfiler) {
            // Step 1: Detect values with polarity
            const detectedValues = this.valueMatcher.matchValues(text);

            // Step 2: Calculate salience with frame/role boosts
            const agentText = roles.agent ? roles.agent.text : null;
            const patientText = roles.patient ? roles.patient.text : null;
            const rolesList = [agentText, patientText].filter(r => r !== null);

            const scoredValues = this.valueScorer.scoreValues(
                detectedValues,
                frame.name === 'decision_making' ? 'Deciding' : frame.name,
                rolesList,
                window.VALUE_DEFINITIONS.values
            );

            // Step 3: Generate complete profile
            ethicalProfile = this.ethicalProfiler.generateProfile(scoredValues);
        }

        // Step 7: Build result object
        return this._buildSemanticAction(roles, verbInfo, frame, negation, modality, confidence, ambiguity, contextIntensity, ethicalProfile);
    };

    // ========================================
    // STEP 1: TOKENIZATION (with compound noun detection)
    // ========================================

    SemanticRoleExtractor.prototype._tokenize = function(text) {
        // Step 1: Detect and mark compound terms BEFORE tokenizing
        let processedText = text.toLowerCase();
        const compoundReplacements = [];

        // Replace compound terms with underscore versions
        for (const compound of COMPOUND_TERMS) {
            const regex = new RegExp('\\b' + compound.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi');
            if (processedText.match(regex)) {
                const replacement = compound.replace(/\s+/g, '_');
                compoundReplacements.push({ original: compound, replacement: replacement });
                processedText = processedText.replace(regex, replacement);
            }
        }

        // Step 2: Standard tokenization
        const tokens = processedText
            .replace(/[.,!?;:]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 0);

        // Store compound replacements for later reference
        this._lastCompoundReplacements = compoundReplacements;

        return tokens;
    };

    // ========================================
    // STEP 2: NEGATION DETECTION
    // ========================================

    SemanticRoleExtractor.prototype._detectNegation = function(taggedWords) {
        const allNegationWords = [
            ...NEGATION_MARKERS.explicit,
            ...NEGATION_MARKERS.contracted,
            ...NEGATION_MARKERS.implicit
        ];

        for (let i = 0; i < taggedWords.length; i++) {
            const word = taggedWords[i][0].toLowerCase();
            if (allNegationWords.includes(word)) {
                return {
                    present: true,
                    marker: word,
                    position: i,
                    type: this._getNegationType(word)
                };
            }
        }

        return { present: false, marker: null, position: -1, type: null };
    };

    SemanticRoleExtractor.prototype._getNegationType = function(word) {
        if (NEGATION_MARKERS.explicit.includes(word)) return 'explicit';
        if (NEGATION_MARKERS.contracted.includes(word)) return 'contracted';
        if (NEGATION_MARKERS.implicit.includes(word)) return 'implicit';
        return 'unknown';
    };

    // ========================================
    // STEP 3: MODALITY DETECTION
    // ========================================

    SemanticRoleExtractor.prototype._detectModality = function(taggedWords) {
        const modality = {
            present: false,
            type: null,
            marker: null,
            certainty: 1.0  // 0 = uncertain, 1 = certain
        };

        for (let i = 0; i < taggedWords.length; i++) {
            const word = taggedWords[i][0].toLowerCase();

            // Check each modality type
            for (const [type, markers] of Object.entries(MODAL_MARKERS)) {
                if (markers.includes(word)) {
                    modality.present = true;
                    modality.type = type;
                    modality.marker = word;

                    // Adjust certainty based on modal type
                    if (type === 'possibility') modality.certainty = 0.4;
                    else if (type === 'necessity') modality.certainty = 0.8;
                    else if (type === 'intention') modality.certainty = 0.6;
                    else if (type === 'ability') modality.certainty = 0.7;

                    return modality;
                }
            }
        }

        return modality;
    };

    // ========================================
    // STEP 4: MAIN VERB IDENTIFICATION
    // ========================================

    SemanticRoleExtractor.prototype._findMainVerb = function(taggedWords) {
        // Find the primary verb (VB, VBD, VBP, VBZ, VBG, VBN)
        const verbTags = ['VB', 'VBD', 'VBP', 'VBZ', 'VBG', 'VBN'];

        for (let i = 0; i < taggedWords.length; i++) {
            const [word, tag] = taggedWords[i];
            const nextToken = taggedWords[i + 1];

            // WEEK 1 FIX: Skip auxiliary verbs in progressive constructions
            // E.g., "I am questioning" should extract "questioning", not "am"
            if (this._isAuxiliaryVerb(word) && nextToken && nextToken[1] === 'VBG') {
                continue; // Skip auxiliary, next iteration will catch the VBG
            }

            // WEEK 1 FIX: Skip modal verbs, look for the main verb after them
            // E.g., "The family must decide" should extract "decide", not "must"
            if (tag === 'MD') {
                continue; // Skip modals (must, should, can, will, etc.)
            }

            if (verbTags.includes(tag)) {
                const lemma = this._lemmatizeVerb(word, tag);
                const tense = this._detectTense(taggedWords, i, tag);
                const aspect = this._detectAspect(taggedWords, i, tag);

                return {
                    word: word,
                    tag: tag,
                    position: i,
                    lemma: lemma,
                    tense: tense,
                    aspect: aspect
                };
            }
        }

        return { word: null, tag: null, position: -1, lemma: null, tense: 'present', aspect: 'simple' };
    };

    // ========================================
    // HELPER: CHECK IF WORD IS AUXILIARY VERB
    // ========================================

    SemanticRoleExtractor.prototype._isAuxiliaryVerb = function(word) {
        const auxiliaries = ['am', 'is', 'are', 'was', 'were', 'be', 'been', 'being'];
        return auxiliaries.includes(word.toLowerCase());
    };

    // ========================================
    // TENSE DETECTION
    // ========================================

    SemanticRoleExtractor.prototype._detectTense = function(taggedWords, verbPosition, verbTag) {
        // Check for modal verbs indicating future
        if (verbPosition > 0) {
            const prevWord = taggedWords[verbPosition - 1][0].toLowerCase();
            if (['will', 'shall', 'going'].includes(prevWord)) {
                return 'future';
            }
        }

        // Past tense verbs
        if (verbTag === 'VBD' || verbTag === 'VBN') {
            return 'past';
        }

        // Present tense (default)
        return 'present';
    };

    // ========================================
    // ASPECT DETECTION
    // ========================================

    SemanticRoleExtractor.prototype._detectAspect = function(taggedWords, verbPosition, verbTag) {
        // Progressive aspect (be + VBG)
        if (verbTag === 'VBG') {
            if (verbPosition > 0) {
                const prevWord = taggedWords[verbPosition - 1][0].toLowerCase();
                if (['am', 'is', 'are', 'was', 'were', 'be', 'being', 'been'].includes(prevWord)) {
                    return 'progressive';
                }
            }
        }

        // Perfect aspect (have/has/had + VBN)
        if (verbTag === 'VBN') {
            if (verbPosition > 0) {
                const prevWord = taggedWords[verbPosition - 1][0].toLowerCase();
                if (['have', 'has', 'had'].includes(prevWord)) {
                    return 'perfect';
                }
            }
        }

        // Simple aspect (default)
        return 'simple';
    };

    SemanticRoleExtractor.prototype._lemmatizeVerb = function(verb, tag) {
        // Simple lemmatization rules
        verb = verb.toLowerCase();

        // VBD (past tense) and VBN (past participle) -> base form
        if (tag === 'VBD' || tag === 'VBN') {
            // Irregular verbs first
            const irregulars = {
                'was': 'be', 'were': 'be', 'had': 'have', 'did': 'do',
                'went': 'go', 'came': 'come', 'said': 'say', 'told': 'tell',
                'left': 'leave', 'felt': 'feel', 'thought': 'think',
                'made': 'make', 'took': 'take', 'gave': 'give'
            };
            if (irregulars[verb]) return irregulars[verb];

            // Regular verbs ending in -ed
            if (verb.endsWith('ed')) return verb.slice(0, -2);

            return verb;
        }

        // VBZ (3rd person singular) -> base form
        if (tag === 'VBZ') {
            if (verb.endsWith('s')) return verb.slice(0, -1);
        }

        // VBG (gerund) -> base form
        if (tag === 'VBG') {
            if (verb.endsWith('ing')) {
                const base = verb.slice(0, -3);
                // Handle doubled consonants (running -> run)
                if (base.length > 1 && base[base.length - 1] === base[base.length - 2]) {
                    return base.slice(0, -1);
                }
                return base;
            }
        }

        return verb;
    };

    // ========================================
    // STEP 5: FRAME CLASSIFICATION
    // ========================================

    SemanticRoleExtractor.prototype._classifyFrame = function(verbInfo, taggedWords) {
        if (!verbInfo.lemma) {
            return { name: 'unknown', confidence: 0.0, description: 'No verb found' };
        }

        // Check each frame for matching core verbs
        for (const [frameName, frameDef] of Object.entries(this.frames)) {
            if (frameDef.coreVerbs.includes(verbInfo.lemma)) {
                // Check context clues if present
                if (frameDef.contextClues) {
                    const hasContextClue = this._hasContextClue(taggedWords, frameDef.contextClues);
                    if (hasContextClue) {
                        return { name: frameName, confidence: 0.9, description: frameDef.description };
                    }
                }
                return { name: frameName, confidence: 0.8, description: frameDef.description };
            }
        }

        // No matching frame found
        return { name: 'generic_action', confidence: 0.3, description: 'Generic action' };
    };

    SemanticRoleExtractor.prototype._hasContextClue = function(taggedWords, contextClues) {
        for (const [word, tag] of taggedWords) {
            if (contextClues.includes(word.toLowerCase())) {
                return true;
            }
        }
        return false;
    };

    // ========================================
    // STEP 6: ROLE EXTRACTION
    // ========================================

    SemanticRoleExtractor.prototype._extractRoles = function(taggedWords, verbInfo, frame) {
        const roles = {};
        const verbPosition = verbInfo.position;

        if (verbPosition === -1) return roles;

        // Extract agent (subject before verb)
        roles.agent = this._extractAgent(taggedWords, verbPosition);

        // Extract patient/recipient/theme (object after verb)
        roles.patient = this._extractPatient(taggedWords, verbPosition);

        // Extract additional roles based on frame
        if (frame.name !== 'unknown' && this.frames[frame.name]) {
            const frameDef = this.frames[frame.name];

            // Look for specific role types
            if (frameDef.requiredRoles && frameDef.requiredRoles.includes('recipient')) {
                roles.recipient = this._extractRecipient(taggedWords, verbPosition);
            }

            if ((frameDef.requiredRoles && frameDef.requiredRoles.includes('theme')) ||
                (frameDef.optionalRoles && frameDef.optionalRoles.includes('theme'))) {
                roles.theme = this._extractTheme(taggedWords, verbPosition);
            }
        }

        return roles;
    };

    SemanticRoleExtractor.prototype._extractAgent = function(taggedWords, verbPosition) {
        // Look for subject (typically PRP, NN, NNP before verb)
        for (let i = verbPosition - 1; i >= 0; i--) {
            const [word, tag] = taggedWords[i];

            // WEEK 1 FIX: Skip determiners and modals, continue looking for noun/pronoun
            // E.g., "The family must decide" should extract "family", skipping "must" and "The"
            if (tag === 'DT' || tag === 'PDT' || tag === 'MD') {
                continue;  // Skip determiners (the, a, an) and modals (must, should, can)
            }

            // WEEK 1 FIX: Include RB (adverb) tag for nouns that get mistagged
            // E.g., "family" in "The family must decide" is sometimes tagged as RB instead of NN
            // This is a POS tagger limitation - some nouns get misclassified
            if (tag === 'PRP' || tag === 'NN' || tag === 'NNP' || tag === 'NNS' || tag === 'RB') {
                // Double-check: if tagged as RB, make sure it's a known noun that gets mistagged
                if (tag === 'RB') {
                    const commonNounsMistagged = ['family', 'person', 'people', 'community', 'friend'];
                    if (!commonNounsMistagged.includes(word.toLowerCase())) {
                        // Actually an adverb, skip it
                        continue;
                    }
                }

                return {
                    text: word,
                    role: 'agent',
                    entity: this._categorizeEntity(word),
                    posTag: tag === 'RB' ? 'NN' : tag,  // Normalize RB → NN for output
                    position: i
                };
            }
        }

        return null;
    };

    SemanticRoleExtractor.prototype._extractPatient = function(taggedWords, verbPosition) {
        // Look for direct object (NN, NNP, NNS after verb)
        for (let i = verbPosition + 1; i < taggedWords.length; i++) {
            const [word, tag] = taggedWords[i];

            if (tag === 'NN' || tag === 'NNP' || tag === 'NNS' || tag === 'PRP') {
                return {
                    text: word,
                    role: 'patient',
                    entity: this._categorizeEntity(word),
                    posTag: tag,  // IEE requirement
                    position: i
                };
            }
        }

        return null;
    };

    SemanticRoleExtractor.prototype._extractRecipient = function(taggedWords, verbPosition) {
        // Look for recipient (often introduced by 'to')
        for (let i = verbPosition + 1; i < taggedWords.length - 1; i++) {
            const [word, tag] = taggedWords[i];

            if (word === 'to' && i + 1 < taggedWords.length) {
                const [nextWord, nextTag] = taggedWords[i + 1];
                if (nextTag === 'NN' || nextTag === 'NNP' || nextTag === 'PRP') {
                    return {
                        text: nextWord,
                        role: 'recipient',
                        entity: this._categorizeEntity(nextWord),
                        posTag: nextTag,  // IEE requirement
                        position: i + 1
                    };
                }
            }
        }

        // Fallback: first noun after verb
        return this._extractPatient(taggedWords, verbPosition);
    };

    SemanticRoleExtractor.prototype._extractTheme = function(taggedWords, verbPosition) {
        // Look for theme (what the action is about)
        // Often introduced by 'about', 'regarding', or direct object
        for (let i = verbPosition + 1; i < taggedWords.length - 1; i++) {
            const [word, tag] = taggedWords[i];

            if ((word === 'about' || word === 'regarding') && i + 1 < taggedWords.length) {
                const [nextWord, nextTag] = taggedWords[i + 1];
                if (nextTag === 'NN' || nextTag === 'NNP' || nextTag === 'NNS') {
                    return {
                        text: nextWord,
                        role: 'theme',
                        entity: this._categorizeEntity(nextWord),
                        posTag: nextTag,  // IEE requirement
                        position: i + 1
                    };
                }
            }
        }

        return null;
    };

    SemanticRoleExtractor.prototype._categorizeEntity = function(word) {
        word = word.toLowerCase();

        for (const [category, pronouns] of Object.entries(ENTITY_CATEGORIES)) {
            if (pronouns.includes(word)) {
                return category;
            }
        }

        // Check if proper noun (doctor, community, etc.)
        const recognizedEntities = {
            'doctor': 'medical_professional',
            'nurse': 'medical_professional',
            'patient': 'medical_patient',
            'community': 'social_group',
            'family': 'social_group',
            'friend': 'social_relation',
            'pain': 'physical_sensation',
            'suffering': 'physical_sensation'
        };

        return recognizedEntities[word] || 'UNKNOWN';
    };

    // ========================================
    // STEP 7: CONFIDENCE COMPUTATION
    // ========================================

    SemanticRoleExtractor.prototype._computeConfidence = function(roles, frame, verbInfo) {
        let confidence = 0.5; // Base confidence

        // Boost if verb was found
        if (verbInfo.lemma) confidence += 0.2;

        // Boost if frame was classified
        if (frame.name !== 'unknown' && frame.name !== 'generic_action') {
            confidence += 0.1;
        }

        // Boost if agent found
        if (roles.agent) confidence += 0.1;

        // Boost if patient/recipient/theme found
        if (roles.patient || roles.recipient || roles.theme) confidence += 0.1;

        // Penalize if required roles missing
        if (frame.name !== 'unknown' && this.frames[frame.name]) {
            const frameDef = this.frames[frame.name];
            for (const requiredRole of frameDef.requiredRoles) {
                if (!roles[requiredRole]) {
                    confidence -= 0.15;
                }
            }
        }

        return Math.max(0.0, Math.min(1.0, confidence));
    };

    // ========================================
    // STEP 8: AMBIGUITY DETECTION
    // ========================================

    SemanticRoleExtractor.prototype._detectAmbiguity = function(roles, frame, taggedWords) {
        const ambiguity = {
            flagged: false,
            reason: null,
            alternatives: []
        };

        // Check 1: Missing required roles
        if (frame.name !== 'unknown' && this.frames[frame.name]) {
            const frameDef = this.frames[frame.name];
            const missingRoles = frameDef.requiredRoles.filter(role => !roles[role]);

            if (missingRoles.length > 0) {
                ambiguity.flagged = true;
                ambiguity.reason = `Missing required roles: ${missingRoles.join(', ')}`;
            }
        }

        // Check 2: Ambiguous entities (UNKNOWN)
        for (const [roleType, roleData] of Object.entries(roles)) {
            if (roleData && roleData.entity === 'UNKNOWN') {
                ambiguity.flagged = true;
                if (!ambiguity.reason) {
                    ambiguity.reason = `Ambiguous entity: ${roleData.text}`;
                }
            }
        }

        // Check 3: Multiple possible interpretations (future enhancement)

        return ambiguity;
    };

    // ========================================
    // STEP 9: BUILD RESULT OBJECT
    // ========================================

    SemanticRoleExtractor.prototype._buildSemanticAction = function(
        roles, verbInfo, frame, negation, modality, confidence, ambiguity, contextIntensity, ethicalProfile
    ) {
        // Map internal frame name to IEE expected format
        const ieeFrameName = FRAME_NAME_MAPPING[frame.name] || frame.name;

        const result = {
            // Version (Week 2b: 2.0)
            version: ethicalProfile ? "2.0" : (contextIntensity ? "1.5" : "1.0"),

            // Core semantic structure (IEE format)
            agent: roles.agent || null,
            action: {
                verb: verbInfo.word,                     // Original verb form (IEE requirement)
                lemma: verbInfo.lemma || verbInfo.word,  // Base form (IEE requirement)
                tense: verbInfo.tense || 'present',      // IEE requirement
                aspect: verbInfo.aspect || 'simple',     // IEE requirement
                modality: modality.marker || null,       // IEE requirement
                negation: negation.present               // IEE requirement: "negation" not "negated"
            },
            patient: roles.patient || null,
            recipient: roles.recipient || null,
            theme: roles.theme || null,

            // Top-level semantic frame (IEE requirement - mapped to IEE format)
            semanticFrame: ieeFrameName,  // IEE requirement: top-level, not nested

            // Metadata
            confidence: confidence,
            ambiguity: ambiguity,

            // Legacy fields for backward compatibility (will remove after IEE validates)
            _legacy: {
                frameDescription: frame.description,
                negationMarker: negation.marker,
                modality: modality
            },

            // Helper methods
            toString: function() {
                const agentStr = this.agent ? this.agent.text : '???';
                const actionStr = this.action.negation ? `NOT ${this.action.verb}` : this.action.verb;
                const objectStr = this.patient?.text || this.recipient?.text || this.theme?.text || '???';
                return `${agentStr} ${actionStr} ${objectStr} [${this.semanticFrame}]`;
            }
        };

        // Week 2a: Add context intensity if available
        if (contextIntensity) {
            result.contextIntensity = contextIntensity;
        }

        // Week 2b: Add ethical profile if available
        if (ethicalProfile) {
            result.ethicalProfile = ethicalProfile;
        }

        return result;
    };

    // ========================================
    // EXPORT
    // ========================================

    window.SemanticRoleExtractor = SemanticRoleExtractor;

})(window);
