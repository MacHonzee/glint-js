import express from "express";
import fs from "fs";
import path from "path";
import cors from "cors";
import compression from "compression";
import fileUpload from "express-fileupload";
import helmet from "helmet";

import Config from "../utils/config.js";
import LoggerFactory from "../logging/logger-factory.js";
import RouteRegister from "./route-register.js";
import MongoClient from "../database/mongo-client.js";
import ValidationService from "../validation/validation-service.js";
import AuthenticationService from "../authentication/authentication-service.js";
import UseCaseError from "./use-case-error.js";

class BlockedByCors extends UseCaseError {
  constructor() {
    super("Request was blocked by CORS policy.");
  }
}

class Server {
  app = express();
  logger = LoggerFactory.create("Server.Startup");
  port = Config.PORT || 56123;

  async start() {
    await this._onBeforeStart();
    this.server = this.app.listen(this.port, () => this._onAfterStart());
    return this;
  }

  async stop() {
    await this.server.close();
  }

  async _onBeforeStart() {
    await this._logServerStart();
    await ValidationService.init();
    await AuthenticationService.init(true);

    await new MongoClient().init();

    const errorMiddlewares = await this._registerMiddlewares();
    await this._registerRoutes();
    await this._registerErrorMiddlewares(errorMiddlewares);
  }

  async _logServerStart() {
    const pkgJsonPath = path.join(Config.GLINT_ROOT, "package.json");
    const glintPkgVersion = JSON.parse(await fs.promises.readFile(pkgJsonPath, "utf8")).version;

    this.logger.info(`Glint.js running in version "${glintPkgVersion}".`);
    this.logger.info(`Application is running in version "${process.env.npm_package_version}".`);
  }

  async _registerRoutes() {
    await RouteRegister.init();
    for (const route of RouteRegister.getRoutes()) {
      const routeMethod = route.method;
      this.app[routeMethod](route.url, route.controller);
      this.logger.info(`Registered route [${route.method}] ${route.url}`);
    }
  }

  async _registerMiddlewares() {
    // add some default middlewares
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(compression());
    this.app.use(fileUpload({}));
    this.app.use(helmet());
    this.app.disable("x-powered-by");
    this._registerCorsHandler();
    await AuthenticationService.initCookieParser(this.app);

    const middlewares = [];

    // self-discovery of app middlewares
    const appMiddlewareFldPath = path.join(Config.SERVER_ROOT, "app", "middlewares");
    if (fs.existsSync(appMiddlewareFldPath)) {
      const appEntries = fs.readdirSync(appMiddlewareFldPath);
      for (const entry of appEntries) {
        const middlewareClass = (await import("file://" + path.join(appMiddlewareFldPath, entry))).default;
        middlewares.push(middlewareClass);
      }
    }

    // self-discovery of library middlewares
    const libMiddlewareFldPath = path.join(Config.GLINT_ROOT, "src", "middlewares");
    const libEntries = fs.readdirSync(libMiddlewareFldPath);
    for (const entry of libEntries) {
      const middlewareClass = (await import("file://" + path.join(libMiddlewareFldPath, entry))).default;
      middlewares.push(middlewareClass);
    }

    // check structure of middlewares and sort them by ORDER
    for (const middlewareClass of middlewares) {
      const middlewareName = middlewareClass.constructor.name;
      if (middlewareClass.ORDER == null) {
        throw new Error("ORDER attribute is not set for middleware " + middlewareName);
      }

      if (!middlewareClass.process) {
        throw new Error(`Middleware ${middlewareName} does not have "process" method defined.`);
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
        throw new Error("Found middlewares with same ORDER attribute: " + mdl1Name + ", " + mdl2Name);
      }

      switch (middleware.process.length) {
        case 3:
          preprocessMiddlewares.push(middleware);
          break;

        case 4:
          errorMiddlewares.push(middleware);
          break;

        default:
          throw new Error("Invalid length of arguments in middleware " + mdl1Name);
      }
    });

    // then register them to app
    for (const middleware of preprocessMiddlewares) {
      const boundMiddleware = middleware.process.bind(middleware);
      this.app.use(boundMiddleware);
      this.logger.info(`Registered middleware [${middleware.ORDER}] ${middleware.constructor.name}`);
    }

    return errorMiddlewares;
  }

  async _registerErrorMiddlewares(errorMiddlewares) {
    for (const middleware of errorMiddlewares) {
      const boundErrorMiddleware = middleware.process.bind(middleware);
      this.app.use(boundErrorMiddleware);
      this.logger.info(`Registered error middleware [${middleware.ORDER}] ${middleware.constructor.name}`);
    }
  }

  _registerCorsHandler() {
    const whitelist = Config.get("CORS_WHITELIST")?.split(",") || [];
    const corsOptions = {
      origin: (origin, callback) => {
        const normalizedOrigin = origin && origin.replace(/\/$/, "");
        if (!origin || whitelist.includes(normalizedOrigin)) {
          callback(null, true);
        } else {
          callback(new BlockedByCors());
        }
      },

      credentials: true,
      maxAge: 86400,
      preflightContinue: false,
      exposedHeaders: ["X-Csrf-Token"],
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    };

    this.app.use(cors(corsOptions));
    this.app.use((req, res, next) => {
      if (req.method === "OPTIONS") {
        res.setHeader("Cache-Control", "public, max-age=86400");
        // No Vary required: cors sets it already set automatically
        res.end();
      } else {
        next();
      }
    });
  }

  async _onAfterStart() {
    this.logger.info("Application is running on address http://localhost:" + this.port);
  }
}

export default Server;
