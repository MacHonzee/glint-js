import path from "path";
import fs from "fs";
import { ModelWarehouse } from "../services/database/abstract-model.js";
import Config from "../services/utils/config.js";
import type UseCaseEnvironment from "../services/server/use-case-environment.js";

/**
 * System route for health checks, environment info, and database maintenance.
 * Provides administrative endpoints for monitoring and managing the application.
 */
class SysRoute {
  private _pkgJson?: any;

  /**
   * Health check endpoint.
   * Returns application status, version, and environment information.
   *
   * @param ucEnv - Use case environment
   * @returns Status information
   */
  async ping(ucEnv: UseCaseEnvironment): Promise<any> {
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

  /**
   * Returns all environment variables.
   * Useful for debugging configuration issues.
   * **WARNING**: Should only be accessible to admins!
   *
   * @returns All environment variables
   */
  async getEnvironment(): Promise<NodeJS.ProcessEnv> {
    return process.env;
  }

  /**
   * Synchronizes database indexes for all models.
   * Calls buildIndexes() on each model in the ModelWarehouse.
   *
   * @returns Results of index synchronization for each model
   */
  async syncIndexes(): Promise<{ results: any[] }> {
    const results = [];
    for (const [modelName, model] of Object.entries(ModelWarehouse)) {
      if ((model as any).buildIndexes) {
        const droppedIndexes = await (model as any).buildIndexes();
        results.push({
          modelName,
          state: droppedIndexes && droppedIndexes.length ? "updated" : "built",
          droppedIndexes: droppedIndexes || [],
        });
      }
    }

    return { results };
  }
}

export default new SysRoute();
