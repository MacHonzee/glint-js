class UserService {
  constructor() {
    this._userModel = null;
  }

  async findByUsername(username) {
    const userModel = await this._getUserModel();
    return await userModel.findByUsername(username);
  }

  async findById(username) {
    const userModel = await this._getUserModel();
    return await userModel.findById(username);
  }

  // TODO import it at top level after refactoring server.js
  async _getUserModel() {
    if (!this._userModel) {
      this._userModel = (await import('../../models/user-model.js')).default;
    }
    return this._userModel;
  }
}

export default new UserService();
