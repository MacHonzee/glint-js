import mongoose, { Schema, Model, Connection, SchemaDefinition, SchemaOptions } from "mongoose";
import MongoClient from "./mongo-client.js";
import UseCaseError from "../server/use-case-error.js";
import Config from "../utils/config.js";

/**
 * Error thrown when a duplicate key constraint is violated in MongoDB.
 */
class DuplicateKeyError extends UseCaseError {
  /**
   * Creates a duplicate key error.
   * @param keyValue - The duplicate key values that caused the error
   * @param keyPattern - The index pattern that was violated
   */
  constructor(keyValue: Record<string, any>, keyPattern: Record<string, any>) {
    super("A duplicate key error occurred in a database.", { keyValue, keyPattern });
  }
}

/**
 * MongoDB error type for duplicate key violations
 */
interface MongoServerError extends Error {
  name: string;
  code: number;
  keyValue: Record<string, any>;
  keyPattern: Record<string, any>;
}

/**
 * Global warehouse for storing model instances.
 * Allows models to be accessed across the application without re-instantiation.
 */
const ModelWarehouse: Record<string, Model<any>> = {};

/**
 * Abstract base class for Mongoose models.
 * Provides a standardized way to create and manage Mongoose schemas and models.
 *
 * Features:
 * - Automatic model registration in ModelWarehouse
 * - Built-in duplicate key error handling
 * - Support for multiple database connections
 * - Automatic schema class loading
 *
 * Usage:
 * ```typescript
 * class UserModel extends AbstractModel {
 *   constructor() {
 *     super({
 *       email: { type: String, required: true, unique: true },
 *       name: { type: String, required: true }
 *     });
 *   }
 * }
 *
 * const User = await new UserModel().createModel();
 * ```
 */
class AbstractModel {
  /** Mongoose schema instance */
  schema: Schema;

  /**
   * Creates a new abstract model with the given schema definition.
   * @param schema - Mongoose schema definition object
   * @param options - Optional schema options (timestamps, strict mode, etc.)
   */
  constructor(schema: SchemaDefinition, options: SchemaOptions = {}) {
    this.schema = new mongoose.Schema(schema, options);
    this._addErrorMiddleware();
  }

  /**
   * Creates and registers a Mongoose model from this schema.
   * The model is automatically registered in the ModelWarehouse using the class name
   * (with "Model" suffix removed) as the key.
   *
   * @param connectionKey - The database connection key (default: "PRIMARY")
   * @param fallbackKey - Optional fallback connection key if primary is unavailable
   * @returns The created Mongoose model
   *
   * @example
   * const User = await new UserModel().createModel("PRIMARY", "SECONDARY");
   */
  async createModel<T = any>(connectionKey: string = "PRIMARY", fallbackKey?: string): Promise<Model<T>> {
    let connection: Connection | typeof mongoose;

    if (Config.MONGODB_DISABLED) {
      // Use default mongoose instance when MongoDB is disabled (for testing)
      connection = mongoose;
    } else {
      // Get connection from MongoClient
      connection = await MongoClient.getConnection(connectionKey, fallbackKey);
    }

    // Load instance methods and statics from the class
    this.schema.loadClass(this.constructor as any);

    // Extract model name from class name (e.g., "UserModel" -> "User")
    const modelName = this.constructor.name.replace(/Model$/, "");
    const model = connection.model(modelName, this.schema);

    // Register in warehouse for global access
    ModelWarehouse[modelName] = model as Model<any>;

    return model as Model<T>;
  }

  /**
   * Adds middleware to handle MongoDB duplicate key errors.
   * Converts MongoDB duplicate key errors (code 11000) into UseCaseError instances
   * that can be properly handled by the application's error handling middleware.
   * @private
   */
  private _addErrorMiddleware(): void {
    this.schema.post("save", (error: any, _doc: any, next: (err?: any) => void) => {
      if (error.name === "MongoServerError" && error.code === 11000) {
        const mongoError = error as MongoServerError;
        next(new DuplicateKeyError(mongoError.keyValue, mongoError.keyPattern));
      } else {
        next(error);
      }
    });
  }
}

export { AbstractModel, ModelWarehouse, DuplicateKeyError };
