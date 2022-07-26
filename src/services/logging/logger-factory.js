import winston from 'winston';
import {LoggingWinston} from '@google-cloud/logging-winston';
const {combine, timestamp, label, printf} = winston.format;

const loggingWinston = new LoggingWinston();

const DEFAULT_LEVEL = 'info';

const consoleFormat = printf((log) => {
  const logLvl = log.level.toUpperCase();
  let msg = `${log.timestamp} [${log.label}] ${logLvl} ${log.message}`;

  // define custom logic for error logging
  const splat = log[Symbol.for('splat')];
  if (splat?.[0] instanceof Error) {
    if (process.env.NODE_ENV === 'production') {
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

class LoggerFactory {
  constructor() {
    // cache for reusing loggers with same name
    this._loggers = {};
  }

  create(name, level) {
    if (this._loggers[name]) return this._loggers[name];

    const consoleTransport = new winston.transports.Console({
      format: combine(
          label({label: name}),
          timestamp(),
          consoleFormat,
      ),
    });

    const logger = winston.createLogger({
      // TODO level might need some configurable logic with this priority
      // 1. argument, 2. name-specific env, 3. global env, 4. DEFAULT_LEVEL const
      level: level || DEFAULT_LEVEL,
      transports: [
        consoleTransport,
      ],
    });

    // add logger for Google cloud
    if (process.env.NODE_ENV === 'production') {
      logger.add(loggingWinston);
    }

    this._loggers[name] = logger;
    return logger;
  }
}

export default new LoggerFactory();
