import passportLocalMongoose from "passport-local-mongoose";
import type { Model, Document } from "mongoose";
import { AbstractModel } from "../services/database/abstract-model.js";

/**
 * Default projection to exclude sensitive fields from queries
 */
const DEFAULT_PROJECTION = { salt: 0, hash: 0, resetToken: 0 };

/**
 * User document interface
 */
export interface IUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  username: string; // Added by passport-local-mongoose
  authStrategy: string;
  language: string;
  resetToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User model interface with static methods
 */
export interface IUserModel extends Model<IUser> {
  buildIndexes(): Promise<void>;
  list(): Promise<IUser[]>;
  listWithPermissions(): Promise<any[]>;
  safeFindByUsername(username: string): Promise<IUser | null>;
  // Passport-local-mongoose methods
  authenticate(): (username: string, password: string) => Promise<any>;
  findByUsername(username: string): Promise<IUser | null>;
  register(user: IUser, password: string): Promise<IUser>;
}

/**
 * User model with passport-local-mongoose integration.
 * Handles user authentication, password hashing, and user management.
 *
 * Features:
 * - Local authentication strategy via passport-local-mongoose
 * - Automatic password hashing
 * - Email as username
 * - Password reset token support
 * - Multi-language support
 * - Automatic timestamps
 *
 * Sensitive fields (salt, hash, resetToken) are excluded from JSON serialization.
 */
class UserModel extends AbstractModel {
  constructor() {
    super(
      // Passport adds username and password by default, username matches email
      {
        firstName: String,
        lastName: String,
        email: String,
        authStrategy: {
          type: String,
          default: "local",
        },
        language: {
          type: String,
          default: "cs",
        },
        resetToken: String,
      },
      { timestamps: true },
    );

    this.schema.plugin(passportLocalMongoose);

    // Remove sensitive fields from the JSON response
    this.schema.set("toJSON", {
      transform: (_doc: any, ret: any) => {
        delete ret.salt;
        delete ret.hash;
        delete ret.resetToken;
        return ret;
      },
    });
  }

  /**
   * Builds and synchronizes database indexes.
   * Creates a unique index on the username field.
   */
  static async buildIndexes(this: Model<IUser>): Promise<void> {
    await this.schema.index({ username: 1 }, { unique: true });
    await this.syncIndexes();
  }

  /**
   * Lists all users without sensitive fields.
   * @returns Array of user documents
   */
  static async list(this: Model<IUser>): Promise<IUser[]> {
    return await this.find({}, DEFAULT_PROJECTION);
  }

  /**
   * Lists all users with their associated permissions.
   * Uses MongoDB aggregation to join with permissions collection.
   * @returns Array of user documents with permissions
   */
  static async listWithPermissions(this: Model<IUser>): Promise<any[]> {
    return await this.aggregate([
      {
        $lookup: {
          from: "permissions",
          localField: "username",
          foreignField: "user",
          as: "permissions",
        },
      },
      {
        $project: {
          ...DEFAULT_PROJECTION,
          "permissions._id": 0,
          "permissions.user": 0,
          "permissions.createdAt": 0,
          "permissions.updatedAt": 0,
          "permissions.__v": 0,
        },
      },
    ]);
  }

  /**
   * Finds a user by username without sensitive fields.
   * Safe for returning to clients.
   * @param username - The user's email/username
   * @returns User document or null
   */
  static async safeFindByUsername(this: Model<IUser>, username: string): Promise<IUser | null> {
    return await this.findOne({ username }, DEFAULT_PROJECTION);
  }
}

const userModel = new UserModel();
export default (await userModel.createModel<IUser>("AUTH", "PRIMARY")) as IUserModel;
