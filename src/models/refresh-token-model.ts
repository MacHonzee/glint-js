import type { Model, Document } from "mongoose";
import { AbstractModel } from "../services/database/abstract-model.js";

/**
 * User information stored in refresh token
 */
interface TokenUser {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
}

/**
 * Refresh token document interface
 */
export interface IRefreshToken extends Document {
  token: string;
  tid: string | any; // Can be ObjectId from JWT or string
  csrfToken: string;
  expiresAt: Date;
  user: TokenUser;
}

/**
 * Refresh token model interface with static methods
 */
export interface IRefreshTokenModel extends Model<IRefreshToken> {
  findByToken(token: string): Promise<any>;
  updateByToken(token: string, tokenData: Partial<IRefreshToken>): Promise<any>;
  deleteByToken(token: string): Promise<any>;
  deleteByUsername(username: string): Promise<any>;
  buildIndexes(): Promise<void>;
}

/**
 * Refresh token model for managing long-lived authentication tokens.
 * Stores refresh tokens used to obtain new session tokens without re-authentication.
 *
 * Features:
 * - Token ID (tid) for quick lookups
 * - CSRF token support
 * - Automatic expiration via MongoDB TTL index
 * - User information embedding
 * - Token lifecycle management
 *
 * Security notes:
 * - Tokens automatically expire based on expiresAt field
 * - CSRF tokens prevent cross-site request forgery
 * - Tokens are invalidated on logout
 *
 * @example
 * // Store a refresh token
 * await RefreshToken.create({
 *   token: "jwt-token-string",
 *   tid: "token-id",
 *   csrfToken: "csrf-token",
 *   expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
 *   user: { id: "123", username: "user@example.com", firstName: "John", lastName: "Doe" }
 * });
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
      { timestamps: false }, // Manual timestamp management for this model
    );
  }

  /**
   * Finds a refresh token by its token ID.
   * Returns a plain JavaScript object (lean query for performance).
   * @param token - The token ID (tid)
   * @returns Refresh token document or null
   */
  static async findByToken(this: Model<IRefreshToken>, token: string): Promise<any> {
    return await this.findOne({ tid: token }).lean();
  }

  /**
   * Updates a refresh token by its token ID.
   * @param token - The token ID (tid)
   * @param tokenData - The new token data
   * @returns Update operation result
   */
  static async updateByToken(
    this: Model<IRefreshToken>,
    token: string,
    tokenData: Partial<IRefreshToken>,
  ): Promise<any> {
    return await this.updateOne({ tid: token }, tokenData);
  }

  /**
   * Deletes a refresh token by its token ID.
   * Used during logout to invalidate the token.
   * @param token - The token ID (tid)
   * @returns Delete operation result
   */
  static async deleteByToken(this: Model<IRefreshToken>, token: string): Promise<any> {
    return await this.deleteOne({ tid: token });
  }

  /**
   * Deletes all refresh tokens for a specific user.
   * Useful when a user changes their password or needs to be logged out from all devices.
   * @param username - The user's email/username
   * @returns Delete operation result
   */
  static async deleteByUsername(this: Model<IRefreshToken>, username: string): Promise<any> {
    return await this.deleteMany({ "user.username": username });
  }

  /**
   * Builds and synchronizes database indexes.
   * Creates:
   * - Index on tid for fast token lookups
   * - TTL index on expiresAt for automatic token expiration
   */
  static async buildIndexes(this: Model<IRefreshToken>): Promise<void> {
    await this.schema.index({ tid: 1 });
    await this.schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    await this.syncIndexes();
  }
}

const refreshTokenModel = new RefreshTokenModel();
export default (await refreshTokenModel.createModel<IRefreshToken>("AUTH", "PRIMARY")) as IRefreshTokenModel;
