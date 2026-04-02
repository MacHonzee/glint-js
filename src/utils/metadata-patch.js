import deepmerge from "deepmerge";

const metadataDeepmergeOptions = {
  arrayMerge: (_destinationArray, sourceArray) => sourceArray,
  isMergeableObject: (value) => isPlainObject(value),
};

/**
 * Deep-merge a patch into metadata. Explicit null at a leaf removes that key.
 * Arrays and non-plain objects are replaced, not merged.
 * @param {object|null|undefined} base
 * @param {object|null|undefined} patch
 * @returns {object}
 */
function mergeMetadataPatch(base, patch) {
  const result = clonePlainObject(base);
  if (patch == null || typeof patch !== "object" || Array.isArray(patch)) {
    return result;
  }

  const patchForDeepMerge = {};

  for (const [key, value] of Object.entries(patch)) {
    if (value === null) {
      delete result[key];
      continue;
    }
    if (isPlainObject(value) && isPlainObject(result[key]) && !Array.isArray(result[key])) {
      result[key] = mergeMetadataPatch(result[key], value);
      continue;
    }
    patchForDeepMerge[key] = value;
  }

  return Object.keys(patchForDeepMerge).length > 0
    ? deepmerge(result, patchForDeepMerge, metadataDeepmergeOptions)
    : result;
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function clonePlainObject(obj) {
  if (obj == null || typeof obj !== "object") {
    return {};
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => (item !== null && typeof item === "object" ? clonePlainObject(item) : item));
  }
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = v !== null && typeof v === "object" ? clonePlainObject(v) : v;
  }
  return out;
}

/**
 * Values considered "empty" for immutable-field locking (first set allowed).
 * @param {*} value
 * @returns {boolean}
 */
function isFilledMetadataValue(value) {
  if (value === undefined || value === null) return false;
  if (value === "") return false;
  return true;
}

function shallowMetadataValuesEqual(a, b) {
  if (Object.is(a, b)) return true;
  if (typeof a === "object" && a !== null && typeof b === "object" && b !== null) {
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * @param {object} existingMetadata
 * @param {object} patch
 * @param {string[]} immutableTopLevelKeys
 * @returns {string|null} offending key, or null if allowed
 */
function findImmutableTopLevelKeyViolation(existingMetadata, patch, immutableTopLevelKeys) {
  if (!immutableTopLevelKeys?.length) return null;
  const existing = existingMetadata && typeof existingMetadata === "object" ? existingMetadata : {};
  const p = patch && typeof patch === "object" ? patch : {};
  for (const key of immutableTopLevelKeys) {
    if (!Object.prototype.hasOwnProperty.call(p, key)) continue;
    if (!isFilledMetadataValue(existing[key])) continue;
    const nextVal = p[key];
    if (nextVal === null || !shallowMetadataValuesEqual(nextVal, existing[key])) {
      return key;
    }
  }
  return null;
}

export { mergeMetadataPatch, isFilledMetadataValue, findImmutableTopLevelKeyViolation, shallowMetadataValuesEqual };
