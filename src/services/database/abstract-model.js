import mongoose from "mongoose";
import MongoClient from "./mongo-client.js";
import UseCaseError from "../server/use-case-error.js";
import Config from "../utils/config.js";

/** Error thrown when a Mongoose `save` operation violates a unique index. */
class DuplicateKeyError extends UseCaseError {
  constructor(keyValue, keyPattern) {
    super("A duplicate key error occurred in a database.", { keyValue, keyPattern });
  }
}

/**
 * Global registry of all Mongoose models created by {@link AbstractModel.createModel},
 * keyed by model name.
 *
 * @type {Object<string, import('mongoose').Model>}
 */
const ModelWarehouse = {};

/**
 * Base class for all application Mongoose models. Provides schema setup,
 * automatic duplicate-key error handling, and model creation against the
 * correct database connection.
 */
class AbstractModel {
  /**
   * @param {import('mongoose').SchemaDefinition} schema - Mongoose schema definition object.
   * @param {import('mongoose').SchemaOptions} [options={}] - Mongoose schema options.
   */
  constructor(schema, options = {}) {
    this.schema = new mongoose.Schema(schema, options);

    this._addErrorMiddleware();
  }

  /**
   * Creates a Mongoose model bound to the appropriate database connection and
   * registers it in the {@link ModelWarehouse}.
   *
   * @param {string} [connectionKey="PRIMARY"] - Logical connection key.
   * @param {string} [fallbackKey] - Fallback connection key.
   * @returns {Promise<import('mongoose').Model>}
   */
  async createModel(connectionKey = "PRIMARY", fallbackKey) {
    let connection;
    if (Config.MONGODB_DISABLED) {
      connection = mongoose;
    } else {
      connection = await MongoClient.getConnection(connectionKey, fallbackKey);
    }

    this.schema.loadClass(this.constructor);

    const modelName = this.constructor.name.replace(/Model$/, "");
    const model = connection.model(modelName, this.schema);
    ModelWarehouse[modelName] = model;
    return model;
  }

  _addErrorMiddleware() {
    this.schema.post("save", (error, doc, next) => {
      if (error.name === "MongoServerError" && error.code === 11000) {
        next(new DuplicateKeyError(error.keyValue, error.keyPattern));
      } else {
        next();
      }
    });
  }
}

export { AbstractModel, ModelWarehouse, DuplicateKeyError };
