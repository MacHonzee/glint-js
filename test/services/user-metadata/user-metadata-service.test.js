import { describe, it, expect } from "@jest/globals";
import UserMetadataService from "../../../src/services/user-metadata/user-metadata-service.js";

describe("UserMetadataService", () => {
  it("delegates mergeMetadataPatch", () => {
    expect(UserMetadataService.mergeMetadataPatch({ a: 1 }, { b: 2 })).toEqual({ a: 1, b: 2 });
  });

  it("delegates pickMetadataPatch and findImmutableTopLevelKeyViolation", () => {
    const { patch, strippedKeys } = UserMetadataService.pickMetadataPatch(
      { x: "set" },
      { x: "other", y: 1 },
      { allowedKeys: ["x", "y"], immutableTopLevelKeys: ["x"] },
    );
    expect(patch).toEqual({ y: 1 });
    expect(strippedKeys).toEqual(["x"]);
    expect(UserMetadataService.findImmutableTopLevelKeyViolation({ x: "set" }, { x: "other" }, ["x"])).toBe("x");
  });

  it("delegates isFilledMetadataValue", () => {
    expect(UserMetadataService.isFilledMetadataValue("")).toBe(false);
    expect(UserMetadataService.isFilledMetadataValue(0)).toBe(true);
  });
});
