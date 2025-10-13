import Ajv from "ajv";
import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import { ValidationService } from "../../../src/index.js";
import { UsersCreateSchema } from "../../test-app/app/validation-schemas/test-validation";

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

      expect(addFormatSpy).toHaveBeenCalledTimes(4);
      expect(addFormatSpy).toHaveBeenCalledWith("identity", { validate: expect.any(Function) });
      expect(addFormatSpy).toHaveBeenCalledWith("objectId", { validate: expect.any(Function) });
      expect(addFormatSpy).toHaveBeenCalledWith("role", { async: true, validate: expect.any(Function) });
      expect(addFormatSpy).toHaveBeenCalledWith("privilegedRole", { async: true, validate: expect.any(Function) });
    });
  });

  describe("validate", () => {
    beforeEach(async () => {
      await ValidationService.init(true);
    });

    it("should validate data against schema and return valid:true if successful", async () => {
      const data = { id: "123" };
      const result = await ValidationService.validate(data, "/users/create");

      expect(result).toMatchObject({ valid: true });
      expect(result.result).toBeDefined();
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

  describe("addFormat", () => {
    beforeEach(async () => {
      await ValidationService.init(true);
    });

    it("should allow adding a custom format validator", async () => {
      // Add a custom format for uppercase strings
      ValidationService.addFormat("uppercase", {
        validate: (value) => typeof value === "string" && value === value.toUpperCase(),
      });

      // Add a schema that uses the custom format
      const schema = {
        type: "object",
        properties: {
          code: { type: "string", format: "uppercase" },
        },
        required: ["code"],
      };
      ValidationService.addSchema(schema, "UppercaseTestSchema");

      // Valid uppercase string
      await expect(ValidationService.validate({ code: "ABC" }, "/uppercaseTest")).resolves.toMatchObject({
        valid: true,
      });

      // Invalid lowercase string
      await expect(ValidationService.validate({ code: "abc" }, "/uppercaseTest")).rejects.toThrow("Invalid dtoIn.");
    });

    it("should allow adding an async format validator", async () => {
      // Add an async custom format
      ValidationService.addFormat("asyncTest", {
        async: true,
        validate: async (value) => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return typeof value === "string" && value.startsWith("test-");
        },
      });

      // Add a schema that uses the async format
      const schema = {
        $async: true,
        type: "object",
        properties: {
          id: { type: "string", format: "asyncTest" },
        },
        required: ["id"],
      };
      ValidationService.addSchema(schema, "AsyncTestSchema");

      // Valid value
      await expect(ValidationService.validate({ id: "test-123" }, "/asyncTest")).resolves.toMatchObject({
        valid: true,
      });

      // Invalid value
      await expect(ValidationService.validate({ id: "prod-123" }, "/asyncTest")).rejects.toThrow("Invalid dtoIn.");
    });
  });

  describe("addSchema", () => {
    beforeEach(async () => {
      await ValidationService.init(true);
    });

    it("should allow adding a schema with explicit key", async () => {
      const schema = {
        type: "object",
        properties: {
          name: { type: "string" },
          age: { type: "number" },
        },
        required: ["name"],
      };

      ValidationService.addSchema(schema, "CustomUserSchema");

      // Valid data
      await expect(ValidationService.validate({ name: "John", age: 30 }, "/customUser")).resolves.toMatchObject({
        valid: true,
      });

      // Invalid data (missing required field)
      await expect(ValidationService.validate({ age: 30 }, "/customUser")).rejects.toThrow("Invalid dtoIn.");
    });

    it("should allow adding a schema using $id", async () => {
      const schema = {
        $id: "ProductSchema",
        type: "object",
        properties: {
          name: { type: "string" },
          price: { type: "number" },
        },
        required: ["name", "price"],
      };

      ValidationService.addSchema(schema);

      // Valid data
      await expect(ValidationService.validate({ name: "Widget", price: 9.99 }, "/product")).resolves.toMatchObject({
        valid: true,
      });

      // Invalid data (missing price)
      await expect(ValidationService.validate({ name: "Widget" }, "/product")).rejects.toThrow("Invalid dtoIn.");
    });

    it("should allow runtime schema registration for dynamic validation", async () => {
      // Simulate adding a schema at runtime (e.g., from API or configuration)
      const dynamicSchema = {
        $async: true,
        type: "object",
        properties: {
          email: { type: "string", format: "identity" },
          role: { type: "string", format: "role" },
        },
        required: ["email", "role"],
      };

      ValidationService.addSchema(dynamicSchema, "DynamicValidationSchema");

      // Valid data
      await expect(
        ValidationService.validate({ email: "user@example.com", role: "Public" }, "/dynamicValidation"),
      ).resolves.toMatchObject({ valid: true });

      // Invalid data (invalid role)
      await expect(
        ValidationService.validate({ email: "user@example.com", role: "InvalidRole" }, "/dynamicValidation"),
      ).rejects.toThrow("Invalid dtoIn.");
    });
  });
});
