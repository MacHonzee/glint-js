import winston from 'winston';
import {LoggingWinston} from '@google-cloud/logging-winston';
import Config from '../utils/config.js';
const {combine, timestamp, label, printf} = winston.format;

const loggingWinston = new LoggingWinston();

const DEFAULT_LEVEL = 'info';

const consoleFormat = printf((log) => {
  const logLvl = log.level.toUpperCase();
  let msg = `${log.timestamp} [${log.label}] ${logLvl} ${log.message}`;

  // define custom logic for error logging
  const splat = log[Symbol.for('splat')];
  if (splat?.[0] instanceof Error) {
    if (Config.NODE_ENV === 'production') {
      msg += '\n' + splat[0].message;
      if (splat[0].code) msg += '\n' + splat[0].code;
      if (splat[0].params) msg += ' ' + JSON.stringify(splat[0].params);
    } else {
      if (splat[0].code) msg += '\n' + splat[0].code;
      if (splat[0].params) msg += ' ' + JSON.stringify(splat[0].params);
      msg += '\n' + splat[0].stack;
    }
  }

  return msg;
});

function getEnvLogLevelKey(loggerName) {
  return 'LOG_LEVEL_' + loggerName.replace(/\./g, '_').toUpperCase();
}

class LoggerFactory {
  // cache for reusing loggers with same name
  _loggers = {};

  create(name, level) {
    if (this._loggers[name]) return this._loggers[name];

    const consoleTransport = new winston.transports.Console({
      format: combine(
          label({label: name}),
          timestamp(),
          consoleFormat,
      ),
    });

    let logLevel = level || Config.get(getEnvLogLevelKey(name)) || Config.get('LOG_LEVEL_GLOBAL') || DEFAULT_LEVEL;
    logLevel = logLevel.toLowerCase();

    const logger = winston.createLogger({
      level: logLevel,
      transports: [
        consoleTransport,
      ],
    });

    // add logger for Google cloud
    if (Config.NODE_ENV === 'production') {
      logger.add(loggingWinston);
    }

    this._loggers[name] = logger;
    return logger;
  }
}

export default new LoggerFactory();
