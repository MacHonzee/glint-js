import mongoose from 'mongoose';
import MongoClient from './mongo-client.js';

const ModelWarehouse = {};

class AbstractModel {
  constructor(schema, options) {
    this.schema = new mongoose.Schema( schema, options );
  }

  createModel(connectionKey = 'PRIMARY') {
    const connection = MongoClient.getConnection(connectionKey);

    this.schema.loadClass(this.constructor);

    const modelName = this.constructor.name.replace(/Model$/, '');
    const model = connection.model(modelName, this.schema);
    ModelWarehouse[modelName] = model;
    return model;
  }
}

export {AbstractModel, ModelWarehouse};
