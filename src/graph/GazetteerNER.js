'use strict';

/**
 * GazetteerNER — Named Entity Recognition via gazetteer lookup.
 *
 * Source: TagTeam-Major-Refactor-v2.2.md §8.5 (AC-1B)
 * Authority: BFO 2.0, CCO v1.5 entity types
 *
 * Match precedence (spec AC-1B.5):
 *   1. Exact raw match (canonical name)
 *   2. Alias raw match
 *   3. Exact normalized match (case-insensitive, abbreviation expansion)
 *   4. null (no match)
 */

// Common abbreviation expansions for normalization
const ABBREVIATIONS = {
  'dept': 'department',
  'dept.': 'department',
  'gov': 'government',
  'gov.': 'government',
  'govt': 'government',
  'govt.': 'government',
  'natl': 'national',
  'natl.': 'national',
  'intl': 'international',
  'intl.': 'international',
  'org': 'organization',
  'org.': 'organization',
  'assn': 'association',
  'assn.': 'association',
  'admin': 'administration',
  'admin.': 'administration',
  'sec': 'secretary',
  'sec.': 'secretary',
  'gen': 'general',
  'gen.': 'general',
  'sgt': 'sergeant',
  'sgt.': 'sergeant',
  'st': 'saint',
  'st.': 'saint',
  'mt': 'mount',
  'mt.': 'mount',
  'ft': 'fort',
  'ft.': 'fort',
};

class GazetteerNER {
  /**
   * @param {Array<Object>} gazetteers - Array of gazetteer JSON objects
   */
  constructor(gazetteers) {
    // Index: exact canonical name → { entry, canonicalName, gazetteerId, version }
    this._exactIndex = new Map();
    // Index: alias → { entry, canonicalName, gazetteerId, version }
    this._aliasIndex = new Map();
    // Index: normalized text → { entry, canonicalName, gazetteerId, version }
    this._normalizedIndex = new Map();

    for (const gaz of gazetteers) {
      this._buildIndex(gaz);
    }
  }

  /**
   * Look up a text string against all loaded gazetteers.
   * Returns match result or null.
   *
   * @param {string} text - The entity text to look up
   * @returns {{ type: string, canonicalName: string, matchType: string, gazetteerId: string, version: string } | null}
   */
  lookup(text) {
    if (!text) return null;

    // Precedence 1: Exact canonical name match
    const exactMatch = this._exactIndex.get(text);
    if (exactMatch) {
      return this._makeResult(exactMatch, 'exact');
    }

    // Precedence 2: Alias raw match
    const aliasMatch = this._aliasIndex.get(text);
    if (aliasMatch) {
      return this._makeResult(aliasMatch, 'alias');
    }

    // Precedence 3: Normalized match (case-insensitive + abbreviation expansion)
    const normalized = this._normalize(text);
    const normalizedMatch = this._normalizedIndex.get(normalized);
    if (normalizedMatch) {
      return this._makeResult(normalizedMatch, 'normalized');
    }

    return null;
  }

  /**
   * Build lookup indices from a single gazetteer file.
   * @param {Object} gazetteer
   */
  _buildIndex(gazetteer) {
    const meta = gazetteer._meta;
    const gazetteerId = meta.gazetteerId;
    const version = meta.version;

    for (const [name, entry] of Object.entries(gazetteer.entities)) {
      const record = { entry, canonicalName: name, gazetteerId, version };

      // Exact index (canonical name)
      if (!this._exactIndex.has(name)) {
        this._exactIndex.set(name, record);
      }

      // Normalized index (canonical name normalized)
      const normalizedName = this._normalize(name);
      if (!this._normalizedIndex.has(normalizedName)) {
        this._normalizedIndex.set(normalizedName, record);
      }

      // Alias index
      if (entry.aliases) {
        for (const alias of entry.aliases) {
          if (!this._aliasIndex.has(alias)) {
            this._aliasIndex.set(alias, record);
          }
          // Also add normalized aliases to normalized index
          const normalizedAlias = this._normalize(alias);
          if (!this._normalizedIndex.has(normalizedAlias)) {
            this._normalizedIndex.set(normalizedAlias, record);
          }
        }
      }
    }
  }

  /**
   * Normalize text for fuzzy matching:
   *   - Lowercase
   *   - Expand common abbreviations
   *   - Strip trailing periods
   *
   * @param {string} text
   * @returns {string}
   */
  _normalize(text) {
    // Lowercase
    let normalized = text.toLowerCase();

    // Expand abbreviations word by word
    const words = normalized.split(/\s+/);
    const expanded = words.map(w => {
      const key = w.replace(/\.$/, ''); // strip trailing period for lookup
      // Check both with and without period
      return ABBREVIATIONS[w] || ABBREVIATIONS[key] || w;
    });
    normalized = expanded.join(' ');

    // Strip remaining isolated periods (but not abbreviation periods like U.S.)
    normalized = normalized.replace(/\s*\.\s*$/, '');

    return normalized;
  }

  /**
   * Construct a result object from an index record.
   * @param {{ entry: Object, canonicalName: string, gazetteerId: string, version: string }} record
   * @param {string} matchType - 'exact' | 'alias' | 'normalized'
   * @returns {{ type: string, canonicalName: string, matchType: string, gazetteerId: string, version: string }}
   */
  _makeResult(record, matchType) {
    return {
      type: record.entry.type,
      canonicalName: record.canonicalName,
      matchType,
      gazetteerId: record.gazetteerId,
      version: record.version,
    };
  }
}

// Export for Node.js / CommonJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GazetteerNER;
}

// Export for browser
if (typeof window !== 'undefined') {
  window.GazetteerNER = GazetteerNER;
}
