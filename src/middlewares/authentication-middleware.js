import DefaultRoles from "../config/default-roles.js";
import AuthenticationService from "../services/authentication/authentication-service.js";
import UseCaseError from "../services/server/use-case-error.js";

/** Error thrown when a valid JWT is not present on a protected route. */
class UserNotAuthenticated extends UseCaseError {
  constructor(cause) {
    super("User is not authenticated.", { cause }, 401);
  }
}

/**
 * Middleware that extracts and verifies the JWT `Bearer` token from the
 * `Authorization` header. Creates a {@link Session} on `req.ucEnv.session`.
 * Public routes are skipped automatically.
 */
class AuthenticationMiddleware {
  ORDER = -400;

  /**
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   * @returns {Promise<void>}
   */
  async process(req, res, next) {
    if (!this._shouldBeAuthenticated(req)) {
      return next();
    }

    req.ucEnv.session = await this._authenticate(req);

    next();
  }

  _shouldBeAuthenticated(req) {
    const roles = req.ucEnv.mapping.roles;
    return !roles.includes(DefaultRoles.public);
  }

  async _authenticate(request) {
    const token = this._extractToken(request);

    try {
      return AuthenticationService.verifyToken(token);
    } catch (e) {
      throw new UserNotAuthenticated(e);
    }
  }

  _extractToken(request) {
    let authHeader = request.get("authorization");
    if (!authHeader) {
      throw new UserNotAuthenticated("Header 'authorization' was not found.");
    }

    if (!authHeader.startsWith("Bearer ")) {
      throw new UserNotAuthenticated("Header 'authorization' has invalid type, it should be Bearer type.");
    }

    return authHeader.substring("Bearer ".length);
  }
}

export default new AuthenticationMiddleware();
