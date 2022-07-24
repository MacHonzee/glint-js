import path from 'path';
import fs from 'fs';
import {ModelWarehouse} from '../services/abstract-model.js';

class SysRoute {
  constructor() {
    this._pkgJson = null;
  }

  async ping(ucEnv) {
    if (!this._pkgJson) {
      const pkgJsonPath = path.join(process.env.SERVER_ROOT, 'package.json');
      this._pkgJson = JSON.parse(await fs.promises.readFile(pkgJsonPath, 'utf8'));
    }

    return {status: 'OK', version: this._pkgJson.version, ts: new Date(), dtoIn: ucEnv.dtoIn};
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
