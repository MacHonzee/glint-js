import mongoose from 'mongoose';
import {Mutex} from 'async-mutex';
import LoggerFactory from '../logging/logger-factory.js';
import Config from '../utils/config.js';

class MongoClient {
  static connections = {};
  static mutex = new Mutex();

  constructor(envKey = 'PRIMARY', fallbackEnvKey) {
    this.envKey = envKey;
    this.fallbackEnvKey = fallbackEnvKey;
    this.connection = null;
    this.mongoUri = null;
    this.logger = LoggerFactory.create('Server.MongoClient');
  }

  static async getConnection(envKey, fallbackEnvKey) {
    let connection = this.connections[envKey] || this.connections[fallbackEnvKey];

    // lazy initialization of connection (only PRIMARY is explicitly connected)
    if (!connection) {
      await (new MongoClient(envKey, fallbackEnvKey)).init();
      connection = this.connections[envKey] || this.connections[fallbackEnvKey];
    }

    return connection.connection;
  }

  async init() {
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
          'MongoDB connection not specified. ' +
          `Either ${this.envKey}_MONGODB_URI or ${this.envKey}_MONGODB_SECRET have to be set in ENV, ` +
        'or you can use fallback parameter.',
      );
    }

    this.mongoUri = mongoUri;

    try {
      this.connection = await mongoose.createConnection(mongoUri, {autoIndex: false});
    } catch (e) {
      this.logger.error('Error when connecting to database:', e);
      throw e;
    }

    if (usedFallback) {
      this.logger.info(`Successfully connected to database: ${this.fallbackEnvKey} as a fallback from: ${this.envKey}`);
      MongoClient.connections[this.fallbackEnvKey] = {connection: this.connection, uri: this.mongoUri};
    } else {
      this.logger.info(`Successfully connected to database: ${this.envKey}`);
      MongoClient.connections[this.envKey] = {connection: this.connection, uri: this.mongoUri};
    }
  }

  async _getMongoUri(envKey) {
    const envConfigKey = envKey.toUpperCase() + '_MONGODB_URI';
    const mongoUri = Config.get(envConfigKey);

    if (!mongoUri) {
      // TODO needed for cloud sometime later
      // mongoUri = await this._resolveMongoSecret(envKey);
    }

    return mongoUri;
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
