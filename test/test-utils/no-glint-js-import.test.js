import { describe, it, expect } from "@jest/globals";

describe("pure unit test without glint-js", () => {
  it("adds 1 + 1 without importing the public barrel", () => {
    expect(1 + 1).toBe(2);
  });
});
