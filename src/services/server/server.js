import express from 'express';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import cors from 'cors';

import LoggerFactory from '../logging/logger-factory.js';
import RouteRegister from './route-register.js';
import MongoClient from '../database/mongo-client.js';
import ValidationService from '../validation/validation-service.js';
import AuthenticationService from '../authentication/authentication-service.js';

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

    // it has to be done first in order to properly load mappings etc
    await new MongoClient().init();
    await this._initAuthMongo();

    await ValidationService.init();
    await AuthenticationService.init(this.app);

    const errorMiddlewares = await this._registerMiddlewares();
    await this._registerRoutes();
    await this._registerErrorMiddlewares(errorMiddlewares);
  }

  _initAppRoot() {
    // we save root of the server
    process.env.SERVER_ROOT = process.cwd();

    // and we also save root of the library (dynamically find out nearest package.json)
    let currentDirname = path.dirname(import.meta.url.replace('file:///', ''));
    while (!fs.existsSync(path.join(currentDirname, 'package.json'))) {
      currentDirname = path.join(currentDirname, '..');
    }
    process.env.KIT_LIB_ROOT = path.resolve(currentDirname);
  }

  _initDotenv() {
    const runtimeMode = process.env.NODE_ENV;
    const cloudMode = process.env.CLOUD_ENV;
    const envFileName = cloudMode ? `${runtimeMode}-${cloudMode}` : runtimeMode;

    const envPath = path.join(process.env.SERVER_ROOT, 'env', envFileName + '.env');
    if (!fs.existsSync(envPath)) {
      throw new Error('Unable to load .env file on path: ' + envFileName);
    }

    dotenv.config({path: envPath});
  }

  async _initAuthMongo() {
    try {
      await new MongoClient('AUTH').init();
    } catch (e) {
      this.logger.warn('Could not connect to AUTH MongoDB.', e);
    }
  }

  // async _initModels() {
  //   for (const [modelName, model] of Object.entries(ModelWarehouse));
  // }

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
    this._registerCorsHandler();
    await AuthenticationService.initCookieParser(this.app);

    const middlewares = [];

    // self-discovery of app middlewares
    const appMiddlewareFldPath = path.join(process.env.SERVER_ROOT, 'app', 'middlewares');
    if (fs.existsSync(appMiddlewareFldPath)) {
      const appEntries = fs.readdirSync(appMiddlewareFldPath);
      for (const entry of appEntries) {
        const middlewareClass = (await import('file://' + path.join(appMiddlewareFldPath, entry))).default;
        middlewares.push(middlewareClass);
      }
    }

    // self-discovery of library middlewares
    const libMiddlewareFldPath = path.join(process.env.KIT_LIB_ROOT, 'src', 'middlewares');
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
    let whitelist = process.env.WHITELISTED_DOMAINS?.split(',') || [];
    whitelist = whitelist.concat(['http://localhost:' + process.env.PORT + '/']);

    const corsOptions = {
      origin: (origin, callback) => {
        if (!origin || whitelist.includes(origin)) {
          callback(null, true);
        } else {
          // TODO raise some proper Cors error
          callback(new Error('Not allowed by CORS'));
        }
      },

      credentials: true,
    };

    this.app.use(cors(corsOptions));
  }

  async _onAfterStart() {
    this.logger.info('Application is running on address http://localhost:' + process.env.PORT);
  }
}

export default Server;
