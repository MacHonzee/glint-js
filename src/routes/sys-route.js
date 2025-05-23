import path from "path";
import fs from "fs";
import { ModelWarehouse } from "../services/database/abstract-model.js";
import Config from "../services/utils/config.js";
import AppStateService from "../services/app-state/app-state-service.js";

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

  /**
   * Schedules a new application state change.
   * Requires admin privileges.
   * @param {object} ucEnv The use case environment.
   * @param {object} ucEnv.dtoIn The validated data transfer object.
   * @returns {Promise<object>} The result of scheduling the state change.
   */
  async scheduleStateChange(ucEnv) { // Renamed from setAppState
    // DtoIn is validated by ValidationService based on schema name convention
    const scheduleResult = await AppStateService.scheduleStateChange(ucEnv.dtoIn); // Renamed service call
    return {
      message: "Application state change scheduled successfully.",
      scheduleResult, // Contains the updated schedule from the service
    };
  }
}

export default new SysRoute();
