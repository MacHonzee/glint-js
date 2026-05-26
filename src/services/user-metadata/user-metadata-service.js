import {
  mergeMetadataPatch,
  findImmutableTopLevelKeyViolation,
  isFilledMetadataValue,
  pickMetadataPatch,
} from "../../utils/metadata-patch.js";

/**
 * Encapsulates helpers for `user.metadata`: deep merge, immutability checks, and
 * allow-list patch building. Used with {@link UserRoute#updateMetadata},
 * {@link UserRoute#getMetadataUpdatePolicy}, and custom endpoints.
 *
 * All methods are pure (no instance state); the class groups the public surface.
 */
export default class UserMetadataService {
  /**
   * Deep-merge a patch into metadata. Explicit `null` at a leaf removes that key.
   * @param {object|null|undefined} base
   * @param {object|null|undefined} patch
   * @returns {object}
   */
  static mergeMetadataPatch(base, patch) {
    return mergeMetadataPatch(base, patch);
  }

  /**
   * @param {*} value
   * @returns {boolean} Whether the value counts as filled for immutability (first write allowed when empty).
   */
  static isFilledMetadataValue(value) {
    return isFilledMetadataValue(value);
  }

  /**
   * @param {object} existingMetadata
   * @param {object} patch
   * @param {string[]} immutableTopLevelKeys
   * @returns {string|null} First offending immutable key, or null.
   */
  static findImmutableTopLevelKeyViolation(existingMetadata, patch, immutableTopLevelKeys) {
    return findImmutableTopLevelKeyViolation(existingMetadata, patch, immutableTopLevelKeys);
  }

  /**
   * @param {object} existingMetadata
   * @param {object} rawPatch
   * @param {{ allowedKeys: string[], immutableTopLevelKeys?: string[] }} options
   * @returns {{ patch: object, strippedKeys: string[] }}
   */
  static pickMetadataPatch(existingMetadata, rawPatch, options) {
    return pickMetadataPatch(existingMetadata, rawPatch, options);
  }
}
