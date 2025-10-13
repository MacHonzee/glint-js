import { describe, it, expect, beforeAll } from "@jest/globals";
import { ValidationService } from "../../../../src/index.js";
import DefaultRoles from "../../../../src/config/default-roles.js";

describe("RoleFormat", () => {
  const testSchema = {
    $async: true,
    type: "object",
    properties: {
      role: { type: "string", format: "role" },
    },
    required: ["role"],
    additionalProperties: false,
  };

  beforeAll(async () => {
    await ValidationService.init(true);
    ValidationService.addSchema(testSchema, "RoleTestSchema");
  });

  describe("valid roles", () => {
    it("should validate roles that exist in DefaultRoles.all", async () => {
      await expect(ValidationService.validate({ role: "Public" }, "/roleTest")).resolves.toMatchObject({ valid: true });

      await expect(ValidationService.validate({ role: "Authenticated" }, "/roleTest")).resolves.toMatchObject({
        valid: true,
      });

      await expect(ValidationService.validate({ role: "Authority" }, "/roleTest")).resolves.toMatchObject({
        valid: true,
      });
    });

    it("should validate dynamically added roles", async () => {
      // Add a custom role
      DefaultRoles.all.push("CustomRole");

      await expect(ValidationService.validate({ role: "CustomRole" }, "/roleTest")).resolves.toMatchObject({
        valid: true,
      });
    });
  });

  describe("invalid roles", () => {
    it("should reject roles that don't exist in DefaultRoles.all", async () => {
      await expect(ValidationService.validate({ role: "InvalidRole" }, "/roleTest")).rejects.toThrow("Invalid dtoIn.");

      await expect(ValidationService.validate({ role: "NonExistent" }, "/roleTest")).rejects.toThrow("Invalid dtoIn.");

      await expect(ValidationService.validate({ role: "AdminFake" }, "/roleTest")).rejects.toThrow("Invalid dtoIn.");
    });

    it("should reject empty strings", async () => {
      await expect(ValidationService.validate({ role: "" }, "/roleTest")).rejects.toThrow("Invalid dtoIn.");
    });

    it("should be case-sensitive", async () => {
      await expect(ValidationService.validate({ role: "public" }, "/roleTest")).rejects.toThrow("Invalid dtoIn.");

      await expect(ValidationService.validate({ role: "PUBLIC" }, "/roleTest")).rejects.toThrow("Invalid dtoIn.");

      await expect(ValidationService.validate({ role: "Public" }, "/roleTest")).resolves.toMatchObject({ valid: true });
    });
  });

  describe("dynamic role updates", () => {
    it("should reflect changes to DefaultRoles.all", async () => {
      // Role doesn't exist initially
      await expect(ValidationService.validate({ role: "NewRole" }, "/roleTest")).rejects.toThrow("Invalid dtoIn.");

      // Add the role
      DefaultRoles.all.push("NewRole");

      // Now it should be valid
      await expect(ValidationService.validate({ role: "NewRole" }, "/roleTest")).resolves.toMatchObject({
        valid: true,
      });

      // Remove the role
      DefaultRoles.all = DefaultRoles.all.filter((r) => r !== "NewRole");

      // Should be invalid again
      await expect(ValidationService.validate({ role: "NewRole" }, "/roleTest")).rejects.toThrow("Invalid dtoIn.");
    });
  });
});
