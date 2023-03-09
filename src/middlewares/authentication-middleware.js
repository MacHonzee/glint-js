import DefaultRoles from "../config/default-roles.js";
import AuthenticationService from "../services/authentication/authentication-service.js";
import UseCaseError from "../services/server/use-case-error.js";

class AuthenticationError extends UseCaseError {
  constructor(cause) {
    super("User is not authenticated.", "userNotAuthenticated", { cause }, 401);
  }
}

class AuthenticationMiddleware {
  ORDER = -400;

  async process(req, res, next) {
    if (!this._shouldBeAuthenticated(req)) {
      return next();
    }

    if (req.ucEnv.session) {
      return next();
    }

    req.ucEnv.session = await this._authenticate(req);

    next();
  }

  _shouldBeAuthenticated(req) {
    const roles = req.ucEnv.mapping.roles || [];
    return !roles.includes(DefaultRoles.public);
  }

  async _authenticate(request) {
    const token = this._extractToken(request);
    if (!token) {
      throw new AuthenticationError("authorization header not found");
    }

    try {
      return AuthenticationService.verifyToken(token);
    } catch (e) {
      throw new AuthenticationError(e);
    }
  }

  _extractToken(request) {
    let authHeader = request.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      return authHeader.substring("Bearer ".length);
    }
  }
}

export default new AuthenticationMiddleware();
