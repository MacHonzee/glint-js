import mongoose from 'mongoose';

const ModelWarehouse = {};

class AbstractModel {
  constructor(schema, options) {
    this.schema = new mongoose.Schema( schema, options );
  }

  createModel() {
    this.schema.loadClass(this.constructor);
    const modelName = this.constructor.name.replace(/Model$/, '');
    const model = mongoose.model(modelName, this.schema);
    ModelWarehouse[modelName] = model;
    return model;
  }
}

export {AbstractModel, ModelWarehouse};
