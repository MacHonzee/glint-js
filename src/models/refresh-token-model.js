import { AbstractModel } from "../services/database/abstract-model.js";

/**
 * Model for storing JWT refresh tokens. Each document holds the signed token,
 * a unique token ID (`tid`), CSRF token, expiration date, and a snapshot of
 * the user payload.
 */
class RefreshTokenModel extends AbstractModel {
  constructor() {
    super(
      {
        token: String,
        tid: String,
        csrfToken: String,
        expiresAt: Date,
        user: {
          id: String,
          username: String,
          firstName: String,
          lastName: String,
        },
      },
      { timestamps: false },
    );
  }

  /**
   * Finds a refresh token document by its unique token ID.
   *
   * @param {string} token - The token ID (`tid`).
   * @returns {Promise<object|null>} Plain object (`.lean()`), or `null`.
   */
  static async findByToken(token) {
    return await this.findOne({ tid: token }).lean();
  }

  /**
   * Replaces the refresh token document matching the given token ID.
   *
   * @param {string} token - The token ID (`tid`).
   * @param {object} tokenData - New document fields.
   * @returns {Promise<import('mongoose').UpdateResult>}
   */
  static async updateByToken(token, tokenData) {
    return await this.updateOne({ tid: token }, tokenData);
  }

  /**
   * Deletes a single refresh token by its token ID.
   *
   * @param {string} token - The token ID (`tid`).
   * @returns {Promise<import('mongoose').DeleteResult>}
   */
  static async deleteByToken(token) {
    return await this.deleteOne({ tid: token });
  }

  /**
   * Deletes all refresh tokens belonging to the given user (global logout).
   *
   * @param {string} username
   * @returns {Promise<import('mongoose').DeleteResult>}
   */
  static async deleteByUsername(username) {
    return await this.deleteMany({ "user.username": username });
  }

  /**
   * Creates indexes on `tid` and a TTL index on `expiresAt`, then synchronizes.
   *
   * @returns {Promise<Array>} Dropped indexes, if any.
   */
  static async buildIndexes() {
    await this.schema.index({ tid: 1 });
    await this.schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    return await this.syncIndexes();
  }
}

const refreshTokenModel = new RefreshTokenModel();
export default await refreshTokenModel.createModel("AUTH", "PRIMARY");
