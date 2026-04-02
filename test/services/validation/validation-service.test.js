import os from "os";
import Ajv from "ajv";
import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import { ValidationService, Config } from "../../../src/index.js";
import { UsersCreateSchema } from "../../test-app/app/validation-schemas/test-validation";
import IdentityFormat from "../../../src/services/validation/validation-formats/identity-format.js";
import ObjectIdFormat from "../../../src/services/validation/validation-formats/object-id-format.js";

describe("ValidationService", () => {
  beforeEach(() => {
    ValidationService._ajv = new Ajv({ allErrors: false, coerceTypes: true });
    jest.restoreAllMocks();
  });

  describe("init", () => {
    it("should register schemas from app and lib folders", async () => {
      const addSchemaSpy = jest.spyOn(ValidationService._ajv, "addSchema");

      await ValidationService.init(true);

      expect(addSchemaSpy).toHaveBeenCalled();
      expect(addSchemaSpy).toHaveBeenCalledWith(UsersCreateSchema, "UsersCreateSchema");
    });

    it("should register custom formats", async () => {
      const addFormatSpy = jest.spyOn(ValidationService._ajv, "addFormat");

      await ValidationService.init(true);

      expect(addFormatSpy).toHaveBeenCalledTimes(2);
      expect(addFormatSpy).toHaveBeenCalledWith("identity", { validate: expect.any(Function) });
      expect(addFormatSpy).toHaveBeenCalledWith("objectId", { validate: expect.any(Function) });
    });
  });

  describe("validate", () => {
    beforeEach(async () => {
      await ValidationService.init(true);
    });

    it("should validate data against schema and return valid:true if successful", async () => {
      const data = { id: "123" };
      const result = await ValidationService.validate(data, "/users/create");

      expect(result).toEqual({ valid: true });
    });

    it("should throw SchemaNotFoundError if schema for use case not found", async () => {
      const data = { id: "123" };
      const useCase = "unknown/useCase";

      await expect(ValidationService.validate(data, useCase)).rejects.toThrow("Schema not found for given use case.");
    });

    it("should throw InvalidDtoIn with validation errors if data is invalid", async () => {
      const data = { id: {} };
      const useCase = "/users/create";

      await expect(ValidationService.validate(data, useCase)).rejects.toThrowError("Invalid dtoIn.");
      await expect(ValidationService.validate(data, useCase)).rejects.toMatchObject({
        message: "Invalid dtoIn.",
        code: "glint-js/invalidDtoIn",
        status: 400,
        params: {
          useCase,
          schemaName: "UsersCreateSchema",
          errors: [
            {
              instancePath: "/id",
              schemaPath: "#/properties/id/type",
              keyword: "type",
              params: { type: "string" },
              message: "must be string",
            },
          ],
        },
      });
    });
  });

  describe("init", () => {
    it("should skip re-initialization when already initialized and forceReload is false", async () => {
      ValidationService._initialized = true;
      const spy = jest.spyOn(ValidationService, "_registerFormats");

      await ValidationService.init(false);

      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe("init with missing app schemas folder", () => {
    it("should succeed when app validation-schemas folder does not exist", async () => {
      const originalRoot = process.env.SERVER_ROOT;
      Config.set("SERVER_ROOT", os.tmpdir());

      await ValidationService.init(true);

      Config.set("SERVER_ROOT", originalRoot);
    });
  });

  describe("error handling", () => {
    it("should throw and log when format registration fails", async () => {
      jest.spyOn(ValidationService._ajv, "addFormat").mockImplementation(() => {
        throw new Error("duplicate format");
      });

      await expect(ValidationService.init(true)).rejects.toThrow("duplicate format");
    });

    it("should throw and log when schema registration fails", async () => {
      jest.spyOn(ValidationService._ajv, "addSchema").mockImplementation(() => {
        throw new Error("duplicate schema");
      });

      await expect(ValidationService.init(true)).rejects.toThrow("duplicate schema");
    });
  });
});

describe("Validation formats", () => {
  describe("IdentityFormat", () => {
    it("should reject non-string values", () => {
      expect(IdentityFormat.format.validate(123)).toBe(false);
      expect(IdentityFormat.format.validate(null)).toBe(false);
      expect(IdentityFormat.format.validate(undefined)).toBe(false);
    });

    it("should accept valid email-like strings", () => {
      expect(IdentityFormat.format.validate("test@example.com")).toBeTruthy();
    });

    it("should reject invalid identity strings", () => {
      expect(IdentityFormat.format.validate("not-an-email")).toBeFalsy();
    });
  });

  describe("ObjectIdFormat", () => {
    it("should reject non-string values", () => {
      expect(ObjectIdFormat.format.validate(123)).toBe(false);
      expect(ObjectIdFormat.format.validate(null)).toBe(false);
      expect(ObjectIdFormat.format.validate(undefined)).toBe(false);
    });

    it("should accept valid 24-char hex strings", () => {
      expect(ObjectIdFormat.format.validate("507f1f77bcf86cd799439011")).toBeTruthy();
    });

    it("should reject invalid objectId strings", () => {
      expect(ObjectIdFormat.format.validate("not-an-objectid")).toBeFalsy();
      expect(ObjectIdFormat.format.validate("507f1f77bcf86cd79943901")).toBeFalsy();
    });
  });
});
