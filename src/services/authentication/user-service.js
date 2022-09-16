import UserModel from '../../models/user-model.js';

class UserService {
  async findByUsername(username) {
    return await UserModel.findByUsername(username);
  }

  async findById(id) {
    return await UserModel.findById(id);
  }
}

export default new UserService();
