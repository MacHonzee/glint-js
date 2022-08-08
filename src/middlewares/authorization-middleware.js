import AuthorizationService from '../services/authorization/authorization-service.js';
import DefaultRoles from '../config/default-roles.js';
import UseCaseError from '../services/server/use-case-error.js';

class AuthorizationError extends UseCaseError {
  constructor(authorizationResult) {
    super(
        'User is not authorized for given route.',
        'userNotAuthorized',
        authorizationResult,
        403,
    );
  }
}

class AuthorizationMiddleware {
  constructor() {
    this.ORDER = -300;
  }

  async process(req, res, next) {
    if (!this._shouldBeAuthorized(req)) {
      next();
      return;
    }

    const {uri, session} = req.ucEnv;
    const authorizationResult = await AuthorizationService.authorize(uri.useCase, session.user.username);
    req.ucEnv.authorizationResult = authorizationResult;

    if (!authorizationResult.authorized) {
      throw new AuthorizationError(authorizationResult);
    }

    next();
  }

  // Authenticated and Public requests can be skipped
  _shouldBeAuthorized(req) {
    const roles = req.ucEnv.mapping.roles || [];
    return !roles.includes(DefaultRoles.public);
  }
}

export default new AuthorizationMiddleware();
