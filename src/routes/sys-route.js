import path from 'path';
import fs from 'fs';
import {ModelWarehouse} from '../services/database/abstract-model.js';
import Config from '../services/utils/config.js';

class SysRoute {
  _pkgJson;

  async ping(ucEnv) {
    if (!this._pkgJson) {
      const pkgJsonPath = path.join(Config.SERVER_ROOT, 'package.json');
      this._pkgJson = JSON.parse(await fs.promises.readFile(pkgJsonPath, 'utf8'));
    }

    const roles = await import('../config/default-roles.js');

    return {status: 'OK', version: this._pkgJson.version, ts: new Date(), dtoIn: ucEnv.dtoIn, roles: roles.default};
  }

  async syncIndexes() {
    const results = [];
    for (const [modelName, model] of Object.entries(ModelWarehouse)) {
      if (model.buildIndexes) {
        const droppedIndexes = await model.buildIndexes();
        results.push({
          modelName,
          state: droppedIndexes.length ? 'updated' : 'built',
          droppedIndexes,
        });
      }
    }

    return {results};
  }
}

export default new SysRoute();
