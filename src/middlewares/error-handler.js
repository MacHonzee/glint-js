import LoggerFactory from "../services/logging/logger-factory.js";
import Config from "../services/utils/config.js";

const TRACE_ID_HEADER = "X-Cloud-Trace-Context";

class ErrorHandler {
  ORDER = 100;
  logger = LoggerFactory.create("Middleware.ErrorHandler", "error");

  // don't remove unused "next", otherwise it will stop being an error middleware
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

    this.logger.error(`Request ${req.ucEnv.uri.useCase} has thrown an error:`, err);

    if (Config.NODE_ENV !== "production") {
      dtoOut.trace = err.stack;
    }

    res.status(err.status || 500).send(dtoOut);
  }
}

export default new ErrorHandler();
