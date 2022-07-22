import express from 'express';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

import LoggerFactory from './logger-factory.js';
import RouteRegister from './route-register.js';
import MongoClient from './mongo-client.js';
import ValidationService from './validation-service.js';

class Server {
  constructor() {
    this.app = express();
    this.logger = LoggerFactory.create('Server.Startup');
  }

  async start() {
    await this._onBeforeStart();
    this.app.listen(process.env.PORT, () => this._onAfterStart());
  }

  async _onBeforeStart() {
    this._initAppRoot();
    this._initDotenv();
    const errorMiddlewares = await this._registerMiddlewares();
    await this._registerRoutes();
    await this._registerErrorMiddlewares(errorMiddlewares);
    await ValidationService.init();
    await MongoClient.init();
  }

  _initAppRoot() {
    // and then we also save root of server
    process.env.SERVER_ROOT = process.cwd();
  }

  _initDotenv() {
    const mode = process.env.NODE_ENV;
    const envPath = path.join(process.env.SERVER_ROOT, 'env', mode + '.env');
    if (!fs.existsSync(envPath)) {
      throw new Error('Unable to load .env file for runtime mode: ' + mode);
    }

    dotenv.config({path: envPath});
  }

  async _registerRoutes() {
    await RouteRegister.init();
    for (const route of RouteRegister.getRoutes()) {
      this.app[route.method](route.url, route.controller);
      this.logger.info(`Registered route ${route.url} [${route.method}]`);
    }
  }

  async _registerMiddlewares() {
    this.app.use(express.json());
    this.app.use(express.urlencoded({extended: true}));

    const middlewares = [];

    // self-discovery of app middlewares
    const appMiddlewareFldPath = path.join(process.env.SERVER_ROOT, 'app', 'middlewares');
    const appEntries = fs.readdirSync(appMiddlewareFldPath);
    for (const entry of appEntries) {
      const middlewareClass = (await import('file://' + path.join(appMiddlewareFldPath, entry))).default;
      middlewares.push(middlewareClass);
    }

    // self-discovery of library middlewares
    const libMiddlewareFldPath = path.join(import.meta.url.replace('file:///', ''), '..', '..', 'middlewares');
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

  async _onAfterStart() {
    this.logger.info('Application is running on address http://localhost:' + process.env.PORT);
  }
}

export default Server;
