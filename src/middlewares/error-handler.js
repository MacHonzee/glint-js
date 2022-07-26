import LoggerFactory from '../services/logging/logger-factory.js';

const logger = LoggerFactory.create('Server.ErrorHandler', 'error');

class ErrorHandler {
  constructor() {
    this.ORDER = 100;
  }

  // don't remove unused "next", otherwise it will stop being an error middlewares
  async process(err, req, res, next) {
    const dtoOut = {
      message: err.message,
      code: err.code,
      params: err.params,
    };

    logger.error(`Request ${req.ucEnv?.uri.useCase || req.path} has thrown an error:`, err);

    if (process.env.NODE_ENV !== 'production') {
      dtoOut.trace = err.stack;
    }

    res.status(err.status || 500).send(dtoOut);
  }
}

export default new ErrorHandler();
