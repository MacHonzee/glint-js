import path from 'path';

class RouteRegister {
  constructor() {
    this._active = false;
    this._routes = {};
  }

  async init() {
    // initialize all common routes -> it MUST be loaded dynamically, because the database connection
    // must be established first in order to properly create models
    const Mappings = await import('../../config/mappings.js');
    this._registerRoutesFromMappings(Mappings.default);

    // self-discovery of app's routes
    const appMappingsPath = path.join(process.env.SERVER_ROOT, 'app', 'config', 'mappings.js');
    const appMappings = await import('file://' + appMappingsPath);
    this._registerRoutesFromMappings(appMappings.default);

    this._active = true;
  }

  _registerRoutesFromMappings(mappings) {
    for (const [url, config] of Object.entries(mappings)) {
      this._routes[url] = {
        url,
        method: config.method,
        controller: this._wrapController(config.controller),
        config,
      };
    }
  }

  _wrapController(controllerMethod) {
    // TODO we might need some responseHandler here probably in order to handle binary, HEAD requests etc
    return async function handleController(req, res) {
      res.send(await controllerMethod(req.ucEnv));
    };
  }

  getRoutes() {
    if (!this._active) {
      throw new Error('RouteRegister was not initialized properly, cannot load route metadata');
    }

    return Object.values(this._routes);
  }

  getRoute(routeUrl) {
    if (!this._active) {
      throw new Error('RouteRegister was not initialized properly, cannot load route metadata');
    }

    return this._routes[routeUrl];
  }
}

export default new RouteRegister();
