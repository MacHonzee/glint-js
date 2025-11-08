import path from "path";
import fs from "fs";
import { ModelWarehouse } from "../services/database/abstract-model.js";
import Config from "../services/utils/config.js";
import { RouteRegister } from "glint-js";

class SysRoute {
  _pkgJson;

  async ping(ucEnv) {
    if (!this._pkgJson) {
      const pkgJsonPath = path.join(Config.SERVER_ROOT, "package.json");
      this._pkgJson = JSON.parse(await fs.promises.readFile(pkgJsonPath, "utf8"));
    }

    return {
      status: "OK",
      version: this._pkgJson.version,
      ts: new Date(),
      nodeEnv: Config.NODE_ENV,
      cloudEnv: Config.CLOUD_ENV,
      buildTs: Config.BUILD_TS,
      dtoIn: ucEnv.dtoIn,
    };
  }

  async getEnvironment() {
    return process.env;
  }

  async getMappings() {
    const routes = RouteRegister.getRoutes().map((route) => ({
      ...route.config,
      url: route.url,
      method: route.method,
      controller: undefined, // do not return the controller function
    }));
    return { routes };
  }

  async syncIndexes() {
    const results = [];
    for (const [modelName, model] of Object.entries(ModelWarehouse)) {
      if (model.buildIndexes) {
        const droppedIndexes = await model.buildIndexes();
        results.push({
          modelName,
          state: droppedIndexes.length ? "updated" : "built",
          droppedIndexes,
        });
      }
    }

    return { results };
  }
}

export default new SysRoute();
