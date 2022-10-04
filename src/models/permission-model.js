import {AbstractModel} from '../services/database/abstract-model.js';

class PermissionModel extends AbstractModel {
  constructor() {
    super(
        {
          user: String,
          role: String,
        },
        {timestamps: true},
    );
  }

  static async buildIndexes() {
    await this.schema.index({user: 1, role: 1}, {unique: true});
    return await this.syncIndexes();
  }

  static listByUser(user) {
    return this.find({user});
  }

  static deleteByUser(user) {
    return this.deleteMany({user});
  }

  static delete(user, role) {
    return this.deleteOne({user, role});
  }
}

const permissionModel = new PermissionModel();
export default await permissionModel.createModel('AUTH', 'PRIMARY');
