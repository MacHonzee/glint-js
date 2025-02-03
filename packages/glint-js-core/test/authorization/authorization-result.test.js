import { describe, it, expect } from "@jest/globals";
import AuthorizationResult from "../../src/authorization/authorization-result.js";

describe("AuthorizationResult", () => {
  it("should create authorized result", () => {
    const result = new AuthorizationResult({
      username: "test@test.com",
      authorized: true,
      useCaseRoles: ["Admin", "User"],
      userRoles: ["User"],
      useCase: "/test/path"
    });

    expect(result).toMatchObject({
      username: "test@test.com",
      authorized: true,
      useCaseRoles: ["Admin", "User"],
      userRoles: ["User"],
      useCase: "/test/path"
    });
  });

  it("should create unauthorized result", () => {
    const result = new AuthorizationResult({
      username: "test@test.com",
      authorized: false,
      useCaseRoles: ["Admin"],
      userRoles: ["User"],
      useCase: "/admin/path"
    });

    expect(result).toMatchObject({
      username: "test@test.com",
      authorized: false,
      useCaseRoles: ["Admin"],
      userRoles: ["User"],
      useCase: "/admin/path"
    });
  });

  it("should create result with default values", () => {
    const result = new AuthorizationResult({
      username: "test@test.com",
      authorized: true
    });
  });
}); 