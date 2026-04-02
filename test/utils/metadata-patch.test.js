import { describe, it, expect } from "@jest/globals";
import {
  mergeMetadataPatch,
  findImmutableTopLevelKeyViolation,
  isFilledMetadataValue,
  shallowMetadataValuesEqual,
} from "../../src/utils/metadata-patch.js";

describe("mergeMetadataPatch", () => {
  it("should merge shallow keys", () => {
    expect(mergeMetadataPatch({ a: 1 }, { b: 2 })).toEqual({ a: 1, b: 2 });
  });

  it("should deep merge nested plain objects", () => {
    expect(mergeMetadataPatch({ a: { x: 1 } }, { a: { y: 2 } })).toEqual({ a: { x: 1, y: 2 } });
  });

  it("should remove key when patch sets null", () => {
    expect(mergeMetadataPatch({ a: 1, b: 2 }, { b: null })).toEqual({ a: 1 });
  });

  it("should remove nested key with null", () => {
    expect(mergeMetadataPatch({ a: { x: 1, y: 2 } }, { a: { y: null } })).toEqual({ a: { x: 1 } });
  });

  it("should replace arrays", () => {
    expect(mergeMetadataPatch({ a: [1, 2] }, { a: [3] })).toEqual({ a: [3] });
  });

  it("should treat undefined patch as no-op", () => {
    const base = { k: 1 };
    expect(mergeMetadataPatch(base, undefined)).toEqual({ k: 1 });
  });

  it("should treat empty patch as no-op", () => {
    expect(mergeMetadataPatch({ k: 1 }, {})).toEqual({ k: 1 });
  });

  it("should handle null base", () => {
    expect(mergeMetadataPatch(null, { a: 1 })).toEqual({ a: 1 });
  });

  it("should handle array as patch (treated as no-op)", () => {
    expect(mergeMetadataPatch({ a: 1 }, [1, 2, 3])).toEqual({ a: 1 });
  });

  it("should clone base with nested arrays containing null", () => {
    const base = { a: [1, null, { x: 1 }] };
    const result = mergeMetadataPatch(base, { b: 2 });
    expect(result).toEqual({ a: [1, null, { x: 1 }], b: 2 });
  });

  it("should replace non-plain object value in base with patch value", () => {
    const base = { a: { nested: 1 }, b: [1, 2] };
    const result = mergeMetadataPatch(base, { b: { replaced: true } });
    expect(result).toEqual({ a: { nested: 1 }, b: { replaced: true } });
  });
});

describe("findImmutableTopLevelKeyViolation", () => {
  it("should return null when patch omits locked keys", () => {
    expect(findImmutableTopLevelKeyViolation({ birthnumber: "x" }, { other: 1 }, ["birthnumber"])).toBe(null);
  });

  it("should return key when patch changes filled value", () => {
    expect(findImmutableTopLevelKeyViolation({ birthnumber: "x" }, { birthnumber: "y" }, ["birthnumber"])).toBe(
      "birthnumber",
    );
  });

  it("should return key when patch clears with null", () => {
    expect(findImmutableTopLevelKeyViolation({ birthnumber: "x" }, { birthnumber: null }, ["birthnumber"])).toBe(
      "birthnumber",
    );
  });

  it("should allow first set when existing empty", () => {
    expect(findImmutableTopLevelKeyViolation({}, { birthnumber: "new" }, ["birthnumber"])).toBe(null);
  });

  it("should return null when existingMetadata is null/non-object", () => {
    expect(findImmutableTopLevelKeyViolation(null, { key: "value" }, ["key"])).toBe(null);
    expect(findImmutableTopLevelKeyViolation("string", { key: "value" }, ["key"])).toBe(null);
  });

  it("should return null when patch is null/non-object", () => {
    expect(findImmutableTopLevelKeyViolation({ key: "value" }, null, ["key"])).toBe(null);
    expect(findImmutableTopLevelKeyViolation({ key: "value" }, 123, ["key"])).toBe(null);
  });

  it("should allow setting an immutable key to the same value", () => {
    expect(findImmutableTopLevelKeyViolation({ name: "same" }, { name: "same" }, ["name"])).toBe(null);
  });

  it("should return null when immutableTopLevelKeys is empty or undefined", () => {
    expect(findImmutableTopLevelKeyViolation({ a: 1 }, { a: 2 }, [])).toBe(null);
    expect(findImmutableTopLevelKeyViolation({ a: 1 }, { a: 2 }, null)).toBe(null);
  });
});

describe("isFilledMetadataValue", () => {
  it("should treat empty string as not filled", () => {
    expect(isFilledMetadataValue("")).toBe(false);
  });

  it("should treat false as filled", () => {
    expect(isFilledMetadataValue(false)).toBe(true);
  });

  it("should treat undefined and null as not filled", () => {
    expect(isFilledMetadataValue(undefined)).toBe(false);
    expect(isFilledMetadataValue(null)).toBe(false);
  });

  it("should treat zero as filled", () => {
    expect(isFilledMetadataValue(0)).toBe(true);
  });
});

describe("shallowMetadataValuesEqual", () => {
  it("should return true for identical primitives", () => {
    expect(shallowMetadataValuesEqual(1, 1)).toBe(true);
    expect(shallowMetadataValuesEqual("a", "a")).toBe(true);
  });

  it("should return false for different primitives", () => {
    expect(shallowMetadataValuesEqual(1, 2)).toBe(false);
    expect(shallowMetadataValuesEqual("a", "b")).toBe(false);
  });

  it("should return true for structurally equal objects", () => {
    expect(shallowMetadataValuesEqual({ a: 1 }, { a: 1 })).toBe(true);
  });

  it("should return false for structurally different objects", () => {
    expect(shallowMetadataValuesEqual({ a: 1 }, { b: 2 })).toBe(false);
  });

  it("should return false for circular references (unserializable)", () => {
    const a = {};
    a.self = a;
    const b = {};
    b.self = b;
    expect(shallowMetadataValuesEqual(a, b)).toBe(false);
  });

  it("should return false when comparing object to primitive", () => {
    expect(shallowMetadataValuesEqual({ a: 1 }, "string")).toBe(false);
  });

  it("should return true when comparing null to null via Object.is", () => {
    expect(shallowMetadataValuesEqual(null, null)).toBe(true);
  });
});
