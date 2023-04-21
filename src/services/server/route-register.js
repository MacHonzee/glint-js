import path from "path";
import Config from "../utils/config.js";

const ALLOWED_METHODS = ["get", "post", "patch", "put", "delete", "head"];
/**
 * @typedef {object} RouteConfig
 * @property {ALLOWED_METHODS} method
 * @property {Function} controller
 * @property {Array<string>} roles
 */

class RouteRegister {
  _routes = {};

  async init() {
    // initialize all common routes -> it MUST be loaded dynamically, because the database connection
    // must be established first in order to properly create models
    const Mappings = await import("../../config/mappings.js");
    this._registerRoutesFromMappings(Mappings.default);

    // self-discovery of app's routes
    const appMappingsPath = path.join(Config.SERVER_ROOT, "app", "config", "mappings.js");
    const appMappings = await import("file://" + appMappingsPath);
    this._registerRoutesFromMappings(appMappings.default);
  }

  _registerRoutesFromMappings(mappings) {
    for (const [url, config] of Object.entries(mappings)) {
      this.registerRoute(url, config);
    }
  }

  _wrapController(controllerMethod) {
    return function handleController(req, res) {
      Promise.resolve(controllerMethod(req.ucEnv)).then((result) => res.send(result));
    };
  }

  getRoutes() {
    return Object.values(this._routes);
  }

  getRoute(routeUrl) {
    const normalizedUrl = this._normalizeUrl(routeUrl);
    return this._routes[normalizedUrl];
  }

  /**
   * Method registers route to RouteRegister to be used in ContextMiddleware for route resolution.
   *
   * @param {string} url
   * @param {RouteConfig} config
   */
  registerRoute(url, config) {
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

  _normalizeUrl(url) {
    if (url.startsWith("/")) return url;
    return "/" + url;
  }

  _normalizeMethod(method) {
    return method.toLowerCase();
  }

  _validateRoute(url, config) {
    if (typeof url !== "string") throw new Error(`Url '${url}' is not of string type.`);
    if (typeof config !== "object") throw new Error(`Route configuration '${config}' is not of object type.`);
    if (!ALLOWED_METHODS.includes(config.method)) {
      throw new Error(`Route method '${config.method}' is not one of allowed method: ${ALLOWED_METHODS}`);
    }
    if (typeof config.controller !== "function") {
      throw new Error(`Route controller '${config.controller}' is not of function type.`);
    }
    if (!Array.isArray(config.roles)) {
      throw new Error(`Route roles '${config.roles}' are not of Array type.`);
    }
  }
}

export default new RouteRegister();
