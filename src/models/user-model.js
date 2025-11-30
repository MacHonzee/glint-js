import passportLocalMongoose from "passport-local-mongoose";
import mongoose from "mongoose";

import { AbstractModel } from "../services/database/abstract-model.js";

const DEFAULT_PROJECTION = { salt: 0, hash: 0, resetToken: 0 };

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
        return ret;
      },
    });
  }

  static async buildIndexes() {
    await this.schema.index({ username: 1 }, { unique: true });
    return await this.syncIndexes();
  }

  static async list() {
    return await this.find({}, DEFAULT_PROJECTION);
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

  static async safeFindByUsername(username) {
    return await this.findOne({ username }, DEFAULT_PROJECTION);
  }
}

const userModel = new UserModel();
export default await userModel.createModel("AUTH", "PRIMARY");
