import UseCaseEnvironment from '../services/server/use-case-environment.js';
import UseCaseError from '../services/server/use-case-error.js';
import RouteRegister from '../services/server/route-register.js';
import LoggerFactory from '../services/logging/logger-factory.js';

class Error404 extends UseCaseError {
  constructor(req) {
    super(
        'Handler for request not found.',
        'handlerNotFound',
        {
          url: req.originalUrl,
        },
        404,
    );
  }
}

class InvalidMethod extends UseCaseError {
  constructor(req) {
    super(
        'Handler requested with invalid method.',
        'invalidHandlerMethod',
        {
          url: req.originalUrl,
          method: req.method,
        },
        405,
    );
  }
}

class ContextMiddleware {
  // this middlewares must be first at all costs
  ORDER = -Infinity;
  logger = LoggerFactory.create('Context.Middleware');

  async process(req, res, next) {
    // TODO we should start some MDC here probably

    if (this.logger.isDebugEnabled()) {
      this.logger.debug(`Path: ${req.path} Method: ${req.method}`);
    }

    // prepare ucEnv to collect any custom attributes (mapping, dtoIn, session so far)
    const ucEnv = new UseCaseEnvironment(req, res);
    req.ucEnv = ucEnv;
    const route = RouteRegister.getRoute(ucEnv.uri.useCase);

    // TODO decide whether it is not command-related (ie. static resources), then process it correctly

    if (!route) {
      throw new Error404(req);
    }

    if (route.config.method !== req.method.toLowerCase()) {
      throw new InvalidMethod(req);
    }

    ucEnv.mapping = route.config;

    next();
  }
}

export default new ContextMiddleware();
