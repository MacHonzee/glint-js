import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import url from "url";

// TODO these methods can be probably part of some utils or something
function stringToBool(value, key) {
  switch (value) {
    case "true":
      return true;
    case "false":
      return false;
    default:
      throw new Error(`Unexpected Boolean value '${value}' for configuration key ${key}`);
  }
}

function isNumeric(str) {
  return !isNaN(str) && !isNaN(parseFloat(str));
}

function stringToNumber(value, key) {
  if (!isNumeric(value, key)) {
    throw new Error(`Unexpected Number value '${value}' for configuration key ${key}`);
  }
  return parseFloat(value);
}

/**
 * Singleton configuration service. Resolves application and library root paths,
 * loads `.env` files for the current runtime mode, and provides typed access
 * to environment variables.
 *
 * Initialization is synchronous and happens once at import time.
 */
class Config {
  constructor() {
    this._initAppRoot();
    this._initDotenv();
  }

  /**
   * Retrieves an environment variable, optionally coerced to the given type.
   *
   * @param {string} key - Environment variable name.
   * @param {BooleanConstructor|NumberConstructor} [dataType] - Target type (`Boolean` or `Number`).
   * @returns {string|boolean|number|undefined} The coerced value, or `undefined` when not set.
   */
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

  /**
   * Same as {@link Config.get}, but throws when the key is missing.
   *
   * @param {string} key - Environment variable name.
   * @param {BooleanConstructor|NumberConstructor} [dataType] - Target type.
   * @returns {string|boolean|number}
   * @throws {Error} If the variable is not set.
   */
  mustGet(key, dataType) {
    const value = this.get(key, dataType);
    if (value === undefined) {
      throw new Error(`Configuration ${key} is not set.`);
    }
    return value;
  }

  /**
   * Sets an environment variable.
   *
   * @param {string} key
   * @param {string} value
   */
  set(key, value) {
    process.env[key] = value;
  }

  /** @returns {string} Current `NODE_ENV` value (e.g. `"development"`, `"production"`). */
  get NODE_ENV() {
    return this.mustGet("NODE_ENV");
  }

  /** @returns {string|undefined} Optional cloud environment identifier (e.g. `"gcp"`, `"aws"`). */
  get CLOUD_ENV() {
    return this.get("CLOUD_ENV");
  }

  /** @returns {string|undefined} Build timestamp injected during CI/CD. */
  get BUILD_TS() {
    return this.get("BUILD_TS");
  }

  /** @returns {number|undefined} HTTP server port. */
  get PORT() {
    return this.get("PORT", Number);
  }

  /** @returns {string} Absolute path to the consuming application's root directory. */
  get SERVER_ROOT() {
    return this.mustGet("SERVER_ROOT");
  }

  /** @returns {string} Absolute path to the glint-js library root. */
  get GLINT_ROOT() {
    return this.mustGet("GLINT_ROOT");
  }

  /** @returns {boolean|undefined} When `true`, MongoDB connections are skipped entirely. */
  get MONGODB_DISABLED() {
    return this.get("MONGODB_DISABLED", Boolean);
  }

  /** @returns {string|undefined} Registration flow variant (`"basic"` or `"email"`). */
  get REGISTRATION_FLOW() {
    return this.get("GLINT_REGISTRATION_FLOW");
  }

  _initAppRoot() {
    // we save root of the server
    this.set("SERVER_ROOT", process.env["DEFAULT_SERVER_ROOT"] || process.cwd());

    // and we also save root of the library (dynamically find out the nearest package.json)
    let currentDirname = path.dirname(url.fileURLToPath(import.meta.url));
    while (!fs.existsSync(path.join(currentDirname, "package.json"))) {
      currentDirname = path.join(currentDirname, "..");
    }
    this.set("GLINT_ROOT", path.resolve(currentDirname));
  }

  _initDotenv() {
    const runtimeMode = this.NODE_ENV;
    const cloudMode = this.CLOUD_ENV;
    const envFileName = cloudMode ? `${runtimeMode}-${cloudMode}` : runtimeMode;

    const envPath = path.join(this.SERVER_ROOT, "env", envFileName + ".env");
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
    } else {
      // logger cannot be used here, because Config is not yet initialized
      console.warn("Unable to load .env file on path: " + envPath);
    }
  }
}

export default new Config();
