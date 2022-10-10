import express from 'express';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import compression from 'compression';

import Config from '../utils/config.js';
import LoggerFactory from '../logging/logger-factory.js';
import RouteRegister from './route-register.js';
import MongoClient from '../database/mongo-client.js';
import ValidationService from '../validation/validation-service.js';
import AuthenticationService from '../authentication/authentication-service.js';
import UseCaseError from './use-case-error.js';

class CorsError extends UseCaseError {
  constructor() {
    super('Request was blocked by CORS policy.', 'blockedByCors');
  }
}

class Server {
  app = express();
  logger = LoggerFactory.create('Server.Startup');
  port = Config.PORT || 8080;

  async start() {
    await this._onBeforeStart();
    this.app.listen(this.port, () => this._onAfterStart());
  }

  async _onBeforeStart() {
    await ValidationService.init();
    await AuthenticationService.init(this.app);

    await new MongoClient().init();

    const errorMiddlewares = await this._registerMiddlewares();
    await this._registerRoutes();
    await this._registerErrorMiddlewares(errorMiddlewares);
  }

  async _registerRoutes() {
    await RouteRegister.init();
    for (const route of RouteRegister.getRoutes()) {
      this.app[route.method](route.url, route.controller);
      this.logger.info(`Registered route [${route.method}] ${route.url}`);
    }
  }

  async _registerMiddlewares() {
    // add some default middlewares
    this.app.use(express.json());
    this.app.use(express.urlencoded({extended: true}));
    this.app.use(compression());
    this.app.disable('x-powered-by');
    this._registerCorsHandler();
    await AuthenticationService.initCookieParser(this.app);
    this._registerStaticHandler();

    // TODO consider using helmet middleware for security

    const middlewares = [];

    // self-discovery of app middlewares
    const appMiddlewareFldPath = path.join(Config.SERVER_ROOT, 'app', 'middlewares');
    if (fs.existsSync(appMiddlewareFldPath)) {
      const appEntries = fs.readdirSync(appMiddlewareFldPath);
      for (const entry of appEntries) {
        const middlewareClass = (await import('file://' + path.join(appMiddlewareFldPath, entry))).default;
        middlewares.push(middlewareClass);
      }
    }

    // self-discovery of library middlewares
    const libMiddlewareFldPath = path.join(Config.GLINT_ROOT, 'src', 'middlewares');
    const libEntries = fs.readdirSync(libMiddlewareFldPath);
    for (const entry of libEntries) {
      const middlewareClass = (await import('file://' + path.join(libMiddlewareFldPath, entry))).default;
      middlewares.push(middlewareClass);
    }

    // check structure of middlewares and sort them by ORDER
    for (const middlewareClass of middlewares) {
      const mdlwrName = middlewareClass.constructor.name;
      if (middlewareClass.ORDER == null) {
        throw new Error('ORDER attribute is not set for middleware ' + mdlwrName);
      }

      if (!middlewareClass.process) {
        throw new Error(`Middleware ${mdlwrName} does not have "process" method defined.`);
      }
    }
    middlewares.sort((a, b) => a.ORDER - b.ORDER);

    // check that no middlewares have same order and sort them to "normal" and "error" middlewares
    const preprocessMiddlewares = [];
    const errorMiddlewares = [];
    middlewares.forEach((middleware, i) => {
      const nextMiddleware = middlewares[i + 1];
      const mdl1Name = middleware.constructor.name;
      if (nextMiddleware && middleware.ORDER === nextMiddleware.ORDER) {
        const mdl2Name = nextMiddleware.constructor.name;
        throw new Error('Found middlewares with same ORDER attribute: ' + mdl1Name + ', ' + mdl2Name);
      }

      switch (middleware.process.length) {
        case 3:
          preprocessMiddlewares.push(middleware);
          break;

        case 4:
          errorMiddlewares.push(middleware);
          break;

        default:
          throw new Error('Invalid length of arguments in middleware ' + mdl1Name);
      }
    });

    // then register them to app
    for (const middleware of preprocessMiddlewares) {
      this.app.use(middleware.process.bind(middleware));
      this.logger.info(`Registered middleware [${middleware.ORDER}] ${middleware.constructor.name}`);
    }

    return errorMiddlewares;
  }

  async _registerErrorMiddlewares(errorMiddlewares) {
    for (const middleware of errorMiddlewares) {
      this.app.use(middleware.process.bind(middleware));
      this.logger.info(`Registered error middleware [${middleware.ORDER}] ${middleware.constructor.name}`);
    }
  }

  _registerCorsHandler() {
    const whitelist = Config.get('CORS_WHITELIST')?.split(',') || [];
    const corsOptions = {
      origin: (origin, callback) => {
        if (!origin || whitelist.includes(origin)) {
          callback(null, true);
        } else {
          callback(new CorsError());
        }
      },

      credentials: true,
    };

    this.app.use(cors(corsOptions));
  }

  _registerStaticHandler() {
    const staticFld = path.join(Config.SERVER_ROOT, 'build');
    if (fs.existsSync(staticFld)) {
      this.app.use(express.static(staticFld, {immutable: true, maxAge: '1y'}));
    }
  }

  async _onAfterStart() {
    this.logger.info('Application is running on address http://localhost:' + this.port);
  }
}

export default Server;
