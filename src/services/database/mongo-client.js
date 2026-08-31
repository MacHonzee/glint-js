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
    this.ensureHandle(envKey, fallbackEnvKey);
    await new MongoClient(envKey, fallbackEnvKey).init();
    return this.connections[envKey].connection;
  }

  /**
   * Returns a per-key Mongoose connection handle without opening a socket.
   *
   * @param {string} envKey
   * @param {string} [fallbackEnvKey]
   * @returns {import('mongoose').Connection}
   */
  static ensureHandle(envKey, fallbackEnvKey) {
    const existing = this.connections[envKey];
    if (existing) {
      if (fallbackEnvKey && !existing.fallbackKey) {
        existing.fallbackKey = fallbackEnvKey;
      }
      return existing.connection;
    }

    const connection = mongoose.createConnection();
    connection.set("autoIndex", false);
    connection.set("bufferCommands", false);
    this.connections[envKey] = { connection, uri: null, fallbackKey: fallbackEnvKey };
    return connection;
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
    const connection = MongoClient.ensureHandle(this.envKey, this.fallbackEnvKey);
    const entry = MongoClient.connections[this.envKey];
    this.connection = connection;

    if (connection.readyState === 1) {
      this.mongoUri = entry.uri;
      return;
    }

    let mongoUri = await this._getMongoUri(this.envKey);
    let usedFallback = false;
    const fallbackKey = this.fallbackEnvKey || entry.fallbackKey;
    if (!mongoUri && fallbackKey) {
      mongoUri = await this._getMongoUri(fallbackKey);
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
      await connection.openUri(mongoUri, { autoIndex: false });
    } catch (e) {
      this.logger.error("Error when connecting to database:", e);
      throw e;
    }

    entry.uri = mongoUri;

    if (usedFallback) {
      this.logger.info(`Successfully connected to database: ${fallbackKey} as a fallback from: ${this.envKey}`);
    } else {
      this.logger.info(`Successfully connected to database: ${this.envKey}`);
    }
  }

  async _getMongoUri(envKey) {
    const envConfigKey = envKey.toUpperCase() + "_MONGODB_URI";
    return Config.get(envConfigKey) || (await SecretManager.get("mongoDbUri_" + envKey));
  }

  /**
   * Opens PRIMARY, then AUTH with PRIMARY as URI fallback.
   *
   * @returns {Promise<void>}
   */
  static async initPrimaryAndAuth() {
    await new MongoClient("PRIMARY").init();
    await new MongoClient("AUTH", "PRIMARY").init();
  }

  /**
   * Opens every cached handle that is not yet connected.
   *
   * @returns {Promise<void>}
   */
  static async initRegistered() {
    for (const [key, entry] of Object.entries(this.connections)) {
      if (entry?.connection?.readyState === 1) continue;
      await new MongoClient(key, entry.fallbackKey).init();
    }
  }
}

export default MongoClient;
