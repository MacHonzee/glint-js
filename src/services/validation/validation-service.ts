import fs from "fs";
import path from "path";
import Ajv, { ErrorObject, Format, ValidateFunction, AnySchema } from "ajv";
import addFormats from "ajv-formats";
import UseCaseError from "../server/use-case-error.js";
import Config from "../utils/config.js";
import LoggerFactory from "../logging/logger-factory.js";
import type { Logger } from "winston";

/**
 * Error thrown when a validation schema is not found for a use case
 */
class SchemaNotFoundError extends UseCaseError {
  constructor(useCase: string, schemaName: string) {
    super("Schema not found for given use case.", { useCase, schemaName });
  }
}

/**
 * Error thrown when input data fails validation
 */
class InvalidDtoIn extends UseCaseError {
  constructor(useCase: string, schemaName: string, errors: ErrorObject[]) {
    super("Invalid dtoIn.", { useCase, schemaName, errors });
  }
}

/**
 * Custom validation format definition
 */
interface ValidationFormat {
  name: string;
  format: string | RegExp | ((data: any) => boolean);
}

/**
 * Validation result interface
 */
interface ValidationResult {
  valid: boolean;
  result?: any; // The validated data (for async schemas) or true (for sync schemas)
}

/**
 * Validation service using AJV (Another JSON Validator).
 * Provides centralized JSON schema validation for all API endpoints.
 *
 * Features:
 * - Automatic schema discovery from app and library
 * - Custom format registration
 * - Type coercion (e.g., string "123" -> number 123)
 * - Removal of additional properties not in schema
 * - Schema caching for performance
 * - Use case-based schema naming convention
 *
 * Schema naming convention:
 * - Use case: /user/login -> Schema name: UserLoginSchema
 * - Use case: /permission/grant -> Schema name: PermissionGrantSchema
 *
 * Discovery paths:
 * 1. {GLINT_ROOT}/src/services/validation/validation-formats/ (custom formats)
 * 2. {SERVER_ROOT}/app/validation-schemas/ (app schemas)
 * 3. {GLINT_ROOT}/src/validation-schemas/ (library schemas)
 *
 * @example
 * // Validate input data
 * await ValidationService.validate(
 *   { email: "test@example.com", password: "secret" },
 *   "/user/login"
 * );
 * // Uses schema named "UserLoginSchema"
 */
class ValidationService {
  private _logger: Logger;
  private _ajv: Ajv;
  private _initialized: boolean = false;

  /** Collection of error classes for external use */
  ERRORS = {
    SchemaNotFoundError,
    InvalidDtoIn,
  };

  constructor() {
    this._logger = LoggerFactory.create("Service.ValidationService");
    this._ajv = new Ajv({
      allErrors: true, // Return all errors, not just the first
      coerceTypes: true, // Coerce types (e.g., "123" -> 123)
      removeAdditional: true, // Remove properties not in schema
      validateFormats: true, // Validate formats
    });
    addFormats(this._ajv);
    this._initialized = false;
  }

  /**
   * Initializes the validation service by registering custom formats and schemas.
   * Called automatically on first validation if not explicitly initialized.
   *
   * @param forceReload - Force reloading of all schemas (useful for testing)
   *
   * @example
   * await ValidationService.init();
   */
  async init(forceReload: boolean = false): Promise<void> {
    if (!forceReload && this._initialized) return;

    // Register custom validation formats
    await this._registerFormats();

    // Register app-specific schemas if they exist
    const appSchemasFldPath = path.join(Config.SERVER_ROOT, "app", "validation-schemas");
    if (fs.existsSync(appSchemasFldPath)) {
      await this._registerFromPath(appSchemasFldPath);
    }

    // Register library schemas
    const libSchemasFldPath = path.join(Config.GLINT_ROOT, "src", "validation-schemas");
    await this._registerFromPath(libSchemasFldPath);

    this._initialized = true;
  }

  /**
   * Adds a custom format validator to the validation service.
   * This method proxies to the internal Ajv instance.
   *
   * @param name - The name of the format
   * @param format - The format definition (validate function or format object)
   *
   * @example
   * // Add a simple format validator
   * ValidationService.addFormat("uppercase", {
   *   validate: (value) => value === value.toUpperCase()
   * });
   *
   * @example
   * // Add an async format validator
   * ValidationService.addFormat("uniqueEmail", {
   *   async: true,
   *   validate: async (value) => {
   *     const exists = await checkEmailExists(value);
   *     return !exists;
   *   }
   * });
   */
  addFormat(name: string, format: Format): void {
    this._ajv.addFormat(name, format);
  }

  /**
   * Adds a schema to the validation service.
   * This method proxies to the internal Ajv instance.
   *
   * @param schema - The JSON schema to add
   * @param key - Optional schema identifier (defaults to schema.$id or schema.title)
   *
   * @example
   * // Add a schema with explicit key
   * ValidationService.addSchema({
   *   type: "object",
   *   properties: {
   *     name: { type: "string" }
   *   }
   * }, "UserSchema");
   *
   * @example
   * // Add a schema using $id
   * ValidationService.addSchema({
   *   $id: "ProductSchema",
   *   type: "object",
   *   properties: {
   *     name: { type: "string" },
   *     price: { type: "number" }
   *   }
   * });
   */
  addSchema(schema: AnySchema, key?: string): void {
    this._ajv.addSchema(schema, key);
  }

  /**
   * Validates data against the schema for a given use case.
   * The schema name is derived from the use case path.
   *
   * @param data - The data to validate
   * @param useCase - The use case path (e.g., "/user/login")
   * @returns Validation result object
   * @throws SchemaNotFoundError if schema doesn't exist for the use case
   * @throws InvalidDtoIn if data fails validation
   *
   * @example
   * // Validate login data
   * await ValidationService.validate(
   *   { email: "user@example.com", password: "password123" },
   *   "/user/login"
   * );
   *
   * // This will look for schema named "UserLoginSchema"
   */
  async validate(data: any, useCase: string): Promise<ValidationResult> {
    if (!this._initialized) await this.init(); // Lazy init to support specific setups

    // Convert use case path to schema name
    // Example: "/user/login" -> ["User", "Login"] -> "UserLoginSchema"
    const ucParts = useCase
      .split("/")
      .slice(1) // Remove leading empty string
      .filter((part) => part.length > 0) // Remove empty parts
      .map((ucPart) => `${ucPart[0]!.toUpperCase()}${ucPart.slice(1)}`);
    const schemaName = ucParts.join("") + "Schema";

    const schema = this._ajv.getSchema(schemaName) as ValidateFunction | undefined;
    if (!schema) {
      throw new this.ERRORS.SchemaNotFoundError(useCase, schemaName);
    }

    try {
      const validationResult = await schema(data);
      // For async schemas, validationResult is the data; for sync schemas it's true/false
      // We only care about success/failure, so check truthiness
      if (!validationResult) {
        const validationErrors = [...(schema.errors || [])];
        console.error("invalidDtoIn error", JSON.stringify(validationErrors, null, 2));
        throw new this.ERRORS.InvalidDtoIn(useCase, schemaName, validationErrors);
      }

      return {
        valid: true,
        result: validationResult, // Contains validated data for async schemas, true for sync schemas
      };
    } catch (error) {
      // Async validation errors throw exceptions
      if (error instanceof Error && error.message === "validation failed") {
        const validationErrors = [...(schema.errors || [])];
        console.error("invalidDtoIn error", JSON.stringify(validationErrors, null, 2));
        throw new this.ERRORS.InvalidDtoIn(useCase, schemaName, validationErrors);
      }
      throw error;
    }
  }

  /**
   * Registers custom validation formats from the validation-formats directory.
   * @private
   */
  private async _registerFormats(): Promise<void> {
    const formatsFldPath = path.join(Config.GLINT_ROOT, "src", "services", "validation", "validation-formats");

    if (!fs.existsSync(formatsFldPath)) {
      this._logger.warn(`Validation formats directory not found: ${formatsFldPath}`);
      return;
    }

    const entries = await fs.promises.readdir(formatsFldPath);
    for (const entry of entries) {
      if (!entry.endsWith(".js") && !entry.endsWith(".ts")) continue;

      const formatPath = path.join(formatsFldPath, entry);
      const { default: format } = (await import("file://" + formatPath)) as { default: ValidationFormat };

      this._logger.debug(`Adding format with name '${format.name}' from path '${formatPath}'`);
      try {
        this._ajv.addFormat(format.name, format.format);
      } catch (e) {
        this._logger.error(`Cannot add format with name '${format.name}' from path '${formatPath}'`);
        throw e;
      }
    }
  }

  /**
   * Registers validation schemas from a directory path.
   * @param schemasFldPath - Path to the schemas directory
   * @private
   */
  private async _registerFromPath(schemasFldPath: string): Promise<void> {
    const entries = await fs.promises.readdir(schemasFldPath);
    for (const entry of entries) {
      const schemaPath = path.join(schemasFldPath, entry);

      // Import only JavaScript/TypeScript files, skip folders and other configs
      if (!schemaPath.endsWith(".js") && !schemaPath.endsWith(".ts")) continue;

      const schemas = (await import("file://" + schemaPath)) as { default: Record<string, AnySchema> };
      const schemasDefault = schemas.default;

      for (const [schemaName, schema] of Object.entries(schemasDefault)) {
        this._logger.debug(`Adding schema with name '${schemaName}' from path '${schemaPath}'`);
        try {
          this._ajv.addSchema(schema, schemaName);
        } catch (e) {
          this._logger.error(`Cannot add schema with name '${schemaName}' from path '${schemaPath}'`);
          throw e;
        }
      }
    }
  }
}

export default new ValidationService();
export { SchemaNotFoundError, InvalidDtoIn };
