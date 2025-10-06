import { AbstractModel } from "../services/database/abstract-model.js";

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

  static async findByToken(token) {
    return await this.findOne({ tid: token }).lean();
  }

  static async updateByToken(token, tokenData) {
    return await this.updateOne({ tid: token }, tokenData);
  }

  static async deleteByToken(token) {
    return await this.deleteOne({ tid: token });
  }

  static async deleteByUsername(username) {
    return await this.deleteMany({ "user.username": username });
  }

  static async buildIndexes() {
    await this.schema.index({ tid: 1 });
    await this.schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    return await this.syncIndexes();
  }
}

const refreshTokenModel = new RefreshTokenModel();
export default await refreshTokenModel.createModel("AUTH", "PRIMARY");
