import DefaultRoles from '../config/default-roles.js';

class AuthenticationError extends Error {
  constructor(url) {
    super();
    this.message = 'User is not authenticated for given route';
    this.code = 'energy-kit/userNotAuthenticated';
    this.status = 401;
    this.params = {
      url,
    };
  }
}

class AuthenticationMiddleware {
  constructor() {
    this.ORDER = -400;
  }

  async process(req, res, next) {
    // TODO just for test
    req.ucEnv.session = {
      user: {
        identity: '123abc',
        name: 'Jan Rudolf',
      },
    };

    if (!this._shouldBeAuthenticated(req)) {
      return next();
    }

    if (req.ucEnv.session) {
      return next();
    }

    // TODO use passport + session to authenticate based on token and cookies
    next();
  }

  _shouldBeAuthenticated(req) {
    const roles = req.ucEnv.mapping.roles || [];
    return !roles.includes(DefaultRoles.public);
  }
}

export default new AuthenticationMiddleware();
