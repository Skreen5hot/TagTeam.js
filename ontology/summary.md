# Batch Processing Summary

**Job ID:** batch_B9n-xhva2K4ddy2xDvTLuA
**Status:** complete
**Created:** 2026-02-02T06:02:09.236712
**Duration:** 281.0s

## Results

- **Total:** 109
- **Passed:** 106
- **Failed:** 3

## Classes

### [PASS] Discourse Referent (`tagteam:DiscourseReferent`)

**Original Definition:**  
"An information content entity that represents a linguistic reference to an entity mentioned in text. Discourse referents are parsing-layer artifacts that denote real-world entities."

**Ralph:**  
> An information content entity that denotes a linguistic reference to an entity mentioned in text.

### [PASS] Verb Phrase (`tagteam:VerbPhrase`)

**Original Definition:**  
"An information content entity representing a verb phrase extracted from text, including its lemma, tense, aspect, and modality markers."

**Ralph:**  
> An information content entity that denotes a linguistic unit expressing an action, state, or occurrence along with its associated temporal, aspectual, and modal properties.

### [FAIL] Deontic Content (`tagteam:DeonticContent`)

**Original Definition:**  
"An information content entity representing deontic (normative) content extracted from text. Deontic content expresses obligations, permissions, prohibitions, or recommendations - the 'ought' rather than the 'is'."

**Ralph:**  
> An information content entity that denotes normative statements expressing obligations, permissions, prohibitions, or recommendations.

**Failed Checks:**
- **C3** Non-circular: Term appears in definition: content

### [FAIL] Directive Content (`tagteam:DirectiveContent`)

**Original Definition:**  
"A specific type of deontic content that directly prescribes, permits, or prohibits an action. Extracted from imperative modal expressions like 'must', 'shall', 'may not'."

**Ralph:**  
> An Information Content Entity that denotes deontic modalities which prescribe, permit, or prohibit specific actions.

**Failed Checks:**
- **C3** Non-circular: Term appears in definition: content

### [PASS] Scarcity Assertion (`tagteam:ScarcityAssertion`)

**Original Definition:**  
"An information content entity asserting that a resource is scarce relative to demand, based on linguistic markers like 'the last', 'only one', etc."

**Ralph:**  
> An information content entity that denotes the insufficient availability of a resource relative to demand for that resource.

### [PASS] Value Detection Record (`tagteam:ValueDetectionRecord`)

**Original Definition:**  
"A record of an ethical value detected in text through pattern matching or semantic analysis."

**Ralph:**  
> An Information Content Entity that denotes the presence of an ethical principle within a textual artifact along with the specific location where that principle occurs.

### [PASS] Context Assessment Record (`tagteam:ContextAssessmentRecord`)

**Original Definition:**  
"A record of context dimension scores assessed from text analysis."

**Ralph:**  
> An Information Content Entity that denotes dimension scores assigned to textual content based on evaluative criteria.

### [PASS] Interpretation Context (`tagteam:InterpretationContext`)

**Original Definition:**  
"An information content entity representing the interpretive framework under which assertions are made, such as medical ethics (Principlism) or legal contexts."

**Ralph:**  
> An information content entity that denotes a framework of principles, standards, or perspectives that guides the understanding and evaluation of assertions, such as medical ethics or legal doctrine.

### [PASS] Value Assertion Event (`tagteam:ValueAssertionEvent`)

**Original Definition:**  
"A process in which an agent (human or artificial) asserts that an ethical value is present in or relevant to a given text. Includes confidence decomposition and provenance tracking."

**Ralph:**  
> A process in which an agent asserts that an ethical principle is present in or relevant to a given text and includes confidence decomposition and provenance tracking.

### [PASS] Context Assessment Event (`tagteam:ContextAssessmentEvent`)

**Original Definition:**  
"A process in which an agent assesses a context dimension (e.g., temporal urgency, stakeholder vulnerability) and assigns a score."

**Ralph:**  
> A process in which an agent evaluates a situational dimension and assigns a score to that dimension.

### [PASS] Ethical Value ICE (`tagteam:EthicalValueICE`)

**Original Definition:**  
"An information content entity representing an ethical value (e.g., autonomy, beneficence, justice) that is the subject of a ValueAssertionEvent."

**Ralph:**  
> An information content entity that denotes a moral principle or standard (such as autonomy, beneficence, or justice) that guides conduct and decision-making.

### [PASS] Context Dimension ICE (`tagteam:ContextDimensionICE`)

**Original Definition:**  
"An information content entity representing a context dimension assessment (e.g., temporal.urgency, stakeholder.vulnerability)."

**Ralph:**  
> An Information Content Entity that denotes an evaluative aspect of a situational circumstance along which assessments can be made.

### [PASS] Assertion Type (`tagteam:AssertionType`)

**Original Definition:**  
"A class whose instances categorize the provenance and validation status of assertions."

**Ralph:**  
> An Information Content Entity that denotes a category specifying the provenance and validation status of declarative statements.

### [PASS] Automated Detection (`tagteam:AutomatedDetection`)

**Original Definition:**  
"An assertion type indicating the assertion was made by an automated parser without human validation."

**Ralph:**  
> An assertion type that denotes assertions made by computational systems without human validation.

### [PASS] Human Validation (`tagteam:HumanValidation`)

**Original Definition:**  
"An assertion type indicating the assertion has been validated by a human reviewer."

**Ralph:**  
> An assertion type that denotes assertions which have been confirmed as accurate by a person.

### [PASS] Human Rejection (`tagteam:HumanRejection`)

**Original Definition:**  
"An assertion type indicating the assertion has been rejected by a human reviewer as incorrect."

**Ralph:**  
> An assertion type that denotes an assertion has been rejected by a person reviewer as incorrect.

### [PASS] Human Correction (`tagteam:HumanCorrection`)

**Original Definition:**  
"An assertion type indicating the assertion has been corrected by a human reviewer, superseding a previous assertion."

**Ralph:**  
> An assertion type that denotes an assertion has been modified by a person to supersede a previous assertion.

### [PASS] Actuality Status (`tagteam:ActualityStatus`)

**Original Definition:**  
"A class whose instances represent the actuality or modality status of an act: whether it is actual, prescribed, permitted, prohibited, hypothetical, planned, or negated."

**Ralph:**  
> An Information Content Entity that denotes the modal condition of an act with respect to its realization in reality.

### [PASS] Actual (`tagteam:Actual`)

**Original Definition:**  
"An actuality status indicating the act has occurred or is occurring in reality."

**Ralph:**  
> An actuality status that denotes the occurrence or current occurrence of an act in reality.

### [PASS] Prescribed (`tagteam:Prescribed`)

**Original Definition:**  
"An actuality status indicating the act is obligated or required (deontic necessity)."

**Ralph:**  
> An actuality status that denotes the deontic necessity of some act or state of affairs.

### [PASS] Permitted (`tagteam:Permitted`)

**Original Definition:**  
"An actuality status indicating the act is allowed but not required (deontic possibility)."

**Ralph:**  
> An actuality status that denotes a deontic modality wherein an act is allowed but not required.

### [PASS] Prohibited (`tagteam:Prohibited`)

**Original Definition:**  
"An actuality status indicating the act is forbidden (deontic impossibility)."

**Ralph:**  
> An actuality status that denotes the deontic impossibility of some act or state of affairs.

### [PASS] Hypothetical (`tagteam:Hypothetical`)

**Original Definition:**  
"An actuality status indicating the act is being considered or discussed as a possibility, not asserted as actual."

**Ralph:**  
> An actuality status that denotes a state of affairs as being considered or discussed as a possibility rather than being asserted as actual.

### [PASS] Planned (`tagteam:Planned`)

**Original Definition:**  
"An actuality status indicating the act is intended for future execution."

**Ralph:**  
> An actuality status that denotes an act is intended for future execution but has not yet been initiated.

### [PASS] Negated (`tagteam:Negated`)

**Original Definition:**  
"An actuality status indicating the act is explicitly negated in the text."

**Ralph:**  
> An actuality status that denotes the explicit denial or contradiction of an act's occurrence in the text.

### [FAIL] Default Context (`tagteam:Default_Context`)

**Original Definition:**  
"The default interpretation context used when no specific context is specified."

**Ralph:**  
> An interpretation context that is applied when no alternative interpretive framework is explicitly designated.

**Failed Checks:**
- **C3** Non-circular: Term appears in definition: context

### [PASS] has component (`tagteam:has_component`)

**Original Definition:**  
"Relates a complex linguistic structure to its component parts."

**Ralph:**  
> A relation that holds between a complex linguistic structure and a constituent part of that structure.

### [PASS] extracted from (`tagteam:extracted_from`)

**Original Definition:**  
"Relates a parsed entity or assertion to the discourse referent from which it was extracted."

**Ralph:**  
> An object property that relates an information content entity to the discourse referent that bears the information content denoted by that entity.

### [PASS] corefers with (`tagteam:corefersWith`)

**Original Definition:**  
"Relates two discourse referents that refer to the same real-world entity."

**Ralph:**  
> An object property that relates two discourse referents that denote the same entity.

### [PASS] describes quality (`tagteam:describes_quality`)

**Original Definition:**  
"Relates a discourse referent to a BFO quality that it linguistically describes. This grounds linguistic adjectives (like 'critically ill') in physical states modeled as bfo:Quality."

**Ralph:**  
> An object property that relates a discourse referent to a BFO qualitative characteristic that the discourse referent linguistically denotes.

### [PASS] would be realized in (`tagteam:would_be_realized_in`)

**Original Definition:**  
"Relates a BFO role to a process in which it would be realized if the process were to occur. Used for prescribed, permitted, or hypothetical acts where the role is not yet actually realized."

**Ralph:**  
> An object property that relates a role to a process type such that the role has the disposition to be actualized during instances of that process type under appropriate conditions.

### [PASS] actuality status (`tagteam:actualityStatus`)

**Original Definition:**  
"Relates an act to its actuality status, indicating whether it is actual, prescribed, permitted, prohibited, hypothetical, planned, or negated."

**Ralph:**  
> An object property that relates an act to a quality that specifies the modal nature of that act.

### [PASS] prescribes (`tagteam:prescribes`)

**Original Definition:**  
"Relates a directive content entity to the act it prescribes."

**Ralph:**  
> A relation that holds between a directive information content entity and an act that the directive specifies as required or obligatory.

### [PASS] prescribed by (`tagteam:prescribed_by`)

**Original Definition:**  
"Relates an act (process) to the directive content entity that prescribes it. Inverse of prescribes."

**Ralph:**  
> An object property that relates an act to the directive content entity that prescribes it.

### [PASS] asserts (`tagteam:asserts`)

**Original Definition:**  
"Relates an assertion event to the information content entity being asserted."

**Ralph:**  
> A relation that holds between an assertion event and an information content entity that is the propositional content of that event.

### [PASS] detected by (`tagteam:detected_by`)

**Original Definition:**  
"Relates an assertion event to the agent (human or artificial) that made the detection."

**Ralph:**  
> An object property that relates an assertion event to the agent that is the detector of the content of that assertion.

### [PASS] based on (`tagteam:based_on`)

**Original Definition:**  
"Relates an assertion event to the information bearing entity (input text) on which the assertion is based."

**Ralph:**  
> An object property that relates an assertion event to the information bearing entity that serves as the evidential foundation for that assertion.

### [PASS] assertion type (`tagteam:assertionType`)

**Original Definition:**  
"Relates an assertion event to its type (automated detection, human validation, etc.)."

**Ralph:**  
> An object property that relates a declarative information content entity to the process classification that brought about that entity.

### [PASS] valid in context (`tagteam:validInContext`)

**Original Definition:**  
"Relates an assertion to the interpretation context under which it is valid."

**Ralph:**  
> An object property that relates an assertion to the interpretation framework under which that assertion holds true.

### [PASS] validated by (`tagteam:validatedBy`)

**Original Definition:**  
"Relates an assertion event to the human agent who validated it."

**Ralph:**  
> An object property that relates an assertion event to the human agent who confirmed its accuracy or correctness.

### [PASS] supersedes (`tagteam:supersedes`)

**Original Definition:**  
"Relates a corrected assertion to the previous assertion it supersedes."

**Ralph:**  
> A relation that holds between a corrected assertion and a previous assertion that the corrected assertion replaces due to the previous assertion containing an error or being outdated.

### [PASS] scarce resource (`tagteam:scarceResource`)

**Original Definition:**  
"Relates a scarcity assertion to the resource that is scarce."

**Ralph:**  
> An object property that relates a scarcity assertion to a material entity that is in limited supply.

### [PASS] competing parties (`tagteam:competingParties`)

**Original Definition:**  
"Relates a scarcity assertion to the parties competing for the scarce resource."

**Ralph:**  
> An object property that relates a scarcity assertion to the agents that are in competition for the scarce resource.

### [PASS] extraction confidence (`tagteam:extractionConfidence`)

**Original Definition:**  
"The confidence score [0.0-1.0] for the extraction step of an assertion."

**Ralph:**  
> A datatype property that denotes a numerical value between 0.0 and 1.0 indicating the degree of certainty associated with an automated derivation process for an assertion.

### [PASS] classification confidence (`tagteam:classificationConfidence`)

**Original Definition:**  
"The confidence score [0.0-1.0] for the classification step of an assertion."

**Ralph:**  
> A datatype property that denotes a numerical value between 0.0 and 1.0 indicating the degree of certainty in a categorical assignment.

### [PASS] relevance confidence (`tagteam:relevanceConfidence`)

**Original Definition:**  
"The confidence score [0.0-1.0] for the relevance of an assertion to the current context."

**Ralph:**  
> A datatype property that denotes a numerical value between 0.0 and 1.0 indicating the degree to which an assertion pertains to a specified context.

### [PASS] aggregate confidence (`tagteam:aggregateConfidence`)

**Original Definition:**  
"The aggregated confidence score [0.0-1.0] combining extraction, classification, and relevance."

**Ralph:**  
> A datatype property that denotes a numerical value between 0.0 and 1.0 representing the combined certainty measure derived from extraction, classification, and relevance assessments.

### [PASS] aggregation method (`tagteam:aggregationMethod`)

**Original Definition:**  
"The method used to compute the aggregate confidence (e.g., 'geometric_mean', 'direct_score')."

**Ralph:**  
> A datatype property that denotes the computational approach for combining multiple confidence values into a single aggregate value.

### [PASS] instantiated at (`tagteam:instantiated_at`)

**Original Definition:**  
"The timestamp when an entity was instantiated in the graph."

**Ralph:**  
> A datatype property that denotes the timestamp when an entity was created in the graph.

### [PASS] instantiated by (`tagteam:instantiated_by`)

**Original Definition:**  
"The agent or document that caused an entity to be instantiated."

**Ralph:**  
> An object property that relates an entity to the agent or document that brought it into existence.

### [PASS] detected at (`tagteam:detected_at`)

**Original Definition:**  
"The timestamp when a detection (e.g., scarcity, value) was made."

**Ralph:**  
> The timestamp when a detection (e.g., scarcity, value) was made.

### [PASS] received at (`tagteam:received_at`)

**Original Definition:**  
"The timestamp when input text was received for processing."

**Ralph:**  
> A temporal instant that denotes when input text arrived for processing.

### [PASS] validation timestamp (`tagteam:validationTimestamp`)

**Original Definition:**  
"The timestamp when an assertion was validated by a human reviewer."

**Ralph:**  
> A datatype property that denotes the temporal instant when an assertion was validated by a human reviewer.

### [PASS] temporal extent (`tagteam:temporal_extent`)

**Original Definition:**  
"The temporal extent or duration associated with an entity or process."

**Ralph:**  
> A datatype property that denotes the duration of time during which an entity exists or a process occurs.

### [PASS] source text (`tagteam:sourceText`)

**Original Definition:**  
"The original text span from which an entity was extracted."

**Ralph:**  
> A datatype property that denotes the original character sequence from which an entity originates.

### [PASS] start position (`tagteam:startPosition`)

**Original Definition:**  
"The character offset where the source text begins in the input."

**Ralph:**  
> The character offset where the source text begins in the input.

### [PASS] end position (`tagteam:endPosition`)

**Original Definition:**  
"The character offset where the source text ends in the input."

**Ralph:**  
> A datatype property that denotes the character offset where the source text concludes in the input.

### [PASS] character count (`tagteam:char_count`)

**Original Definition:**  
"The number of characters in the input text."

**Ralph:**  
> A datatype property that denotes the quantity of individual symbols contained within a specified textual entity.

### [PASS] word count (`tagteam:word_count`)

**Original Definition:**  
"The number of words in the input text."

**Ralph:**  
> A datatype property that denotes the quantity of lexical units in a given textual input.

### [PASS] extracted from span (`tagteam:extracted_from_span`)

**Original Definition:**  
"The text span from which an entity was extracted."

**Ralph:**  
> A datatype property that relates an entity to the text segment that is the source of that entity.

### [PASS] span offset (`tagteam:span_offset`)

**Original Definition:**  
"The start and end character offsets of a span, as a pair of integers."

**Ralph:**  
> A datatype property that denotes the start and end character positions of a text segment, expressed as a pair of integers.

### [PASS] denotes type (`tagteam:denotesType`)

**Original Definition:**  
"The IRI of the ontology class that a discourse referent denotes (e.g., cco:Person, cco:Artifact)."

**Ralph:**  
> A datatype property that relates a discourse referent to the IRI of the ontology class that the discourse referent refers to.

### [PASS] referential status (`tagteam:referentialStatus`)

**Original Definition:**  
"The discourse status of a referent: 'presupposed' (definite, known), 'introduced' (new to discourse), 'anaphoric' (referring back), or 'hypothetical'."

**Ralph:**  
> A datatype property that denotes the discourse accessibility of an entity mentioned in text, with values indicating whether the entity is presupposed as known, newly introduced, referenced anaphorically, or presented hypothetically.

### [PASS] definiteness (`tagteam:definiteness`)

**Original Definition:**  
"Whether the referent is 'definite' (the X) or 'indefinite' (a X)."

**Ralph:**  
> A datatype property that denotes whether a linguistic referent has definite or indefinite determination.

### [PASS] quantity (`tagteam:quantity`)

**Original Definition:**  
"The numeric quantity of entities referred to (e.g., 2 for 'two patients')."

**Ralph:**  
> A datatype property that denotes the numeric value indicating how many entities are being referenced.

### [PASS] quantity indicator (`tagteam:quantityIndicator`)

**Original Definition:**  
"The linguistic marker indicating quantity (e.g., 'two', 'several', 'the last')."

**Ralph:**  
> A linguistic marker that denotes the amount or number of entities being referenced.

### [PASS] qualifiers (`tagteam:qualifiers`)

**Original Definition:**  
"Adjective or adverbial qualifiers associated with an entity (e.g., 'critically ill')."

**Ralph:**  
> A datatype property that denotes adjective or adverbial modifiers associated with an entity.

### [PASS] role type (`tagteam:roleType`)

**Original Definition:**  
"The semantic role type (e.g., 'agent', 'patient', 'theme', 'beneficiary')."

**Ralph:**  
> A datatype property that denotes the semantic function performed by a participant in a linguistic or conceptual relation.

### [PASS] verb (`tagteam:verb`)

**Original Definition:**  
"The infinitive form of the verb in a verb phrase or act."

**Ralph:**  
> A datatype property that denotes the infinitive form of an action word within a linguistic act or expression.

### [PASS] lemma (`tagteam:lemma`)

**Original Definition:**  
"The base/dictionary form of a word."

**Ralph:**  
> A datatype property that denotes the canonical or dictionary form of a lexical item from which inflected variants are derived.

### [PASS] tense (`tagteam:tense`)

**Original Definition:**  
"The grammatical tense of a verb (e.g., 'past', 'present', 'future')."

**Ralph:**  
> A datatype property that denotes the temporal relationship between the time of an action or state and the time of speaking or reference point in a grammatical expression.

### [PASS] aspect (`tagteam:aspect`)

**Original Definition:**  
"The grammatical aspect of a verb (e.g., 'simple', 'progressive', 'perfect')."

**Ralph:**  
> A datatype property that denotes the temporal structure or completion status of a verbal action or state.

### [PASS] negated (`tagteam:negated`)

**Original Definition:**  
"Whether the verb phrase or act is negated."

**Ralph:**  
> A datatype property that denotes whether a linguistic expression or action has opposite or contrary meaning to its positive form.

### [PASS] negation marker (`tagteam:negationMarker`)

**Original Definition:**  
"The linguistic marker of negation (e.g., 'not', 'never')."

**Ralph:**  
> A datatype property that denotes linguistic elements which indicate the absence or contradiction of a stated condition.

### [PASS] has modal marker (`tagteam:hasModalMarker`)

**Original Definition:**  
"Whether the verb phrase contains a modal verb."

**Ralph:**  
> A datatype property that denotes whether a linguistic expression contains an auxiliary verb indicating possibility, necessity, or obligation.

### [PASS] modality (`tagteam:modality`)

**Original Definition:**  
"The deontic modality type: 'obligation', 'permission', 'prohibition', 'recommendation', 'intention', or 'hypothetical'."

**Ralph:**  
> A datatype property that denotes the deontic status of a statement as obligation, permission, prohibition, recommendation, intention, or hypothetical.

### [PASS] modal type (`tagteam:modalType`)

**Original Definition:**  
"The type of modal expression (e.g., 'deontic', 'epistemic', 'dynamic')."

**Ralph:**  
> A datatype property that denotes the category of necessity, possibility, or obligation expressed by a linguistic construction.

### [PASS] modal marker (`tagteam:modalMarker`)

**Original Definition:**  
"The linguistic marker of modality (e.g., 'must', 'should', 'may')."

**Ralph:**  
> A datatype property that denotes linguistic expressions indicating modality such as necessity, possibility, or obligation.

### [PASS] modal strength (`tagteam:modalStrength`)

**Original Definition:**  
"The strength of the modal expression [0.0-1.0], where 1.0 is strongest obligation/prohibition."

**Ralph:**  
> A datatype property that denotes the degree of deontic force expressed by an obligation or prohibition on a scale from 0.0 to 1.0, where 1.0 indicates the highest degree of binding force.

### [PASS] is scarce (`tagteam:is_scarce`)

**Original Definition:**  
"Whether an entity is marked as scarce based on linguistic markers."

**Ralph:**  
> A datatype property that denotes whether an entity has limited availability or insufficient quantity based on linguistic markers.

### [PASS] scarcity marker (`tagteam:scarcity_marker`)

**Original Definition:**  
"The linguistic marker indicating scarcity (e.g., 'the last', 'only')."

**Ralph:**  
> A linguistic expression that denotes the limited availability or restricted quantity of some entity.

### [PASS] scarcity marker (`tagteam:scarcityMarker`)

**Original Definition:**  
"Alternative property name for scarcity_marker."

**Ralph:**  
> A datatype property that denotes the degree of rarity or limited availability of some entity within a specified context.

### [PASS] supply count (`tagteam:supplyCount`)

**Original Definition:**  
"The number of available units of a scarce resource."

**Ralph:**  
> A quantity that denotes the number of available units of a scarce resource at a specific time.

### [PASS] demand count (`tagteam:demandCount`)

**Original Definition:**  
"The number of parties requiring the scarce resource."

**Ralph:**  
> A non-negative integer that denotes the number of parties requiring a particular scarce resource in a specific context.

### [PASS] scarcity ratio (`tagteam:scarcityRatio`)

**Original Definition:**  
"The ratio of supply to demand for a scarce resource."

**Ralph:**  
> A measurement datum that denotes the quotient of available supply to demand for a resource when that resource is limited in availability.

### [PASS] qualifier text (`tagteam:qualifierText`)

**Original Definition:**  
"The text of a qualifier (e.g., 'critically ill', 'elderly')."

**Ralph:**  
> A textual information content entity that denotes a modifying characteristic or condition that specifies or limits the meaning of another entity.

### [PASS] severity (`tagteam:severity`)

**Original Definition:**  
"The severity level of a condition (e.g., 'critical', 'severe', 'mild')."

**Ralph:**  
> A datatype property that denotes the degree of intensity or seriousness of a medical condition or symptom.

### [PASS] age category (`tagteam:ageCategory`)

**Original Definition:**  
"The age category of a person (e.g., 'elderly', 'pediatric', 'adult')."

**Ralph:**  
> A datatype property that denotes the life stage classification of a person based on their chronological maturity.

### [PASS] member count (`tagteam:member_count`)

**Original Definition:**  
"The number of members in an object aggregate."

**Ralph:**  
> A datatype property that denotes the quantity of constituent entities within an object aggregate.

### [PASS] member index (`tagteam:member_index`)

**Original Definition:**  
"The index (1-based) of a member within an object aggregate."

**Ralph:**  
> A datatype property that denotes the ordinal position of a constituent within an object aggregate using one-based numbering.

### [PASS] value name (`tagteam:valueName`)

**Original Definition:**  
"The name of the ethical value detected (e.g., 'autonomy', 'beneficence', 'justice')."

**Ralph:**  
> A datatype property that denotes the textual identifier of an ethical principle or standard such as autonomy, beneficence, or justice.

### [PASS] value category (`tagteam:valueCategory`)

**Original Definition:**  
"The category of the ethical value (e.g., 'ethical', 'legal', 'social')."

**Ralph:**  
> A datatype property that denotes the classificatory domain to which an ethical principle belongs, such as ethical, legal, or social domains.

### [PASS] dimension (`tagteam:dimension`)

**Original Definition:**  
"The context dimension being assessed (e.g., 'temporal.urgency', 'stakeholder.vulnerability')."

**Ralph:**  
> A datatype property that specifies the contextual aspect being evaluated in an assessment framework.

### [PASS] category (`tagteam:category`)

**Original Definition:**  
"A category classification for context dimensions."

**Ralph:**  
> A datatype property that assigns classificatory labels to context dimensions.

### [PASS] score (`tagteam:score`)

**Original Definition:**  
"A numeric score [0.0-1.0] for a context dimension assessment."

**Ralph:**  
> A numeric value between 0.0 and 1.0 that quantifies the degree of assessment for a context dimension.

### [PASS] polarity (`tagteam:polarity`)

**Original Definition:**  
"The polarity of a value detection: positive (1), negative (-1), or neutral (0)."

**Ralph:**  
> A datatype property that denotes whether a value has a positive, negative, or neutral orientation as indicated by the numerical values 1, -1, or 0 respectively.

### [PASS] salience (`tagteam:salience`)

**Original Definition:**  
"The salience or prominence [0.0-1.0] of a detected value in the text."

**Ralph:**  
> A datatype property that denotes the degree of prominence of a textual value on a scale from 0.0 to 1.0.

### [PASS] evidence (`tagteam:evidence`)

**Original Definition:**  
"The textual evidence supporting an assertion."

**Ralph:**  
> A textual information content entity that denotes facts or observations which support the truth or validity of an assertion.

### [PASS] evidence text (`tagteam:evidenceText`)

**Original Definition:**  
"Alternative property name for evidence."

**Ralph:**  
> A datatype property that denotes textual content serving as support or proof for a claim or conclusion.

### [PASS] source span (`tagteam:sourceSpan`)

**Original Definition:**  
"The text span from which evidence was extracted."

**Ralph:**  
> A datatype property that denotes the textual boundaries within a document from which supporting evidence originates.

### [PASS] matched markers (`tagteam:matched_markers`)

**Original Definition:**  
"The linguistic markers that were matched in value/context detection."

**Ralph:**  
> A datatype property that denotes linguistic elements that correspond to specific patterns within textual content.

### [PASS] detection method (`tagteam:detection_method`)

**Original Definition:**  
"The method used for detection (e.g., 'pattern_matching', 'ml_classification')."

**Ralph:**  
> A datatype property that denotes the specific technique or approach employed to identify the presence or occurrence of a particular entity or phenomenon.

### [PASS] version (`tagteam:version`)

**Original Definition:**  
"The version string of the parser or ontology."

**Ralph:**  
> A datatype property that denotes an alphanumeric identifier indicating the release or iteration number of a software tool or knowledge organization system.

### [PASS] algorithm (`tagteam:algorithm`)

**Original Definition:**  
"A description of the algorithm used by the parser."

**Ralph:**  
> An information content entity that denotes a systematic procedure for solving a computational problem or performing a specific task.

### [PASS] capabilities (`tagteam:capabilities`)

**Original Definition:**  
"A list of capabilities of the parser agent."

**Ralph:**  
> A datatype property that denotes the functional abilities possessed by a parser agent.

### [PASS] framework (`tagteam:framework`)

**Original Definition:**  
"The ethical or interpretive framework associated with a context (e.g., 'Principlism (Beauchamp & Childress)')."

**Ralph:**  
> A datatype property that denotes the ethical or interpretive approach associated with a particular context.

### [PASS] budget usage (`tagteam:budgetUsage`)

**Original Definition:**  
"A record of complexity budget usage during graph construction."

**Ralph:**  
> A datatype property that denotes the amount of computational resources consumed during graph construction processes.

### [PASS] truncated (`tagteam:truncated`)

**Original Definition:**  
"Whether the graph was truncated due to budget constraints."

**Ralph:**  
> A datatype property that denotes whether a graph was cut short due to budget constraints.

### [PASS] budget warnings (`tagteam:budgetWarnings`)

**Original Definition:**  
"Warning messages generated during complexity budget tracking."

**Ralph:**  
> A datatype property that denotes alert messages produced during computational complexity resource allocation monitoring.
