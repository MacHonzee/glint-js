import type { Request, Response, NextFunction } from "express";
import DefaultRoles from "../config/default-roles.js";
import AuthenticationService from "../services/authentication/authentication-service.js";
import UseCaseError from "../services/server/use-case-error.js";

/**
 * Error thrown when user authentication fails
 */
class UserNotAuthenticated extends UseCaseError {
  constructor(cause: string | Error) {
    super("User is not authenticated.", { cause }, 401);
  }
}

/**
 * Extended request with ucEnv
 */
interface RequestWithUcEnv extends Request {
  ucEnv: any;
}

/**
 * Authentication middleware for JWT token validation.
 * Validates Bearer tokens and creates user sessions.
 *
 * Order: -400 (runs early, before authorization)
 *
 * Flow:
 * 1. Checks if route requires authentication (non-public routes)
 * 2. Extracts Bearer token from Authorization header
 * 3. Verifies token with AuthenticationService
 * 4. Attaches session to request.ucEnv
 *
 * Public routes (with DefaultRoles.public) skip authentication.
 */
class AuthenticationMiddleware {
  /** Middleware execution order (negative = early) */
  ORDER = -400;

  /**
   * Processes authentication for incoming requests.
   * @param req - Express request
   * @param _res - Express response (unused)
   * @param next - Next middleware function
   */
  async process(req: Request, _res: Response, next: NextFunction): Promise<void> {
    const reqWithUcEnv = req as RequestWithUcEnv;

    if (!this._shouldBeAuthenticated(reqWithUcEnv)) {
      return next();
    }

    reqWithUcEnv.ucEnv.session = await this._authenticate(reqWithUcEnv);

    next();
  }

  /**
   * Checks if the route requires authentication.
   * Public routes don't require authentication.
   * @param req - Request with ucEnv
   * @private
   */
  private _shouldBeAuthenticated(req: RequestWithUcEnv): boolean {
    const roles = req.ucEnv.mapping.roles;
    return !roles.includes(DefaultRoles.public);
  }

  /**
   * Authenticates the request by verifying the JWT token.
   * @param request - Request object
   * @returns Session object
   * @throws UserNotAuthenticated if token is invalid
   * @private
   */
  private async _authenticate(request: RequestWithUcEnv): Promise<any> {
    const token = this._extractToken(request);

    try {
      return AuthenticationService.verifyToken(token);
    } catch (e) {
      throw new UserNotAuthenticated(e as Error);
    }
  }

  /**
   * Extracts Bearer token from Authorization header.
   * @param request - Request object
   * @returns JWT token string
   * @throws UserNotAuthenticated if header is missing or invalid
   * @private
   */
  private _extractToken(request: RequestWithUcEnv): string {
    const authHeader = request.get("authorization");
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
