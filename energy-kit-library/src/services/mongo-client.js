import mongoose from 'mongoose';
import LoggerFactory from './logger-factory.js';

const logger = LoggerFactory.create('Server.MongoClient');

class MongoClient {
  constructor() {
    this.mongoUri = null;
    this.connection = null;
  }

  async init() {
    const mongoUri = process.env.MONGO_URI;

    // TODO needed for cloud sometime later
    // if (!mongoUri) mongoUri = this._resolveMongoSecret();

    if (!mongoUri) {
      throw new Error('Mongo connection uri is not specified. Either MONGO_URI or MONGO_SECRET have to be set in ENV.');
    }
    this.mongoUri = mongoUri;

    try {
      this.connection = await mongoose.connect(mongoUri);
      logger.info(`Successfully connected to database ${mongoUri}`);
    } catch (e) {
      logger.error('Error when connecting to database', e);
      throw e;
    }
  }
}

export default new MongoClient();
