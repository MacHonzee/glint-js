import {AbstractModel} from '../services/database/abstract-model.js';

class RefreshTokenModel extends AbstractModel {
  constructor() {
    super(
        {
          token: {
            type: String,
          },
          tid: {
            type: String,
          },
          expiresAt: {
            type: Date,
          },
          user: {
            id: String,
            username: String,
            firstName: String,
            lastName: String,
          },
        },
        {timestamps: false},
    );
  }

  static async buildIndexes() {
    await this.schema.index({tid: 1});
    await this.schema.index({expiresAt: 1}, {expireAfterSeconds: 0});
    return await this.syncIndexes();
  }
}

export default new RefreshTokenModel().createModel('AUTH');
