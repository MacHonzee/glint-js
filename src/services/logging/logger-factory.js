import winston from "winston";
import { LoggingWinston } from "@google-cloud/logging-winston";
import Config from "../utils/config.js";
const { combine, timestamp, label, printf } = winston.format;

const loggingWinston = new LoggingWinston();

const DEFAULT_LEVEL = "info";

/**
 * Maximum character length for a single log entry before truncation.
 * 256 KB is the GCP Cloud Logging gRPC limit; we keep a safe margin.
 * @type {number}
 */
export const MAX_LOG_ENTRY_SIZE = 200_000;
const SPLAT = Symbol.for("splat");

/**
 * Winston format that truncates oversized log entries to prevent
 * exceeding the 256KB Cloud Logging gRPC limit, which would crash the transport.
 */
export const truncateLargeEntries = winston.format((info) => {
  if (typeof info.message === "string" && info.message.length > MAX_LOG_ENTRY_SIZE) {
    const originalLength = info.message.length;
    info.message = info.message.slice(0, MAX_LOG_ENTRY_SIZE) + `... [TRUNCATED from ${originalLength} chars]`;
  }

  const splat = info[SPLAT];
  if (Array.isArray(splat)) {
    for (let i = 0; i < splat.length; i++) {
      try {
        const serialized = JSON.stringify(splat[i]);
        if (serialized && serialized.length > MAX_LOG_ENTRY_SIZE) {
          if (splat[i] instanceof Error) {
            const err = splat[i];
            const safeMessage =
              err.message?.length > MAX_LOG_ENTRY_SIZE
                ? err.message.slice(0, MAX_LOG_ENTRY_SIZE) + `... [TRUNCATED from ${err.message.length} chars]`
                : err.message;
            const safeError = new Error(safeMessage);
            safeError.code = err.code;
            safeError.stack = err.stack;
            if (err.params) {
              const paramStr = JSON.stringify(err.params);
              safeError.params =
                paramStr.length > MAX_LOG_ENTRY_SIZE ? { _truncated: true, originalSize: paramStr.length } : err.params;
            }
            splat[i] = safeError;
          } else {
            splat[i] = serialized.slice(0, MAX_LOG_ENTRY_SIZE) + `... [TRUNCATED from ${serialized.length} chars]`;
          }
        }
      } catch {
        splat[i] = "[Unserializable object]";
      }
    }
  }

  return info;
});

const consoleFormat = printf((log) => {
  const logLvl = log.level.toUpperCase();
  let msg = `${log.timestamp} [${log.label}] ${logLvl} ${log.message}`;

  // define custom logic for error logging
  const splat = log[Symbol.for("splat")];
  if (splat?.[0] instanceof Error) {
    if (Config.NODE_ENV === "production") {
      msg += "\n" + splat[0].message;
      if (splat[0].code) msg += "\n" + splat[0].code;
      if (splat[0].params) msg += " " + JSON.stringify(splat[0].params);
    } else {
      if (splat[0].code) msg += "\n" + splat[0].code;
      if (splat[0].params) msg += " " + JSON.stringify(splat[0].params);
      msg += "\n" + splat[0].stack;
    }
  }

  return msg;
});

function getEnvLogLevelKey(loggerName) {
  return "LOG_LEVEL_" + loggerName.replace(/\./g, "_").toUpperCase();
}

/**
 * Singleton factory for Winston loggers. Each logger is created once and cached
 * by name. In production, a Google Cloud Logging transport is added automatically.
 */
class LoggerFactory {
  _loggers = {};

  /**
   * Returns (or creates) a named Winston logger instance.
   *
   * @param {string} name - Logger name shown in log output (e.g. `"Service.MongoClient"`).
   * @param {string} [level] - Override log level; defaults to the env-specific or global level.
   * @returns {import('winston').Logger}
   */
  create(name, level) {
    if (this._loggers[name]) return this._loggers[name];

    const consoleTransport = new winston.transports.Console({
      format: combine(label({ label: name }), timestamp(), consoleFormat),
    });

    let logLevel = level || Config.get(getEnvLogLevelKey(name)) || Config.get("LOG_LEVEL_GLOBAL") || DEFAULT_LEVEL;
    logLevel = logLevel.toLowerCase();

    const logger = winston.createLogger({
      level: logLevel,
      format: truncateLargeEntries(),
      transports: [consoleTransport],
    });

    // add logger for Google cloud
    if (Config.NODE_ENV === "production") {
      logger.add(loggingWinston);
    }

    this._loggers[name] = logger;
    return logger;
  }
}

export default new LoggerFactory();
