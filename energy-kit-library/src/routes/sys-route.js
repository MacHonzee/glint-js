import path from 'path';
import fs from 'fs';

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
}

export default new SysRoute();
