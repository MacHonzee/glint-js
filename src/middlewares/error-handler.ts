import type { Request, Response, NextFunction } from "express";
import LoggerFactory from "../services/logging/logger-factory.js";
import Config from "../services/utils/config.js";

/**
 * Google Cloud Trace header name
 */
const TRACE_ID_HEADER = "X-Cloud-Trace-Context";

/**
 * Extended request with ucEnv
 */
interface RequestWithUcEnv extends Request {
  ucEnv?: any;
}

/**
 * Extended error with additional properties
 */
interface ExtendedError extends Error {
  id?: string;
  code?: string;
  params?: any;
  status?: number;
  trace?: string;
}

/**
 * Error response DTO
 */
interface ErrorDtoOut {
  uri: string;
  traceId?: string;
  timestamp: Date;
  message: string;
  code?: string;
  params?: any;
  trace?: string;
}

/**
 * Error handler middleware for centralized error handling.
 * Catches all errors thrown in the request pipeline and formats them into
 * standardized error responses.
 *
 * Order: 100 (runs last, after all other middlewares)
 *
 * Features:
 * - Logs all errors with full context
 * - Standardized error response format
 * - Stack trace in development (hidden in production)
 * - Google Cloud Trace integration
 * - Custom error codes and parameters
 *
 * Error response format:
 * ```json
 * {
 *   "uri": "/user/login",
 *   "traceId": "trace-id-for-debugging",
 *   "timestamp": "2025-10-12T20:00:00.000Z",
 *   "message": "User is not authenticated",
 *   "code": "glint-js/userNotAuthenticated",
 *   "params": { "cause": "..." },
 *   "trace": "Error: ...\n    at ..." // Only in development
 * }
 * ```
 */
class ErrorHandler {
  /** Middleware execution order (positive = late) */
  ORDER = 100;

  private logger = LoggerFactory.create("Middleware.ErrorHandler", "error");

  /**
   * Processes errors and sends standardized error responses.
   *
   * Note: The `next` parameter must not be removed even if unused.
   * Its presence (4 parameters) signals Express that this is an error middleware.
   *
   * @param err - The error that was thrown
   * @param req - Express request
   * @param res - Express response
   * @param _next - Next middleware function (unused but required)
   */
  async process(err: ExtendedError, req: Request, res: Response, _next: NextFunction): Promise<void> {
    const reqWithUcEnv = req as RequestWithUcEnv;

    const dtoOut: ErrorDtoOut = {
      uri: reqWithUcEnv.ucEnv?.uri || req.originalUrl,
      traceId: err.id || req.get(TRACE_ID_HEADER), // Valid for Google Cloud environments
      timestamp: new Date(),
      message: err.message,
      code: err.code,
      params: err.params,
    };

    this.logger.error(`Request ${reqWithUcEnv.ucEnv.uri.useCase} has thrown an error:`, err);

    // Include stack trace in non-production environments
    if (Config.NODE_ENV !== "production") {
      dtoOut.trace = err.stack;
    }

    res.status(err.status || 500).send(dtoOut);
  }
}

export default new ErrorHandler();
