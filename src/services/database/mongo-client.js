import mongoose from "mongoose";
import { Mutex } from "async-mutex";
import LoggerFactory from "../logging/logger-factory.js";
import Config from "../utils/config.js";
import SecretManager from "../secret-manager/secret-manager.js";

/**
 * Manages Mongoose connections keyed by environment name. Each connection is
 * established once (guarded by a mutex) and then cached for reuse.
 * The connection URI is resolved from environment variables or Google Cloud Secret Manager.
 */
class MongoClient {
  static connections = {};
  static mutex = new Mutex();

  /**
   * @param {string} [envKey="PRIMARY"] - Logical name for this connection (e.g. `"PRIMARY"`, `"AUTH"`).
   * @param {string} [fallbackEnvKey] - Optional fallback key tried when the primary URI is not set.
   */
  constructor(envKey = "PRIMARY", fallbackEnvKey) {
    this.envKey = envKey;
    this.fallbackEnvKey = fallbackEnvKey;
    this.connection = null;
    this.mongoUri = null;
    this.logger = LoggerFactory.create("Service.MongoClient");
  }

  /**
   * Returns an existing connection or lazily creates one.
   *
   * @param {string} envKey
   * @param {string} [fallbackEnvKey]
   * @returns {Promise<import('mongoose').Connection|undefined>} Mongoose connection, or `undefined` when MongoDB is disabled.
   */
  static async getConnection(envKey, fallbackEnvKey) {
    if (Config.MONGODB_DISABLED) return;
    let connection = this.connections[envKey] || this.connections[fallbackEnvKey];

    // lazy initialization of connection (only PRIMARY is explicitly connected)
    if (!connection) {
      await new MongoClient(envKey, fallbackEnvKey).init();
      connection = this.connections[envKey] || this.connections[fallbackEnvKey];
    }

    return connection.connection;
  }

  /**
   * Establishes the database connection (mutex-guarded to prevent duplicates).
   *
   * @returns {Promise<void>}
   */
  async init() {
    if (Config.MONGODB_DISABLED) return;
    await MongoClient.mutex.runExclusive(this._init.bind(this));
  }

  async _init() {
    // no need to initialize the connection multiple times, the pooling is handled by Mongoose
    const alreadyConnected = this._handleExistingConnection();
    if (alreadyConnected) return;

    let mongoUri = await this._getMongoUri(this.envKey);

    let usedFallback = false;
    if (!mongoUri && this.fallbackEnvKey) {
      mongoUri = await this._getMongoUri(this.fallbackEnvKey);
      usedFallback = true;
    }

    if (!mongoUri) {
      throw new Error(
        "MongoDB connection not specified. " +
          `Either ${this.envKey}_MONGODB_URI or ${this.envKey}_MONGODB_SECRET have to be set in ENV, ` +
          "or you can use fallback parameter.",
      );
    }

    this.mongoUri = mongoUri;

    try {
      this.connection = await mongoose.createConnection(mongoUri, { autoIndex: false });
    } catch (e) {
      this.logger.error("Error when connecting to database:", e);
      throw e;
    }

    if (usedFallback) {
      this.logger.info(`Successfully connected to database: ${this.fallbackEnvKey} as a fallback from: ${this.envKey}`);
      MongoClient.connections[this.fallbackEnvKey] = { connection: this.connection, uri: this.mongoUri };
    } else {
      this.logger.info(`Successfully connected to database: ${this.envKey}`);
      MongoClient.connections[this.envKey] = { connection: this.connection, uri: this.mongoUri };
    }
  }

  async _getMongoUri(envKey) {
    const envConfigKey = envKey.toUpperCase() + "_MONGODB_URI";
    return Config.get(envConfigKey) || (await SecretManager.get("mongoDbUri_" + envKey));
  }

  _handleExistingConnection() {
    const connectionParams = MongoClient.connections[this.envKey] || MongoClient.connections[this.fallbackEnvKey];
    if (connectionParams) {
      this.mongoUri = connectionParams.mongoUri;
      this.connection = connectionParams.connection;
    }
    return connectionParams;
  }
}

export default MongoClient;
