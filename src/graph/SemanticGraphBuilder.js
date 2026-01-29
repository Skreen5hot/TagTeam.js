/**
 * SemanticGraphBuilder.js
 *
 * Main orchestrator for building JSON-LD semantic graphs.
 * Transforms TagTeam parsing results into SHML+GIT-compliant knowledge graphs.
 *
 * Phase 4 Two-Tier Architecture v2.4 + Week 2:
 * - ScarcityAssertion ICE (not on Tier 2 entities)
 * - DirectiveContent ICE (modal markers)
 * - ObjectAggregate for plural persons
 * - PatientRole only on cco:Person
 * - Roles realize only in Actual acts
 * - Quality nodes for qualifiers (v2.4)
 * - PatientRole on aggregate members (v2.4)
 * - ValueAssertionEvent with three-way confidence (Week 2) [OPTIONAL]
 * - ContextAssessmentEvent for 12 dimensions (Week 2) [OPTIONAL]
 * - IBE/ICE Information Staircase (Week 2)
 * - GIT-Minimal provenance (Week 2)
 *
 * v5.0.0 Package Separation:
 * - AssertionEventBuilder is now OPTIONAL (for tagteam-iee-values package)
 * - Core package works without value/context assertions
 * - Extension point: options.assertionBuilder for external injection
 *
 * v6.0.0 Interpretation Lattice:
 * - InterpretationLattice for multi-reading ambiguity preservation
 * - AmbiguityResolver for resolution strategy (preserved vs resolved)
 * - AlternativeGraphBuilder for modal/scope/metonymy alternatives
 * - options.preserveAmbiguity enables lattice generation
 *
 * @module graph/SemanticGraphBuilder
 * @version 6.0.0
 */

const crypto = require('crypto');
const EntityExtractor = require('./EntityExtractor');
const ComplexDesignatorDetector = require('./ComplexDesignatorDetector');
const ActExtractor = require('./ActExtractor');
const RoleDetector = require('./RoleDetector');
const ScarcityAssertionFactory = require('./ScarcityAssertionFactory');
const DirectiveExtractor = require('./DirectiveExtractor');
const ObjectAggregateFactory = require('./ObjectAggregateFactory');
const QualityFactory = require('./QualityFactory');
const DomainConfigLoader = require('./DomainConfigLoader');

// Core infrastructure modules
const ContextManager = require('./ContextManager');
const InformationStaircaseBuilder = require('./InformationStaircaseBuilder');

// Phase 5.3: Ambiguity detection (optional)
// In browser bundle, class is defined globally; in Node.js, use require
const _AmbiguityDetector = (typeof AmbiguityDetector !== 'undefined') ? AmbiguityDetector : (() => {
  try { return require('./AmbiguityDetector'); } catch (e) { return null; }
})();

// Phase 6: Interpretation Lattice (optional)
// In browser bundle, classes are defined globally; in Node.js, use require
const _AmbiguityResolver = (typeof AmbiguityResolver !== 'undefined') ? AmbiguityResolver : (() => {
  try { return require('./AmbiguityResolver'); } catch (e) { return null; }
})();
const _InterpretationLattice = (typeof InterpretationLattice !== 'undefined') ? InterpretationLattice : (() => {
  try { return require('./InterpretationLattice'); } catch (e) { return null; }
})();
const _AlternativeGraphBuilder = (typeof AlternativeGraphBuilder !== 'undefined') ? AlternativeGraphBuilder : (() => {
  try { return require('./AlternativeGraphBuilder'); } catch (e) { return null; }
})();

// OPTIONAL: AssertionEventBuilder - only load if available (for backwards compatibility)
// In v5.0.0+, this is provided by tagteam-iee-values package via options.assertionBuilder
const _AssertionEventBuilder = (typeof AssertionEventBuilder !== 'undefined') ? AssertionEventBuilder : (() => {
  try { return require('./AssertionEventBuilder'); } catch (e) { return null; }
})();

// Phase 7.2: CertaintyAnalyzer for hedge/booster/evidential detection
const _CertaintyAnalyzer = (typeof CertaintyAnalyzer !== 'undefined') ? CertaintyAnalyzer : (() => {
  try { return require('../analyzers/CertaintyAnalyzer'); } catch (e) { return null; }
})();

// Phase 7.1: SourceAttributionDetector for quote/reported speech/institutional source detection
const _SourceAttributionDetector = (typeof SourceAttributionDetector !== 'undefined') ? SourceAttributionDetector : (() => {
  try { return require('./SourceAttributionDetector'); } catch (e) { return null; }
})();

// Phase 9.3: CombinedValidationReport for unified validation output
const _CombinedValidationReport = (typeof CombinedValidationReport !== 'undefined') ? CombinedValidationReport : (() => {
  try { return require('./CombinedValidationReport'); } catch (e) { return null; }
})();

// Phase 7 v7: SentenceModeClassifier for stative predication
const _SentenceModeClassifier = (typeof SentenceModeClassifier !== 'undefined') ? SentenceModeClassifier : (() => {
  try { return require('./SentenceModeClassifier'); } catch (e) { return null; }
})();

// Compromise NLP (available globally in browser bundle, require in Node)
const _nlp = (typeof nlp !== 'undefined') ? nlp : (() => {
  try { return require('compromise'); } catch (e) { return null; }
})();

/**
 * Main class for building semantic graphs in JSON-LD format
 */
class SemanticGraphBuilder {
  /**
   * Create a new SemanticGraphBuilder
   * @param {Object} options - Configuration options
   * @param {string} [options.namespace='inst'] - Namespace prefix for instance IRIs
   * @param {string} [options.context] - Interpretation context (e.g., 'MedicalEthics')
   */
  constructor(options = {}) {
    this.options = {
      namespace: options.namespace || 'inst',
      context: options.context || null,
      ...options
    };

    // Internal graph storage
    this.nodes = [];
    this.nodeIndex = new Map(); // IRI -> node for deduplication

    // Initialize extractors and factories
    this.entityExtractor = new EntityExtractor({ graphBuilder: this });
    this.actExtractor = new ActExtractor({ graphBuilder: this });
    this.roleDetector = new RoleDetector({ graphBuilder: this });

    // v2.3: New factories for proper ontological separation
    this.scarcityFactory = new ScarcityAssertionFactory({ graphBuilder: this });
    this.directiveExtractor = new DirectiveExtractor({ graphBuilder: this });
    this.aggregateFactory = new ObjectAggregateFactory({ graphBuilder: this });

    // v2.4: Quality factory for entity qualifiers
    this.qualityFactory = new QualityFactory({ graphBuilder: this });

    // v5.0.0: AssertionEventBuilder is OPTIONAL
    // Can be injected via options.assertionBuilder (for tagteam-iee-values)
    // or use built-in if available (for backwards compatibility)
    if (options.assertionBuilder) {
      // External assertion builder injected (from tagteam-iee-values)
      this.assertionEventBuilder = options.assertionBuilder;
    } else if (_AssertionEventBuilder) {
      // Built-in AssertionEventBuilder available (backwards compatibility)
      this.assertionEventBuilder = new _AssertionEventBuilder({ graphBuilder: this });
    } else {
      // No assertion builder - core-only mode
      this.assertionEventBuilder = null;
    }

    // Core infrastructure
    this.contextManager = new ContextManager({ graphBuilder: this });
    this.informationStaircaseBuilder = new InformationStaircaseBuilder({
      version: '6.0.0'
    });

    // Phase 2: Domain configuration loader for type specialization
    this.configLoader = new DomainConfigLoader();

    // Phase 5.3: Ambiguity detection (optional)
    if (_AmbiguityDetector) {
      this.ambiguityDetector = new _AmbiguityDetector();
    } else {
      this.ambiguityDetector = null;
    }

    // Phase 6: Interpretation Lattice (optional)
    if (_AmbiguityResolver && _InterpretationLattice && _AlternativeGraphBuilder) {
      this.ambiguityResolver = new _AmbiguityResolver();
      this.alternativeBuilder = new _AlternativeGraphBuilder();
    } else {
      this.ambiguityResolver = null;
      this.alternativeBuilder = null;
    }

    // Phase 7.2: Certainty analysis (optional)
    if (_CertaintyAnalyzer) {
      this.certaintyAnalyzer = new _CertaintyAnalyzer();
    } else {
      this.certaintyAnalyzer = null;
    }

    // Phase 7.1: Source attribution detection (optional)
    if (_SourceAttributionDetector) {
      this.sourceAttributionDetector = new _SourceAttributionDetector();
    } else {
      this.sourceAttributionDetector = null;
    }
  }

  /**
   * Load a domain configuration file
   *
   * @param {string} configPath - Path to the JSON config file
   * @returns {boolean} True if loaded successfully
   *
   * @example
   * builder.loadDomainConfig('config/medical.json');
   */
  loadDomainConfig(configPath) {
    const result = this.configLoader.loadConfig(configPath);

    // Pass config loader to extractors
    this.entityExtractor.setConfigLoader(this.configLoader);
    this.actExtractor.setConfigLoader(this.configLoader);

    return result;
  }

  /**
   * Load a domain configuration from an object
   *
   * @param {Object} config - Configuration object
   * @returns {boolean} True if loaded successfully
   */
  loadDomainConfigObject(config) {
    const result = this.configLoader.loadConfigObject(config);

    // Pass config loader to extractors
    this.entityExtractor.setConfigLoader(this.configLoader);
    this.actExtractor.setConfigLoader(this.configLoader);

    return result;
  }

  /**
   * Clear all domain configurations (return to BFO-only mode)
   */
  clearDomainConfigs() {
    this.configLoader.clearConfigs();
    this.entityExtractor.setConfigLoader(null);
    this.actExtractor.setConfigLoader(null);
  }

  /**
   * Check if any domain config is loaded
   * @returns {boolean} True if config loaded
   */
  isDomainConfigLoaded() {
    return this.configLoader.isConfigLoaded();
  }

  /**
   * Get list of loaded domain names
   * @returns {Array<string>} Domain names
   */
  getLoadedDomains() {
    return this.configLoader.getLoadedDomains();
  }

  /**
   * Build a complete semantic graph from input text
   *
   * v2.3 Pipeline:
   * 1. Extract entities (Tier 1 + Tier 2)
   * 2. Process plurals into ObjectAggregates
   * 3. Create ScarcityAssertions (ICE layer)
   * 4. Extract acts
   * 5. Create DirectiveContent (ICE layer)
   * 6. Detect roles (respecting entity types and actuality)
   *
   * @param {string} text - Input text to analyze
   * @param {Object} [options] - Build options
   * @param {string} [options.context] - Interpretation context override
   * @returns {Object} Graph structure with nodes array
   *
   * @example
   * const builder = new SemanticGraphBuilder();
   * const graph = builder.build("The doctor treats the patient");
   * // Returns: { '@graph': [...] }
   */
  build(text, options = {}) {
    // Reset state for new build
    this.nodes = [];
    this.nodeIndex = new Map();

    // Merge options
    const buildOptions = {
      ...this.options,
      ...options
    };

    // Store metadata
    this.inputText = text;
    this.buildTimestamp = new Date().toISOString();
    this.buildContext = buildOptions.context;

    // Phase 7 v7: Traffic Cop — classify sentence mode before parsing
    const trafficCopEnabled = buildOptions.enableTrafficCop !== false;
    if (trafficCopEnabled) {
      const modeResult = this._classifySentenceMode(text);
      this.sentenceMode = modeResult.mode;

      // Auto-enable greedy NER for high-complexity objects
      if (!buildOptions.greedyNER) {
        const complexity = this._measureObjectComplexity(text);
        if (complexity.high) {
          buildOptions.greedyNER = true;
        }
      }
    } else {
      this.sentenceMode = undefined;
    }

    // Phase 1.2: Extract entities as DiscourseReferent + Tier 2 nodes
    let extractedEntities = [];
    let tier1Referents = [];
    let tier2Entities = [];
    let linkMap = new Map();

    if (buildOptions.extractEntities !== false) {
      extractedEntities = this.entityExtractor.extract(text, buildOptions);

      // Separate Tier 1 and Tier 2 entities
      tier1Referents = extractedEntities.filter(e =>
        e['@type']?.includes('tagteam:DiscourseReferent')
      );
      tier2Entities = extractedEntities.filter(e =>
        e['@type']?.some(t =>
          t.includes('cco:Person') || t.includes('cco:Artifact') || t.includes('cco:Organization') ||
          t === 'bfo:BFO_0000038' || t === 'bfo:BFO_0000008' || t === 'bfo:BFO_0000019' || t === 'bfo:BFO_0000016' ||
          t === 'bfo:BFO_0000004' || t === 'bfo:BFO_0000027' || t === 'bfo:BFO_0000001' ||
          t === 'bfo:BFO_0000015' ||
          t === 'cco:InformationContentEntity'
        )
      );

      // Build link map from Tier 1 to Tier 2
      tier1Referents.forEach(ref => {
        if (ref['cco:is_about']) {
          // Handle both object notation { '@id': iri } and plain string
          const isAbout = ref['cco:is_about'];
          const iri = typeof isAbout === 'object' ? isAbout['@id'] : isAbout;
          linkMap.set(ref['@id'], iri);
        }
      });

      // v2.3: Process plural persons into ObjectAggregates
      if (buildOptions.createAggregates !== false) {
        const aggregateResult = this.aggregateFactory.processEntities(
          tier2Entities,
          tier1Referents,
          linkMap
        );
        tier2Entities = aggregateResult.expandedEntities;
        linkMap = aggregateResult.updatedLinkMap;

        // Add aggregates
        if (aggregateResult.aggregates.length > 0) {
          this.addNodes(aggregateResult.aggregates);
        }

        // Update referent is_about links to point to aggregates
        tier1Referents.forEach(ref => {
          if (linkMap.has(ref['@id'])) {
            ref['cco:is_about'] = { '@id': linkMap.get(ref['@id']) };
          }
        });
      }

      // v2.3: Create ScarcityAssertions (ICE layer)
      if (buildOptions.extractScarcity !== false) {
        const scarcityResult = this.scarcityFactory.createFromEntities(
          tier1Referents,
          tier2Entities,
          linkMap
        );
        tier2Entities = scarcityResult.cleanedTier2;
        this.addNodes(scarcityResult.scarcityAssertions);
      }

      // v2.4: Create Quality nodes for entity qualifiers (e.g., "critically ill")
      if (buildOptions.extractQualities !== false) {
        const qualityResult = this.qualityFactory.createFromEntities(tier2Entities);
        tier2Entities = qualityResult.updatedEntities;
        this.addNodes(qualityResult.qualities);

        // v4.0.2: Link DiscourseReferents to their described Qualities via describes_quality
        // This connects the linguistic artifact ("critically ill") to the physical state (Quality)
        // Include aggregates (already in this.nodes) so we can find members for aggregate referents
        if (qualityResult.qualities.length > 0) {
          const aggregates = this.nodes.filter(n =>
            n['@type']?.some(t => t.includes('BFO_0000027'))
          );
          const allEntities = [...tier2Entities, ...aggregates];
          this._linkReferentsToQualities(tier1Referents, allEntities, qualityResult.qualities, linkMap);
        }
      }

      // Add all entities (Tier 1 + Tier 2)
      this.addNodes(tier1Referents);
      this.addNodes(tier2Entities);

      // Update extractedEntities for downstream use
      // v2.4: Include aggregates so RoleDetector can find members
      const allAggregates = this.nodes.filter(n =>
        n['@type']?.some(t => t.includes('BFO_0000027'))
      );
      extractedEntities = [...tier1Referents, ...tier2Entities, ...allAggregates];
    }

    // Phase 7 v7: Detect ComplexDesignators when greedyNER is enabled
    let cdSpans = [];
    if (buildOptions.greedyNER) {
      const cdDetector = new ComplexDesignatorDetector();
      cdSpans = cdDetector.detect(text);
      if (cdSpans.length > 0) {
        const cdNodes = cdDetector.createNodes(cdSpans, this);
        this.addNodes(cdNodes);
        extractedEntities = [...extractedEntities, ...cdNodes];
      }
    }

    // Phase 1.3: Extract acts as IntentionalAct nodes
    let extractedActs = [];
    if (buildOptions.extractActs !== false) {
      extractedActs = this.actExtractor.extract(text, {
        ...buildOptions,
        entities: extractedEntities,
        complexDesignatorSpans: cdSpans
      });
      this.addNodes(extractedActs);

      // ENH-003: Add any implicit entities (e.g., implicit "you" for imperatives)
      const implicitEntities = this.actExtractor.getImplicitEntities();
      if (implicitEntities.length > 0) {
        this.addNodes(implicitEntities);
      }

      // v2.3: Create DirectiveContent for modal markers
      if (buildOptions.extractDirectives !== false) {
        const directives = this.directiveExtractor.extract(extractedActs, text);
        this.addNodes(directives);
      }
    }

    // Phase 1.4: Detect roles from acts and entities
    // v2.3: Respects entity types (no PatientRole on artifacts)
    //       and actuality (no realization in Prescribed acts)
    if (buildOptions.detectRoles !== false && extractedActs.length > 0) {
      const roles = this.roleDetector.detect(extractedActs, extractedEntities, buildOptions);
      this.addNodes(roles);
    }

    // ================================================================
    // Week 2: Assertion Events + GIT-Minimal Integration
    // ================================================================

    // Phase 2.1: Create IBE and parser agent (foundation for provenance)
    const ibeNode = this.informationStaircaseBuilder.createInputIBE(text, this.buildTimestamp);
    const parserAgentNode = this.informationStaircaseBuilder.createParserAgent();
    this.addNode(ibeNode);
    this.addNode(parserAgentNode);

    // Phase 2.1b: Link all ICE nodes to IBE via cco:is_concretized_by
    // ICE types: DiscourseReferent, VerbPhrase, DirectiveContent, ScarcityAssertion, DeonticContent
    const iceTypes = [
      'tagteam:DiscourseReferent',
      'tagteam:VerbPhrase',
      'tagteam:DirectiveContent',
      'tagteam:DeonticContent',
      'tagteam:ScarcityAssertion'
    ];
    this.nodes.forEach(node => {
      const types = node['@type'] || [];
      const isICE = iceTypes.some(iceType => types.includes(iceType));
      if (isICE && !node['cco:is_concretized_by']) {
        node['cco:is_concretized_by'] = { '@id': ibeNode['@id'] };
      }
    });

    // Phase 7.2: Certainty analysis on acts and directives
    // Adds hedge/booster/evidential markers to nodes with sourceText
    if (this.certaintyAnalyzer && buildOptions.analyzeCertainty !== false) {
      this._addCertaintyMarkers(text);
    }

    // Phase 7.1: Source attribution detection on full text
    // Adds source attribution metadata when quotes/reported speech detected
    if (this.sourceAttributionDetector && buildOptions.detectSourceAttribution !== false) {
      this._addSourceAttributions(text);
    }

    // Phase 2.1c: Create parsing act that produced the interpretation
    // Note: has_output will be added at the end after all ICE nodes are created
    const parsingActIRI = `inst:ParsingAct_${this._hashText(text).substring(0, 8)}`;
    const parsingAct = {
      '@id': parsingActIRI,
      '@type': ['cco:ActOfArtificialProcessing', 'owl:NamedIndividual'],
      'rdfs:label': 'Semantic parsing act',
      'tagteam:actualityStatus': { '@id': 'tagteam:Actual' },
      'cco:has_input': { '@id': ibeNode['@id'] },
      'cco:has_agent': { '@id': parserAgentNode['@id'] },
      'tagteam:instantiated_at': this.buildTimestamp
    };
    this.addNode(parsingAct);

    // Phase 2.2: Get/create interpretation context
    const contextName = buildOptions.context || 'Default';
    const contextIRI = this.contextManager.getContextIRI(contextName);
    if (contextName !== 'Default') {
      const contextNode = this.contextManager.getOrCreateContext(contextName);
      if (contextNode) {
        this.addNode(contextNode);
      }
    }

    // Phase 2.3: Create value assertion events (if values provided AND builder available)
    // v5.0.0: This is optional - only runs if assertionEventBuilder is available
    if (this.assertionEventBuilder && buildOptions.extractValues !== false && buildOptions.scoredValues) {
      const valueResult = this.assertionEventBuilder.createValueAssertions(
        buildOptions.scoredValues,
        {
          contextIRI,
          ibeIRI: ibeNode['@id'],
          parserAgentIRI: parserAgentNode['@id']
        }
      );
      this.addNodes(valueResult.assertionEvents);
      this.addNodes(valueResult.iceNodes);
    }

    // Phase 2.4: Create context assessment events (if context intensity provided AND builder available)
    // v5.0.0: This is optional - only runs if assertionEventBuilder is available
    if (this.assertionEventBuilder && buildOptions.extractContext !== false && buildOptions.contextIntensity) {
      const contextResult = this.assertionEventBuilder.createContextAssessments(
        buildOptions.contextIntensity,
        {
          contextIRI,
          ibeIRI: ibeNode['@id'],
          parserAgentIRI: parserAgentNode['@id']
        }
      );
      this.addNodes(contextResult.assessmentEvents);
      this.addNodes(contextResult.iceNodes);
    }

    // Phase 2.5: Close the provenance loop - add has_output to ParsingAct
    // v4.0.2: All ICE nodes are outputs of the parsing act
    const outputICEs = this.nodes.filter(node => {
      const types = node['@type'] || [];
      return iceTypes.some(iceType => types.includes(iceType));
    });
    if (outputICEs.length > 0) {
      const parsingActNode = this.nodeIndex.get(parsingActIRI);
      if (parsingActNode) {
        parsingActNode['cco:has_output'] = outputICEs.map(ice => ({ '@id': ice['@id'] }));
      }
    }

    // ================================================================
    // Phase 5.3: Ambiguity Detection (Optional)
    // Phase 6: Also trigger if preserveAmbiguity is true
    // ================================================================
    let ambiguityReport = null;
    if ((buildOptions.detectAmbiguity || buildOptions.preserveAmbiguity) && this.ambiguityDetector) {
      // Collect roles from nodes
      const roleNodes = this.nodes.filter(n =>
        n['@type']?.some(t => t.includes('Role'))
      );
      const roles = roleNodes.map(r => ({
        act: r['bfo:is_realized_by']?.['@id'] || r['bfo:role_of']?.['@id'],
        entity: r['bfo:inheres_in']?.['@id'],
        type: r['@type']?.some(t => t.includes('AgentRole')) ? 'agent' : 'patient'
      }));

      // Run ambiguity detection
      ambiguityReport = this.ambiguityDetector.detect(
        text,
        tier2Entities,
        extractedActs,
        roles
      );

      // Phase 5.3.1: Surface ambiguity flags directly in @graph nodes
      // This makes ambiguity information visible in the graph without needing _ambiguityReport
      if (ambiguityReport && ambiguityReport.ambiguities) {
        this._surfaceAmbiguityFlags(ambiguityReport.ambiguities, extractedActs, tier2Entities);
      }
    }

    // ================================================================
    // Phase 6: Interpretation Lattice (Optional)
    // ================================================================
    let interpretationLattice = null;
    if (buildOptions.preserveAmbiguity && ambiguityReport && this.ambiguityResolver) {
      // 6.1: Resolve which ambiguities to preserve vs resolve
      const resolutions = this.ambiguityResolver.resolve(ambiguityReport, {
        preserveThreshold: buildOptions.preserveThreshold || 0.7,
        maxReadingsPerNode: buildOptions.maxAlternatives || 3,
        useSelectionalEvidence: buildOptions.useSelectionalEvidence !== false
      });

      // 6.2: Create lattice structure with default reading
      interpretationLattice = new _InterpretationLattice(
        { '@graph': this.nodes },
        resolutions
      );

      // 6.3: Build alternative readings for preserved ambiguities
      for (const preserved of resolutions.preserved) {
        const alternatives = this.alternativeBuilder.build(
          { '@graph': this.nodes },
          preserved
        );
        for (const alt of alternatives) {
          interpretationLattice.addAlternative(alt);
        }
      }
    }

    // ================================================================
    // Phase 7.1: Temporal Linking
    // Link temporal regions to nearby processes/entities via
    // cco:occupies_temporal_region (proximity-based, best-effort)
    // ================================================================
    this._linkTemporalRegions(text);

    const result = {
      '@graph': this.nodes,
      _metadata: {
        buildTimestamp: this.buildTimestamp,
        inputLength: text.length,
        nodeCount: this.nodes.length,
        version: '6.0.0',
        contextIRI,
        ibeIRI: ibeNode['@id'],
        parserAgentIRI: parserAgentNode['@id'],
        hasValueAssertions: !!(this.assertionEventBuilder && buildOptions.scoredValues),
        hasInterpretationLattice: !!interpretationLattice
      }
    };

    // Add ambiguity report if detection was enabled
    if (ambiguityReport) {
      result._ambiguityReport = ambiguityReport;
    }

    // Add interpretation lattice if preservation was enabled
    if (interpretationLattice) {
      result._interpretationLattice = interpretationLattice;
    }

    return result;
  }

  /**
   * Add a single node to the graph
   *
   * @param {Object} node - Node to add (must have @id and @type)
   * @returns {Object} The added node
   *
   * @throws {Error} If node missing @id or @type
   */
  addNode(node) {
    // Validate required properties
    if (!node['@id']) {
      throw new Error('Node must have @id property');
    }
    if (!node['@type']) {
      throw new Error('Node must have @type property');
    }

    // Check for duplicates
    if (this.nodeIndex.has(node['@id'])) {
      // Merge with existing node (later: conflict resolution)
      const existing = this.nodeIndex.get(node['@id']);
      Object.assign(existing, node);
      return existing;
    }

    // Add to graph
    this.nodes.push(node);
    this.nodeIndex.set(node['@id'], node);

    return node;
  }

  /**
   * Add multiple nodes to the graph
   *
   * @param {Array<Object>} nodes - Array of nodes to add
   * @returns {Array<Object>} The added nodes
   */
  addNodes(nodes) {
    if (!Array.isArray(nodes)) {
      throw new Error('addNodes expects an array');
    }

    return nodes.map(node => this.addNode(node));
  }

  /**
   * Generate a deterministic IRI for an instance
   *
   * Uses SHA-256 hash of (text + span_offset + type) for reproducibility.
   * v2.2 spec: 12 hex chars for collision resistance.
   *
   * @param {string} text - Text content (e.g., "the doctor")
   * @param {string} type - Entity type (e.g., "DiscourseReferent", "Act")
   * @param {number} [offset=0] - Text span offset for uniqueness
   * @returns {string} IRI in format "inst:Type_hash12chars"
   *
   * @example
   * generateIRI("the doctor", "DiscourseReferent", 0)
   * // Returns: "inst:Doctor_Referent_a8f3b2e4c5d6"
   */
  generateIRI(text, type, offset = 0) {
    // Create hash input: text + offset + type
    const hashInput = `${text}|${offset}|${type}`;

    // Generate SHA-256 hash
    const hash = crypto
      .createHash('sha256')
      .update(hashInput)
      .digest('hex');

    // Take first 12 characters (v2.2 spec: increased from 8 for collision resistance)
    const hashSuffix = hash.substring(0, 12);

    // Clean text for IRI (remove spaces, special chars)
    const cleanText = text
      .trim()
      .split(/\s+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('_')
      .replace(/[^a-zA-Z0-9_]/g, '');

    // Format: inst:Type_Text_hash
    const typeLabel = type.replace(/^.*:/, ''); // Remove namespace prefix
    const iri = `${this.options.namespace}:${cleanText}_${typeLabel}_${hashSuffix}`;

    return iri;
  }

  /**
   * Get all nodes in the graph
   * @returns {Array<Object>} All nodes
   */
  getNodes() {
    return this.nodes;
  }

  /**
   * Get a node by IRI
   * @param {string} iri - Node IRI
   * @returns {Object|undefined} Node or undefined if not found
   */
  getNode(iri) {
    return this.nodeIndex.get(iri);
  }

  /**
   * Clear the graph
   */
  clear() {
    this.nodes = [];
    this.nodeIndex.clear();
  }

  /**
   * Get graph statistics
   * @returns {Object} Statistics about the graph
   */
  getStats() {
    return {
      nodeCount: this.nodes.length,
      timestamp: this.buildTimestamp,
      inputLength: this.inputText?.length || 0
    };
  }

  /**
   * Phase 9.3: Generate a combined validation report for a built graph.
   * @param {Object} graph - The graph result from build()
   * @param {Object} [options] - Validation options
   * @param {boolean} [options.runShacl=true] - Run SHACL validation
   * @param {boolean} [options.includeDetails=true] - Include detailed breakdowns
   * @returns {Object|null} Combined validation report, or null if reporter unavailable
   */
  validate(graph, options = {}) {
    if (!_CombinedValidationReport) return null;

    const reporter = new _CombinedValidationReport({
      includeDetails: options.includeDetails !== false
    });

    const params = {
      graph,
      inputText: this.inputText || ''
    };

    // Run SHACL validation if available and requested
    if (options.runShacl !== false && this.shmlValidator) {
      try {
        params.shaclResult = this.shmlValidator.validate(graph);
      } catch (e) {
        // SHACL validation failure is non-blocking
      }
    }

    // Include complexity budget usage if available
    if (this.complexityBudget) {
      try {
        params.budgetUsage = this.complexityBudget.getUsage();
      } catch (e) {
        // Budget query failure is non-blocking
      }
    }

    // Include ambiguity report if available
    if (graph._ambiguityReport) {
      params.ambiguityReport = graph._ambiguityReport;
    }

    return reporter.generate(params);
  }

  /**
   * Generate a hash for text (used for IRI generation)
   * @param {string} text - Text to hash
   * @returns {string} SHA-256 hash (12 chars)
   * @private
   */
  _hashText(text) {
    return crypto
      .createHash('sha256')
      .update(text)
      .digest('hex')
      .substring(0, 12);
  }

  /**
   * Phase 7.2: Add certainty markers to nodes that have sourceText.
   * Applies hedge/booster/evidential detection to acts and directives.
   * @param {string} fullText - Full input text for context
   * @private
   */
  _addCertaintyMarkers(fullText) {
    if (!this.certaintyAnalyzer) return;

    // Node types that should have certainty analysis
    const targetTypes = [
      'cco:IntentionalAct',
      'cco:ActOfCommunication',
      'tagteam:DirectiveContent',
      'tagteam:DeonticContent',
      'tagteam:ScarcityAssertion',
      'tagteam:Inference',
      'tagteam:ClinicalFinding'
    ];

    for (const node of this.nodes) {
      const types = node['@type'] || [];

      // Check if this node type should have certainty analysis
      const shouldAnalyze = targetTypes.some(t =>
        types.includes(t) || types.some(nt => nt.startsWith('cco:ActOf'))
      );

      if (!shouldAnalyze) continue;

      // Get the source text for this node
      const sourceText = node['tagteam:sourceText'];
      if (!sourceText) continue;

      // Get context around the sourceText (for better marker detection)
      const startPos = node['tagteam:startPosition'];
      const endPos = node['tagteam:endPosition'];
      let contextText = sourceText;

      // Expand context to capture surrounding markers (e.g., "reportedly" before verb)
      if (typeof startPos === 'number' && startPos > 0) {
        const contextStart = Math.max(0, startPos - 30);
        const contextEnd = Math.min(fullText.length, (endPos || startPos + sourceText.length) + 10);
        contextText = fullText.substring(contextStart, contextEnd);
      }

      // Analyze certainty markers
      const analysis = this.certaintyAnalyzer.analyze(contextText);

      // Only add properties if markers found
      if (analysis.markerCount > 0) {
        node['tagteam:certaintyScore'] = Math.round(analysis.certaintyScore * 100) / 100;

        if (analysis.isHedged) {
          node['tagteam:isHedged'] = true;
          node['tagteam:hedgeMarkers'] = analysis.hedges.map(h => h.marker);
        }

        if (analysis.isBoosted) {
          node['tagteam:isBoosted'] = true;
          node['tagteam:boosterMarkers'] = analysis.boosters.map(b => b.marker);
        }

        if (analysis.isEvidential) {
          node['tagteam:isEvidential'] = true;
          node['tagteam:evidentialMarkers'] = analysis.evidentials.map(e => ({
            marker: e.marker,
            sourceType: e.sourceType
          }));
        }
      }
    }
  }

  /**
   * Phase 7.1: Detect and add source attributions from the full text.
   * Creates SourceAttribution nodes when quotes, reported speech, or
   * institutional sources are detected.
   * @param {string} fullText - Full input text
   * @private
   */
  _addSourceAttributions(fullText) {
    if (!this.sourceAttributionDetector) return;

    const analysis = this.sourceAttributionDetector.analyze(fullText);

    if (!analysis.hasAttributions) return;

    // Create attribution nodes for each detected attribution
    for (const attr of analysis.attributions) {
      const attrHash = this._hashText(`${attr.type}|${attr.source}|${attr.position || 0}`).substring(0, 12);
      const attrIRI = `inst:SourceAttribution_${attrHash}`;

      const attrNode = {
        '@id': attrIRI,
        '@type': ['tagteam:SourceAttribution', 'owl:NamedIndividual'],
        'rdfs:label': `Attribution from ${attr.source}`,
        'tagteam:attributionType': attr.type,
        'tagteam:detectedSource': attr.source,
        'tagteam:confidence': Math.round(attr.confidence * 100) / 100
      };

      // Add source type if classified
      if (attr.sourceType) {
        attrNode['tagteam:sourceType'] = attr.sourceType;
      }

      // Add verb if present
      if (attr.verb) {
        attrNode['tagteam:attributionVerb'] = attr.verb;
      }

      // Add quoted/reported content
      if (attr.quote) {
        attrNode['tagteam:quotedContent'] = attr.quote;
      } else if (attr.content) {
        attrNode['tagteam:reportedContent'] = attr.content;
      }

      // Add institutional type if applicable
      if (attr.institutionalType) {
        attrNode['tagteam:institutionalType'] = attr.institutionalType;
      }

      // Add position if available
      if (typeof attr.position === 'number') {
        attrNode['tagteam:sourceTextPosition'] = attr.position;
      }

      // Add evidence
      if (attr.evidence) {
        attrNode['tagteam:evidence'] = attr.evidence;
      }

      this.addNode(attrNode);
    }

    // Add summary to graph metadata
    // This will be accessible via _metadata in the output
    if (!this._attributionSummary) {
      this._attributionSummary = {
        attributionCount: analysis.attributionCount,
        dominantType: analysis.dominantType,
        summary: analysis.summary
      };
    }
  }

  /**
   * Phase 7.1: Link temporal regions to nearby non-temporal entities.
   * Uses proximity in the source text to determine which entities a temporal
   * expression qualifies, via cco:occupies_temporal_region.
   * @param {string} sourceText - Original input text
   * @private
   */
  _linkTemporalRegions(sourceText) {
    const TEMPORAL_TYPES = ['bfo:BFO_0000038', 'bfo:BFO_0000008'];

    // Tier 2 nodes don't have position info; Tier 1 DiscourseReferents do.
    // Strategy: use Tier 1 positions, then link the corresponding Tier 2 entities.
    const tier1Nodes = this.nodes.filter(n =>
      n['@type'] && n['@type'].includes('tagteam:DiscourseReferent')
    );

    // Build Tier 1 → Tier 2 IRI map
    const tier1ToTier2 = new Map();
    for (const t1 of tier1Nodes) {
      const about = t1['cco:is_about'];
      if (about) {
        tier1ToTier2.set(t1['@id'], typeof about === 'object' ? about['@id'] : about);
      }
    }

    // Build node lookup by IRI
    const nodeIndex = new Map();
    for (const n of this.nodes) {
      if (n['@id']) nodeIndex.set(n['@id'], n);
    }

    // Classify Tier 1 nodes as temporal or entity
    const temporalTier1 = [];
    const entityTier1 = [];
    for (const t1 of tier1Nodes) {
      const tier2IRI = tier1ToTier2.get(t1['@id']);
      const tier2 = tier2IRI ? nodeIndex.get(tier2IRI) : null;
      if (!tier2 || !tier2['@type']) continue;

      if (tier2['@type'].some(t => TEMPORAL_TYPES.includes(t))) {
        temporalTier1.push(t1);
      } else if (tier2['@type'].includes('owl:NamedIndividual') &&
                 !tier2['@type'].includes('cco:Person')) {
        // Link qualities, dispositions, artifacts — not persons
        entityTier1.push(t1);
      }
    }

    if (temporalTier1.length === 0 || entityTier1.length === 0) return;

    // For each temporal Tier 1, find same-sentence entity Tier 1 nodes
    for (const tempT1 of temporalTier1) {
      const tStart = tempT1['tagteam:startPosition'];
      if (tStart == null) continue;

      const tempTier2IRI = tier1ToTier2.get(tempT1['@id']);

      // Find sentence boundaries around the temporal expression
      const sentenceStart = sourceText.lastIndexOf('.', tStart);
      const sentenceEnd = sourceText.indexOf('.', tStart);
      const clauseStart = sentenceStart >= 0 ? sentenceStart : 0;
      const clauseEnd = sentenceEnd >= 0 ? sentenceEnd : sourceText.length;

      for (const entT1 of entityTier1) {
        const eStart = entT1['tagteam:startPosition'];
        if (eStart == null) continue;

        if (eStart >= clauseStart && eStart <= clauseEnd) {
          const entTier2IRI = tier1ToTier2.get(entT1['@id']);
          const entTier2 = entTier2IRI ? nodeIndex.get(entTier2IRI) : null;
          if (entTier2) {
            entTier2['cco:occupies_temporal_region'] = { '@id': tempTier2IRI };
          }
        }
      }
    }
  }

  /**
   * Surface ambiguity flags directly on @graph nodes
   *
   * Phase 5.3.1: Adds tagteam:hasAmbiguity and related flags to nodes
   * so ambiguity information is visible in the graph without needing _ambiguityReport.
   *
   * Stakeholder requirement: Add tagteam:selectionalMismatch: true when
   * inanimate object is assigned as Agent.
   *
   * @param {Array} ambiguities - Array of detected ambiguities from AmbiguityReport
   * @param {Array} acts - Extracted act nodes
   * @param {Array} entities - Tier 2 entity nodes
   * @private
   */
  _surfaceAmbiguityFlags(ambiguities, acts, entities) {
    for (const amb of ambiguities) {
      // Find the target node by nodeId
      let targetNode = null;
      if (amb.nodeId) {
        targetNode = this.nodeIndex.get(amb.nodeId);
      }

      // Handle selectional violations - add flag to the act node
      if (amb.type === 'selectional_violation') {
        if (targetNode) {
          targetNode['tagteam:hasAmbiguity'] = true;
          targetNode['tagteam:selectionalMismatch'] = true;
          targetNode['tagteam:ambiguityType'] = amb.signal; // e.g., 'inanimate_agent'
          if (amb.ontologyConstraint) {
            targetNode['tagteam:ontologyConstraint'] = amb.ontologyConstraint;
          }
        }
      }

      // Handle modal force ambiguity - add flag to act node
      if (amb.type === 'modal_force') {
        if (targetNode) {
          targetNode['tagteam:hasAmbiguity'] = true;
          targetNode['tagteam:modalAmbiguity'] = {
            'tagteam:readings': amb.readings,
            'tagteam:defaultReading': amb.defaultReading,
            'tagteam:confidence': amb.confidence || 'medium'
          };
        }
      }

      // Handle noun category ambiguity - add flag to entity node
      if (amb.type === 'noun_category') {
        if (targetNode) {
          targetNode['tagteam:hasAmbiguity'] = true;
          targetNode['tagteam:categoryAmbiguity'] = {
            'tagteam:readings': amb.readings,
            'tagteam:defaultReading': amb.defaultReading,
            'tagteam:confidence': amb.confidence || 'medium',
            'tagteam:nominalizationSuffix': amb.nominalizationSuffix
          };
        }
      }

      // Handle scope ambiguity - add to relevant act or create marker
      if (amb.type === 'scope') {
        if (targetNode) {
          targetNode['tagteam:hasAmbiguity'] = true;
          targetNode['tagteam:scopeAmbiguity'] = {
            'tagteam:readings': amb.readings,
            'tagteam:defaultReading': amb.defaultReading,
            'tagteam:formalizations': amb.formalizations
          };
        }
      }

      // Handle potential metonymy - add flag to entity node
      if (amb.type === 'potential_metonymy') {
        if (targetNode) {
          targetNode['tagteam:hasAmbiguity'] = true;
          targetNode['tagteam:potentialMetonymy'] = true;
          targetNode['tagteam:metonymySignal'] = amb.signal;
          targetNode['tagteam:suggestedReading'] = amb.suggestedReading;
        }
      }
    }
  }

  /**
   * Link DiscourseReferents to their described Quality nodes
   *
   * v4.0.2: Implements CCO Expert Fix 1 - connects linguistic artifacts
   * (DiscourseReferent with qualifier text like "critically ill") to the
   * physical states (Quality nodes) they describe.
   *
   * @param {Array} referents - Tier 1 DiscourseReferent nodes
   * @param {Array} entities - Tier 2 entity nodes (may include aggregate members)
   * @param {Array} qualities - Quality nodes created by QualityFactory
   * @param {Map} linkMap - Map from referent IRI to Tier 2 entity IRI
   * @private
   */
  _linkReferentsToQualities(referents, entities, qualities, linkMap) {
    // Build a map from entity IRI to its qualities (via bfo:inheres_in)
    const entityToQualities = new Map();
    qualities.forEach(quality => {
      const inheresIn = quality['bfo:inheres_in'];
      const bearerIRI = typeof inheresIn === 'object' ? inheresIn['@id'] : inheresIn;
      if (bearerIRI) {
        if (!entityToQualities.has(bearerIRI)) {
          entityToQualities.set(bearerIRI, []);
        }
        entityToQualities.get(bearerIRI).push(quality['@id']);
      }
    });

    // Build a map from aggregate IRI to member IRIs
    const aggregateToMembers = new Map();
    entities.forEach(entity => {
      const types = entity['@type'] || [];
      if (types.some(t => t.includes('BFO_0000027'))) { // Object Aggregate
        const members = entity['bfo:has_member'] || [];
        const memberIRIs = members.map(m => typeof m === 'object' ? m['@id'] : m);
        aggregateToMembers.set(entity['@id'], memberIRIs);
      }
    });

    // For each referent, find its related qualities
    referents.forEach(referent => {
      const describedQualities = [];

      // Get the Tier 2 entity this referent is about
      const isAbout = referent['cco:is_about'];
      const tier2IRI = typeof isAbout === 'object' ? isAbout['@id'] : isAbout;

      if (tier2IRI) {
        // Check if it's an aggregate - if so, collect qualities from members
        if (aggregateToMembers.has(tier2IRI)) {
          const memberIRIs = aggregateToMembers.get(tier2IRI);
          memberIRIs.forEach(memberIRI => {
            const memberQualities = entityToQualities.get(memberIRI) || [];
            describedQualities.push(...memberQualities);
          });
        } else {
          // Direct entity - get its qualities
          const directQualities = entityToQualities.get(tier2IRI) || [];
          describedQualities.push(...directQualities);
        }
      }

      // Add describes_quality if we found any
      if (describedQualities.length > 0) {
        referent['tagteam:describes_quality'] = describedQualities.map(qIRI => ({ '@id': qIRI }));
      }
    });
  }
  /**
   * Phase 7 v7: Classify sentence mode based on main verb.
   * @param {string} text - Input text
   * @returns {{ mode: string, confidence: number }}
   */
  _classifySentenceMode(text) {
    const classifier = new _SentenceModeClassifier();

    // Extract main verb using Compromise
    const nlp = _nlp;
    const doc = nlp(text);
    const verbs = doc.verbs();

    // Check ALL verbs — if any is stative, classify as STRUCTURAL
    // This handles cases where participial adjectives (e.g., "named") appear before the stative verb
    const verbInfinitives = [];
    verbs.forEach(verb => {
      const json = verb.json()[0] || {};
      const verbData = json.verb || {};
      const inf = (verbData.infinitive || verbData.root || '').toLowerCase();
      if (['be', 'is', 'are', 'was', 'were', 'do', 'did', 'does'].includes(inf)) return;
      verbInfinitives.push(inf);
    });

    if (verbInfinitives.length === 0) {
      return { mode: 'NARRATIVE', confidence: 0.5 };
    }

    // Priority: if any verb is stative definite, route to STRUCTURAL
    for (const inf of verbInfinitives) {
      const classification = classifier.classifyVerb(inf);
      if (classification.category === 'STATIVE_DEFINITE') {
        return { mode: 'STRUCTURAL', confidence: 0.95 };
      }
    }
    for (const inf of verbInfinitives) {
      const classification = classifier.classifyVerb(inf);
      if (classification.category === 'STATIVE_AMBIGUOUS') {
        return { mode: 'STRUCTURAL', confidence: 0.7 };
      }
    }
    return { mode: 'NARRATIVE', confidence: 0.9 };
  }

  /**
   * Phase 7 v7: Measure object complexity to decide if greedy NER is needed.
   * High complexity = many capitalized words in the object phrase (after main verb).
   * @param {string} text - Input text
   * @returns {{ high: boolean, score: number }}
   */
  _measureObjectComplexity(text) {
    // Find the main verb position to isolate the object phrase
    const nlp = _nlp;
    const doc = nlp(text);
    const verbs = doc.verbs();

    let verbEnd = 0;
    verbs.forEach(verb => {
      const offset = text.indexOf(verb.text());
      if (offset >= 0) {
        const end = offset + verb.text().length;
        if (end > verbEnd) verbEnd = end;
      }
    });

    // Get the object phrase (everything after the main verb)
    const objectPhrase = text.substring(verbEnd).trim();
    if (!objectPhrase) return { high: false, score: 0 };

    // Count capitalized vs total content words
    const words = objectPhrase.split(/\s+/).filter(w => w.length > 1);
    if (words.length === 0) return { high: false, score: 0 };

    const capitalizedWords = words.filter(w => /^[A-Z]/.test(w));
    const density = capitalizedWords.length / words.length;

    // Also check for multi-word name indicators
    const connectors = (objectPhrase.match(/\b(of|for|and|or)\b/gi) || []).length;
    const commas = (objectPhrase.match(/,/g) || []).length;

    const score = (density * 0.4) + (Math.min(connectors, 5) / 5 * 0.3) + (Math.min(commas, 3) / 3 * 0.3);

    return {
      high: score > 0.3 || density > 0.5,
      score: Math.round(score * 100) / 100
    };
  }
}

module.exports = SemanticGraphBuilder;
