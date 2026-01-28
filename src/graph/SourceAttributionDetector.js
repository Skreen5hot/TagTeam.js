/**
 * SourceAttributionDetector.js
 *
 * Phase 7.1: Detects source attribution patterns in text.
 * v1-Limited scope: direct quotes, reported speech, institutional sources.
 *
 * Detection Patterns:
 * - Direct quotes: "X," said Dr. Smith
 * - Reported speech: The nurse reported that...
 * - Institutional: Hospital policy states...
 *
 * @module graph/SourceAttributionDetector
 * @version 1.0.0
 */

/**
 * Attribution reporting verbs - signal that a source is being cited
 */
const REPORTING_VERBS = {
  // Strong attribution (high reliability)
  'said': { strength: 0.9, tense: 'past' },
  'says': { strength: 0.9, tense: 'present' },
  'stated': { strength: 0.95, tense: 'past' },
  'states': { strength: 0.95, tense: 'present' },
  'announced': { strength: 0.9, tense: 'past' },
  'announces': { strength: 0.9, tense: 'present' },
  'declared': { strength: 0.95, tense: 'past' },
  'declares': { strength: 0.95, tense: 'present' },
  'confirmed': { strength: 0.95, tense: 'past' },
  'confirms': { strength: 0.95, tense: 'present' },

  // Medium attribution
  'reported': { strength: 0.8, tense: 'past' },
  'reports': { strength: 0.8, tense: 'present' },
  'claimed': { strength: 0.7, tense: 'past' },
  'claims': { strength: 0.7, tense: 'present' },
  'argued': { strength: 0.75, tense: 'past' },
  'argues': { strength: 0.75, tense: 'present' },
  'noted': { strength: 0.8, tense: 'past' },
  'notes': { strength: 0.8, tense: 'present' },
  'explained': { strength: 0.85, tense: 'past' },
  'explains': { strength: 0.85, tense: 'present' },
  'mentioned': { strength: 0.75, tense: 'past' },
  'mentions': { strength: 0.75, tense: 'present' },
  'told': { strength: 0.85, tense: 'past' },
  'tells': { strength: 0.85, tense: 'present' },
  'informed': { strength: 0.85, tense: 'past' },
  'informs': { strength: 0.85, tense: 'present' },

  // Weaker attribution (may indicate uncertainty)
  'suggested': { strength: 0.6, tense: 'past' },
  'suggests': { strength: 0.6, tense: 'present' },
  'indicated': { strength: 0.65, tense: 'past' },
  'indicates': { strength: 0.65, tense: 'present' },
  'implied': { strength: 0.5, tense: 'past' },
  'implies': { strength: 0.5, tense: 'present' },
  'believed': { strength: 0.55, tense: 'past' },
  'believes': { strength: 0.55, tense: 'present' },
  'thought': { strength: 0.5, tense: 'past' },
  'thinks': { strength: 0.5, tense: 'present' },

  // Written sources
  'wrote': { strength: 0.9, tense: 'past' },
  'writes': { strength: 0.9, tense: 'present' },
  'documented': { strength: 0.9, tense: 'past' },
  'documents': { strength: 0.9, tense: 'present' }
};

/**
 * Institutional source patterns - organizations/policies as sources
 */
const INSTITUTIONAL_PATTERNS = [
  // Policies and guidelines
  { pattern: /(?:hospital|clinic|facility)\s+policy\s+(?:states|requires|mandates|recommends)/i, type: 'policy' },
  { pattern: /(?:medical|clinical|ethical)\s+guidelines?\s+(?:state|require|recommend|suggest)/i, type: 'guideline' },
  { pattern: /(?:treatment|care)\s+protocol\s+(?:states|requires|specifies)/i, type: 'protocol' },
  { pattern: /(?:the|this)\s+(?:organization|institution|hospital|agency)\s+(?:states|requires|mandates)/i, type: 'institutional' },

  // Standards and regulations
  { pattern: /(?:federal|state|local)\s+(?:law|regulation|statute)\s+(?:requires|mandates|prohibits)/i, type: 'regulation' },
  { pattern: /(?:professional|medical|ethical)\s+standards?\s+(?:require|mandate|state)/i, type: 'standard' },
  { pattern: /code\s+of\s+(?:ethics|conduct)\s+(?:states|requires|prohibits)/i, type: 'code' },

  // Official documents
  { pattern: /(?:the|this)\s+(?:report|study|document|memo)\s+(?:states|indicates|shows|confirms)/i, type: 'document' },
  { pattern: /(?:medical|patient)\s+records?\s+(?:show|indicate|confirm|document)/i, type: 'record' },

  // Committee/board decisions (allow adjectives like "ethics committee")
  { pattern: /(?:the|this)\s+(?:\w+\s+)?(?:committee|board|panel|council)\s+(?:decided|ruled|determined|recommended)/i, type: 'committee' }
];

/**
 * Person role patterns for source identification
 */
const PERSON_ROLE_PATTERNS = {
  'doctor': 'cco:Physician',
  'dr': 'cco:Physician',
  'physician': 'cco:Physician',
  'surgeon': 'cco:Physician',
  'nurse': 'cco:Nurse',
  'patient': 'cco:Patient',
  'family': 'cco:FamilyMember',
  'relative': 'cco:FamilyMember',
  'researcher': 'cco:Researcher',
  'scientist': 'cco:Researcher',
  'expert': 'cco:Expert',
  'specialist': 'cco:Specialist',
  'lawyer': 'cco:LegalProfessional',
  'attorney': 'cco:LegalProfessional',
  'judge': 'cco:Judge',
  'official': 'cco:Official',
  'spokesperson': 'cco:Spokesperson',
  'witness': 'cco:Witness',
  'professor': 'cco:AcademicProfessional',
  'administrator': 'cco:Administrator'
};

/**
 * SourceAttributionDetector class
 * Detects and classifies source attributions in text
 */
class SourceAttributionDetector {
  /**
   * Create a SourceAttributionDetector
   * @param {Object} [options] - Configuration options
   * @param {boolean} [options.includePositions=true] - Include source text positions
   * @param {number} [options.minConfidence=0.5] - Minimum confidence for detection
   */
  constructor(options = {}) {
    this.options = {
      includePositions: true,
      minConfidence: 0.4, // Lower default to include weak verbs like "implied" (0.5 * 0.9 = 0.45)
      ...options
    };
  }

  /**
   * Analyze text for source attributions
   * @param {string} text - Text to analyze
   * @returns {Object} Attribution analysis result
   */
  analyze(text) {
    const attributions = [];

    // Detect direct quotes
    const quotes = this._detectDirectQuotes(text);
    attributions.push(...quotes);

    // Detect reported speech (non-quoted)
    const reported = this._detectReportedSpeech(text);
    attributions.push(...reported);

    // Detect institutional sources
    const institutional = this._detectInstitutionalSources(text);
    attributions.push(...institutional);

    // Detect "according to" patterns
    const accordingTo = this._detectAccordingTo(text);
    attributions.push(...accordingTo);

    // Deduplicate overlapping attributions (prefer higher confidence)
    const deduped = this._deduplicateAttributions(attributions);

    // Filter by minimum confidence
    const filtered = deduped.filter(a => a.confidence >= this.options.minConfidence);

    return {
      attributions: filtered,
      hasAttributions: filtered.length > 0,
      attributionCount: filtered.length,
      dominantType: this._getDominantType(filtered),
      summary: this._generateSummary(filtered)
    };
  }

  /**
   * Analyze a specific claim for attribution
   * @param {string} claimText - The claim text
   * @param {Object} [context] - Additional context
   * @returns {Object} Claim attribution analysis with tagteam properties
   */
  analyzeClaimAttribution(claimText, context = {}) {
    const analysis = this.analyze(claimText);

    if (analysis.attributions.length === 0) {
      return {
        'tagteam:hasAttribution': false,
        'tagteam:attributionType': 'unattributed'
      };
    }

    const primary = analysis.attributions[0]; // Most confident attribution

    return {
      'tagteam:hasAttribution': true,
      'tagteam:attributionType': primary.type,
      'tagteam:detectedSource': primary.source,
      'tagteam:sourceType': primary.sourceType || null,
      'tagteam:attributionConfidence': primary.confidence,
      'tagteam:attributionEvidence': primary.evidence
    };
  }

  /**
   * Detect direct quote attributions
   * Patterns: "X," said Y / Y said "X" / Y: "X"
   * @private
   */
  _detectDirectQuotes(text) {
    const attributions = [];

    // Name pattern: handles "Dr. Smith", "John Smith", "Smith", "Professor Jones"
    // Allows optional title (Dr., Mr., Mrs., Ms., Prof.) + name(s)
    const namePattern = '(?:(?:Dr|Mr|Mrs|Ms|Prof|Professor)\\.?\\s+)?[A-Z][a-zA-Z]+(?:\\s+[A-Z][a-zA-Z]+)*';

    // Pattern 1: "quote," said Source
    const postQuotePattern = new RegExp(`"([^"]+)",?\\s+(\\w+)\\s+(${namePattern})`, 'g');
    let match;

    while ((match = postQuotePattern.exec(text)) !== null) {
      const [fullMatch, quote, verb, source] = match;
      const verbLower = verb.toLowerCase();

      if (REPORTING_VERBS[verbLower]) {
        attributions.push({
          type: 'direct_quote',
          source: source.trim(),
          sourceType: this._classifySource(source),
          quote: quote.trim(),
          verb: verbLower,
          confidence: REPORTING_VERBS[verbLower].strength,
          evidence: fullMatch,
          position: this.options.includePositions ? match.index : undefined
        });
      }
    }

    // Pattern 2: Source said "quote" / Source said, "quote"
    const preQuotePattern = new RegExp(`(${namePattern})\\s+(\\w+),?\\s+"([^"]+)"`, 'g');

    while ((match = preQuotePattern.exec(text)) !== null) {
      const [fullMatch, source, verb, quote] = match;
      const verbLower = verb.toLowerCase();

      if (REPORTING_VERBS[verbLower]) {
        attributions.push({
          type: 'direct_quote',
          source: source.trim(),
          sourceType: this._classifySource(source),
          quote: quote.trim(),
          verb: verbLower,
          confidence: REPORTING_VERBS[verbLower].strength,
          evidence: fullMatch,
          position: this.options.includePositions ? match.index : undefined
        });
      }
    }

    // Pattern 3: Source: "quote"
    const colonQuotePattern = new RegExp(`(${namePattern}):\\s*"([^"]+)"`, 'g');

    while ((match = colonQuotePattern.exec(text)) !== null) {
      const [fullMatch, source, quote] = match;
      attributions.push({
        type: 'direct_quote',
        source: source.trim(),
        sourceType: this._classifySource(source),
        quote: quote.trim(),
        verb: null,
        confidence: 0.85,
        evidence: fullMatch,
        position: this.options.includePositions ? match.index : undefined
      });
    }

    return attributions;
  }

  /**
   * Detect reported speech (non-quoted)
   * Pattern: The X reported/said/claimed that...
   * @private
   */
  _detectReportedSpeech(text) {
    const attributions = [];

    // Pattern: The/A [role] [verb] that [content]
    // Use single word for source to avoid greedy matching
    const reportedPattern = /(?:the|a|an)\s+(\w+)\s+(\w+)\s+that\s+([^.!?]+[.!?]?)/gi;
    let match;

    while ((match = reportedPattern.exec(text)) !== null) {
      const [fullMatch, source, verb, content] = match;
      const verbLower = verb.toLowerCase();

      if (REPORTING_VERBS[verbLower]) {
        attributions.push({
          type: 'reported_speech',
          source: source.trim(),
          sourceType: this._classifySource(source),
          content: content.trim(),
          verb: verbLower,
          confidence: REPORTING_VERBS[verbLower].strength * 0.9, // Slightly lower than direct quote
          evidence: fullMatch.trim(),
          position: this.options.includePositions ? match.index : undefined
        });
      }
    }

    // Pattern: [Title + Name] [verb] that [content] - handles "Dr. Smith said that"
    const namePattern = '(?:(?:Dr|Mr|Mrs|Ms|Prof|Professor)\\.?\\s+)?[A-Z][a-zA-Z]+(?:\\s+[A-Z][a-zA-Z]+)?';
    const namedReportedPattern = new RegExp(`(${namePattern})\\s+(\\w+)\\s+that\\s+([^.!?]+[.!?]?)`, 'g');

    while ((match = namedReportedPattern.exec(text)) !== null) {
      const [fullMatch, source, verb, content] = match;
      const verbLower = verb.toLowerCase();

      if (REPORTING_VERBS[verbLower]) {
        attributions.push({
          type: 'reported_speech',
          source: source.trim(),
          sourceType: this._classifySource(source),
          content: content.trim(),
          verb: verbLower,
          confidence: REPORTING_VERBS[verbLower].strength * 0.9,
          evidence: fullMatch.trim(),
          position: this.options.includePositions ? match.index : undefined
        });
      }
    }

    return attributions;
  }

  /**
   * Detect institutional source attributions
   * @private
   */
  _detectInstitutionalSources(text) {
    const attributions = [];

    for (const { pattern, type } of INSTITUTIONAL_PATTERNS) {
      const match = text.match(pattern);

      if (match) {
        attributions.push({
          type: 'institutional',
          institutionalType: type,
          source: match[0],
          sourceType: 'cco:Organization',
          confidence: 0.85,
          evidence: match[0],
          position: this.options.includePositions ? match.index : undefined
        });
      }
    }

    return attributions;
  }

  /**
   * Detect "according to" patterns
   * @private
   */
  _detectAccordingTo(text) {
    const attributions = [];

    // Pattern: According to [source], [content]
    const accordingPattern = /according\s+to\s+([^,]+),?\s*([^.!?]+[.!?]?)/gi;
    let match;

    while ((match = accordingPattern.exec(text)) !== null) {
      const [fullMatch, source, content] = match;

      attributions.push({
        type: 'according_to',
        source: source.trim(),
        sourceType: this._classifySource(source),
        content: content.trim(),
        confidence: 0.8,
        evidence: fullMatch.trim(),
        position: this.options.includePositions ? match.index : undefined
      });
    }

    return attributions;
  }

  /**
   * Classify the source type
   * @private
   */
  _classifySource(source) {
    if (!source) return null;

    const lower = source.toLowerCase();

    // Check against known person roles
    for (const [role, type] of Object.entries(PERSON_ROLE_PATTERNS)) {
      if (lower.includes(role)) {
        return type;
      }
    }

    // Check for organizational patterns
    if (/(?:hospital|clinic|agency|organization|institution|committee|board|panel|council)/i.test(lower)) {
      return 'cco:Organization';
    }

    // Check for document patterns
    if (/(?:report|study|document|record|policy|guideline|protocol)/i.test(lower)) {
      return 'cco:InformationContentEntity';
    }

    // Default: assume person if starts with capital (likely a name)
    if (/^[A-Z]/.test(source)) {
      return 'cco:Person';
    }

    return null;
  }

  /**
   * Deduplicate overlapping attributions
   * @private
   */
  _deduplicateAttributions(attributions) {
    if (attributions.length <= 1) return attributions;

    // Sort by confidence (descending)
    const sorted = [...attributions].sort((a, b) => b.confidence - a.confidence);
    const kept = [];

    for (const attr of sorted) {
      // Check if this overlaps with any kept attribution
      const overlaps = kept.some(k => {
        if (k.position === undefined || attr.position === undefined) return false;
        const kEnd = k.position + (k.evidence?.length || 0);
        const aEnd = attr.position + (attr.evidence?.length || 0);
        return (attr.position >= k.position && attr.position < kEnd) ||
               (k.position >= attr.position && k.position < aEnd);
      });

      if (!overlaps) {
        kept.push(attr);
      }
    }

    return kept;
  }

  /**
   * Get dominant attribution type
   * @private
   */
  _getDominantType(attributions) {
    if (attributions.length === 0) return 'none';

    const counts = {};
    for (const attr of attributions) {
      counts[attr.type] = (counts[attr.type] || 0) + 1;
    }

    let maxType = 'none';
    let maxCount = 0;
    for (const [type, count] of Object.entries(counts)) {
      if (count > maxCount) {
        maxType = type;
        maxCount = count;
      }
    }

    return maxType;
  }

  /**
   * Generate summary of attributions
   * @private
   */
  _generateSummary(attributions) {
    if (attributions.length === 0) {
      return 'No source attributions detected';
    }

    const types = new Set(attributions.map(a => a.type));
    const sources = new Set(attributions.map(a => a.source));

    return `${attributions.length} attribution(s): ${[...types].join(', ')} from ${[...sources].join(', ')}`;
  }

  /**
   * Get reporting verbs lexicon
   * @returns {Object} Reporting verbs with metadata
   */
  static getReportingVerbs() {
    return REPORTING_VERBS;
  }

  /**
   * Get count of reporting verbs
   * @returns {number} Number of reporting verbs in lexicon
   */
  static getVerbCount() {
    return Object.keys(REPORTING_VERBS).length;
  }

  /**
   * Get institutional patterns
   * @returns {Array} Institutional source patterns
   */
  static getInstitutionalPatterns() {
    return INSTITUTIONAL_PATTERNS;
  }
}

module.exports = SourceAttributionDetector;
