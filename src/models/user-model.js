import passportLocalMongoose from "passport-local-mongoose";
import mongoose from "mongoose";

import { AbstractModel } from "../services/database/abstract-model.js";

const DEFAULT_PROJECTION = { salt: 0, hash: 0, resetToken: 0, verificationToken: 0 };

/**
 * User model backed by `passport-local-mongoose`. Stores authentication credentials,
 * profile fields, and extensible metadata. Sensitive fields (`salt`, `hash`, tokens)
 * are stripped from JSON output and default projections.
 */
class UserModel extends AbstractModel {
  constructor() {
    super(
      // passport adds username and password by default, username matches email
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
        verified: {
          type: Boolean,
          default: true,
        },
        verificationToken: String,
        metadata: {
          type: mongoose.Schema.Types.Mixed,
          default: {},
        },
      },
      { timestamps: true },
    );

    this.schema.plugin(passportLocalMongoose);

    // Remove refreshToken from the response
    this.schema.set("toJSON", {
      transform: (doc, ret) => {
        delete ret.salt;
        delete ret.hash;
        delete ret.resetToken;
        delete ret.verificationToken;
        return ret;
      },
    });
  }

  /**
   * Register an extra index on the User schema (e.g. partial unique on metadata fields).
   * Same arguments as Mongoose schema.index(fields, options). Call before syncIndexes.
   */
  static registerMetadataIndex(fields, options) {
    this.schema.index(fields, options);
  }

  /**
   * Advanced: mutate the User Mongoose schema (compound indexes, plugins, etc.).
   * Call once at application startup, before syncIndexes.
   */
  static configureUserSchema(callback) {
    if (typeof callback !== "function") {
      throw new TypeError("configureUserSchema(callback): callback must be a function");
    }
    callback(this.schema);
  }

  /**
   * Creates a unique index on `username` and synchronizes all schema indexes.
   *
   * @returns {Promise<Array>} Dropped indexes, if any.
   */
  static async buildIndexes() {
    await this.schema.index({ username: 1 }, { unique: true });
    return await this.syncIndexes();
  }

  /**
   * Lists all users with sensitive fields excluded.
   *
   * @returns {Promise<Array<import('mongoose').Document>>}
   */
  static async list() {
    return await this.find({}, DEFAULT_PROJECTION);
  }

  /**
   * Lists all users with their permissions joined via `$lookup` aggregation.
   *
   * @returns {Promise<Array<object>>}
   */
  static async listWithPermissions() {
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
   * Finds a single user by username with sensitive fields excluded.
   *
   * @param {string} username
   * @returns {Promise<import('mongoose').Document|null>}
   */
  static async safeFindByUsername(username) {
    return await this.findOne({ username }, DEFAULT_PROJECTION);
  }
}

const userModel = new UserModel();
const User = await userModel.createModel("AUTH", "PRIMARY");
export { User as UserModel };
export default User;
