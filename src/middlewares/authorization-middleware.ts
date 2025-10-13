import type { Request, Response, NextFunction } from "express";
import AuthorizationService from "../services/authorization/authorization-service.js";
import DefaultRoles from "../config/default-roles.js";
import UseCaseError from "../services/server/use-case-error.js";
import type AuthorizationResult from "../services/authorization/authorization-result.js";

/**
 * Error thrown when user lacks required permissions
 */
class UserNotAuthorized extends UseCaseError {
  constructor(authorizationResult: AuthorizationResult) {
    super("User is not authorized for given route.", authorizationResult as any, 403);
  }
}

/**
 * Extended request with ucEnv
 */
interface RequestWithUcEnv extends Request {
  ucEnv: any;
}

/**
 * Authorization middleware for role-based access control.
 * Checks if authenticated users have required roles for the route.
 *
 * Order: -300 (runs after authentication, before route handler)
 *
 * Flow:
 * 1. Checks if route requires authorization
 * 2. Retrieves user's roles from AuthorizationService
 * 3. Verifies user has at least one required role
 * 4. Attaches authorization result to request.ucEnv
 *
 * Public routes skip authorization.
 * "Authenticated" role grants access to all logged-in users.
 */
class AuthorizationMiddleware {
  /** Middleware execution order (negative = early) */
  ORDER = -300;

  /**
   * Processes authorization for incoming requests.
   * @param req - Express request
   * @param _res - Express response (unused)
   * @param next - Next middleware function
   */
  async process(req: Request, _res: Response, next: NextFunction): Promise<void> {
    const reqWithUcEnv = req as RequestWithUcEnv;

    if (!this._shouldBeAuthorized(reqWithUcEnv)) {
      return next();
    }

    const { uri, session } = reqWithUcEnv.ucEnv;
    const authorizationResult = await AuthorizationService.authorize(uri.useCase, session.user.username);
    reqWithUcEnv.ucEnv.authorizationResult = authorizationResult;

    if (!authorizationResult.authorized) {
      throw new UserNotAuthorized(authorizationResult);
    }

    next();
  }

  /**
   * Checks if the route requires authorization.
   * Public routes and "authenticated" routes skip role checking.
   * @param req - Request with ucEnv
   * @private
   */
  private _shouldBeAuthorized(req: RequestWithUcEnv): boolean {
    const roles = req.ucEnv.mapping.roles;
    return !roles.includes(DefaultRoles.public);
  }
}

export default new AuthorizationMiddleware();
