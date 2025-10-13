import path from "path";
import Config from "../utils/config.js";
import type { Request, Response, NextFunction } from "express";
import type { RouteMapping } from "../../config/mappings.js";
import type UseCaseEnvironment from "./use-case-environment.js";

/**
 * Valid HTTP methods for route registration
 */
const ALLOWED_METHODS = ["get", "post", "patch", "put", "delete", "head"] as const;
type AllowedMethod = (typeof ALLOWED_METHODS)[number];

/**
 * Extended request type with use case environment
 */
interface RequestWithUcEnv extends Request {
  ucEnv: UseCaseEnvironment;
}

/**
 * Internal route storage structure
 */
interface StoredRoute {
  /** Normalized URL path */
  url: string;
  /** Normalized HTTP method */
  method: AllowedMethod;
  /** Wrapped controller function */
  controller: (req: Request, res: Response, next: NextFunction) => Promise<void>;
  /** Original route configuration */
  config: RouteMapping;
}

/**
 * Route registry that manages all application routes.
 * Handles route discovery, validation, registration, and controller wrapping.
 *
 * Features:
 * - Automatic discovery of routes from both library and application mappings
 * - Route validation (method, controller, roles)
 * - Controller wrapping with error handling
 * - URL and method normalization
 *
 * The RouteRegister follows a self-discovery pattern, automatically loading:
 * 1. Built-in routes from glint-js/config/mappings.js
 * 2. Application routes from {SERVER_ROOT}/app/config/mappings.js
 */
class RouteRegister {
  private _routes: Record<string, StoredRoute> = {};

  /**
   * Initializes the route register by discovering and loading all route mappings.
   * This method must be called after database connection is established,
   * as route handlers may depend on database models.
   */
  async init(): Promise<void> {
    // Initialize all common routes - must be loaded dynamically because the database
    // connection must be established first to properly create models
    const Mappings = await import("../../config/mappings.js");
    this._registerRoutesFromMappings(Mappings.default);

    // Self-discovery of app's routes
    const appMappingsPath = path.join(Config.SERVER_ROOT, "app", "config", "mappings.js");
    try {
      const appMappings = await import("file://" + appMappingsPath);
      this._registerRoutesFromMappings(appMappings.default);
    } catch (error: any) {
      // Application mappings are optional - only warn if file should exist
      if (error.code !== "ERR_MODULE_NOT_FOUND") {
        throw error;
      }
    }
  }

  /**
   * Registers routes from a mappings object.
   * @param mappings - Object containing route URL keys and config values
   * @private
   */
  private _registerRoutesFromMappings(mappings: Record<string, RouteMapping>): void {
    for (const [url, config] of Object.entries(mappings)) {
      this.registerRoute(url, config);
    }
  }

  /**
   * Wraps a controller method with error handling and result sending.
   * The wrapped controller extracts the use case environment from the request,
   * calls the original controller, sends the result, and forwards errors to Express error handler.
   * @param controllerMethod - The original controller method (can be Express-style or use-case-style)
   * @private
   */
  private _wrapController(controllerMethod: any): (req: Request, res: Response, next: NextFunction) => Promise<void> {
    return async function handleController(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        const reqWithUcEnv = req as RequestWithUcEnv;
        // Check if it's a use-case style controller (1 param) or Express-style (3 params)
        if (controllerMethod.length === 1) {
          const result = await controllerMethod(reqWithUcEnv.ucEnv);
          res.send(result);
        } else {
          await controllerMethod(req, res, next);
        }
      } catch (e) {
        next(e);
      }
    };
  }

  /**
   * Gets all registered routes.
   * @returns Array of all stored routes
   */
  getRoutes(): StoredRoute[] {
    return Object.values(this._routes);
  }

  /**
   * Gets a specific route by its URL.
   * @param routeUrl - The route URL (will be normalized)
   * @returns The stored route, or undefined if not found
   */
  getRoute(routeUrl: string): StoredRoute | undefined {
    const normalizedUrl = this._normalizeUrl(routeUrl);
    return this._routes[normalizedUrl];
  }

  /**
   * Registers a route to the route register.
   * The route will be validated and stored for use in ContextMiddleware for route resolution.
   * @param url - The route URL path
   * @param config - The route configuration (method, controller, roles)
   */
  registerRoute(url: string, config: RouteMapping): void {
    this._validateRoute(url, config);

    const normalizedUrl = this._normalizeUrl(url);
    const method = this._normalizeMethod(config.method);

    this._routes[normalizedUrl] = {
      url: normalizedUrl,
      method,
      controller: this._wrapController(config.controller),
      config,
    };
  }

  /**
   * Normalizes a URL by ensuring it starts with a forward slash.
   * @param url - The URL to normalize
   * @private
   */
  private _normalizeUrl(url: string): string {
    if (url.startsWith("/")) return url;
    return "/" + url;
  }

  /**
   * Normalizes an HTTP method to lowercase.
   * @param method - The HTTP method to normalize
   * @private
   */
  private _normalizeMethod(method: string): AllowedMethod {
    return method.toLowerCase() as AllowedMethod;
  }

  /**
   * Validates route configuration before registration.
   * @param url - The route URL
   * @param config - The route configuration
   * @throws Error if validation fails
   * @private
   */
  private _validateRoute(url: string, config: RouteMapping): void {
    if (typeof url !== "string") {
      throw new Error(`Url '${url}' is not of string type.`);
    }
    if (typeof config !== "object") {
      throw new Error(`Route configuration '${JSON.stringify(config)}' is not of object type.`);
    }
    if (!ALLOWED_METHODS.includes(config.method as any)) {
      throw new Error(`Route method '${config.method}' is not one of allowed methods: ${ALLOWED_METHODS.join(",")}`);
    }
    if (typeof config.controller !== "function") {
      throw new Error(`Route controller '${config.controller}' is not of function type.`);
    }
    if (!Array.isArray(config.roles)) {
      throw new Error(`Route roles ${JSON.stringify(config.roles)} are not of Array type.`);
    }
  }
}

export default new RouteRegister();
export type { StoredRoute, RequestWithUcEnv };
