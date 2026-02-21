/**
 * @file src/ontology/TurtleParser.js
 * @description Phase 6.5.1 - Lightweight Turtle/TTL Parser
 *
 * Parses Turtle (TTL) ontology files for TagTeam. This is NOT a full RDF parser -
 * it's a lightweight implementation focused on extracting:
 * - Prefix declarations
 * - Class declarations (rdf:type)
 * - Labels (rdfs:label)
 * - Keywords and terms (vn:keywords, vn:upholdingTerms, etc.)
 * - Relationships (owl:sameAs, ethics:conflictsWith, etc.)
 *
 * Supported Constructs:
 * - @prefix and PREFIX declarations
 * - @base declaration
 * - Basic triples (subject predicate object)
 * - rdf:type shortcut (a)
 * - String literals with quotes
 * - Language tags (@en, @fr)
 * - Datatype annotations (^^xsd:integer)
 * - Semicolon-separated predicate lists
 * - Comma-separated object lists
 *
 * NOT Supported:
 * - Blank nodes (complex structures)
 * - Full OWL reasoning
 * - SPARQL queries
 * - RDF/XML format
 *
 * @example
 * const parser = new TurtleParser();
 * const result = parser.parse(ttlContent);
 * const labels = result.getLabels();
 * const valueDef = result.toValueDefinition('vn:SecurityDisposition');
 */

// Common prefixes that are auto-recognized
const COMMON_PREFIXES = {
  'rdf': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
  'rdfs': 'http://www.w3.org/2000/01/rdf-schema#',
  'owl': 'http://www.w3.org/2002/07/owl#',
  'xsd': 'http://www.w3.org/2001/XMLSchema#',
  'bfo': 'http://purl.obolibrary.org/obo/BFO_',
  'obo': 'http://purl.obolibrary.org/obo/',
  'cco': 'https://www.commoncoreontologies.org/',
  'tagteam': 'http://purl.org/tagteam#'
};

/**
 * Result object returned by TurtleParser.parse()
 */
class ParseResult {
  constructor() {
    this.prefixes = { ...COMMON_PREFIXES };
    this.base = null;
    this.triples = [];
    this.errors = [];
    this._labelCache = null;
    this._subjectCache = null;
  }

  /**
   * Resolve a prefixed IRI to full IRI
   * @param {string} iri - Prefixed or full IRI
   * @returns {string} Full IRI
   */
  resolveIRI(iri) {
    if (!iri) return iri;

    // Already a full IRI
    if (iri.startsWith('http://') || iri.startsWith('https://')) {
      return iri;
    }

    // Prefixed IRI (e.g., "ex:Thing")
    if (iri.includes(':')) {
      const [prefix, localName] = iri.split(':', 2);
      const namespace = this.prefixes[prefix];
      if (namespace) {
        return namespace + localName;
      }
    }

    // Relative IRI - resolve against base
    if (this.base) {
      return this.base + iri;
    }

    return iri;
  }

  /**
   * Get prefixed form of a full IRI
   * @param {string} fullIRI - Full IRI
   * @returns {string} Prefixed form or original
   */
  getPrefixedForm(fullIRI) {
    if (!fullIRI || !fullIRI.startsWith('http')) {
      return fullIRI;
    }

    for (const [prefix, namespace] of Object.entries(this.prefixes)) {
      if (fullIRI.startsWith(namespace)) {
        const localName = fullIRI.substring(namespace.length);
        return prefix ? `${prefix}:${localName}` : `:${localName}`;
      }
    }

    return fullIRI;
  }

  /**
   * Get all unique subjects
   * @returns {Array<string>} Array of subject IRIs
   */
  getSubjects() {
    if (!this._subjectCache) {
      this._subjectCache = [...new Set(this.triples.map(t => t.subject))];
    }
    return this._subjectCache;
  }

  /**
   * Get all unique predicates
   * @returns {Array<string>} Array of predicate IRIs
   */
  getPredicates() {
    return [...new Set(this.triples.map(t => t.predicate))];
  }

  /**
   * Get triples for a specific subject
   * @param {string} subject - Subject IRI
   * @returns {Array} Triples with that subject
   */
  getTriplesForSubject(subject) {
    return this.triples.filter(t => t.subject === subject);
  }

  /**
   * Get all class declarations (rdf:type triples)
   * @returns {Array} Class declarations with id and type
   */
  getClasses() {
    return this.triples
      .filter(t => t.predicate === 'rdf:type' || t.predicate === 'a')
      .map(t => ({
        id: t.subject,
        type: t.object
      }));
  }

  /**
   * Get the rdf:type for a subject
   * @param {string} subject - Subject IRI
   * @returns {string|null} Type IRI
   */
  getType(subject) {
    const typeTriple = this.triples.find(
      t => t.subject === subject && (t.predicate === 'rdf:type' || t.predicate === 'a')
    );
    return typeTriple ? typeTriple.object : null;
  }

  /**
   * Get all labels (rdfs:label triples)
   * @returns {Object} Map of subject -> label
   */
  getLabels() {
    if (!this._labelCache) {
      this._labelCache = {};
      for (const triple of this.triples) {
        if (triple.predicate === 'rdfs:label') {
          this._labelCache[triple.subject] = triple.object;
        }
      }
    }
    return this._labelCache;
  }

  /**
   * Get a specific property value for a subject
   * @param {string} subject - Subject IRI
   * @param {string} predicate - Predicate IRI
   * @returns {string|null} Object value
   */
  getProperty(subject, predicate) {
    const triple = this.triples.find(
      t => t.subject === subject && t.predicate === predicate
    );
    return triple ? triple.object : null;
  }

  /**
   * Get keywords for a subject (splits comma-separated values)
   * @param {string} subject - Subject IRI
   * @returns {Array<string>} Array of keywords
   */
  getKeywords(subject) {
    // Try common keyword predicates
    const predicates = ['vn:keywords', 'ethics:keywords', 'tagteam:keywords'];

    for (const pred of predicates) {
      const value = this.getProperty(subject, pred);
      if (value) {
        return value.split(',').map(k => k.trim()).filter(k => k);
      }
    }

    return [];
  }

  /**
   * Get relationships of a specific type
   * @param {string} predicate - Relationship predicate
   * @returns {Array} Relationship triples
   */
  getRelationships(predicate) {
    return this.triples.filter(t => t.predicate === predicate);
  }

  /**
   * Get all relationships for a subject
   * @param {string} subject - Subject IRI
   * @returns {Array} Relationship triples
   */
  getRelationshipsForSubject(subject) {
    const relationPredicates = ['owl:sameAs', 'ethics:conflictsWith', 'ethics:relatedTo', 'ethics:opposedTo'];
    return this.triples.filter(
      t => t.subject === subject && relationPredicates.some(p => t.predicate === p || t.predicate.includes(p.split(':')[1]))
    );
  }

  /**
   * Get all unique relationship types used
   * @returns {Array<string>} Relationship predicates
   */
  getRelationshipTypes() {
    const relationPredicates = ['owl:sameAs', 'ethics:conflictsWith', 'ethics:relatedTo', 'ethics:opposedTo'];
    return this.getPredicates().filter(p =>
      relationPredicates.some(rp => p === rp || p.includes(rp.split(':')[1]))
    );
  }

  /**
   * Get conflicts for a subject
   * @param {string} subject - Subject IRI
   * @returns {Array<string>} Conflicting subject IRIs
   */
  getConflicts(subject) {
    return this.triples
      .filter(t => t.subject === subject && t.predicate.includes('conflictsWith'))
      .map(t => t.object);
  }

  /**
   * Convert a subject to TagTeam value definition format
   * @param {string} subject - Subject IRI
   * @returns {Object} Value definition
   */
  toValueDefinition(subject) {
    const triples = this.getTriplesForSubject(subject);
    if (triples.length === 0) return null;

    // Extract local name
    const name = subject.includes(':')
      ? subject.split(':').pop()
      : subject.split('/').pop().split('#').pop();

    const def = {
      id: subject,
      iri: this.resolveIRI(subject),
      name: name,
      label: this.getProperty(subject, 'rdfs:label') || name,
      type: this.getType(subject),
      keywords: this.getKeywords(subject)
    };

    // Add upholding terms if present
    const upholdingTerms = this.getProperty(subject, 'vn:upholdingTerms');
    if (upholdingTerms) {
      def.upholdingTerms = upholdingTerms.split(',').map(t => t.trim()).filter(t => t);
    }

    // Add violating terms if present
    const violatingTerms = this.getProperty(subject, 'vn:violatingTerms');
    if (violatingTerms) {
      def.violatingTerms = violatingTerms.split(',').map(t => t.trim()).filter(t => t);
    }

    // Add comment/description if present
    const comment = this.getProperty(subject, 'rdfs:comment');
    if (comment) {
      def.description = comment;
    }

    return def;
  }

  /**
   * Get all value definitions (subjects with rdf:type)
   * @returns {Array} Array of value definitions
   */
  getAllValueDefinitions() {
    const classes = this.getClasses();
    return classes
      .map(c => this.toValueDefinition(c.id))
      .filter(d => d !== null);
  }

  /**
   * Convert to JSON-serializable object
   * @returns {Object} Serializable representation
   */
  toJSON() {
    return {
      prefixes: this.prefixes,
      base: this.base,
      triples: this.triples,
      errors: this.errors
    };
  }
}

/**
 * Lightweight Turtle Parser
 */
class TurtleParser {
  constructor(options = {}) {
    this.options = {
      strict: options.strict || false,
      ...options
    };
    // Expose prefixes on parser instance (for test BP-001)
    this.prefixes = { ...COMMON_PREFIXES };
  }

  /**
   * Parse Turtle/TTL content
   * @param {string} ttl - Turtle content
   * @returns {ParseResult} Parse result with triples and metadata
   */
  parse(ttl) {
    const result = new ParseResult();

    if (!ttl || typeof ttl !== 'string') {
      return result;
    }

    // Normalize line endings
    let content = ttl.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Remove comments (but preserve strings)
    content = this._removeComments(content);

    // Parse prefixes first
    this._parsePrefixes(content, result);

    // Parse base
    this._parseBase(content, result);

    // Parse triples
    this._parseTriples(content, result);

    return result;
  }

  /**
   * Remove comments while preserving string literals and IRIs
   * @private
   */
  _removeComments(content) {
    const lines = content.split('\n');
    const result = [];

    for (let line of lines) {
      // Find # that's not inside a string or IRI
      let inString = false;
      let stringChar = null;
      let inIRI = false;
      let cleanLine = '';

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const prevChar = i > 0 ? line[i - 1] : '';

        // Track IRI state (# inside <...> is not a comment)
        if (!inString && char === '<') {
          inIRI = true;
        } else if (!inString && char === '>' && inIRI) {
          inIRI = false;
        }

        if (!inString && !inIRI && (char === '"' || char === "'")) {
          // Check for triple quotes
          if (line.substring(i, i + 3) === '"""' || line.substring(i, i + 3) === "'''") {
            inString = true;
            stringChar = line.substring(i, i + 3);
            cleanLine += stringChar;
            i += 2;
            continue;
          }
          inString = true;
          stringChar = char;
        } else if (inString) {
          if (stringChar.length === 3) {
            if (line.substring(i, i + 3) === stringChar && prevChar !== '\\') {
              inString = false;
              cleanLine += stringChar;
              i += 2;
              continue;
            }
          } else if (char === stringChar && prevChar !== '\\') {
            inString = false;
          }
        } else if (!inIRI && char === '#') {
          // Rest of line is comment (only if not in IRI or string)
          break;
        }

        cleanLine += char;
      }

      result.push(cleanLine);
    }

    return result.join('\n');
  }

  /**
   * Parse @prefix and PREFIX declarations
   * @private
   */
  _parsePrefixes(content, result) {
    // @prefix pattern: @prefix prefix: <uri> .
    const prefixPattern = /@prefix\s+(\w*)\s*:\s*<([^>]+)>\s*\./gi;
    let match;

    while ((match = prefixPattern.exec(content)) !== null) {
      const prefix = match[1];
      const uri = match[2];
      result.prefixes[prefix] = uri;
    }

    // PREFIX pattern (SPARQL-style): PREFIX prefix: <uri>
    const sparqlPrefixPattern = /PREFIX\s+(\w*)\s*:\s*<([^>]+)>/gi;

    while ((match = sparqlPrefixPattern.exec(content)) !== null) {
      const prefix = match[1];
      const uri = match[2];
      result.prefixes[prefix] = uri;
    }
  }

  /**
   * Parse @base declaration
   * @private
   */
  _parseBase(content, result) {
    const basePattern = /@base\s*<([^>]+)>\s*\./i;
    const match = content.match(basePattern);
    if (match) {
      result.base = match[1];
    }
  }

  /**
   * Parse triples from content
   * @private
   */
  _parseTriples(content, result) {
    // Remove prefix declarations for cleaner triple parsing
    let tripleContent = content
      .replace(/@prefix\s+\w*\s*:\s*<[^>]+>\s*\./gi, '')
      .replace(/PREFIX\s+\w*\s*:\s*<[^>]+>/gi, '')
      .replace(/@base\s*<[^>]+>\s*\./gi, '');

    // Split into statements (separated by .)
    // But be careful about . inside strings and IRIs
    const statements = this._splitStatements(tripleContent);

    for (const statement of statements) {
      const trimmed = statement.trim();
      if (!trimmed) continue;

      try {
        this._parseStatement(trimmed, result);
      } catch (e) {
        result.errors.push({
          message: e.message,
          statement: trimmed.substring(0, 100)
        });
      }
    }
  }

  /**
   * Split content into statements
   * @private
   */
  _splitStatements(content) {
    const statements = [];
    let current = '';
    let inString = false;
    let stringDelim = null;
    let inIRI = false;

    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      const prevChar = i > 0 ? content[i - 1] : '';

      // Track IRI state
      if (!inString && char === '<') {
        inIRI = true;
      } else if (!inString && char === '>' && inIRI) {
        inIRI = false;
      }

      // Track string state
      if (!inIRI && !inString && (char === '"' || char === "'")) {
        if (content.substring(i, i + 3) === '"""' || content.substring(i, i + 3) === "'''") {
          inString = true;
          stringDelim = content.substring(i, i + 3);
          current += stringDelim;
          i += 2;
          continue;
        }
        inString = true;
        stringDelim = char;
      } else if (inString) {
        if (stringDelim.length === 3) {
          if (content.substring(i, i + 3) === stringDelim && prevChar !== '\\') {
            inString = false;
            current += stringDelim;
            i += 2;
            continue;
          }
        } else if (char === stringDelim && prevChar !== '\\') {
          inString = false;
        }
      }

      // Check for statement end
      if (!inString && !inIRI && char === '.') {
        // Make sure it's not a decimal point
        const nextChar = i < content.length - 1 ? content[i + 1] : '';
        if (!/\d/.test(nextChar)) {
          statements.push(current);
          current = '';
          continue;
        }
      }

      current += char;
    }

    if (current.trim()) {
      statements.push(current);
    }

    return statements;
  }

  /**
   * Parse a single statement into triples
   * @private
   */
  _parseStatement(statement, result) {
    // Tokenize the statement
    const tokens = this._tokenize(statement);
    if (tokens.length < 3) return;

    // First token is subject
    const subject = this._normalizeIRI(tokens[0]);
    let currentSubject = subject;
    let currentPredicate = null;

    let i = 1;
    while (i < tokens.length) {
      const token = tokens[i];

      if (token === ';') {
        // New predicate for same subject
        currentPredicate = null;
        i++;
        continue;
      }

      if (token === ',') {
        // New object for same predicate
        i++;
        continue;
      }

      if (currentPredicate === null) {
        // This token is a predicate
        currentPredicate = token === 'a' ? 'rdf:type' : this._normalizeIRI(token);
        i++;
        continue;
      }

      // This token is an object
      const objectInfo = this._parseObject(tokens, i);

      result.triples.push({
        subject: currentSubject,
        predicate: currentPredicate,
        object: objectInfo.value,
        objectType: objectInfo.type,
        language: objectInfo.language,
        datatype: objectInfo.datatype
      });

      i = objectInfo.nextIndex;
    }
  }

  /**
   * Tokenize a statement
   * @private
   */
  _tokenize(statement) {
    const tokens = [];
    let current = '';
    let inString = false;
    let stringDelim = null;
    let inIRI = false;

    for (let i = 0; i < statement.length; i++) {
      const char = statement[i];
      const prevChar = i > 0 ? statement[i - 1] : '';

      // Handle IRI
      if (!inString && char === '<') {
        if (current.trim()) tokens.push(current.trim());
        current = '<';
        inIRI = true;
        continue;
      }

      if (inIRI && char === '>') {
        current += '>';
        tokens.push(current);
        current = '';
        inIRI = false;
        continue;
      }

      if (inIRI) {
        current += char;
        continue;
      }

      // Handle strings
      if (!inString && (char === '"' || char === "'")) {
        if (statement.substring(i, i + 3) === '"""' || statement.substring(i, i + 3) === "'''") {
          if (current.trim()) tokens.push(current.trim());
          stringDelim = statement.substring(i, i + 3);
          current = stringDelim;
          inString = true;
          i += 2;
          continue;
        }
        if (current.trim()) tokens.push(current.trim());
        stringDelim = char;
        current = char;
        inString = true;
        continue;
      }

      if (inString) {
        current += char;
        if (stringDelim.length === 3) {
          if (statement.substring(i - 2, i + 1) === stringDelim && statement[i - 3] !== '\\') {
            // End of triple-quoted string - check for language tag or datatype
            tokens.push(current);
            current = '';
            inString = false;
          }
        } else if (char === stringDelim && prevChar !== '\\') {
          // End of string - check for language tag or datatype
          tokens.push(current);
          current = '';
          inString = false;
        }
        continue;
      }

      // Handle language tags (@en, @fr) - must come right after string
      if (char === '@' && tokens.length > 0) {
        const lastToken = tokens[tokens.length - 1];
        if (lastToken && (lastToken.startsWith('"') || lastToken.startsWith("'"))) {
          // This is a language tag
          current = '@';
          continue;
        }
      }

      // Handle datatype (^^)
      if (char === '^' && statement[i + 1] === '^') {
        if (current.trim()) tokens.push(current.trim());
        tokens.push('^^');
        i++; // Skip the second ^
        current = '';
        continue;
      }

      // Handle separators
      if (char === ';' || char === ',') {
        if (current.trim()) tokens.push(current.trim());
        tokens.push(char);
        current = '';
        continue;
      }

      // Handle whitespace
      if (/\s/.test(char)) {
        if (current.trim()) tokens.push(current.trim());
        current = '';
        continue;
      }

      current += char;
    }

    if (current.trim()) {
      tokens.push(current.trim());
    }

    // Check for unterminated string
    if (inString) {
      throw new Error(`Unterminated string literal`);
    }

    return tokens;
  }

  /**
   * Normalize an IRI token
   * @private
   */
  _normalizeIRI(token) {
    if (!token) return token;

    // Full IRI in angle brackets
    if (token.startsWith('<') && token.endsWith('>')) {
      return token.slice(1, -1);
    }

    return token;
  }

  /**
   * Parse an object value with potential language tag or datatype
   * @private
   */
  _parseObject(tokens, startIndex) {
    let value = tokens[startIndex];
    let type = 'iri';
    let language = null;
    let datatype = null;
    let nextIndex = startIndex + 1;

    // Check if it's a literal
    if (value.startsWith('"') || value.startsWith("'")) {
      type = 'literal';

      // Remove quotes
      if (value.startsWith('"""') || value.startsWith("'''")) {
        value = value.slice(3, -3);
      } else {
        value = value.slice(1, -1);
      }

      // Unescape
      value = value.replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\\\\/g, '\\');

      // Check for language tag or datatype in subsequent tokens
      while (nextIndex < tokens.length) {
        const next = tokens[nextIndex];

        // Language tag (@en, @fr)
        if (next.startsWith('@') && !next.startsWith('@@') && next !== '@') {
          language = next.slice(1);
          nextIndex++;
          break;
        }

        // Datatype marker (^^)
        if (next === '^^') {
          nextIndex++;
          if (nextIndex < tokens.length) {
            datatype = tokens[nextIndex];
            if (datatype.startsWith('<')) {
              datatype = datatype.slice(1, -1);
            }
            nextIndex++;
          }
          break;
        }

        // Combined datatype (^^xsd:integer)
        if (next.startsWith('^^')) {
          datatype = next.slice(2);
          if (datatype.startsWith('<')) {
            datatype = datatype.slice(1, -1);
          }
          nextIndex++;
          break;
        }

        // Not a modifier, stop looking
        break;
      }
    } else if (/^-?\d+$/.test(value)) {
      // Integer
      type = 'literal';
    } else if (/^-?\d+\.\d+$/.test(value)) {
      // Decimal
      type = 'literal';
    } else if (value === 'true' || value === 'false') {
      // Boolean
      type = 'literal';
    } else {
      // IRI
      value = this._normalizeIRI(value);
    }

    return { value, type, language, datatype, nextIndex };
  }
}

// Export for both Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TurtleParser;
}
if (typeof window !== 'undefined') {
  window.TurtleParser = TurtleParser;
}
