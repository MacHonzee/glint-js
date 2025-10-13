import type { Model, Document } from "mongoose";
import { AbstractModel } from "../services/database/abstract-model.js";

/**
 * Permission document interface
 */
export interface IPermission extends Document {
  user: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Permission model interface with static methods
 */
export interface IPermissionModel extends Model<IPermission> {
  buildIndexes(): Promise<void>;
  list(): Promise<IPermission[]>;
  listByUser(user: string): Promise<IPermission[]>;
  deleteByUser(user: string): Promise<any>;
  delete(user: string, role: string): Promise<any>;
}

/**
 * Permission model for role-based access control.
 * Manages the many-to-many relationship between users and roles.
 *
 * Features:
 * - User-role associations
 * - Unique constraint per user-role pair
 * - Automatic timestamps
 * - Batch operations support
 *
 * @example
 * // Grant a role to a user
 * await Permission.create({ user: "user@example.com", role: "admin" });
 *
 * // List all roles for a user
 * const roles = await Permission.listByUser("user@example.com");
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
   * Builds and synchronizes database indexes.
   * Creates a unique compound index on user and role fields.
   */
  static async buildIndexes(this: Model<IPermission>): Promise<void> {
    await this.schema.index({ user: 1, role: 1 }, { unique: true });
    await this.syncIndexes();
  }

  /**
   * Lists all permissions in the system.
   * @returns Array of all permission documents
   */
  static list(this: Model<IPermission>): Promise<IPermission[]> {
    return this.find();
  }

  /**
   * Lists all permissions for a specific user.
   * @param user - The user's email/username
   * @returns Array of permission documents for the user
   */
  static listByUser(this: Model<IPermission>, user: string): Promise<IPermission[]> {
    return this.find({ user });
  }

  /**
   * Deletes all permissions for a specific user.
   * Useful when removing a user from the system.
   * @param user - The user's email/username
   * @returns Delete operation result
   */
  static deleteByUser(this: Model<IPermission>, user: string): Promise<any> {
    return this.deleteMany({ user });
  }

  /**
   * Deletes a specific user-role permission.
   * @param user - The user's email/username
   * @param role - The role name
   * @returns Delete operation result
   */
  static delete(this: Model<IPermission>, user: string, role: string): Promise<any> {
    return this.deleteOne({ user, role });
  }
}

const permissionModel = new PermissionModel();
export default (await permissionModel.createModel<IPermission>("AUTH", "PRIMARY")) as IPermissionModel;
