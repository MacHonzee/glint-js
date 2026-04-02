import LoggerFactory from "../services/logging/logger-factory.js";
import Config from "../services/utils/config.js";

const TRACE_ID_HEADER = "X-Cloud-Trace-Context";

/**
 * Express error-handling middleware (arity 4). Catches any error that
 * propagated through the middleware chain and returns a structured JSON
 * error response. Stack traces are included only in non-production environments.
 */
class ErrorHandler {
  ORDER = 100;
  logger = LoggerFactory.create("Middleware.ErrorHandler", "error");

  /**
   * @param {Error} err
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   * @returns {Promise<void>}
   */
  // eslint-disable-next-line no-unused-vars
  async process(err, req, res, next) {
    const dtoOut = {
      uri: req.ucEnv?.uri || req.originalUrl,
      traceId: err.id || req.get(TRACE_ID_HEADER), // valid for Google Cloud environments
      timestamp: new Date(),
      message: err.message,
      code: err.code,
      params: err.params,
    };

    this.logger.error(`Request ${dtoOut.uri} has thrown an error:`, err);

    if (Config.NODE_ENV !== "production") {
      dtoOut.trace = err.stack;
    }

    res.status(err.status || 500).send(dtoOut);
  }
}

export default new ErrorHandler();
