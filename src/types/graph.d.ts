/**
 * Type definitions for TagTeam semantic graph structures
 *
 * @module types/graph
 * @version 3.0.0-alpha.2
 */

/**
 * JSON-LD Node - Base interface for all graph nodes
 */
export interface JSONLDNode {
  '@id': string;
  '@type': string | string[];
  'rdfs:label'?: string;
  [key: string]: any;
}

/**
 * Discourse Referent - Text-extracted entity mention
 */
export interface DiscourseReferent extends JSONLDNode {
  '@type': 'tagteam:DiscourseReferent' | ['tagteam:DiscourseReferent', 'owl:NamedIndividual'];
  'tagteam:denotesType': string; // IRI of type (e.g., "cco:Person")
  'tagteam:referentialStatus'?: 'presupposed' | 'introduced' | 'anaphoric' | 'hypothetical';
  'tagteam:discourseRole'?: string;
  'tagteam:definiteness'?: 'definite' | 'indefinite';
  'tagteam:extracted_from_span'?: string;
  'tagteam:span_offset'?: [number, number];
}

/**
 * BFO Role
 */
export interface Role extends JSONLDNode {
  '@type': 'bfo:BFO_0000023' | ['bfo:BFO_0000023', 'owl:NamedIndividual'];
  'bfo:inheres_in': string; // IRI of bearer (REQUIRED per SHACL)
  'bfo:realized_in'?: string; // IRI of process (optional - dormant roles valid)
}

/**
 * Intentional Act
 */
export interface IntentionalAct extends JSONLDNode {
  '@type': 'cco:IntentionalAct' | ['cco:IntentionalAct', 'owl:NamedIndividual'];
  'cco:has_agent'?: string; // IRI of agent discourse referent
  'bfo:has_participant'?: string | string[];
  'cco:affects'?: string;
  'tagteam:verb'?: string;
  'tagteam:modality'?: 'obligation' | 'permission' | 'prohibition';
}

/**
 * Confidence breakdown (three-way decomposition)
 */
export interface ConfidenceScores {
  'tagteam:extractionConfidence': number; // [0.0, 1.0]
  'tagteam:classificationConfidence': number;
  'tagteam:relevanceConfidence': number;
  'tagteam:aggregateConfidence': number;
  'tagteam:aggregationMethod': 'geometric_mean';
}

/**
 * Assertion Event - Base for value/context assertions
 */
export interface AssertionEvent extends JSONLDNode, Partial<ConfidenceScores> {
  'tagteam:asserts': string; // IRI of ICE
  'tagteam:detected_by': string; // IRI of parser agent
  'tagteam:based_on': string; // IRI of IBE
  'tagteam:assertionType': 'tagteam:AutomatedDetection' | 'tagteam:HumanValidation' | 'tagteam:HumanRejection' | 'tagteam:HumanCorrection';
  'tagteam:validInContext': string; // IRI of InterpretationContext
  'tagteam:temporal_extent'?: string; // ISO 8601 datetime
  'tagteam:validatedBy'?: string; // IRI of human reviewer (if applicable)
  'tagteam:validationTimestamp'?: string;
  'tagteam:supersedes'?: string; // IRI of previous assertion
}

/**
 * Value Assertion Event
 */
export interface ValueAssertionEvent extends AssertionEvent {
  '@type': 'tagteam:ValueAssertionEvent' | ['tagteam:ValueAssertionEvent', 'owl:NamedIndividual'];
  'tagteam:detection_method'?: string;
  'tagteam:matched_markers'?: string[];
}

/**
 * Context Assessment Event
 */
export interface ContextAssessmentEvent extends AssertionEvent {
  '@type': 'tagteam:ContextAssessmentEvent' | ['tagteam:ContextAssessmentEvent', 'owl:NamedIndividual'];
  'tagteam:dimension': string; // e.g., "temporal.urgency"
  'tagteam:score': number; // [0.0, 1.0]
}

/**
 * Information Content Entity
 */
export interface InformationContentEntity extends JSONLDNode {
  '@type': 'cco:InformationContentEntity' | ['cco:InformationContentEntity', 'owl:NamedIndividual'];
  'cco:is_about'?: string; // IRI of act/entity
  'cco:is_concretized_by'?: string; // IRI of IBE (REQUIRED per SHACL)
  'tagteam:polarity'?: number;
  'tagteam:salience'?: number;
}

/**
 * Information Bearing Entity
 */
export interface InformationBearingEntity extends JSONLDNode {
  '@type': 'cco:InformationBearingEntity' | ['cco:InformationBearingEntity', 'owl:NamedIndividual'];
  'cco:has_text_value': string; // Full input text
  'cco:concretizes'?: string | string[]; // IRIs of ICEs
  'tagteam:received_at'?: string; // ISO 8601 datetime
}

/**
 * Interpretation Context (GIT-Minimal)
 */
export interface InterpretationContext extends JSONLDNode {
  '@type': 'tagteam:InterpretationContext' | ['tagteam:InterpretationContext', 'owl:NamedIndividual'];
  'tagteam:framework': string; // e.g., "Principlism (Beauchamp & Childress)"
  'rdfs:comment'?: string;
}

/**
 * Semantic Graph - Top-level structure
 */
export interface SemanticGraph {
  '@context': JSONLDContext;
  '@graph': JSONLDNode[];
}

/**
 * JSON-LD @context
 */
export interface JSONLDContext {
  bfo: string;
  cco: string;
  tagteam: string;
  inst: string;
  rdfs: string;
  owl: string;
  xsd: string;
  [key: string]: any;
}

/**
 * Parse options
 */
export interface ParseOptions {
  format?: 'legacy' | 'jsonld';
  context?: string; // Interpretation context (e.g., "MedicalEthics")
  namespace?: string; // Namespace prefix for instances (default: "inst")
}

/**
 * Graph statistics
 */
export interface GraphStats {
  nodeCount: number;
  timestamp?: string;
  inputLength: number;
}
