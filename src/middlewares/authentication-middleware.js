import DefaultRoles from "../config/default-roles.js";
import AuthenticationService from "../services/authentication/authentication-service.js";
import UseCaseError from "../services/server/use-case-error.js";

class UserNotAuthenticated extends UseCaseError {
  constructor(cause) {
    super("User is not authenticated.", { cause }, 401);
  }
}

class AuthenticationMiddleware {
  ORDER = -400;

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
