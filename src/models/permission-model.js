import { AbstractModel } from "../services/database/abstract-model.js";

class PermissionModel extends AbstractModel {
  constructor() {
    super(
      {
        user: String,
        role: String,
      },
      { timestamps: true },
    );
  }

  static async buildIndexes() {
    await this.schema.index({ user: 1, role: 1 }, { unique: true });
    return await this.syncIndexes();
  }

  static list() {
    return this.find();
  }

  static listByUser(user) {
    return this.find({ user });
  }

  static deleteByUser(user) {
    return this.deleteMany({ user });
  }

  static delete(user, role) {
    return this.deleteOne({ user, role });
  }

  /**
   * Updates all permissions for a user when their username changes.
   *
   * @param {string} oldUsername
   * @param {string} newUsername
   * @returns {Promise<import('mongoose').UpdateResult>}
   */
  static updateUser(oldUsername, newUsername) {
    return this.updateMany({ user: oldUsername }, { $set: { user: newUsername } });
  }
}

const permissionModel = new PermissionModel();
export default await permissionModel.createModel("AUTH", "PRIMARY");
