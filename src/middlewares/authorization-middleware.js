import AuthorizationService from '../services/authorization-service.js';
import DefaultRoles from '../config/default-roles.js';

class AuthorizationError extends Error {
  constructor(authorizationResult) {
    super();
    this.message = 'User is not authorized for given route.';
    this.code = 'energy-kit/userNotAuthorized';
    this.status = 403;
    this.params = authorizationResult;
  }
}

class AuthorizationMiddleware {
  constructor() {
    this.ORDER = -300;
  }

  async process(req, res, next) {
    const authorizationResult = await AuthorizationService.authorize(req.ucEnv.uri.useCase, req.ucEnv.session.user);
    req.ucEnv.authorizationResult = authorizationResult;

    if (!authorizationResult.authorized && this._shouldBeAuthorized(req)) {
      throw new AuthorizationError(authorizationResult);
    }

    next();
  }

  // Authenticated and Public requests can be skipped
  _shouldBeAuthorized(req) {
    const roles = req.ucEnv.mapping.roles || [];
    return !roles.includes(DefaultRoles.authenticated) && !roles.includes(DefaultRoles.public);
  }
}

export default new AuthorizationMiddleware();
