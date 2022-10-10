import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import url from 'url';

// synchronous one-time initialization of most basic configurations -> roots + dotEnv
class Config {
  constructor() {
    this._initAppRoot();
    this._initDotenv();
  }

  get(key) {
    return process.env[key];
  }

  mustGet(key) {
    const value = this.get(key);
    if (value === undefined) {
      throw new Error(`Configuration ${key} is not set.`);
    }
    return value;
  }

  set(key, value) {
    process.env[key] = value;
  }

  // some keys have pre-defined getters for ease of use
  get NODE_ENV() {
    return this.mustGet('NODE_ENV');
  }

  get CLOUD_ENV() {
    return this.get('CLOUD_ENV');
  }

  get PORT() {
    return this.get('PORT');
  }

  get SERVER_ROOT() {
    return this.mustGet('SERVER_ROOT');
  }

  get GLINT_ROOT() {
    return this.mustGet('GLINT_ROOT');
  }

  _initAppRoot() {
    // we save root of the server
    this.set('SERVER_ROOT', process.cwd());

    // and we also save root of the library (dynamically find out the nearest package.json)
    let currentDirname = path.dirname(url.fileURLToPath(import.meta.url));
    while (!fs.existsSync(path.join(currentDirname, 'package.json'))) {
      currentDirname = path.join(currentDirname, '..');
    }
    this.set('GLINT_ROOT', path.resolve(currentDirname));
  }

  _initDotenv() {
    const runtimeMode = this.NODE_ENV;
    const cloudMode = this.CLOUD_ENV;
    const envFileName = cloudMode ? `${runtimeMode}-${cloudMode}` : runtimeMode;

    const envPath = path.join(this.SERVER_ROOT, 'env', envFileName + '.env');
    if (fs.existsSync(envPath)) {
      dotenv.config({path: envPath});
    } else {
      // logger cannot be used here, because Config is not yet initialized
      console.warn('Unable to load .env file on path: ' + envFileName);
    }
  }
}

export default new Config();
