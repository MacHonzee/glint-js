import fs from "fs";
import path from "path";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import Config from "../utils/config.js";
import LoggerFactory from "../logging/logger-factory.js";

class SchemaNotFoundError extends Error {
  constructor(useCase, schemaName) {
    super();
    this.message = "Schema not found for given use case.";
    this.code = "glint-js/schemaNotFound";
    this.params = {
      useCase,
      schemaName,
    };
  }
}

class InvalidDtoIn extends Error {
  constructor(useCase, schemaName, errors) {
    super();
    this.message = "Invalid dtoIn.";
    this.code = "glint-js/invalidDtoIn";
    this.status = 400;
    this.params = {
      useCase,
      schemaName,
      errors,
    };
  }
}

class ValidationService {
  constructor() {
    this._logger = LoggerFactory.create("Service.ValidationService");
    this._ajv = new Ajv({ allErrors: true, coerceTypes: true, removeAdditional: true });
    addFormats(this._ajv);
    this._initialized = false;
  }

  ERRORS = {
    SchemaNotFoundError,
    InvalidDtoIn,
  };

  /**
   * Method initializes ValidationService by registering validation formats and schemas from app and GlintJs
   *
   * @returns {Promise<void>}
   */
  async init() {
    // TODO add API or auto-loading of custom formats
    await this._registerFormats();

    const appSchemasFldPath = path.join(Config.SERVER_ROOT, "app", "validation-schemas");
    if (fs.existsSync(appSchemasFldPath)) {
      await this._registerFromPath(appSchemasFldPath);
    }

    const libSchemasFldPath = path.join(Config.GLINT_ROOT, "src", "validation-schemas");
    await this._registerFromPath(libSchemasFldPath);

    this._initialized = true;
  }

  /**
   * Method checks that the data is valid against Ajv schema.
   *
   * @param {object} data
   * @param {string} useCase
   * @returns {Promise<{valid: *}>}
   */
  async validate(data, useCase) {
    if (!this._initialized) await this.init(); // lazy init to support specific setups

    const ucParts = useCase
      .split("/")
      .slice(1)
      .map((ucPart) => `${ucPart[0].toUpperCase()}${ucPart.slice(1)}`);
    const schemaName = ucParts.join("") + "Schema";
    const schema = this._ajv.getSchema(schemaName);
    if (!schema) {
      throw new this.ERRORS.SchemaNotFoundError(useCase, schemaName);
    }

    const validationResult = schema(data);
    if (!validationResult) {
      const validationErrors = [...schema.errors];
      throw new this.ERRORS.InvalidDtoIn(useCase, schemaName, validationErrors);
    }

    return {
      valid: validationResult,
    };
  }

  async _registerFormats() {
    const formatsFldPath = path.join(Config.GLINT_ROOT, "src", "services", "validation", "validation-formats");
    const entries = await fs.promises.readdir(formatsFldPath);
    for (const entry of entries) {
      const formatPath = path.join(formatsFldPath, entry);
      const { default: format } = await import("file://" + formatPath);

      this._logger.debug(`Adding format with name '${format.name}' from path '${formatPath}'`);
      try {
        this._ajv.addFormat(format.name, format.format);
      } catch (e) {
        this._logger.error(`Cannot add format with name '${format.name}' from path '${formatPath}'`);
        throw e;
      }
    }
  }

  async _registerFromPath(schemasFldPath) {
    const entries = await fs.promises.readdir(schemasFldPath);
    for (const entry of entries) {
      const schemaPath = path.join(schemasFldPath, entry);
      const schemas = await import("file://" + schemaPath);

      for (const [schemaName, schema] of Object.entries(schemas.default)) {
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
