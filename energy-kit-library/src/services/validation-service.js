import fs from 'fs';
import path from 'path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

class SchemaNotFoundError extends Error {
  constructor(useCase, schemaName) {
    super();
    this.message = 'Schema not found for given usecase.';
    this.code = 'energy-kit/schemaNotFound';
    this.params = {
      useCase,
      schemaName,
    };
  }
}

class InvalidDtoIn extends Error {
  constructor(useCase, schemaName, errors) {
    super();
    this.message = 'Invalid dtoIn.';
    this.code = 'energy-kit/invalidDtoIn';
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
    this._ajv = new Ajv({allErrors: true});
    addFormats(this._ajv);
  }

  async init() {
    const appSchemasFldPath = path.join(process.env.SERVER_ROOT, 'app', 'validation-schemas');
    await this._registerFromPath(appSchemasFldPath);

    const libSchemasFldPath = path.join(import.meta.url.replace('file:///', ''), '..', '..', 'validation-schemas');
    await this._registerFromPath(libSchemasFldPath);
  }

  async validate(data, useCase) {
    const ucParts = useCase.split('/').slice(1).map((ucPart) => `${ucPart[0].toUpperCase()}${ucPart.slice(1)}`);
    const schemaName = ucParts.join('') + 'Schema';
    const schema = this._ajv.getSchema(schemaName);
    if (!schema) {
      throw new SchemaNotFoundError(useCase, schemaName);
    }

    const validationResult = schema(data);
    if (!validationResult) {
      const validationErrors = [...schema.errors];
      throw new InvalidDtoIn(useCase, schemaName, validationErrors);
    }

    return {
      valid: validationResult,
    };
  }

  async _registerFromPath(schemasFldPath) {
    const entries = await fs.promises.readdir(schemasFldPath);
    for (const entry of entries) {
      const schemas = await import('file://' + path.join(schemasFldPath, entry));

      for (const [schemaName, schema] of Object.entries(schemas.default)) {
        this._ajv.addSchema(schema, schemaName);
      }
    }
  }
}

export default new ValidationService();
