import mongoose from 'mongoose';
import MongoClient from './mongo-client.js';

const ModelWarehouse = {};

class AbstractModel {
  constructor(schema, options) {
    this.schema = new mongoose.Schema( schema, options );
  }

  async createModel(connectionKey = 'PRIMARY', fallbackKey) {
    const connection = await MongoClient.getConnection(connectionKey, fallbackKey);

    this.schema.loadClass(this.constructor);

    const modelName = this.constructor.name.replace(/Model$/, '');
    const model = connection.model(modelName, this.schema);
    ModelWarehouse[modelName] = model;
    return model;
  }
}

export {AbstractModel, ModelWarehouse};
