import { describe, it, expect } from "@jest/globals";
import { AuthorizationResult } from "../../../src/index.js";

describe("AuthorizationResult", () => {
  const result = new AuthorizationResult({
    authorized: true,
    user: "test@example.com",
    useCaseRoles: ["admin", "editor"],
    userRoles: ["admin", "author"],
  });

  it("should have the correct properties", () => {
    expect(result).toHaveProperty("authorized", true);
    expect(result).toHaveProperty("user", "test@example.com");
    expect(result).toHaveProperty("useCaseRoles", ["admin", "editor"]);
    expect(result).toHaveProperty("userRoles", ["admin", "author"]);
  });
});
