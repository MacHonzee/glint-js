import path from 'path';
import Mappings from '../config/mappings.js';

class RouteRegister {
  constructor() {
    this._active = false;
    this._routes = {};
  }

  async init() {
    // initialize all common routes
    this._registerRoutesFromMappings(Mappings);

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
