import { describe, it, expect } from "@jest/globals";
import { DefaultRoles } from "../../src/index.js";

describe("DefaultRoles", () => {
  describe("all", () => {
    it("should contain all the roles", () => {
      expect(DefaultRoles.all).toEqual(["Admin", "Public", "Authenticated", "Authority"]);
    });
  });

  describe("privileged", () => {
    it("should contain only the admin role", () => {
      expect(DefaultRoles.privileged).toEqual(["Admin"]);
    });
  });

  describe("protected", () => {
    it("should contain the public and authenticated roles", () => {
      expect(DefaultRoles.protected).toEqual(["Public", "Authenticated"]);
    });
  });

  describe("application", () => {
    it("should contain only the authority role", () => {
      expect(DefaultRoles.application).toEqual(["Authority"]);
    });
  });

  describe("add", () => {
    it("should add a new role to the list of all roles", () => {
      DefaultRoles.add("Test");
      expect(DefaultRoles.all).toContain("Test");
    });

    it("should add a new role to the specified role type", () => {
      DefaultRoles.add("Test", "privileged");
      expect(DefaultRoles.privileged).toContain("Test");
    });
  });
});
