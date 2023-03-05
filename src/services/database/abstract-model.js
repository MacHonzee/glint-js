import mongoose from "mongoose";
import MongoClient from "./mongo-client.js";
import UseCaseError from "../server/use-case-error.js";
import Config from "../utils/config.js";

class DuplicateKeyError extends UseCaseError {
  constructor(keyValue, keyPattern) {
    super("A duplicate key error occurred in a database.", "duplicateKeyError", { keyValue, keyPattern });
  }
}

const ModelWarehouse = {};

class AbstractModel {
  constructor(schema, options = {}) {
    this.schema = new mongoose.Schema(schema, options);

    this._addErrorMiddleware();
  }

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
