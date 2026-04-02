import { AbstractModel } from "../services/database/abstract-model.js";

/**
 * Model for user-role permission assignments. Each document links a `user`
 * (username) to a `role` string, with a unique compound index.
 */
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

  /**
   * Creates a unique compound index on `{user, role}` and synchronizes indexes.
   *
   * @returns {Promise<Array>} Dropped indexes, if any.
   */
  static async buildIndexes() {
    await this.schema.index({ user: 1, role: 1 }, { unique: true });
    return await this.syncIndexes();
  }

  /** @returns {Promise<Array<import('mongoose').Document>>} All permission documents. */
  static list() {
    return this.find();
  }

  /**
   * @param {string} user - Username to filter by.
   * @returns {Promise<Array<import('mongoose').Document>>}
   */
  static listByUser(user) {
    return this.find({ user });
  }

  /**
   * Removes all permissions for the given user.
   *
   * @param {string} user
   * @returns {Promise<import('mongoose').DeleteResult>}
   */
  static deleteByUser(user) {
    return this.deleteMany({ user });
  }

  /**
   * Removes a single permission for the given user and role.
   *
   * @param {string} user
   * @param {string} role
   * @returns {Promise<import('mongoose').DeleteResult>}
   */
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
