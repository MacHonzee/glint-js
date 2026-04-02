import { describe, it, expect } from "@jest/globals";
import {
  mergeMetadataPatch,
  findImmutableTopLevelKeyViolation,
  isFilledMetadataValue,
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
});

describe("isFilledMetadataValue", () => {
  it("should treat empty string as not filled", () => {
    expect(isFilledMetadataValue("")).toBe(false);
  });

  it("should treat false as filled", () => {
    expect(isFilledMetadataValue(false)).toBe(true);
  });
});
