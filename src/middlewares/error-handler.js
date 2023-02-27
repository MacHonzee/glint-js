import LoggerFactory from "../services/logging/logger-factory.js";
import Config from "../services/utils/config.js";

class ErrorHandler {
  ORDER = 100;
  logger = LoggerFactory.create("Middleware.ErrorHandler", "error");

  // don't remove unused "next", otherwise it will stop being an error middlewares
  // eslint-disable-next-line no-unused-vars
  async process(err, req, res, next) {
    const dtoOut = {
      message: err.message,
      code: err.code,
      params: err.params,
    };

    this.logger.error(`Request ${req.ucEnv?.uri.useCase || req.path} has thrown an error:`, err);

    if (Config.NODE_ENV !== "production") {
      dtoOut.trace = err.stack;
    }

    res.status(err.status || 500).send(dtoOut);
  }
}

export default new ErrorHandler();
