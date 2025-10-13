import express, { Express, Request, Response, NextFunction, ErrorRequestHandler, RequestHandler } from "express";
import fs from "fs";
import path from "path";
import cors from "cors";
import compression from "compression";
import fileUpload from "express-fileupload";
import helmet from "helmet";
import { Server as HttpServer } from "http";

import Config from "../utils/config.js";
import LoggerFactory from "../logging/logger-factory.js";
import RouteRegister from "./route-register.js";
import MongoClient from "../database/mongo-client.js";
import ValidationService from "../validation/validation-service.js";
import AuthenticationService from "../authentication/authentication-service.js";
import UseCaseError from "./use-case-error.js";

/**
 * Error thrown when a request is blocked by CORS policy
 */
class BlockedByCors extends UseCaseError {
  constructor() {
    super("Request was blocked by CORS policy.");
  }
}

/**
 * Middleware class interface for dynamic middleware loading
 */
interface MiddlewareClass {
  ORDER: number;
  process: RequestHandler | ErrorRequestHandler;
  constructor: { name: string };
}

/**
 * Main server class that configures and starts the Express application.
 * Handles middleware registration, route discovery, database initialization,
 * and server lifecycle management.
 *
 * Features:
 * - Automatic middleware discovery and registration from both library and app
 * - Automatic route discovery and registration
 * - Built-in security (helmet, CORS)
 * - File upload support
 * - Compression
 * - Authentication and authorization setup
 * - MongoDB connection management
 * - Validation service initialization
 *
 * The server follows a self-discovery pattern for middlewares:
 * 1. App-specific middlewares from {SERVER_ROOT}/app/middlewares/
 * 2. Library middlewares from glint-js/src/middlewares/
 */
class Server {
  /** Express application instance */
  app: Express = express();

  /** Logger for server startup and lifecycle events */
  logger = LoggerFactory.create("Server.Startup");

  /** Server port number (from config or default 56123) */
  port: number = Config.PORT || 56123;

  /** HTTP server instance (available after start()) */
  server?: HttpServer;

  /**
   * Starts the server and listens on the configured port.
   * Initializes all services, middlewares, and routes before listening.
   * @returns The server instance for chaining
   */
  async start(): Promise<Server> {
    await this._onBeforeStart();
    this.server = this.app.listen(this.port, () => {
      void this._onAfterStart();
    });
    return this;
  }

  /**
   * Stops the server gracefully.
   */
  async stop(): Promise<void> {
    if (this.server) {
      await new Promise<void>((resolve, reject) => {
        this.server!.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
  }

  /**
   * Lifecycle hook executed before server starts.
   * Initializes all services, middlewares, and routes in the correct order.
   * @private
   */
  private async _onBeforeStart(): Promise<void> {
    await this._logServerStart();
    await ValidationService.init();
    await AuthenticationService.init(true);

    await new MongoClient().init();

    const errorMiddlewares = await this._registerMiddlewares();
    await this._registerRoutes();
    await this._registerErrorMiddlewares(errorMiddlewares);
  }

  /**
   * Logs server and application version information at startup.
   * @private
   */
  private async _logServerStart(): Promise<void> {
    const pkgJsonPath = path.join(Config.GLINT_ROOT, "package.json");
    const pkgJsonContent = await fs.promises.readFile(pkgJsonPath, "utf8");
    const glintPkgVersion = JSON.parse(pkgJsonContent).version;

    this.logger.info(`Glint.js running in version "${glintPkgVersion}".`);
    this.logger.info(`Application is running in version "${process.env.npm_package_version || "unknown"}".`);
  }

  /**
   * Discovers and registers all routes from RouteRegister.
   * Routes are registered on the Express app with their respective HTTP methods.
   * @private
   */
  private async _registerRoutes(): Promise<void> {
    await RouteRegister.init();
    for (const route of RouteRegister.getRoutes()) {
      const routeMethod = route.method as keyof Express;
      (this.app[routeMethod] as Function)(route.url, route.controller);
      this.logger.info(`Registered route [${route.method.toUpperCase()}] ${route.url}`);
    }
  }

  /**
   * Discovers, validates, and registers all middlewares.
   * Middlewares are sorted by ORDER and categorized into normal and error middlewares.
   *
   * Discovery order:
   * 1. App-specific middlewares from {SERVER_ROOT}/app/middlewares/
   * 2. Library middlewares from glint-js/src/middlewares/
   *
   * @returns Array of error middlewares to be registered after routes
   * @private
   */
  private async _registerMiddlewares(): Promise<MiddlewareClass[]> {
    // Add default Express middlewares
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(compression());
    this.app.use(fileUpload({}));
    this.app.use(helmet());
    this.app.disable("x-powered-by");
    this._registerCorsHandler();
    await AuthenticationService.initCookieParser(this.app);

    const middlewares: MiddlewareClass[] = [];

    // Self-discovery of app middlewares
    const appMiddlewareFldPath = path.join(Config.SERVER_ROOT, "app", "middlewares");
    if (fs.existsSync(appMiddlewareFldPath)) {
      const appEntries = fs.readdirSync(appMiddlewareFldPath);
      for (const entry of appEntries) {
        const middlewareModule = await import("file://" + path.join(appMiddlewareFldPath, entry));
        const middlewareClass = middlewareModule.default as MiddlewareClass;
        middlewares.push(middlewareClass);
      }
    }

    // Self-discovery of library middlewares
    const libMiddlewareFldPath = path.join(Config.GLINT_ROOT, "src", "middlewares");
    const libEntries = fs.readdirSync(libMiddlewareFldPath);
    for (const entry of libEntries) {
      const middlewareModule = await import("file://" + path.join(libMiddlewareFldPath, entry));
      const middlewareClass = middlewareModule.default as MiddlewareClass;
      middlewares.push(middlewareClass);
    }

    // Validate middleware structure
    for (const middlewareClass of middlewares) {
      const middlewareName = middlewareClass.constructor.name;
      if (middlewareClass.ORDER == null) {
        throw new Error("ORDER attribute is not set for middleware " + middlewareName);
      }

      if (!middlewareClass.process) {
        throw new Error(`Middleware ${middlewareName} does not have "process" method defined.`);
      }
    }

    // Sort by ORDER
    middlewares.sort((a, b) => a.ORDER - b.ORDER);

    // Validate unique ORDER values and categorize middlewares
    const preprocessMiddlewares: MiddlewareClass[] = [];
    const errorMiddlewares: MiddlewareClass[] = [];

    middlewares.forEach((middleware, i) => {
      const nextMiddleware = middlewares[i + 1];
      const mdl1Name = middleware.constructor.name;

      if (nextMiddleware && middleware.ORDER === nextMiddleware.ORDER) {
        const mdl2Name = nextMiddleware.constructor.name;
        throw new Error("Found middlewares with same ORDER attribute: " + mdl1Name + ", " + mdl2Name);
      }

      // Categorize based on function arity (parameter count)
      switch (middleware.process.length) {
        case 3:
          // Normal middleware: (req, res, next)
          preprocessMiddlewares.push(middleware);
          break;

        case 4:
          // Error middleware: (err, req, res, next)
          errorMiddlewares.push(middleware);
          break;

        default:
          throw new Error("Invalid length of arguments in middleware " + mdl1Name);
      }
    });

    // Register normal middlewares
    for (const middleware of preprocessMiddlewares) {
      const boundMiddleware = middleware.process.bind(middleware) as RequestHandler;
      this.app.use(boundMiddleware);
      this.logger.info(`Registered middleware [${middleware.ORDER}] ${middleware.constructor.name}`);
    }

    return errorMiddlewares;
  }

  /**
   * Registers error middlewares after routes.
   * Error middlewares handle exceptions thrown during request processing.
   * @param errorMiddlewares - Array of error middleware classes
   * @private
   */
  private async _registerErrorMiddlewares(errorMiddlewares: MiddlewareClass[]): Promise<void> {
    for (const middleware of errorMiddlewares) {
      const boundErrorMiddleware = middleware.process.bind(middleware) as ErrorRequestHandler;
      this.app.use(boundErrorMiddleware);
      this.logger.info(`Registered error middleware [${middleware.ORDER}] ${middleware.constructor.name}`);
    }
  }

  /**
   * Registers CORS handler with whitelist-based origin validation.
   * CORS whitelist is configured via CORS_WHITELIST environment variable (comma-separated URLs).
   * @private
   */
  private _registerCorsHandler(): void {
    const whitelist = Config.get("CORS_WHITELIST")?.split(",") || [];
    const corsOptions: cors.CorsOptions = {
      origin: (origin, callback) => {
        const normalizedOrigin = origin ? origin.replace(/\/$/, "") : "";
        if (!origin || whitelist.includes(normalizedOrigin)) {
          callback(null, true);
        } else {
          callback(new BlockedByCors());
        }
      },

      credentials: true,
      maxAge: 86400,
      preflightContinue: true,
      exposedHeaders: ["X-Csrf-Token"],
    };

    this.app.use(cors(corsOptions));

    // Handle OPTIONS requests with caching
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.method === "OPTIONS") {
        res.setHeader("Cache-Control", "public, max-age=86400");
        // No Vary required: cors sets it automatically
        res.end();
      } else {
        next();
      }
    });
  }

  /**
   * Lifecycle hook executed after server starts listening.
   * @private
   */
  private async _onAfterStart(): Promise<void> {
    this.logger.info("Application is running on address http://localhost:" + this.port);
  }
}

export default Server;
