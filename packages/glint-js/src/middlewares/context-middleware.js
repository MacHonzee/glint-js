import UseCaseEnvironment from "../services/server/use-case-environment.js";
import UseCaseError from "../services/server/use-case-error.js";
import RouteRegister from "../services/server/route-register.js";
import LoggerFactory from "../services/logging/logger-factory.js";

class Error404 extends UseCaseError {
  constructor(req) {
    super(
      "Handler for request not found.",
      "handlerNotFound",
      {
        url: req.originalUrl,
      },
      404,
    );
  }
}

class InvalidMethod extends UseCaseError {
  constructor(req, expectedMethod) {
    super(
      "Handler requested with invalid method.",
      "invalidHandlerMethod",
      {
        url: req.originalUrl,
        method: req.method,
        expectedMethod,
      },
      405,
    );
  }
}

class ContextMiddleware {
  // this middleware must be first at all costs
  ORDER = -Infinity;
  logger = LoggerFactory.create("Middleware.Context");

  async process(req, res, next) {
    // TODO we should start some MDC here probably

    if (this.logger.isDebugEnabled()) {
      this.logger.debug(`Path: ${req.path} Method: ${req.method}`);
    }

    // prepare ucEnv to collect any custom attributes (mapping, dtoIn, session so far)
    const ucEnv = new UseCaseEnvironment(req, res);
    req.ucEnv = ucEnv;

    const route = RouteRegister.getRoute(ucEnv.uri.useCase);
    if (!route) {
      throw new Error404(req);
    }

    if (route.config.method !== req.method.toLowerCase()) {
      throw new InvalidMethod(req, route.config.method);
    }

    ucEnv.mapping = route.config;

    next();
  }
}

export default new ContextMiddleware();
