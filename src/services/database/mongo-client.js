import mongoose from 'mongoose';
import LoggerFactory from '../logging/logger-factory.js';

class MongoClient {
  constructor(envKey = 'PRIMARY') {
    this.envKey = envKey;
    this.connection = null;
    this.mongoUri = null;
    this.logger = LoggerFactory.create('Server.MongoClient');
  }

  static getConnection(envKey) {
    const connection = this.connections[envKey];
    if (!connection) {
      throw new Error(`Connection for key ${envKey} was not found, init it first.`);
    }
    return connection.connection;
  }

  async init() {
    const envConfigKey = this.envKey.toUpperCase() + '_MONGODB_URI';
    const mongoUri = process.env[envConfigKey];

    // TODO needed for cloud sometime later
    // if (!mongoUri) mongoUri = await this._resolveMongoSecret(envKey);

    if (!mongoUri) {
      throw new Error(
          'MongoDB connection not specified. ' +
          `Either ${this.envKey}_MONGODB_URI or ${this.envKey}_MONGODB_SECRET have to be set in ENV.`,
      );
    }
    this.mongoUri = mongoUri;

    try {
      this.connection = await mongoose.createConnection(mongoUri, {autoIndex: false});
    } catch (e) {
      this.logger.error('Error when connecting to database:', e);
      throw e;
    }

    this.logger.info(`Successfully connected to database: ${this.envKey}`);
    MongoClient.connections[this.envKey] = {connection: this.connection, uri: this.mongoUri};
  }
}

MongoClient.connections = {};

export default MongoClient;
