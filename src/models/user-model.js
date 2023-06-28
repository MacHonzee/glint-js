import passportLocalMongoose from "passport-local-mongoose";

import { AbstractModel } from "../services/database/abstract-model.js";

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
        return ret;
      },
    });
  }

  static async buildIndexes() {
    await this.schema.index({ username: 1 }, { unique: true });
    return await this.syncIndexes();
  }

  static async list() {
    return await this.find({}, { salt: 0, hash: 0 });
  }

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
          salt: 0,
          hash: 0,
          resetToken: 0,
          "permissions._id": 0,
          "permissions.user": 0,
          "permissions.createdAt": 0,
          "permissions.updatedAt": 0,
          "permissions.__v": 0,
        },
      },
    ]);
  }
}

const userModel = new UserModel();
export default await userModel.createModel("AUTH", "PRIMARY");
