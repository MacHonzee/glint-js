import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import url from "url";

type DataType = typeof String | typeof Boolean | typeof Number;

/**
 * Converts a string value to a boolean.
 * @param value - The string value to convert ("true" or "false")
 * @param key - The configuration key name (used for error messages)
 * @returns The boolean representation of the string
 * @throws Error if the value is not "true" or "false"
 */
function stringToBool(value: string, key: string): boolean {
  switch (value) {
    case "true":
      return true;
    case "false":
      return false;
    default:
      throw new Error(`Unexpected Boolean value '${value}' for configuration key ${key}`);
  }
}

/**
 * Checks if a string represents a valid numeric value.
 * @param str - The value to check
 * @returns True if the string is numeric, false otherwise
 */
function isNumeric(str: unknown): str is string {
  if (typeof str !== "string") return false;
  return !isNaN(Number(str)) && !isNaN(parseFloat(str));
}

/**
 * Converts a string value to a number.
 * @param value - The string value to convert
 * @param key - The configuration key name (used for error messages)
 * @returns The numeric representation of the string
 * @throws Error if the value is not a valid number
 */
function stringToNumber(value: string, key: string): number {
  if (!isNumeric(value)) {
    throw new Error(`Unexpected Number value '${value}' for configuration key ${key}`);
  }
  return parseFloat(value);
}

/**
 * Configuration manager for application settings.
 * Handles environment variables, dotenv files, and type-safe configuration access.
 * Performs synchronous one-time initialization of basic configurations (roots + dotenv).
 */
class Config {
  constructor() {
    this._initAppRoot();
    this._initDotenv();
  }

  /**
   * Gets a configuration value from environment variables with optional type conversion.
   * @param key - The environment variable key
   * @param dataType - Optional data type constructor (String, Boolean, or Number)
   * @returns The configuration value, or undefined if not set
   */
  get(key: string): string | undefined;
  get(key: string, dataType: typeof Boolean): boolean | undefined;
  get(key: string, dataType: typeof Number): number | undefined;
  get(key: string, dataType: typeof String): string | undefined;
  get(key: string, dataType?: DataType): string | boolean | number | undefined {
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
   * Gets a required configuration value from environment variables.
   * @param key - The environment variable key
   * @param dataType - Optional data type constructor (String, Boolean, or Number)
   * @returns The configuration value
   * @throws Error if the configuration value is not set
   */
  mustGet(key: string): string;
  mustGet(key: string, dataType: typeof Boolean): boolean;
  mustGet(key: string, dataType: typeof Number): number;
  mustGet(key: string, dataType: typeof String): string;
  mustGet(key: string, dataType?: DataType): string | boolean | number {
    const value = this.get(key, dataType as any);
    if (value === undefined) {
      throw new Error(`Configuration ${key} is not set.`);
    }
    return value;
  }

  /**
   * Sets a configuration value in the environment variables.
   * @param key - The environment variable key
   * @param value - The value to set
   */
  set(key: string, value: string): void {
    process.env[key] = value;
  }

  /**
   * Gets the Node.js environment (e.g., "development", "production", "test").
   */
  get NODE_ENV(): string {
    return this.mustGet("NODE_ENV");
  }

  /**
   * Gets the cloud environment identifier (e.g., "gcp", "aws").
   */
  get CLOUD_ENV(): string | undefined {
    return this.get("CLOUD_ENV");
  }

  /**
   * Gets the build timestamp.
   */
  get BUILD_TS(): string | undefined {
    return this.get("BUILD_TS");
  }

  /**
   * Gets the server port number.
   */
  get PORT(): number | undefined {
    return this.get("PORT", Number);
  }

  /**
   * Gets the server root directory path.
   */
  get SERVER_ROOT(): string {
    return this.mustGet("SERVER_ROOT");
  }

  /**
   * Gets the Glint.js library root directory path.
   */
  get GLINT_ROOT(): string {
    return this.mustGet("GLINT_ROOT");
  }

  /**
   * Checks if MongoDB is disabled.
   */
  get MONGODB_DISABLED(): boolean | undefined {
    return this.get("MONGODB_DISABLED", Boolean);
  }

  /**
   * Initializes application root directories.
   * Sets SERVER_ROOT (the application root) and GLINT_ROOT (the library root).
   * @private
   */
  private _initAppRoot(): void {
    // Save root of the server
    this.set("SERVER_ROOT", process.env["DEFAULT_SERVER_ROOT"] || process.cwd());

    // Save root of the library (dynamically find the nearest package.json)
    let currentDirname = path.dirname(url.fileURLToPath(import.meta.url));
    while (!fs.existsSync(path.join(currentDirname, "package.json"))) {
      currentDirname = path.join(currentDirname, "..");
    }
    this.set("GLINT_ROOT", path.resolve(currentDirname));
  }

  /**
   * Initializes and loads the appropriate .env file based on runtime and cloud environment.
   * Looks for env files in the format: {NODE_ENV}[-{CLOUD_ENV}].env
   * @private
   */
  private _initDotenv(): void {
    const runtimeMode = this.NODE_ENV;
    const cloudMode = this.CLOUD_ENV;
    const envFileName = cloudMode ? `${runtimeMode}-${cloudMode}` : runtimeMode;

    const envPath = path.join(this.SERVER_ROOT, "env", envFileName + ".env");
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
    } else {
      // Logger cannot be used here, because Config is not yet initialized
      console.warn("Unable to load .env file on path: " + envPath);
    }
  }
}

export default new Config();
