import AuthorizationService from "../services/authorization/authorization-service.js";
import DefaultRoles from "../config/default-roles.js";
import UseCaseError from "../services/server/use-case-error.js";

/** Error thrown when the user lacks the required role for the use case. */
class UserNotAuthorized extends UseCaseError {
  constructor(authorizationResult) {
    super("User is not authorized for given route.", authorizationResult, 403);
  }
}

/**
 * Middleware that verifies the authenticated user has the required roles for
 * the matched route. Public routes are skipped automatically.
 */
class AuthorizationMiddleware {
  ORDER = -300;

  /**
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   * @returns {Promise<void>}
   */
  async process(req, res, next) {
    if (!this._shouldBeAuthorized(req)) {
      return next();
    }

    const { uri, session } = req.ucEnv;
    const authorizationResult = await AuthorizationService.authorize(uri.useCase, session.user.username);
    req.ucEnv.authorizationResult = authorizationResult;

    if (!authorizationResult.authorized) {
      throw new UserNotAuthorized(authorizationResult);
    }

    next();
  }

  // Authenticated and Public requests can be skipped
  _shouldBeAuthorized(req) {
    const roles = req.ucEnv.mapping.roles;
    return !roles.includes(DefaultRoles.public);
  }
}

export default new AuthorizationMiddleware();
