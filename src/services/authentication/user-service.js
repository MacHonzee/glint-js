import UserModel from "../../models/user-model.js";
import UseCaseError from "../server/use-case-error.js";

class UserNotFound extends UseCaseError {
  constructor(userOrId) {
    super("User with given username / id was not found.", "userNotFound", { user: userOrId, id: userOrId });
  }
}

class UserService {
  ERRORS = {
    UserNotFound,
  };

  async findByUsername(username) {
    const user = await UserModel.findByUsername(username);
    if (!user) throw new UserNotFound(username);
    return user;
  }

  async findById(id) {
    const user = await UserModel.findById(id);
    if (!user) throw new UserNotFound(id);
    return user;
  }
}

export default new UserService();
