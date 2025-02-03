import { describe, it, expect } from "@jest/globals";
import { Languages } from "../../src/index.js";

describe("Languages", () => {
  it('should have an "all" property containing all defined languages', () => {
    expect(Languages.all).toContain("cs");
    expect(Languages.all).toContain("en");
  });

  it("should be able to add new languages", () => {
    const newLanguage = "fr";
    Languages.add(newLanguage);
    expect(Languages.all).toContain(newLanguage);
  });
});
