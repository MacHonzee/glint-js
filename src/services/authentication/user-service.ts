import UserModel from "../../models/user-model.js";
import UseCaseError from "../server/use-case-error.js";
import type { Document } from "mongoose";

/**
 * Error thrown when a user is not found by username or ID
 */
class UserNotFound extends UseCaseError {
  constructor(userOrId: string) {
    super("User with given username / id was not found.", { user: userOrId, id: userOrId });
  }
}

/**
 * Service for user-related operations.
 * Provides a simplified interface for finding users with automatic error handling.
 *
 * Features:
 * - Find user by username (email)
 * - Find user by ID
 * - Throws standardized UserNotFound error when user doesn't exist
 *
 * @example
 * // Find user by email
 * const user = await UserService.findByUsername("user@example.com");
 *
 * // Find user by ID
 * const user = await UserService.findById("507f1f77bcf86cd799439011");
 */
class UserService {
  /** Collection of error classes for external use */
  ERRORS = {
    UserNotFound,
  };

  /**
   * Finds a user by their username (email address).
   * @param username - The user's email address
   * @returns The user document
   * @throws UserNotFound if the user doesn't exist
   *
   * @example
   * const user = await UserService.findByUsername("user@example.com");
   * console.log(user.firstName, user.lastName);
   */
  async findByUsername(username: string): Promise<Document & any> {
    const user = await UserModel.findByUsername(username);
    if (!user) throw new UserNotFound(username);
    return user;
  }

  /**
   * Finds a user by their unique identifier.
   * @param id - The user's ID (MongoDB ObjectId as string)
   * @returns The user document
   * @throws UserNotFound if the user doesn't exist
   *
   * @example
   * const user = await UserService.findById("507f1f77bcf86cd799439011");
   */
  async findById(id: string): Promise<Document & any> {
    const user = await UserModel.findById(id);
    if (!user) throw new UserNotFound(id);
    return user;
  }
}

export default new UserService();
export { UserNotFound };
