import DefaultRoles from "../config/default-roles.js";
import AuthenticationService from "../services/authentication/authentication-service.js";
import UseCaseError from "../services/server/use-case-error.js";

// TODO remove this dependency, rewrite it to some helper or maybe just private method
import { ExtractJwt } from "passport-jwt";

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
    try {
      const token = ExtractJwt.fromAuthHeaderAsBearerToken()(request);
      return AuthenticationService.verifyToken(token);
    } catch (e) {
      throw new AuthenticationError(e);
    }
  }
}

export default new AuthenticationMiddleware();
