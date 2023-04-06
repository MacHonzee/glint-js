import path from "path";
import Ajv from "ajv";
import { jest, describe, it, expect, beforeEach, beforeAll } from "@jest/globals";
import { ValidationService, Config } from "../../../src/index.js";
import { UsersCreateSchema } from "../../test-app/app/validation-schemas/test-validation";

describe("ValidationService", () => {
  beforeAll(() => {
    Config.set("SERVER_ROOT", path.join(Config.SERVER_ROOT, "test", "test-app"));
  });

  beforeEach(() => {
    ValidationService._ajv = new Ajv({ allErrors: false, coerceTypes: true });
    jest.restoreAllMocks();
  });

  describe("init", () => {
    it("should register schemas from app and lib folders", async () => {
      const addSchemaSpy = jest.spyOn(ValidationService._ajv, "addSchema");

      await ValidationService.init();

      expect(addSchemaSpy).toHaveBeenCalled();
      expect(addSchemaSpy).toHaveBeenCalledWith(UsersCreateSchema, "UsersCreateSchema");
    });

    it("should register custom formats", async () => {
      const addFormatSpy = jest.spyOn(ValidationService._ajv, "addFormat");

      await ValidationService.init();

      expect(addFormatSpy).toHaveBeenCalledTimes(2);
      expect(addFormatSpy).toHaveBeenCalledWith("identity", { validate: expect.any(Function) });
      expect(addFormatSpy).toHaveBeenCalledWith("objectId", { validate: expect.any(Function) });
    });
  });

  describe("validate", () => {
    beforeEach(async () => {
      await ValidationService.init();
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
});
