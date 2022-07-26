import {AbstractModel} from '../services/database/abstract-model.js';

class PermissionModel extends AbstractModel {
  constructor() {
    super(
        {identity: {type: String}, role: {type: String}},
        {timestamps: true},
    );
  }

  static async buildIndexes() {
    await this.schema.index({identity: 1, role: 1}, {unique: true});
    return await this.syncIndexes();
  }

  static listByUser(identity) {
    return this.find({identity});
  }

  static deleteByUser(identity) {
    return this.deleteMany({identity});
  }

  static delete(identity, role) {
    return this.deleteOne({identity, role});
  }
}

export default new PermissionModel().createModel();
