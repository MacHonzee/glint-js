import { describe, it, expect, beforeAll } from "@jest/globals";
import { ValidationService } from "../../../../src/index.js";
import DefaultRoles from "../../../../src/config/default-roles.js";

describe("PrivilegedRoleFormat", () => {
  const testSchema = {
    $async: true,
    type: "object",
    properties: {
      role: { type: "string", format: "privilegedRole" },
    },
    required: ["role"],
    additionalProperties: false,
  };

  beforeAll(async () => {
    await ValidationService.init(true);
    ValidationService.addSchema(testSchema, "PrivilegedRoleTestSchema");
  });

  describe("valid privileged roles", () => {
    it("should validate roles that exist in DefaultRoles.privileged", async () => {
      await expect(ValidationService.validate({ role: "Admin" }, "/privilegedRoleTest")).resolves.toMatchObject({
        valid: true,
      });
    });

    it("should validate dynamically added privileged roles", async () => {
      // Add a custom privileged role
      DefaultRoles.add("SuperAdmin", "privileged");

      await expect(ValidationService.validate({ role: "SuperAdmin" }, "/privilegedRoleTest")).resolves.toMatchObject({
        valid: true,
      });
    });
  });

  describe("invalid privileged roles", () => {
    it("should reject non-privileged roles", async () => {
      await expect(ValidationService.validate({ role: "Public" }, "/privilegedRoleTest")).rejects.toThrow(
        "Invalid dtoIn.",
      );

      await expect(ValidationService.validate({ role: "Authenticated" }, "/privilegedRoleTest")).rejects.toThrow(
        "Invalid dtoIn.",
      );
    });

    it("should reject roles that don't exist at all", async () => {
      await expect(ValidationService.validate({ role: "InvalidRole" }, "/privilegedRoleTest")).rejects.toThrow(
        "Invalid dtoIn.",
      );

      await expect(ValidationService.validate({ role: "NonExistent" }, "/privilegedRoleTest")).rejects.toThrow(
        "Invalid dtoIn.",
      );

      await expect(ValidationService.validate({ role: "AdminFake" }, "/privilegedRoleTest")).rejects.toThrow(
        "Invalid dtoIn.",
      );
    });

    it("should reject empty strings", async () => {
      await expect(ValidationService.validate({ role: "" }, "/privilegedRoleTest")).rejects.toThrow("Invalid dtoIn.");
    });

    it("should be case-sensitive", async () => {
      await expect(ValidationService.validate({ role: "admin" }, "/privilegedRoleTest")).rejects.toThrow(
        "Invalid dtoIn.",
      );

      await expect(ValidationService.validate({ role: "ADMIN" }, "/privilegedRoleTest")).rejects.toThrow(
        "Invalid dtoIn.",
      );

      await expect(ValidationService.validate({ role: "Admin" }, "/privilegedRoleTest")).resolves.toMatchObject({
        valid: true,
      });
    });
  });

  describe("dynamic privileged role updates", () => {
    it("should reflect changes to DefaultRoles.privileged", async () => {
      // Role doesn't exist initially
      await expect(ValidationService.validate({ role: "NewPrivilegedRole" }, "/privilegedRoleTest")).rejects.toThrow(
        "Invalid dtoIn.",
      );

      // Add the role
      DefaultRoles.add("NewPrivilegedRole", "privileged");

      // Now it should be valid
      await expect(
        ValidationService.validate({ role: "NewPrivilegedRole" }, "/privilegedRoleTest"),
      ).resolves.toMatchObject({ valid: true });

      // Remove the role
      DefaultRoles.privileged = DefaultRoles.privileged.filter((r) => r !== "NewPrivilegedRole");

      // Should be invalid again
      await expect(ValidationService.validate({ role: "NewPrivilegedRole" }, "/privilegedRoleTest")).rejects.toThrow(
        "Invalid dtoIn.",
      );
    });
  });
});
