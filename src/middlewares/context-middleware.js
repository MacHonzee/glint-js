import UseCaseEnvironment from '../services/server/use-case-environment.js';
import RouteRegister from '../services/server/route-register.js';

class Error404 extends Error {
  constructor(req) {
    super();
    this.message = 'Handler for request not found.';
    this.code = 'energy-kit/handlerNotFound';
    this.params = {
      url: req.originalUrl,
    };
    this.status = 404;
  }
}

class InvalidMethod extends Error {
  constructor(req) {
    super();
    this.message = 'Handler requested with invalid method.';
    this.code = 'energy-kit/invalidHandlerMethod';
    this.params = {
      url: req.originalUrl,
      method: req.method,
    };
    this.status = 400;
  }
}

class ContextMiddleware {
  constructor() {
    // this middlewares must be first at all costs
    this.ORDER = -999;
  }

  async process(req, res, next) {
    console.log('Incoming req', req.path);

    // prepare ucEnv to collect any custom attributes (mapping, dtoIn, session so far)
    const ucEnv = new UseCaseEnvironment(req, res);
    req.ucEnv = ucEnv;
    const route = RouteRegister.getRoute(ucEnv.uri.useCase);

    // TODO filter out anything that is not command-related (ie. static resources)
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
