import passportLocalMongoose from 'passport-local-mongoose';

import {AbstractModel} from '../services/database/abstract-model.js';

class UserModel extends AbstractModel {
  constructor() {
    super(
        // passport adds username and password by default
        {
          firstName: {
            type: String,
          },
          lastName: {
            type: String,
          },
          authStrategy: {
            type: String,
            default: 'local',
          },
          language: {
            type: String,
            default: 'cs',
          },
        },
        {timestamps: true},
    );

    this.schema.plugin(passportLocalMongoose);

    // Remove refreshToken from the response
    this.schema.set('toJSON', {
      transform: function(doc, ret, options) {
        delete ret.refreshTokens;
        delete ret.salt;
        delete ret.hash;
        return ret;
      },
    });
  }

  static async buildIndexes() {
    await this.schema.index({username: 1}, {unique: true});
    return await this.syncIndexes();
  }
}

export default new UserModel().createModel('AUTH');
