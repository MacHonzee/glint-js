import path from "path";
import Config from "../utils/config.js";

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
    return this._routes[routeUrl];
  }

  registerRoute(url, config) {
    this._routes[url] = {
      url,
      method: config.method,
      controller: this._wrapController(config.controller),
      config,
    };
  }
}

export default new RouteRegister();
