/**
 * BinaryModelLoader.js — Binary Model File Loader
 *
 * Source: TagTeam-Major-Refactor-v2.2.md §20
 * Authority: Custom binary format specification
 *
 * Loads TagTeam binary model files (.bin) with format:
 *   Fixed Header (64 bytes):
 *     bytes 0-3:    Magic "TT01" (0x54 0x54 0x30 0x31)
 *     bytes 4-5:    Header version major/minor (currently 1.0)
 *     byte  6:      Endianness flag (0x00 = little-endian, REQUIRED)
 *     byte  7:      Model type (0x01 = POS, 0x02 = dependency parser)
 *     bytes 8-11:   Feature count (uint32 LE)
 *     bytes 12-15:  Class/transition count (uint32 LE)
 *     bytes 16-19:  Reserved (uint32 LE)
 *     bytes 20-23:  Metadata JSON block length (uint32 LE)
 *     bytes 24-27:  Feature index length (uint32 LE)
 *     bytes 28-31:  Weight matrix length (uint32 LE)
 *     bytes 32-63:  SHA-256 checksum of bytes after header
 *
 * NOTE: Full loading and checksum validation tested in Phase 4 (AC-4.13, AC-4.14).
 * This module provides the format specification and checksum verification utility.
 */

'use strict';

const MAGIC = 'TT01';
const HEADER_SIZE = 64;
const SUPPORTED_MAJOR = 1;
const SUPPORTED_MINOR_MIN = 0;
const SUPPORTED_MINOR_MAX = 1;

class ModelLoadError extends Error {
  constructor(message, reason) {
    super(message);
    this.name = 'ModelLoadError';
    this.reason = reason;
  }
}

class BinaryModelLoader {
  /**
   * Verify the SHA-256 checksum of a binary model buffer.
   *
   * @param {Buffer} buf - Binary model file contents
   * @returns {boolean} true if checksum matches
   */
  static verifyChecksum(buf) {
    if (buf.length < HEADER_SIZE) return false;

    // Magic check
    if (buf.slice(0, 4).toString('ascii') !== MAGIC) return false;

    // Extract stored checksum (bytes 32-63)
    const storedChecksum = buf.slice(32, 64);

    // Compute checksum of payload (everything after header)
    const payload = buf.slice(HEADER_SIZE);

    try {
      const crypto = require('crypto');
      const computed = crypto.createHash('sha256').update(payload).digest();
      return storedChecksum.equals(computed);
    } catch (e) {
      // crypto not available (browser without polyfill)
      return false;
    }
  }

  /**
   * Parse a binary model buffer into a model object.
   * NOTE: Full implementation deferred to Phase 4 (AC-4.13).
   *
   * @param {Buffer} buf - Binary model file contents
   * @returns {Object} Model object compatible with DependencyParser/PerceptronTagger
   */
  static load(buf) {
    if (buf.length < HEADER_SIZE) {
      throw new ModelLoadError('BinaryModelLoader: file too small', 'invalid_format');
    }

    // Verify magic
    if (buf.slice(0, 4).toString('ascii') !== MAGIC) {
      throw new ModelLoadError('BinaryModelLoader: invalid magic number', 'invalid_format');
    }

    // Read header fields
    const versionMajor = buf[4];
    const versionMinor = buf[5];
    const endianness = buf[6]; // 0x00 = little-endian
    const modelType = buf[7];  // 0x01 = POS, 0x02 = dep
    const featureCount = buf.readUInt32LE(8);
    const classCount = buf.readUInt32LE(12);
    const reserved = buf.readUInt32LE(16);
    const metadataLen = buf.readUInt32LE(20);
    const featureIndexLen = buf.readUInt32LE(24);
    const weightMatrixLen = buf.readUInt32LE(28);

    // Version check (AC-4.14b)
    if (versionMajor !== SUPPORTED_MAJOR ||
        versionMinor < SUPPORTED_MINOR_MIN ||
        versionMinor > SUPPORTED_MINOR_MAX) {
      throw new ModelLoadError(
        `BinaryModelLoader: unsupported version ${versionMajor}.${versionMinor} ` +
        `(expected ${SUPPORTED_MAJOR}.${SUPPORTED_MINOR_MIN}-${SUPPORTED_MAJOR}.${SUPPORTED_MINOR_MAX})`,
        'version_incompatible'
      );
    }

    // Verify checksum (AC-4.14)
    if (!this.verifyChecksum(buf)) {
      throw new ModelLoadError('BinaryModelLoader: SHA-256 checksum mismatch', 'checksum_mismatch');
    }

    // Parse metadata JSON
    let offset = HEADER_SIZE;
    const metadataJson = buf.slice(offset, offset + metadataLen).toString('utf8');
    const metadata = JSON.parse(metadataJson);
    offset += metadataLen;

    // Parse feature index (null-terminated strings)
    const featureIndexBuf = buf.slice(offset, offset + featureIndexLen);
    const features = featureIndexBuf.toString('utf8').split('\0').filter(s => s.length > 0);
    offset += featureIndexLen;

    // Parse weight data
    const classes = metadata.classes || metadata.transitions || [];
    const weights = {};

    if (versionMinor >= 1) {
      // v1.1 sparse format: for each feature, uint16 count + count × (uint16 col, float32 weight)
      const weightBuf = buf.slice(offset, offset + weightMatrixLen);
      let wOff = 0;
      for (let i = 0; i < features.length; i++) {
        const count = weightBuf.readUInt16LE(wOff);
        wOff += 2;
        if (count > 0) {
          const row = {};
          for (let j = 0; j < count; j++) {
            const colIdx = weightBuf.readUInt16LE(wOff);
            wOff += 2;
            const w = weightBuf.readFloatLE(wOff);
            wOff += 4;
            row[classes[colIdx]] = w;
          }
          weights[features[i]] = row;
        }
      }
    } else {
      // v1.0 dense format: Float32Array, row-major, feature_count × class_count
      const weightBuf = buf.slice(offset, offset + weightMatrixLen);
      const weightArray = new Float32Array(weightBuf.buffer, weightBuf.byteOffset, featureCount * classCount);
      for (let i = 0; i < features.length; i++) {
        const row = {};
        let hasNonZero = false;
        for (let j = 0; j < classCount; j++) {
          const w = weightArray[i * classCount + j];
          if (w !== 0) {
            row[classes[j]] = w;
            hasNonZero = true;
          }
        }
        if (hasNonZero) {
          weights[features[i]] = row;
        }
      }
    }

    return {
      version: `${versionMajor}.${versionMinor}`,
      modelType: modelType === 0x01 ? 'pos' : modelType === 0x02 ? 'dep' : 'unknown',
      weights,
      ...metadata,
      provenance: metadata.provenance || {}
    };
  }
}

// Constants and classes exposed for testing
BinaryModelLoader.MAGIC = MAGIC;
BinaryModelLoader.HEADER_SIZE = HEADER_SIZE;
BinaryModelLoader.ModelLoadError = ModelLoadError;

// Export for Node.js / CommonJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BinaryModelLoader;
}
// Export for browser
if (typeof window !== 'undefined') {
  window.BinaryModelLoader = BinaryModelLoader;
}
