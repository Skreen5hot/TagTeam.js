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
 * @version 3.0.0-alpha.1
 */

const crypto = require('crypto');
const Lemmatizer = require('../core/Lemmatizer');
const EntityExtractor = require('./EntityExtractor');
const ComplexDesignatorDetector = require('./ComplexDesignatorDetector');
const ActExtractor = require('./ActExtractor');
const RoleDetector = require('./RoleDetector');
const ScarcityAssertionFactory = require('./ScarcityAssertionFactory');
const DirectiveExtractor = require('./DirectiveExtractor');
const ObjectAggregateFactory = require('./ObjectAggregateFactory');
const QualityFactory = require('./QualityFactory');
const DomainConfigLoader = require('./DomainConfigLoader');
const ClauseSegmenter = require('./ClauseSegmenter');

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

// Phase 3A: Tree-based extractors (optional — activated via useTreeExtractors option)
const _TreeEntityExtractor = (typeof TreeEntityExtractor !== 'undefined') ? TreeEntityExtractor : (() => {
  try { return require('./TreeEntityExtractor'); } catch (e) { return null; }
})();
const _TreeActExtractor = (typeof TreeActExtractor !== 'undefined') ? TreeActExtractor : (() => {
  try { return require('./TreeActExtractor'); } catch (e) { return null; }
})();
const _TreeRoleMapper = (typeof TreeRoleMapper !== 'undefined') ? TreeRoleMapper : (() => {
  try { return require('./TreeRoleMapper'); } catch (e) { return null; }
})();
const _UnicodeNormalizer = (typeof UnicodeNormalizer !== 'undefined') ? UnicodeNormalizer : (() => {
  try { return require('../core/UnicodeNormalizer'); } catch (e) { return null; }
})();
const _Tokenizer = (typeof Tokenizer !== 'undefined') ? Tokenizer : (() => {
  try { return require('./Tokenizer'); } catch (e) { return null; }
})();
const _PerceptronTagger = (typeof PerceptronTagger !== 'undefined') ? PerceptronTagger : (() => {
  try { return require('../core/PerceptronTagger'); } catch (e) { return null; }
})();
const _DependencyParser = (typeof DependencyParser !== 'undefined') ? DependencyParser : (() => {
  try { return require('../core/DependencyParser'); } catch (e) { return null; }
})();
const _DepTree = (typeof DepTree !== 'undefined') ? DepTree : (() => {
  try { return require('../core/DepTree'); } catch (e) { return null; }
})();
const _GazetteerNER = (typeof GazetteerNER !== 'undefined') ? GazetteerNER : (() => {
  try { return require('./GazetteerNER'); } catch (e) { return null; }
})();
const _ConfidenceAnnotator = (typeof ConfidenceAnnotator !== 'undefined') ? ConfidenceAnnotator : (() => {
  try { return require('./ConfidenceAnnotator'); } catch (e) { return null; }
})();
const _DepTreeCorrector = (typeof DepTreeCorrector !== 'undefined') ? DepTreeCorrector : (() => {
  try { return require('../core/DepTreeCorrector'); } catch (e) { return null; }
})();
const _RealWorldEntityFactory = (typeof RealWorldEntityFactory !== 'undefined') ? RealWorldEntityFactory : (() => {
  try { return require('./RealWorldEntityFactory'); } catch (e) { return null; }
})();
const _GenericityDetector = (typeof GenericityDetector !== 'undefined') ? GenericityDetector : (() => {
  try { return require('./GenericityDetector'); } catch (e) { return null; }
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

    // Core NLP: Lemmatizer for morphological reduction
    this.lemmatizer = new Lemmatizer();

    // Initialize extractors and factories
    this.entityExtractor = new EntityExtractor({ graphBuilder: this, lemmatizer: this.lemmatizer });
    this.actExtractor = new ActExtractor({ graphBuilder: this });
    this.roleDetector = new RoleDetector({ graphBuilder: this });

    // v2.3: New factories for proper ontological separation
    this.scarcityFactory = new ScarcityAssertionFactory({ graphBuilder: this });
    this.directiveExtractor = new DirectiveExtractor({ graphBuilder: this });
    this.aggregateFactory = new ObjectAggregateFactory({ graphBuilder: this, lemmatizer: this.lemmatizer });

    // v2.4: Quality factory for entity qualifiers
    this.qualityFactory = new QualityFactory({ graphBuilder: this });

    // v2 Phase 1: Clause segmenter
    this.clauseSegmenter = new ClauseSegmenter();

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
      version: '3.0.0-alpha.1'
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

    // v2 Phase 0: Normalize v2 config with defaults
    // V7-003: Enable v2 by default to support subordination detection
    const v2Config = buildOptions.v2 || {};
    buildOptions._v2 = {
      enabled: v2Config.enabled !== false,  // V7-003: Default to TRUE (can be explicitly disabled)
      clauseSegmentation: { enabled: false, ellipsisInjection: true, ...v2Config.clauseSegmentation },
      speechActNodes: { questions: true, directives: true, conditionals: true, ...v2Config.speechActNodes },
      discourse: { enabled: false, ...v2Config.discourse }
    };

    // v2 Phase 1: Clause segmentation (pass boundaries to extractors)
    if (buildOptions._v2.enabled) {
      const segResult = this.clauseSegmenter.segment(text, buildOptions);
      buildOptions._clauses = segResult.clauses;
      buildOptions._clauseRelation = segResult.relation;
    }

    // ================================================================
    // Phase 3A: Tree-based pipeline (opt-in via useTreeExtractors)
    // ================================================================
    if (buildOptions.useTreeExtractors && _TreeEntityExtractor && _TreeActExtractor && _TreeRoleMapper) {
      return this._buildWithTreeExtractors(text, buildOptions);
    }

    // Phase 1.2: Extract entities as DiscourseReferent + Tier 2 nodes
    let extractedEntities = [];
    let tier1Referents = [];
    let tier2Entities = [];
    let linkMap = new Map();

    if (buildOptions.extractEntities !== false) {
      // Extract entities from full text (Compromise needs full context for POS tagging)
      extractedEntities = this.entityExtractor.extract(text, buildOptions);

      // v2: Post-process entities to enforce clause boundaries
      if (buildOptions._v2.enabled && buildOptions._clauses && buildOptions._clauses.length > 1) {
        extractedEntities = this._enforceClauseBoundariesOnEntities(extractedEntities, buildOptions._clauses);
      }

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
    let cdNodes = [];
    if (buildOptions.greedyNER) {
      const cdDetector = new ComplexDesignatorDetector();
      cdSpans = cdDetector.detect(text);
      if (cdSpans.length > 0) {
        cdNodes = cdDetector.createNodes(cdSpans, this);

        // Suppress shadow entities: remove DiscourseReferents and Tier 2 entities
        // whose text spans overlap with ComplexDesignator spans.
        // Use proper interval overlap: two ranges [a,b) and [c,d) overlap if a < d && c < b.
        // Also catch "the X" referents where "the " prefix shifts start before CD start.
        const overlapsCD = (entity) => {
          const eStart = entity['tagteam:startPosition'];
          const eEnd = entity['tagteam:endPosition'];
          if (eStart == null || eEnd == null) return false;
          return cdSpans.some(cd => eStart < cd.end && cd.start < eEnd);
        };

        // Remove overlapping entities from graph nodes
        const shadowIRIs = new Set();
        this.nodes = this.nodes.filter(n => {
          if (overlapsCD(n)) {
            shadowIRIs.add(n['@id']);
            return false;
          }
          return true;
        });
        this.nodeIndex.forEach((node, iri) => {
          if (shadowIRIs.has(iri)) this.nodeIndex.delete(iri);
        });

        // Also remove Tier 2 entities linked via is_about from shadow referents
        this.nodes = this.nodes.filter(n => {
          const id = n['@id'];
          // Check if any shadow referent pointed to this entity
          for (const ref of [...tier1Referents]) {
            if (shadowIRIs.has(ref['@id'])) {
              const aboutId = typeof ref['cco:is_about'] === 'object'
                ? ref['cco:is_about']['@id'] : ref['cco:is_about'];
              if (aboutId === id) {
                shadowIRIs.add(id);
                return false;
              }
            }
          }
          return true;
        });

        // Filter extractedEntities and tier lists for downstream use
        extractedEntities = extractedEntities.filter(e => !shadowIRIs.has(e['@id']));
        tier1Referents = tier1Referents.filter(e => !shadowIRIs.has(e['@id']));
        tier2Entities = tier2Entities.filter(e => !shadowIRIs.has(e['@id']));

        // Add CD nodes and include in extractedEntities
        this.addNodes(cdNodes);
        extractedEntities = [...extractedEntities, ...cdNodes];
      }
    }

    // V7-004: Phase 1.2b: Create anaphoric links for relative clauses
    if (buildOptions.extractAnaphoricLinks !== false) {
      const anaphoricLinks = this._detectAnaphoricLinks(text, extractedEntities);
      if (anaphoricLinks.length > 0) {
        this.addNodes(anaphoricLinks);
      }
    }

    // Phase 1.3: Extract acts as IntentionalAct nodes
    let extractedActs = [];
    if (buildOptions.extractActs !== false) {
      // v2 Phase 2: Per-clause act extraction to enforce entity boundaries
      if (buildOptions._v2.enabled && buildOptions._clauses && buildOptions._clauses.length > 1) {
        for (const clause of buildOptions._clauses) {
          // Filter entities to this clause's boundary and adjust positions to clause-relative
          const clauseEntities = extractedEntities
            .filter(e => {
              const start = e['tagteam:startPosition'];
              return start !== undefined && start >= clause.start && start < clause.end;
            })
            .map(e => ({
              ...e,
              'tagteam:startPosition': e['tagteam:startPosition'] - clause.start,
              'tagteam:endPosition': e['tagteam:endPosition'] - clause.start
            }));

          // V7-002: For elliptical clauses, inject subject entity from previous clause
          if (clause.injectedSubject && clause.index > 0) {
            const prevClause = buildOptions._clauses[clause.index - 1];
            const injectedLabel = clause.injectedSubject.toLowerCase();
            const subjectEntity = extractedEntities.find(e => {
              const start = e['tagteam:startPosition'];
              if (start === undefined || start < prevClause.start || start >= prevClause.end) return false;
              const label = (e['rdfs:label'] || '').toLowerCase();
              return label === injectedLabel || label === injectedLabel.replace(/^the\s+/, '');
            });
            if (subjectEntity) {
              clauseEntities.unshift({
                ...subjectEntity,
                'tagteam:startPosition': 0,
                'tagteam:endPosition': clause.injectedSubject.length
              });
            }
          }

          // Extract acts from clause text with clause-relative entity positions
          const clauseActs = this.actExtractor.extract(clause.text, {
            ...buildOptions,
            entities: clauseEntities,
            complexDesignatorSpans: [],
            sentenceMode: this.sentenceMode,
            complexDesignatorNodes: []
          });
          // Adjust act positions back to full-text space
          clauseActs.forEach(act => {
            if (act['tagteam:startPosition'] !== undefined) {
              act['tagteam:startPosition'] += clause.start;
            }
            if (act['tagteam:endPosition'] !== undefined) {
              act['tagteam:endPosition'] += clause.start;
            }
          });
          extractedActs.push(...clauseActs);
        }
      } else {
        // Deduplicate entities by @id before passing to ActExtractor
        const seenIDs = new Set();
        const deduplicatedEntities = extractedEntities.filter(e => {
          if (seenIDs.has(e['@id'])) {
            return false;
          }
          seenIDs.add(e['@id']);
          return true;
        });

        extractedActs = this.actExtractor.extract(text, {
          ...buildOptions,
          entities: deduplicatedEntities,
          complexDesignatorSpans: cdSpans,
          sentenceMode: this.sentenceMode,
          complexDesignatorNodes: cdNodes
        });
      }
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

    // v2 Phase 2: Create ClauseRelation nodes for compound sentences
    if (buildOptions._v2.enabled && buildOptions._clauses && buildOptions._clauses.length > 1 && extractedActs.length >= 2 && buildOptions._clauseRelation) {
      // Match acts to clauses by verb offset proximity
      const clauseActs = this._matchActsToClauses(extractedActs, buildOptions._clauses);

      // Annotate acts with clauseIndex and elliptical subjectSource
      for (const clause of buildOptions._clauses) {
        if (!clauseActs.has(clause.index)) continue;
        for (const act of clauseActs.get(clause.index)) {
          act['tagteam:clauseIndex'] = clause.index;
          if (clause.clauseType === 'elliptical' && clause.injectedSubject) {
            act['tagteam:subjectSource'] = 'ellipsis_injection';
          }
        }
      }

      // Create ClauseRelation node linking acts from clause 0 to clause 1
      const clause0Acts = clauseActs.get(0) || [];
      const clause1Acts = clauseActs.get(1) || [];
      if (clause0Acts.length > 0 && clause1Acts.length > 0) {
        const relationIRI = this.generateIRI(buildOptions._clauseRelation, 'ClauseRelation', 0);
        const clauseRelationNode = {
          '@id': relationIRI,
          '@type': ['tagteam:ClauseRelation'],
          'tagteam:relationType': buildOptions._clauseRelation,
          'tagteam:fromClause': { '@id': clause0Acts[0]['@id'] },
          'tagteam:toClause': { '@id': clause1Acts[0]['@id'] }
        };
        this.addNode(clauseRelationNode);
      }
    }

    // ================================================================
    // Week 2: Assertion Events + GIT-Minimal Integration
    // ================================================================

    // Phase 2.1: Create IBE and parser agent (foundation for provenance)
    const ibeNode = this.informationStaircaseBuilder.createInputIBE(text, this.buildTimestamp);
    const parserAgentNode = this.informationStaircaseBuilder.createParserAgent();
    this.addNode(ibeNode);
    this.addNode(parserAgentNode);

    // Phase 2.1b: Link all ICE nodes to IBE via is_concretized_by (BFO_0000058)
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
      if (isICE && !node['is_concretized_by']) {
        node['is_concretized_by'] = { '@id': ibeNode['@id'] };
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
      '@type': ['cco:IntentionalAct', 'owl:NamedIndividual'],
      'rdfs:label': 'Semantic parsing act',
      'tagteam:actualityStatus': { '@id': 'tagteam:Actual' },
      'tagteam:has_input': { '@id': ibeNode['@id'] },
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
        parsingActNode['tagteam:has_output'] = outputICEs.map(ice => ({ '@id': ice['@id'] }));
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
        entity: r['inheres_in']?.['@id'],
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
        version: '3.0.0-alpha.1',
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

    // Verbose mode: attach POS token data from Compromise NLP
    if (buildOptions.verbose && _nlp) {
      const doc = _nlp(text);
      const sentences = doc.json();
      const tokens = [];
      for (const sentence of sentences) {
        for (const term of (sentence.terms || [])) {
          tokens.push({
            text: term.text,
            tags: Array.from(term.tags || [])
          });
        }
      }
      result._debug = { tokens };

      // v2 Phase 1: Include clause boundaries in debug output
      if (buildOptions._clauses) {
        result._debug.clauses = buildOptions._clauses;
      }
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
    // Build a map from entity IRI to its qualities (via inheres_in / BFO_0000197)
    const entityToQualities = new Map();
    qualities.forEach(quality => {
      const inheresIn = quality['inheres_in'];
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
        const members = entity['has_member_part'] || [];
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
  _matchActsToClauses(acts, clauses) {
    const clauseActs = new Map();
    for (const clause of clauses) {
      clauseActs.set(clause.index, []);
    }
    for (const act of acts) {
      const verbStart = act['tagteam:startPosition'] || 0;
      let bestClause = 0;
      for (const clause of clauses) {
        if (verbStart >= clause.start && verbStart < clause.end) {
          bestClause = clause.index;
          break;
        }
      }
      clauseActs.get(bestClause)?.push(act);
    }
    return clauseActs;
  }

  /**
   * V7-004/V7-005: Detect anaphoric links for relative clauses.
   *
   * Per Cambridge Grammar:
   * - §12.1-12.5: Relativizers (who/which/that) are anaphoric to antecedent NPs
   * - §12.6: Prepositional relatives (on which, to whom) have antecedent before preposition
   *
   * Patterns:
   * 1. Direct: "The engineer who..." - relativizer follows NP
   * 2. Prepositional: "The server on which..." - relativizer follows NP + PREP
   *
   * @param {string} text - Full text
   * @param {Array} entities - Extracted entities
   * @returns {Array} Array of AnaphoricLink nodes
   */
  _detectAnaphoricLinks(text, entities) {
    const links = [];
    const relativizers = ['who', 'whom', 'whose', 'which', 'that'];
    const prepositions = ['on', 'in', 'at', 'to', 'from', 'with', 'by', 'for', 'of', 'about', 'through', 'during', 'after', 'before'];
    const words = text.split(/\s+/);

    // Find all relativizer positions
    for (let i = 0; i < words.length; i++) {
      const word = words[i].toLowerCase().replace(/[.,;:!?]$/, '');
      if (!relativizers.includes(word)) continue;

      // Calculate position of this relativizer in original text
      let position = 0;
      for (let j = 0; j < i; j++) {
        position = text.indexOf(words[j], position) + words[j].length;
      }
      const relPos = text.indexOf(words[i], position);

      // V7-005: Check if preceded by preposition (prepositional relative)
      let isPrepositionalRelative = false;
      if (i > 0) {
        const prevWord = words[i - 1].toLowerCase().replace(/[.,;:!?]$/, '');
        isPrepositionalRelative = prepositions.includes(prevWord);
      }

      // Find antecedent: entity that ends before this relativizer
      const antecedent = entities.find(e => {
        const entityEnd = e['tagteam:endPosition'];
        if (entityEnd === undefined) return false;

        if (isPrepositionalRelative) {
          // For "on which", allow larger gap to account for preposition
          // e.g., "The server on which" - gap includes "on "
          return entityEnd >= relPos - 10 && entityEnd <= relPos;
        } else {
          // Direct relative: small gap (spaces) between entity and relativizer
          return entityEnd >= relPos - 3 && entityEnd <= relPos;
        }
      });

      if (!antecedent) continue;

      // Create AnaphoricLink node
      const anaphorText = isPrepositionalRelative ? `${words[i-1]} ${word}` : word;
      const linkIRI = this.generateIRI(word + '_' + antecedent['rdfs:label'], 'AnaphoricLink', relPos);
      const link = {
        '@id': linkIRI,
        '@type': ['tagteam:AnaphoricLink', 'owl:NamedIndividual'],
        'tagteam:anaphor': anaphorText,
        'tagteam:antecedent': { '@id': antecedent['@id'] },
        'rdfs:comment': `Relativizer "${anaphorText}" is anaphoric to "${antecedent['rdfs:label']}"`
      };
      links.push(link);
    }

    return links;
  }

  /**
   * V7-003: Enforce clause boundaries on entities.
   * Trims entities that extend beyond their clause's end position.
   * Prevents entities from absorbing verbs from subsequent clauses.
   */
  _enforceClauseBoundariesOnEntities(entities, clauses) {
    const trimmedEntities = [];

    for (const entity of entities) {
      const start = entity['tagteam:startPosition'];
      const end = entity['tagteam:endPosition'];

      if (start === undefined || end === undefined) {
        // No position info, keep as-is
        trimmedEntities.push(entity);
        continue;
      }

      // Find which clause this entity starts in
      const clause = clauses.find(c => start >= c.start && start < c.end);
      if (!clause) {
        // Entity doesn't start in any clause, keep as-is
        trimmedEntities.push(entity);
        continue;
      }

      // Check if entity extends beyond clause boundary
      if (end > clause.end) {
        // Trim entity to clause boundary
        const trimmedText = entity['rdfs:label'] || entity['tagteam:sourceText'] || '';
        const trimLength = clause.end - start;
        const newText = trimmedText.substring(0, trimLength).trim();

        // Skip if trimming removes everything
        if (newText.length === 0) continue;

        // Create trimmed entity
        const trimmedEntity = {
          ...entity,
          'rdfs:label': newText,
          'tagteam:sourceText': newText,
          'tagteam:endPosition': clause.end
        };
        trimmedEntities.push(trimmedEntity);
      } else {
        // Entity within clause boundary, keep as-is
        trimmedEntities.push(entity);
      }
    }

    return trimmedEntities;
  }

  /**
   * V7-003: Enforce hard clause boundaries (Cambridge Grammar §8.3)
   * Remove arguments that reference entities from different clauses.
   * Prevents argument bleeding in subordinate/coordinate structures.
   */
  _enforceClauseBoundaries(acts, entities, clauses, clauseActs) {
    // Build entity position map
    const entityPositionMap = new Map();
    entities.forEach(entity => {
      const start = entity['tagteam:startPosition'];
      const end = entity['tagteam:endPosition'];
      if (start !== undefined && end !== undefined) {
        entityPositionMap.set(entity['@id'], { start, end });
      }
    });

    // For each act, check if its arguments are in the same clause
    for (const [clauseIdx, actsInClause] of clauseActs) {
      const clause = clauses[clauseIdx];
      if (!clause) continue;

      for (const act of actsInClause) {
        const argumentProperties = ['cco:has_agent', 'cco:affects', 'cco:has_recipient', 'has_participant'];

        argumentProperties.forEach(prop => {
          const argValue = act[prop];
          if (!argValue) return;

          // Handle both single entity and array of entities
          const argIds = Array.isArray(argValue)
            ? argValue.map(v => (typeof v === 'object' ? v['@id'] : v))
            : [typeof argValue === 'object' ? argValue['@id'] : argValue];

          argIds.forEach((argId, idx) => {
            const entityPos = entityPositionMap.get(argId);
            if (!entityPos) return;

            // Check if entity is outside this clause's boundaries
            const entityInClause = entityPos.start >= clause.start && entityPos.end <= clause.end;

            if (!entityInClause) {
              // Remove this argument - it crosses clause boundary
              if (Array.isArray(act[prop])) {
                act[prop] = act[prop].filter((_, i) => i !== idx);
                if (act[prop].length === 0) delete act[prop];
              } else {
                delete act[prop];
              }
            }
          });
        });
      }
    }
  }

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

    // Require at least 4 content words in the object phrase for high complexity.
    // Simple proper nouns like "the United States" (2-3 words) don't need greedy NER.
    const minWordsForHigh = words.length >= 4;

    return {
      high: minWordsForHigh && (score > 0.3 || density > 0.5),
      score: Math.round(score * 100) / 100
    };
  }

  /**
   * Phase 3A: Build graph using tree-based extractors.
   *
   * Pipeline order (AC-3.0):
   *   1. normalizeUnicode(text)
   *   2. tokenize(normalizedText)
   *   3. perceptronTag(tokens)
   *   4. dependencyParse(tokens, tags)
   *   5. extractEntities(depTree)     [TreeEntityExtractor]
   *   6. extractActs(depTree)          [TreeActExtractor]
   *   7. mapRoles(entities, acts)      [TreeRoleMapper]
   *
   * @param {string} text - Raw input text
   * @param {Object} buildOptions - Build options
   * @returns {Object} JSON-LD graph
   */
  _buildWithTreeExtractors(text, buildOptions) {
    const stages = {};
    let autoLoaded = false;

    // Stage 0: Input validation (AC-4.10, AC-4.11)
    let _inputValidator;
    try { _inputValidator = require('../security/input-validator'); } catch(e) { /* browser */ }
    if (_inputValidator) {
      const validation = _inputValidator.validateInput(text);
      if (!validation.valid) {
        return {
          '@graph': [],
          _metadata: { error: validation.issues[0].code, inputValidationFailed: true }
        };
      }
      text = validation.normalized;
    }

    try {
      // Stage 1: Unicode normalization
      stages.current = 'normalizeUnicode';
      const normalizeUnicode = typeof _UnicodeNormalizer === 'function'
        ? _UnicodeNormalizer
        : (_UnicodeNormalizer && _UnicodeNormalizer.normalizeUnicode) || (t => t);
      const normalized = normalizeUnicode(text);

      // Stage 2: Tokenization
      stages.current = 'tokenize';
      const tokenizer = new _Tokenizer();
      const tokenObjs = tokenizer.tokenize(normalized);
      const tokens = tokenObjs.map(t => typeof t === 'string' ? t : t.text);

      // Stage 3: POS tagging
      stages.current = 'perceptronTag';
      const posModelPath = buildOptions.posModel || null;
      let tagger;
      if (this._treePosTagger) {
        tagger = this._treePosTagger;
      } else if (posModelPath) {
        if (typeof require === 'undefined') {
          throw new Error('Models not loaded. Call TagTeam.loadModels(posJSON, depJSON) before buildGraph() in browser.');
        }
        const fs = require('fs');
        const posModel = JSON.parse(fs.readFileSync(posModelPath, 'utf8'));
        tagger = new _PerceptronTagger(posModel);
        this._treePosTagger = tagger;
      } else {
        if (typeof require === 'undefined') {
          throw new Error('Models not loaded. Call TagTeam.loadModels(posJSON, depJSON) before buildGraph() in browser.');
        }
        // Auto-load from default path (AC-3.20)
        autoLoaded = true;
        console.warn('[TagTeam] Auto-loading POS model from default path. For better performance, pre-load models with loadModels() or loadTreeModels().');
        const fs = require('fs');
        const path = require('path');
        const defaultPath = path.join(__dirname, '../data/pos-weights-pruned.json');
        const posModel = JSON.parse(fs.readFileSync(defaultPath, 'utf8'));
        tagger = new _PerceptronTagger(posModel);
        this._treePosTagger = tagger;
      }
      const tags = tagger.tag(tokens);

      // Stage 4: Dependency parsing
      stages.current = 'dependencyParse';
      let depParser;
      if (this._treeDepParser) {
        depParser = this._treeDepParser;
      } else if (buildOptions.depModel) {
        if (typeof require === 'undefined') {
          throw new Error('Models not loaded. Call TagTeam.loadModels(posJSON, depJSON) before buildGraph() in browser.');
        }
        const fs = require('fs');
        const depModel = JSON.parse(fs.readFileSync(buildOptions.depModel, 'utf8'));
        depParser = new _DependencyParser(depModel);
        this._treeDepParser = depParser;
      } else {
        if (typeof require === 'undefined') {
          throw new Error('Models not loaded. Call TagTeam.loadModels(posJSON, depJSON) before buildGraph() in browser.');
        }
        // Auto-load from default path (AC-3.20 / AC-3.21)
        if (!autoLoaded) {
          autoLoaded = true;
          console.warn('[TagTeam] Auto-loading dep model from default path. For better performance, pre-load models with loadModels() or loadTreeModels().');
        }
        const fs = require('fs');
        const path = require('path');
        const defaultPath = path.join(__dirname, '../data/dep-weights-pruned.json');
        const depModel = JSON.parse(fs.readFileSync(defaultPath, 'utf8'));
        depParser = new _DependencyParser(depModel);
        this._treeDepParser = depParser;
      }
      const parseResult = depParser.parse(tokens, tags);

      // Stage 4.1: Ditransitive arc correction (AC-4.3b)
      // Rewrites compound→iobj for ditransitive verbs before tree construction
      if (_DepTreeCorrector) {
        _DepTreeCorrector.correctDitransitives(parseResult.arcs, tokens, tags);
      }

      const depTree = new _DepTree(parseResult.arcs, tokens, tags);

      // Stage 4.5: Calibration table loading (lazy-load, cached)
      if (!this._calibration && typeof require !== 'undefined') {
        try {
          const fs = require('fs');
          const calPath = require('path');
          const defaultCalPath = calPath.join(__dirname, '../data/dep-calibration.json');
          if (fs.existsSync(defaultCalPath)) {
            this._calibration = JSON.parse(fs.readFileSync(defaultCalPath, 'utf8'));
          }
        } catch (e) {
          // Calibration loading is non-blocking
        }
      }

      // Stage 4.6: Confidence annotation (AC-3.14 through AC-3.17)
      let annotatedArcs = parseResult.arcs;
      let confidenceAnnotator = null;
      if (_ConfidenceAnnotator) {
        confidenceAnnotator = new _ConfidenceAnnotator(this._calibration || null);
        annotatedArcs = confidenceAnnotator.annotateArcs(parseResult.arcs);
      }

      // Stage 4.7: Gazetteer initialization (lazy-load, cached like POS tagger/dep parser)
      if (!this._treeGazetteerNER && _GazetteerNER) {
        if (typeof require !== 'undefined') {
          try {
            const fs = require('fs');
            const gazPath = require('path');
            const gazetteersDir = gazPath.join(__dirname, '../data/gazetteers');
            if (fs.existsSync(gazetteersDir)) {
              const files = fs.readdirSync(gazetteersDir).filter(f => f.endsWith('.json'));
              const gazetteers = files.map(f =>
                JSON.parse(fs.readFileSync(gazPath.join(gazetteersDir, f), 'utf8'))
              );
              if (gazetteers.length > 0) {
                this._treeGazetteerNER = new _GazetteerNER(gazetteers);
              }
            }
          } catch (e) {
            // Gazetteer loading is non-blocking — tree pipeline works without it
          }
        }
      }

      // Stage 5: Tree-based entity extraction
      stages.current = 'extractEntities';
      const entityExtractor = new _TreeEntityExtractor({
        gazetteerNER: this._treeGazetteerNER || null
      });
      const { entities, aliasMap } = entityExtractor.extract(depTree);

      // Stage 6: Tree-based act extraction
      stages.current = 'extractActs';
      const actExtractor = new _TreeActExtractor();
      const { acts, structuralAssertions } = actExtractor.extract(depTree);

      // Stage 7: Tree-based role mapping
      stages.current = 'mapRoles';
      const roleMapper = new _TreeRoleMapper();
      const roles = roleMapper.map(entities, acts, depTree);

      // Stage 7.5: Genericity detection (§9.5)
      // Classify subject NPs as GEN/INST/UNIV/AMB before graph assembly
      let genericityMap = null;
      if (_GenericityDetector) {
        stages.current = 'classifyGenericity';
        const genericityDetector = new _GenericityDetector({
          lemmatizer: this.lemmatizer,
          gazetteerNER: this._treeGazetteerNER || null,
        });
        genericityMap = genericityDetector.classify(entities, depTree, tags, buildOptions);
      }

      // Stage 8: Assign mention IDs (AC-3.22)
      // Format: "s{sentenceIdx}:h{headId}:{charStart}-{charEnd}"
      const sentenceIdx = 0; // Single-sentence pipeline for now
      for (const entity of entities) {
        const headId = entity.headId || 0;
        // Compute character offsets from token positions
        let charStart = 0;
        let charEnd = 0;
        if (entity.indices && entity.indices.length > 0) {
          // Token indices are 1-based; compute char offsets from token positions in text
          const minIdx = Math.min(...entity.indices);
          const maxIdx = Math.max(...entity.indices);
          // Approximate char offsets from token positions
          charStart = 0;
          for (let i = 0; i < minIdx - 1 && i < tokens.length; i++) {
            charStart += tokens[i].length + 1; // +1 for space
          }
          charEnd = charStart;
          for (let i = minIdx - 1; i <= maxIdx - 1 && i < tokens.length; i++) {
            charEnd += tokens[i].length + (i < maxIdx - 1 ? 1 : 0);
          }
        }
        entity.mentionId = `s${sentenceIdx}:h${headId}:${charStart}-${charEnd}`;
      }

      // Build JSON-LD graph from extracted data
      stages.current = 'buildGraph';
      const graphNodes = [];

      // Convert entities to JSON-LD nodes
      for (const entity of entities) {
        const entityNode = {
          '@id': `${this.options.namespace}:${this._sanitizeId(entity.fullText)}`,
          '@type': [entity.type || 'bfo:Entity'],
          'rdfs:label': entity.fullText,
        };
        if (entity.alias) {
          entityNode['tagteam:alias'] = entity.alias;
        }
        if (entity.resolvedVia) {
          entityNode['tagteam:resolvedVia'] = entity.resolvedVia;
        }
        // Mention ID (AC-3.22)
        if (entity.mentionId) {
          entityNode['tagteam:mentionId'] = entity.mentionId;
        }
        // Confidence annotations (AC-3.16)
        if (confidenceAnnotator) {
          const conf = confidenceAnnotator.entityConfidence(entity, annotatedArcs);
          entityNode['tagteam:parseConfidence'] = conf.confidence;
          entityNode['tagteam:parseProbability'] = conf.probability;
        }
        // Genericity annotations (§9.5)
        if (genericityMap && entity.headId) {
          const gen = genericityMap.get(entity.headId);
          if (gen) {
            entityNode['tagteam:genericityCategory'] = gen.category;
            entityNode['tagteam:genericityConfidence'] = gen.confidence;
            if (gen.basis) {
              entityNode['tagteam:genericityBasis'] = gen.basis;
            }
            if (gen.alternative) {
              entityNode['tagteam:genericityAlternative'] = {
                'tagteam:category': gen.alternative.category,
                'tagteam:confidence': gen.alternative.confidence
              };
            }
          }
        }
        graphNodes.push(entityNode);
      }

      // Convert acts to JSON-LD nodes
      for (const act of acts) {
        const actNode = {
          '@id': `${this.options.namespace}:Act_${this._sanitizeId(act.verb)}`,
          '@type': ['cco:IntentionalAct'],
          'rdfs:label': act.verb,
          'tagteam:lemma': act.lemma,
        };
        if (act.isPassive) actNode['tagteam:isPassive'] = true;
        if (act.isNegated) actNode['tagteam:isNegated'] = true;
        if (act.isCopular) actNode['tagteam:isCopular'] = true;
        graphNodes.push(actNode);
      }

      // Convert structural assertions to JSON-LD nodes
      for (const sa of structuralAssertions) {
        const assertionNode = {
          '@id': `${this.options.namespace}:Assertion_${this._sanitizeId(sa.subject || 'unknown')}`,
          '@type': [sa.negated ? 'tagteam:NegatedStructuralAssertion' : 'tagteam:StructuralAssertion'],
          'tagteam:subject': sa.subject,
          'tagteam:pattern': sa.pattern,
        };
        if (sa.relation) assertionNode['tagteam:relation'] = sa.relation;
        if (sa.object) assertionNode['tagteam:object'] = sa.object;
        if (sa.copula) assertionNode['tagteam:copula'] = sa.copula;
        if (sa.negated) assertionNode['tagteam:negated'] = true;
        graphNodes.push(assertionNode);
      }

      // Convert roles to JSON-LD nodes
      for (const role of roles) {
        const roleLabel = role.label || role.role;
        const roleNode = {
          '@id': `${this.options.namespace}:Role_${this._sanitizeId(role.entity)}_${this._sanitizeId(roleLabel)}`,
          '@type': [role.role],
          'rdfs:label': roleLabel,
          'tagteam:roleType': roleLabel,
          'tagteam:bearer': { '@id': `${this.options.namespace}:${this._sanitizeId(role.entity)}` },
          'tagteam:realizedIn': { '@id': `${this.options.namespace}:Act_${this._sanitizeId(role.act)}` },
        };
        if (role.preposition) roleNode['tagteam:preposition'] = role.preposition;
        // Confidence annotations on roles (AC-3.16)
        if (confidenceAnnotator) {
          const conf = confidenceAnnotator.roleConfidence(role, annotatedArcs);
          roleNode['tagteam:parseConfidence'] = conf.confidence;
          roleNode['tagteam:parseProbability'] = conf.probability;
        }
        graphNodes.push(roleNode);
      }

      // --- Two-Tier ICE: Create Tier 2 real-world entities ---
      if (_RealWorldEntityFactory) {
        const entityFactory = new _RealWorldEntityFactory({
          graphBuilder: this,
          documentIRI: `inst:Input_Text_IBE_${this._hashText(text)}`,
          lemmatizer: this.lemmatizer
        });

        // Filter entity nodes (exclude Acts, Roles, Assertions)
        const referentNodes = graphNodes.filter(n => {
          const t = [].concat(n['@type'] || []);
          return !t.some(x => x.includes('Act') || x.includes('Role') || x.includes('Assertion'));
        });

        // Bootstrap tagteam:denotesType from @type[0] and mark as DiscourseReferent
        for (const node of referentNodes) {
          const types = [].concat(node['@type'] || []);
          if (!node['tagteam:denotesType'] && types[0]) {
            node['tagteam:denotesType'] = types[0];
          }
          if (!types.includes('tagteam:DiscourseReferent')) {
            node['@type'].push('tagteam:DiscourseReferent');
          }
        }

        // Create Tier 2 entities and link via cco:is_about
        const { tier2Entities, linkMap } = entityFactory.createFromReferents(referentNodes);
        for (const node of referentNodes) {
          const tier2IRI = linkMap.get(node['@id']);
          if (tier2IRI) {
            node['cco:is_about'] = { '@id': tier2IRI };
          }
        }
        for (const t2 of tier2Entities) {
          graphNodes.push(t2);
        }
      }

      // Mark act nodes as VerbPhrase ICE
      for (const node of graphNodes) {
        const types = [].concat(node['@type'] || []);
        if (types.includes('cco:IntentionalAct') && !types.includes('tagteam:VerbPhrase')) {
          node['@type'].push('tagteam:VerbPhrase');
        }
      }

      // --- Provenance: IBE + Agent + IntentionalAct (parsing) ---
      const ibeNode = this.informationStaircaseBuilder.createInputIBE(text, this.buildTimestamp);
      const parserAgentNode = this.informationStaircaseBuilder.createParserAgent();
      graphNodes.push(ibeNode);
      graphNodes.push(parserAgentNode);

      // Link all ICE nodes to IBE via is_concretized_by (BFO_0000058)
      const iceTypes = ['tagteam:DiscourseReferent', 'tagteam:VerbPhrase'];
      for (const node of graphNodes) {
        const types = [].concat(node['@type'] || []);
        if (iceTypes.some(t => types.includes(t)) && !node['is_concretized_by']) {
          node['is_concretized_by'] = { '@id': ibeNode['@id'] };
        }
      }

      // Create ParsingAct
      const parsingActIRI = `inst:ParsingAct_${this._hashText(text).substring(0, 8)}`;
      const iceNodes = graphNodes.filter(n => {
        const types = [].concat(n['@type'] || []);
        return iceTypes.some(t => types.includes(t));
      });
      const parsingAct = {
        '@id': parsingActIRI,
        '@type': ['cco:IntentionalAct', 'owl:NamedIndividual'],
        'rdfs:label': 'Semantic parsing act',
        'tagteam:actualityStatus': { '@id': 'tagteam:Actual' },
        'tagteam:has_input': { '@id': ibeNode['@id'] },
        'cco:has_agent': { '@id': parserAgentNode['@id'] },
        'tagteam:has_output': iceNodes.map(n => ({ '@id': n['@id'] })),
        'tagteam:instantiated_at': this.buildTimestamp
      };
      graphNodes.push(parsingAct);

      // AC-4.8: Sanitize all string values in graph nodes to prevent XSS
      for (const node of graphNodes) {
        for (const key of Object.keys(node)) {
          if (typeof node[key] === 'string' && key !== '@id' && key !== '@type') {
            node[key] = node[key].replace(/&/g, '&amp;').replace(/</g, '&lt;')
              .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
          }
        }
      }

      const result = {
        '@graph': graphNodes,
        _metadata: {
          pipeline: 'tree-based',
          version: '3.1.0-alpha.1',
          inputText: text,
          buildTimestamp: this.buildTimestamp,
          tokens,
          tags,
          arcs: annotatedArcs,
          entities: entities.length,
          acts: acts.length,
          structuralAssertions: structuralAssertions.length,
          roles: roles.length,
        }
      };

      // Debug output (AC-3.18): only when verbose: true
      if (buildOptions.verbose) {
        // Gazetteer match tracking
        const gazMatched = [];
        const gazUnmatched = [];
        if (this._treeGazetteerNER) {
          for (const entity of entities) {
            if (entity.resolvedVia === 'alias' || entity.gazetteerMatch) {
              gazMatched.push(entity.fullText);
            } else {
              gazUnmatched.push(entity.fullText);
            }
          }
        }

        result._debug = {
          dependencyTree: annotatedArcs.map((arc, idx) => ({
            id: arc.dependent,
            word: tokens[arc.dependent - 1] || '',
            tag: tags[arc.dependent - 1] || '',
            head: arc.head,
            deprel: arc.label,
            margin: arc.scoreMargin || arc.parseMargin || 0,
          })),
          tokens: tokens.map((t, i) => ({ text: t, tag: tags[i] || '' })),
          entitySpans: entities.map(e => ({
            head: e.headId || 0,
            span: e.indices || [],
            fullText: e.fullText,
            role: e.role || '',
          })),
          gazetteers: {
            matched: gazMatched,
            unmatched: gazUnmatched,
          },
        };
      }

      return result;

    } catch (error) {
      throw new Error(`Tree pipeline failed at stage "${stages.current}": ${error.message}`);
    }
  }

  /**
   * Sanitize a string for use as an IRI local name.
   * @param {string} str
   * @returns {string}
   */
  _sanitizeId(str) {
    if (!str) return 'unknown';
    return str.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  }
}

module.exports = SemanticGraphBuilder;
