import UserModel from "../../models/user-model.js";
import UseCaseError from "../server/use-case-error.js";

/** Error thrown when a user lookup by username or ID yields no result. */
class UserNotFound extends UseCaseError {
  constructor(userOrId) {
    super("User with given username / id was not found.", { user: userOrId, id: userOrId });
  }
}

/**
 * Thin wrapper around UserModel that throws a {@link UserNotFound} error when
 * the requested user does not exist.
 */
class UserService {
  ERRORS = {
    UserNotFound,
  };

  /**
   * @param {string} username
   * @returns {Promise<import('mongoose').Document>}
   * @throws {UserNotFound}
   */
  async findByUsername(username) {
    const user = await UserModel.findByUsername(username);
    if (!user) throw new UserNotFound(username);
    return user;
  }

  /**
   * @param {string} id - Mongoose ObjectId as string.
   * @returns {Promise<import('mongoose').Document>}
   * @throws {UserNotFound}
   */
  async findById(id) {
    const user = await UserModel.findById(id);
    if (!user) throw new UserNotFound(id);
    return user;
  }
}

export default new UserService();
