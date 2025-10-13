import mongoose, { Connection } from "mongoose";
import { Mutex } from "async-mutex";
import LoggerFactory from "../logging/logger-factory.js";
import Config from "../utils/config.js";
import SecretManager from "../secret-manager/secret-manager.js";
import type { Logger } from "winston";

/**
 * Connection parameters stored for each database connection
 */
interface ConnectionParams {
  /** Mongoose connection instance */
  connection: Connection;
  /** MongoDB connection URI */
  uri: string;
}

/**
 * MongoDB client that manages database connections with support for multiple databases.
 * Implements lazy initialization, connection pooling, and fallback connection support.
 *
 * Features:
 * - Multiple named connections (PRIMARY, SECONDARY, etc.)
 * - Lazy connection initialization (connections created only when needed)
 * - Fallback connection support
 * - Thread-safe connection creation using mutex
 * - Support for connection URIs from environment variables or Secret Manager
 * - Can be disabled for testing via MONGODB_DISABLED config
 *
 * Connection URI resolution order:
 * 1. Environment variable: {KEY}_MONGODB_URI
 * 2. Secret Manager: mongoDbUri_{KEY}
 * 3. Fallback key (if specified)
 *
 * @example
 * // Initialize primary connection
 * await new MongoClient().init();
 *
 * // Get connection for use
 * const connection = await MongoClient.getConnection("PRIMARY");
 * const model = connection.model("User", userSchema);
 *
 * // Use with fallback
 * const conn = await MongoClient.getConnection("ANALYTICS", "PRIMARY");
 */
class MongoClient {
  /** Static storage for all connection instances */
  private static connections: Record<string, ConnectionParams> = {};

  /** Mutex to ensure thread-safe connection initialization */
  private static mutex = new Mutex();

  /** Environment key for this connection (e.g., "PRIMARY", "SECONDARY") */
  private envKey: string;

  /** Optional fallback environment key */
  private fallbackEnvKey?: string;

  /** The MongoDB connection instance */
  private connection: Connection | null = null;

  /** The MongoDB connection URI */
  private mongoUri: string | null = null;

  /** Logger instance */
  private logger: Logger;

  /**
   * Creates a new MongoClient instance.
   * @param envKey - Environment key for the connection (default: "PRIMARY")
   * @param fallbackEnvKey - Optional fallback key if primary connection is unavailable
   */
  constructor(envKey: string = "PRIMARY", fallbackEnvKey?: string) {
    this.envKey = envKey;
    this.fallbackEnvKey = fallbackEnvKey;
    this.connection = null;
    this.mongoUri = null;
    this.logger = LoggerFactory.create("Service.MongoClient");
  }

  /**
   * Gets an existing connection or creates a new one if it doesn't exist.
   * This is the primary method for accessing database connections.
   *
   * @param envKey - Environment key for the connection
   * @param fallbackEnvKey - Optional fallback key
   * @returns The Mongoose connection instance
   *
   * @example
   * const connection = await MongoClient.getConnection("PRIMARY");
   * const User = connection.model("User", userSchema);
   */
  static async getConnection(envKey: string, fallbackEnvKey?: string): Promise<Connection> {
    if (Config.MONGODB_DISABLED) {
      // Return undefined when MongoDB is disabled
      return undefined as any;
    }

    let connection = this.connections[envKey]?.connection || this.connections[fallbackEnvKey || ""]?.connection;

    // Lazy initialization of connection (only PRIMARY is explicitly connected)
    if (!connection) {
      await new MongoClient(envKey, fallbackEnvKey).init();
      connection = this.connections[envKey]?.connection || this.connections[fallbackEnvKey || ""]?.connection;
    }

    if (!connection) {
      throw new Error(`Failed to establish database connection for key: ${envKey}`);
    }

    return connection;
  }

  /**
   * Initializes the database connection.
   * Uses a mutex to ensure only one initialization happens at a time.
   */
  async init(): Promise<void> {
    if (Config.MONGODB_DISABLED) return;
    await MongoClient.mutex.runExclusive(this._init.bind(this));
  }

  /**
   * Internal initialization method that handles the actual connection logic.
   * @private
   */
  private async _init(): Promise<void> {
    // No need to initialize the connection multiple times, pooling is handled by Mongoose
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

    if (usedFallback && this.fallbackEnvKey) {
      this.logger.info(`Successfully connected to database: ${this.fallbackEnvKey} as a fallback from: ${this.envKey}`);
      MongoClient.connections[this.fallbackEnvKey] = { connection: this.connection, uri: this.mongoUri };
    } else {
      this.logger.info(`Successfully connected to database: ${this.envKey}`);
      MongoClient.connections[this.envKey] = { connection: this.connection, uri: this.mongoUri };
    }
  }

  /**
   * Retrieves the MongoDB URI from environment variables or Secret Manager.
   * @param envKey - The environment key to look up
   * @returns The MongoDB URI, or undefined if not found
   * @private
   */
  private async _getMongoUri(envKey: string): Promise<string | undefined> {
    const envConfigKey = envKey.toUpperCase() + "_MONGODB_URI";
    return Config.get(envConfigKey) || (await SecretManager.get("mongoDbUri_" + envKey));
  }

  /**
   * Checks if a connection already exists and reuses it if available.
   * @returns True if an existing connection was found and reused
   * @private
   */
  private _handleExistingConnection(): boolean {
    const connectionParams =
      MongoClient.connections[this.envKey] ||
      (this.fallbackEnvKey ? MongoClient.connections[this.fallbackEnvKey] : undefined);

    if (connectionParams) {
      this.mongoUri = connectionParams.uri;
      this.connection = connectionParams.connection;
    }

    return !!connectionParams;
  }
}

export default MongoClient;
