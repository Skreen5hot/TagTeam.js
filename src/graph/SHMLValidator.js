/**
 * SHMLValidator.js
 *
 * Validates JSON-LD graphs against SHACL patterns for BFO/CCO compliance.
 * Implements 8 expert-certified validation patterns from SHACL_PATTERNS_REFERENCE.md.
 *
 * Patterns:
 * 1. Information Staircase (ICE → IBE → Literal)
 * 2. Role Pattern (bearer necessity, realization)
 * 3. Designation Pattern
 * 4. Temporal Interval Pattern
 * 5. Measurement Pattern
 * 6. Socio-Primal Pattern (Agent/Act)
 * 7. Domain/Range Validation
 * 8. Vocabulary Validation
 *
 * Severity Levels:
 * - VIOLATION: Must be fixed (ontologically impossible otherwise)
 * - WARNING: Should be addressed (incomplete but valid)
 * - INFO: Suggestion (nice to have)
 *
 * @module graph/SHMLValidator
 * @version 4.0.0-phase4-week3
 */

/**
 * Extract IRI from a relation value (handles both string and object notation)
 * @param {string|Object} value - Relation value (IRI string or {`@id`: IRI})
 * @returns {string|null} The IRI string, or null if invalid
 */
function extractIRI(value) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value['@id']) return value['@id'];
  return null;
}

/**
 * Known CCO/BFO class names for vocabulary validation
 */
const KNOWN_CLASSES = new Set([
  // BFO Classes
  'bfo:BFO_0000001', // Entity
  'bfo:BFO_0000002', // Continuant
  'bfo:BFO_0000003', // Occurrent
  'bfo:BFO_0000004', // IndependentContinuant
  'bfo:BFO_0000015', // Process
  'bfo:BFO_0000016', // Disposition
  'bfo:BFO_0000017', // RealizableEntity
  'bfo:BFO_0000019', // Quality
  'bfo:BFO_0000020', // SpecificallyDependentContinuant
  'bfo:BFO_0000023', // Role
  'bfo:BFO_0000027', // ObjectAggregate
  'bfo:BFO_0000031', // GenericallyDependentContinuant
  'bfo:BFO_0000040', // MaterialEntity
  'bfo:BFO_0000115', // has_member_part
  'bfo:BFO_0000197', // inheres_in
  'bfo:BFO_0000196', // is_bearer_of
  'bfo:BFO_0000054', // realized_in
  'bfo:BFO_0000055', // realizes
  'bfo:BFO_0000057', // has_participant
  'bfo:BFO_0000058', // is_concretized_by
  'bfo:BFO_0000059', // concretizes

  // CCO Classes
  'Agent', 'Person', 'Organization', 'GeopoliticalOrganization',
  'Artifact', 'Facility',
  'Act', 'IntentionalAct', 'ActOfCommunication',
  'InformationBearingEntity', 'InformationContentEntity',
  'Role',

  // OWL
  'owl:NamedIndividual', 'owl:Thing', 'owl:Class',

  // TagTeam Classes
  'tagteam:DiscourseReferent', 'tagteam:VerbPhrase',
  'tagteam:DeonticContent', 'tagteam:DirectiveContent', 'tagteam:ScarcityAssertion',
  'tagteam:ValueDetectionRecord', 'tagteam:ContextAssessmentRecord',
  'tagteam:InterpretationContext',
  'tagteam:ValueAssertionEvent', 'tagteam:ContextAssessmentEvent',
  'tagteam:EthicalValueICE', 'tagteam:ContextDimensionICE',
  'tagteam:AutomatedDetection', 'tagteam:HumanValidation',
  'tagteam:HumanRejection', 'tagteam:HumanCorrection',
  'tagteam:StructuralAssertion', 'tagteam:ComplexDesignator'
]);

/**
 * Known predicates for vocabulary validation
 */
const KNOWN_PREDICATES = new Set([
  // BFO Relations (bare aliases — resolved via @context to opaque IRIs)
  'inheres_in', 'is_bearer_of', 'realized_in', 'realizes',
  'has_participant', 'has_member_part',
  'is_concretized_by', 'concretizes',

  // CCO Relations (bare aliases — resolved via @context)
  'is_about', 'prescribes', 'has_recipient',
  'has_text_value',
  'has_agent', 'affects',
  'occupies_temporal_region', 'participates_in', 'is_part_of',
  'occurs_during', 'designates', 'is_designated_by',
  'is_measured_by', 'measures', 'has_measurement_value',
  'uses_measurement_unit', 'has_start_time', 'has_end_time',

  // RDF/RDFS/OWL
  'rdf:type', 'rdfs:label', 'rdfs:comment', 'rdfs:subClassOf',

  // TagTeam Properties - Core
  'tagteam:has_component', 'tagteam:extracted_from', 'tagteam:corefersWith',
  'tagteam:would_be_realized_in', 'tagteam:assertionType', 'tagteam:validInContext',
  'tagteam:actualityStatus', 'tagteam:validatedBy', 'tagteam:validationTimestamp',
  'tagteam:supersedes', 'tagteam:framework', 'tagteam:instantiated_at',
  'tagteam:instantiated_by', 'tagteam:negationMarker',
  // TagTeam Properties - Confidence
  'tagteam:extractionConfidence', 'tagteam:classificationConfidence',
  'tagteam:relevanceConfidence', 'tagteam:aggregateConfidence', 'tagteam:aggregationMethod',
  // TagTeam Properties - Modal
  'tagteam:modalType', 'tagteam:modalMarker', 'tagteam:modalStrength',
  // TagTeam Properties - Scarcity
  'tagteam:scarceResource', 'tagteam:competingParties', 'tagteam:supplyCount',
  'tagteam:demandCount', 'tagteam:scarcityRatio', 'tagteam:scarcityMarker',
  // TagTeam Properties - Entity/Quality
  'tagteam:evidenceText', 'tagteam:detected_at', 'tagteam:member_count',
  'tagteam:member_index', 'tagteam:qualifierText', 'tagteam:severity', 'tagteam:ageCategory',
  'tagteam:sourceText', 'tagteam:startPosition', 'tagteam:endPosition',
  'tagteam:definiteness', 'tagteam:quantity', 'tagteam:quantityIndicator', 'tagteam:qualifiers',
  'tagteam:referentialStatus', 'tagteam:denotesType', 'tagteam:roleType',
  'tagteam:extracted_from_span', 'tagteam:span_offset',
  // TagTeam Properties - Act
  'tagteam:verb', 'tagteam:lemma', 'tagteam:tense', 'tagteam:hasModalMarker',
  'tagteam:modality', 'tagteam:aspect',
  // TagTeam Properties - IBE
  'tagteam:char_count', 'tagteam:word_count', 'tagteam:received_at', 'tagteam:temporal_extent',
  'tagteam:version', 'tagteam:algorithm', 'tagteam:capabilities',
  // TagTeam Properties - Value/Context
  'tagteam:valueName', 'tagteam:valueCategory', 'tagteam:evidence', 'tagteam:sourceSpan',
  'tagteam:category', 'tagteam:asserts', 'tagteam:detected_by', 'tagteam:based_on',
  'tagteam:polarity', 'tagteam:salience', 'tagteam:matched_markers',
  'tagteam:detection_method', 'tagteam:dimension', 'tagteam:score',
  // TagTeam Properties - Directive
  'tagteam:prescribes',
  // TagTeam Properties - StructuralAssertion (Phase 7 v7)
  'tagteam:assertsRelation', 'tagteam:hasSubject', 'tagteam:hasObject', 'tagteam:inverseRelation'
]);

/**
 * SHML Validator class
 */
class SHMLValidator {
  /**
   * Create a new SHMLValidator
   * @param {Object} options - Validation options
   * @param {boolean} [options.strict=false] - Treat warnings as violations
   * @param {boolean} [options.verbose=false] - Include INFO level issues
   */
  constructor(options = {}) {
    this.options = {
      strict: options.strict || false,
      verbose: options.verbose || false,
      ...options
    };

    this.results = {
      violations: [],
      warnings: [],
      info: [],
      patterns: {}
    };
  }

  /**
   * Validate a JSON-LD graph against all SHACL patterns
   *
   * @param {Object} graph - JSON-LD graph with @graph array
   * @returns {Object} Validation result with violations, warnings, info, and compliance score
   *
   * @example
   * const validator = new SHMLValidator();
   * const result = validator.validate(graph);
   * console.log(result.complianceScore); // 85
   * console.log(result.violations);      // [{pattern, message, node}]
   */
  validate(graph) {
    // Reset results
    this.results = {
      violations: [],
      warnings: [],
      info: [],
      patterns: {}
    };

    const nodes = graph['@graph'] || [];
    const nodeMap = this._buildNodeMap(nodes);

    // Run all patterns
    this._validateInformationStaircase(nodes, nodeMap);
    this._validateRolePattern(nodes, nodeMap);
    this._validateDesignationPattern(nodes, nodeMap);
    this._validateTemporalIntervalPattern(nodes, nodeMap);
    this._validateMeasurementPattern(nodes, nodeMap);
    this._validateSocioPrimalPattern(nodes, nodeMap);
    this._validateDomainRange(nodes, nodeMap);
    this._validateVocabulary(nodes);

    // Calculate compliance score
    const complianceScore = this._calculateComplianceScore(nodes);

    return {
      valid: this.results.violations.length === 0,
      complianceScore,
      violations: this.results.violations,
      warnings: this.results.warnings,
      info: this.options.verbose ? this.results.info : [],
      patterns: this.results.patterns,
      summary: {
        totalNodes: nodes.length,
        violationCount: this.results.violations.length,
        warningCount: this.results.warnings.length,
        infoCount: this.results.info.length
      }
    };
  }

  /**
   * Build a map of node IDs to nodes for quick lookup
   * @private
   */
  _buildNodeMap(nodes) {
    const map = new Map();
    for (const node of nodes) {
      if (node['@id']) {
        map.set(node['@id'], node);
      }
    }
    return map;
  }

  /**
   * Get types of a node as an array
   * @private
   */
  _getTypes(node) {
    const type = node['@type'];
    if (!type) return [];
    return Array.isArray(type) ? type : [type];
  }

  /**
   * Check if node has a specific type
   * @private
   */
  _hasType(node, typePattern) {
    const types = this._getTypes(node);
    return types.some(t => t.includes(typePattern));
  }

  /**
   * Add a validation issue
   * @private
   */
  _addIssue(severity, pattern, message, nodeId = null, suggestion = null) {
    const issue = {
      severity,
      pattern,
      message,
      nodeId,
      suggestion
    };

    switch (severity) {
      case 'VIOLATION':
        this.results.violations.push(issue);
        break;
      case 'WARNING':
        if (this.options.strict) {
          this.results.violations.push(issue);
        } else {
          this.results.warnings.push(issue);
        }
        break;
      case 'INFO':
        this.results.info.push(issue);
        break;
    }
  }

  // ================================================================
  // Pattern 1: Information Staircase
  // ================================================================

  /**
   * Validate Information Staircase pattern (ICE → IBE → Literal)
   * @private
   */
  _validateInformationStaircase(nodes, nodeMap) {
    let passed = 0;
    let total = 0;

    // Find all ICE nodes
    const iceNodes = nodes.filter(n =>
      this._hasType(n, 'InformationContentEntity') ||
      this._hasType(n, 'EthicalValueICE') ||
      this._hasType(n, 'ContextDimensionICE')
    );

    // Find all IBE nodes
    const ibeNodes = nodes.filter(n =>
      this._hasType(n, 'InformationBearingEntity')
    );

    // Rule 1: ICE should have is_concretized_by
    for (const ice of iceNodes) {
      total++;
      if (ice['is_concretized_by']) {
        passed++;
      } else {
        this._addIssue(
          'WARNING',
          'InformationStaircase',
          `ICE node ${ice['@id']} has no is_concretized_by link to IBE`,
          ice['@id'],
          'Add is_concretized_by property pointing to the IBE'
        );
      }
    }

    // Rule 2: IBE should have has_text_value
    for (const ibe of ibeNodes) {
      total++;
      if (ibe['has_text_value']) {
        passed++;
      } else {
        this._addIssue(
          'WARNING',
          'InformationStaircase',
          `IBE node ${ibe['@id']} has no has_text_value literal`,
          ibe['@id'],
          'Add cco:has_text_value property with the source text'
        );
      }
    }

    // Rule 3: IBE should concretize at least one ICE
    for (const ibe of ibeNodes) {
      total++;
      // Check if any ICE links to this IBE
      const hasConcretization = iceNodes.some(ice =>
        extractIRI(ice['is_concretized_by']) === ibe['@id']
      );

      if (hasConcretization || extractIRI(ibe['concretizes'])) {
        passed++;
      } else {
        this._addIssue(
          'WARNING',
          'InformationStaircase',
          `IBE node ${ibe['@id']} does not concretize any ICE`,
          ibe['@id'],
          'Ensure ICE nodes link to this IBE via is_concretized_by'
        );
      }
    }

    this.results.patterns['InformationStaircase'] = {
      passed,
      total,
      score: total > 0 ? Math.round((passed / total) * 100) : 100
    };
  }

  // ================================================================
  // Pattern 2: Role Pattern
  // ================================================================

  /**
   * Validate Role Pattern (bearer necessity, realization)
   * @private
   */
  _validateRolePattern(nodes, nodeMap) {
    let passed = 0;
    let total = 0;

    // Find all Role nodes
    const roleNodes = nodes.filter(n =>
      this._hasType(n, 'Role') ||
      this._hasType(n, 'BFO_0000023') ||
      this._hasType(n, 'AgentRole') ||
      this._hasType(n, 'PatientRole')
    );

    // Build reverse map: role ID -> bearer (from is_bearer_of on entities)
    const roleBearers = new Map();
    for (const node of nodes) {
      const bearerOf = node['is_bearer_of'];
      if (bearerOf) {
        const roles = Array.isArray(bearerOf) ? bearerOf : [bearerOf];
        for (const roleId of roles) {
          roleBearers.set(roleId, node['@id']);
        }
      }
    }

    for (const role of roleNodes) {
      // Rule 1: Role MUST have bearer (VIOLATION)
      // Check: (1) reverse link via is_bearer_of, OR (2) direct link via inheres_in
      total++;
      const hasReverseLink = roleBearers.has(role['@id']);
      const inheresIn = extractIRI(role['inheres_in']);
      const hasDirectLink = inheresIn && nodeMap.has(inheresIn);

      if (hasReverseLink || hasDirectLink) {
        passed++;
        // Track the bearer for later type checking
        if (hasDirectLink && !roleBearers.has(role['@id'])) {
          roleBearers.set(role['@id'], inheresIn);
        }
      } else {
        this._addIssue(
          'VIOLATION',
          'RolePattern',
          `Role ${role['@id']} has no bearer - ontologically impossible`,
          role['@id'],
          'Add inheres_in on role or is_bearer_of on bearer entity'
        );
      }

      // Rule 3: Role SHOULD be realized (WARNING)
      total++;
      const isRealized = extractIRI(role['realized_in']) ||
        extractIRI(role['tagteam:would_be_realized_in']);

      // Also check if any process realizes this role
      const processRealizes = nodes.some(n =>
        extractIRI(n['realizes']) === role['@id']
      );

      if (isRealized || processRealizes) {
        passed++;
      } else {
        this._addIssue(
          'WARNING',
          'RolePattern',
          `Role ${role['@id']} is not realized by any process`,
          role['@id'],
          'Add cco:realized_in or tagteam:would_be_realized_in to link to a process'
        );
      }
    }

    // Rule 2: Check bearer types (WARNING)
    for (const [roleId, bearerId] of roleBearers) {
      const bearer = nodeMap.get(bearerId);
      if (bearer) {
        total++;
        const isIndependentContinuant =
          this._hasType(bearer, 'Agent') ||
          this._hasType(bearer, 'Person') ||
          this._hasType(bearer, 'Artifact') ||
          this._hasType(bearer, 'IndependentContinuant') ||
          this._hasType(bearer, 'BFO_0000004') ||
          this._hasType(bearer, 'MaterialEntity') ||
          this._hasType(bearer, 'DiscourseReferent'); // TagTeam discourse referents can bear roles

        if (isIndependentContinuant) {
          passed++;
        } else {
          this._addIssue(
            'WARNING',
            'RolePattern',
            `Role bearer ${bearerId} should be an IndependentContinuant`,
            bearerId,
            'Bearer should be Person, Agent, Artifact or similar'
          );
        }
      }
    }

    this.results.patterns['RolePattern'] = {
      passed,
      total,
      score: total > 0 ? Math.round((passed / total) * 100) : 100
    };
  }

  // ================================================================
  // Pattern 3: Designation Pattern
  // ================================================================

  /**
   * Validate Designation Pattern
   * @private
   */
  _validateDesignationPattern(nodes, nodeMap) {
    let passed = 0;
    let total = 0;

    // Find all Designative ICE nodes
    const designativeNodes = nodes.filter(n =>
      this._hasType(n, 'DesignativeInformationContentEntity')
    );

    for (const designative of designativeNodes) {
      total++;

      // Rule 1: Must designate something (VIOLATION)
      if (designative['designates'] || designative['is_designated_by']) {
        passed++;
      } else {
        this._addIssue(
          'VIOLATION',
          'DesignationPattern',
          `Designative ICE ${designative['@id']} does not designate any entity`,
          designative['@id'],
          'Add cco:designates property linking to the designated entity'
        );
      }
    }

    this.results.patterns['DesignationPattern'] = {
      passed,
      total,
      score: total > 0 ? Math.round((passed / total) * 100) : 100
    };
  }

  // ================================================================
  // Pattern 4: Temporal Interval Pattern
  // ================================================================

  /**
   * Validate Temporal Interval Pattern
   * @private
   */
  _validateTemporalIntervalPattern(nodes, nodeMap) {
    let passed = 0;
    let total = 0;

    // Find all TemporalInterval nodes
    const temporalNodes = nodes.filter(n =>
      this._hasType(n, 'TemporalInterval')
    );

    for (const interval of temporalNodes) {
      const hasStart = interval['has_start_time'];
      const hasEnd = interval['has_end_time'];

      // Rule 1: Should have start time (WARNING)
      total++;
      if (hasStart) {
        passed++;
      } else {
        this._addIssue(
          'WARNING',
          'TemporalIntervalPattern',
          `Temporal interval ${interval['@id']} has no start time`,
          interval['@id'],
          'Add cco:has_start_time property'
        );
      }

      // Rule 2: Should have end time (WARNING)
      total++;
      if (hasEnd) {
        passed++;
      } else {
        this._addIssue(
          'WARNING',
          'TemporalIntervalPattern',
          `Temporal interval ${interval['@id']} has no end time`,
          interval['@id'],
          'Add cco:has_end_time property (if process is complete)'
        );
      }

      // Rule 3: Start must be <= end (VIOLATION)
      if (hasStart && hasEnd) {
        total++;
        const startDate = new Date(hasStart);
        const endDate = new Date(hasEnd);

        if (startDate <= endDate) {
          passed++;
        } else {
          this._addIssue(
            'VIOLATION',
            'TemporalIntervalPattern',
            `Temporal interval ${interval['@id']} has backwards time (start > end)`,
            interval['@id'],
            'Start time must be before or equal to end time'
          );
        }
      }
    }

    this.results.patterns['TemporalIntervalPattern'] = {
      passed,
      total,
      score: total > 0 ? Math.round((passed / total) * 100) : 100
    };
  }

  // ================================================================
  // Pattern 5: Measurement Pattern
  // ================================================================

  /**
   * Validate Measurement Pattern
   * @private
   */
  _validateMeasurementPattern(nodes, nodeMap) {
    let passed = 0;
    let total = 0;

    // Find all QualityMeasurement nodes
    const measurementNodes = nodes.filter(n =>
      this._hasType(n, 'QualityMeasurement')
    );

    for (const measurement of measurementNodes) {
      // Rule 1: Must be linked to a Quality (VIOLATION)
      total++;
      const qualityLinks = nodes.some(n =>
        extractIRI(n['is_measured_by']) === measurement['@id']
      );

      if (qualityLinks || extractIRI(measurement['measures'])) {
        passed++;
      } else {
        this._addIssue(
          'VIOLATION',
          'MeasurementPattern',
          `Measurement ${measurement['@id']} is not linked to any quality`,
          measurement['@id'],
          'Link a Quality node to this measurement via cco:is_measured_by'
        );
      }

      // Rule 2: Must have measurement value (VIOLATION)
      total++;
      if (measurement['has_measurement_value'] !== undefined) {
        passed++;
      } else {
        this._addIssue(
          'VIOLATION',
          'MeasurementPattern',
          `Measurement ${measurement['@id']} has no value`,
          measurement['@id'],
          'Add cco:has_measurement_value property'
        );
      }

      // Rule 3: Must have measurement unit (VIOLATION)
      total++;
      if (measurement['uses_measurement_unit']) {
        passed++;
      } else {
        this._addIssue(
          'VIOLATION',
          'MeasurementPattern',
          `Measurement ${measurement['@id']} has no unit`,
          measurement['@id'],
          'Add cco:uses_measurement_unit property'
        );
      }
    }

    this.results.patterns['MeasurementPattern'] = {
      passed,
      total,
      score: total > 0 ? Math.round((passed / total) * 100) : 100
    };
  }

  // ================================================================
  // Pattern 6: Socio-Primal Pattern (Agent/Act)
  // ================================================================

  /**
   * Validate Socio-Primal Pattern
   * @private
   */
  _validateSocioPrimalPattern(nodes, nodeMap) {
    let passed = 0;
    let total = 0;

    // Find all Act nodes
    const actNodes = nodes.filter(n =>
      this._hasType(n, 'Act') ||
      this._hasType(n, 'IntentionalAct') ||
      this._hasType(n, 'Process') ||
      this._hasType(n, 'BFO_0000015')
    );

    for (const act of actNodes) {
      // Rule 1: Act should have temporal grounding (WARNING)
      total++;
      if (act['occurs_during'] || act['tagteam:temporal_extent']) {
        passed++;
      } else {
        this._addIssue(
          'WARNING',
          'SocioPrimalPattern',
          `Act ${act['@id']} has no temporal grounding`,
          act['@id'],
          'Add cco:occurs_during linking to a TemporalInterval'
        );
      }

      // Rule 2: Act should have participant (WARNING)
      total++;
      const hasParticipant = extractIRI(act['has_participant']) ||
        extractIRI(act['has_agent']);

      // Also check if any agent participates in this act
      const agentParticipates = nodes.some(n =>
        extractIRI(n['participates_in']) === act['@id']
      );

      if (hasParticipant || agentParticipates) {
        passed++;
      } else {
        this._addIssue(
          'WARNING',
          'SocioPrimalPattern',
          `Act ${act['@id']} has no participant`,
          act['@id'],
          'Add cco:has_participant or link an agent via cco:participates_in'
        );
      }
    }

    this.results.patterns['SocioPrimalPattern'] = {
      passed,
      total,
      score: total > 0 ? Math.round((passed / total) * 100) : 100
    };
  }

  // ================================================================
  // Pattern 7: Domain/Range Validation
  // ================================================================

  /**
   * Validate Domain/Range constraints
   * @private
   */
  _validateDomainRange(nodes, nodeMap) {
    let passed = 0;
    let total = 0;

    for (const node of nodes) {
      // is_concretized_by: ICE → IBE (BFO_0000058)
      const concretizedBy = extractIRI(node['is_concretized_by']);
      if (concretizedBy) {
        total++;
        const target = nodeMap.get(concretizedBy);

        if (target && this._hasType(target, 'InformationBearingEntity')) {
          passed++;
        } else if (target) {
          this._addIssue(
            'WARNING',
            'DomainRangeValidation',
            `is_concretized_by target ${concretizedBy} is not an IBE`,
            node['@id'],
            'Target of is_concretized_by should be InformationBearingEntity'
          );
        }
      }

      // is_bearer_of: IndependentContinuant → Role (BFO_0000196)
      const bearerOfRaw = node['is_bearer_of'];
      if (bearerOfRaw) {
        const roleIds = Array.isArray(bearerOfRaw)
          ? bearerOfRaw.map(r => extractIRI(r)).filter(Boolean)
          : [extractIRI(bearerOfRaw)].filter(Boolean);

        for (const roleId of roleIds) {
          total++;
          const role = nodeMap.get(roleId);

          if (role && (this._hasType(role, 'Role') || this._hasType(role, 'BFO_0000023'))) {
            passed++;
          } else if (role) {
            this._addIssue(
              'WARNING',
              'DomainRangeValidation',
              `is_bearer_of target ${roleId} is not a Role`,
              node['@id'],
              'Target of is_bearer_of should be bfo:Role'
            );
          }
        }
      }

      // is_part_of: Continuant → Continuant (NOT Process)
      const partOf = extractIRI(node['is_part_of']);
      if (partOf) {
        total++;
        const target = nodeMap.get(partOf);

        if (target) {
          const targetIsProcess = this._hasType(target, 'Process') ||
            this._hasType(target, 'Act') ||
            this._hasType(target, 'BFO_0000015');

          if (targetIsProcess) {
            this._addIssue(
              'VIOLATION',
              'DomainRangeValidation',
              `is_part_of links Continuant ${node['@id']} to Process ${partOf}`,
              node['@id'],
              'Continuants can participate_in Processes but never be part_of them'
            );
          } else {
            passed++;
          }
        } else {
          passed++; // Can't validate if target not in graph
        }
      }

      // asserts: Event → ICE
      const asserts = extractIRI(node['tagteam:asserts']);
      if (asserts) {
        total++;
        const target = nodeMap.get(asserts);

        if (target && (
          this._hasType(target, 'InformationContentEntity') ||
          this._hasType(target, 'EthicalValueICE') ||
          this._hasType(target, 'ContextDimensionICE')
        )) {
          passed++;
        } else if (target) {
          this._addIssue(
            'WARNING',
            'DomainRangeValidation',
            `asserts target ${asserts} is not an ICE`,
            node['@id'],
            'Target of asserts should be an InformationContentEntity'
          );
        }
      }

      // CCO Expert Checklist Rule: has_agent - Domain: bfo:Process, Range: Agent
      const hasAgent = extractIRI(node['has_agent']);
      if (hasAgent) {
        total++;
        const nodeIsProcess = this._hasType(node, 'Process') ||
          this._hasType(node, 'Act') ||
          this._hasType(node, 'IntentionalAct') ||
          this._hasType(node, 'BFO_0000015');
        const target = nodeMap.get(hasAgent);
        const targetIsAgent = target && (
          this._hasType(target, 'Agent') ||
          this._hasType(target, 'Person') ||
          this._hasType(target, 'Organization')
        );

        if (nodeIsProcess && targetIsAgent) {
          passed++;
        } else {
          if (!nodeIsProcess) {
            this._addIssue(
              'VIOLATION',
              'DomainRangeValidation',
              `has_agent used on non-Process node ${node['@id']}`,
              node['@id'],
              'has_agent domain must be bfo:Process (CCO Expert Checklist)'
            );
          }
          if (!targetIsAgent && target) {
            this._addIssue(
              'VIOLATION',
              'DomainRangeValidation',
              `has_agent target ${hasAgent} is not an Agent`,
              node['@id'],
              'has_agent range must be Agent (CCO Expert Checklist)'
            );
          }
        }
      }

      // CCO Expert Checklist Rule: prescribes - Domain: DirectiveContent, Range: bfo:Process
      const prescribes = extractIRI(node['prescribes']) || extractIRI(node['tagteam:prescribes']);
      if (prescribes) {
        total++;
        const nodeIsDirective = this._hasType(node, 'DirectiveContent') ||
          this._hasType(node, 'DeonticContent') ||
          this._hasType(node, 'DirectiveInformationContentEntity');
        const target = nodeMap.get(prescribes);
        const targetIsProcess = target && (
          this._hasType(target, 'Process') ||
          this._hasType(target, 'Act') ||
          this._hasType(target, 'IntentionalAct') ||
          this._hasType(target, 'BFO_0000015')
        );

        if (nodeIsDirective && targetIsProcess) {
          passed++;
        } else {
          if (!nodeIsDirective) {
            this._addIssue(
              'WARNING',
              'DomainRangeValidation',
              `prescribes used on non-DirectiveContent node ${node['@id']}`,
              node['@id'],
              'prescribes domain should be tagteam:DirectiveContent (CCO Expert Checklist)'
            );
          }
          if (!targetIsProcess && target) {
            this._addIssue(
              'WARNING',
              'DomainRangeValidation',
              `prescribes target ${prescribes} is not a Process`,
              node['@id'],
              'prescribes range should be bfo:Process (CCO Expert Checklist)'
            );
          }
        }
      }

      // CCO Expert Checklist Rule: inheres_in - Domain: Role/Quality, Range: IndependentContinuant
      const inheresIn = extractIRI(node['inheres_in']);
      if (inheresIn) {
        total++;
        const nodeIsRoleOrQuality = this._hasType(node, 'Role') ||
          this._hasType(node, 'BFO_0000023') ||
          this._hasType(node, 'Quality') ||
          this._hasType(node, 'BFO_0000019');
        const target = nodeMap.get(inheresIn);
        const targetIsIC = target && (
          this._hasType(target, 'IndependentContinuant') ||
          this._hasType(target, 'BFO_0000004') ||
          this._hasType(target, 'Person') ||
          this._hasType(target, 'Agent') ||
          this._hasType(target, 'Artifact') ||
          this._hasType(target, 'MaterialEntity') ||
          this._hasType(target, 'BFO_0000040')
        );

        if (nodeIsRoleOrQuality && targetIsIC) {
          passed++;
        } else {
          if (!nodeIsRoleOrQuality) {
            this._addIssue(
              'VIOLATION',
              'DomainRangeValidation',
              `inheres_in used on non-Role/Quality node ${node['@id']}`,
              node['@id'],
              'inheres_in domain must be bfo:Role or bfo:Quality (CCO Expert Checklist)'
            );
          }
          if (!targetIsIC && target) {
            this._addIssue(
              'VIOLATION',
              'DomainRangeValidation',
              `inheres_in target ${inheresIn} is not an IndependentContinuant`,
              node['@id'],
              'inheres_in range must be bfo:IndependentContinuant (CCO Expert Checklist)'
            );
          }
        }
      }
    }

    this.results.patterns['DomainRangeValidation'] = {
      passed,
      total,
      score: total > 0 ? Math.round((passed / total) * 100) : 100
    };
  }

  // ================================================================
  // Pattern 8: Vocabulary Validation
  // ================================================================

  /**
   * Validate vocabulary (catch typos and unknown terms)
   * @private
   */
  _validateVocabulary(nodes) {
    let passed = 0;
    let total = 0;

    for (const node of nodes) {
      // Check types
      const types = this._getTypes(node);
      for (const type of types) {
        // Skip common simple types
        if (type === 'string' || type === 'number') continue;

        total++;
        if (this._isKnownClass(type)) {
          passed++;
        } else {
          this._addIssue(
            'WARNING',
            'VocabularyValidation',
            `Unknown class: ${type}`,
            node['@id'],
            `Check spelling or add to known vocabulary. Similar: ${this._suggestSimilar(type, KNOWN_CLASSES)}`
          );
        }
      }

      // Check predicates
      for (const key of Object.keys(node)) {
        // Skip JSON-LD keywords
        if (key.startsWith('@')) continue;
        // Skip rdfs:label and rdfs:comment
        if (key === 'rdfs:label' || key === 'rdfs:comment') continue;

        total++;
        if (this._isKnownPredicate(key)) {
          passed++;
        } else {
          this._addIssue(
            'WARNING',
            'VocabularyValidation',
            `Unknown predicate: ${key}`,
            node['@id'],
            `Check spelling or add to known vocabulary. Similar: ${this._suggestSimilar(key, KNOWN_PREDICATES)}`
          );
        }
      }
    }

    this.results.patterns['VocabularyValidation'] = {
      passed,
      total,
      score: total > 0 ? Math.round((passed / total) * 100) : 100
    };
  }

  /**
   * Check if a class name is known
   * @private
   */
  _isKnownClass(className) {
    // Direct match
    if (KNOWN_CLASSES.has(className)) return true;

    // Check without prefix
    const localName = className.includes(':') ? className.split(':')[1] : className;

    // Check common prefixed versions
    for (const prefix of ['bfo:', 'cco:', 'tagteam:', 'owl:', 'rdf:', 'rdfs:']) {
      if (KNOWN_CLASSES.has(prefix + localName)) return true;
    }

    // Check if it's a BFO numeric ID
    if (/BFO_\d+/.test(localName)) return true;

    return false;
  }

  /**
   * Check if a predicate is known
   * @private
   */
  _isKnownPredicate(predicate) {
    // Direct match
    if (KNOWN_PREDICATES.has(predicate)) return true;

    // Check without prefix
    const localName = predicate.includes(':') ? predicate.split(':')[1] : predicate;

    // Check common prefixed versions
    for (const prefix of ['bfo:', 'cco:', 'tagteam:', 'owl:', 'rdf:', 'rdfs:']) {
      if (KNOWN_PREDICATES.has(prefix + localName)) return true;
    }

    // Check if it's a BFO numeric ID
    if (/BFO_\d+/.test(localName)) return true;

    return false;
  }

  /**
   * Suggest similar known terms
   * @private
   */
  _suggestSimilar(unknown, knownSet) {
    const localName = unknown.includes(':') ? unknown.split(':')[1] : unknown;
    const suggestions = [];

    for (const known of knownSet) {
      const knownLocal = known.includes(':') ? known.split(':')[1] : known;
      if (this._levenshteinDistance(localName.toLowerCase(), knownLocal.toLowerCase()) <= 3) {
        suggestions.push(known);
      }
    }

    return suggestions.slice(0, 3).join(', ') || 'none';
  }

  /**
   * Calculate Levenshtein distance between two strings
   * @private
   */
  _levenshteinDistance(a, b) {
    const matrix = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  // ================================================================
  // Compliance Score
  // ================================================================

  /**
   * Calculate overall compliance score (0-100)
   * @private
   */
  _calculateComplianceScore(nodes) {
    if (nodes.length === 0) return 100;

    // Weight violations heavily, warnings moderately
    const violationPenalty = this.results.violations.length * 10;
    const warningPenalty = this.results.warnings.length * 2;

    // Base score from pattern scores
    const patternScores = Object.values(this.results.patterns)
      .filter(p => p.total > 0)
      .map(p => p.score);

    const avgPatternScore = patternScores.length > 0
      ? patternScores.reduce((a, b) => a + b, 0) / patternScores.length
      : 100;

    // Final score with penalties
    const score = Math.max(0, avgPatternScore - violationPenalty - warningPenalty);

    return Math.round(score);
  }

  /**
   * Get a summary report as formatted string
   *
   * @param {Object} result - Validation result from validate()
   * @returns {string} Formatted report
   */
  formatReport(result) {
    const lines = [];

    lines.push('=== SHML Validation Report ===\n');
    lines.push(`Status: ${result.valid ? 'VALID' : 'INVALID'}`);
    lines.push(`Compliance Score: ${result.complianceScore}%`);
    lines.push(`Total Nodes: ${result.summary.totalNodes}`);
    lines.push('');

    lines.push('--- Pattern Results ---');
    for (const [pattern, data] of Object.entries(result.patterns)) {
      if (data.total > 0) {
        lines.push(`${pattern}: ${data.passed}/${data.total} (${data.score}%)`);
      }
    }
    lines.push('');

    if (result.violations.length > 0) {
      lines.push('--- VIOLATIONS (Must Fix) ---');
      for (const v of result.violations) {
        lines.push(`[${v.pattern}] ${v.message}`);
        if (v.suggestion) lines.push(`  → ${v.suggestion}`);
      }
      lines.push('');
    }

    if (result.warnings.length > 0) {
      lines.push('--- WARNINGS (Should Address) ---');
      for (const w of result.warnings) {
        lines.push(`[${w.pattern}] ${w.message}`);
        if (w.suggestion) lines.push(`  → ${w.suggestion}`);
      }
      lines.push('');
    }

    if (result.info.length > 0) {
      lines.push('--- INFO (Suggestions) ---');
      for (const i of result.info) {
        lines.push(`[${i.pattern}] ${i.message}`);
      }
    }

    return lines.join('\n');
  }
}

module.exports = SHMLValidator;
