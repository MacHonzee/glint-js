import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import url from 'url';

// TODO these methods can be probably part of some utils or something
function stringToBool(value, key) {
  switch (value) {
    case 'true':
      return true;
    case 'false':
      return false;
    default:
      throw new Error(`Unexpected Boolean value '${value}' for configuration key ${key}`);
  }
}

function isNumeric(str) {
  if (typeof str != 'string') return false;
  return !isNaN(str) && !isNaN(parseFloat(str));
}

function stringToNumber(value, key) {
  if (!isNumeric(value, key)) {
    throw new Error(`Unexpected Number value '${value}' for configuration key ${key}`);
  }
  return parseFloat(value);
}

// synchronous one-time initialization of most basic configurations -> roots + dotEnv
class Config {
  constructor() {
    this._initAppRoot();
    this._initDotenv();
  }

  get(key, dataType) {
    const value = process.env[key];
    if (value == null) return value;

    switch (dataType) {
      case Boolean:
        return stringToBool(value, key);
      case Number:
        return stringToNumber(value, key);
      default:
        return value;
    }
  }

  mustGet(key, dataType) {
    const value = this.get(key, dataType);
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
    return this.get('PORT', Number);
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
