import { describe, it, expect, beforeAll } from "@jest/globals";
import { ValidationService } from "../../../../src/index.js";

describe("ObjectIdFormat", () => {
  const testSchema = {
    type: "object",
    properties: {
      id: { type: "string", format: "objectId" },
    },
    required: ["id"],
    additionalProperties: false,
  };

  beforeAll(async () => {
    await ValidationService.init(true);
    ValidationService.addSchema(testSchema, "ObjectIdTestSchema");
  });

  describe("valid ObjectIds", () => {
    it("should validate 24-character hexadecimal strings", async () => {
      await expect(
        ValidationService.validate({ id: "507f1f77bcf86cd799439011" }, "/objectIdTest"),
      ).resolves.toMatchObject({ valid: true });

      await expect(
        ValidationService.validate({ id: "5f9d88f9c1b6c8a9e8b9e9e9" }, "/objectIdTest"),
      ).resolves.toMatchObject({ valid: true });

      await expect(
        ValidationService.validate({ id: "000000000000000000000000" }, "/objectIdTest"),
      ).resolves.toMatchObject({ valid: true });

      await expect(
        ValidationService.validate({ id: "ffffffffffffffffffffffff" }, "/objectIdTest"),
      ).resolves.toMatchObject({ valid: true });
    });

    it("should validate ObjectIds with uppercase hex", async () => {
      await expect(
        ValidationService.validate({ id: "507F1F77BCF86CD799439011" }, "/objectIdTest"),
      ).resolves.toMatchObject({ valid: true });

      await expect(
        ValidationService.validate({ id: "FFFFFFFFFFFFFFFFFFFFFFFF" }, "/objectIdTest"),
      ).resolves.toMatchObject({ valid: true });
    });

    it("should validate ObjectIds with mixed case", async () => {
      await expect(
        ValidationService.validate({ id: "507f1F77BcF86cD799439011" }, "/objectIdTest"),
      ).resolves.toMatchObject({ valid: true });
    });
  });

  describe("invalid ObjectIds", () => {
    it("should reject strings that are too short", async () => {
      await expect(ValidationService.validate({ id: "507f1f77bcf86cd79943901" }, "/objectIdTest")).rejects.toThrow(
        "Invalid dtoIn.",
      );

      await expect(ValidationService.validate({ id: "507f1f77bcf86cd7994390" }, "/objectIdTest")).rejects.toThrow(
        "Invalid dtoIn.",
      );

      await expect(ValidationService.validate({ id: "123" }, "/objectIdTest")).rejects.toThrow("Invalid dtoIn.");
    });

    it("should reject strings that are too long", async () => {
      await expect(ValidationService.validate({ id: "507f1f77bcf86cd7994390111" }, "/objectIdTest")).rejects.toThrow(
        "Invalid dtoIn.",
      );

      await expect(ValidationService.validate({ id: "507f1f77bcf86cd799439011123" }, "/objectIdTest")).rejects.toThrow(
        "Invalid dtoIn.",
      );
    });

    it("should reject strings with non-hexadecimal characters", async () => {
      await expect(ValidationService.validate({ id: "507f1f77bcf86cd79943901g" }, "/objectIdTest")).rejects.toThrow(
        "Invalid dtoIn.",
      );

      await expect(ValidationService.validate({ id: "507f1f77bcf86cd79943901!" }, "/objectIdTest")).rejects.toThrow(
        "Invalid dtoIn.",
      );

      await expect(ValidationService.validate({ id: "507f1f77bcf86cd79943901 " }, "/objectIdTest")).rejects.toThrow(
        "Invalid dtoIn.",
      );

      await expect(ValidationService.validate({ id: "507f1f77bcf86cd79943901-" }, "/objectIdTest")).rejects.toThrow(
        "Invalid dtoIn.",
      );
    });

    it("should reject empty strings", async () => {
      await expect(ValidationService.validate({ id: "" }, "/objectIdTest")).rejects.toThrow("Invalid dtoIn.");
    });
  });
});
