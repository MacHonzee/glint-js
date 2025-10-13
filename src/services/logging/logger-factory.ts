import winston, { Logger } from "winston";
import { LoggingWinston } from "@google-cloud/logging-winston";
import Config from "../utils/config.js";
const { combine, timestamp, label, printf } = winston.format;

const loggingWinston = new LoggingWinston();

const DEFAULT_LEVEL = "info";

/**
 * Custom console format for Winston logger.
 * Formats log messages with timestamp, label, level, and message.
 * Includes special handling for Error objects with code and params properties.
 */
const consoleFormat = printf((log: any) => {
  const logLvl = log.level.toUpperCase();
  let msg = `${log.timestamp} [${log.label}] ${logLvl} ${log.message}`;

  // Define custom logic for error logging
  const splat = log[Symbol.for("splat")];
  if (splat?.[0] instanceof Error) {
    const error = splat[0] as any;
    if (Config.NODE_ENV === "production") {
      msg += "\n" + error.message;
      if (error.code) msg += "\n" + error.code;
      if (error.params) msg += " " + JSON.stringify(error.params);
    } else {
      if (error.code) msg += "\n" + error.code;
      if (error.params) msg += " " + JSON.stringify(error.params);
      msg += "\n" + error.stack;
    }
  }

  return msg;
});

/**
 * Generates environment variable key for logger-specific log level.
 * @param loggerName - The name of the logger
 * @returns Environment variable key (e.g., "LOG_LEVEL_SERVICE_USER_SERVICE")
 */
function getEnvLogLevelKey(loggerName: string): string {
  return "LOG_LEVEL_" + loggerName.replace(/\./g, "_").toUpperCase();
}

/**
 * Factory for creating and managing Winston loggers.
 * Provides centralized logger creation with consistent formatting and transports.
 *
 * Features:
 * - Logger caching (reuses loggers with the same name)
 * - Environment-specific log levels (per-logger and global)
 * - Automatic Google Cloud Logging integration in production
 * - Custom error formatting with code and params support
 *
 * Log level resolution order:
 * 1. Explicit level parameter
 * 2. Logger-specific env var: LOG_LEVEL_{LOGGER_NAME}
 * 3. Global env var: LOG_LEVEL_GLOBAL
 * 4. Default: "info"
 *
 * @example
 * const logger = LoggerFactory.create("Service.UserService");
 * logger.info("User registered", { userId: 123 });
 * logger.error("Registration failed", new Error("Email already exists"));
 */
class LoggerFactory {
  /** Cache for reusing loggers with same name */
  private _loggers: Record<string, Logger> = {};

  /**
   * Creates or retrieves a cached logger with the given name and level.
   *
   * @param name - Logger name (typically in format "Category.Component", e.g., "Service.UserService")
   * @param level - Optional log level override (debug, info, warn, error)
   * @returns Winston logger instance
   *
   * @example
   * // Create logger with default level
   * const logger = LoggerFactory.create("Service.Auth");
   *
   * // Create logger with explicit level
   * const debugLogger = LoggerFactory.create("Service.Debug", "debug");
   *
   * // Logger-specific level via env var
   * // Set LOG_LEVEL_SERVICE_AUTH=debug
   * const authLogger = LoggerFactory.create("Service.Auth"); // Uses debug level
   */
  create(name: string, level?: string): Logger {
    if (this._loggers[name]) return this._loggers[name];

    const consoleTransport = new winston.transports.Console({
      format: combine(label({ label: name }), timestamp(), consoleFormat),
    });

    let logLevel = level || Config.get(getEnvLogLevelKey(name)) || Config.get("LOG_LEVEL_GLOBAL") || DEFAULT_LEVEL;
    logLevel = logLevel.toLowerCase();

    const logger = winston.createLogger({
      level: logLevel,
      transports: [consoleTransport],
    });

    // Add logger for Google Cloud in production
    if (Config.NODE_ENV === "production") {
      logger.add(loggingWinston);
    }

    this._loggers[name] = logger;
    return logger;
  }
}

export default new LoggerFactory();
