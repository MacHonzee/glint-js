import DefaultRoles from '../config/default-roles.js';
import AuthenticationService from '../services/authentication/authentication-service.js';
import UseCaseError from '../services/server/use-case-error.js';

class AuthenticationError extends UseCaseError {
  constructor(cause) {
    super(
        'User is not authenticated.',
        'userNotAuthenticated',
        {cause},
        401,
    );
  }
}

class AuthenticationMiddleware {
  constructor() {
    this.ORDER = -400;
  }

  async process(req, res, next) {
    if (!this._shouldBeAuthenticated(req)) {
      return next();
    }

    if (req.ucEnv.session) {
      return next();
    }

    let user;
    try {
      user = await this._authenticate(req.headers);
    } catch (e) {
      throw new AuthenticationError(e);
    }

    req.ucEnv.session = {
      user,
    };

    next();
  }

  _shouldBeAuthenticated(req) {
    const roles = req.ucEnv.mapping.roles || [];
    return !roles.includes(DefaultRoles.public);
  }

  // here we call middleware explicitly because we need more control
  // TODO check if there is a better way
  async _authenticate(headers) {
    const fakeRequest = {
      headers: headers,
    };

    await new Promise((resolve, reject) => {
      const fakeResponse = {
        end(cause) {
          reject(cause);
        },
      };

      AuthenticationService.verifyUser()(fakeRequest, fakeResponse, resolve);
    });

    return fakeRequest.user;
  }
}

export default new AuthenticationMiddleware();
