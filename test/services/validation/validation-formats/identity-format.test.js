import { describe, it, expect, beforeAll } from "@jest/globals";
import { ValidationService } from "../../../../src/index.js";

describe("IdentityFormat", () => {
  const testSchema = {
    type: "object",
    properties: {
      email: { type: "string", format: "identity" },
    },
    required: ["email"],
    additionalProperties: false,
  };

  beforeAll(async () => {
    await ValidationService.init(true);
    ValidationService.addSchema(testSchema, "IdentityTestSchema");
  });

  describe("valid email addresses", () => {
    it("should validate simple email addresses", async () => {
      await expect(ValidationService.validate({ email: "user@example.com" }, "/identityTest")).resolves.toMatchObject({
        valid: true,
      });

      await expect(ValidationService.validate({ email: "test@domain.org" }, "/identityTest")).resolves.toMatchObject({
        valid: true,
      });

      await expect(
        ValidationService.validate({ email: "admin@company.co.uk" }, "/identityTest"),
      ).resolves.toMatchObject({ valid: true });
    });

    it("should validate email addresses with dots", async () => {
      await expect(
        ValidationService.validate({ email: "user.name@example.com" }, "/identityTest"),
      ).resolves.toMatchObject({ valid: true });

      await expect(
        ValidationService.validate({ email: "first.last@domain.org" }, "/identityTest"),
      ).resolves.toMatchObject({ valid: true });
    });

    it("should validate email addresses with plus signs", async () => {
      await expect(
        ValidationService.validate({ email: "user+tag@example.com" }, "/identityTest"),
      ).resolves.toMatchObject({ valid: true });

      await expect(
        ValidationService.validate({ email: "email+filter@domain.org" }, "/identityTest"),
      ).resolves.toMatchObject({ valid: true });
    });

    it("should validate email addresses with apostrophes", async () => {
      await expect(
        ValidationService.validate({ email: "user's.email@domain.com" }, "/identityTest"),
      ).resolves.toMatchObject({ valid: true });
    });

    it("should validate email addresses with special characters", async () => {
      await expect(
        ValidationService.validate({ email: "user!test@example.com" }, "/identityTest"),
      ).resolves.toMatchObject({ valid: true });

      await expect(
        ValidationService.validate({ email: "user#tag@example.com" }, "/identityTest"),
      ).resolves.toMatchObject({ valid: true });

      await expect(
        ValidationService.validate({ email: "user$dollar@example.com" }, "/identityTest"),
      ).resolves.toMatchObject({ valid: true });
    });
  });

  describe("invalid email addresses", () => {
    it("should reject email addresses without @", async () => {
      await expect(ValidationService.validate({ email: "userexample.com" }, "/identityTest")).rejects.toThrow(
        "Invalid dtoIn.",
      );

      await expect(ValidationService.validate({ email: "user" }, "/identityTest")).rejects.toThrow("Invalid dtoIn.");
    });

    it("should reject email addresses without domain", async () => {
      await expect(ValidationService.validate({ email: "user@" }, "/identityTest")).rejects.toThrow("Invalid dtoIn.");
    });

    it("should reject email addresses without local part", async () => {
      await expect(ValidationService.validate({ email: "@example.com" }, "/identityTest")).rejects.toThrow(
        "Invalid dtoIn.",
      );
    });

    it("should reject email addresses with spaces", async () => {
      await expect(ValidationService.validate({ email: "user name@example.com" }, "/identityTest")).rejects.toThrow(
        "Invalid dtoIn.",
      );

      await expect(ValidationService.validate({ email: "user@exam ple.com" }, "/identityTest")).rejects.toThrow(
        "Invalid dtoIn.",
      );
    });

    it("should reject empty strings", async () => {
      await expect(ValidationService.validate({ email: "" }, "/identityTest")).rejects.toThrow("Invalid dtoIn.");
    });
  });
});
