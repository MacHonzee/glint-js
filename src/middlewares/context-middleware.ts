import type { Request, Response, NextFunction } from "express";
import UseCaseEnvironment from "../services/server/use-case-environment.js";
import UseCaseError from "../services/server/use-case-error.js";
import RouteRegister from "../services/server/route-register.js";
import LoggerFactory from "../services/logging/logger-factory.js";

/**
 * Error thrown when no route handler is found for the request
 */
class HandlerNotFound extends UseCaseError {
  constructor(req: Request) {
    super(
      "Handler for request not found.",
      {
        url: req.originalUrl,
      },
      404,
    );
  }
}

/**
 * Error thrown when route is called with wrong HTTP method
 */
class InvalidHandlerMethod extends UseCaseError {
  constructor(req: Request, expectedMethod: string) {
    super(
      "Handler requested with invalid method.",
      {
        url: req.originalUrl,
        method: req.method,
        expectedMethod,
      },
      405,
    );
  }
}

/**
 * Extended request with ucEnv
 */
interface RequestWithUcEnv extends Request {
  ucEnv: UseCaseEnvironment;
}

/**
 * Context middleware that initializes request context.
 * This is the first middleware in the chain and sets up the use case environment.
 *
 * Order: -Infinity (runs first, always)
 *
 * Responsibilities:
 * 1. Creates UseCaseEnvironment (ucEnv) for the request
 * 2. Resolves route configuration from RouteRegister
 * 3. Validates HTTP method matches route definition
 * 4. Attaches route mapping to ucEnv
 * 5. Logs request details (in debug mode)
 *
 * The ucEnv object contains:
 * - dtoIn: Merged input data (query + body + files)
 * - uri: Parsed request URI
 * - mapping: Route configuration
 * - session: User session (added by AuthenticationMiddleware)
 * - authorizationResult: Authorization decision (added by AuthorizationMiddleware)
 */
class ContextMiddleware {
  /** Middleware execution order (must be first) */
  ORDER = -Infinity;

  private logger = LoggerFactory.create("Middleware.Context");

  /**
   * Initializes request context and validates route.
   * @param req - Express request
   * @param res - Express response
   * @param next - Next middleware function
   */
  async process(req: Request, res: Response, next: NextFunction): Promise<void> {
    // TODO: Start MDC (Mapped Diagnostic Context) here for distributed tracing

    if (this.logger.isDebugEnabled()) {
      this.logger.debug(`Path: ${req.path} Method: ${req.method}`);
    }

    // Prepare ucEnv to collect custom attributes (mapping, dtoIn, session)
    const ucEnv = new UseCaseEnvironment(req, res);
    (req as RequestWithUcEnv).ucEnv = ucEnv;

    const route = RouteRegister.getRoute(ucEnv.uri.useCase);
    if (!route) {
      throw new HandlerNotFound(req);
    }

    if (route.config.method !== req.method.toLowerCase()) {
      throw new InvalidHandlerMethod(req, route.config.method);
    }

    ucEnv.mapping = route.config;

    next();
  }
}

export default new ContextMiddleware();
